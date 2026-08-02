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
 * Also ships the STOREFRONT (storefront/index.html), which is the marketplace's own user
 * experience and the reason this deploys separately from the platform. It doubles as the
 * index a static host needs to recognise the folder as servable.
 *
 * Runs after bundle-defs.mjs, which is what puts the definitions on disk to read.
 */
import { writeFileSync, readFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
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

// THE STOREFRONT IS AUTHORED, NOT GENERATED. It is the marketplace's own user
// experience (MARKETPLACE.md §4), edited like any other page and deployed by pushing
// this repo. Copied in rather than written here so nobody edits a string in a build
// script when they mean to change a website.
// The storefront is a Vite build (storefront/), emitted straight into definitions/ by
// `npm run build:storefront`. Nothing to copy here.

const byKind = catalogue.reduce<Record<string, number>>((a, i) => ((a[i.kind] = (a[i.kind] ?? 0) + 1), a), {});
const kinds = Object.entries(byKind).sort(([a], [b]) => a.localeCompare(b));
console.log(`[build-catalogue] ${catalogue.length} items (${kinds.map(([k, n]) => `${k} ${n}`).join(", ")}) → release ${release}`);
