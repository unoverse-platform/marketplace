/**
 * bundle-defs — Phase 1 of the marketplace refactor (docs/architecture/RX_ORG_MODEL.md).
 *
 * Copies the rx marketplace definitions INTO this package so it ships self-contained
 * (`definitions/`), instead of scraping `rx/components` off the host filesystem at boot.
 * Runs on `prepack` (so the published tarball always carries current defs) and can be run
 * by hand (`npm run sync-defs`). `findRxComponentsDir()` prefers a real on-disk `rx/` (dev
 * local-wins) and falls back to this bundle when none exists (the purged-image future).
 */
import { cpSync, existsSync, rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // packages/marketplace/scripts
const pkg = dirname(here); // packages/marketplace
const home = join(pkg, "..", "..", "apps", "unoverse"); // the content home
const rx = join(home, "rx");
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

// ── THE CATALOGUE — one fingerprint per installable item ─────────────────────
//
// The package carries ONE version (the marketplace release). Individual items are
// tracked by CONTENT FINGERPRINT instead, so a universe updates one skill or one node
// without taking the rest. Nobody bumps a number; a fingerprint is derived and cannot
// lie about its content.
//
// FINGERPRINT THE MEANING, NOT THE BYTES. Every value is parsed and re-serialised
// canonically (sorted keys) before hashing, so formatting never registers as a change.
// This is not theoretical: converting rx/ from JSON to YAML rewrote all 242 files and
// changed nothing a universe consumes. Byte hashes would have flagged every item in the
// marketplace as updated for a reformat.
//
// An item's fingerprint covers ITS OWN files only. An atom is its own item, so a change
// there moves the atom's fingerprint and not the twenty components that Ref it — those
// re-render from the updated atom once it is taken. The alternative (hashing each
// component's fully composed output) would flag twenty items for one edit, which reads
// as noise rather than information.
//
// RECIPES ARE EXCLUDED ON PURPOSE. Everything else here is a REFERENCE a universe keeps
// tracking; a recipe is copied onto a canvas and stops tracking the moment it lands.
// Offering to "update" one would mean editing a canvas someone already owns.
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";

const canonical = (v) =>
  v === null || typeof v !== "object"
    ? JSON.stringify(v)
    : Array.isArray(v)
      ? `[${v.map(canonical).join(",")}]`
      : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;

/** Canonical text for one file: structured formats are normalised, anything else
 *  (README.md, an onstart.js handler) is hashed as written. */
function contentOf(file) {
  const raw = readFileSync(file, "utf8");
  try {
    if (file.endsWith(".yaml") || file.endsWith(".yml")) return canonical(parseYaml(raw));
    if (file.endsWith(".json")) return canonical(JSON.parse(raw));
  } catch {
    /* unparseable — fall through and hash the text, so a broken file still differs */
  }
  return raw;
}

function filesUnder(p, base = p, acc = []) {
  if (statSync(p).isDirectory()) {
    for (const e of readdirSync(p).sort()) filesUnder(join(p, e), base, acc);
  } else {
    acc.push([relative(base, p) || basename(p), p]);
  }
  return acc;
}

/** sha256 over (relative path, canonical content) pairs, path-sorted. Renaming a file
 *  inside an item counts as a change, which is correct: the served shape moved. */
function fingerprint(p) {
  const h = createHash("sha256");
  for (const [rel, abs] of filesUnder(p).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    h.update(rel);
    h.update("\0");
    h.update(contentOf(abs));
    h.update("\0");
  }
  return h.digest("hex").slice(0, 16);
}

const items = {};
const addChildren = (dirName, kind) => {
  const dir = join(out, dirName);
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir).sort()) {
    if (e.startsWith(".") || e === "README.md") continue;
    const name = e.replace(/\.(yaml|json|md)$/, "");
    items[`${kind}/${name}`] = fingerprint(join(dir, e));
  }
};

addChildren("components", "component");
addChildren("atoms", "atom");
addChildren("skills", "skill");
addChildren("blocks", "block");

// The token foundation is ONE item: base, semantic and themes only mean anything as a
// set, and a universe that took half of it would render against a contract with holes.
if (existsSync(join(out, "styles"))) items["styles"] = fingerprint(join(out, "styles"));

// Manifest nodes are addressed <package>/<NodeType>, matching how they are authored.
// The package envelope (package.yaml, credentials/, shared/) is shared by every node in
// it, so it folds into each node's fingerprint: a change to a $ref'd model list really
// does change every node that reads it.
const nodesOut = join(out, "nodes");
for (const pkgName of existsSync(nodesOut) ? readdirSync(nodesOut).sort() : []) {
  const pkgDir = join(nodesOut, pkgName);
  if (!statSync(pkgDir).isDirectory()) continue;
  const envelope = ["package.yaml", "credentials", "shared"]
    .map((e) => join(pkgDir, e))
    .filter((p) => existsSync(p));
  for (const nodeName of readdirSync(pkgDir).sort()) {
    const nodeDir = join(pkgDir, nodeName);
    if (!statSync(nodeDir).isDirectory() || ["credentials", "shared"].includes(nodeName)) continue;
    const h = createHash("sha256");
    for (const src of [nodeDir, ...envelope]) h.update(fingerprint(src));
    items[`node/${pkgName}/${nodeName}`] = h.digest("hex").slice(0, 16);
  }
}

const release = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")).version;
writeFileSync(join(out, "catalogue.json"), JSON.stringify({ release, items }, null, 2) + "\n");
console.log(`[bundle-defs] catalogue → release ${release}, ${Object.keys(items).length} item(s) fingerprinted`);
