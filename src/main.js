import 'lenis/dist/lenis.css';
import './styles/base.css';
import './styles/hero.css';
import './styles/sections.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import { $, reducedQuery, fontLoader } from './lib.js';
import { initScroll } from './scroll.js';
import { initCursor } from './cursor.js';
import { createParticles } from './particles.js';
import { runLoader } from './loader.js';
import { initClock } from './sections/clock.js';
import { initHero } from './sections/hero.js';
import { initDrives } from './sections/drives.js';
import { initWork } from './sections/work.js';
import { initExperience } from './sections/experience.js';
import { initReveal } from './sections/reveal.js';
import { initToolkit } from './sections/toolkit.js';
import { initContact } from './sections/contact.js';

gsap.registerPlugin(ScrollTrigger, SplitText);
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

  const prepare = async () => {
    // Runs while the loader still covers the page and fonts are loaded, so measurements are final.
    heroIntro = initHero({ reduced, particles });
    initDrives({ reduced });
    initWork({ reduced });
    initExperience({ reduced });
    initReveal({ reduced });
    initToolkit({ reduced });
    initContact({ reduced, scrollTo: scroll.scrollTo });
    ScrollTrigger.refresh();
  };

  runLoader({
    reduced,
    fonts: fontLoader(),
    prepare,
    reveal: (instant) => heroIntro(instant),
  }).then(() => {
    if (scroll.lenis) scroll.lenis.start();
    ScrollTrigger.refresh();
    window.__ready = true;
  });

  // Mark ready as soon as the app is wired so the no-JS fail-safe never triggers on slow font loads.
  window.__ready = true;

  window.addEventListener('load', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
