/**
 * One marketplace item, in full: what it is, what it says, and whether you have it.
 *
 * Kind-agnostic on purpose. A skill shows its SKILL.md, a prompt block shows its text,
 * a node shows its manifest. They are all "a definition plus an action", so they open
 * the same way rather than each growing a bespoke page.
 *
 * The action is decided by state alone (available, installed, update), and an update is
 * the SAME call as an install, so there is one button whose word changes.
 *
 * Tailwind only (apps/canvas convention: no new .css files).
 */
import { useEffect, useState } from "react";
import { authedFetch } from "./host";
import type { MarketItem } from "./host";

interface FullItem extends MarketItem {
  definition: any;
}

/** The readable body of an item, by kind. Falls back to the raw definition. */
function bodyOf(item: FullItem): { label: string; text: string } {
  const d = item.definition ?? {};
  if (item.kind === "skill") return { label: "SKILL.md", text: d.instructions ?? "" };
  if (item.kind === "prompt-block") return { label: "Block", text: d.content ?? "" };
  // A node's body is its manifest. Showing the composed definition rather than the raw
  // YAML would be showing our output, not what its author wrote.
  if (item.kind === "node") {
    const files = d.files ?? {};
    return {
      label: Object.keys(files).join(", ") || "manifest",
      text: Object.entries(files)
        .map(([name, content]) => `# ${name}\n${content}`)
        .join("\n\n"),
    };
  }
  return { label: "Definition", text: JSON.stringify(d, null, 2) };
}


/**
 * The token that references a prompt block in a prompt field.
 *
 * The id is kebab-case on disk; the resolver keys the block map by its CAMELCASE form
 * (`engine/src/template/promptBlocks.ts` toCamelCase), so `crm-sync` is referenced as
 * `{{prompt.crmSync}}`. Deriving it here rather than printing the id is the difference
 * between a usable instruction and one that silently resolves to nothing.
 */
const tokenFor = (id: string) => `{{prompt.${id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}}}`;

export function ItemDetailView({
  kind,
  name,
  busy,
  onInstall,
  onUninstall,
  onBack,
  reloadKey,
}: {
  kind: string;
  name: string;
  busy: string | null;
  onInstall: (t: { kind: string; name: string }) => void;
  onUninstall: (t: { kind: string; name: string }) => void;
  onBack: () => void;
  /** Bumped by the parent after an install, so the page re-reads its own state. */
  reloadKey: number;
}) {
  const [item, setItem] = useState<FullItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    // The PUBLISHED item file, not the universe's /marketplace/item route: a public
    // storefront has no universe to ask, and the definition it needs is already served
    // beside the catalogue at a path derived from (kind, name).
    fetch(`items/${encodeURIComponent(kind)}/${encodeURIComponent(name)}.json`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`could not load ${kind}/${name} (${r.status})`);
        return r.json();
      })
      .then((d) => live && setItem(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [kind, name, reloadKey]);

  const working = busy === `${kind}/${name}`;
  const body = item ? bodyOf(item) : null;

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#FAFAFC]">
      <div className="mx-auto max-w-[900px] px-8 py-10">
        <button
          onClick={onBack}
          className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
        >
          <span aria-hidden>&lsaquo;</span> Back
        </button>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {!item && !error && <p className="text-sm text-gray-500">Loading…</p>}

        {item && (
          <>
            <header className="mb-8 flex items-start justify-between gap-8">
              <div className="min-w-0">
                <h1 className="text-[40px] font-semibold leading-[1] tracking-[-0.045em] text-gray-900">
                  {item.title || item.name}
                </h1>
                {item.description && (
                  <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.5] text-gray-500">{item.description}</p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  {item.state === "installed" && (
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Installed</span>
                  )}
                  {item.state === "update" && (
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Update available</span>
                  )}
                  {item.state === "available" && (
                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">Not installed</span>
                  )}
                  {item.category && <span className="text-xs font-semibold text-gray-400">{item.category}</span>}
                  {/* The fingerprint IS the version, and it is the same value the update
                      check compares, so what you read is what the decision used. */}
                  <span className="font-mono text-[11px] text-gray-400">{item.fingerprint.slice(0, 12)}</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                <button
                  disabled={working}
                  onClick={() => onInstall({ kind: item.kind, name: item.name })}
                  className={`h-10 w-[132px] rounded-xl text-sm font-semibold text-white transition disabled:opacity-60 ${
                    item.state === "update" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"
                  } ${item.state === "installed" ? "hidden" : ""}`}
                >
                  {working ? "Working" : item.state === "update" ? "Update" : "Add"}
                </button>
                {item.state !== "available" && (
                  <button
                    disabled={working}
                    onClick={() => onUninstall({ kind: item.kind, name: item.name })}
                    className="h-10 w-[132px] rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                  >
                    Remove
                  </button>
                )}
              </div>
            </header>

            {/* A prompt block is useless until you know how to reference it, and the
                token is NOT the id: the resolver camelCases it. Showing it here is the
                difference between a block someone uses and one they never reach for. */}
            {item.kind === "prompt-block" && (
              <section className="mb-6 rounded-2xl border border-gray-200 bg-white px-6 py-5">
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.09em] text-gray-400">How to use it</h2>
                <p className="mb-3 text-[14px] leading-[1.5] text-gray-700">
                  Reference it in any prompt field. It is inlined at execution time, so the block lives in one place
                  instead of being pasted into every node.
                </p>
                <button
                  onClick={() => void navigator.clipboard?.writeText(tokenFor(item.name))}
                  title="Copy"
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[13px] text-gray-800 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {tokenFor(item.name)}
                </button>
                <p className="mt-3 text-[12.5px] leading-[1.5] text-gray-500">
                  <span className="font-mono">{`{{prompts.`}</span> and <span className="font-mono">{`{{blocks.`}</span>{" "}
                  resolve to the same block. Disabling it in the registry makes the token resolve to nothing, so a
                  prompt that references a removed block simply loses that section.
                </p>
              </section>
            )}

            {/* whenToUse is the selection text an agent ranks against, so it is the one
                field that explains WHY this item would ever be chosen. */}
            {item.whenToUse && (
              <section className="mb-6 rounded-2xl border border-gray-200 bg-white px-6 py-5">
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-gray-400">When it is used</h2>
                <p className="text-[14px] leading-[1.5] text-gray-700">{item.whenToUse}</p>
              </section>
            )}

            {body && (
              <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5">
                <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.09em] text-gray-400">
                  <span>Contents</span>
                  <span className="font-mono font-normal normal-case text-gray-500">{body.label}</span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-[12.5px] leading-relaxed text-gray-800">
                  {body.text}
                </pre>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
