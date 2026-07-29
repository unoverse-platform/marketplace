/**
 * Unoverse MARKETPLACE — DEFINITION-BACKED, ZERO GENERATED CODE.
 *
 * The ONE package a universe INSTALLS rather than authors (DEVELOPER_GUIDE.md "Type M"):
 * components, atoms and styles, prompt blocks, skills, and declarative node manifests.
 * Content only, no platform code. Supersedes `@unoverse-platform/design-system`, which is
 * LEGACY and retired: what used to be called the design system is one shelf in here, not
 * the name of the thing.
 *
 * ONE `Component` node serves every component. The rx defs are synthesized at load
 * time into a single node whose `component` selector chooses which to render; the universal
 * executor resolves that component's meta per run. A new component definition is instantly
 * renderable by the same node — no generator, no per-component compile, no new node type.
 *
 * The package carries ONE version (the marketplace release). Individual items are tracked
 * by CONTENT FINGERPRINT instead, so a universe updates one skill or one node without
 * taking the rest. See scripts/bundle-defs.mjs for how the catalogue is cut.
 */

import { createPlugin, type GravityPluginAPI } from "@unoverse-platform/base/pluginBase.js";
import { createRequire } from "node:module";

/**
 * Own package.json, read at runtime rather than imported: an ESM JSON import would need
 * tsc to copy the file under dist/, which it does not. Two candidates because the file
 * sits at a different depth from source (src/ → ../) and from the build the loader
 * actually runs (dist/src/ → ../../, the package root).
 */
const requireJson = createRequire(import.meta.url);
let packageJson: { name: string; version?: string; description?: string };
try {
  packageJson = requireJson("../../package.json");
} catch {
  packageJson = requireJson("../package.json");
}
import { findRxComponentsDir, loadComponentDefs, synthesize, buildComponentNodeDefinition } from "./lib/meta.js";
import { makeUniversalExecutorClass } from "./lib/executor.js";

const plugin = createPlugin({
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,

  async setup(api: GravityPluginAPI) {
    const { initializePlatformFromAPI } = await import("@unoverse-platform/base/pluginBase.js");
    initializePlatformFromAPI(api);

    const rxDir = findRxComponentsDir();
    if (!rxDir) {
      console.warn("[components] rx/components not found (set UNOVERSE_RX_DIR) — no Component node registered");
      return;
    }

    // Synthesize every component, then register ONE `Component` node over all of them.
    const synthd = loadComponentDefs(rxDir).map(synthesize);
    const metas = new Map(synthd.map(({ meta }) => [meta.name, meta] as const));
    const nodeDef = buildComponentNodeDefinition(synthd.map(({ definition }) => definition));
    api.registerNode({ definition: nodeDef, executor: makeUniversalExecutorClass(metas) } as any);
    console.log(`[components] registered ONE 'Component' node covering ${metas.size} marketplace components`);
  },
});

export default plugin;
