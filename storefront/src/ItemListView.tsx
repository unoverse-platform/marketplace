/**
 * One kind of marketplace item, listed: skills, prompt blocks or nodes.
 *
 * Opened from a card on Discover. Every row shows what it is, whether this universe
 * holds it, and the one action that applies. Version is the item's content fingerprint
 * rather than a number someone maintains: it moves when the item moves, and it cannot
 * lie about what you have.
 *
 * Tailwind only (apps/canvas convention: no new .css files).
 */
import { type ItemKind, type MarketItem } from "./items";
import { useScrollMemory } from "./lib";

const COPY: Record<string, { title: string; blurb: string }> = {
  skill: {
    title: "Skills",
    blurb: "Instructions an agent selects by intent. Take the ones your agents should know.",
  },
  "prompt-block": {
    title: "Prompt Blocks",
    blurb: "Reusable instruction blocks any system prompt can reference.",
  },
  node: {
    title: "Nodes",
    blurb: "Declarative nodes. Data, not code, so taking one installs no packages.",
  },
};

/** The single action a row offers, decided by state alone. */
function Action({
  item,
  busy,
  onInstall,
  onUninstall,
}: {
  item: MarketItem;
  busy: boolean;
  onInstall: () => void;
  onUninstall: () => void;
}) {
  if (busy)
    return (
      <span className="inline-flex h-8 w-[92px] items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-400">
        Working
      </span>
    );

  if (item.state === "available")
    return (
      <button
        onClick={onInstall}
        className="h-8 w-[92px] rounded-lg bg-emerald-600 text-xs font-semibold text-white transition hover:bg-emerald-700"
      >
        Add
      </button>
    );

  // An update is the same call as an install, so it is one button with different copy.
  if (item.state === "update")
    return (
      <button
        onClick={onInstall}
        className="h-8 w-[92px] rounded-lg bg-amber-500 text-xs font-semibold text-white transition hover:bg-amber-600"
      >
        Update
      </button>
    );

  return (
    <button
      onClick={onUninstall}
      className="h-8 w-[92px] rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
    >
      Remove
    </button>
  );
}

export function ItemListView({
  kind,
  items,
  busy,
  onInstall,
  onUninstall,
  onOpen,
  onBack,
}: {
  kind: ItemKind;
  items: MarketItem[];
  busy: string | null;
  onInstall: (t: { kind: string; name: string }) => void;
  onUninstall: (t: { kind: string; name: string }) => void;
  onOpen: (t: { kind: string; name: string }) => void;
  onBack: () => void;
}) {
  const copy = COPY[kind] ?? { title: kind, blurb: "" };
  const held = items.filter((i) => i.state !== "available").length;
  // Per kind, so the nodes list and the skills list each keep their own place.
  const scrollRef = useScrollMemory<HTMLDivElement>(`market:list:${kind}`);

  return (
    // Same scroll root as CategoryDetailView and Discover. Without the surface the
    // Studio shell's dark chrome shows through and the page reads as a different app.
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-[#FAFAFC]">
      <div className="mx-auto max-w-[1180px] px-8 py-10">
      <button
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
      >
        <span aria-hidden>&lsaquo;</span> Marketplace
      </button>

      <header className="mb-8">
        <h1 className="text-[44px] font-semibold leading-[0.95] tracking-[-0.05em] text-gray-900">{copy.title}</h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.5] text-gray-500">{copy.blurb}</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
          {held} of {items.length} installed
        </p>
      </header>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          Nothing published here yet.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {items.map((item, i) => (
            <li
              key={`${item.kind}/${item.name}`}
              className={`flex items-center gap-5 px-6 py-4 ${i > 0 ? "border-t border-gray-100" : ""}`}
            >
              {/* The row body opens the item; the action stays a separate control, so
                  clicking Add never navigates and reading never installs. */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpen({ kind: item.kind, name: item.name })}
                onKeyDown={(e) => e.key === "Enter" && onOpen({ kind: item.kind, name: item.name })}
                className="min-w-0 flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="truncate text-sm font-semibold text-gray-900">{item.title || item.name}</span>
                  {item.state === "update" && (
                    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                      Update
                    </span>
                  )}
                  {item.state === "installed" && (
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      Installed
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 line-clamp-2 max-w-[70ch] text-[13px] leading-[1.45] text-gray-500">
                    {item.description}
                  </p>
                )}
              </div>

              {/* The fingerprint IS the version. Eight characters is enough to compare
                  two by eye, and it is the same value the update check uses. */}
              <span className="hidden font-mono text-[11px] text-gray-400 sm:block">{item.fingerprint.slice(0, 8)}</span>

              <Action
                item={item}
                busy={busy === `${item.kind}/${item.name}`}
                onInstall={() => onInstall({ kind: item.kind, name: item.name })}
                onUninstall={() => onUninstall({ kind: item.kind, name: item.name })}
              />
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
