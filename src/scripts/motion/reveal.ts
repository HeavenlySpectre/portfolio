/* revealSection(section): the print / type / resolve language, driven by data attributes.
   Later sections only mark up their elements, they never write animation code.

   Contract (attributes sit on elements inside the section):
     data-fx="type"      text types in with a caret. The first one in the section is the heading
                         command: every other effect waits until it has finished typing.
     data-fx="scramble"  text resolves through a short scramble (same width, same line breaks).
     data-fx="count"     the element text is a number such as 800+ or 99.70% and counts up from 0,
                         keeping prefix, suffix and decimals.
     data-fx="print"     the element appears in a few hard steps, like a terminal printing a line.
   Optional: data-fx-delay="0.2" adds seconds of delay to that element.
   Without JavaScript or with prefers-reduced-motion nothing is touched, so the final state is the HTML. */
import { gsap } from 'gsap';
import { countUp, fullText, prefersReducedMotion, scramble, txPrep, typeText } from './fx';

const PRINT = { duration: 0.22, ease: 'steps(3)' };
const armed = new WeakSet<HTMLElement>();
const fxEls = (s: HTMLElement) => [...s.querySelectorAll<HTMLElement>('[data-fx]')];
const delayOf = (el: HTMLElement) => parseFloat(el.dataset.fxDelay ?? '0') || 0;
const typeDur = (el: HTMLElement) => Math.min(0.62, Math.max(0.24, fullText(el).length * 0.03));

/** Hides the section's animated elements so they do not flash before they play. */
export function armSection(section: HTMLElement): void {
  if (prefersReducedMotion() || armed.has(section)) return;
  armed.add(section);
  for (const el of fxEls(section)) {
    const kind = el.dataset.fx;
    if (kind === 'print') gsap.set(el, { opacity: 0 });
    else if (kind === 'type') txPrep(el, 'type');
    else if (kind === 'scramble') txPrep(el, 'scr');
    else if (kind === 'count') { el.dataset.final = el.textContent ?? ''; el.style.visibility = 'hidden'; }
  }
}

export function revealSection(section: HTMLElement): void {
  if (prefersReducedMotion()) return;
  const els = fxEls(section);
  if (!els.length) return;
  armSection(section);
  const tl = gsap.timeline();
  let gate = 0;
  let headDone = false;
  let step = 0;
  for (const el of els) {
    const kind = el.dataset.fx;
    const at = delayOf(el);
    if (kind === 'type') {
      const dur = typeDur(el);
      if (!headDone) { headDone = true; tl.add(() => { typeText(el, { duration: dur }); }, at); gate = at + dur; }
      else tl.add(() => { typeText(el, { duration: dur }); }, gate + at);
    } else if (kind === 'scramble') {
      tl.add(() => { scramble(el, { duration: 0.6 }); }, gate + at + step++ * 0.05);
    } else if (kind === 'count') {
      tl.add(() => { el.style.visibility = ''; countUp(el); }, gate + at + step++ * 0.05);
    } else if (kind === 'print') {
      tl.to(el, { opacity: 1, ...PRINT, clearProps: 'opacity' }, gate + at + step++ * 0.07);
    }
  }
}

/** Arms every section that has data-fx elements and plays each one once, when it scrolls into view. */
export function initReveals(root: ParentNode = document): { destroy(): void } {
  const none = { destroy() { /* nothing armed */ } };
  if (prefersReducedMotion()) return none;
  const secs = [...root.querySelectorAll<HTMLElement>('section')].filter((s) => s.querySelector('[data-fx]'));
  if (!secs.length) return none;
  // every timeline the reveals create is recorded in one context, so leaving the page can stop them all
  const ctx = gsap.context(() => {});
  secs.forEach((s) => ctx.add(() => armSection(s)));
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      ctx.add(() => revealSection(e.target as HTMLElement));
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  secs.forEach((s) => io.observe(s));
  return { destroy() { io.disconnect(); ctx.kill(); } };
}
