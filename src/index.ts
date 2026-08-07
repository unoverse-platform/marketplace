/**
 * Unoverse MARKETPLACE — CONTENT ONLY.
 *
 * This package is the deployable marketplace: the definitions catalogue
 * (`definitions/` — components, atoms, styles, prompt blocks, skills, node manifests,
 * recipes) and the storefront app (`storefront/`). Individual items are tracked by
 * content fingerprint, so a universe installs and updates PER ITEM as database rows.
 * See scripts/bundle-defs.mjs for how the catalogue is cut.
 *
 * NO PLATFORM CODE. The universal Component node (the executor that renders these
 * definitions, and the briefed-component read/fill service) is platform computation and
 * lives in apps/unoverse/server/src/runtime/components/ — registered at boot by
 * `registerComponentNode()`, never by this package. A duplicate executor shipped here
 * until 2026-08-06; every deployment overwrote it with the server's copy at boot, and
 * maintaining the two byte-identical was pure tax. Consumers of this package read its
 * CONTENT: Studio resolves `definitions/` as the design-system fallback
 * (base/definitions/dsPackage.ts), and the publish lane bundles the catalogue.
 */

export const MARKETPLACE_PACKAGE = "@unoverse-platform/marketplace" as const;
