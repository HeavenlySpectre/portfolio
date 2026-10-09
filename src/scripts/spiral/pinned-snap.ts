import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export type WheelOwner = 'free' | 'edge' | 'pinned';

/** What the pin needs from the spiral. */
export interface SpiralLike {
  root: HTMLElement;
  count: number;
  readonly index: number;
  readonly view: 'spiral' | 'grid';
  setGoal(x: number, free?: boolean): void;
  goIndex(i: number): void;
  setWheelGate(f: (dy: number) => WheelOwner): void;
  setStepHandler(f: (delta: number) => void): void;
  on(k: 'view', f: (v: 'spiral' | 'grid') => void): void;
}

/** Pin the spiral section; each wheel notch / scroll step snaps to the next project, then the page releases. */
export function pinnedSnap(sp: SpiralLike, { perStep = 0.8 } = {}) {
  const root = sp.root, N = sp.count;
  let st: ScrollTrigger | null = null, tw: gsap.core.Tween | null = null;
  const dist = () => window.innerHeight * (N - 1) * perStep;
  const create = () => {
    if (st) return;
    st = ScrollTrigger.create({
      trigger: root, start: 'top top', end: () => '+=' + dist(), pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      snap: { snapTo: 1 / (N - 1), duration: { min: 0.25, max: 0.7 }, delay: 0.06, ease: 'power2.inOut' },
      onUpdate: (s) => sp.setGoal(s.progress * (N - 1)),
    });
  };
  const scrollToIndex = (i: number) => {
    if (!st) return sp.goIndex(i);
    const o = { y: window.scrollY };
    const y = st.start + ((st.end - st.start) * clamp(i, 0, N - 1)) / (N - 1);
    if (Math.abs(y - window.scrollY) < 2) return; // already on this project: a no-op tween would keep the wheel gate on 'pinned' for its whole duration and trap a slow wheel at the edge
    tw = gsap.to(o, { y, duration: 0.9, ease: 'power3.inOut', overwrite: true, onUpdate: () => window.scrollTo(0, o.y) });
  };
  // Wheel ownership (see spiral.ts): outside the pinned range the page owns the wheel, at the first/last project an outward push is released to the page.
  sp.setWheelGate((dy) => {
    if (!st) return 'free';
    const y = window.scrollY, eps = 3;
    if (y < st.start - eps || y > st.end + eps) return 'free';
    if (tw && tw.isActive()) return 'pinned';
    if (dy > 0 && y >= st.end - eps) return 'edge';
    if (dy < 0 && y <= st.start + eps) return 'edge';
    return 'pinned';
  });
  sp.setStepHandler((d) => scrollToIndex(clamp(sp.index + d, 0, N - 1)));
  sp.on('view', (v) => {
    if (v === 'grid') {
      st?.kill(true); st = null;
      requestAnimationFrame(() => window.scrollTo(0, root.getBoundingClientRect().top + window.scrollY));
    } else {
      create(); ScrollTrigger.refresh();
      window.scrollTo(0, st!.start + ((st!.end - st!.start) * sp.index) / (N - 1));
    }
  });
  if (sp.view === 'spiral') { create(); ScrollTrigger.refresh(); }
  return {
    get trigger() { return st; },
    destroy() { tw?.kill(); tw = null; st?.kill(true); st = null; },
  };
}
