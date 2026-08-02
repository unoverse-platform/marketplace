/**
 * Every page renders against the published catalogue.
 *
 * WHY THESE EXIST. Four bugs shipped in a row that a browser had to find: a scroll hook
 * returning the wrong shape, a missing import, `recipe.tags` undefined, and a search call
 * to a route the page cannot reach. Every one of them was a crash on first render, and
 * every one would have failed here in under a second.
 *
 * WHAT THEY ASSERT. That each page mounts and puts its own content on the screen. Not
 * layout, not pixels: jsdom has no layout engine and React Flow measures to zero in it.
 * A page that renders its title and its data is a page that did not throw, which is the
 * failure this file is for.
 *
 * The data is `definitions/`, the folder the static host serves. Run `npm run sync-defs`
 * first if it is stale.
 */
import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { installDom, catalogue, settle } from "./setup.js";

installDom();

const { createRoot } = await import("react-dom/client");
const React = await import("react");
const { act } = await import("react");

const { DiscoverView } = await import("../src/DiscoverView.js");
const { AgentsView } = await import("../src/AgentsView.js");
const { CategoryDetailView } = await import("../src/CategoryDetailView.js");
const { ItemListView } = await import("../src/ItemListView.js");
const { NodeDetailView } = await import("../src/NodeDetailView.js");
const { ItemDetailView } = await import("../src/ItemDetailView.js");
const { RecipeDetailView } = await import("../src/RecipeDetailView.js");

/** Mount a page, let it settle, hand back its text. Any throw fails the test. */
async function render(node: React.ReactElement): Promise<{ text: string; html: string }> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(node);
  });
  await settle();
  const text = host.textContent ?? "";
  const html = host.innerHTML;
  root.unmount();
  host.remove();
  return { text, html };
}

const items = catalogue().items;
const aNode = items.find((i) => i.kind === "node");
const aSkill = items.find((i) => i.kind === "skill");
const aRecipe = items.find((i) => i.kind === "recipe");

describe("the storefront pages render", () => {
  test("the catalogue is published and has every kind the pages read", () => {
    assert.ok(items.length > 0, "catalogue.json is empty: run npm run sync-defs");
    for (const kind of ["node", "component", "atom", "skill", "prompt-block", "recipe"])
      assert.ok(items.some((i) => i.kind === kind), `no ${kind} in the catalogue`);
  });

  test("Discover renders its hero and its categories", async () => {
    const { text } = await render(React.createElement(DiscoverView));
    assert.match(text, /Everything your/, "the hero is missing");
    assert.match(text, /Browse by what you need/, "the category section is missing");
    assert.match(text, /\d+ categories/, "categories were not derived from the catalogue");
  });

  test("Agents renders the recipe library", async () => {
    const { text } = await render(React.createElement(AgentsView));
    assert.match(text, /Recipes/, "the recipe section is missing");
    assert.match(text, new RegExp(aRecipe.title ?? aRecipe.name), "the published recipe is not listed");
  });

  test("a recipe detail renders, with its tags and its workflow", async () => {
    // The exact shape AgentsView hands it, so this fails if the loader stops filling a
    // field the page reads. `tags` undefined took this page down once.
    const recipe = {
      id: aRecipe.name,
      name: aRecipe.title ?? aRecipe.name,
      description: aRecipe.description ?? "",
      whenToUse: aRecipe.whenToUse ?? "",
      category: aRecipe.category ?? "",
      tags: aRecipe.tags ?? [],
      art: aRecipe.icon,
      graph: JSON.parse(
        (await (await fetch(`items/recipe/${aRecipe.name}.json`)).text()),
      ).definition,
    };
    const { text, html } = await render(
      React.createElement(RecipeDetailView, { recipe, onBack: () => {} }),
    );
    assert.match(text, new RegExp(recipe.name), "the title is missing");
    assert.match(text, /Copy recipe/, "the copy action is missing");
    for (const tag of recipe.tags) assert.match(text, new RegExp(tag), `tag ${tag} is missing`);
    assert.match(html, /react-flow/, "the workflow is not drawn");
  });

  test("a category detail renders its packages", async () => {
    const category = aNode.category;
    const nodes = items
      .filter((i) => i.kind === "node" && i.category === category)
      .map((i) => ({ type: i.name, name: i.title ?? i.name, description: i.description, category: i.category, package: i.pack ?? null, logoUrl: i.icon ?? null }));
    const { text } = await render(
      React.createElement(CategoryDetailView, { category, nodes, loading: false, onBack: () => {} }),
    );
    assert.match(text, new RegExp(category), "the category name is missing");
    assert.ok(nodes.length > 0 && /packages/i.test(text), "the package summary is missing");
  });

  test("an item list renders items of one kind", async () => {
    const listed = items
      .filter((i) => i.kind === "skill")
      .map((i) => ({ ...i, state: "available", enabled: false }));
    const { text } = await render(
      React.createElement(ItemListView, {
        kind: "skill",
        items: listed,
        busy: null,
        onInstall: () => {},
        onUninstall: () => {},
        onOpen: () => {},
        onBack: () => {},
      }),
    );
    assert.match(text, new RegExp(aSkill.title ?? aSkill.name), "the published skill is not listed");
  });

  test("a node detail renders", async () => {
    const node = {
      type: aNode.name,
      name: aNode.title ?? aNode.name,
      description: aNode.description,
      whenToUse: aNode.whenToUse,
      category: aNode.category,
      package: aNode.pack ?? null,
      logoUrl: aNode.icon ?? null,
    };
    const { text } = await render(
      React.createElement(NodeDetailView, { node, categoryName: aNode.category ?? "", onBack: () => {} }),
    );
    assert.match(text, new RegExp(node.name), "the node name is missing");
  });

  test("an item detail renders", async () => {
    const { text } = await render(
      React.createElement(ItemDetailView, {
        kind: "skill",
        name: aSkill.name,
        busy: null,
        onInstall: () => {},
        onUninstall: () => {},
        onBack: () => {},
      }),
    );
    assert.match(text, new RegExp(aSkill.title ?? aSkill.name), "the item name is missing");
  });
});
