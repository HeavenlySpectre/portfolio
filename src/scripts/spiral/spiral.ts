import * as THREE from 'three';
import { navigate } from 'astro:transitions/client';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { renderCovers, loadFonts, THEME as T, type CoverItem } from './covers';
import { pinnedSnap, type SpiralLike, type WheelOwner } from './pinned-snap';

declare global {
  interface Window { __spiralCount?: number; __spiral?: { pose(): Pose[]; destroy(): void } }
}

export interface Pose { i: number; active: boolean; yaw: number; pitch: number; roll: number; face: number; bend: number; rect: number[] }
interface Item extends CoverItem { href: string; cat: string; title: string; desc: string; tags: string[]; cta: string }
type View = 'spiral' | 'grid';
interface Card {
  holder: THREE.Group; pivot: THREE.Group; mesh: THREE.Mesh; geo: THREE.BoxGeometry; q0: THREE.Quaternion;
  mats: THREE.MeshBasicMaterial[]; tx: number; ty: number; lift: number; face: number; bend: number;
}
interface GL {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; composer: EffectComposer;
  cards: Card[]; meshes: THREE.Mesh[]; textures: THREE.CanvasTexture[]; pulses: { g: THREE.Group; off: number; sp: number }[];
  edgeBase: THREE.Color; backBase: THREE.Color; setBend(c: Card, b: number): void;
  D: number; shift: number; mobile: boolean; hover: number; last: number;
}

const R = 6, STEP = 0.75, DY = 0.9, CW = 3.4, CH = 2.125, TH = 0.14;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const col = (h: string, k = 1) => new THREE.Color(h).multiplyScalar(k);
const pad2 = (n: number) => String(n).padStart(2, '0');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const helix = (u: number, r: number, out: THREE.Vector3) => out.set(r * Math.sin(u * STEP), -u * DY, r * Math.cos(u * STEP));

const mounted = new WeakMap<HTMLElement, { destroy(): void }>();

/** Reads the projects from the server-rendered grid (one source of truth for text and links). */
function readItems(grid: HTMLElement): Item[] {
  return [...grid.querySelectorAll<HTMLAnchorElement>('.sp-card')].map((a) => {
    const t = (s: string) => a.querySelector(s)?.textContent?.trim() ?? '';
    const slug = a.dataset.slug ?? '';
    return {
      slug, href: a.getAttribute('href') ?? '#', cat: t('.sp-cat'), title: t('.sp-title'), fact: t('.sp-fact'), desc: t('.sp-desc'),
      tags: [...a.querySelectorAll('.sp-tags > span')].map((s) => s.textContent ?? ''), isContact: slug === 'contact', cta: slug === 'contact' ? 'Contact' : 'View project',
    };
  });
}

/**
 * Enhances the server-rendered grid inside `section` (#projects) with the pinned 3D spiral.
 * Throws when WebGL is unavailable, leaving the section untouched so the grid stays. destroy() restores the plain grid layout.
 */
export function mountSpiral(section: HTMLElement): { destroy(): void } {
  const prior = mounted.get(section);
  if (prior) return prior;
  const gridEl = section.querySelector<HTMLElement>('.sp-grid');
  if (!gridEl) throw new Error('spiral: grid markup missing');
  const items = readItems(gridEl);
  const N = items.length;
  const root = section;

  let goal = 0, pos = 0, active = -1, view: View = 'spiral', destroyed = false;
  let gl: GL | null = null, inView = true, inRegion = true, raf = 0;
  let stepHandler: ((d: number) => void) | null = null;
  let wheelGate: ((dy: number) => WheelOwner) | null = null;
  const hooks: { view: ((v: View) => void)[] } = { view: [] };
  const cleanups: (() => void)[] = [];
  const listen = <E extends EventTarget>(t: E, e: string, f: (ev: any) => void, opt?: AddEventListenerOptions) => { t.addEventListener(e, f, opt); cleanups.push(() => t.removeEventListener(e, f, opt)); };

  // ------------------------------------------------------------------ DOM (stage, info panel and controls join the grid)
  const dom = document.createElement('div');
  dom.style.display = 'contents';
  dom.innerHTML = `
    <div class="sp-stage" aria-hidden="true"></div>
    <div class="sp-info">${items.map((it, i) => `
      <article class="sp-item" data-i="${i}">
        <p class="sp-kicker"><span class="sp-num">${pad2(i + 1)}</span><span class="sp-cat">${esc(it.cat)}</span></p>
        <h3 class="sp-title">${esc(it.title)}</h3>
        <p class="sp-fact">${esc(it.fact)}</p>
        <p class="sp-desc">${esc(it.desc)}</p>
        <ul class="sp-tags">${it.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <a class="sp-cta" href="${esc(it.href)}" tabindex="-1">${it.cta} <span aria-hidden="true">→</span></a>
      </article>`).join('')}
    </div>
    <div class="sp-controls">
      <button class="sp-toggle" type="button" aria-pressed="false">Grid</button>
      <button class="sp-btn sp-prev" type="button" aria-label="Previous project">←</button>
      <span class="sp-count" aria-live="polite"><b>01</b><i> / ${pad2(N)}</i></span>
      <button class="sp-btn sp-next" type="button" aria-label="Next project">→</button>
    </div>`;
  gridEl.before(dom);
  const $ = <E extends HTMLElement>(s: string) => dom.querySelector<E>(s)!;
  const stage = $('.sp-stage'), infoEls = [...dom.querySelectorAll<HTMLElement>('.sp-item')];
  const prevB = $<HTMLButtonElement>('.sp-prev'), nextB = $<HTMLButtonElement>('.sp-next'), countB = $('.sp-count b'), toggleB = $<HTMLButtonElement>('.sp-toggle');
  const gridImgs = [...gridEl.querySelectorAll<HTMLAnchorElement>('.sp-card')].map((a) => {
    const img = document.createElement('img');
    img.alt = ''; img.width = 1024; img.height = 640; img.loading = 'lazy'; img.decoding = 'async';
    a.prepend(img);
    return img;
  });
  root.dataset.view = view;
  cleanups.push(() => { dom.remove(); gridImgs.forEach((i) => i.remove()); delete root.dataset.view; });

  // covers (drawn now with fallback fonts, redrawn when the real fonts are ready)
  const coverCanvases = renderCovers(items, T);
  const syncGridImgs = () => gridImgs.forEach((img, i) => { img.src = coverCanvases[i].toDataURL('image/jpeg', 0.84); });
  syncGridImgs();
  loadFonts(T).then(() => {
    if (destroyed) return;
    renderCovers(items, T, coverCanvases);
    syncGridImgs();
    gl?.textures.forEach((t) => (t.needsUpdate = true));
  });

  function setActive(i: number) {
    if (i === active) return;
    active = i;
    infoEls.forEach((el, k) => {
      const on = k === i;
      el.classList.toggle('is-active', on);
      el.querySelector<HTMLElement>('.sp-cta')!.tabIndex = on ? 0 : -1;
    });
    countB.textContent = pad2(i + 1);
    prevB.disabled = i === 0; nextB.disabled = i === N - 1;
  }
  function setGoal(x: number, free?: boolean) {
    goal = free ? x : clamp(x, 0, N - 1);
    setActive(clamp(Math.round(goal), 0, N - 1));
    kick();
  }
  const goIndex = (i: number) => setGoal(clamp(i, 0, N - 1));
  function step(delta: number) {
    if (stepHandler) return stepHandler(delta);
    goIndex(active + delta);
  }
  const paintToggle = () => { toggleB.textContent = view === 'grid' ? 'Spiral' : 'Grid'; toggleB.setAttribute('aria-pressed', String(view === 'grid')); };
  function setView(v: View) {
    if (v === view) return;
    view = v;
    root.dataset.view = v;
    paintToggle();
    if (v === 'spiral') ensureGL();
    hooks.view.forEach((f) => f(v));
    kick();
  }

  listen(prevB, 'click', () => step(-1));
  listen(nextB, 'click', () => step(1));
  listen(toggleB, 'click', () => setView(view === 'grid' ? 'spiral' : 'grid'));
  // keyboard users tabbing into the (visually hidden) list reveal the grid
  listen(gridEl, 'focusin', () => { if (view !== 'grid') setView('grid'); });

  // ------------------------------------------------------------------ visibility
  const io = new IntersectionObserver((es) => {
    const e = es[es.length - 1];
    inView = e.isIntersecting; inRegion = e.intersectionRatio > 0.5;
    kick();
  }, { threshold: [0, 0.5] });
  io.observe(root);
  cleanups.push(() => io.disconnect());
  listen(document, 'visibilitychange', () => kick());

  // ------------------------------------------------------------------ input
  let lastWheel = 0, lastStep = 0;
  listen(root, 'wheel', (e: WheelEvent) => {
    if (view !== 'spiral' || !inRegion) return;
    const dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    // The behavior says who owns this wheel event: 'free' = the page (never touch it), 'edge' = pinned at the first/last project and
    // pushing outwards (release to the page unless it is the inertia tail of the step that just happened), 'pinned' = capture and step.
    const own = wheelGate ? wheelGate(dy) : 'pinned';
    if (own === 'free') return;
    const now = performance.now(), gap = now - lastWheel; lastWheel = now;
    const recent = now - lastStep < 520 || (gap < 150 && now - lastStep < 1100); // throttle + inertia tail of the previous gesture
    if (own === 'edge' && !recent) return;
    e.preventDefault();
    if (Math.abs(dy) < 4 || recent) return;
    lastStep = now; step(dy > 0 ? 1 : -1);
  }, { passive: false });
  listen(window, 'keydown', (e: KeyboardEvent) => {
    if (view !== 'spiral' || !inRegion || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  let drag: { x: number; y: number; g: number; a: number; moved: boolean; lx: number; lt: number; vx: number } | null = null;
  const ptr = { x: 0, y: 0, in: false, type: 'mouse' };
  /* a touch tap fires pointerdown and pointerup without any pointermove, so every pointer event refreshes the position */
  const setPtr = (e: PointerEvent) => {
    const rect = stage.getBoundingClientRect();
    ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ptr.in = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom && e.target === stage.querySelector('canvas');
    ptr.type = e.pointerType;
    return rect;
  };
  listen(stage, 'pointerdown', (e: PointerEvent) => {
    if (view !== 'spiral' || (e.button || 0) > 0) return;
    setPtr(e);
    drag = { x: e.clientX, y: e.clientY, g: goal, a: active, moved: false, lx: e.clientX, lt: performance.now(), vx: 0 };
  });
  listen(window, 'pointermove', (e: PointerEvent) => {
    const rect = setPtr(e);
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { drag.moved = true; root.classList.add('is-dragging'); }
    if (drag.moved) {
      const now = performance.now(), dt = Math.max(1, now - drag.lt);
      drag.vx = drag.vx * 0.6 + ((e.clientX - drag.lx) / dt) * 0.4; drag.lx = e.clientX; drag.lt = now;
      if (!stepHandler) setGoal(clamp(drag.g - dx / (rect.width * 0.3), -0.25, N - 0.75), true);
    }
    kick();
  });
  const endDrag = (e: PointerEvent, cancel: boolean) => {
    if (!drag) return;
    const d = drag; drag = null; root.classList.remove('is-dragging');
    if (cancel) return;
    setPtr(e);
    const dx = e.clientX - d.x, w = stage.clientWidth;
    if (d.moved) {
      if (stepHandler) { if (Math.abs(dx) > 50) stepHandler(dx < 0 ? 1 : -1); return; }
      let t = Math.round(goal - (d.vx * 90) / (w * 0.3));
      if (t === d.a && Math.abs(dx) > w * 0.06) t += dx < 0 ? 1 : -1;
      goIndex(t);
    } else {
      const hit = pick();
      if (hit >= 0) {
        if (hit === active) { const h = items[hit].href; if (h[0] === '#') location.hash = h; else navigate(h, { info: { card: true } }); }
        else step(hit - active);
      }
    }
  };
  listen(window, 'pointerup', (e: PointerEvent) => endDrag(e, false));
  listen(window, 'pointercancel', (e: PointerEvent) => endDrag(e, true));
  listen(stage, 'pointerleave', () => { ptr.in = false; });

  // ------------------------------------------------------------------ WebGL
  const raycaster = new THREE.Raycaster();
  function pick() {
    if (!gl) return -1;
    raycaster.setFromCamera({ x: ptr.x, y: ptr.y } as THREE.Vector2, gl.camera);
    const hits = raycaster.intersectObjects(gl.meshes.filter((m) => m.parent!.parent!.visible));
    return hits.length ? hits[0].object.userData.i : -1;
  }
  function ensureGL() {
    if (gl || destroyed) return;
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(T.bg);
    stage.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(T.bg);
    scene.fog = new THREE.Fog(T.bg, 10, 30);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 90);

    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, rt);
    const passes = [new RenderPass(scene, camera), new UnrealBloomPass(new THREE.Vector2(256, 256), T.bloom, 0.4, 0.92), new OutputPass()];
    passes.forEach((p) => composer.addPass(p));

    // trail
    const trail = col(T.trail);
    const U0 = -2, U1 = N + 2.5;
    const mk = (r: number, dy: number, k: number, rad: number) => {
      const pts: THREE.Vector3[] = [];
      for (let u = U0; u <= U1; u += 0.06) { const p = new THREE.Vector3(); helix(u, r, p); p.y += dy; pts.push(p); }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 900, rad, 8, false);
      scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: trail.clone().multiplyScalar(k), toneMapped: false })));
    };
    mk(R - 0.55, 0, 1.8, 0.04);
    mk(R - 0.55, 0.35, 0.9, 0.012);
    mk(R - 0.55, -0.35, 0.9, 0.012);
    // pulses
    const pulseGeo = new THREE.SphereGeometry(0.1, 14, 14), haloGeo = new THREE.SphereGeometry(0.28, 14, 14);
    const pulses: GL['pulses'] = [];
    for (let k = 0; k < 14; k++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: trail.clone().multiplyScalar(T.pulseK), toneMapped: false })));
      g.add(new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: trail, transparent: true, opacity: 0.16, toneMapped: false, depthWrite: false })));
      scene.add(g); pulses.push({ g, off: k / 14, sp: 0.5 + (k % 3) * 0.12 });
    }
    // dust
    const dp: number[] = []; const rs = (() => { let s = 5; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    for (let k = 0; k < 600; k++) { const u = U0 + rs() * (U1 - U0), a = u * STEP + (rs() - 0.5) * 1.6, r = R + (rs() - 0.5) * 8; dp.push(r * Math.sin(a), -u * DY + (rs() - 0.5) * 5, r * Math.cos(a)); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
    scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: col(T.dim), size: 0.035, transparent: true, opacity: 0.55, sizeAttenuation: true })));

    // cards: every card owns a copy of the geometry so its bend can be relaxed to flat while it is the active (camera-facing) card
    const geo0 = new THREE.BoxGeometry(CW, CH, TH, 28, 1, 1);
    const pa0 = geo0.attributes.position.array as Float32Array;
    const bx = Float32Array.from(pa0.filter((_, k) => k % 3 === 0)), bz = Float32Array.from(pa0.filter((_, k) => k % 3 === 2));
    const sag = Float32Array.from(bx, (x) => R - Math.sqrt(R * R - x * x));
    const setBend = (c: Card, b: number) => {
      if (c.bend >= 0 && (b === c.bend || (Math.abs(b - c.bend) < 1e-3 && b > 0 && b < 1))) return; // tiny steps are skipped, but the endpoints (flat, full spiral curvature) are always reached exactly
      c.bend = b;
      const pa = c.geo.attributes.position;
      for (let k = 0; k < pa.count; k++) pa.setZ(k, bz[k] - b * sag[k]);
      pa.needsUpdate = true; c.geo.computeBoundingSphere(); c.geo.computeBoundingBox();
    };
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const textures = coverCanvases.map((cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, maxAniso); return t; });
    const edgeBase = col(T.edge, 0.55), backBase = col(T.card);
    const cards: Card[] = items.map((_, i) => {
      const front = new THREE.MeshBasicMaterial({ map: textures[i], transparent: true, toneMapped: false });
      const edge = new THREE.MeshBasicMaterial({ color: edgeBase.clone(), transparent: true, toneMapped: false });
      const back = new THREE.MeshBasicMaterial({ color: backBase.clone(), transparent: true, toneMapped: false });
      const cg = geo0.clone();
      const mesh = new THREE.Mesh(cg, [edge, edge, edge, edge, front, back]);
      mesh.userData.i = i;
      const pivot = new THREE.Group(); pivot.add(mesh);
      const holder = new THREE.Group(); holder.add(pivot);
      helix(i, R, holder.position); holder.rotation.y = i * STEP;
      scene.add(holder);
      const c: Card = { holder, pivot, mesh, geo: cg, q0: holder.quaternion.clone(), mats: [front, edge, back], tx: 0, ty: 0, lift: 0, face: 0, bend: -1 };
      setBend(c, 1);
      return c;
    });
    gl = { setBend, edgeBase, backBase, renderer, scene, camera, composer, cards, meshes: cards.map((c) => c.mesh), textures, pulses, D: 8, shift: 0.2, mobile: false, hover: -1, last: performance.now() };
    cleanups.push(() => {
      cancelAnimationFrame(raf); raf = 0;
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        ([] as THREE.Material[]).concat(m.material ?? []).forEach((x) => x.dispose());
      });
      geo0.dispose(); textures.forEach((t) => t.dispose());
      passes.forEach((p) => p.dispose?.()); composer.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      gl = null;
    });
    ro.observe(stage);
    resize();
  }

  function resize() {
    if (!gl) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    const { renderer, composer, camera } = gl;
    renderer.setSize(w, h); composer.setSize(w, h);
    camera.aspect = w / h;
    gl.mobile = w <= 760;
    const frac = gl.mobile ? 0.78 : 0.46;
    gl.D = clamp(CW / (frac * 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect), 5.5, 18);
    gl.shift = gl.mobile ? 0 : 0.2;
    camera.setViewOffset(w, h, -w * gl.shift, 0, w, h);
    const fog = gl.scene.fog as THREE.Fog;
    fog.near = gl.D + 1.5; fog.far = gl.D + 20;
    camera.updateProjectionMatrix();
    kick();
  }
  const ro = new ResizeObserver(() => resize());
  cleanups.push(() => ro.disconnect());

  const _t = new THREE.Vector3(), _p = new THREE.Vector3();
  function frame(now: number) {
    raf = 0;
    if (destroyed || !shouldRun()) return;
    const g = gl!;
    const dt = clamp((now - g.last) / 1000, 0, 0.05); g.last = now; // a stale rAF timestamp can precede last: a negative dt blows exp() up to NaN
    const time = now / 1000;
    pos += (goal - pos) * (1 - Math.exp(-dt * 5.2));
    if (Math.abs(goal - pos) < 1e-4) pos = goal;
    const { camera, cards, pulses, mobile } = g;
    const a = pos * STEP;
    _t.set(R * Math.sin(a), -pos * DY, R * Math.cos(a));
    const ca = a - (mobile ? 0.12 : 0.2);
    camera.position.set((R + g.D) * Math.sin(ca), _t.y + 0.55, (R + g.D) * Math.cos(ca));
    camera.lookAt(_t);

    // hover
    let hv = -1;
    if (ptr.in && ptr.type === 'mouse' && !drag) { hv = pick(); }
    if (hv !== g.hover) { g.hover = hv; stage.style.cursor = hv >= 0 ? 'pointer' : ''; }
    const hit = hv >= 0 && ptr.in ? raycaster.intersectObject(cards[hv].mesh)[0] : null;

    cards.forEach((c, i) => {
      const d = i - pos;
      const op = d < 0 ? clamp(1 + d * 1.15, 0, 1) : clamp(1 - Math.max(0, d - 2.4) * 0.55, 0, 1);
      const dim = 1 - clamp(Math.abs(d), 0, 1) * 0.62;
      c.holder.visible = op > 0.01;
      c.mats[0].opacity = c.mats[1].opacity = c.mats[2].opacity = op;
      c.mats[0].color.setScalar(dim);
      c.mats[1].color.copy(g.edgeBase).multiplyScalar(dim); c.mats[2].color.copy(g.backBase).multiplyScalar(dim);
      let tx = 0, ty = 0, lift = 0;
      /* hover tilt stays subtle (max 2 deg) and always eases back to facing */
      if (hit && i === hv && hit.uv) { tx = -(hit.uv.y - 0.5) * 0.068; ty = (hit.uv.x - 0.5) * 0.068; lift = 0.28; }
      const k = 1 - Math.exp(-dt * 9);
      c.tx += (tx - c.tx) * k; c.ty += (ty - c.ty) * k; c.lift += (lift - c.lift) * k;
      c.pivot.rotation.set(c.tx, c.ty, 0); c.pivot.position.z = c.lift;
      /* the active card turns to face the camera squarely (same orientation as the camera: normal at the camera, no yaw/roll error) and flattens; others return to the spiral */
      const ft = i === active ? 1 : 0;
      c.face += (ft - c.face) * (1 - Math.exp(-dt * 6.5));
      if (Math.abs(ft - c.face) < 1e-3) c.face = ft;
      const fe = c.face * c.face * (3 - 2 * c.face);
      if (c.face === 0 && c.bend === 1) { /* at rest in the spiral */ if (!c.holder.quaternion.equals(c.q0)) c.holder.quaternion.copy(c.q0); }
      else { c.holder.quaternion.copy(c.q0).slerp(camera.quaternion, fe); g.setBend(c, 1 - fe); }
    });
    // pulses travel along the trail
    const span = N + 4.5;
    pulses.forEach((p) => {
      const u = -2 + ((p.off * span + time * p.sp * 1.1) % span);
      helix(u, R - 0.55, _p); p.g.position.copy(_p);
      p.g.scale.setScalar(0.7 + 0.3 * Math.sin(time * 4 + p.off * 20));
    });
    g.composer.render();
    raf = requestAnimationFrame(frame);
  }
  /* verification hook: each card's orientation relative to the camera-facing pose (degrees), plus bend (1 = spiral curvature, 0 = flat) */
  const _qr = new THREE.Quaternion(), _e = new THREE.Euler();
  function pose(): Pose[] {
    if (!gl) return [];
    gl.camera.updateMatrixWorld();
    return gl.cards.map((c, i) => {
      c.mesh.updateWorldMatrix(true, false);
      _qr.copy(gl!.camera.quaternion).invert().multiply(c.mesh.getWorldQuaternion(new THREE.Quaternion()));
      _e.setFromQuaternion(_qr, 'YXZ');
      const d = (v: number) => +(v * 180 / Math.PI).toFixed(2);
      const sr = stage.getBoundingClientRect(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => {
        const v = c.mesh.localToWorld(new THREE.Vector3((a * CW) / 2, (b * CH) / 2, TH / 2)).project(gl!.camera);
        const px = sr.left + ((v.x + 1) / 2) * sr.width, py = sr.top + ((1 - v.y) / 2) * sr.height;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      });
      return { i, active: i === active, yaw: d(_e.y), pitch: d(_e.x), roll: d(_e.z), face: +c.face.toFixed(3), bend: +c.bend.toFixed(3), rect: [x0, y0, x1, y1].map(Math.round) };
    });
  }
  function shouldRun() { return !!gl && view === 'spiral' && inView && !document.hidden && !destroyed; }
  function kick() { if (!raf && shouldRun()) { gl!.last = performance.now(); raf = requestAnimationFrame(frame); } }

  // ------------------------------------------------------------------ init
  const sp: SpiralLike = {
    root, count: N,
    get index() { return active; }, get view() { return view; },
    setGoal, goIndex,
    on(_k, f) { hooks.view.push(f); },
    setStepHandler(f) { stepHandler = f; },
    setWheelGate(f) { wheelGate = f; },
  };
  let pin: ReturnType<typeof pinnedSnap> | null = null;
  const api = {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pin?.destroy();
      cleanups.splice(0).reverse().forEach((f) => f());
      root.classList.remove('is-dragging');
      document.documentElement.classList.remove('sp-on'); // drop the reserved pinned height: the grid is the layout again
      mounted.delete(section);
      window.__spiralCount = Math.max(0, (window.__spiralCount ?? 1) - 1);
      if (window.__spiral?.pose === pose) delete window.__spiral;
    },
  };
  try {
    setActive(0);
    paintToggle();
    ensureGL(); // throws without WebGL: the grid stays
    pin = pinnedSnap(sp);
  } catch (err) {
    destroyed = true;
    pin?.destroy();
    cleanups.splice(0).reverse().forEach((f) => f());
    throw err;
  }
  mounted.set(section, api);
  window.__spiralCount = (window.__spiralCount ?? 0) + 1;
  window.__spiral = { pose, destroy: api.destroy };
  return api;
}
