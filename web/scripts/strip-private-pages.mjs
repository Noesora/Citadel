// Cloudflare Pages serves neither the FastAPI dashboard nor the contact relay.
// Pages has no backend, so /contact is not a page there: drop its HTML and the
// page's JavaScript chunk (which holds the form code), and let the URL 404.
import { readdir, rm } from "node:fs/promises";

const out = new URL("../out/", import.meta.url);
await rm(new URL("app.html", out), { force: true });
await rm(new URL("app/", out), { recursive: true, force: true });
await rm(new URL("contact.html", out), { force: true });
await rm(new URL("contact/", out), { recursive: true, force: true });

const pageChunks = new URL("_next/static/chunks/pages/", out);
for (const name of await readdir(pageChunks)) {
  if (/^contact-[^/]*\.js$/.test(name)) await rm(new URL(name, pageChunks), { force: true });
}
