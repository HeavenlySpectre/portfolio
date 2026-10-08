import { gsap } from 'gsap';
import { $, $$ } from '../lib.js';
import { buildSpecimen } from './specimens.js';

/**
 * Selected Work: rows fade/slide in as they enter and fade/scale out as they leave (scrubbed),
 * and each SVG specimen draws itself in.
 */
export function workSteps({ reduced }) {
  return $$('[data-project]').map((project) => () => {
    const inner = $('.project__in', project);
    const host = $('[data-specimen]', project);
    const svg = host ? buildSpecimen(host) : null; // host element holding both variants

    if (reduced) return;

    gsap.fromTo(inner, { opacity: 0, y: 90, scale: 0.96 }, {
      opacity: 1, y: 0, scale: 1, ease: 'none', transformOrigin: '50% 100%',
      scrollTrigger: { trigger: project, start: 'top 96%', end: 'top 58%', scrub: 1 },
    });
    gsap.fromTo(project, { opacity: 1, scale: 1 }, {
      opacity: 0.35, scale: 0.97, transformOrigin: '50% 80%', ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: project, start: 'bottom 38%', end: 'bottom -5%', scrub: 1 },
    });

    if (svg) {
      const draws = $$('.draw', svg);
      draws.forEach((p) => {
        const len = Math.ceil(p.getTotalLength ? p.getTotalLength() : 600) + 2;
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
      });
      const fades = $$('.fade', svg);
      gsap.set(fades, { opacity: 0 });
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: { trigger: project, start: 'top 72%', toggleActions: 'play none none none' },
      });
      tl.to(draws, { strokeDashoffset: 0, duration: 1.3, stagger: { each: 0.07 } }, 0)
        .to(fades, { opacity: 1, duration: 0.9, stagger: { each: 0.5 / Math.max(1, fades.length) } }, 0.3);
    }
  });
}
