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
/**
 * REACHING INTO THE MONOREPO ON PURPOSE. `buildCatalogue` used to be a base subpath; it
 * moved to `apps/unoverse/core` on 2026-09-02 because nothing outside the private image
 * imports it (docs/unoverse/UNOVERSE_BASE_BOUNDARY.md). This script is not one of those
 * consumers: `files` does not ship `scripts/`, and it only ever runs from this checkout on
 * `prepack`. So the relative reach is honest, and the alternative — publishing the
 * catalogue builder to keep one import tidy — is the thing that move exists to stop.
 */
import { buildCatalogue } from "../../../apps/unoverse/core/items/catalogue.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = dirname(here);
const out = join(pkg, "definitions");

const release = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")).version;
const full = await buildCatalogue();

/**
 * NOTHING FROM AN ORG LEAVES THIS BUILD. The last gate before the tarball.
 *
 * `design/<org>/` is a customer's own work — components, atoms, templates, apps, skills,
 * prompt blocks, whatever a future kind adds. It reaches a universe through Studio, per
 * org, and belongs in no published package. Each builder in catalogue.ts is supposed to
 * enforce that for its own kind (designSystemItems: "An org's own components are theirs,
 * never ours to publish"), and every one of them did except skills.
 *
 * That cost thirteen of one customer's skills, published in
 * @unoverse-platform/marketplace and readable by anyone. It went unseen because the org
 * was stripped BEFORE the item was catalogued — `bpp/accountancy-career-coach` was stored
 * as `accountancy-career-coach`, so it did not look like org content to any reader.
 *
 * So the rule is enforced HERE too, at the one place every kind must pass through. A
 * per-kind guard protects the kind whose author remembered it; this protects the ones
 * nobody has written yet. It THROWS rather than filtering: silently dropping items would
 * hide the same class of bug the other way round, publishing a package quietly missing
 * things. A build that finds org content is a build that must not ship.
 */
const orgQualified = full.filter((i) => i.name.includes("/") || (i as { org?: string }).org);
if (orgQualified.length) {
  console.error(
    `\nREFUSING TO BUILD: ${orgQualified.length} item(s) carry an org. A customer's own work is ` +
      `deployed through Studio and is never published:\n` +
      orgQualified.map((i) => `  ${i.kind}/${i.name}`).join("\n") +
      `\n\nThe builder for that kind in packages/base/src/items/catalogue.ts needs the guard ` +
      `designSystemItems already has: an org's work is theirs, never ours to publish.\n`,
  );
  process.exit(1);
}
// `detail` goes the way `definition` goes: it is what a node takes, gives back and needs
// access to, read by ONE page, and its config schema outweighs every browse field in the
// file. Both travel in the per-item file below.
const catalogue = full.map(({ definition, detail, ...rest }) => rest);

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
