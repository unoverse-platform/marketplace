/**
 * Marketplace — one node.
 *
 * READ ONLY, deliberately. Running and testing a node is no longer a Canvas
 * concern: that belongs to the Studio developer tool. So this page answers "what is
 * this thing, what does it need, and what does it give me back", and stops there.
 * There is no config form, no Run, no output pane.
 *
 * Everything shown comes from the node's own definition in `GET /nodes`.
 */
import { useEffect, useRef, useState } from "react";
import { packageDisplayName, type CatalogNode } from "./catalog";

function Logo({ src, className }: { src: string; className?: string }) {
  const [dead, setDead] = useState(false);
  if (dead) return null;
  return <img src={src} alt="" className={className} onError={() => setDead(true)} />;
}

/** Long settings lists are hidden behind a disclosure rather than dumped whole. */
const CONFIG_PREVIEW = 6;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="pt-11">
      <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-gray-900">{title}</h2>
      {hint && <p className="mt-1 text-[13px] text-gray-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Node credentials are `{name, displayName, type}` or a bare string. */
function credentialLabel(c: NonNullable<CatalogNode["credentials"]>[number]): { label: string; type: string } {
  if (typeof c === "string") return { label: c, type: c };
  return { label: c.displayName ?? c.name ?? c.type ?? "", type: c.type ?? c.name ?? "" };
}

export function NodeDetailView({
  node,
  categoryName,
  onBack,
}: {
  node: CatalogNode;
  categoryName: string;
  onBack: () => void;
}) {
  const top = useRef<HTMLDivElement>(null);
  const [showAllConfig, setShowAllConfig] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    top.current?.scrollTo({ top: 0 });
  }, [node.type]);

  const required = new Set(node.configSchema?.required ?? []);
  // Required first, author's order preserved within each group. Otherwise the one
  // field you MUST set can sit last, below twenty optional ones, or be hidden
  // entirely behind the "show all" cut.
  const config = Object.entries(node.configSchema?.properties ?? {}).sort(
    (a, b) => Number(required.has(b[0])) - Number(required.has(a[0])),
  );
  const credentials = (node.credentials ?? []).map(credentialLabel).filter((c) => c.type);

  return (
    <div ref={top} className="min-h-0 flex-1 overflow-auto bg-[#FAFAFC]">
      <div className="mx-auto max-w-[900px] px-8 pb-24">
        <button
          onClick={onBack}
          className="mt-8 flex items-center gap-2 text-[13.5px] font-semibold text-gray-500 transition hover:text-gray-900"
        >
          <span aria-hidden>&lsaquo;</span> {categoryName}
        </button>

        <header className="flex items-start gap-5 pt-7">
          {node.logoUrl && (
            <span className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-[18px] border border-gray-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(16,19,25,0.05)]">
              <Logo src={node.logoUrl} className="h-full w-full object-contain" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-[36px] font-semibold leading-[1.05] tracking-[-0.04em] text-gray-900">{node.name}</h1>
            {node.description && <p className="mt-3 text-[16px] leading-[1.45] text-gray-600">{node.description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[11.5px] text-gray-400">
              <span>{node.type}</span>
              {node.package && (
                <>
                  <span aria-hidden>·</span>
                  <span>{node.package}</span>
                </>
              )}
              {node.executionMode === "generator" && (
                <>
                  <span aria-hidden>·</span>
                  <span className="uppercase tracking-wide">streams</span>
                </>
              )}
            </div>
          </div>
        </header>

        {node.whenToUse && (
          <Section title="When to use it" hint="This is what an agent reads when choosing a node.">
            <p className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-[14px] leading-[1.55] text-gray-700">
              {node.whenToUse}
            </p>
          </Section>
        )}

        {credentials.length > 0 && (
          <Section title="Before it works" hint="Connect these once; every node from this package shares them.">
            <div className="flex flex-col gap-2">
              {credentials.map((c) => (
                <div key={c.type} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  <span className="text-[14px] font-medium text-gray-900">{c.label}</span>
                  <span className="ml-auto font-mono text-[11.5px] text-gray-400">{c.type}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {(node.inputs?.length || node.outputs?.length) && (
          <Section title="What goes in and out">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: "Takes", ports: node.inputs ?? [] },
                { label: "Gives back", ports: node.outputs ?? [] },
              ].map(({ label, ports }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-gray-400">{label}</div>
                  {ports.length === 0 ? (
                    <p className="mt-2 text-[13px] text-gray-400">Nothing</p>
                  ) : (
                    <ul className="mt-2.5 flex flex-col gap-2">
                      {ports.map((p) => (
                        <li key={p.name}>
                          <span className="font-mono text-[12.5px] text-gray-900">{p.name}</span>
                          {p.type && <span className="ml-2 font-mono text-[11px] text-gray-400">{p.type}</span>}
                          {p.description && <p className="mt-0.5 text-[12.5px] leading-[1.4] text-gray-500">{p.description}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {config.length > 0 && (
          <Section title="What you can set" hint="Configured per node, on the canvas.">
            {/* A fixed name column keeps every row on the same grid, so the settings
                read as a table rather than ragged prose. Descriptions are author
                notes and can run long, so they clamp to two lines until asked. */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {(showAllConfig ? config : config.slice(0, CONFIG_PREVIEW)).map(([key, field]) => {
                const text = field?.description ?? field?.title;
                const open = expanded.has(key);
                return (
                  <div key={key} className="grid grid-cols-1 gap-x-5 gap-y-1 border-b border-gray-100 px-5 py-3.5 last:border-b-0 md:grid-cols-[210px_1fr]">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[12.5px] text-gray-900">{key}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        {field?.type && <span className="font-mono text-[11px] text-gray-400">{field.type}</span>}
                        {required.has(key) && (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-600">required</span>
                        )}
                      </div>
                    </div>
                    {text && (
                      <div className="min-w-0">
                        <p className={`text-[12.5px] leading-[1.5] text-gray-500 ${open ? "" : "line-clamp-2"}`}>{text}</p>
                        {text.length > 150 && (
                          <button
                            onClick={() =>
                              setExpanded((prev) => {
                                const next = new Set(prev);
                                next.has(key) ? next.delete(key) : next.add(key);
                                return next;
                              })
                            }
                            className="mt-1 text-[11.5px] font-semibold text-gray-400 transition hover:text-gray-700"
                          >
                            {open ? "Less" : "More"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {config.length > CONFIG_PREVIEW && (
              <button
                onClick={() => setShowAllConfig((v) => !v)}
                className="mt-3 text-[13px] font-semibold text-gray-500 transition hover:text-gray-900"
              >
                {showAllConfig ? "Show fewer settings" : `Show all ${config.length} settings`}
              </button>
            )}
          </Section>
        )}

        <p className="mt-12 text-[12.5px] leading-[1.5] text-gray-400">
          Testing and running nodes lives in the Studio developer tool.
          {node.package ? ` Once ${packageDisplayName(node.package)} is added, this node appears on the Canvas palette.` : ""}
        </p>
      </div>
    </div>
  );
}
