/**
 * Marketplace — one category.
 *
 * ONE list. An earlier version had three sections (packages, "what you can do",
 * then every node) which listed the same nodes twice in two costumes. A category
 * only has to answer two questions, and they belong together:
 *
 *   what can I get here?   → the packages
 *   what is actually in it? → its nodes, inside the same card
 *
 * Everything is derived from `GET /nodes` plus install state from /plugins; nothing
 * about any particular category is written into this file.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lookFor, paintCategory } from "./categoryArt";
import { useScrollMemory } from "./lib";
import { groupByPackage, type CatalogNode } from "./catalog";
import { useMarketplace, packageAction, Spinner, type PkgRow } from "./Marketplace";
import { NodeDetailView } from "./NodeDetailView";

/** A logo that removes itself if the URL 404s, rather than showing a broken image. */
function Logo({ src, className }: { src: string; className?: string }) {
  const [dead, setDead] = useState(false);
  if (dead) return null;
  return <img src={src} alt="" className={className} onError={() => setDead(true)} />;
}

function HeaderArt({ category }: { category: string }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = host.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    let last = "";
    const draw = () => {
      const { width, height } = el.getBoundingClientRect();
      const key = `${Math.round(width)}x${Math.round(height)}`;
      if (!width || !height || key === last) return;
      last = key;
      paintCategory(cv, category, Math.round(width), Math.round(height));
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [category]);
  return (
    <div ref={host} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

export function CategoryDetailView({
  category,
  copy,
  nodes,
  loading,
  onBack,
}: {
  category: string;
  copy?: string;
  nodes: CatalogNode[];
  loading: boolean;
  onBack: () => void;
}) {
  const market = useMarketplace();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openNode, setOpenNode] = useState<CatalogNode | null>(null);
  const top = useRef<HTMLDivElement>(null);
  // Opening a node replaces this page; Back should land where you were. Keyed per
  // category, so each one keeps its own place. The scroll-to-top below still wins when
  // the CATEGORY changes, which is a different move and rightly starts at the top.
  const remember = useScrollMemory<HTMLDivElement>(`market:category:${category}`);
  const scrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      top.current = el;
      remember(el);
    },
    [remember],
  );

  useEffect(() => {
    top.current?.scrollTo({ top: 0 });
  }, [category]);

  const accent = lookFor(category).accent;
  const inCategory = useMemo(() => nodes.filter((n) => (n.category ?? "").trim() === category), [category, nodes]);
  const groups = useMemo(() => groupByPackage(inCategory), [inCategory]);

  /** A package can span categories, so we can say what else it brings. */
  const totalByPackage = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nodes) if (n.package) m.set(n.package, (m.get(n.package) ?? 0) + 1);
    return m;
  }, [nodes]);

  const installedCount = groups.filter((g) => market.rows.find((r) => r.name === g.name)?.installed).length;
  const needsCredentials = groups.filter((g) => g.nodes.some((n) => (n.credentials?.length ?? 0) > 0)).length;

  async function act(name: string, kind: "install" | "update", version?: string) {
    setBusy(name);
    setActionError(null);
    try {
      await packageAction(name, kind, version);
      await market.reload();
    } catch (e: any) {
      setActionError(`${name}: ${e?.message ?? e}`);
    } finally {
      setBusy(null);
    }
  }

  const rowFor = (pkg: string): PkgRow | undefined => market.rows.find((r) => r.name === pkg);

  if (openNode) {
    return <NodeDetailView node={openNode} categoryName={category} onBack={() => setOpenNode(null)} />;
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-[#FAFAFC]">
      {/* Compact header. Same artwork as the card that was clicked, so arriving
          feels continuous, but it does not eat half the screen restating a name. */}
      <section className="relative w-full overflow-hidden" style={{ height: 230 }}>
        <HeaderArt category={category} />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(6,9,16,0.8)] via-[rgba(6,9,16,0.3)] to-[rgba(6,9,16,0.06)]" />
        <div className="relative mx-auto flex h-full max-w-[1180px] flex-col justify-between px-8 py-7">
          <button
            onClick={onBack}
            className="flex items-center gap-2 self-start rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold text-white backdrop-blur transition hover:bg-white/25"
          >
            <span aria-hidden>&lsaquo;</span> Marketplace
          </button>
          <div>
            <h1 className="text-[clamp(32px,4.6vw,52px)] font-semibold leading-[0.98] tracking-[-0.045em] text-white">
              {category}
            </h1>
            {copy && <p className="mt-2.5 max-w-[52ch] text-[15.5px] leading-[1.4] text-white/80">{copy}</p>}
          </div>
        </div>
      </section>

      {/* The category's colour bleeds out of the artwork and fades into the page, so
          the header is not a hard edge between something rich and something blank. */}
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
          style={{ background: `linear-gradient(to bottom, ${accent}14, ${accent}05 45%, rgba(0,0,0,0) 100%)` }}
        />
        <div className="relative mx-auto max-w-[1180px] px-8 pb-24">
        {actionError && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{actionError}</div>
        )}

        {/* What this category actually amounts to, before the list of things in it. */}
        {/* Tiles hug their content rather than stretching, and each states something
            the others do not: how much is here, how much you already have, and what
            still needs a key before it will run. */}
        <div className="flex flex-wrap gap-2.5 pb-9 pt-10">
          {[
            { n: `${groups.length}`, label: `package${groups.length === 1 ? "" : "s"}` },
            { n: `${inCategory.length}`, label: "nodes" },
            {
              n: installedCount === groups.length && groups.length > 0 ? "All" : `${installedCount}`,
              label: "added",
              done: installedCount === groups.length && groups.length > 0,
            },
            ...(needsCredentials > 0 ? [{ n: `${needsCredentials}`, label: "need a key", warn: true }] : []),
          ].map((f: any) => (
            <div
              key={f.label}
              className="min-w-[122px] rounded-2xl border border-gray-200 bg-white px-5 py-3.5 shadow-[0_1px_2px_rgba(16,19,25,0.04)]"
            >
              <div
                className="text-[32px] font-semibold leading-none tracking-[-0.045em] tabular-nums"
                style={{ color: f.done ? "#047857" : f.warn ? "#B45309" : undefined }}
              >
                {f.n}
              </div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-400">{f.label}</div>
            </div>
          ))}
        </div>
        {loading && <p className="pb-4 font-mono text-[11px] text-gray-400">reading catalog…</p>}

        {/* One card per package, with its nodes inside it. Nothing is listed twice. */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {groups.map((g) => {
            const row = rowFor(g.name);
            const total = totalByPackage.get(g.name) ?? g.nodes.length;
            const elsewhere = total - g.nodes.length;
            return (
              <div key={g.name} className="overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,19,25,0.05)]">
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4">
                  <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[13px] border border-gray-200 bg-gray-50 p-2.5">
                    {g.logo && <Logo src={g.logo} className="h-full w-full object-contain" />}
                  </span>
                  <div className="min-w-0">
                    {/* State is shown ONCE, by the control on the right. A badge here
                        as well just said the same thing twice. */}
                    <span className="block truncate text-[15.5px] font-semibold tracking-[-0.02em] text-gray-900">
                      {row?.displayName || g.displayName}
                    </span>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400">
                      {g.name}
                      {row?.installedVersion ? ` · v${row.installedVersion}` : ""}
                      {elsewhere > 0 ? ` · +${elsewhere} elsewhere` : ""}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {row?.hasUpdate ? (
                      <button
                        onClick={() => void act(g.name, "update", row.latestVersion)}
                        disabled={!!busy}
                        className="flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                      >
                        {busy === g.name ? <Spinner /> : null}
                        Update
                      </button>
                    ) : row?.installed ? (
                      <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[12.5px] font-semibold text-emerald-700">Added</span>
                    ) : (
                      <button
                        onClick={() => void act(g.name, "install")}
                        disabled={!!busy}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busy === g.name ? <Spinner /> : null}
                        Add
                      </button>
                    )}
                  </div>
                </div>

                {/* What it actually gives you, in this category. */}
                <div className="border-t border-gray-100 bg-gray-50/60">
                  {g.nodes.map((n) => (
                    <button
                      key={n.type}
                      onClick={() => setOpenNode(n)}
                      className="group/node flex w-full items-start gap-3 border-b border-gray-100 px-5 py-3 text-left transition last:border-b-0 hover:bg-white"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold text-gray-900">{n.name}</span>
                        {n.description && (
                          <span className="mt-0.5 block text-[12.5px] leading-[1.42] text-gray-500">{n.description}</span>
                        )}
                      </span>
                      <span className="mt-0.5 shrink-0 text-gray-300 transition group-hover/node:text-gray-500" aria-hidden>
                        &rsaquo;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
