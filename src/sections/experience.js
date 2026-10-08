import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, debounce, clamp, smoothstep } from '../lib.js';

/**
 * Experience: a canvas helix draws down the centre as you scroll (eased tip with a soft glowing head).
 * The coil radius decays continuously over the WHOLE length (H2) and becomes a straight line only just
 * above the final centred Assistant Lecturer card, whose top edge the line terminates into.
 * Cards 1-4 alternate left/right; each reveals when the tip reaches it.
 * <= 1023px: a gently wavering line on the left whose waver also fades gradually to straight at the
 * lecturer card.
 */
export function initExperience({ reduced }) {
  const host = $('#xp');
  const cv = $('#xpCanvas');
  const cards = $$('[data-xcard]', host);
  const end = $('[data-xend]', host); // Assistant Lecturer (line terminates into its top edge)
  const ctx = cv.getContext('2d');
  const FG = '242,242,240';
  const TOP = 14;
  const PX_PER_TURN = 150;

  let W = 0, H = 0, dpr = 1, R = 0, mobile = false;
  let ys = [], endY = 0, convLen = 1, totalY = 1;
  let reach = 0, visible = false;

  function measure() {
    mobile = window.matchMedia('(max-width: 1023px)').matches;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    R = mobile ? 0 : Math.min(host.clientWidth * 0.085, 100);
    W = mobile ? 40 : Math.round(R * 2 + 56);
    // all layout reads first (offsetTop/offsetHeight are unaffected by the cards' reveal transforms)...
    H = host.offsetHeight;
    ys = cards.map((c) => c.offsetTop + 30);
    endY = end.offsetTop;
    totalY = mobile ? ys[ys.length - 1] : endY;
    // coil radius decays over the whole length, reaching zero just above the lecturer card
    convLen = Math.max(1, totalY - TOP - 28);
    // ...then the canvas writes
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // If the section is already above the viewport (jump / re-measure), the line is complete.
    if (!reduced && host.getBoundingClientRect().bottom < 0) snapToEnd();
    if (reduced) { reach = totalY; draw(0); setCards(); }
  }

  function snapToEnd() {
    reach = totalY;
    setCards();
    draw(gsap.ticker.time);
  }

  function setCards() {
    cards.forEach((c, i) => {
      let on;
      if (!mobile && c === end) on = reach >= endY - 2;
      else on = reach > ys[i] - 4;
      c.classList.toggle('on', reduced || on);
    });
  }

  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    const len = Math.max(1, totalY - TOP);
    const N = 760;
    const spin = time * 0.35 + reach * 0.002;
    let prev = null, last = null;
    for (let i = 0; i <= N; i++) {
      const y = TOP + (i / N) * len;
      if (y > reach) break;
      const k = clamp((y - TOP) / convLen, 0, 1);
      const conv = 1 - smoothstep(0, 1, k);
      let X, Y, d;
      if (mobile) {
        X = 14 + Math.sin(y * 0.02 + spin * 2) * 5 * conv; Y = y; d = 1;
      } else {
        const rad = R * Math.pow(conv, 1.3);
        const a = ((y - TOP) / PX_PER_TURN) * Math.PI * 2 + spin;
        const z = Math.sin(a);
        X = W / 2 + rad * Math.cos(a); Y = y + z * rad * 0.18;
        d = rad < 1 ? 1 : (z + 1) / 2;
      }
      if (prev) {
        ctx.strokeStyle = `rgba(${FG},${0.12 + 0.7 * d})`;
        ctx.lineWidth = 0.8 + 1.8 * d;
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(X, Y); ctx.stroke();
      }
      prev = [X, Y]; last = prev;
    }
    if (last && !reduced) {
      ctx.fillStyle = `rgb(${FG})`;
      ctx.shadowColor = `rgba(${FG},.9)`; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(last[0], last[1], 3.5, 0, 6.29); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  measure();
  const remeasure = debounce(() => { measure(); }, 200);
  window.addEventListener('resize', remeasure);
  ScrollTrigger.addEventListener('refresh', remeasure);
  if (reduced) return;

  ScrollTrigger.create({
    trigger: host, start: 'top bottom', end: 'bottom top',
    onToggle: (s) => { visible = s.isActive; },
    // Scrolled (or jumped) past the section: the eased loop never ran to the end, so complete it now.
    onLeave: snapToEnd,
  });

  gsap.ticker.add((time) => {
    if (!visible) return;
    const rect = host.getBoundingClientRect();
    const target = clamp(window.innerHeight * 0.62 - rect.top, 0, totalY);
    // Once revealed, stay revealed (scrolling back up never un-draws the line or hides cards).
    if (target > reach) {
      reach += (target - reach) * 0.1;
      if (target - reach < 0.3) reach = target;
    }
    setCards();
    draw(time);
  });
}
