from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import kb.server as server_module


@pytest.fixture
def exported_architecture(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(server_module, "WEBUI_DIR", tmp_path)
    for page in (
        "architecture.html",
        "architecture/memory.html",
        "architecture/capture.html",
        "architecture/self-hosting.html",
    ):
        path = tmp_path / page
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"<!doctype html><p>{page}</p>", encoding="utf-8")


@pytest.mark.parametrize(
    ("route", "export"),
    (
        ("/architecture", "architecture.html"),
        ("/architecture/memory", "architecture/memory.html"),
        ("/architecture/capture", "architecture/capture.html"),
        ("/architecture/self-hosting", "architecture/self-hosting.html"),
        ("/next/architecture", "architecture.html"),
        ("/next/architecture/memory", "architecture/memory.html"),
        ("/next/architecture/capture", "architecture/capture.html"),
        ("/next/architecture/self-hosting", "architecture/self-hosting.html"),
    ),
)
def test_architecture_routes_serve_allowlisted_exports(
    exported_architecture: None, route: str, export: str
) -> None:
    response = TestClient(server_module.app).get(route)

    assert response.status_code == 200
    assert f"<p>{export}</p>" in response.text


@pytest.mark.parametrize(
    "route",
    (
        "/architecture/unknown",
        "/next/architecture/unknown",
        "/architecture/../index",
        "/next/architecture/../index",
        "/info",
        "/next/info",
    ),
)
def test_unlisted_architecture_pages_and_status_routes_return_404(
    exported_architecture: None, route: str
) -> None:
    response = TestClient(server_module.app).get(route)

    assert response.status_code == 404
