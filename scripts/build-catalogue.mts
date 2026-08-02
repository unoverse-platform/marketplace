/**
 * Write the catalogue this package publishes.
 *
 * ONE IMPLEMENTATION, TWO PLACES. `buildCatalogue()` is what a universe runs to work out
 * what it can install. This script runs the SAME function at build time and saves its
 * answer, so a universe fetching the published file gets exactly what it would have
 * computed for itself. The previous file was written by a second implementation inside
 * bundle-defs.mjs, and the two agreed on nothing: different keys, different hashes, zero
 * of 114 items matching.
 *
 * Definitions are stripped. The list is for browsing; the definition is fetched on
 * install, from its own path in this same folder.
 *
 * Also writes index.html, which earns its place twice: a person landing on the
 * marketplace URL sees what is published, and DigitalOcean's static-site buildpack needs
 * an index to recognise the folder as servable at all.
 *
 * Runs after bundle-defs.mjs, which is what puts the definitions on disk to read.
 */
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogue } from "@unoverse-platform/base/items/catalogue.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = dirname(here);
const out = join(pkg, "definitions");

const release = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")).version;
const full = await buildCatalogue();
const catalogue = full.map(({ definition, ...rest }) => rest);

writeFileSync(join(out, "catalogue.json"), JSON.stringify({ release, items: catalogue }, null, 2) + "\n");

/**
 * ONE FILE PER ITEM, ready to install.
 *
 * The catalogue is the menu and deliberately carries no definitions: it is fetched on
 * every visit and forty component trees would make it heavy for no gain. An install needs
 * the definition though, and a static host cannot compose one out of the source folders
 * beside it. So the definition is written here, already composed, at a path derived from
 * (kind, name) so a universe can fetch it without asking anything first.
 *
 * Rebuilt from scratch each time: a stale file for an item that no longer exists would be
 * installable long after it was withdrawn.
 */
const itemsDir = join(out, "items");
rmSync(itemsDir, { recursive: true, force: true });
for (const item of full) {
  const dir = join(itemsDir, item.kind);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${item.name}.json`), JSON.stringify(item, null, 2) + "\n");
}

const byKind = catalogue.reduce<Record<string, number>>((a, i) => ((a[i.kind] = (a[i.kind] ?? 0) + 1), a), {});
const kinds = Object.entries(byKind).sort(([a], [b]) => a.localeCompare(b));

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

writeFileSync(
  join(out, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unoverse Marketplace</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 15px/1.6 ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 3rem 1.5rem; }
  main { max-width: 46rem; margin: 0 auto; }
  h1 { font-size: 1.6rem; letter-spacing: -0.02em; margin: 0 0 .25rem; }
  p { margin: .25rem 0 1.5rem; opacity: .75; }
  code { font-family: ui-monospace, monospace; font-size: .9em; }
  table { border-collapse: collapse; width: 100%; }
  td { padding: .35rem 0; border-bottom: 1px solid rgba(128,128,128,.25); }
  td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<main>
  <h1>Unoverse Marketplace</h1>
  <p>Release ${esc(release)} &middot; ${catalogue.length} items</p>
  <table>
    ${kinds.map(([kind, n]) => `<tr><td>${esc(kind)}</td><td>${n}</td></tr>`).join("\n    ")}
  </table>
  <p style="margin-top:2rem">
    The catalogue is <a href="catalogue.json"><code>catalogue.json</code></a>.
    Each item's definition sits at its own path in this folder.
  </p>
</main>
</body>
</html>
`,
);

console.log(`[build-catalogue] ${catalogue.length} items (${kinds.map(([k, n]) => `${k} ${n}`).join(", ")}) → release ${release}`);
