/**
 * Shared utilities for the Studio views ported from apps/unoverse/web/studio.
 * Kept deliberately close to the studio originals (src/persist.ts, src/registry.tsx)
 * so the two apps stay diffable while both exist; the one difference is transport —
 * studio calls its same-origin server directly, here requests ride fetchUnoverse
 * (the single API base; same-origin /unoverse-mcp proxy when apiUrl is empty).
 */
import { useCallback, useRef } from "react";

/**
 * Where each scrolling view was left. Module scope, not storage: the position only means
 * anything while the list behind it is the same list, which is this session.
 */
const scrollMemory = new Map<string, number>();

/**
 * Remember where a scrolling view was, and put it back when you return to it.
 *
 * The Studio views are a stack of full-screen returns rather than routes, so opening a
 * detail UNMOUNTS the list. Without this, Back dropped you at the top of a page you had
 * scrolled a long way down, which reads as losing your place rather than navigating.
 *
 * Returns a CALLBACK ref, not a plain one: a list and its detail page are branches of the
 * same component, so the container detaches and reattaches while the component stays
 * mounted. An effect would never re-run; a callback ref fires on exactly those moments.
 */
export function useScrollMemory<T extends HTMLElement>(key: string) {
  const teardown = useRef<(() => void) | null>(null);

  return useCallback(
    (el: T | null) => {
      teardown.current?.();
      teardown.current = null;
      if (!el) return;

      const want = scrollMemory.get(key) ?? 0;
      let settling = want > 0;
      let frame = 0;

      const onScroll = () => {
        // A scroll to somewhere other than the offset we asked for is the reader taking
        // over, so we stop trying to place them and start following them instead.
        if (settling && el.scrollTop !== want) settling = false;
        if (!settling) scrollMemory.set(key, el.scrollTop);
      };
      el.addEventListener("scroll", onScroll, { passive: true });

      // Restoring cannot happen in one go: the catalog arrives after the first paint, so
      // the page is too short to hold the old offset until its content lands.
      const deadline = performance.now() + 2000;
      const settle = () => {
        if (!settling) return;
        if (el.scrollHeight - el.clientHeight >= want) {
          el.scrollTop = want;
          settling = false;
          return;
        }
        // Give up eventually rather than spin on a page that will never be that tall
        // again (an item uninstalled, a filter narrowed).
        if (performance.now() > deadline) {
          settling = false;
          return;
        }
        frame = requestAnimationFrame(settle);
      };
      if (settling) frame = requestAnimationFrame(settle);

      teardown.current = () => {
        cancelAnimationFrame(frame);
        el.removeEventListener("scroll", onScroll);
        scrollMemory.set(key, el.scrollTop);
      };
    },
    [key],
  );
}

/**
 * Like useState, but the value survives a full page reload (localStorage-backed).
 * Persisting nav state keeps you on the item you were working on across reloads.
 */
