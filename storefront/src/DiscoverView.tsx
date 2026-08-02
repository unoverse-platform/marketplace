/**
 * Marketplace — Discover. The storefront half of the Studio marketplace.
 *
 * Categories are DERIVED FROM THE LIVE CATALOG, never hardcoded: we group
 * `GET /nodes` by `node.category`, count them, and collect each category's distinct
 * package logos. A category a new package registers appears here on its own,
 * because nothing in this file enumerates the categories it expects.
 *
 * Because the set is unknown at build time, the LAYOUT is a rule applied to data
 * rather than a hand-drawn grid: categories rank by node count and each card's
 * shape follows its rank, so the bento keeps its rhythm whatever the catalog holds.
 *
 * Styling is Tailwind only (apps/canvas convention: no new .css files, no new CSS
 * rules); dynamic values ride inline style vars.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMarketplace, packageAction, Spinner } from "./Marketplace";
import { useCatalog, type CatalogNode } from "./catalog";
import { authedFetch } from "./client";
import { NodeDetailView } from "./NodeDetailView";
import { CategoryDetailView } from "./CategoryDetailView";
import { ItemListView } from "./ItemListView";
import { ItemDetailView } from "./ItemDetailView";
import { useItems, ofKind, heldCount, type ItemKind } from "./items";
import { lookFor, paintCategory } from "./categoryArt";
import { useScrollMemory } from "./lib";
import { BRAND_MARK_WHITE } from "./brand";

export interface CategoryRow {
  name: string;
  nodeCount: number;
  logos: string[];
  packages: string[];
  accent: string;
}

/** Human copy for categories we know. Absent copy is fine: the card still renders. */
const COPY: Record<string, string> = {
  "AI": "Models that read, write, decide and use your tools.",
  "Storage & Data": "The records your business actually runs on.",
  "Go To Market": "Find, enrich and reach the right people.",
  "Voice": "Speak, listen, hold a conversation out loud.",
  "Media & Design": "Make and transform images, audio and video.",
  "Knowledge & Vectors": "A memory you can search by meaning.",
  "Documents": "Read PDFs and pull out what matters.",
  "Web Scraping": "Read the open web, page by page.",
  "Search": "Web, news, places and video results.",
  "Communication": "Reach people where they already are.",
  "Design System": "The components every surface renders from.",
  "Memory": "What your agents remember between runs.",
  "Storage": "Files and objects, read and written.",
  "Ingest": "Pull the outside world in.",
};

/**
 * Plumbing categories. Nobody goes shopping for a trigger or a router, so they are
 * kept out of Browse. They are NOT hidden from the product: Flow and Output ship in
 * @unoverse-platform/flow and still appear under Installed and Marketplace.
 */
const NOT_BROWSABLE = new Set([
  "Flow",
  "Output",
  "Triggers",
  // The design system has its own full-width card below; without this it would
  // also render as an ordinary category and appear twice on the page.
  "Design System",
  // The marketplace is the CONTAINER, not something to shop for. Its one synthesized
  // Component node used to render here as a category called "Marketplace" with "1 node",
  // which counted the wrong unit and read as a package you had somehow not installed.
  "Marketplace",
]);

type Layout = {
  span: number;
  shape: "side" | "top";
  minH: number;
  artH?: number;
  artW?: string;
  size: "xl" | "lg" | "md" | "sm";
};

/** Card shape by rank: the rule, not a per-category decision. */
function layoutFor(rank: number): Layout {
  switch (rank) {
    case 0: return { span: 7, shape: "side", minH: 470, artW: "44%", size: "xl" };
    case 1: return { span: 5, shape: "top", minH: 470, artH: 250, size: "lg" };
    case 2: return { span: 7, shape: "side", minH: 370, artW: "48%", size: "lg" };
    case 3: return { span: 5, shape: "side", minH: 370, artW: "40%", size: "md" };
    case 4:
    case 5:
    case 6: return { span: 4, shape: "top", minH: 410, artH: 230, size: "md" };
    case 7: return { span: 5, shape: "side", minH: 330, artW: "42%", size: "sm" };
    case 8: return { span: 7, shape: "side", minH: 330, artW: "46%", size: "sm" };
    // The tail is the SKINNY card: a low-count category does not earn width, and the
    // DESIGN SYSTEM takes the remaining 8 columns beside it. Every row above already
    // totals 12 (7+5, 7+5, 4+4+4, 5+7), so 4+8 closes the grid without a gap.
    default: return { span: 4, shape: "top", minH: 330, artH: 170, size: "sm" };
  }
}

const TITLE_SIZE: Record<string, string> = {
  xl: "text-[70px] leading-[0.95] tracking-[-0.055em]",
  lg: "text-[48px] leading-[0.95] tracking-[-0.05em]",
  md: "text-[38px] leading-[0.95] tracking-[-0.045em]",
  sm: "text-[31px] leading-[1] tracking-[-0.04em]",
};

/** Paints its category's artwork at whatever size it actually renders at. */
function CategoryArt({ category }: { category: string }) {
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
    <div ref={host} className="relative h-full w-full overflow-hidden">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

const CHIP =
  "shrink-0 bg-white object-contain shadow-[0_6px_18px_-5px_rgba(16,19,25,0.45),0_0_0_1px_rgba(16,19,25,0.06)]";

/**
 * A logo that removes itself if the URL does not load. Some packages point at dead
 * Cloudinary URLs (aws-medical, aws-nova, email all 404 today), and a missing mark
 * must leave no trace rather than render the browser's broken-image glyph.
 */
function Logo({ src, className }: { src: string; className?: string }) {
  const [dead, setDead] = useState(false);
  if (dead) return null;
  return <img src={src} alt="" className={className} onError={() => setDead(true)} />;
}

/**
 * Chips straddle the boundary between artwork and type: off the left edge of a side
 * panel, or below the bottom edge of a stacked one. ONE positioned element carries
 * both the offset and the row, so the offset anchors to the chips themselves.
 */
function LogoChips({ logos, big, side }: { logos: string[]; big?: boolean; side: boolean }) {
  if (!logos.length) return null;
  const size = big ? "h-[58px] w-[58px] rounded-[18px] p-[10px]" : "h-12 w-12 rounded-[15px] p-2";
  // Three is the most that fits the narrowest artwork panel. A fourth is clipped by
  // the card's rounded edge, so the cap belongs here rather than in the data.
  return (
    <div className={`absolute z-[2] flex gap-[11px] ${side ? "-left-8 bottom-[30px]" : "-bottom-[30px] left-[30px]"}`}>
      {logos.slice(0, 3).map((src) => (
        <Logo key={src} src={src} className={`${size} ${CHIP} transition-transform duration-300 group-hover:-translate-y-1`} />
      ))}
    </div>
  );
}

function CategoryCard({ row, layout, onOpen }: { row: CategoryRow; layout: Layout; onOpen: (c: CategoryRow) => void }) {
  const L = layout;
  const side = L.shape === "side";
  return (
    <button
      onClick={() => onOpen(row)}
      style={{
        gridColumn: `span ${L.span}`,
        minHeight: L.minH,
        ["--hue" as string]: row.accent,
        ...(side ? { gridTemplateColumns: `1fr ${L.artW ?? "45%"}` } : {}),
      }}
      className={`group relative overflow-hidden rounded-[28px] border border-gray-200 bg-white p-0 text-left text-gray-900 shadow-[0_1px_2px_rgba(16,19,25,0.05),0_10px_26px_-18px_rgba(16,19,25,0.4)] transition duration-300 hover:-translate-y-1.5 hover:border-gray-300 hover:shadow-[0_2px_4px_rgba(16,19,25,0.07),0_40px_60px_-30px_var(--hue)] ${
        side ? "grid" : "flex flex-col"
      }`}
    >
      <div className={`flex min-w-0 flex-col ${side ? "justify-center px-[38px] py-9" : "flex-1 justify-start px-8 pb-7 pt-12"}`}>
        <h3 className={`text-balance font-semibold ${TITLE_SIZE[L.size]}`}>{row.name}</h3>
        {COPY[row.name] && <p className="mt-3 max-w-[28ch] text-[15px] leading-[1.34] text-gray-500">{COPY[row.name]}</p>}
        <div className={`flex items-center gap-2.5 ${side ? "mt-5" : "mt-auto pt-[18px]"}`}>
          <span className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: row.accent, opacity: 0.85 }} />
          <span className="font-mono text-xs tabular-nums text-gray-400">
            {row.nodeCount} node{row.nodeCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      {/* Artwork: fixed px height when stacked, full height beside the type. Never a
          percentage of the card, so the text can never be squeezed out. */}
      <div className={side ? "relative order-last" : "relative order-first shrink-0"} style={side ? undefined : { height: L.artH ?? 240 }}>
        <CategoryArt category={row.name} />
        <LogoChips logos={row.logos} big={L.size === "xl" || L.size === "lg"} side={side} />
      </div>
    </button>
  );
}

/** Curated bundles. The vendor's own mark leads: that is where the weight is. */
const PACKS = [
  { title: "Running on AWS", copy: "Everything for a team already on Amazon.", hue: "#f59e0b", hero: "aws-toolkit", tools: ["aws-bedrock", "aws-s3", "aws-dynamodb"] },
  { title: "The AI stack", copy: "Every model worth reaching for, one place.", hue: "#6366f1", hero: "openai", tools: ["aws-bedrock", "gce-toolkit", "openai-realtime"] },
  { title: "For designers", copy: "Make, render and ship the interface.", hue: "#ec4899", hero: "design-system", tools: ["cloudinary", "pdf-render", "miro-bridge"] },
  { title: "Go to market", copy: "Find them, enrich them, reach them.", hue: "#f43f5e", hero: "gtm", tools: ["hubspot", "airtable", "crawl"] },
];

const HEADLINE_WORDS = ["do", "say", "know", "reach"];

type Floater = { src: string; left: string; top: string; size: number };

/**
 * Full-width hero. The floating marks position against the VIEWPORT while the type
 * stays in the 1180px column, so the marks sit in the outer space either side of the
 * copy instead of being squeezed into its lane.
 */
function HeroSection({
  floaters,
  wordIndex,
  query,
  setQuery,
}: {
  floaters: Floater[];
  wordIndex: number;
  query: string;
  setQuery: (v: string) => void;
}) {
  return (
    <section className="relative w-full overflow-hidden pb-[92px] pt-[88px] text-center">
      {floaters.map((f, i) => (
        <div
          key={f.src}
          className="pointer-events-none absolute hidden animate-float xl:block"
          style={{ left: f.left, top: f.top, animationDelay: `${i * 0.55}s` }}
        >
          <span
            className="grid place-items-center rounded-[28%] border border-gray-200 bg-white p-2.5 shadow-[0_12px_28px_-10px_rgba(16,19,25,0.3),0_2px_5px_rgba(16,19,25,0.07)]"
            style={{ width: f.size, height: f.size }}
          >
            <Logo src={f.src} className="h-full w-full object-contain" />
          </span>
        </div>
      ))}

      <div className="relative mx-auto max-w-[1180px] px-8">
        {/* Two lines, always: each is nowrap and the size is viewport relative, so it
            scales down rather than ever reflowing to three. */}
        <h1 className="text-[clamp(27px,5.5vw,72px)] font-semibold leading-[1.06] tracking-[-0.045em] text-gray-900">
          <span className="block whitespace-nowrap">Everything your</span>
          <span className="flex items-center justify-center gap-[0.22em] whitespace-nowrap">
            <span className="flex items-center gap-[0.16em]">
              {/* Centring on the flex line is not enough: "unoverse" is all x-height,
                  so its optical centre sits below its box centre. The nudge lands the
                  mark on the word's actual middle. */}
              <img
                src={BRAND_MARK_WHITE}
                alt=""
                className="relative top-[0.085em] -mr-[0.07em] h-[0.66em] w-[0.66em] shrink-0 object-contain invert"
              />
              unoverse
            </span>
            <span>can</span>
            {/* Every word renders at once in one grid cell, so the cell is as wide as
                the longest and the line never shifts as it changes. */}
            <span className="grid text-left">
              {HEADLINE_WORDS.map((w, i) => (
                <span
                  key={w}
                  className={`col-start-1 row-start-1 text-emerald-600 transition-all duration-500 ${
                    i === wordIndex ? "translate-y-0 opacity-100" : "translate-y-[0.16em] opacity-0"
                  }`}
                >
                  {w}
                </span>
              ))}
            </span>
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-[50ch] text-[18px] text-gray-500">
          Power up your agents. Everything here is one click from your canvas.
        </p>

        <div className="mx-auto mt-9 flex max-w-[520px] items-center gap-3 rounded-full border border-gray-200 bg-white px-5 py-3.5 text-left shadow-[0_1px_2px_rgba(16,19,25,0.05),0_2px_8px_-2px_rgba(16,19,25,0.06)] focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-50">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-gray-400">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.2-3.2" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for something like &ldquo;transcribe a call&rdquo;"
            aria-label="Search the marketplace"
            className="w-full border-0 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
          />
          {query && (
            <button onClick={() => setQuery("")} className="shrink-0 text-xs font-semibold text-gray-400 hover:text-gray-700">
              Clear
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function DiscoverView({ onOpenCategory }: { onOpenCategory?: (c: CategoryRow) => void }) {
  const { nodes, loading, error } = useCatalog();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  // Marketplace items (skills, prompt blocks, nodes, the design system bundle). Their
  // state comes from the server as a fingerprint comparison, so nothing is tracked here.
  const market2 = useItems();
  const [openKind, setOpenKind] = useState<ItemKind | null>(null);
  const [openItem, setOpenItem] = useState<{ kind: string; name: string } | null>(null);
  // Bumped after an install so an open detail page re-reads its own state rather than
  // showing what was true when it opened.
  const [itemsVersion, setItemsVersion] = useState(0);
  const [updating, setUpdating] = useState<string | null>(null);
  const [results, setResults] = useState<(CatalogNode & { relevance?: number })[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [weak, setWeak] = useState(false);
  const [openNode, setOpenNode] = useState<CatalogNode | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [query, setQuery] = useState("");
  const market = useMarketplace();
  // Opening a category, item or node replaces this whole page. Coming back to the top
  // of a storefront you had scrolled halfway down is losing your place, not navigating.
  const scrollRef = useScrollMemory<HTMLDivElement>("market:discover");

  /**
   * Search is SEMANTIC, not substring. The server runs the same embedding + lexical
   * ranker an agent uses to pick a node, so "scrape web" finds Hyperbrowser Crawl
   * even though neither word appears in its name. A plain includes() found nothing.
   */
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await authedFetch("/nodes/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ task: q, limit: 24 }),
        });
        const d = await r.json();
        if (cancelled) return;
        // `ranked:false` means the ranker was unavailable (no key / API error) and the
        // server returned the whole catalog unordered. Falling back to the local
        // filter is better than presenting an arbitrary order as if it were ranked.
        setResults(r.ok && d.ranked ? ((d.nodes ?? []) as CatalogNode[]) : null);
        setWeak(Boolean(r.ok && d.ranked && d.weak));
      } catch {
        // Ranker unavailable: fall back to the local match rather than showing nothing.
        if (!cancelled) setResults(null);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setWordIndex((i) => (i + 1) % HEADLINE_WORDS.length), 3400);
    return () => clearInterval(t);
  }, []);

  /** Group the catalog by category. This is the whole data model of the page. */
  const categories = useMemo<CategoryRow[]>(() => {
    // Chips represent PACKAGES, so they are collected per package rather than per
    // node. Deduplicated on the image too: several packages can point at the same
    // Cloudinary asset, and the same mark twice in a row reads as a bug.
    const byCat = new Map<string, { count: number; byPackage: Map<string, { count: number; logo?: string }> }>();
    for (const n of nodes) {
      const name = (n.category ?? "").trim();
      if (!name) continue; // A node with no category is a data bug in its package.
      let row = byCat.get(name);
      if (!row) byCat.set(name, (row = { count: 0, byPackage: new Map() }));
      row.count += 1;
      const pkg = n.package ?? "(unpackaged)";
      const p = row.byPackage.get(pkg) ?? { count: 0 };
      p.count += 1;
      if (!p.logo && n.logoUrl) p.logo = n.logoUrl;
      row.byPackage.set(pkg, p);
    }
    return [...byCat.entries()]
      .filter(([name]) => !NOT_BROWSABLE.has(name))
      .map(([name, v]) => {
        const seen = new Set<string>();
        const logos: string[] = [];
        for (const [, p] of [...v.byPackage.entries()].sort((a, b) => b[1].count - a[1].count)) {
          if (!p.logo || seen.has(p.logo)) continue;
          seen.add(p.logo);
          logos.push(p.logo);
          if (logos.length === 4) break;
        }
        return {
          name,
          nodeCount: v.count,
          packages: [...v.byPackage.keys()],
          logos,
          accent: lookFor(name).accent,
        };
      })
      .sort((a, b) => b.nodeCount - a.nodeCount || a.name.localeCompare(b.name));
  }, [nodes]);

  /** package name → its logo and node count, straight from the catalog. */
  const packages = useMemo(() => {
    const m = new Map<string, { logo?: string; count: number }>();
    for (const n of nodes) {
      if (!n.package) continue;
      const row = m.get(n.package) ?? { count: 0 };
      row.count += 1;
      if (!row.logo && n.logoUrl) row.logo = n.logoUrl;
      m.set(n.package, row);
    }
    return m;
  }, [nodes]);

  /** Packs resolve their logos from the catalog; an unresolvable pack is dropped. */
  const packs = useMemo(() => {
    const find = (short: string) => {
      for (const [name, v] of packages) if (name.endsWith(`/${short}`)) return { name, ...v };
      return null;
    };
    return PACKS.map((p) => {
      const hero = find(p.hero);
      const tools = p.tools.map(find).filter(Boolean) as { name: string; logo?: string; count: number }[];
      if (!hero?.logo) return null;
      const all = [hero, ...tools];
      return {
        ...p,
        heroLogo: hero.logo,
        toolLogos: tools.map((t) => t.logo).filter(Boolean) as string[],
        packageCount: all.length,
        nodeCount: all.reduce((a, t) => a + t.count, 0),
      };
    }).filter(Boolean) as Array<(typeof PACKS)[number] & { heroLogo: string; toolLogos: string[]; packageCount: number; nodeCount: number }>;
  }, [packages]);

  /** Six distinct marks for the hero, biggest packages first, placed around the type. */
  const floaters = useMemo(() => {
    // Positioned against the FULL-WIDTH hero, clustered around the headline rather
    // than trailing down past the search bar. The text column is capped at 1180px
    // and centred, so these percentages keep clear of it on any window.
    const spots = [
      { left: "13%", top: "22%", size: 60 },
      { left: "22%", top: "52%", size: 48 },
      { left: "7%", top: "62%", size: 44 },
      { left: "79%", top: "20%", size: 56 },
      { left: "88%", top: "50%", size: 46 },
      { left: "73%", top: "64%", size: 42 },
    ];
    const seen = new Set<string>();
    const marks: string[] = [];
    for (const [, v] of [...packages.entries()].sort((a, b) => b[1].count - a[1].count)) {
      if (v.logo && !seen.has(v.logo)) {
        seen.add(v.logo);
        marks.push(v.logo);
      }
      if (marks.length === spots.length) break;
    }
    return marks.map((src, i) => ({ src, ...spots[i] }));
  }, [packages]);

  /** Free-text filter across a category's name, its copy and the nodes inside it. */
  const visibleCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    const hitsByCat = new Map<string, boolean>();
    for (const n of nodes) {
      const cat = (n.category ?? "").trim();
      if (!cat || hitsByCat.get(cat)) continue;
      if (`${n.name} ${n.description ?? ""} ${n.package ?? ""}`.toLowerCase().includes(q)) hitsByCat.set(cat, true);
    }
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || (COPY[c.name] ?? "").toLowerCase().includes(q) || hitsByCat.get(c.name),
    );
  }, [categories, nodes, query]);

  // The design system's mark, if some installed package happens to carry one. It is
  // decoration only: the card no longer depends on a package existing, because the
  // design system stopped being a package. Looking for one named "design-system" is
  // what made this card silently disappear when that package became "marketplace".
  const designSystem = useMemo(() => {
    for (const [name, v] of packages) if (name.endsWith("/marketplace") || name.endsWith("/design-system")) return { name, ...v };
    return null;
  }, [packages]);
  // The design system's real state: taken as ONE unit, so it has one state and one
  // version derived from its members' fingerprints. `partial` is possible and shown.
  const dsBundle = market2.bundles.find((b) => b.name === "design-system") ?? null;

  // The open category is LOCAL STATE, deliberately. Writing it into the URL fought
  // the Studio's own navigation and bounced the section back to Apps, so the
  // marketplace keeps its own place and Back is a button on the page.
  const updates = market.rows.filter((r) => r.hasUpdate);

  async function updateOne(name: string, version?: string) {
    setUpdating(name);
    try {
      await packageAction(name, "update", version);
      await market.reload();
    } finally {
      setUpdating(null);
    }
  }

  async function updateAll() {
    setUpdating("*");
    try {
      for (const r of updates) await packageAction(r.name, "update", r.latestVersion);
      await market.reload();
    } finally {
      setUpdating(null);
    }
  }

  const open = onOpenCategory ?? ((c: CategoryRow) => setOpenCategory(c.name));

  if (openNode) {
    return <NodeDetailView node={openNode} categoryName="Marketplace" onBack={() => setOpenNode(null)} />;
  }

  const installThenRefresh = async (t: { kind?: string; name?: string; bundle?: string }) => {
    await market2.install(t);
    setItemsVersion((v) => v + 1);
  };
  const uninstallThenRefresh = async (t: { kind?: string; name?: string; bundle?: string }) => {
    await market2.uninstall(t);
    setItemsVersion((v) => v + 1);
  };

  if (openItem) {
    return (
      <ItemDetailView
        kind={openItem.kind}
        name={openItem.name}
        busy={market2.busy}
        onInstall={installThenRefresh}
        onUninstall={uninstallThenRefresh}
        onBack={() => setOpenItem(null)}
        reloadKey={itemsVersion}
      />
    );
  }

  if (openKind) {
    return (
      <ItemListView
        kind={openKind}
        items={ofKind(market2.items, openKind)}
        busy={market2.busy}
        onInstall={installThenRefresh}
        onUninstall={uninstallThenRefresh}
        onOpen={setOpenItem}
        onBack={() => setOpenKind(null)}
      />
    );
  }

  if (openCategory) {
    return (
      <CategoryDetailView
        category={openCategory}
        copy={COPY[openCategory]}
        nodes={nodes}
        loading={loading}
        onBack={() => setOpenCategory(null)}
      />
    );
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-[#FAFAFC]">
      {/* HERO IS FULL WIDTH. The text column is capped and centred inside it, while
          the floating marks position against the viewport, so they sit in the outer
          space rather than being squeezed into the type's lane. */}
      <HeroSection
        floaters={floaters}
        wordIndex={wordIndex}
        query={query}
        setQuery={setQuery}
      />
      <div className="mx-auto max-w-[1180px] px-8 pb-14">
        {/* Updates bubble to the top of the storefront: a package with a newer
            version is something to act on, not something to go hunting for. */}
        {updates.length > 0 && (
          <section className="pb-14 pt-10">
            <div className="overflow-hidden rounded-[20px] border border-amber-200 bg-amber-50/60">
              <div className="flex flex-wrap items-center gap-3 px-6 py-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-700">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20V6m0 0l-5 5m5-5l5 5" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold tracking-[-0.015em] text-amber-900">
                    {updates.length} update{updates.length === 1 ? "" : "s"} available
                  </p>
                  <p className="mt-0.5 text-[13px] text-amber-800/70">Newer versions are published for packages you already have.</p>
                </div>
                <button
                  onClick={() => void updateAll()}
                  disabled={!!updating}
                  className="ml-auto flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {updating === "*" ? <Spinner /> : null}
                  Update all
                </button>
              </div>
              <div className="border-t border-amber-200/70">
                {updates.map((r) => (
                  <div key={r.name} className="flex flex-wrap items-center gap-3 border-b border-amber-200/50 px-6 py-3 last:border-b-0">
                    {r.logoUrl && <Logo src={r.logoUrl} className="h-7 w-7 rounded-lg bg-white object-contain p-1" />}
                    <span className="text-[13.5px] font-semibold text-amber-900">{r.displayName}</span>
                    <span className="font-mono text-[11.5px] text-amber-800/60">
                      v{r.installedVersion} &rarr; v{r.latestVersion}
                    </span>
                    <button
                      onClick={() => void updateOne(r.name, r.latestVersion)}
                      disabled={!!updating}
                      className="ml-auto rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                      {updating === r.name ? "Updating…" : "Update"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="pb-24">
          <div className="mb-7 flex items-end gap-5">
            <div>
              <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-gray-900">
                {results ? "Best matches" : "Browse by what you need"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {results ? "Ranked by what the node actually does." : "Not sure what you're looking for? Start here."}
              </p>
            </div>
            <span className="ml-auto font-mono text-[11px] text-gray-400">
              {loading
                ? "reading catalog…"
                : searching
                  ? "searching…"
                  : results
                    ? `${results.length} node${results.length === 1 ? "" : "s"} match`
                    : query.trim()
                      ? `${visibleCategories.length} of ${categories.length} categories`
                      : `${categories.length} categories · ${nodes.length} nodes`}
            </span>
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              Couldn't read the node catalog: {error}
            </div>
          )}
          {/* Searching shows NODES, since that is what was asked for. Browsing shows
              categories. The two never appear at once. */}
          {results ? (
            <div className="overflow-hidden rounded-[20px] border border-gray-200 bg-white">
              {weak && results.length > 0 && (
                <p className="border-b border-gray-100 bg-amber-50/60 px-5 py-2.5 text-[12.5px] text-amber-800">
                  Nothing matched strongly. These are the closest, in order.
                </p>
              )}
              {results.map((n) => (
                <button
                  key={n.type}
                  onClick={() => setOpenNode(n)}
                  className="group/row flex w-full items-center gap-4 border-b border-gray-100 px-5 py-3.5 text-left transition last:border-b-0 hover:bg-gray-50"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white p-1.5">
                    {n.logoUrl && <Logo src={n.logoUrl} className="h-full w-full object-contain" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold text-gray-900">{n.name}</span>
                    {n.description && (
                      <span className="mt-0.5 line-clamp-1 block text-[13px] text-gray-500">{n.description}</span>
                    )}
                  </span>
                  {typeof (n as any).relevance === "number" && (
                    <span className="hidden shrink-0 font-mono text-[11px] tabular-nums text-gray-400 lg:block">
                      {Math.round((n as any).relevance * 100)}%
                    </span>
                  )}
                  {n.category && (
                    <span
                      className="hidden shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold md:block"
                      style={{ background: `${lookFor(n.category).accent}14`, color: lookFor(n.category).accent }}
                    >
                      {n.category}
                    </span>
                  )}
                  <span className="shrink-0 text-gray-300 transition group-hover/row:text-gray-500" aria-hidden>
                    &rsaquo;
                  </span>
                </button>
              ))}
              {results.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-gray-500">
                  No node matches &ldquo;{query.trim()}&rdquo;.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-[18px]">
                {visibleCategories.map((row, i) => (
                  <CategoryCard key={row.name} row={row} layout={layoutFor(i)} onOpen={open} />
                ))}
                {/* The design system sits IN the grid rather than in a slab below it, so
                    the last row reads as one thought: the last category beside the thing
                    that decides how all of them look. It takes the 7 columns the trailing
                    card leaves, and it is the only card here that is not a node category. */}
                {dsBundle && (
                  <div className="col-span-12 md:col-span-8">
                    <button className="group grid h-full w-full grid-cols-1 overflow-hidden rounded-[28px] border border-gray-200 bg-white p-0 text-left shadow-[0_1px_2px_rgba(16,19,25,0.05),0_16px_36px_-22px_rgba(16,19,25,0.5)] transition duration-300 hover:-translate-y-1.5 hover:border-gray-300 hover:shadow-[0_2px_4px_rgba(16,19,25,0.07),0_44px_66px_-32px_rgba(16,185,129,0.42)] md:grid-cols-[1fr_46%]">
              <div className="flex flex-col justify-center px-9 py-10">
                <span className="mb-6 inline-flex items-center gap-2.5 self-start rounded-full border border-gray-200 bg-gray-50 py-1.5 pl-2 pr-3.5 text-xs font-semibold text-gray-500">
                  {designSystem?.logo && <Logo src={designSystem.logo} className="h-[22px] w-[22px] rounded-[7px] bg-white object-contain" />}
                  Your design system
                </span>
                <h2 className="text-[40px] font-semibold leading-[0.95] tracking-[-0.05em] text-gray-900">Design System</h2>
                <p className="mt-3 max-w-[32ch] text-[14px] leading-[1.45] text-gray-500">
                  The shared component library every surface renders from. Components, atoms, tokens and themes, versioned like anything else.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {/* State is the JOIN, never a stored flag: what the catalogue offers
                      against what this universe holds. `partial` is shown rather than
                      rounded to installed, because a half-finished set is exactly when
                      someone needs to know. */}
                  {dsBundle?.state === "installed" && (
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Installed</span>
                  )}
                  {dsBundle?.state === "update" && (
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Update available</span>
                  )}
                  {dsBundle?.state === "partial" && (
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {dsBundle.installed} of {dsBundle.total} installed
                    </span>
                  )}
                  {dsBundle?.state === "available" && (
                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">Not installed</span>
                  )}
                  {dsBundle && (
                    <span className="font-mono text-xs text-gray-400">
                      v{dsBundle.version} · {dsBundle.total} items
                    </span>
                  )}
                  {dsBundle && dsBundle.state !== "installed" && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); void market2.install({ bundle: "design-system" }); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); void market2.install({ bundle: "design-system" }); } }}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      {market2.busy === "design-system" ? "Working" : dsBundle.state === "update" ? "Update" : "Install"}
                    </span>
                  )}
                </div>
              </div>
              {/* Its artwork is the components themselves, not decoration. */}
              <div className="relative min-h-[330px] overflow-hidden bg-gray-50">
                <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_82%_8%,rgba(16,185,129,0.18),transparent_62%),radial-gradient(90%_80%_at_12%_92%,rgba(99,102,241,0.16),transparent_60%)]" />
                <div className="absolute inset-0 grid grid-cols-2 content-center gap-3 p-7">
                  <div className="-rotate-1 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-[0_10px_24px_-12px_rgba(16,19,25,0.4)] transition-transform duration-500 group-hover:-translate-y-1.5">
                    <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.09em] text-gray-400">Card</div>
                    <div className="h-9 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-400" />
                    <div className="mt-2.5 h-[7px] w-[72%] rounded-full bg-gray-200" />
                    <div className="mt-1.5 h-[7px] w-[48%] rounded-full bg-gray-100" />
                  </div>
                  <div className="translate-y-2 rotate-1 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-[0_10px_24px_-12px_rgba(16,19,25,0.4)] transition-transform duration-500 group-hover:translate-y-0.5">
                    <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.09em] text-gray-400">Button</div>
                    <div className="h-[26px] rounded-lg bg-emerald-600 opacity-90" />
                    <div className="mt-2 h-[26px] rounded-lg bg-emerald-600/[0.16]" />
                    <div className="mt-2.5 h-[7px] w-[60%] rounded-full bg-gray-100" />
                  </div>
                  <div className="-translate-y-1.5 rotate-1 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-[0_10px_24px_-12px_rgba(16,19,25,0.4)] transition-transform duration-500 group-hover:-translate-y-3">
                    <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.09em] text-gray-400">Palette</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="h-[30px] rounded-lg bg-emerald-700" />
                      <div className="h-[30px] rounded-lg bg-indigo-500" />
                      <div className="h-[30px] rounded-lg bg-amber-500" />
                      <div className="h-[30px] rounded-lg bg-gray-900" />
                    </div>
                    <div className="mt-2.5 h-[7px] w-[54%] rounded-full bg-gray-100" />
                  </div>
                  <div className="translate-y-0.5 -rotate-1 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-[0_10px_24px_-12px_rgba(16,19,25,0.4)] transition-transform duration-500 group-hover:-translate-y-1">
                    <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.09em] text-gray-400">Type</div>
                    <div className="text-[22px] font-semibold leading-tight tracking-[-0.03em] text-gray-900">Aa</div>
                    <div className="mt-2 h-[7px] w-[84%] rounded-full bg-gray-200" />
                    <div className="mt-1.5 h-[7px] w-[66%] rounded-full bg-gray-100" />
                  </div>
                </div>
              </div>
            </button>
                  </div>
                )}
              </div>
              {!loading && query.trim() && !searching && visibleCategories.length === 0 && (
                <p className="py-10 text-center text-sm text-gray-500">
                  Nothing matches &ldquo;{query.trim()}&rdquo;.
                </p>
              )}
            </>
          )}
        </section>

      </div>

        {/* Skills and prompt blocks: the other two things the marketplace publishes.
            On a full-width band a shade darker than the page, purely to break the scroll:
            everything above and below is white cards on #FAFAFC, and a long run of that
            reads as one undifferentiated column. It sits OUTSIDE the max-w container so
            it reaches both edges, with its own capped column inside. */}
        <section className="relative w-full border-y border-gray-200/70 bg-[#F1F2F6] py-16">
          {/* A soft wash so the band is not a flat block, tuned to the two accents. */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_16%_0%,rgba(139,92,246,0.07),transparent_60%),radial-gradient(70%_120%_at_88%_100%,rgba(245,158,11,0.07),transparent_58%)]" />
          <div className="relative mx-auto max-w-[1180px] px-8">
            <div className="mb-9">
              <h2 className="text-[34px] font-semibold leading-[1] tracking-[-0.04em] text-gray-900">Teach your Agents</h2>
              <p className="mt-2.5 max-w-[56ch] text-[15px] leading-[1.5] text-gray-500">
                Skills and prompt blocks, taken one at a time. Installed here, available on every Canvas.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
              {([
                {
                  kind: "skill" as const,
                  title: "Skills",
                  blurb: "Instructions an agent selects by intent, installed one at a time.",
                },
                {
                  kind: "prompt-block" as const,
                  title: "Prompt Blocks",
                  blurb: "Reusable instruction blocks any system prompt can reference.",
                },
              ]).map((c) => {
                const all = ofKind(market2.items, c.kind);
                const held = heldCount(market2.items, c.kind);
                const updates = all.filter((i) => i.state === "update").length;
                return (
                  <button
                    key={c.kind}
                    onClick={() => setOpenKind(c.kind)}
                    className="group flex flex-col overflow-hidden rounded-[26px] border border-gray-200 bg-white p-0 text-left shadow-[0_1px_2px_rgba(16,19,25,0.05),0_14px_30px_-20px_rgba(16,19,25,0.45)] transition duration-300 hover:-translate-y-1 hover:border-gray-300"
                  >
                    {/* Same generative artwork the category cards use, at whatever size
                        this card actually renders. No image files, nothing to 404. */}
                    <div className="h-[190px] w-full">
                      <CategoryArt category={c.title} />
                    </div>
                    <div className="flex flex-1 flex-col px-8 py-7">
                      <h3 className="text-[30px] font-semibold leading-[1] tracking-[-0.04em] text-gray-900">{c.title}</h3>
                      <p className="mt-2.5 max-w-[38ch] text-[14px] leading-[1.45] text-gray-500">{c.blurb}</p>
                      <div className="mt-5 flex items-center gap-2.5">
                        <span className="text-xs font-semibold text-gray-400">
                          {held} of {all.length} installed
                        </span>
                        {updates > 0 && (
                          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                            {updates} update{updates > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>


      {/* pt-20 because this column REOPENS after the full-width band: without it Packs
          starts flush against the band's bottom edge and the segment reads as a lid on
          the section below rather than a break between two. */}
      <div className="mx-auto max-w-[1180px] px-8 pb-24 pt-20">
        {/* Packs */}
        {packs.length > 0 && (
          <section className="pb-24">
            <div className="mb-7">
              <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-gray-900">Packs</h2>
              <p className="mt-1 text-sm text-gray-500">Curated sets for the stack you already run.</p>
            </div>
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              {packs.map((p) => (
                <button
                  key={p.title}
                  style={{ ["--hue" as string]: p.hue }}
                  className="group relative grid grid-cols-[auto_1fr] items-center gap-5 overflow-hidden rounded-[18px] border border-gray-200 bg-white px-6 py-5 text-left shadow-[0_1px_2px_rgba(16,19,25,0.05)] transition duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-[0_2px_4px_rgba(16,19,25,0.04),0_12px_28px_-10px_rgba(16,19,25,0.14)]"
                >
                  <span className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-[18px] border border-gray-200 bg-gray-50 p-3.5">
                    <Logo src={p.heroLogo} className="h-full w-full object-contain" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[17px] font-semibold tracking-[-0.024em] text-gray-900">{p.title}</span>
                    <span className="mt-1 block text-[13px] leading-[1.42] text-gray-500">{p.copy}</span>
                    <span className="mt-3 flex items-center gap-1.5">
                      {p.toolLogos.map((src) => (
                        <Logo key={src} src={src} className="h-[26px] w-[26px] rounded-md border border-gray-200 bg-white object-contain p-[3px] transition-transform duration-300 group-hover:-translate-y-0.5" />
                      ))}
                      <span className="ml-1.5 font-mono text-[11.5px] text-gray-400">
                        {p.packageCount} packages · {p.nodeCount} nodes
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
