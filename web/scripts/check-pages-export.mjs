/* Check root-relative HTML and CSS assets in the Pages static export.
 * The FastAPI export uses /next; a Pages build must resolve files at /.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(dirname(fileURLToPath(import.meta.url))), "out");

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

if (!(await exists(join(out, "index.html")))) {
  console.error("no export at " + out + ": did next build run?");
  process.exit(1);
}

const attr = /\b(?:src|href)="(\/[^"/][^"]*|\/)"/g;
const problems = [];
let checked = 0;

for (const file of await filesWithExtension(out, ".html")) {
  const html = await readFile(file, "utf8");
  for (const [, ref] of html.matchAll(attr)) {
    const pathname = ref.split(/[?#]/)[0];
    // The dashboard preview is served by FastAPI at /next/app; it is not part
    // of the Pages site, so links out to it are not asset references.
    if (pathname === "/next/app" || pathname.startsWith("/next/app/")) continue;
    checked += 1;
    const target = pathname === "/" ? "index.html" : pathname.slice(1);
    if (!(await resolves(target))) {
      problems.push(`${file.slice(out.length + 1)}: ${ref}`);
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
