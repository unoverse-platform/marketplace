/**
 * Definition → node synthesis (runtime, data-driven).
 *
 * The rx component definition IS the node: this module reads a definition (+ its
 * optional manifest.json) and synthesizes the SAME EnhancedNodeDefinition the old
 * generator emitted as code — same configSchema derivation, same output contract,
 * same category/template/logo — so the canvas, the builder catalog, and existing
 * workflows see byte-identical nodes with ZERO generated code and ZERO recompiles:
 * a new component JSON is a working node on next load.
 */

import { readdirSync, readFileSync, existsSync } from "fs";

/**
 * WHERE TO START SEARCHING FROM, in both module systems.
 *
 * This package compiles to CommonJS, where `__dirname` exists. But the plugin loader prefers a
 * node package's `src/index.ts` over its `dist/` (so a regenerated component works on restart
 * with no build), and that source runs as ESM because `apps/unoverse/package.json` declares
 * `"type": "module"`. There, `__dirname` is not defined, and reading it threw:
 *
 *     ⚠ Failed to load @unoverse-platform/marketplace: __dirname is not defined
 *
 * The whole package then failed to register, which took the rx COMPONENT NODES with it — the
 * local-wins disk path this function exists to serve.
 *
 * `typeof` rather than a try/catch, because an undeclared identifier is a ReferenceError the
 * moment it is evaluated. `import.meta.url` is deliberately NOT used: it is a syntax error under
 * this package's CommonJS target, so it would trade a runtime failure for a build failure.
 * `process.cwd()` is the honest fallback — the server starts in `apps/unoverse`, so the very
 * first candidate below (`rx/marketplace/components`) resolves on the first iteration.
 */
const MODULE_DIR: string = typeof __dirname !== "undefined" ? __dirname : process.cwd();
import { parse as parseYaml } from "yaml";

// Definitions are authored as .yaml OR .json (server/src/fsCache.ts is the reference).
// A LOCAL copy because this package ships to npm standalone and cannot import the server.
// Getting this wrong does not error — it yields zero components, so nothing registers as a
// node and the marketplace silently vanishes from the catalog and the marketplace.
const DEF_EXTS = [".yaml", ".json"];
const isDefFile = (f: string) => DEF_EXTS.some((e) => f.endsWith(e));
const isManifestFile = (f: string) => /^manifest\.(json|yaml)$/.test(f);
const readDef = (file: string): any => {
  const text = readFileSync(file, "utf8");
  const parsed = file.endsWith(".yaml") ? parseYaml(text) : JSON.parse(text);
  if (parsed && typeof parsed === "object") delete parsed.$schema;
  return parsed;
};
const defPathIn = (dir: string, name: string): string | undefined => {
  for (const e of DEF_EXTS) {
    const p = join(dir, name + e);
    if (existsSync(p)) return p;
  }
  return undefined;
};
import { join, dirname } from "path";
import { NodeInputType, inputPropKeys, type EnhancedNodeDefinition } from "@unoverse-platform/base/pluginBase.js";

export interface UnoverseDefinition {
  name: string;
  kind?: string;
  /** The owning client org for an ORG component (rx/orgs/<org>/components — injected
   *  from the folder location by the loader). Design-system components carry none. */
  org?: string;
  description?: string;
  whenToUse?: string;
  category?: string;
  defaultState?: string;
  nodeSize?: { width: number; height: number };
  props?: Record<string, { type?: string; description?: string; default?: unknown; input?: boolean }>;
  outputs?: Record<string, { type?: string; description?: string }>;
}

/** What the universal executor needs per component — all data, no code. */
export interface RuntimeComponentMeta {
  name: string;
  /** Owning org (org components) — scopes the published componentUrl. */
  org?: string;
  /** Input prop keys in def order, with their declared types (for the string "" pin). */
  inputProps: Array<{ key: string; isString: boolean }>;
  nodeSize?: { width: number; height: number };
  /** Named default state the component opens in (open name; TEMPLATE_DATA emit). */
  defaultState?: string;
  /** Declared output contract keys (interactive components — awaitSubmission leg). */
  outputKeys: string[];
}

/** The canonical resource URI for a component def: org-scoped for an org component
 *  (`unoverse://components/<org>/<name>`), bare for the marketplace tier. ONE
 *  emitter — componentTemplate, publishComponent and the spatial app contract must
 *  all agree on this address. */
export function componentUri(def: { name: string; org?: string }): string {
  return `unoverse://components/${def.org ? `${def.org}/` : ""}${def.name}`;
}

const DEF_TYPE_TO_SCHEMA: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  object: "object",
  array: "array",
};

/** Mirror of the legacy generator's metadata + configSchema derivation. */
export function synthesize(def: UnoverseDefinition): { definition: EnhancedNodeDefinition; meta: RuntimeComponentMeta } {
  const inputKeys = new Set(inputPropKeys(def.props));

  // configSchema — the legacy NodeIndexGenerator derivation, verbatim semantics.
  const properties: Record<string, any> = {};
  const inputProps: RuntimeComponentMeta["inputProps"] = [];
  for (const [key, prop] of Object.entries(def.props ?? {})) {
    if (!inputKeys.has(key)) continue; // hardcoded content — stays in the definition
    const schemaType = DEF_TYPE_TO_SCHEMA[prop?.type ?? "string"] ?? "string";
    properties[key] = {
      type: schemaType,
      title: prop?.description ?? key,
      ...(prop?.default !== undefined && { default: prop.default }),
    };
    // String/object/array props are workflow-bindable — they edit as a template field.
    if (schemaType === "string" || schemaType === "object" || schemaType === "array") {
      properties[key]["ui:field"] = "template";
    }
    if (schemaType === "boolean") properties[key]["ui:widget"] = "toggle";
    // Legacy parity: the aggregate "object" prop is excluded from the publish loop
    // (it silently overrode named props with null — removed from nodegen long ago).
    if (key !== "object") inputProps.push({ key, isString: schemaType === "string" });
  }

  const outputKeys = Object.keys(def.outputs ?? {});
  const outputs = outputKeys.length
    ? [{ name: "output", type: NodeInputType.OBJECT, description: `Submitted component outputs: ${outputKeys.join(", ")}` }]
    : [{ name: "componentSpec", type: NodeInputType.OBJECT, description: "Component spec for downstream nodes" }];

  // Named default state — open name, declared in the def envelope, with the legacy
  // prop-default derivation kept as fallback (displayState/defaultState "focused" ⇒ "focus").
  const defaultState =
    def.defaultState ??
    (((def.props as any)?.defaultState?.default ?? (def.props as any)?.displayState?.default) === "focused"
      ? "focus"
      : undefined);

  const definition: EnhancedNodeDefinition = {
    packageVersion: "1.0.0",
    type: def.name,
    name: def.name,
    description: def.description || `${def.name} UI component from marketplace`,
    ...(def.whenToUse ? { whenToUse: def.whenToUse } : {}),
    category: "Marketplace",
    color: "#10b981",
    template: "uiComponent",
    componentTemplate: { componentUrl: componentUri(def) },
    logoUrl: "https://res.cloudinary.com/sonik/image/upload/v1751366180/gravity/icons/gravityIcon.png",
    ...(def.nodeSize ? { nodeSize: { width: def.nodeSize.width, height: def.nodeSize.height } } : {}),
    inputs: [{ name: "signal", type: NodeInputType.OBJECT, description: "Signal" }],
    outputs,
    configSchema: { type: "object", properties, required: [] },
    credentials: [],
  } as EnhancedNodeDefinition;

  return {
    definition,
    meta: {
      name: def.name,
      ...(def.org ? { org: def.org } : {}),
      inputProps,
      nodeSize: def.nodeSize,
      defaultState,
      outputKeys,
    },
  };
}

/**
 * THE one marketplace node. Instead of registering a node type PER component (the old
 * 18-nodes model), we register a single `Component` node: `config.component` selects which
 * component to render (enum of every loaded def), and its prop fields are exposed per
 * selection via JSON-Schema `dependencies` (so the config UI shows only the chosen
 * component's fields). The universal executor resolves the meta from `config.component`.
 */
export function buildComponentNodeDefinition(perComponent: EnhancedNodeDefinition[]): EnhancedNodeDefinition {
  // One conditional branch per component: when component === X, surface X's prop fields.
  const oneOf = perComponent.map((d) => ({
    properties: { component: { const: d.type }, ...((d.configSchema as any)?.properties ?? {}) },
    required: ["component"],
  }));
  // The render URL is INSTANCE-level for the generic node: it depends on which
  // component `config.component` selects (org-scoped for org components). The node
  // type can't carry one `componentTemplate.componentUrl`, so publish a per-component
  // map — the org-aware `componentUri` truth from synthesis — that the Canvas resolves
  // by `config.component`. Without it a pasted Component node has no URL to render.
  const componentUrls: Record<string, string> = {};
  for (const d of perComponent) {
    const url = (d as any).componentTemplate?.componentUrl;
    if (url) componentUrls[d.type] = url;
  }
  return {
    packageVersion: "1.0.0",
    type: "Component",
    name: "Component",
    description: "Render any marketplace component — choose one with `component`.",
    whenToUse:
      "Show a piece of interface in the conversation: render any installed marketplace component — a card, a form, a page section — filled with data the workflow computed. Drop it from the component itself (Copy for Canvas) so its identity and prop fields come pre-set; wire props from upstream nodes, and an interactive component returns the person's submission on its output.",
    category: "Marketplace",
    color: "#10b981",
    template: "uiComponent",
    logoUrl: "https://res.cloudinary.com/sonik/image/upload/v1751366180/gravity/icons/gravityIcon.png",
    inputs: [{ name: "signal", type: NodeInputType.OBJECT, description: "Signal" }],
    outputs: [
      { name: "output", type: NodeInputType.OBJECT, description: "Submitted outputs (interactive) or the component spec" },
    ],
    configSchema: {
      type: "object",
      // `component` is NOT a config field — it's the node's fixed IDENTITY, set when the
      // component is dropped (Copy for Canvas) and read by the render/URL/executor. So the
      // schema exposes NO `component` property (nothing to pick or hide). The per-component
      // prop fields still surface via `dependencies`, which the config form keys off the
      // identity value in config (`resolveEffectiveProperties` reads config.component and
      // merges the matching branch). One node type, one identity per instance.
      properties: {},
      dependencies: { component: { oneOf } },
      required: [],
    },
    // Per-component render URLs (org-aware), resolved by the Canvas from config.component.
    componentUrls,
    credentials: [],
  } as EnhancedNodeDefinition;
}

/**
 * Load every component definition from the rx home. Components live flat
 * (`<name>.json`) or in their own folder (`<name>/<name>.json`) — mirrors the
 * server's definition loader. A sibling `manifest.json` (component apps) may
 * supply discoverability meta the def lacks: manifest wins per the protocol
 * ("Manifest wins over the def for every field").
 */
/** Load every component definition across BOTH tiers: the marketplace
 *  (`rx/components`) and each org pack (`rx/orgs/<org>/components`) — org components
 *  synthesize nodes exactly like universal ones, tagged with their org so their
 *  published componentUrl is org-scoped. */
export function loadComponentDefs(rxComponentsDir: string): UnoverseDefinition[] {
  const defs = loadComponentDefsFromDir(rxComponentsDir);
  // Find the rx ROOT (holds marketplace/ and/or orgs/) by walking up from the
  // marketplace components dir, which nests one level deeper (rx/marketplace/components).
  let rxRoot: string | null = null;
  let up = dirname(rxComponentsDir);
  for (let i = 0; i < 4; i++) {
    if (existsSync(join(up, "orgs")) || existsSync(join(up, "marketplace"))) { rxRoot = up; break; }
    up = dirname(up);
  }
  if (!rxRoot) return defs;
  // Project component homes: FLAT projects at the rx root (the target model) PLUS any still
  // under the legacy rx/orgs/ (mid-flatten). Each is tagged with its org for org-scoped URLs.
  const RESERVED = new Set(["marketplace", "_schema"]);
  const homes: Array<{ org: string; dir: string }> = [];
  for (const e of readdirSync(rxRoot, { withFileTypes: true })) {
    if (e.isDirectory() && !RESERVED.has(e.name)) homes.push({ org: e.name, dir: join(rxRoot, e.name, "components") });
  }
  const orgsRoot = join(rxRoot, "orgs");
  if (existsSync(orgsRoot)) {
    for (const e of readdirSync(orgsRoot, { withFileTypes: true })) {
      if (e.isDirectory()) homes.push({ org: e.name, dir: join(orgsRoot, e.name, "components") });
    }
  }
  for (const { org, dir } of homes) {
    if (!existsSync(dir)) continue;
    for (const def of loadComponentDefsFromDir(dir)) defs.push({ ...def, org });
  }
  return defs;
}

function loadComponentDefsFromDir(rxComponentsDir: string): UnoverseDefinition[] {
  const defs: UnoverseDefinition[] = [];
  for (const entry of readdirSync(rxComponentsDir, { withFileTypes: true })) {
    let file: string | undefined;
    if (entry.isDirectory()) {
      const sub = join(rxComponentsDir, entry.name);
      const candidates = readdirSync(sub).filter((f) => isDefFile(f) && !isManifestFile(f));
      file =
        candidates.find((f) => DEF_EXTS.some((e) => f.toLowerCase() === `${entry.name.toLowerCase()}${e}`)) ??
        candidates.find((f) => DEF_EXTS.some((e) => f === `index${e}`)) ??
        candidates[0];
      if (file) file = join(sub, file);
    } else if (isDefFile(entry.name)) {
      file = join(rxComponentsDir, entry.name);
    }
    if (!file) continue;
    try {
      const def = readDef(file) as UnoverseDefinition;
      if (def.kind !== "component") continue;
      const manifestPath = defPathIn(dirname(file), "manifest");
      if (manifestPath) {
        const m = readDef(manifestPath);
        if (m.description) def.description = m.description;
        if (m.whenToUse) def.whenToUse = m.whenToUse;
        if (m.category) def.category = m.category;
      }
      defs.push(def);
    } catch {
      // A malformed def never takes the whole family down — skip it.
    }
  }
  return defs;
}

/** Resolve the rx/components home: env override, else walk up from this package.
 *  Checks BOTH `<ancestor>/rx` (package inside apps/unoverse/nodes — dev + starter
 *  carve-out) and `<ancestor>/apps/unoverse/rx` (package npm-installed under the
 *  plugins tree — DOCR deployments, where rx lives in the image / mounted carve-out). */
export function findRxComponentsDir(): string | null {
  if (process.env.UNOVERSE_RX_DIR) {
    // Accept either an rx/ root (marketplace nested) or a direct components home.
    for (const p of [join(process.env.UNOVERSE_RX_DIR, "marketplace", "components"), join(process.env.UNOVERSE_RX_DIR, "components")]) {
      if (existsSync(p)) return p;
    }
    return null;
  }
  let dir = MODULE_DIR;
  for (let i = 0; i < 8; i++) {
    // Design-system components now live at rx/marketplace/components (the honest home).
    for (const candidate of [
      join(dir, "rx", "marketplace", "components"),
      join(dir, "apps", "unoverse", "rx", "marketplace", "components"),
    ]) {
      if (existsSync(candidate)) return candidate; // DISK rx/ wins (dev local-wins; image today)
    }
    dir = dirname(dir);
  }
  // Self-contained FALLBACK: the definitions BUNDLED into this package (Phase 1 — see
  // docs/architecture/RX_ORG_MODEL.md). Ships with the npm package, so a box with NO rx/ on
  // disk (the purged-image future) still registers the marketplace. Only reached after the
  // disk search fails, so a developer's local rx/ still overrides the bundle.
  dir = MODULE_DIR;
  for (let i = 0; i < 8; i++) {
    const bundled = join(dir, "definitions", "components");
    if (existsSync(bundled)) return bundled;
    dir = dirname(dir);
  }
  return null;
}
