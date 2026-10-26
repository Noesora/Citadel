"""The Next.js export, its canonical public routes, and the safe fallback.

The rebuilt frontend is checked in for self-hosted installs. The public routes
serve it when present, while an unbuilt source checkout keeps the hand-written
pages usable. The authenticated dashboard stays on its established route until
its graph and admin flows have parity.
"""

from __future__ import annotations

from pathlib import Path
import re

from fastapi.testclient import TestClient
import pytest

import kb.server as server_module

from kb.server import app


def _client() -> TestClient:
    return TestClient(app, base_url="https://testserver")


def _exported_html() -> list[Path]:
    return sorted(server_module.WEBUI_DIR.rglob("*.html"))


# Every supported public preview route under `/next`; page copy belongs in the
# product review, not the route/security contract.
PREVIEWS = (
    "/next",
    "/next/architecture",
    "/next/architecture/memory",
    "/next/architecture/capture",
    "/next/architecture/self-hosting",
    "/next/use-cases",
    "/next/contact",
    "/next/login",
)


def test_every_preview_route_is_served_under_the_strict_policy() -> None:
    """Every supported public preview is HTML under the site's default policy.

    `script-src 'self'` is the line that matters. Next.js's App Router emits its
    render payload as executable inline <script> blocks, which a static export
    cannot nonce (a nonce has to be unique per response, and these files are
    written once, at build time). That is why the app is built on the Pages
    Router, whose payload is a <script type="application/json"> data block the
    browser never executes. If this assertion ever fails, the router changed, or
    something started injecting inline script, and the fix is the markup, never
    the policy.
    """
    client = _client()

    for path in PREVIEWS:
        response = client.get(path)

        assert response.status_code == 200, path
        assert response.headers["content-type"].startswith("text/html"), path

        policy = response.headers["content-security-policy"]
        assert "script-src 'self';" in policy, path
        assert "style-src 'self';" in policy, path
        assert "'unsafe-inline'" not in policy, path
        assert "default-src 'self';" in policy, path
        assert "object-src 'none'" in policy, path

    # No preview path is in the one opt-in list that can relax the policy, and
    # none may join it. The list is empty today; while / held the opt-in, this
    # is exactly where it would have been copied across by reflex.
    assert not any(path.startswith("/next") for path in server_module.CSP_INLINE_STYLE_PATHS)


def test_the_preview_route_set_is_closed() -> None:
    """Only explicit public pages resolve; removed paths stay 404."""
    client = _client()

    for path in (
        "/info",
        "/next/info",
        "/next/nope",
        "/next/..%2f..%2fserver.py",
        "/next/index",
        "/architecture/unknown",
        "/next/architecture/unknown",
    ):
        assert client.get(path).status_code == 404, path


def test_the_theme_bootstrap_is_served_as_executable_javascript() -> None:
    """Every exported page loads /next/theme.js from <head>, before paint.

    The site sends X-Content-Type-Options: nosniff, so the browser executes
    this file only if it arrives with a JavaScript media type. Anything else
    (the JSON body of a 404 included) is refused, the bootstrap never runs,
    and a visitor whose remembered choice is dark gets light on every /next
    page while the live pages still honour it.
    """
    client = _client()

    response = client.get("/next/theme.js")

    assert response.status_code == 200
    media_type = response.headers["content-type"].split(";")[0].strip()
    assert media_type in {"text/javascript", "application/javascript"}
    assert response.content == (server_module.WEBUI_DIR / "theme.js").read_bytes()

    # The route is one literal filename, not a pattern: the page allow-list
    # below it stays closed to every other name.
    assert client.get("/next/theme.css").status_code == 404
    assert client.get("/next/landing.js").status_code == 404

    # And every exported document really does depend on it.
    for page in _exported_html():
        assert 'src="/next/theme.js"' in page.read_text(encoding="utf-8"), (
            f"{page.name} does not load the theme bootstrap"
        )



def test_the_export_carries_no_inline_script_and_no_inline_style() -> None:
    """The property that lets /next send the strict policy, checked at the file.

    A response header is easy to keep strict; what is hard is keeping the HTML
    honest about it. This reads the committed export directly, so a rebuild that
    reintroduces an inline <script>, an inline <style> or a style="" attribute
    fails here rather than in a browser console nobody is watching.
    """
    pages = _exported_html()
    assert pages, "no exported HTML — run `npm run build:web`"

    for page in pages:
        html = page.read_text(encoding="utf-8")

        for match in re.finditer(r"<script([^>]*)>", html):
            attributes = match.group(1)
            if "src=" in attributes:
                continue
            # An inline <script> is only acceptable when it is not script: a
            # non-JavaScript type makes the element a data block that the HTML
            # parser never executes and CSP therefore never applies to.
            assert 'type="application/json"' in attributes, (
                f"{page.name} carries an executable inline script: {attributes.strip()}"
            )

        assert "<style" not in html, f"{page.name} carries an inline <style> element"
        assert not re.search(r'\sstyle="', html), f"{page.name} carries a style attribute"


APP_VIEWS = (
    "/next/app",
    "/next/app/search",
    "/next/app/sources",
    "/next/app/graph",
    "/next/app/review",
    "/next/app/admin",
)


def _seated_client(access_key: str) -> TestClient:
    """A TestClient holding a session cookie at the role that key carries."""
    # `from tests.test_server import ...` does not resolve: tests/ has no
    # __init__.py, so it is not a package. For a non-package test directory
    # pytest prepends the test file's own directory to sys.path, which makes
    # the sibling module importable by its bare name and nothing else.
    from test_server import authed_client

    return authed_client(access_key)


def test_the_dashboard_preview_is_closed_to_anonymous_callers() -> None:
    """Every view behind the same door /app uses.

    The export is a static file, so nothing about the document itself is
    private. The route is what is private, and it has to answer the way /app
    does: a redirect to the sign-in page, not the landing page, because the
    caller asked for the app by name.
    """
    client = TestClient(app, base_url="https://testserver")

    for path in APP_VIEWS:
        response = client.get(path, follow_redirects=False)
        assert response.status_code == 303, path
        assert response.headers["location"] == "/login", path


def test_dashboard_views_are_role_gated_at_the_route() -> None:
    """A seat that cannot open a view never receives its markup.

    The dashboard this replaces ships every page's markup to every seat and
    hides what the role cannot use, so a writer really does receive the Admin
    markup and only client-side code keeps it off screen. A static export cannot
    vary its HTML by role at all, so the gate moves to the route: the locked
    page is served in its place, with a 403, and the view's markup never leaves
    the server.
    """
    expected = {
        "test-reader": {
            "/next/app": 200,
            "/next/app/search": 200,
            "/next/app/sources": 200,
            "/next/app/review": 403,
            "/next/app/admin": 403,
        },
        "test-writer": {
            "/next/app": 200,
            "/next/app/search": 200,
            "/next/app/sources": 200,
            "/next/app/review": 200,
            "/next/app/admin": 403,
        },
        "test-admin": {
            "/next/app": 200,
            "/next/app/search": 200,
            "/next/app/sources": 200,
            "/next/app/review": 200,
            "/next/app/admin": 200,
        },
    }

    for access_key, paths in expected.items():
        client = _seated_client(access_key)
        for path, status in paths.items():
            response = client.get(path, follow_redirects=False)
            assert response.status_code == status, f"{access_key} {path}"
            if status == 403:
                assert "not open to your seat" in response.text, f"{access_key} {path}"


def test_no_seat_receives_admin_markup_in_the_document() -> None:
    """The stronger half of the same guarantee, checked at the file.

    The nav's gated entries are rendered after `/api/session` resolves, so the
    Admin entry is in no exported document at any role. A route gate stops a
    writer opening Admin; this stops the link being in the page they were
    served in the first place.
    """
    for page in sorted((server_module.WEBUI_DIR / "app").glob("*.html")) + [
        server_module.WEBUI_DIR / "app.html"
    ]:
        markup = page.read_text(encoding="utf-8")
        assert 'href="/next/app/admin"' not in markup, f"{page.name} ships the Admin nav entry"
        assert 'href="/next/app/review"' not in markup, f"{page.name} ships the Review nav entry"


def test_the_dashboard_view_set_is_closed() -> None:
    client = _seated_client("test-admin")

    for path in ("/next/app/nope", "/next/app/locked", "/next/app/overview"):
        assert client.get(path, follow_redirects=False).status_code == 404, path


def test_graph_view_is_a_real_next_dashboard_route() -> None:
    body = (server_module.WEBUI_DIR / "app" / "graph.html").read_text(encoding="utf-8")
    source = (
        Path(server_module.__file__).resolve().parent.parent
        / "web"
        / "src"
        / "pages"
        / "app"
        / "graph.tsx"
    ).read_text(encoding="utf-8")

    assert "Knowledge graph" in body
    assert "/api/mesh/graph?limit=1000" in source
    assert "Caller-scoped graph projection" in body
    assert "visible_nodes" in source
    assert "Presence-only view. No content nodes are visible for this scope." in source
    assert "No content nodes are visible for this scope." in source

    compiled = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (server_module.WEBUI_DIR / "_next/static/chunks/pages/app").glob("graph-*.js")
    )
    assert "visible_nodes" in compiled
    assert "Presence-only view. No content nodes are visible for this scope." in compiled


def test_sources_view_is_read_only_and_uses_separate_health_endpoints() -> None:
    body = (server_module.WEBUI_DIR / "app" / "sources.html").read_text(encoding="utf-8")
    source = (
        Path(server_module.__file__).resolve().parent.parent
        / "web"
        / "src"
        / "pages"
        / "app"
        / "sources.tsx"
    ).read_text(encoding="utf-8")

    assert "Sources and index health" in body
    assert 'useEndpoint<SourcesResponse>("/api/sources")' in source
    assert 'useEndpoint<IndexesResponse>("/api/indexes")' in source
    for mutation in ("/run", "/ingest", "/promote", "/sync/push", 'method: "POST"'):
        assert mutation not in source, f"Sources view contains a mutation endpoint: {mutation!r}"


def test_review_makes_no_claim_the_api_cannot_support() -> None:
    """Two fields the design spec asked for and the API cannot honestly give.

    No secret scan runs over a promotion candidate (contract map gap 7), so the
    row must carry no scan result and must not substitute the `sensitive` flag
    from LLM enrichment, which is a weaker and different claim. And a pending
    item is one candidate note, so there is no document count to show (gap 6).

    Keyed on the rendered words rather than on the absence of a field name,
    because the failure worth catching is a visitor reading a false assurance.
    """
    markup = (server_module.WEBUI_DIR / "app" / "review.html").read_text(encoding="utf-8")

    for claim in ("secret scan", "Secret scan", "scan passed", "sensitive"):
        assert claim not in markup, f"Review renders an unsupported claim: {claim!r}"
    for counted in ("documents in this", "document count"):
        assert counted not in markup, f"Review renders a per-item document count: {counted!r}"


def test_the_frontend_never_navigates_client_side() -> None:
    """`next/link` would break the Content-Security-Policy. This is the guard.

    Next's Pages Router swaps stylesheets on a client-side route change by
    building a <style> element and appending the new page's CSS as a text node.
    A DOM-created <style> is still an inline style as far as CSP is concerned,
    so under `style-src 'self'` the browser drops it and the visitor lands on an
    unstyled page. Next's own answer is a per-response nonce, which a static
    export cannot have.

    So every link on this site is a plain <a>: a full document load, which
    fetches the next page's stylesheet as a <link> the policy allows. That is
    not a stylistic preference, it is the reason the policy holds, and it is one
    convenience import away from being undone.

    Skipped rather than failed when web/ is absent, because an installed wheel
    ships the built export and none of the sources.
    """
    web_src = Path(server_module.__file__).resolve().parent.parent / "web" / "src"
    if not web_src.is_dir():
        pytest.skip("frontend sources are not part of an installed wheel")

    # Matched as code, not as prose: several of these files explain in a comment
    # why they do not use the router, and a guard that its own rationale trips
    # is a guard someone deletes.
    banned = re.compile(r'from\s+"next/(?:link|router|navigation)"|\buseRouter\(|\brouter\.push\(')
    offenders = [
        path.name
        for path in sorted(web_src.rglob("*.tsx"))
        if banned.search(path.read_text(encoding="utf-8"))
    ]
    assert not offenders, (
        f"client-side navigation reached {offenders}. See the CSP note in web/README.md: "
        "this needs a nonce the static export cannot produce."
    )



def test_the_contact_preview_keeps_the_honeypot_and_posts_nowhere_else() -> None:
    """The bot trap is part of the endpoint's contract, not decoration.

    A human never sees the field, so anything in it marks a bot and the server
    answers 200 regardless, which is what stops a bot learning it was filtered.
    It has to be in the served markup for any of that to happen.
    """
    body = _client().get("/next/contact").text

    assert 'name="website"' in body
    assert 'id="cf-web"' in body
    # Off-screen, not display:none, which some bots skip.
    assert "-left-[9999px]" in body


def test_next_assets_are_served_and_cached_as_immutable_content() -> None:
    """The chunks are content-hashed, so they are safe to cache in the open."""
    index = (server_module.WEBUI_DIR / "index.html").read_text(encoding="utf-8")
    chunk = re.search(r'src="(/next/_next/static/chunks/[^"]+\.js)"', index)
    assert chunk, "the exported document references no chunk under /next/_next/"

    response = _client().get(chunk.group(1))

    assert response.status_code == 200
    assert response.headers["cache-control"] == "public, max-age=300"
    assert "'unsafe-inline'" not in response.headers["content-security-policy"]


def test_canonical_public_routes_are_served_as_html() -> None:
    """Built pages are reachable on their canonical public URLs."""
    client = _client()

    for path in (
        "/",
        "/architecture",
        "/architecture/memory",
        "/architecture/capture",
        "/architecture/self-hosting",
        "/use-cases",
        "/contact",
        "/login",
    ):
        response = client.get(path)
        assert response.status_code == 200, path
        assert response.headers["content-type"].startswith("text/html"), path
        assert response.content.strip(), path

    for path in ("/info", "/next/info"):
        assert client.get(path).status_code == 404, path


def test_public_routes_fall_back_to_hand_written_pages_without_an_export(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Maintained fallback pages stay public when the export is absent."""
    monkeypatch.setattr(server_module, "WEBUI_DIR", tmp_path)
    client = _client()

    for path in ("/", "/use-cases", "/contact", "/login"):
        response = client.get(path)
        assert response.status_code == 200, path
        assert response.headers["content-type"].startswith("text/html"), path
        assert response.content.strip(), path

    # Architecture pages have no hand-written fallback; missing exports and
    # removed status pages must fail closed rather than serve a different page.
    for path in (
        "/architecture",
        "/architecture/memory",
        "/architecture/capture",
        "/architecture/self-hosting",
        "/info",
        "/next/info",
    ):
        assert client.get(path).status_code == 404, path
