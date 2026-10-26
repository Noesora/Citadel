"""§V21: reject unsafe or drifted SDK build metadata before distribution."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
import tarfile
import tomllib
import zipfile

import pytest
from packaging.requirements import Requirement

from scripts import build_secure_cognee


def _write_audited_ladybug_sources(source: Path) -> None:
    by_path: dict[Path, list[str]] = {}
    for relative_path, original, _replacement in build_secure_cognee.LADYBUG_HOME_PATCHES:
        by_path.setdefault(relative_path, []).append(original)
    for relative_path, blocks in by_path.items():
        path = source / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("\n".join(blocks), encoding="utf-8")


def test_patch_permits_fixed_dependencies_and_preserves_other_pins(tmp_path: Path) -> None:
    source = tmp_path / "cognee-1.4.1"
    source.mkdir()
    pyproject = source / "pyproject.toml"
    pyproject.write_text(
        '[project]\ndependencies = [\n'
        '    "cryptography>=43.0.0,<50",\n'
        '    "filelock>=3.12.0,<4.0.0",\n'
        '    "ladybug==0.18.2",\n'
        ']\n[project.optional-dependencies]\nfastembed = [\n'
        '    "fastembed<=0.8.0",\n]\n',
        encoding="utf-8",
    )

    build_secure_cognee.patch_pyproject(source)

    project = tomllib.loads(pyproject.read_text(encoding="utf-8"))["project"]
    dependencies = {requirement.name: requirement for requirement in map(Requirement, project["dependencies"])}
    assert dependencies["cryptography"].specifier.contains("50.0.0")
    assert not dependencies["cryptography"].specifier.contains("51.0.0")
    assert dependencies["filelock"].specifier.contains("4.2.1")
    assert not dependencies["filelock"].specifier.contains("3.29.0")
    assert not dependencies["filelock"].specifier.contains("5.0.0")
    assert str(dependencies["ladybug"].specifier) == "==0.18.2"
    companion = Requirement(project["optional-dependencies"]["fastembed"][0])
    assert companion.specifier.contains("0.9.1")
    assert not companion.specifier.contains("0.8.0")
    with pytest.raises(RuntimeError, match="audited source"):
        build_secure_cognee.patch_pyproject(source)


@pytest.mark.parametrize(
    "original",
    [
        '    "cryptography>=43.0.0,<50",',
        '    "filelock>=3.12.0,<4.0.0",',
        '    "fastembed<=0.8.0",',
    ],
)
def test_metadata_drift_is_rejected_before_any_file_write(tmp_path: Path, original: str) -> None:
    source = tmp_path / "cognee-1.4.1"
    source.mkdir()
    pyproject = source / "pyproject.toml"
    before = (
        '[project]\ndependencies = [\n'
        '    "cryptography>=43.0.0,<50",\n'
        '    "filelock>=3.12.0,<4.0.0",\n'
        ']\n[project.optional-dependencies]\nfastembed = [\n'
        '    "fastembed<=0.8.0",\n]\n'
    ).replace(original, "")
    pyproject.write_text(before, encoding="utf-8")

    with pytest.raises(RuntimeError, match="audited source"):
        build_secure_cognee.patch_pyproject(source)

    assert pyproject.read_text(encoding="utf-8") == before


def test_extract_rejects_parent_path(tmp_path: Path) -> None:
    archive_path = tmp_path / "source.tar.gz"
    payload = b"unsafe"
    with tarfile.open(archive_path, "w:gz") as archive:
        member = tarfile.TarInfo("../outside")
        member.size = len(payload)
        archive.addfile(member, BytesIO(payload))

    with pytest.raises(RuntimeError, match="unsafe path"):
        build_secure_cognee.extract_source(archive_path, tmp_path / "extract")


def test_patch_ladybug_home_precedes_every_install_and_load(tmp_path: Path) -> None:
    source = tmp_path / "cognee-1.4.1"
    _write_audited_ladybug_sources(source)

    patched = build_secure_cognee.patch_ladybug_home_directory(source)

    assert set(patched) == {
        source / build_secure_cognee.LADYBUG_HELPER_PATH,
        source / build_secure_cognee.LADYBUG_WORKER_PATH,
        source / build_secure_cognee.LADYBUG_ADAPTER_PATH,
    }
    helper = (source / build_secure_cognee.LADYBUG_HELPER_PATH).read_text(encoding="utf-8")
    worker = (source / build_secure_cognee.LADYBUG_WORKER_PATH).read_text(encoding="utf-8")
    adapter = (source / build_secure_cognee.LADYBUG_ADAPTER_PATH).read_text(encoding="utf-8")
    assert helper.index("configure_ladybug_home_directory(conn)") < helper.index(
        'conn.execute("INSTALL JSON;")'
    )
    assert worker.index("configure_ladybug_home_directory(conn)") < worker.index(
        "return HandleResult(value=None, handle_id=registry.register(conn))"
    )
    assert "OP_OPEN_CONNECTION runs here during initial setup and every replay" in worker
    assert adapter.index("configure_ladybug_home_directory(self.connection)") < adapter.index(
        'self.connection.execute("LOAD EXTENSION JSON;")'
    )


def test_patch_ladybug_home_rejects_source_drift_before_writing(tmp_path: Path) -> None:
    source = tmp_path / "cognee-1.4.1"
    _write_audited_ladybug_sources(source)
    helper = source / build_secure_cognee.LADYBUG_HELPER_PATH
    original_helper = helper.read_text(encoding="utf-8")
    worker = source / build_secure_cognee.LADYBUG_WORKER_PATH
    worker.write_text(worker.read_text(encoding="utf-8").replace("Connection(db)", "Connection()"))

    with pytest.raises(RuntimeError, match="source drifted"):
        build_secure_cognee.patch_ladybug_home_directory(source)

    assert helper.read_text(encoding="utf-8") == original_helper


@pytest.mark.parametrize(
    ("filelock", "fastembed", "error"),
    [
        ("filelock<5.0.0,>=4.2.1", 'fastembed==0.9.1; extra == "fastembed"', None),
        ("filelock<4.0.0,>=3.12.0", 'fastembed==0.9.1; extra == "fastembed"', "Filelock"),
        ("filelock>=4.2.1", 'fastembed==0.9.1; extra == "fastembed"', "Filelock"),
        ("filelock<5.0.0,>=4.2.1", 'fastembed<=0.8.0; extra == "fastembed"', "Fastembed"),
    ],
)
def test_verify_wheel_requires_safe_metadata_and_notices(
    tmp_path: Path, filelock: str, fastembed: str, error: str | None
) -> None:
    wheel_path = tmp_path / "cognee-1.4.1-py3-none-any.whl"
    metadata = (
        "Metadata-Version: 2.4\n"
        "Name: cognee\n"
        "Version: 1.4.1\n"
        "Requires-Dist: cryptography<51,>=43.0.0\n"
        f"Requires-Dist: {filelock}\n"
        f"Requires-Dist: {fastembed}\n"
        "Requires-Dist: fastembed<=0.8.0; extra == \"codegraph\"\n\n"
    )
    with zipfile.ZipFile(wheel_path, "w") as archive:
        archive.writestr("cognee-1.4.1.dist-info/METADATA", metadata)
        archive.writestr("cognee-1.4.1.dist-info/licenses/LICENSE", "Apache-2.0")
        archive.writestr("cognee-1.4.1.dist-info/licenses/NOTICE.md", "Cognee")
        archive.writestr(
            build_secure_cognee.LADYBUG_HELPER_PATH.as_posix(),
            "def configure_ladybug_home_directory(connection) -> None:\n"
            "    pass\n"
            "configure_ladybug_home_directory(conn)\n"
            'conn.execute("INSTALL JSON;")\n',
        )
        archive.writestr(
            build_secure_cognee.LADYBUG_WORKER_PATH.as_posix(),
            "configure_ladybug_home_directory(conn)\n"
            "return HandleResult(value=None, handle_id=registry.register(conn))\n",
        )
        archive.writestr(
            build_secure_cognee.LADYBUG_ADAPTER_PATH.as_posix(),
            "configure_ladybug_home_directory(self.connection)\n"
            'self.connection.execute("LOAD EXTENSION JSON;")\n',
        )

    if error is not None:
        with pytest.raises(RuntimeError, match=error):
            build_secure_cognee.verify_wheel(wheel_path)
        return

    evidence = build_secure_cognee.verify_wheel(wheel_path)

    assert evidence["name"] == "cognee"
    assert evidence["version"] == "1.4.1"
    assert evidence["cryptography_requirement"] == "cryptography<51,>=43.0.0"
    assert Requirement(evidence["filelock_requirement"]).specifier.contains("4.2.1")
    assert Requirement(evidence["fastembed_requirement"]).specifier.contains("0.9.1")




def test_build_rejects_an_unpinned_hatchling(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(build_secure_cognee.metadata, "version", lambda package: "1.30.1")

    with pytest.raises(RuntimeError, match="hatchling 1.31.0 is required"):
        build_secure_cognee.build_wheel(tmp_path, tmp_path / "dist")
