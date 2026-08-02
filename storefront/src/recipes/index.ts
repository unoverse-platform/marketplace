/**
 * The recipe library.
 *
 * A recipe is a whole workflow you can read and then copy onto a canvas: the exact
 * clipboard payload the canvas already produces (`type: "gravity-workflow"`), so
 * there is nothing to convert on either side.
 *
 * DISCOVERABILITY. Recipes carry the same three string fields as every other
 * selectable artefact — `name`, `description`, `whenToUse` — plus a `category`,
 * per docs-starter/nodes/14-node-discoverability.md. That contract is explicitly
 * not nodes-only, and following it is what will let an agent one day answer "find
 * me something that does X" with a recipe rather than a bare node. Written any
 * other way, a recipe is invisible to selection no matter how good it is.
 *
 *   description — what it IS. One line, ≤120 chars, the listing subtitle.
 *   whenToUse   — the SELECTION TEXT, and the thing that actually gets embedded.
 *                 Outcome first, in the words someone would use for the job.
 *                 Mechanism last or not at all.
 *
 * Recipes come from the PUBLISHED CATALOGUE here (kind: "recipe"), the same file every
 * other item is listed in, with each graph fetched from items/recipe/<id>.json when it is
 * opened. The universe's own `GET /recipes` is not reachable from a public page and would
 * be a second library to keep in step.
 *
 * NB "recipe", not "template" — `template` already means an rx app template in
 * Studio's Apps section, which is a different thing entirely.
 */
import { useEffect, useState } from "react";

import type { Motif } from "../categoryArt";

export interface Recipe {
  id: string;
  /** Human display name. */
  name: string;
  /** What it IS. One short line — this is the card subtitle, not a spec. */
  description: string;
  /** The selection text: outcome first, in the vocabulary of the job. */
  whenToUse: string;
  /** The domain of the job (Assistant, Research, Go To Market…). */
  category: string;
  tags: string[];
  /** Generated cover art: no asset pipeline, and a new recipe is never blank. */
  art: { motif: Motif; palette: string };
  /** The clipboard payload: `{ type, version, nodes, edges }`. */
  graph: any;
}

/**
 * The library, from the server. An empty list is a normal state (no recipes
 * package installed), and is not an error.
 */
export function useRecipes(): { recipes: Recipe[]; loading: boolean; error: string | null } {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The catalogue lists recipes without their graphs (a list of forty workflow
        // JSONs would be heavy for a page that shows cards). Each graph is fetched from
        // its own published file, which is the same path an install would use.
        const c = await fetch("catalogue.json");
        if (!c.ok) throw new Error(`HTTP ${c.status}`);
        const listed = ((await c.json()).items ?? []).filter((i: any) => i.kind === "recipe");
        const full = await Promise.all(
          listed.map(async (i: any) => {
            const r = await fetch(`items/recipe/${encodeURIComponent(i.name)}.json`);
            const item = r.ok ? await r.json() : {};
            return {
              id: i.name,
              name: i.title ?? i.name,
              description: i.description ?? "",
              whenToUse: i.whenToUse ?? "",
              category: i.category ?? "",
              // Defaulted, not assumed present: a browse field the catalogue does not
              // carry must degrade to empty rather than take the page down.
              tags: Array.isArray(i.tags) ? i.tags : [],
              art: i.icon,
              graph: item.definition,
            } as Recipe;
          }),
        );
        if (!cancelled) {
          setRecipes(full);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { recipes, loading, error };
}

/**
 * Credentials are NEVER carried by a recipe.
 *
 * A saved graph binds credentials by id (`openAICredential: "1"`). Those ids mean
 * nothing in another universe, and in the worst case resolve to a DIFFERENT
 * account's credential that happens to share the id. So the binding is dropped and
 * the person who pastes it picks their own. `selected` goes too: editor state, not
 * part of the workflow.
 */
export function sanitiseGraph(graph: any): any {
  return {
    ...graph,
    nodes: (graph.nodes ?? []).map((n: any) => {
      const { selected, ...node } = n;
      return { ...node, data: { ...node.data, credentials: {} } };
    }),
    edges: (graph.edges ?? []).map((e: any) => {
      const { selected, ...edge } = e;
      return edge;
    }),
  };
}

/** Which credential types a recipe expects, so the reader knows before copying. */
export function credentialsNeeded(graph: any): string[] {
  const found = new Set<string>();
  for (const n of graph.nodes ?? []) {
    for (const key of Object.keys(n?.data?.credentials ?? {})) found.add(key);
  }
  return [...found];
}
