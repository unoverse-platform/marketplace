/**
 * The storefront entry. Mounts the SAME Discover page the platform used to compile in,
 * so the experience did not change when its owner did (MARKETPLACE.md §4).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DiscoverView } from "./DiscoverView";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="flex h-screen flex-col">
      <DiscoverView />
    </div>
  </StrictMode>,
);
