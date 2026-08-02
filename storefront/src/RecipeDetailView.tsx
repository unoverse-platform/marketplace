/**
 * One recipe: read it before you take it.
 *
 * The mural is the point. You move around the workflow, open any node, and read
 * what it is actually configured to do — the prompts included — before deciding to
 * copy it. Nothing here can be edited: this is someone else's workflow until the
 * moment you paste it, and then it is entirely yours.
 *
 * What it needs is worked out from the graph itself: every node type is mapped to
 * the package that provides it, so missing packages can be added right here.
 */
import { useMemo, useState } from "react";
import { useCatalog } from "./host";
// The item catalogue, not the retired npm storefront: a node IS an item, named by its
// type, so a missing node is a direct lookup rather than a hunt for the package it
// happens to travel in.
import { useItems } from "./host";

function Spinner() {
  return <span className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-white/40 border-t-white" />;
}
import { credentialsNeeded, sanitiseGraph, type Recipe } from "./recipes";
import { RecipePreview } from "./RecipePreview";

function Logo({ src, className }: { src: string; className?: string }) {
  const [dead, setDead] = useState(false);
  if (dead) return null;
  return <img src={src} alt="" className={className} onError={() => setDead(true)} />;
}

/** Config worth reading in full, prompts first. */
function readableConfig(node: any): { key: string; value: string; long: boolean }[] {
  const config = node?.data?.config ?? {};
  return Object.entries(config)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined && typeof v !== "object")
    .map(([key, v]) => {
      const value = String(v);
      return { key, value, long: value.length > 90 };
    })
    .sort((a, b) => Number(b.long) - Number(a.long));
}

export function RecipeDetailView({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) {
  const { nodes: catalog, loading: catalogLoading } = useCatalog();
  const { items: marketItems, install: installItem } = useItems();
  const [busy, setBusy] = useState<string | null>(null);

  // Never hand out credential bindings or editor state.
  const graph = useMemo(() => sanitiseGraph(recipe.graph), [recipe]);
  const [copied, setCopied] = useState(false);

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const logoForType = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const n of catalog) {
      if (!n.logoUrl) continue;
      byKey.set(norm(n.type), n.logoUrl);
      byKey.set(norm(n.name), n.logoUrl);
    }
    return (node: any) => {
      for (const k of [node?.data?.nodeType, node?.type, node?.data?.label].filter(Boolean)) {
        const hit = byKey.get(norm(k));
        if (hit) return hit;
      }
      return undefined;
    };
  }, [catalog]);

  /**
   * What this recipe needs YOU to have.
   *
   * Nodes the engine registers itself — the trigger every workflow starts with,
   * flow control, output — have no owning package and are always present. Listing
   * them under "Uses" is noise at best, and reads as a missing dependency at worst.
   * They are identified by having no `package` in the catalog, not by name.
   */
  const requirements = useMemo(() => {
    const installedTypes = new Set(catalog.map((n) => norm(n.type)));
    const platformTypes = new Set(catalog.filter((n) => !n.package).map((n) => norm(n.type)));
    const out = new Map<string, { label: string; pkg?: string; logo?: string; have: boolean }>();
    for (const n of graph.nodes ?? []) {
      if (n.type === "Note") continue; // Notes are canvas furniture, not capability.
      const key = norm(n.type ?? "");
      if (!key) continue;
      if (platformTypes.has(key)) continue; // Ships with the platform.
      // Unknown while the catalog is still loading is not the same as missing.
      const have = catalogLoading || installedTypes.has(key);
      const provider = have
        ? undefined
        : marketItems.find((i) => i.kind === "node" && (i.name === n.type || i.name === n?.data?.label));
      out.set(key, {
        label: n?.data?.label || n.type,
        pkg: provider?.name,
        logo: logoForType(n) ?? provider?.icon ?? undefined,
        have,
      });
    }
    return [...out.values()];
  }, [graph, catalog, catalogLoading, marketItems, logoForType]);

  const missing = requirements.filter((r) => !r.have);
  const creds = credentialsNeeded(recipe.graph);

  /** `pkg` is the node's own name under the item model: one node, one install. */
  async function addMissing(pkg: string) {
    setBusy(pkg);
    try {
      await installItem({ kind: "node", name: pkg });
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(JSON.stringify(graph, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#FAFAFC]">
      <div className="mx-auto w-full max-w-[1180px] px-8 pt-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[13.5px] font-semibold text-gray-500 transition hover:text-gray-900"
        >
          <span aria-hidden>&lsaquo;</span> Recipes
        </button>

        <header className="flex flex-wrap items-start gap-6 pt-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-gray-900">{recipe.name}</h1>
            <p className="mt-3 max-w-[64ch] text-[15.5px] leading-[1.5] text-gray-500">{recipe.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-gray-900/5 px-2.5 py-1 text-[11.5px] font-semibold text-gray-600">
                {recipe.category}
              </span>
              {recipe.tags.map((t) => (
                <span key={t} className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11.5px] font-semibold text-gray-600">
                  {t}
                </span>
              ))}
              <span className="font-mono text-[11.5px] text-gray-400">
                {(graph.nodes ?? []).length} nodes · {(graph.edges ?? []).length} connections
              </span>
            </div>
          </div>
          <button
            onClick={() => void copy()}
            className="rounded-xl bg-gray-900 px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-gray-800"
          >
            {copied ? "Copied — paste on a canvas" : "Copy recipe"}
          </button>
        </header>

        {/* What it needs. Anything missing can be added without leaving the page. */}
        <div className="mt-7 flex flex-wrap items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-5 py-4">
          <span className="text-[12px] font-bold uppercase tracking-[0.09em] text-gray-400">Uses</span>
          {requirements.map((r) => (
            <span
              key={r.label}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium ${
                r.have ? "border-gray-200 bg-white text-gray-700" : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {r.logo && <Logo src={r.logo} className="h-4 w-4 rounded object-contain" />}
              {r.label}
              {!r.have && r.pkg && (
                <button
                  onClick={() => void addMissing(r.pkg!)}
                  disabled={!!busy}
                  className="ml-1 flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {busy === r.pkg ? <Spinner /> : null}Add
                </button>
              )}
              {!r.have && !r.pkg && <span className="ml-1 text-[11px] text-amber-700">not found</span>}
            </span>
          ))}
          {creds.length > 0 && (
            <span className="ml-auto text-[12.5px] text-gray-500">
              You will connect your own {creds.length === 1 ? "credential" : "credentials"} after pasting
            </span>
          )}
        </div>

        {missing.length === 0 && (
          <p className="mt-2.5 text-[12.5px] text-emerald-700">Everything this needs is already installed.</p>
        )}

        {/* Two audiences, two texts. Everything above is what a PERSON reads. This is
            the selection text an AGENT is ranked against, shown quietly so whoever
            publishes the recipe can check it, since a weak one means the recipe is
            never chosen no matter how good the workflow is. */}
        {recipe.whenToUse && (
          <details className="mt-4 rounded-2xl border border-gray-200 bg-white px-5 py-3.5">
            <summary className="cursor-pointer list-none text-[12.5px] font-semibold text-gray-500 transition hover:text-gray-800">
              How an agent decides to use this
            </summary>
            <p className="mt-2.5 max-w-[80ch] text-[13px] leading-[1.55] text-gray-600">{recipe.whenToUse}</p>
          </details>
        )}
      </div>

      {/* The mural. Drawn with the platform's own node chrome, copied into this repo
          (src/canvas/README.md) because a recipe that does not render is not worth
          publishing. */}
      <div className="mx-auto mt-6 flex w-full max-w-[1180px] gap-4 px-8 pb-14" style={{ height: 560 }}>
        <div className="min-w-0 flex-1">
          <RecipePreview clip={graph} catalog={catalog} height="100%" />
        </div>
      </div>

    </div>
  );
}
