import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { D1Database } from "@cloudflare/workers-types";
import { build } from "esbuild";
import { Miniflare, type MiniflareOptions } from "miniflare";
import { unstable_splitSqlQuery } from "wrangler";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const ORIGIN = "https://citadel.example";
const SALT = "synthetic-waitlist-test-secret-000000000000";
let script: string;
let schema: string[];
let runtime: Miniflare;
let database: D1Database;

beforeAll(async () => {
  const entry = fileURLToPath(new URL("../functions/waitlist.ts", import.meta.url));
  const bundle = await build({
    stdin: {
      contents: `import { onRequest } from ${JSON.stringify(entry)};
        export default { fetch(request, env) {
          return onRequest({ request, env, next() { return new Response("Static page"); } });
        } };`,
      resolveDir: fileURLToPath(new URL(".", import.meta.url)),
    },
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
  });
  script = bundle.outputFiles[0].text;
  schema = unstable_splitSqlQuery(
    await readFile(new URL("../migrations/0001_waitlist.sql", import.meta.url), "utf8"),
  );
});

function runtimeOptions(salt = SALT) {
  return {
    cf: false,
    telemetry: { enabled: false },
    workers: [{
      config: {
        name: "waitlist",
        compatibilityDate: "2026-10-26",
        manifest: {
          mainModule: "index.js",
          modulesRoot: "/",
          modules: { "index.js": { type: "esm", contents: script } },
        },
        env: {
          WAITLIST_DB: { type: "d1", id: "waitlist-test" },
          WAITLIST_RATE_SALT: { type: "text", value: salt },
        },
      },
      dev: { stripCfConnectingIp: false },
    }],
  } satisfies MiniflareOptions;
}

beforeEach(async () => {
  runtime = new Miniflare(runtimeOptions());
  database = await runtime.getD1Database("WAITLIST_DB");
  await database.batch(schema.map((query) => database.prepare(query)));
});

afterEach(async () => {
  await runtime?.dispose();
});

function signup(email: string, ip = "192.0.2.1") {
  return runtime.dispatchFetch(`${ORIGIN}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ email, website: "" }),
  });
}

async function count(table: "waitlist_emails" | "waitlist_attempts") {
  const row = await database.prepare(`SELECT count(*) AS count FROM ${table}`).first<{ count: number }>();
  return row?.count;
}

describe("public waitlist persistence", () => {
  it("stores one normalized address and acknowledges duplicate retries", async () => {
    const first = await signup("  Visitor@Example.TEST  ");
    const retry = await signup("visitor@example.test");
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ stored: true });
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ stored: true });
    expect(await database.prepare("SELECT email FROM waitlist_emails").all()).toMatchObject({
      results: [{ email: "visitor@example.test" }],
    });
    const attempt = await database.prepare("SELECT ip_hash FROM waitlist_attempts LIMIT 1").first<{ ip_hash: string }>();
    expect(attempt?.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(attempt?.ip_hash).not.toContain("192.0.2.1");
  });

  it("accepts native form POST without echoing the address or placing it in a URL", async () => {
    const response = await runtime.dispatchFetch(`${ORIGIN}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "text/html", "CF-Connecting-IP": "192.0.2.1" },
      body: new URLSearchParams({ email: "native@example.test", website: "" }).toString(),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("Your email is saved");
    expect(html).not.toContain("native@example.test");
    expect(response.headers.get("location")).toBeNull();
    expect(await count("waitlist_emails")).toBe(1);
  });

  it.each([
    { email: "invalid", website: "" },
    { email: ".bad@example.test", website: "" },
    { email: "bad..local@example.test", website: "" },
    { email: "valid@example.test", website: "bot" },
    { email: "valid@example.test", website: "", unexpected: "field" },
  ])("rejects invalid or bot input without writing a record: %j", async (payload) => {
    const response = await runtime.dispatchFetch(`${ORIGIN}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "CF-Connecting-IP": "192.0.2.1" },
      body: JSON.stringify(payload),
    });
    expect(response.status).toBe(422);
    expect(await count("waitlist_emails")).toBe(0);
    expect(await count("waitlist_attempts")).toBe(0);
  });

  it("accepts a bounded body and rejects one byte beyond the request cap", async () => {
    const body = JSON.stringify({ email: "boundary@example.test", website: "" });
    for (const size of [4096, 4097]) {
      const response = await runtime.dispatchFetch(`${ORIGIN}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "CF-Connecting-IP": "192.0.2.1" },
        body: body.padEnd(size, " "),
      });
      expect(response.status).toBe(size === 4096 ? 200 : 422);
    }
    expect(await count("waitlist_emails")).toBe(1);
  });

  it("rejects a cross-origin form before any write", async () => {
    const response = await runtime.dispatchFetch(`${ORIGIN}/waitlist`, {
      method: "POST",
      headers: { Origin: "https://unrelated.example", "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" },
      body: JSON.stringify({ email: "visitor@example.test", website: "" }),
    });
    expect(response.status).toBe(403);
    expect(await count("waitlist_emails")).toBe(0);
  });

  it("does not report storage success or retain a quota write after a failed transaction", async () => {
    await database.prepare("DROP TABLE waitlist_emails").run();
    const response = await signup("failure@example.test");
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('"stored":true');
    expect(await count("waitlist_attempts")).toBe(0);
  });

  it("rejects writes when the server-only rate secret is unavailable", async () => {
    await runtime.setOptions(runtimeOptions(""));
    database = await runtime.getD1Database("WAITLIST_DB");
    const response = await signup("failure@example.test");
    expect(response.status).toBe(503);
    expect(await count("waitlist_emails")).toBe(0);
  });

  it("enforces the per-IP quota across concurrent requests", async () => {
    const responses = await Promise.all(Array.from({ length: 4 }, (_, index) => signup(`same-ip-${index}@example.test`)));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 200, 200, 429]);
    expect(await count("waitlist_emails")).toBe(3);
    expect(await count("waitlist_attempts")).toBe(3);
  });

  it("enforces the global quota across concurrent clients", async () => {
    const responses = await Promise.all(Array.from({ length: 31 }, (_, index) => signup(`global-${index}@example.test`, `192.0.2.${index + 1}`)));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(30);
    expect(responses.filter((response) => response.status === 429)).toHaveLength(1);
    expect(await count("waitlist_emails")).toBe(30);
  });

  it("expires old quota attempts instead of permanently blocking a client", async () => {
    await signup("old@example.test");
    await database.prepare("UPDATE waitlist_attempts SET created_at = unixepoch() - 3601").run();
    const response = await signup("new@example.test");
    expect(response.status).toBe(200);
    expect(await count("waitlist_attempts")).toBe(1);
    expect(await count("waitlist_emails")).toBe(2);
  });

  it("keeps a full store intact while acknowledging an already stored address", async () => {
    await database.prepare(`WITH RECURSIVE numbers(value) AS (
      SELECT 1 UNION ALL SELECT value + 1 FROM numbers WHERE value < 5000
    ) INSERT INTO waitlist_emails(email, created_at)
      SELECT printf('seed%d@example.test', value), unixepoch() FROM numbers`).run();
    const full = await signup("overflow@example.test");
    expect(full.status).toBe(503);
    const retry = await signup("seed1@example.test");
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ stored: true });
    expect(await count("waitlist_emails")).toBe(5000);
  }, 30_000);

  it("does not provide a public mutation other than signup", async () => {
    const response = await runtime.dispatchFetch(`${ORIGIN}/waitlist`, { method: "DELETE" });
    expect(response.status).toBe(405);
    expect(await count("waitlist_emails")).toBe(0);
  });
});
