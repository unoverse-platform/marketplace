/**
 * A DOM, and a `fetch` that serves the real published files.
 *
 * The storefront reads `catalogue.json` and `items/<kind>/<name>.json` relative to itself.
 * These tests point that at `definitions/`, which is exactly what the static host serves,
 * so a test passes only against the same bytes a browser would get. No fixtures: a fixture
 * is a second copy of the catalogue that drifts, and drift is what these tests exist to
 * catch.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const here = dirname(fileURLToPath(import.meta.url));
export const PUBLISHED = join(here, "..", "..", "definitions");

/** Install a DOM and a fetch that reads `definitions/`. Call once per test file. */
export function installDom(): void {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "http://marketplace.test/",
    pretendToBeVisual: true,
  });

  const g = globalThis as any;
  g.window = dom.window;
  g.document = dom.window.document;
  g.navigator = dom.window.navigator;
  g.HTMLElement = dom.window.HTMLElement;
  g.Element = dom.window.Element;
  g.Node = dom.window.Node;
  g.getComputedStyle = dom.window.getComputedStyle;
  g.requestAnimationFrame = (cb: any) => setTimeout(() => cb(Date.now()), 0);
  g.cancelAnimationFrame = (id: any) => clearTimeout(id);
  // React Flow measures nodes; jsdom reports zero for everything, which is fine for a
  // render smoke test and is why these assert on content rather than on layout.
  g.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  g.DOMMatrixReadOnly = class {
    m22 = 1;
    constructor() {}
  };
  (g as any).IS_REACT_ACT_ENVIRONMENT = true;

  // jsdom implements neither of these, and both are called during a normal render. They
  // are browser gaps, not application bugs, so they are filled rather than worked around
  // in the components.
  dom.window.matchMedia = (query: string) =>
    ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }) as any;
  dom.window.Element.prototype.scrollTo = function () {};
  dom.window.Element.prototype.scrollIntoView = function () {};

  g.fetch = async (input: any): Promise<Response> => {
    const path = String(input).replace(/^https?:\/\/[^/]+\//, "").split("?")[0];
    const file = join(PUBLISHED, path);
    if (!existsSync(file)) return new Response("not found", { status: 404 });
    return new Response(readFileSync(file, "utf8"), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

/** The published catalogue, read the same way the page reads it. */
export function catalogue(): { release: string; items: any[] } {
  return JSON.parse(readFileSync(join(PUBLISHED, "catalogue.json"), "utf8"));
}

/** Let effects, fetches and their re-renders settle. */
export async function settle(times = 6): Promise<void> {
  for (let i = 0; i < times; i++) await new Promise((r) => setTimeout(r, 10));
}
