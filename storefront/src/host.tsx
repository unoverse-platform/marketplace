/**
 * THE STOREFRONT'S WORLD, rebuilt on top of a static catalogue.
 *
 * The browse experience moved out of the platform unchanged (MARKETPLACE.md §4). Its
 * components still import `./catalog`, `./items`, `./client` and `./Marketplace`, because
 * NOT editing them is what keeps the page looking exactly as it did. This file supplies
 * those same shapes from `catalogue.json` instead of from a universe's REST routes.
 *
 * TWO THINGS GENUINELY CHANGED, and both follow from being a public static page:
 *
 *   1. Held state comes from the HOST, not from here. Only the universe knows what it has
 *      installed, and this page has no token and no database. The host sends it once the
 *      frame is up; standalone, everything simply reads as available.
 *   2. Installing is a REQUEST, not a write. `install()` posts to the host and resolves
 *      when the host reports back. Nothing here can reach a database, which is what makes
 *      the page safe to serve publicly.
 *
 * Semantic node search is gone with the universe that ran it: a static file cannot rank.
 * `searchNodes` falls back to a text match over the same fields.
 */
import { useCallback, useEffect, useState } from "react";

export const BRAND_MARK_WHITE =
  "https://res.cloudinary.com/sonik/image/upload/v1751802699/gravity/icons/logo_white.png";

export type ItemKind = "component" | "atom" | "style" | "skill" | "node" | "prompt-block" | "recipe" | "template";
export type ItemState = "available" | "installed" | "update";

export interface MarketItem {
  kind: ItemKind;
  name: string;
  fingerprint: string;
  bundle?: string;
  pack?: string;
  title?: string;
  description?: string;
  category?: string;
  icon?: string;
  whenToUse?: string;
  origin?: "local" | "marketplace";
  state: ItemState;
  enabled: boolean;
}

export interface MarketBundle {
  name: string;
  title: string;
  description: string;
  total: number;
  installed: number;
  state: ItemState | "partial";
  version: string;
}

const FRAMED = typeof window !== "undefined" && window.parent !== window;

/* ── the catalogue, fetched once ─────────────────────────────────────────────── */

let cache: Promise<{ release: string; items: MarketItem[] }> | null = null;
function catalogue() {
  if (!cache)
    cache = fetch("catalogue.json")
      .then((r) => r.json())
      .then((d: any) => ({ release: d.release, items: (d.items ?? []) as MarketItem[] }));
  return cache;
}

/* ── what the host says this universe holds ──────────────────────────────────── */

// (kind/name) the host reports as held. Empty standalone, which is correct: nothing is
// installed anywhere this page can see.
let heldKeys = new Set<string>();
const heldListeners = new Set<() => void>();
const keyOf = (kind: string, name: string) => `${kind}/${name}`;

if (typeof window !== "undefined") {
  window.addEventListener("message", (e: MessageEvent) => {
    const m = e.data;
    if (!m || typeof m !== "object") return;
    if (m.type === "unoverse:held" && Array.isArray(m.keys)) {
      heldKeys = new Set(m.keys);
      heldListeners.forEach((f) => f());
    }
  });
  // The host cannot know when the page is ready, so the page says so.
  if (FRAMED) window.parent.postMessage({ type: "unoverse:ready" }, "*");
}

/* ── the shapes the recovered views expect ───────────────────────────────────── */

export interface CatalogNode {
  type: string;
  name: string;
  description?: string;
  whenToUse?: string;
  category?: string;
  package?: string | null;
  logoUrl?: string | null;
  color?: string;
  template?: string | null;
  inputs?: unknown[];
  outputs?: unknown[];
  credentials?: unknown[];
}

/** Nodes as the catalog saw them, derived from the node items in the catalogue. */
export function useCatalog() {
  const [nodes, setNodes] = useState<CatalogNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    catalogue()
      .then(({ items }) =>
        setNodes(
          items
            .filter((i) => i.kind === "node")
            .map((i) => ({
              type: i.name,
              name: i.title || i.name,
              description: i.description,
              whenToUse: i.whenToUse,
              category: i.category,
              package: i.pack ?? null,
              logoUrl: i.icon ?? null,
            })),
        ),
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return { nodes, loading, error };
}

/** Text search over the catalogue. The universe's semantic ranking is not available to a
 *  static page, so this is an honest substring match rather than a pretend ranking. */
export async function searchNodes(query: string): Promise<CatalogNode[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const { items } = await catalogue();
  return items
    .filter((i) => i.kind === "node")
    .filter((i) => `${i.title} ${i.name} ${i.description ?? ""} ${i.whenToUse ?? ""}`.toLowerCase().includes(q))
    .map((i) => ({
      type: i.name,
      name: i.title || i.name,
      description: i.description,
      whenToUse: i.whenToUse,
      category: i.category,
      package: i.pack ?? null,
      logoUrl: i.icon ?? null,
    }));
}

const DESIGN_SYSTEM = "design-system";

export function useItems() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [bundles, setBundles] = useState<MarketBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, bump] = useState(0);

  // Held state arrives from the host after the catalogue does, so the view re-renders on it.
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    heldListeners.add(f);
    return () => void heldListeners.delete(f);
  }, []);

  const load = useCallback(async () => {
    try {
      const { release, items } = await catalogue();
      const withState = items.map((i) => ({
        ...i,
        state: (heldKeys.has(keyOf(i.kind, i.name)) ? "installed" : "available") as ItemState,
        enabled: heldKeys.has(keyOf(i.kind, i.name)),
      }));
      setItems(withState);
      const ds = withState.filter((i) => i.bundle === DESIGN_SYSTEM);
      const installed = ds.filter((i) => i.state !== "available").length;
      setBundles([
        {
          name: DESIGN_SYSTEM,
          title: "Design System",
          description: "Components, atoms and the token contract they render against.",
          total: ds.length,
          installed,
          state: installed === 0 ? "available" : installed === ds.length ? "installed" : "partial",
          version: release,
        },
      ]);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load, heldKeys.size]);

  /** Ask the host to install. Resolves when it answers, so the button can settle. */
  const install = useCallback(async (target: { kind?: string; name?: string; bundle?: string }) => {
    const key = target.bundle ?? `${target.kind}/${target.name}`;
    if (!FRAMED) {
      setError("Open the marketplace inside Studio to install.");
      return;
    }
    setBusy(key);
    await new Promise<void>((resolve) => {
      const done = (e: MessageEvent) => {
        const m = e.data;
        if (!m || m.type !== "unoverse:install:result") return;
        if ((m.bundle ?? `${m.kind}/${m.name}`) !== key) return;
        window.removeEventListener("message", done);
        if (!m.ok) setError(m.error ?? "install failed");
        else heldKeys.add(key);
        resolve();
      };
      window.addEventListener("message", done);
      window.parent.postMessage({ type: "unoverse:install", ...target }, "*");
    });
    setBusy(null);
    void load();
  }, [load]);

  const uninstall = install; // same channel, the host picks the route from the message type

  return { items, bundles, loading, busy, error, reload: load, install, uninstall };
}

export const ofKind = (items: MarketItem[], kind: ItemKind) => items.filter((i) => i.kind === kind);
export const heldCount = (items: MarketItem[], kind: ItemKind) =>
  items.filter((i) => i.kind === kind && i.state !== "available").length;

/** The npm package storefront is gone. These exist so the recovered views compile without
 *  being edited; the package-shaped parts of them render empty and fall away. */
export function useMarketplace() {
  return { rows: [] as any[], loading: false, error: null as string | null, reload: async () => {} };
}
export async function packageAction() {
  throw new Error("packages are not installed from the marketplace");
}
export function Spinner() {
  return <span className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-white/40 border-t-white" />;
}

/* ── package grouping, verbatim from the catalog module it replaces ──────────── */

export interface PackageGroup {
  name: string;
  displayName: string;
  logo?: string;
  nodes: CatalogNode[];
}

/** "@unoverse-platform/aws-bedrock" → "Aws Bedrock". Only used when the catalog
 *  gives us no better name to show. */
export function packageDisplayName(pkg: string): string {
  return pkg
    .replace(/^@[^/]+\//, "")
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Group nodes by their owning package, biggest first. */
export function groupByPackage(nodes: CatalogNode[]): PackageGroup[] {
  const by = new Map<string, PackageGroup>();
  for (const n of nodes) {
    const name = n.package ?? "(unpackaged)";
    let g = by.get(name);
    if (!g) by.set(name, (g = { name, displayName: packageDisplayName(name), nodes: [] }));
    g.nodes.push(n);
    if (!g.logo && n.logoUrl) g.logo = n.logoUrl;
  }
  return [...by.values()].sort((a, b) => b.nodes.length - a.nodes.length || a.displayName.localeCompare(b.displayName));
}

/** The universe REST client the original page used. A public storefront has none, and the
 *  one call that reached for it (semantic node search) is served by `searchNodes` above.
 *  Kept so the recovered views compile unedited, and honest if anything else calls it. */
export async function authedFetch(): Promise<Response> {
  throw new Error("the storefront has no universe to call: actions go through the host");
}
