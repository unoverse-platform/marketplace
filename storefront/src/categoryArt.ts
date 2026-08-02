/**
 * Category artwork — generated, never an asset.
 *
 * Each category gets a ground of blurred coloured light (the "mesh") with a motif
 * drawn crisply over it and film grain on top. Deriving it from the category NAME
 * means a category the server invents tomorrow still gets artwork, with no image
 * pipeline and nothing to commission. Unknown categories fall back to a motif and
 * palette chosen deterministically from the name, so they never render blank.
 *
 * Canvas-only: no CSS file (apps/canvas styles with Tailwind), no external assets.
 */

export type Motif =
  | "orbit" | "strata" | "funnel" | "wave" | "spectrum"
  | "cluster" | "sheets" | "mesh" | "rings" | "ripple" | "crew";

/** Five lights plus the deep ground they sit on. */
type Palette = readonly [string, string, string, string, string, string];

/** Canvas CAT_COLOR values drive the light; the sixth entry is the ground. */
const PALETTES: Record<string, Palette> = {
  indigo: ["#4338CA", "#6366F1", "#8B5CF6", "#38BDF8", "#C084FC", "#1E1B4B"],
  blue:   ["#1D4ED8", "#3B82F6", "#60A5FA", "#22D3EE", "#818CF8", "#0C1E4A"],
  rose:   ["#BE123C", "#F43F5E", "#FB7185", "#FB923C", "#F472B6", "#4C0519"],
  violet: ["#6D28D9", "#8B5CF6", "#A78BFA", "#C084FC", "#6366F1", "#2E1065"],
  pink:   ["#BE185D", "#EC4899", "#F472B6", "#FB923C", "#C084FC", "#500724"],
  purple: ["#7E22CE", "#A855F7", "#C084FC", "#F0ABFC", "#818CF8", "#3B0764"],
  amber:  ["#B45309", "#F59E0B", "#FBBF24", "#FDE68A", "#FB923C", "#451A03"],
  sky:    ["#0369A1", "#0EA5E9", "#38BDF8", "#7DD3FC", "#22D3EE", "#082F49"],
  cyan:   ["#0E7490", "#06B6D4", "#22D3EE", "#67E8F9", "#38BDF8", "#083344"],
  teal:   ["#0F766E", "#14B8A6", "#2DD4BF", "#5EEAD4", "#22D3EE", "#042F2E"],
  green:  ["#0E7A57", "#10B981", "#34D399", "#22D3EE", "#6EE7B7", "#04241B"],
  slate:  ["#334155", "#64748B", "#94A3B8", "#38BDF8", "#818CF8", "#0B1220"],
};

/**
 * Known categories get a motif that means something. This is the ONLY place the
 * category vocabulary is written down, and it is a lookup rather than a filter:
 * a category missing from here still renders, it just gets a derived look.
 */
const KNOWN: Record<string, { motif: Motif; palette: keyof typeof PALETTES; accent: string }> = {
  "AI":                  { motif: "orbit",    palette: "indigo", accent: "#6366f1" },
  "Storage & Data":      { motif: "strata",   palette: "blue",   accent: "#3b82f6" },
  "Go To Market":        { motif: "funnel",   palette: "rose",   accent: "#f43f5e" },
  "Voice":               { motif: "wave",     palette: "violet", accent: "#8b5cf6" },
  "Media & Design":      { motif: "spectrum", palette: "pink",   accent: "#ec4899" },
  "Knowledge & Vectors": { motif: "cluster",  palette: "purple", accent: "#a855f7" },
  "Documents":           { motif: "sheets",   palette: "amber",  accent: "#f59e0b" },
  "Web Scraping":        { motif: "mesh",     palette: "sky",    accent: "#0ea5e9" },
  "Search":              { motif: "rings",    palette: "cyan",   accent: "#06b6d4" },
  "Communication":       { motif: "ripple",   palette: "teal",   accent: "#14b8a6" },
  "Design System":       { motif: "spectrum", palette: "green",  accent: "#10b981" },
  "Triggers":            { motif: "ripple",   palette: "green",  accent: "#22c55e" },
  "Flow":                { motif: "funnel",   palette: "green",  accent: "#22c55e" },
  "Output":              { motif: "crew",     palette: "slate",  accent: "#eab308" },
  "Memory":              { motif: "cluster",  palette: "purple", accent: "#a855f7" },
  "Storage":             { motif: "strata",   palette: "blue",   accent: "#3b82f6" },
  "Ingest":              { motif: "mesh",     palette: "cyan",   accent: "#06b6d4" },
  // Marketplace tiers that are not node categories. They render on the same generative
  // art as everything else, because a hand-picked image beside procedural artwork is
  // exactly where a design language starts to fray.
  //   Skills        crew: figures with capabilities on spokes, which is what a skill IS
  //                 to an Agent. `cluster` was a starfield and already means "a pile of
  //                 data" here (Knowledge & Vectors, Memory). `crew` is used elsewhere
  //                 only by Output, which is NOT_BROWSABLE, so nothing duplicates.
  //   Prompt Blocks strata:  stacked, reusable layers composed into one prompt.
  "Skills":              { motif: "crew",     palette: "violet", accent: "#8b5cf6" },
  "Prompt Blocks":       { motif: "strata",   palette: "amber",  accent: "#f59e0b" },
};

const MOTIF_POOL: Motif[] = ["orbit", "strata", "funnel", "wave", "spectrum", "cluster", "sheets", "mesh", "rings", "ripple"];
const PALETTE_POOL = Object.keys(PALETTES) as (keyof typeof PALETTES)[];

/** Stable hash so an unknown category looks the same on every render and reload. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export function lookFor(category: string): { motif: Motif; palette: Palette; accent: string } {
  const known = KNOWN[category];
  if (known) return { motif: known.motif, palette: PALETTES[known.palette], accent: known.accent };
  const h = hash(category);
  const paletteKey = PALETTE_POOL[h % PALETTE_POOL.length];
  const palette = PALETTES[paletteKey];
  return { motif: MOTIF_POOL[(h >> 3) % MOTIF_POOL.length], palette, accent: palette[1] };
}

/** One noise tile, built once. Grain is what stops gradients reading as clip art. */
let grainTile: HTMLCanvasElement | null = null;
function grain(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const n = document.createElement("canvas");
  n.width = n.height = 140;
  const c = n.getContext("2d")!;
  const d = c.createImageData(140, 140);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 90 + Math.random() * 165;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 30;
  }
  c.putImageData(d, 0, 0);
  grainTile = n;
  return n;
}

/** Look up a palette by name, for artwork that is not tied to a category. */
export function paletteFor(name: string): Palette {
  return PALETTES[name] ?? PALETTES.indigo;
}

/**
 * Paint artwork into `canvas` at CSS size w×h. `seedKey` fixes the randomness, so
 * the same subject always draws the same picture across renders and reloads.
 */
export function paintArt(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  motif: Motif,
  palette: Palette,
  seedKey: string,
): void {
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const x = canvas.getContext("2d");
  if (!x) return;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Scales every motif to the panel, so one drawing serves a wide band and a tall column.
  const k = Math.min(w, h * 2.2) / 200;
  const rand = ((seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(hash(seedKey) % 2147483000 || 7);
  const W = (o: number) => `rgba(255,255,255,${o})`;
  const [c0, c1, c2, c3, c4, ground] = palette;

  // Ground: blurred fields of light, overlapping. Depth first, line work second.
  x.fillStyle = ground;
  x.fillRect(0, 0, w, h);
  x.filter = `blur(${Math.round(Math.min(w, h) * 0.26)}px)`;
  const lights = [c0, c1, c2, c3, c4];
  ([[0.18, 0.28, 0.62], [0.74, 0.18, 0.55], [0.52, 0.78, 0.6], [0.9, 0.62, 0.45], [0.06, 0.82, 0.5], [0.42, 0.38, 0.42]] as const)
    .forEach((b, i) => {
      x.fillStyle = lights[i % lights.length];
      x.beginPath();
      x.ellipse(w * b[0], h * b[1], w * b[2] * 0.55, h * b[2] * 0.85, rand() * 3, 0, 7);
      x.fill();
    });
  x.filter = "none";
  x.globalCompositeOperation = "screen";

  if (motif === "orbit") {
    for (let i = 0; i < 7; i++) {
      x.strokeStyle = W(0.38 - i * 0.035);
      x.lineWidth = 1.6 * k;
      x.beginPath();
      x.ellipse(w * 0.58, h * 0.5, (26 + i * 30) * k, (11 + i * 13) * k, -0.5 + i * 0.17, 0, 7);
      x.stroke();
    }
    x.fillStyle = W(1);
    x.beginPath(); x.arc(w * 0.58, h * 0.5, 8 * k, 0, 7); x.fill();
    x.fillStyle = W(0.55);
    x.beginPath(); x.arc(w * 0.58, h * 0.5, 20 * k, 0, 7); x.fill();
  } else if (motif === "wave") {
    const n = Math.max(6, Math.round(w / (11 * k)));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const amp = Math.abs(Math.sin(t * 9.2) * 0.55 + Math.sin(t * 3.1) * 0.45) * h * 0.42 + h * 0.06;
      x.globalAlpha = 0.3 + Math.abs(Math.sin(t * 4)) * 0.55;
      x.fillStyle = W(1);
      x.beginPath();
      x.roundRect(i * 11 * k + 3 * k, h * 0.5 - amp / 2, 5 * k, amp, 99);
      x.fill();
    }
    x.globalAlpha = 1;
  } else if (motif === "mesh") {
    const pts = Array.from({ length: 16 }, () => [rand() * w, rand() * h] as const);
    x.strokeStyle = W(0.3);
    x.lineWidth = 1.2 * k;
    pts.forEach((p, i) =>
      pts.slice(i + 1).forEach((q) => {
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) < w * 0.29) {
          x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); x.stroke();
        }
      }),
    );
    pts.forEach((p, i) => {
      x.fillStyle = W(i % 4 === 0 ? 1 : 0.62);
      x.beginPath(); x.arc(p[0], p[1], (i % 4 === 0 ? 5 : 2.8) * k, 0, 7); x.fill();
    });
  } else if (motif === "cluster") {
    for (let c = 0; c < 3; c++) {
      const cx = w * (0.26 + c * 0.27);
      const cy = h * (0.32 + [0.18, -0.02, 0.24][c]);
      x.fillStyle = W(0.1);
      x.beginPath(); x.arc(cx, cy, 46 * k, 0, 7); x.fill();
      for (let i = 0; i < 46; i++) {
        const r = Math.pow(rand(), 0.6) * 40 * k;
        const th = rand() * 7;
        x.globalAlpha = 0.3 + rand() * 0.7;
        x.fillStyle = W(1);
        x.beginPath(); x.arc(cx + Math.cos(th) * r, cy + Math.sin(th) * r * 0.82, 2 * k, 0, 7); x.fill();
      }
    }
    x.globalAlpha = 1;
  } else if (motif === "strata") {
    for (let i = 0; i < 5; i++) {
      const y = h * 0.26 + i * 21 * k;
      const ww = 78 * k;
      x.globalAlpha = 0.9 - i * 0.14;
      x.fillStyle = W(0.14);
      x.strokeStyle = W(0.5);
      x.lineWidth = 1.5 * k;
      x.beginPath();
      x.moveTo(w * 0.5, y - 20 * k);
      x.lineTo(w * 0.5 + ww, y);
      x.lineTo(w * 0.5, y + 20 * k);
      x.lineTo(w * 0.5 - ww, y);
      x.closePath(); x.fill(); x.stroke();
    }
    x.globalAlpha = 1;
  } else if (motif === "ripple") {
    for (let i = 1; i < 9; i++) {
      x.strokeStyle = W(0.42 - i * 0.04);
      x.lineWidth = 2.2 * k;
      x.beginPath(); x.arc(w * 0.26, h * 0.66, i * 24 * k, -1.35, 0.75); x.stroke();
    }
    x.fillStyle = W(1);
    x.beginPath(); x.arc(w * 0.26, h * 0.66, 6.5 * k, 0, 7); x.fill();
  } else if (motif === "funnel") {
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      const y = h * 0.12 + i * (h * 0.19);
      const inset = w * (0.08 + t * 0.21);
      x.globalAlpha = 0.95 - i * 0.13;
      x.fillStyle = W(0.16);
      x.strokeStyle = W(0.46);
      x.lineWidth = 1.5 * k;
      x.beginPath(); x.roundRect(inset, y, w - inset * 2, 13 * k, 99); x.fill(); x.stroke();
    }
    x.globalAlpha = 1;
  } else if (motif === "spectrum") {
    const cols = [W(1), c1, "#FDE68A", c0, W(1), c1];
    for (let i = 0; i < 6; i++) {
      const cx = w * (0.16 + i * 0.15);
      const cy = h * (0.44 + Math.sin(i * 1.4) * 0.3);
      const r = (44 - i * 3) * k;
      x.globalAlpha = 0.6;
      x.fillStyle = cols[i];
      x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
      if (i % 2 === 0) {
        x.globalAlpha = 0.4;
        x.strokeStyle = W(1);
        x.lineWidth = 1.4 * k;
        x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke();
      }
    }
    x.globalAlpha = 1;
  } else if (motif === "sheets") {
    for (let i = 2; i >= 0; i--) {
      x.globalAlpha = 0.42 + (2 - i) * 0.3;
      x.fillStyle = W(1);
      const px = w * 0.26 + i * 26 * k;
      const py = h * 0.14 + i * 9 * k;
      x.beginPath(); x.roundRect(px, py, 92 * k, 112 * k, 8 * k); x.fill();
      if (i === 0) {
        x.globalAlpha = 0.7;
        x.fillStyle = ground;
        for (let l = 0; l < 6; l++) {
          x.fillRect(px + 13 * k, py + 17 * k + l * 16 * k, (66 - (l === 5 ? 30 : 0)) * k, 4.5 * k);
        }
      }
    }
    x.globalAlpha = 1;
  } else if (motif === "rings") {
    for (let i = 1; i < 8; i++) {
      x.strokeStyle = W(0.44 - i * 0.045);
      x.lineWidth = 1.8 * k;
      x.beginPath(); x.arc(w * 0.46, h * 0.46, i * 19 * k, 0, 7); x.stroke();
    }
    x.fillStyle = W(1);
    x.beginPath(); x.arc(w * 0.46, h * 0.46, 7 * k, 0, 7); x.fill();
  } else if (motif === "crew") {
    ([[0.24, 0.62, 1.25], [0.53, 0.34, 0.85], [0.78, 0.66, 1.05]] as const).forEach(([ax, ay, s], ai) => {
      const cx = w * ax, cy = h * ay, r = 13 * k * s;
      const glow = x.createRadialGradient(cx, cy, 0, cx, cy, r * 6);
      glow.addColorStop(0, W(0.5));
      glow.addColorStop(1, W(0));
      x.fillStyle = glow;
      x.beginPath(); x.arc(cx, cy, r * 6, 0, 7); x.fill();
      const tools = 3 + (ai % 2);
      for (let t = 0; t < tools; t++) {
        const th = (t / tools) * 6.28 + ai * 1.1;
        const tx = cx + Math.cos(th) * r * 3.1;
        const ty = cy + Math.sin(th) * r * 3.1 * 0.78;
        x.strokeStyle = W(0.42);
        x.lineWidth = 1.3 * k;
        x.beginPath(); x.moveTo(cx, cy); x.lineTo(tx, ty); x.stroke();
        x.fillStyle = W(0.9);
        x.beginPath(); x.arc(tx, ty, r * 0.34, 0, 7); x.fill();
      }
      x.strokeStyle = W(0.62);
      x.lineWidth = 1.7 * k;
      x.beginPath(); x.arc(cx, cy, r * 1.75, 0, 7); x.stroke();
      x.fillStyle = W(1);
      x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    });
  }

  // Dust, then grain over everything.
  for (let i = 0; i < 12; i++) {
    x.globalAlpha = 0.25 + rand() * 0.6;
    x.fillStyle = W(1);
    x.beginPath(); x.arc(rand() * w, rand() * h, (1.2 + rand() * 2.2) * k, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
  x.globalCompositeOperation = "overlay";
  const pattern = x.createPattern(grain(), "repeat");
  if (pattern) {
    x.fillStyle = pattern;
    x.fillRect(0, 0, w, h);
  }
  x.globalCompositeOperation = "source-over";
}

/** Paint a category's own artwork: its motif, its palette, seeded by its name. */
export function paintCategory(canvas: HTMLCanvasElement, category: string, w: number, h: number): void {
  const { motif, palette } = lookFor(category);
  paintArt(canvas, w, h, motif, palette, category);
}
