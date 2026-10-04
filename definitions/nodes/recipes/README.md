# Recipes

Whole workflows a person can read and copy onto a canvas, and that the **builder
agent** can learn from. Not node code: this package registers nothing and executes
nothing. It is data.

## What a recipe is

The exact clipboard payload the canvas produces when you copy nodes
(`{ type: "gravity-workflow", version, nodes, edges }`). So authoring one is:

1. Build the workflow on a canvas until it genuinely works.
2. Select the nodes, copy them.
3. Paste into `recipes/<id>.json`.
4. Add an entry to `manifest.json`.

## The metadata contract

Same three fields as every other selectable artefact
(`docs-starter/nodes/node-discoverability.md`), because recipes are ranked by
the same formula:

- **`description`** — what it IS. One line, ≤120 chars. The listing subtitle a
  person reads.
- **`whenToUse`** — the SELECTION TEXT, and what actually gets embedded. Outcome
  first, in the vocabulary of the job. Mechanism last or not at all. A weak
  `whenToUse` means the recipe is never chosen, however good the workflow is.
- **`category`** — the domain of the job (Assistant, Research, Go To Market…).

## Rules

- **No credentials.** Graphs bind credentials by id (`openAICredential: "1"`).
  Those ids mean nothing elsewhere and could resolve to someone else's credential.
  Strip them; the person who copies picks their own.
- **No client detail.** No customer names in prompts, no org-specific app template
  names. Write prompts as fill-in-the-blank so they read as something to edit.
- **No retired config.** A saved graph keeps fields the node has since dropped.
  Publishing one teaches dead config to everyone who copies it.
- **No numbered labels.** A canvas names each dropped node "Input Trigger 1" only
  to keep two of the same apart. Either name it for the job it does ("Spatial",
  "Agent") or drop the number.
- **Curate hard.** The builder agent imitates what is in here. A sloppy prompt
  becomes house style at scale.

## Recipes vs patterns

Patterns (`UnoverseMCP/services/patterns`) are correct-by-construction wiring for a
known shape: one right answer, fetched by name. Recipes are worked examples:
proven, but one of several reasonable answers, found by describing a problem. The
agent adapts a recipe; it follows a pattern.
