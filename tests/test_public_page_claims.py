"""Checks claims in authored public pages and the generated login page."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

import kb.server as server_module


REPO = Path(server_module.__file__).resolve().parent.parent
STATIC = REPO / "kb" / "static"
WEB_SRC = REPO / "web" / "src"


def public_surfaces() -> dict[str, str]:
    """Every document that carries the shared public top nav.

    Membership is derived from the nav itself rather than listed, so a page
    added later is covered the day it is written. `kb/static/index.html` is
    excluded by that derivation and should be: it is the signed-in dashboard
    shell, which has a sidebar and no top nav.
    """
    pages = {
        f"kb/static/{p.name}": text
        for p in sorted(STATIC.glob("*.html"))
        if 'class="topnav"' in (text := p.read_text(encoding="utf-8"))
    }
    pages["kb/server.py:LOGIN_HTML"] = server_module.LOGIN_HTML
    return pages


def test_the_public_surfaces_are_the_ones_we_think_they_are() -> None:
    """Guards every check below from passing over a shrunken set."""
    assert set(public_surfaces()) >= {
        "kb/static/landing.html",
        "kb/static/info.html",
        "kb/static/use-cases.html",
        "kb/static/contact.html",
        "kb/server.py:LOGIN_HTML",
    }


def authored_sources() -> dict[str, str]:
    """Every hand-written source for either frontend.

    `kb/webui/` is excluded on purpose: it is build output, regenerated once
    from the merged tree, and checking it here would report the state of the
    last rebuild rather than the state of the source.
    """
    pages = public_surfaces()
    pages.update(
        {
            f"web/src/{p.relative_to(WEB_SRC)}": p.read_text(encoding="utf-8")
            for p in sorted(WEB_SRC.rglob("*.tsx"))
        }
    )
    return pages


# --------------------------------------------------------------------------
# the repo link in the nav
# --------------------------------------------------------------------------




def test_the_navigation_repo_link_is_labelled_and_safe_to_open() -> None:
    """The link is an icon, so it needs a name; it opens a new tab, so it needs
    `rel=noopener`."""
    for name, body in public_surfaces().items():
        anchor = re.search(r'<a class="navicon"[^>]*>', body)
        assert anchor is not None, f"{name} has no .navicon anchor"
        tag = anchor.group(0)
        assert 'aria-label="GitHub repository"' in tag, name
        assert 'rel="noopener noreferrer"' in tag, name


# --------------------------------------------------------------------------
# the contact page's second route in
# --------------------------------------------------------------------------


def test_the_contact_page_offers_an_email_route() -> None:
    """The form relays into a team chat and has been down in production before.

    An address that only exists in the form's success path is not a route in
    when the form is the thing that is broken.
    """
    body = (STATIC / "contact.html").read_text(encoding="utf-8")
    assert 'href="mailto:' in body, "no mailto route on /contact"
    assert "sarthi.borkar@nmkr.io" in body


# --------------------------------------------------------------------------
# the proof tiles
# --------------------------------------------------------------------------


def test_the_landing_proof_tiles_say_what_they_measure() -> None:
    body = (STATIC / "landing.html").read_text(encoding="utf-8")
    for label in (
        "Open source, self-hosted",
        "Per agent. Central stays in sync",
        "MCP tools for agents",
        "Self-host; mostly RAM, not a fixed bill",
    ):
        assert label in body, f"missing landing tile: {label}"
    assert "Apache-2.0" in body
    assert "Seat + Node" in body
    assert "~$23–$58/mo" in body
    assert "To self-host the whole node" not in body
    assert "~$23/mo" not in body
    assert "~$38/mo" not in body
    assert "~$55/mo" not in body
    assert ">25 s<" not in body
    assert ">269 ms<" not in body
    tsx = (WEB_SRC / "pages" / "index.tsx").read_text(encoding="utf-8")
    assert "Apache-2.0" in tsx
    assert "Seat + Node" in tsx
    assert "~$23–$58/mo" in tsx
    assert ">25 s<" not in tsx
    assert "~$23/mo" not in tsx
    assert "~$55/mo" not in tsx
    assert ">269 ms<" not in tsx


def test_the_info_tiles_say_when_each_figure_was_taken() -> None:
    body = (STATIC / "info.html").read_text(encoding="utf-8")
    assert "Self-host; mostly RAM, not a fixed bill" in body
    assert "per agent. Central stays in sync" in body
    assert "Seat + Node" in body
    assert "~$23–$58/mo" in body
    assert "~$23/mo" not in body
    assert "about $58" in body
    assert "7-day 2026-08-14" in body
    assert ">25 s<" not in body
    assert ">269 ms<" not in body
    assert "Search 25 s is the" not in body
    assert "~$55/mo" not in body
    # v0.5.0 release note is historical and stays true for that tag.
    assert "Self-host cost stays ~$38/mo" in body
    tsx = (WEB_SRC / "pages" / "info.tsx").read_text(encoding="utf-8")
    assert "~$23–$58/mo" in tsx
    assert "~$23/mo" not in tsx
    assert "Seat + Node" in tsx
    assert 'value="25 s"' not in tsx
    assert 'value="269 ms"' not in tsx
    assert "Self-host; mostly RAM, not a fixed bill" in tsx
    assert "Search 25 s is the" not in tsx
    assert "about $58" in tsx
    assert "7-day 2026-08-14" in tsx
    assert "Self-host cost stays" in tsx and "~$38/mo" in tsx


@pytest.mark.parametrize(
    "figure",
    [
        # Recomputed on this branch: the suite collects far more than either of
        # these, and both were on the page in two different versions.
        ">900<",
        ">906<",
        "tests across 52 files",
        "53 modules",
        # Never came from a run this repo can perform. The per-surface p50s
        # behind it were one-off probe scripts, and scripts/bench records a
        # different figure entirely.
        "300 to 500",
        "300&ndash;500ms",
    ],
)
def test_no_public_page_carries_a_figure_this_repo_cannot_recompute(figure: str) -> None:
    guilty = [name for name, body in authored_sources().items() if figure in body]
    assert guilty == [], f"{figure!r} is back on: {guilty}"


def test_no_page_calls_the_cost_snapshot_reproducible() -> None:
    """`cost_model.py` holds a day's Railway averages as a module constant.

    Re-running it therefore reprints the same total by construction and can
    never detect drift, so "reproducible on demand" described the wrong half of
    the harness. The latency figure is genuinely re-measurable; the cost is not.
    """
    for name, body in authored_sources().items():
        assert "reproducible on demand" not in body, name
