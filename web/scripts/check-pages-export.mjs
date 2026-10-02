/* Check the Pages static export before it is published.
 *
 * The FastAPI export uses /next; a Pages build must resolve files at /. This
 * also refuses a Pages site that offers a service it does not host: a form or
 * email route, a link to the dashboard or session API, or the former tenant's
 * identity. Usage: node check-pages-export.mjs [export-dir] (default web/out).
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const out = resolve(process.argv[2] ?? join(dirname(dirname(fileURLToPath(import.meta.url))), "out"));

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function filesWithExtension(dir, extension) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await filesWithExtension(path, extension)));
    else if (entry.name.endsWith(extension)) found.push(path);
  }
  return found;
}

// Pages serves /x from x, x.html or x/index.html, in that order.
async function resolves(urlPath) {
  const rel = decodeURIComponent(urlPath);
  const candidates = [rel, `${rel}.html`, join(rel, "index.html")];
  for (const candidate of candidates) {
    if (await exists(join(out, candidate))) return true;
  }
  return false;
}

function htmlFile(urlPath) {
  const rel = decodeURIComponent(urlPath === "/" ? "index" : urlPath.slice(1));
  return [join(out, rel + ".html"), join(out, rel, "index.html")].find((candidate) => ids.has(candidate));
}

if (!(await exists(join(out, "index.html")))) {
  console.error("no export at " + out + ": did next build run?");
  process.exit(1);
}

const attr = /\b(?:src|href)="(\/[^"/][^"]*|\/)"/g;
const anchor = /\bhref="((?:\/[^"#]*)?)#([^"]+)"/g;
const problems = [];
const topLevel = await readdir(out);
if (topLevel.some((name) => name === "app" || name === "app.html")) {
  problems.push("private dashboard pages remain in the public export");
}
if (topLevel.some((name) => name === "contact" || name === "contact.html")) {
  problems.push("contact page remains in the public export: Pages has no contact backend");
}

// Pages has no backend. A control or link for one would collect or send input
// into nothing, so none may exist on any page.
const NO_BACKEND = /<(?:form|input|textarea)\b|mailto:/i;
// Names and hosts of the previous operator. The /info page may link two
// upstream issues as history; any other masumi-network URL is an identity leak.
const FORMER_IDENTITY = /utxo AG|utxo\.ag|nmkr\.io|Masumi Network|Sokosumi Network|\bZug\b/i;
const FORMER_ORG_LINK = /github\.com\/(?:masumi-network|utxo-ag)\/[^"]*/gi;
const HISTORICAL_LINKS = new Set([
  "github.com/masumi-network/Citadel/issues/228",
  "github.com/masumi-network/Citadel/issues/247",
]);
// Services served by FastAPI or a node, never by the Pages site.
const NODE_ONLY = /^\/(?:app|next|admin|api|readyz|healthz|contact(?:\.html)?)(?:\/|$)/;

const REQUIRED_PAGES = ["index.html", "info.html", "use-cases.html", "login.html"];
for (const page of REQUIRED_PAGES) {
  if (!(await exists(join(out, page)))) problems.push(page + ": page is missing from the export");
}

const htmlFiles = await filesWithExtension(out, ".html");
const ids = new Map();
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  ids.set(file, new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])));
}

// There is no /contact on Pages: it needs the node's relay. Neither the page
// nor the chunk that holds its form may ship, and no link may point at it.
for (const file of await filesWithExtension(out, ".js")) {
  if (/(?:^|\/)contact-[^/]*\.js$/.test(file.slice(out.length + 1))) {
    problems.push(file.slice(out.length + 1) + ": contact page chunk remains in the public export");
  }
}

// With no form or inbox, the issue tracker is the only way left to reach the
// project; the landing page has to keep a link to it.
if (!(await readFile(join(out, "index.html"), "utf8")).includes('href="https://github.com/Noesora/Citadel/issues"')) {
  problems.push("index.html: the public issue tracker link is missing");
}

let checked = 0;

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relative = file.slice(out.length + 1);
  if (NO_BACKEND.test(html)) {
    problems.push(relative + ": a form or email route remains without a backend");
  }
  if (FORMER_IDENTITY.test(html)) {
    problems.push(relative + ": former tenant identity remains on the public site");
  }
  for (const [link] of html.matchAll(FORMER_ORG_LINK)) {
    if (!HISTORICAL_LINKS.has(link)) problems.push(relative + ": link to the former organization: " + link);
  }
  for (const [, ref] of html.matchAll(attr)) {
    const pathname = ref.split(/[?#]/)[0];
    if (NODE_ONLY.test(pathname)) {
      problems.push(relative + ": link to a service this site does not host: " + ref);
      continue;
    }
    checked += 1;
    const target = pathname === "/" ? "index.html" : pathname.slice(1);
    if (!(await resolves(target))) {
      problems.push(`${relative}: ${ref}`);
    }
  }
  // A fragment has to land on an element, in this page or the page it names.
  for (const [, pathname, id] of html.matchAll(anchor)) {
    checked += 1;
    const targetFile = pathname === "" ? file : htmlFile(pathname);
    const known = targetFile ? ids.get(targetFile) : undefined;
    if (!known || !known.has(decodeURIComponent(id))) {
      problems.push(`${relative}: ${pathname}#${id} has no target`);
    }
  }
}

const cssUrl = /url\(\s*(['"]?)(\/(?!\/)[^)'\"]+)\1\s*\)/g;
for (const file of await filesWithExtension(out, ".css")) {
  const css = await readFile(file, "utf8");
  for (const [, , ref] of css.matchAll(cssUrl)) {
    const pathname = ref.split(/[?#]/)[0];
    checked += 1;
    if (!(await resolves(pathname.slice(1)))) {
      problems.push(file.slice(out.length + 1) + ": " + ref);
    }
  }
}

if (problems.length > 0) {
  const unique = [...new Set(problems)];
  console.error(`${unique.length} reference(s) do not resolve inside web/out/:`);
  for (const line of unique.slice(0, 20)) console.error(`  ${line}`);
  process.exit(1);
}

console.log("web/out/ HTML and CSS references resolve: " + checked);
