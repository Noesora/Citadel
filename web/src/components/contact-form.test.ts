import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContactForm, submitContact } from "./contact-form";

function fields() {
  const data = new FormData();
  data.set("name", "A visitor");
  data.set("email", "visitor@example.test");
  data.set("message", "Can we talk?");
  return data;
}

afterEach(() => vi.unstubAllGlobals());

describe("SPEC V12 contact receipt", () => {
  it("rejects a successful HTML fallback without a delivery receipt", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Contact</html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    })));
    await expect(submitContact(fields())).rejects.toThrow("That did not go through.");
  });

  it("rejects a JSON-looking response labeled as HTML", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"stored":true}', {
      status: 200,
      headers: { "content-type": "text/html" },
    })));
    await expect(submitContact(fields())).rejects.toThrow("That did not go through.");
  });

  it("distinguishes a saved message from a delivered alert", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ stored: true, delivered: false }))
      .mockResolvedValueOnce(Response.json({ stored: false, delivered: true }));
    vi.stubGlobal("fetch", fetch);
    await expect(submitContact(fields())).resolves.toBe("stored");
    await expect(submitContact(fields())).resolves.toBe("delivered");
  });

  it("rejects a 200 JSON response with no receipt", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: true })));
    await expect(submitContact(fields())).rejects.toThrow("That did not go through.");
  });

  it("shows a server rejection rather than claiming success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "Too many messages." }, { status: 429 })));
    await expect(submitContact(fields())).rejects.toThrow("Too many messages.");
  });
});

describe("SPEC V13 contact before hydration", () => {
  it("uses POST so name and message do not enter the URL", () => {
    const html = renderToStaticMarkup(createElement(ContactForm));
    const form = html.match(/<form\b[^>]*>/)?.[0];
    expect(form).toContain('method="post"');
    expect(form).toContain('action="/contact"');
  });
});
