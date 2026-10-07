import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $ } from '../lib.js';

/** Calm centred name; particles settle into a curve while the name drifts up and fades (no pin). */
export function initHero({ reduced, particles }) {
  const center = $('#heroCenter');
  const foot = $('.hero__foot');

  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => particles.setActive(self.isActive),
  });

  if (!reduced) {
    const p = { v: 0 };
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 1 },
    })
      .to(p, { v: 1, duration: 1, onUpdate: () => particles.setProgress(p.v) }, 0)
      .to(center, { yPercent: -28, opacity: 0, duration: 0.7 }, 0.1)
      .to(foot, { opacity: 0, duration: 0.3 }, 0);
    gsap.set([center, foot], { opacity: 0, y: 24 });
  }

  return function intro(instant) {
    if (reduced || instant) return;
    gsap.to([center, foot], { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.15 });
  };
}
