# Portfolio redesign v2 (Kernel) — design spec

Decided with Kevin in the grilling session of 2026-10-09. The approved visual reference is the board set in `.claude/boards/redesign/` (gitignored, local only). When this spec and a board disagree, this spec wins.

## Reference boards (approved)
- `home-full.html` — the full home page: loader, hero, every section, motion language, git-graph playhead, nav.
- `case-study.html` — the case-study page template (animated pipeline diagram).
- `transitions.html` — variant 3 (card expand) and variant 1 (terminal `cd`).
- `shared/spiral.js`, `shared/covers.js`, `shared/behaviors.js` — spiral, generated covers, pinned snap with wheel release, facing active card.

## Process
- Built on branch `redesign`. Old site stays live. Commits stay local. Nothing is pushed or deployed without Kevin's go. Claude never merges to `main`. At the end Claude delivers a readiness report and Kevin makes the call.
- Cloudflare Workers static assets config (`wrangler.jsonc`, `dist/`), domain, analytics and DNS stay unchanged.

## Stack
Astro (static output to `dist/`), vanilla Three.js, GSAP, Lenis. No React. English only, URLs ready for `/id/` later.

## Information architecture
- `/` one rich home page. No `/about`, no blog.
- `/projects/<slug>/` seven case studies: hybrid-rag, executive-data-assistant, material-property-prediction, taskflow-devsecops, 19mj-career-platform, realtime-lakehouse, onchain-todo-dapp (spiral order in that sequence).
- Home order: loader → hero → What drives me (ends on "Hasta El Final.") → projects spiral → experience → achievements → organizations → toolkit → education and certifications → contact → footer.
- Nav: `~/projects` `~/experience` `~/about` (→ What drives me) `~/contact` `cv`. Mobile: `menu` button, full-screen menu.
- Old anchors redirect: `#leadership` → `#organizations`, `#work` → `#projects`, others to the nearest new section.

## Visual system
- Kernel style: terminal / OS identity, monospace only (IBM Plex Mono), dark only.
- Palette (terminal green): bg `#090c0a`, surface `#0d110e`, text `#d4ecdc`, muted `#7fa28d`, accent `#4ade80`.
- No serif fonts, no purple/blue gradients, no gradient text, no glassmorphism, no brains/robots/node-and-line networks, no sparkles, no emojis. No photo or avatar of Kevin, ever.
- Gold/bronze tint only on the two medal cards.

## Loader
Full-screen generic AI training log (loss, val_loss, acc, f1, precision, recall, never Kevin's real scores), `ready.` morphs into the hero prompt `kevin@portfolio:~$ whoami`, one GSAP timeline ≈1.6 s, skippable, once per session, real hero HTML underneath.

## Hero
Name, role line "AI & Data Engineer", intro. Background = linked token logits + live attention matrix. Sentences, in order:
1. "Kevin builds AI and data systems."
2. "Efficient by design, effective in practice."
3. "Simple enough to trust, useful enough to matter."

## Sections
- What drives me: principles print in sequence, "Hasta El Final." scramble + glow + `exit 0`. Appears once on the page.
- Projects spiral: pinned snap, 7 projects + final card "Get in touch" → contact. Active card faces the camera. Wheel/keys/touch release at both ends. HTML grid of the same projects always present (SEO, reduced motion).
- Experience: horizontal git graph with scroll-driven `HEAD` playhead, institution logos in the detail card, vertical fallback below 720px.
- Achievements: exactly two, Kaggle Spring 2025 Regression Challenge 1st (RMSE 0.13689) and FIT Competition 3rd. No org logos, no links.
- Organizations: live site's full bullet lists + big count-up numbers. Never "pass rate".
- Toolkit: `ls -la ~/toolkit` with simple-icons glyphs.
- Education and certifications, contact (email, LinkedIn, GitHub, Kaggle, CV, "Indonesia").
- Bio line: "I build AI and data systems that work beyond the notebook."

## Motion
"Print / type / compile / resolve" language on every section, scroll-progress bar. Scrambles never change the element box. `prefers-reduced-motion` renders final states. No long tasks > 50 ms caused by animation.

## Case studies
Content from `docs/content/projects/*.md` (sourced, no TODOs). Page: header, metric callouts, problem, how it works, animated pipeline diagram generated from the `### Pipeline` list, key decisions, results, prev/next. No "Role" field. NDA projects show architecture, techniques and metrics only.

## Copy rules
Never semicolons in visible copy. Never invent facts. Location "Indonesia". School "Institut Teknologi Sepuluh Nopember (B.Comp.Sci)". Plain, short, general copy.

## SEO / GEO
Per-page title, description, canonical, JSON-LD (home: WebSite + ProfilePage + Person, projects: CreativeWork + BreadcrumbList), sitemap, robots, regenerated `llms.txt`, build-time 1200×630 OG image per page in Kernel style.

## Cutover gates (readiness report)
Lighthouse mobile performance ≥ 90 and accessibility, SEO, best practices = 100 on every page (local preview first, then the Cloudflare preview URL once Kevin allows a push). Real-device wheel/touch/keyboard checks. Kevin's page-by-page sign-off.
