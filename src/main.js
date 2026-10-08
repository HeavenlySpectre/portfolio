import 'lenis/dist/lenis.css';
import './styles/base.css';
import './styles/hero.css';
import './styles/sections.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { $, reducedQuery, fontLoader, idle } from './lib.js';
import { initScroll } from './scroll.js';
import { initCursor } from './cursor.js';
import { createParticles } from './particles.js';
import { runLoader } from './loader.js';
import { initClock } from './sections/clock.js';
import { initHero } from './sections/hero.js';
import { initDrives } from './sections/drives.js';
import { workSteps } from './sections/work.js';
import { initExperience } from './sections/experience.js';
import { initReveal } from './sections/reveal.js';
import { initToolkit } from './sections/toolkit.js';
import { initContact } from './sections/contact.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

// Reduced motion comes only from the user's prefers-reduced-motion setting.
const reduced = reducedQuery.matches;
const root = document.documentElement;
root.classList.toggle('is-reduced', reduced);
// A change of motion preference is rare; a reload is the simplest way to switch paths cleanly.
reducedQuery.addEventListener('change', () => window.location.reload());

function boot() {
  window.history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const scroll = initScroll({ reduced });
  initCursor({ reduced });
  initClock();
  const particles = createParticles($('#heroCanvas'), { reduced });

  let heroIntro = () => {};

  // Section set-up is split into small idle-time tasks that start immediately, so it runs while the
  // loader plays (no single long task) and is finished by the time the loader completes.
  const steps = [
    () => { heroIntro = initHero({ reduced, particles }); },
    () => initDrives({ reduced }),
    () => initToolkit({ reduced }),
    ...workSteps({ reduced }),
    () => initExperience({ reduced }),
    () => initReveal({ reduced }),
    () => initContact({ reduced, scrollTo: scroll.scrollTo }),
  ];
  const prepared = (async () => {
    for (const step of steps) await idle(step);
  })();

  // Called by the loader once fonts are loaded: wait for the set-up, then measure once.
  const prepare = async () => {
    await prepared;
    ScrollTrigger.refresh();
  };

  runLoader({
    reduced,
    fonts: fontLoader(),
    prepare,
    reveal: (instant) => heroIntro(instant),
  }).then(() => {
    if (scroll.lenis) scroll.lenis.start();
    window.__ready = true;
  });

  // Mark ready as soon as the app is wired so the no-JS fail-safe never triggers on slow font loads.
  window.__ready = true;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
