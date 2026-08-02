/**
 * The storefront entry.
 *
 * Both browse surfaces live here now: the catalogue and the recipe library. They are the
 * marketplace's own experience and deploy with it (MARKETPLACE.md §4). What a universe
 * HOLDS stays in the platform, on its Installed tab, because that is the universe's own
 * answer about its own database and no marketplace has a view onto it.
 *
 * The tabs are the storefront's, not the host's. The host frames this page and knows
 * nothing about what is inside it, which is the whole point of the separation.
 */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { DiscoverView } from "./DiscoverView";
import { AgentsView } from "./AgentsView";
import "./index.css";

type Tab = "catalogue" | "agents";

function Storefront() {
  const [tab, setTab] = useState<Tab>("catalogue");

  return (
    <div className="flex h-screen flex-col bg-[#FAFAFC]">
      <nav className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-white px-6">
        {(
          [
            ["catalogue", "Marketplace"],
            ["agents", "Agents"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`border-b-2 px-3 py-3 text-sm font-medium transition ${
              tab === key ? "border-emerald-500 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "catalogue" ? <DiscoverView /> : <AgentsView />}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Storefront />
  </StrictMode>,
);
