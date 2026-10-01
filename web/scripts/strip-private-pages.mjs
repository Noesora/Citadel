// The FastAPI dashboard is not served by Cloudflare Pages.
import { rm } from "node:fs/promises";

const out = new URL("../out/", import.meta.url);
await rm(new URL("app.html", out), { force: true });
await rm(new URL("app/", out), { recursive: true, force: true });
