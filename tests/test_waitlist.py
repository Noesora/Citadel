from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import kb.server as server_module
from kb.server import app
from kb.waitlist_store import (
    WaitlistStore,
    WaitlistStoreCorruptError,
    WaitlistStoreFullError,
)


@pytest.fixture(autouse=True)
def reset_waitlist_limits():
    server_module._waitlist_hits.clear()
    server_module._waitlist_global_hits.clear()
    yield
    server_module._waitlist_hits.clear()
    server_module._waitlist_global_hits.clear()


def _client_for_store(tmp_path: Path) -> TestClient:
    app.state.citadel = SimpleNamespace(
        config=SimpleNamespace(access_store_path=str(tmp_path / "access.json"))
    )
    return TestClient(app, base_url="https://testserver")


def test_waitlist_routes_serve_export_and_have_no_public_listing() -> None:
    client = TestClient(app, base_url="https://testserver")

    page = client.get("/waitlist")
    preview = client.get("/next/waitlist")

    assert page.status_code == 200
    assert preview.status_code == 200
    assert page.text == preview.text
    assert client.get("/api/waitlist").status_code == 404


def test_signup_stores_normalized_email_deduplicates_and_uses_private_sibling(
    tmp_path: Path,
) -> None:
    access_path = tmp_path / "access.json"
    client = _client_for_store(tmp_path)

    first = client.post("/waitlist", json={"email": "Person@Example.com"})
    duplicate = client.post("/waitlist", json={"email": " person@example.COM "})

    assert first.status_code == 200
    assert first.json() == {"stored": True}
    assert duplicate.status_code == 200
    assert duplicate.json() == {"stored": True}
    assert "Person@Example.com" not in first.text
    assert server_module.get_waitlist_store().path == access_path.with_name("waitlist.json")
    store_path = access_path.with_name("waitlist.json")
    assert json.loads(store_path.read_text(encoding="utf-8")) == {
        "emails": ["person@example.com"],
        "version": 1,
    }
    assert os.stat(store_path).st_mode & 0o777 == 0o600


@pytest.mark.parametrize(
    "body",
    [
        {"email": "not-an-email"},
        {"email": "x" * 65 + "@example.com"},
        {"email": "safe@example.com", "unexpected": "field"},
        {"email": "safe@example.com", "website": "bot-filled"},
        {"email": 12},
    ],
)
def test_invalid_signup_returns_422_without_echoing_email(
    tmp_path: Path,
    body: dict[str, object],
) -> None:
    client = _client_for_store(tmp_path)
    secret = "safe@example.com"

    response = client.post("/waitlist", json=body)

    assert response.status_code == 422
    assert secret not in response.text
    assert not (tmp_path / "waitlist.json").exists()


def test_signup_rejects_non_json_and_oversized_body(tmp_path: Path) -> None:
    client = _client_for_store(tmp_path)

    form = client.post(
        "/waitlist",
        data={"email": "safe@example.com"},
    )
    oversized = client.post(
        "/waitlist",
        content=b"{" + b" " * (server_module.WAITLIST_MAX_REQUEST_BYTES + 1) + b"}",
        headers={"content-type": "application/json"},
    )

    assert form.status_code == 422
    assert oversized.status_code == 422
    assert "safe@example.com" not in form.text
    assert not (tmp_path / "waitlist.json").exists()


def test_signup_rate_limit_returns_429(tmp_path: Path) -> None:
    client = _client_for_store(tmp_path)
    responses = [
        client.post("/waitlist", json={"email": f"person{index}@example.com"})
        for index in range(server_module.WAITLIST_PER_IP_LIMIT + 1)
    ]

    assert [response.status_code for response in responses] == [200, 200, 200, 429]
    assert responses[-1].json()["detail"] == "Too many signup attempts. Try again later."


def test_corrupt_store_returns_503_and_keeps_existing_bytes(
    tmp_path: Path,
) -> None:
    client = _client_for_store(tmp_path)
    store_path = tmp_path / "waitlist.json"
    corrupt_bytes = b'{"version":1,"emails":["bad"]'
    store_path.write_bytes(corrupt_bytes)

    response = client.post("/waitlist", json={"email": "safe@example.com"})

    assert response.status_code == 503
    assert "safe@example.com" not in response.text
    assert store_path.read_bytes() == corrupt_bytes


def test_full_store_returns_503_without_dropping_existing_entry(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store_path = tmp_path / "waitlist.json"
    store = WaitlistStore(store_path)
    assert store.add("kept@example.com") is True
    original_bytes = store_path.read_bytes()
    monkeypatch.setattr("kb.waitlist_store.MAX_WAITLIST_ENTRIES", 1)
    app.state.waitlist_store = store
    client = TestClient(app, base_url="https://testserver")

    response = client.post("/waitlist", json={"email": "new@example.com"})

    assert response.status_code == 503
    assert store_path.read_bytes() == original_bytes
    assert json.loads(store_path.read_text(encoding="utf-8"))["emails"] == [
        "kept@example.com"
    ]


def test_store_fails_closed_on_invalid_existing_json(tmp_path: Path) -> None:
    store_path = tmp_path / "waitlist.json"
    original_bytes = b"not-json"
    store_path.write_bytes(original_bytes)

    with pytest.raises(WaitlistStoreCorruptError):
        WaitlistStore(store_path).add("safe@example.com")

    assert store_path.read_bytes() == original_bytes


def test_duplicate_is_still_success_when_store_is_full(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = WaitlistStore(tmp_path / "waitlist.json")
    assert store.add("person@example.com") is True
    monkeypatch.setattr("kb.waitlist_store.MAX_WAITLIST_ENTRIES", 1)

    assert store.add("PERSON@example.com") is False
    with pytest.raises(WaitlistStoreFullError):
        store.add("other@example.com")


def test_concurrent_thread_updates_keep_all_distinct_entries(tmp_path: Path) -> None:
    path = tmp_path / "waitlist.json"

    with ThreadPoolExecutor(max_workers=8) as executor:
        list(
            executor.map(
                lambda index: WaitlistStore(path).add(f"person{index}@example.com"),
                range(32),
            )
        )

    emails = json.loads(path.read_text(encoding="utf-8"))["emails"]
    assert len(emails) == 32


def test_concurrent_process_updates_deduplicate(tmp_path: Path) -> None:
    path = tmp_path / "waitlist.json"
    root = Path(__file__).resolve().parents[1]
    script = (
        "import sys; from kb.waitlist_store import WaitlistStore; "
        "print(int(WaitlistStore(sys.argv[1]).add(sys.argv[2])))"
    )

    def add_in_process(_: int) -> str:
        result = subprocess.run(
            [sys.executable, "-c", script, str(path), "person@example.com"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()

    with ThreadPoolExecutor(max_workers=6) as executor:
        outcomes = list(executor.map(add_in_process, range(6)))

    assert outcomes.count("1") == 1
    assert outcomes.count("0") == 5
    assert json.loads(path.read_text(encoding="utf-8"))["emails"] == [
        "person@example.com"
    ]


def test_unexpected_storage_error_does_not_log_or_echo_email(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    secret = "private-person@example.com"

    class BrokenStore:
        def add(self, _email: str) -> bool:
            raise RuntimeError(secret)

    monkeypatch.setattr(server_module, "get_waitlist_store", lambda: BrokenStore())
    client = TestClient(app, base_url="https://testserver")

    response = client.post("/waitlist", json={"email": secret})

    assert response.status_code == 503
    assert secret not in response.text
    assert secret not in caplog.text
