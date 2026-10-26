import type { PagesFunction, Request as WorkerRequest } from "@cloudflare/workers-types";

interface WaitlistEnv extends WaitlistBindings {
  WAITLIST_RATE_SALT: string;
}

const MAX_REQUEST_BYTES = 4096;
const MAX_EMAIL_LENGTH = 320;
const ENCODER = new TextEncoder();
const LOCAL_PART = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

function receipt(request: WorkerRequest, status: number) {
  const message = status === 200
    ? "Your email is saved for waitlist and access updates. Joining does not create an account."
    : status === 429
      ? "Too many signup attempts. Try again later."
      : status === 503
        ? "Waitlist signup is temporarily unavailable."
        : "Invalid signup request.";
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  };
  if (status === 405) headers.Allow = "GET, HEAD, POST";
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/html") && !accept.includes("application/json")) {
    headers["Content-Type"] = "text/html; charset=utf-8";
    return new Response(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Citadel waitlist</title></head><body><main><h1>Citadel waitlist</h1><p>${message}</p><a href="/waitlist">Back to the waitlist</a></main></body></html>`,
      { status, headers },
    );
  }
  headers["Content-Type"] = "application/json; charset=utf-8";
  return new Response(JSON.stringify(status === 200 ? { stored: true } : { detail: message }), { status, headers });
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") throw new Error("invalid email");
  const email = value.trim();
  const separator = email.indexOf("@");
  if (email.length > MAX_EMAIL_LENGTH || separator < 1 || separator !== email.lastIndexOf("@")) throw new Error("invalid email");
  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  if (
    !local || local.length > 64 || local.startsWith(".") || local.endsWith(".")
    || local.includes("..") || !LOCAL_PART.test(local) || /[\s/@:?#%\\]/u.test(domain)
  ) throw new Error("invalid email");
  const hostname = new URL(`https://${domain}`).hostname.toLowerCase();
  const labels = hostname.split(".");
  if (hostname.length > 255 || labels.length < 2 || labels.some((label) => !DOMAIN_LABEL.test(label))) {
    throw new Error("invalid email");
  }
  const normalized = `${local.toLowerCase()}@${hostname}`;
  if (normalized.length > MAX_EMAIL_LENGTH) throw new Error("invalid email");
  return normalized;
}

async function readEmail(request: WorkerRequest) {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (type !== "application/json" && type !== "application/x-www-form-urlencoded") throw new Error("invalid content type");
  if (!request.body) throw new Error("missing body");
  const reader = request.body.getReader();
  const bytes = new Uint8Array(MAX_REQUEST_BYTES);
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (size + chunk.value.byteLength > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new Error("body too large");
      }
      bytes.set(chunk.value, size);
      size += chunk.value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes.subarray(0, size));
  let payload: unknown;
  if (type === "application/json") {
    payload = JSON.parse(text);
  } else {
    const form = new URLSearchParams(text);
    for (const key of form.keys()) {
      if ((key !== "email" && key !== "website") || form.getAll(key).length !== 1) throw new Error("invalid form");
    }
    payload = { email: form.get("email"), website: form.get("website") || "" };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("invalid fields");
  if (Object.keys(payload).some((key) => key !== "email" && key !== "website")) throw new Error("invalid fields");
  const website = "website" in payload ? payload.website : "";
  if (typeof website !== "string" || website.length > 200 || website.trim()) throw new Error("invalid honeypot");
  return normalizeEmail("email" in payload ? payload.email : undefined);
}

async function clientHash(ip: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", ENCODER.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, ENCODER.encode(ip));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const onRequest: PagesFunction<WaitlistEnv> = async (context) => {
  const request = context.request;
  if (request.method === "GET" || request.method === "HEAD") return context.next();
  if (request.method !== "POST") return receipt(request, 405);
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return receipt(request, 403);
  }
  let email: string;
  try {
    email = await readEmail(request);
  } catch {
    return receipt(request, 422);
  }
  const { WAITLIST_DB: database, WAITLIST_RATE_SALT: salt } = context.env;
  const ip = request.headers.get("cf-connecting-ip");
  if (!database || typeof database.batch !== "function" || typeof salt !== "string" || salt.length < 32 || !ip || ip.length > 64 || !/^[0-9a-f:.]+$/i.test(ip)) {
    return receipt(request, 503);
  }
  try {
    const now = Math.floor(Date.now() / 1000);
    const hash = await clientHash(ip, salt);
    const results = await database.batch([
      database.prepare("DELETE FROM waitlist_attempts WHERE created_at <= ?").bind(now - 3600),
      database.prepare("INSERT INTO waitlist_attempts(ip_hash, created_at) VALUES (?, ?)").bind(hash, now),
      database.prepare("INSERT INTO waitlist_emails(email, created_at) VALUES (?, ?) ON CONFLICT(email) DO NOTHING").bind(email, now),
    ]);
    if (results.some((result) => !result.success)) return receipt(request, 503);
    return receipt(request, 200);
  } catch (error) {
    if (error instanceof Error && error.message.includes("WAITLIST_RATE_LIMIT")) return receipt(request, 429);
    console.error(JSON.stringify({ event: "waitlist_storage_unavailable" }));
    return receipt(request, 503);
  }
};
