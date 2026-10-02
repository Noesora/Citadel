import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const guard = join(dirname(fileURLToPath(import.meta.url)), "check-pages-export.mjs");
const ISSUES = "https://github.com/Noesora/Citadel/issues";

const nav = '<a href="/">Home</a><a href="/info">Info</a><a href="/use-cases">Use cases</a>';
const page = (body: string) => `<html><body>${nav}${body}</body></html>`;

// A Pages export that is closed the way the real one is: no form, no email
// route, no node-only link, and working navigation and anchors.
const clean: Record<string, string> = {
  "index.html": page(`<link href="/theme.css" rel="stylesheet"><script src="/theme.js"></script><h2 id="start">Start</h2><a href="${ISSUES}">Open an issue</a><a href="#start">go</a><a href="/use-cases#fit">fit</a>`),
  "info.html": page(
    '<a href="https://github.com/masumi-network/Citadel/issues/228">history</a><a href="/#start">top</a>',
  ),
  "use-cases.html": page('<h2 id="fit">Fit</h2>'),
  "login.html": page("<h1>Sign-in closed</h1>"),
  "theme.js": "",
  "theme.css": "body{background:url(/bg.svg)}",
  "bg.svg": "<svg/>",
};

let dir: string;

function write(files: Record<string, string>) {
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
}

function run() {
  const result = spawnSync(process.execPath, [guard, dir], { encoding: "utf8" });
  return { code: result.status, output: result.stdout + result.stderr };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pages-export-"));
  write(clean);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("Pages export guard", () => {
  it("passes a closed export whose links and anchors resolve", () => {
    const { code, output } = run();
    expect(output).toContain("references resolve");
    expect(code).toBe(0);
  });

  it.each([
    ["a contact form", { "info.html": page('<form method="post" action="/contact"></form>') }],
    ["a mailto route", { "info.html": page('<a href="mailto:hello@example.test">mail</a>') }],
    ["a sign-in field", { "login.html": page('<input type="password" name="accessKey">') }],
    ["a form on any other page", { "index.html": page('<textarea name="message"></textarea>') }],
  ])("rejects %s", (_name, files) => {
    write(files);
    const { code, output } = run();
    expect(code).toBe(1);
    expect(output).toContain("without a backend");
  });

  it.each([
    ["login", "login.html", "Sign in at citadel.utxo.ag"],
    ["landing", "index.html", "Part of the Masumi Network"],
    ["info", "info.html", "Based in Zug"],
    ["use-cases", "use-cases.html", "Mail team@utxo.ag"],
  ])("rejects former tenant identity on the %s page", (_name, file, text) => {
    write({ [file]: page(text) });
    const { code, output } = run();
    expect(code).toBe(1);
    expect(output).toContain(file + ": former tenant identity");
  });

  it("rejects a link into the former organization but allows the cited history", () => {
    write({ "use-cases.html": page('<h2 id="fit"></h2><a href="https://github.com/masumi-network/Citadel">repo</a>') });
    const { code, output } = run();
    expect(code).toBe(1);
    expect(output).toContain("link to the former organization: github.com/masumi-network/Citadel");
    expect(output).not.toContain("issues/228");
  });

  it.each(["/app", "/next/app", "/admin/session", "/api/state"])(
    "rejects a link to %s, which this site does not host",
    (href) => {
      write({ "info.html": page(`<a href="${href}">open</a>`) });
      const { code, output } = run();
      expect(code).toBe(1);
      expect(output).toContain("link to a service this site does not host: " + href);
    },
  );

  it("rejects a private dashboard page left in the export", () => {
    write({ "app.html": page("dashboard") });
    const { code, output } = run();
    expect(code).toBe(1);
    expect(output).toContain("private dashboard pages remain");
  });

  it("rejects a dead internal link and a missing stylesheet asset", () => {
    write({ "index.html": page('<a href="/gone">gone</a>'), "theme.css": "body{background:url(/missing.svg)}" });
    const { code, output } = run();
    expect(code).toBe(1);
    expect(output).toContain("index.html: /gone");
    expect(output).toContain("theme.css: /missing.svg");
  });

  it("rejects anchors with no target, on this page or another", () => {
    write({ "index.html": page('<a href="#nowhere">x</a><a href="/use-cases#nowhere">y</a>') });
    const { code, output } = run();
    expect(code).toBe(1);
    expect(output).toContain("#nowhere has no target");
    expect(output).toContain("/use-cases#nowhere has no target");
  });

  it("rejects a landing page that drops the issue tracker", () => {
    write({ "index.html": page("<h1>Citadel</h1>") });
    const { code, output } = run();
    expect(code).toBe(1);
    expect(output).toContain("index.html: the public issue tracker link is missing");
  });

  it.each([
    ["contact.html", "contact page remains in the public export"],
    ["contact/index.html", "contact page remains in the public export"],
    ["_next/static/chunks/pages/contact-0123abcd.js", "contact page chunk remains"],
  ])("rejects %s left in the export", (file, message) => {
    write({ [file]: file.endsWith(".js") ? "" : page(`<a href="${ISSUES}">i</a>`) });
    const { code, output } = run();
    expect(code).toBe(1);
    expect(output).toContain(message);
  });

  it.each(["/contact", "/contact#form", "/contact.html"])(
    "rejects a link to %s even when a contact page was left in the export",
    (href) => {
      write({ "contact.html": page("<h1>Contact</h1>"), "info.html": page(`<a href="${href}">contact</a>`) });
      const { code, output } = run();
      expect(code).toBe(1);
      expect(output).toContain("link to a service this site does not host: " + href);
    },
  );

  it("rejects a dead /contact link when the page is absent", () => {
    write({ "info.html": page('<a href="/contact">contact</a>') });
    const { code, output } = run();
    expect(code).toBe(1);
    expect(output).toContain("info.html: link to a service this site does not host: /contact");
  });

  it("rejects an export missing a required page", () => {
    rmSync(join(dir, "login.html"));
    const { code, output } = run();
    expect(code).toBe(1);
    expect(output).toContain("login.html: page is missing");
  });

  it("fails when there is no export at all", () => {
    rmSync(join(dir, "index.html"));
    const { code, output } = run();
    expect(code).toBe(1);
    expect(output).toContain("did next build run?");
  });
});
