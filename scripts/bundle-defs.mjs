/**
 * bundle-defs — Phase 1 of the marketplace refactor (docs/architecture/RX_ORG_MODEL.md).
 *
 * Copies the rx marketplace definitions INTO this package so it ships self-contained
 * (`definitions/`), instead of scraping `rx/components` off the host filesystem at boot.
 * Runs on `prepack` (so the published tarball always carries current defs) and can be run
 * by hand (`npm run sync-defs`). `findDesignComponentsDir()` prefers a real on-disk `rx/` (dev
 * local-wins) and falls back to this bundle when none exists (the purged-image future).
 */
import { cpSync, existsSync, rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // packages/marketplace/scripts
const pkg = dirname(here); // packages/marketplace
const home = join(pkg, "..", "..", "apps", "unoverse"); // the content home
const rx = join(home, "design");
const prompts = join(home, "prompts");
const nodesHome = join(home, "nodes");
const out = join(pkg, "definitions");

if (!existsSync(rx)) {
  console.error(`[bundle-defs] rx/ not found at ${rx} — cannot bundle (run from the monorepo).`);
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// components + atoms are the marketplace definitions; the default styles are the token
// contract + default theme the components render against (consumed by the server in Phase 3).
const parts = [
  ["marketplace/components", "components"],
  ["marketplace/atoms", "atoms"],
  // TEMPLATES — the Template Model kind (2026-08-28). Forgetting a new design kind
  // here ships a package that LOOKS current while every deployed universe resolves
  // an empty shelf (observed live: /dev/templates answered [] on the BPP droplet
  // the day the kind launched).
  ["marketplace/templates", "templates"],
  ["marketplace/styles", "styles"],
];
let n = 0;
for (const [src, name] of parts) {
  const s = join(rx, src);
  if (existsSync(s)) {
    cpSync(s, join(out, name), { recursive: true });
    console.log(`[bundle-defs] rx/${src} → definitions/${name}`);
    n++;
  } else {
    console.warn(`[bundle-defs] skip (missing): rx/${src}`);
  }
}

// ── the rest of the MARKETPLACE (DEVELOPER_GUIDE.md "Type M") ────────────────
//
// This package is the ONE thing a universe installs rather than authors: the
// marketplace above, plus the platform's behaviour and its declarative nodes.
// One package, one version, cut by the platform owner.
//
// Everything bundled here is EXCLUDED from the starter kit. One asset, one home,
// or the copies drift.

// Behaviour: prompt blocks ({{prompt.<name>}}) and skills.
for (const [src, name] of [["blocks", "blocks"], ["skills", "skills"]]) {
  const s = join(prompts, src);
  if (existsSync(s)) {
    cpSync(s, join(out, name), { recursive: true });
    console.log(`[bundle-defs] prompts/${src} → definitions/${name}`);
    n++;
  } else {
    console.warn(`[bundle-defs] skip (missing): prompts/${src}`);
  }
}

// Recipes: whole workflows, published to be READ and COPIED. They ship in the same
// package but they do not install the way the rest does — everything else here is a
// REFERENCE a universe keeps tracking, while a recipe is copied onto a canvas and
// stops tracking the moment it lands. Publishing a better one must never touch a
// canvas someone already pasted it into.
{
  const src = join(nodesHome, "recipes");
  if (existsSync(join(src, "manifest.json"))) {
    cpSync(join(src, "manifest.json"), join(out, "recipes", "manifest.json"), { recursive: true });
    if (existsSync(join(src, "recipes"))) cpSync(join(src, "recipes"), join(out, "recipes", "recipes"), { recursive: true });
    console.log(`[bundle-defs] nodes/recipes → definitions/recipes`);
    n++;
  } else {
    console.warn(`[bundle-defs] skip (missing): nodes/recipes/manifest.json`);
  }
}

// Declarative nodes: only the YAML manifests, never a package's src/ or dist/.
// A code node stays its own npm package until it converts; scanning for node.yaml
// is what keeps a MIXED package's TypeScript out of this tarball.
let nodeCount = 0;
for (const packageDir of existsSync(nodesHome) ? readdirSync(nodesHome, { withFileTypes: true }) : []) {
  if (!packageDir.isDirectory() || packageDir.name.startsWith("_") || packageDir.name.startsWith(".")) continue;
  const nodesDir = join(nodesHome, packageDir.name, "nodes");
  if (!existsSync(nodesDir)) continue;
  for (const nodeDir of readdirSync(nodesDir, { withFileTypes: true })) {
    if (!nodeDir.isDirectory()) continue;
    const src = join(nodesDir, nodeDir.name);
    if (!existsSync(join(src, "node.yaml"))) continue; // not a manifest node
    cpSync(src, join(out, "nodes", packageDir.name, nodeDir.name), { recursive: true });
    nodeCount++;
  }
  // A manifest node is nothing without its package envelope, credential shapes and
  // shared $ref fragments — they resolve relative to the package, so they travel with it.
  for (const extra of ["package.yaml", "credentials", "shared"]) {
    const src = join(nodesHome, packageDir.name, extra);
    if (existsSync(src)) cpSync(src, join(out, "nodes", packageDir.name, extra), { recursive: true });
  }
}
if (nodeCount) {
  console.log(`[bundle-defs] nodes/*/nodes/* → definitions/nodes  (${nodeCount} manifest node(s))`);
  n++;
}

console.log(`[bundle-defs] done — ${n} part(s) bundled into definitions/`);

// THE CATALOGUE IS WRITTEN BY build-catalogue.mts, which runs next.
//
// It used to be written here, by a second implementation of the fingerprint and a second
// naming scheme. The two disagreed with what a universe computes on every one of 114
// items, which would have made every install read as a pending update the day it landed.
// One function, used by both ends: `buildCatalogue()` in @unoverse-platform/base.
