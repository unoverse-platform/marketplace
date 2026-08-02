/**
 * Marketplace — Agents. Not built yet, and this page says so plainly rather than
 * pretending otherwise with an empty grid.
 *
 * One statement, no filler. Explaining a product that does not exist yet in
 * feature-list form is padding.
 *
 * Below it: RECIPES, which are real. A recipe is a workflow someone copied from a
 * canvas — the exact clipboard payload — so it can be previewed as a mural here and
 * pasted straight onto a canvas, missing packages and all (the canvas offers to add
 * those in place). Curated recipes ship as a package; until the library is filled,
 * you can preview whatever workflow is on your clipboard right now.
 *
 * Deliberately NOT "templates": that word already means rx app templates in Studio's
 * Apps section, and having two would confuse every conversation about either.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { paintArt, paletteFor } from "./categoryArt";
import { useCatalog } from "./host";
import { parseWorkflowClip } from "./workflowClip";
import { RecipeDetailView } from "./RecipeDetailView";
import { useRecipes, sanitiseGraph, type Recipe } from "./recipes";

function CrewArt() {
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
      // Agents get their own motif: a crew, each with tools on tethers.
      paintArt(cv, Math.round(width), Math.round(height), "crew", paletteFor("green"), "agents");
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={host} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

export function AgentsView() {
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#FAFAFC]">
      <div className="mx-auto max-w-[1180px] px-8 pb-24 pt-14">
        <section className="relative overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,19,25,0.05),0_16px_36px_-22px_rgba(16,19,25,0.5)]">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_46%]">
            <div className="flex flex-col justify-center px-12 py-14">
              <span className="self-start rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.09em] text-emerald-700">
                Coming soon
              </span>
              <h1 className="mt-6 text-[56px] font-semibold leading-[0.94] tracking-[-0.05em] text-gray-900">
                Agents you can hire
              </h1>
              <p className="mt-5 max-w-[42ch] text-[17px] leading-[1.45] text-gray-500">
                Purpose-built agents that arrive already knowing the job: research, outreach, support triage. Drop one on
                the canvas and it works.
              </p>
              <button className="mt-8 self-start rounded-xl bg-gray-900 px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-gray-800">
                Tell me when it lands
              </button>
            </div>
            <div className="relative min-h-[280px]">
              <CrewArt />
            </div>
          </div>
        </section>

        <Recipes />
      </div>
    </div>
  );
}

/** Generated cover art, so a new recipe is never a blank rectangle. */
function RecipeArt({ recipe }: { recipe: Recipe }) {
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
      paintArt(cv, Math.round(width), Math.round(height), recipe.art.motif, paletteFor(recipe.art.palette), recipe.id);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recipe]);
  return (
    <div ref={host} className="relative h-[150px] w-full overflow-hidden">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

/** The library: a card per recipe, opening onto the mural. */
function Recipes() {
  const { nodes: catalog } = useCatalog();
  const { recipes: library, loading, error } = useRecipes();
  const [open, setOpen] = useState<Recipe | null>(null);
  const [clipRecipe, setClipRecipe] = useState<Recipe | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (open) return <RecipeDetailView recipe={open} onBack={() => setOpen(null)} />;

  /** Logos for the packages a recipe uses, so a card shows what it is made of. */
  const marksFor = (recipe: Recipe): string[] => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const byKey = new Map<string, string>();
    for (const n of catalog) {
      if (!n.logoUrl) continue;
      byKey.set(norm(n.type), n.logoUrl);
      byKey.set(norm(n.name), n.logoUrl);
    }
    const seen = new Set<string>();
    const out: string[] = [];
    for (const n of recipe.graph.nodes ?? []) {
      if (n.type === "Note") continue;
      const hit = byKey.get(norm(n.type ?? "")) ?? byKey.get(norm(n?.data?.label ?? ""));
      if (hit && !seen.has(hit)) {
        seen.add(hit);
        out.push(hit);
      }
    }
    return out.slice(0, 5);
  };

  /** Anything on the clipboard can be read here too, not just published recipes. */
  async function readClipboard() {
    setNote(null);
    try {
      const parsed = parseWorkflowClip(await navigator.clipboard.readText());
      if (!parsed) {
        setNote("That is not a workflow. Select some nodes on a canvas, copy them, then try again.");
        return;
      }
      const asRecipe: Recipe = {
        id: "clipboard",
        name: "From your clipboard",
        description: "Not a published recipe: whatever you last copied from a canvas.",
        whenToUse: "",
        category: "Unsaved",
        tags: ["Unsaved"],
        art: { motif: "mesh", palette: "slate" },
        graph: parsed,
      };
      setClipRecipe(asRecipe);
      setOpen(asRecipe);
    } catch {
      setNote("The browser would not share the clipboard. Click the page once, then try again.");
    }
  }

  const all = clipRecipe ? [clipRecipe, ...library] : library;

  return (
    <section className="pt-16">
      <div className="flex flex-wrap items-end gap-4 pb-6">
        <div>
          <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-gray-900">Recipes</h2>
          <p className="mt-1 text-sm text-gray-500">
            Whole workflows you can read, then copy onto a canvas. Anything missing offers to install itself.
          </p>
        </div>
        <button
          onClick={() => void readClipboard()}
          className="ml-auto rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-gray-700 shadow-[0_1px_2px_rgba(16,19,25,0.05)] transition hover:bg-gray-50"
        >
          Preview what I copied
        </button>
      </div>

      {note && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">{note}</p>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          Couldn't read the recipe library: {error}
        </p>
      )}

      {!loading && all.length === 0 && !error && (
        <div className="rounded-[22px] border border-dashed border-gray-300 bg-white/60 px-8 py-14 text-center">
          <p className="text-[15px] font-medium text-gray-700">No recipes published yet</p>
          <p className="mx-auto mt-2 max-w-[52ch] text-[13.5px] leading-[1.5] text-gray-500">
            Recipes come from the recipes package. You can still read anything you have copied from a canvas with
            “Preview what I copied” above.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {all.map((r) => {
          const graph = sanitiseGraph(r.graph);
          const marks = marksFor(r);
          return (
            <button
              key={r.id}
              onClick={() => setOpen(r)}
              className="group flex flex-col overflow-hidden rounded-[22px] border border-gray-200 bg-white text-left shadow-[0_1px_2px_rgba(16,19,25,0.05)] transition duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-[0_2px_4px_rgba(16,19,25,0.04),0_20px_40px_-24px_rgba(16,19,25,0.35)]"
            >
              <RecipeArt recipe={r} />
              <div className="px-6 pb-5 pt-5">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-gray-500">
                  {r.category}
                </span>
                <h3 className="mt-2.5 text-[19px] font-semibold tracking-[-0.025em] text-gray-900">{r.name}</h3>
                {/* `description` is the user-facing line. `whenToUse` is selection
                    text and lives on the detail page, not here. */}
                <p className="mt-2 text-[14px] leading-[1.5] text-gray-500">{r.description}</p>
              </div>
              <div className="mt-auto flex items-center gap-2.5 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
                {marks.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-7 w-7 rounded-lg border border-gray-200 bg-white object-contain p-1"
                  />
                ))}
                <span className="ml-auto font-mono text-[11.5px] text-gray-400">
                  {(graph.nodes ?? []).filter((n: any) => n.type !== "Note").length} nodes
                </span>
                <span className="text-gray-300 transition group-hover:text-gray-500" aria-hidden>
                  &rsaquo;
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
