import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { submitWaitlist, WaitlistForm } from "./waitlist-form";

const EMAIL = "visitor@example.test";

afterEach(() => vi.unstubAllGlobals());

describe("waitlist submission", () => {
  it("posts the email in a JSON body without putting it in the URL", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ stored: true }));
    vi.stubGlobal("fetch", fetch);

    await expect(submitWaitlist(EMAIL, "")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith("/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: EMAIL, website: "" }),
    });
  });

  it.each([
    ["HTML with status 200", new Response("<h1>Saved</h1>", { status: 200, headers: { "content-type": "text/html" } })],
    ["a non-200 JSON receipt", Response.json({ stored: true }, { status: 201 })],
    ["a JSON response without a stored receipt", Response.json({ ok: true })],
    ["a JSON response with stored false", Response.json({ stored: false })],
  ])("does not report success for %s", async (_name, response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(submitWaitlist(EMAIL, "")).rejects.toThrow("We could not save your email.");
  });
});

describe("waitlist form before hydration", () => {
  it("uses an accessible email field and a native POST action", () => {
    const html = renderToStaticMarkup(createElement(WaitlistForm));
    const form = html.match(/<form\b[^>]*>/)?.[0] ?? "";

    expect(form).toContain('method="post"');
    expect(form).toContain('action="/waitlist"');
    expect(html).toContain('for="waitlist-email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('type="email"');
    expect(form).not.toContain("method=\"get\"");
  });
});
