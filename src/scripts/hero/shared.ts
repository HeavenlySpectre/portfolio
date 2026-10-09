/* Shared canvas helpers and the terminal-green theme used by the hero canvas. */
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const FONT = '"IBM Plex Mono", ui-monospace, monospace';

const rgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const mix = (a: string, b: string, t: number) => {
  const x = rgb(a), y = rgb(b);
  return '#' + [0, 1, 2].map((i) => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0')).join('');
};

const BG = '#090c0a', FG = '#d4ecdc', DIM = '#7fa28d', ACCENT = '#4ade80';
export const TH = { bg: BG, fg: FG, dim: DIM, accent: ACCENT, line: mix(BG, DIM, 0.36), barGlow: 0.5, barBlur: 9 };
export const AMB = rgb(ACCENT).join(',');
export const hx = (h: string, a: number | string) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };

/** What the panels need to know about the canvas layout. */
export interface View { ctx: CanvasRenderingContext2D; mobile: boolean; S: { x: number; y: number; w: number; h: number } }
