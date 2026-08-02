/** Scroll memory, lifted so the recovered views keep their back-navigation behaviour. */
import { useEffect, useRef } from "react";
const positions = new Map<string, number>();
export function useScrollMemory<T extends HTMLElement>(key: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = positions.get(key) ?? 0;
    const onScroll = () => positions.set(key, el.scrollTop);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [key]);
  return ref;
}
