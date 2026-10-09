# Portfolio Redesign v2 (Kernel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild kevinanugerah.dev as a static Astro site that reproduces the approved Kernel boards (home page + 7 case studies) with full SEO/GEO and Lighthouse mobile perf ≥ 90, a11y/SEO/BP 100.

**Architecture:** Astro static output to `dist/` (Cloudflare config unchanged). All content is server-rendered HTML; Three.js, GSAP and Lenis enhance it as lazily loaded client scripts. The approved boards in `.claude/boards/redesign/` are the visual and behavioural reference: port their code into modules, do not redesign.

**Tech Stack:** Astro 5, TypeScript, three, gsap, lenis, @fontsource/ibm-plex-mono, simple-icons, @astrojs/sitemap, satori + @resvg/resvg-js (OG images), Vitest (unit), Playwright (e2e), @lhci/cli (Lighthouse gates).

**Spec:** `docs/superpowers/specs/2026-10-09-portfolio-redesign-v2.md`

## Global Constraints

- Branch `redesign` only. Commit locally after each task. Never push, never deploy, never merge to `main`.
- Do not modify `wrangler.jsonc`. Build output must be `dist/`. Keep `public/_headers`, `public/robots.txt` (update content only), favicons, `public/media/**`.
- Palette tokens: `--bg #090c0a`, `--surface #0d110e`, `--text #d4ecdc`, `--muted #7fa28d`, `--accent #4ade80`. Font: IBM Plex Mono only, self-hosted via @fontsource (no Google Fonts request).
- No CDN script loads in production. three/gsap/lenis come from npm and are bundled.
- Visible copy: no semicolons, no "pass rate", location "Indonesia", school "Institut Teknologi Sepuluh Nopember (B.Comp.Sci)", bio "I build AI and data systems that work beyond the notebook.", no photo or avatar, no serif fonts, no gradients/glassmorphism/emojis.
- Facts come only from `docs/content/*.md` and `docs/content/projects/*.md`. Never invent copy beyond the boards' approved text.
- `prefers-reduced-motion: reduce` → every animated element renders its final state immediately, spiral shows its HTML grid.
- Content must be fully readable with JavaScript disabled.

## Review Focus

1. Fast trackpad inertia at the spiral's last card and the git graph's end → page keeps scrolling, never traps the wheel. Test in Task 5 and Task 6.
2. Back navigation from a case study to `/` → spiral re-initialises once (one WebGL canvas, no duplicate listeners) and scroll position is restored. Test in Task 8.
3. Viewport 320px wide and 2560px wide → no horizontal overflow, hero text never covered by the attention matrix. Test in Task 6 (`layout.spec.ts`).
4. JavaScript disabled → loader never shows, all sections and case-study content are visible. Test in Task 4.
5. Slow device (4× CPU throttle) → loader still exits within its 8 s safety timeout and no long task > 50 ms during scrolling sections below the hero. Checked in Task 10 via Lighthouse + a Playwright long-task probe.

---

### Task 1: Astro scaffold, tokens, test harness, copy lint

**Files:**
- Delete: `index.html`, `src/**` (old Vite app), `vite.config.*` if present
- Create: `astro.config.mjs`, `tsconfig.json`, `src/styles/tokens.css`, `src/styles/base.css`, `src/layouts/Base.astro`, `src/pages/index.astro` (placeholder sections with final ids), `vitest.config.ts`, `playwright.config.ts`, `tests/e2e/copy-lint.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `Base.astro` props `{ title: string; description: string; canonical: string; ogImage: string; jsonLd: object[] }`. Section ids used everywhere: `top, drives, projects, experience, achievements, organizations, toolkit, education, contact`.
- Produces scripts: `npm run build` (astro build → dist), `npm run preview` (astro preview on 4321), `npm test` (vitest run), `npm run e2e` (playwright against preview), `npm run deploy` stays `npm run build && wrangler deploy`.

- [ ] **Step 1:** Install deps: `astro three gsap lenis @fontsource/ibm-plex-mono simple-icons @astrojs/sitemap satori @resvg/resvg-js` and dev `vitest @playwright/test @lhci/cli typescript`. `astro.config.mjs`: `site: 'https://kevinanugerah.dev'`, `output: 'static'`, `trailingSlash: 'always'`, `build.format: 'directory'`, sitemap integration.
- [ ] **Step 2: Write the failing copy-lint e2e test** `tests/e2e/copy-lint.spec.ts`: for every URL in `['/', ...7 project URLs]` (project URLs may 404 until Task 7, mark them `test.fixme` until then), assert `document.body.innerText` contains no `;`, no `pass rate`, no `Surabaya`, no `TODO`, no `Lorem`.
- [ ] **Step 3:** Run `npm run build && npm run e2e -- copy-lint` → expect FAIL (no build yet / placeholder missing).
- [ ] **Step 4:** Implement tokens, base CSS (IBM Plex Mono via @fontsource weights 400/500/700, `font-display: swap`, preload 400), `Base.astro` (meta, canonical, OG, JSON-LD slot, theme-color `#090c0a`), placeholder `index.astro` with the 9 section ids.
- [ ] **Step 5:** Run build + e2e → PASS for `/`. Commit `feat: astro scaffold with kernel tokens and copy lint`.

### Task 2: Content layer

**Files:**
- Create: `src/content.config.ts`, `src/lib/pipeline.ts`, `src/data/experience.ts`, `src/data/organizations.ts`, `src/data/achievements.ts`, `src/data/toolkit.ts`, `src/data/education.ts`, `src/data/contact.ts`, `tests/unit/pipeline.test.ts`, `tests/unit/content.test.ts`

**Interfaces:**
- Produces collection `projects` loading `docs/content/projects/*.md` with frontmatter schema `{ title, slug, order:number, category, year:string, visibility, summary, metrics:{value:string,label:string}[], stack:string[], links:{label:string,url:string}[] (accept strings too and normalise), contribution?:string, seo_description }`.
- Produces `parsePipeline(markdown: string): { nodes: {id:string; label:string; note:string}[]; edges: {from:string; to:string}[] }` reading the `### Pipeline` list (`- id | label | note` and `- a -> b`), stripping `<!-- src -->` comments.
- Produces typed data arrays copied verbatim from `home-full.html` (experience roles with start/end months, lanes, logos `media/logos/*`, bullets; organizations with stats + live-site bullets; achievements ×2; toolkit groups with simple-icons slugs; education/certifications from `docs/content/*.md`).

- [ ] **Step 1: Write failing tests.** `pipeline.test.ts`: parsing `hybrid-rag.md` yields 10 nodes, an edge `chunk -> embed` and `chunk -> bm25`, every edge endpoint exists in nodes, no label contains `<!--`. `content.test.ts`: all 7 project files parse against the schema, `order` values are exactly 1..7, no field or body contains `TODO`, no visible prose contains `;` (strip frontmatter comments and HTML comments first), achievements length is 2, organizations contain no `pass rate`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement schema, `parsePipeline`, data files.
- [ ] **Step 4:** `npm test` → PASS. Commit `feat: content collections and typed section data`.

### Task 3: Shell — nav, mobile menu, scroll progress, motion library

**Files:**
- Create: `src/components/Nav.astro`, `src/components/Footer.astro`, `src/scripts/motion/fx.ts`, `src/scripts/motion/reveal.ts`, `src/scripts/nav.ts`, `tests/unit/fx.test.ts`, `tests/e2e/nav.spec.ts`

**Interfaces:**
- Produces `scrambleFrame(final: string, progress: number, rand: () => number): string` (same length as `final`, spaces and punctuation preserved, equals `final` at progress 1), `formatCount(target: string, t: number): string` (keeps prefix/suffix like `+`, `%`, `x`, `>` and the target's decimal count), `typeText(el, opts)`, `scramble(el, opts)` (box sized by invisible final text, port of `txPrep` from `home-full.html`), `countUp(el)`, `revealSection(section: HTMLElement)` (print/type/resolve language per section, port from `home-full.html`), `prefersReducedMotion(): boolean`.
- Nav items exactly: `~/projects`→`#projects`, `~/experience`→`#experience`, `~/about`→`#drives`, `~/contact`→`#contact`, `cv`→`/media/documents/kevin-anugerah-faza-cv.pdf`. Active item = nearest preceding nav anchor.

- [ ] **Step 1: Write failing tests.** `fx.test.ts`: `scrambleFrame('Hasta El Final.', p, rand)` has length 15 for p in {0, .3, .7}, keeps spaces at indexes 5 and 8 and `.` at 14, equals the final at p=1. `formatCount('0.13689', 0.5)` has 5 decimals, `formatCount('800+', 1) === '800+'`, `formatCount('>100%', 1) === '>100%'`, `formatCount('99.70%', 1) === '99.70%'`. `nav.spec.ts`: nav has exactly 5 links with the texts above, at 375px the `menu` button opens a full-screen menu with the same 5 and closes on Esc and on link click, scroll-progress bar `scaleX` grows with scroll.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS. Commit `feat: nav, menu, scroll progress and motion library`.

### Task 4: Loader and hero

**Files:**
- Create: `src/components/Loader.astro`, `src/components/Hero.astro`, `src/scripts/loader.ts`, `src/scripts/hero/logits.ts`, `src/scripts/hero/attention.ts`, `tests/e2e/hero.spec.ts`

**Interfaces:**
- Consumes `scramble`, `prefersReducedMotion` from Task 3.
- Port from `.claude/boards/redesign/home-full.html` (originally `kernel-v2.html`): training-log loader (single GSAP timeline, once per session via `sessionStorage['kv-loader-seen']`, skip on any key/click/tap, 8 s safety timeout), linked logits + attention-matrix canvas with the three spec sentences and their token alternatives, DPR cap 2, pause offscreen/hidden.
- Loader markup is injected only when JS runs (`html.js` class), so no-JS visitors never see it.

- [ ] **Step 1: Write failing tests** `hero.spec.ts`: fresh context → loader visible, then removed within 4 s, `kevin@portfolio:~$ whoami` visible, `h1` text "Kevin Anugerah Faza". Second load in same context → no loader. Reduced-motion context → loader gone ≤ 500 ms. JS-disabled context → no loader element, h1 and every section id from Task 1 present and visible. No console errors in all cases.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit `feat: training-log loader and linked logits hero`.

### Task 5: Projects spiral

**Files:**
- Create: `src/components/Projects.astro` (HTML grid of 7 project links + contact card, always rendered), `src/scripts/spiral/spiral.ts`, `src/scripts/spiral/covers.ts`, `src/scripts/spiral/pinned-snap.ts`, `tests/e2e/spiral.spec.ts`

**Interfaces:**
- Consumes the `projects` collection (sorted by `order`), `prefersReducedMotion`.
- Port `shared/spiral.js`, `shared/covers.js`, `shared/behaviors.js` as ES modules importing `three` and `gsap` from npm. Keep: facing active card, wheel release at both ends (incl. the `scrollToIndex` no-op guard), lazy init when `#projects` is within 1 viewport, one WebGL renderer per page, `destroy()` that disposes renderer, textures, listeners.
- Produces `mountSpiral(section: HTMLElement): { destroy(): void }`. It increments `window.__spiralCount` on mount and decrements it in `destroy()` (used by Task 8 tests).
- Card links go to `/projects/<slug>/`, last card "Get in touch" → `#contact`.

- [ ] **Step 1: Write failing tests** `spiral.spec.ts` at 1280×800: wheel-only traversal (`page.mouse.wheel(0, 120)` every 400 ms) from top reaches `document.scrollingElement.scrollHeight - innerHeight` and back to 0 within 260 events each way, never 6 consecutive events without scroll change outside the pinned range. Fast burst: 40 wheel events 16 ms apart at the last card → page leaves the pinned range. Exactly one `canvas` inside `#projects`. Reduced motion → grid visible, no canvas. Grid has 7 links whose hrefs match `/projects/<slug>/`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit `feat: pinned 3D project spiral with HTML grid fallback`.

### Task 6: Home sections

**Files:**
- Create: `src/components/Drives.astro`, `Experience.astro`, `Achievements.astro`, `Organizations.astro`, `Toolkit.astro`, `Education.astro`, `Contact.astro`, `src/scripts/experience/gitgraph.ts`, `tests/e2e/sections.spec.ts`, `tests/e2e/layout.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes Task 2 data, Task 3 `revealSection`/`countUp`/`scramble`.
- Port markup, CSS and behaviour from `home-full.html`, including the git-graph HEAD playhead (scroll-driven, branches never drawn past the playhead, auto-switching detail card with logo, packets on running roles, `merged · exit 0`, vertical fallback < 720px). Toolkit icons are inlined at build time from the `simple-icons` package (no runtime fetch), missing slugs render `▪`.
- Produces `mountGitGraph(section: HTMLElement): { destroy(): void }`.

- [ ] **Step 1: Write failing tests.** `sections.spec.ts`: section order of `main > section[id]` equals spec order. "Hasta El Final" appears exactly once. `#achievements` has 2 cards and 0 links. With reduced motion, final values present: `0.13689`, `0.8771`, `99.70%`, `800+`, `170+`, `+60%`, `3x`. `#experience` detail card shows an `img` with non-empty alt. Wheel traversal across `#experience` releases at both ends (same rule as Task 5). Hasta El Final element height stays constant (±1px) during its animation. `layout.spec.ts`: at widths 320, 375, 768, 1280, 2560 → `scrollWidth <= innerWidth`, no element with text overlaps the hero `h1` box.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS (plus Task 1 copy lint). Commit `feat: home sections with print/type/resolve motion`.

### Task 7: Case-study pages

**Files:**
- Create: `src/pages/projects/[slug].astro`, `src/components/case/CaseHeader.astro`, `Metrics.astro`, `PipelineDiagram.astro`, `PrevNext.astro`, `src/scripts/case/pipeline-anim.ts`, `tests/e2e/case.spec.ts`

**Interfaces:**
- Consumes `projects` collection and `parsePipeline` (Task 2), Task 3 motion.
- `PipelineDiagram` renders an SVG server-side from `{nodes, edges}` (auto layered layout: longest-path ranks left→right, vertical below 760px), animated by `pipeline-anim.ts` (packets travel edges, branch/merge visible, scroll-scrubbed, port from `case-study.html`). Node tap/hover shows the note.
- Page sections in order: header (title, category, summary, meta grid timeframe/status/stack with no empty cells, `contribution` if present), metrics, Problem, How it works + diagram, Key decisions, Results, prev/next (wraps 7→1). Header element gets `transition:name={'card-' + slug}`.

- [ ] **Step 1: Write failing tests** `case.spec.ts`: each of the 7 URLs returns 200 with one `h1` equal to its title, SVG node count equals the parsed node count, metrics rendered match frontmatter, NDA pages (`hybrid-rag`, `executive-data-assistant`) contain none of `PKB`, `odoo`, `account_move`, `sale_order`, `.env`. Prev/next links form a 7-cycle. Remove the `fixme` marks in `copy-lint.spec.ts`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit `feat: case-study pages with generated pipeline diagrams`.

### Task 8: Page transitions

**Files:**
- Create: `src/scripts/transitions.ts`, `tests/e2e/transitions.spec.ts`
- Modify: `src/layouts/Base.astro`, `src/components/Projects.astro`

**Interfaces:**
- Use Astro `<ClientRouter />`. Card expand: grid cards and spiral click handler share `transition:name={'card-' + slug}` with the case header. Terminal `cd` overlay (port variant 1 from `transitions.html`) for every other navigation, typed command `cd ~/projects/<slug>` or `cd ~`. ≤ 800 ms, transform/opacity only, reduced motion → instant.
- Every client script initialises on `astro:page-load` and tears down on `astro:before-swap` (spiral, git graph, hero, nav, reveal).

- [ ] **Step 1: Write failing tests** `transitions.spec.ts`: home → click first grid card → URL `/projects/hybrid-rag/`, h1 correct, → browser back → `#projects` in view, exactly one canvas in `#projects`, no console errors. Home → `~/contact` works after returning. Ten home↔project round trips leave exactly one WebGL context (`window.__spiralCount === 1`, set by `mountSpiral`).
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit `feat: card-expand and terminal cd page transitions`.

### Task 9: SEO, GEO, OG images, redirects, 404

**Files:**
- Create: `src/lib/jsonld.ts`, `src/pages/og/[...slug].png.ts`, `src/pages/llms.txt.ts`, `src/pages/404.astro`, `src/scripts/legacy-anchors.ts`, `tests/unit/jsonld.test.ts`, `tests/e2e/seo.spec.ts`
- Modify: `public/robots.txt` (sitemap URL), remove `public/llms.txt`, `public/sitemap.xml`, `public/404.html`, `public/og-image.png` once generated equivalents exist

**Interfaces:**
- `homeJsonLd(): object[]` (WebSite, ProfilePage, Person keeping the current site's `alternateName` "Kevin Anugerah", `sameAs` LinkedIn/GitHub/Kaggle, `address` country Indonesia), `projectJsonLd(p): object[]` (CreativeWork with `author` → Person `@id`, `keywords` from stack, BreadcrumbList Home → Projects → title).
- OG: 1200×630 PNG per page rendered with satori + resvg (terminal frame, title, category, first metric, green accent, IBM Plex Mono TTF from @fontsource files). Paths `/og/index.png`, `/og/projects/<slug>.png`.
- `llms.txt` generated from content: name, one-line bio, links, 7 projects with summary + URL.
- Legacy anchors: on load, map `#leadership`→`#organizations`, `#work`→`#projects`, `#experience` unchanged, unknown hashes ignored.

- [ ] **Step 1: Write failing tests.** `jsonld.test.ts`: outputs are JSON-serialisable, Person `@id` is `https://kevinanugerah.dev/#person` in both. `seo.spec.ts`: every page has unique title and description ≤ 160 chars, canonical with trailing slash, `og:image` pointing to an existing 1200×630 PNG (fetch + read IHDR), JSON-LD parses. `/sitemap-index.xml` lists 8 URLs. `/llms.txt` contains all 7 project URLs. `/404/` renders Kernel style and 404 status in preview. `/#leadership` scrolls to `#organizations`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit `feat: seo, json-ld, og images, llms.txt, legacy anchors`.

### Task 10: Performance, accessibility and Lighthouse gates

**Files:**
- Create: `lighthouserc.json`, `tests/e2e/longtasks.spec.ts`
- Modify: whatever the audits flag

**Interfaces:**
- `lighthouserc.json`: collect from `npm run preview` on all 8 URLs, mobile preset, 3 runs, assertions `categories:performance >= 0.9`, `accessibility = 1`, `seo = 1`, `best-practices = 1`.
- Script `npm run lh` → `lhci autorun`.

- [ ] **Step 1: Write the failing probe** `longtasks.spec.ts`: with CDP CPU throttling ×4, after loader exit, scroll from `#drives` to `#contact` in 120px steps every 100 ms. PerformanceObserver `longtask` count with duration > 50 ms must be 0. Loader exits within 8 s.
- [ ] **Step 2:** Run `npm run lh` and the probe → record failures.
- [ ] **Step 3:** Fix (likely: defer three until near `#projects`, split git-graph code, font subsetting, image sizes for logos, contrast, tap target sizes, `aria-hidden` on canvases, labelled landmarks).
- [ ] **Step 4:** `npm run lh` and full `npm test && npm run e2e` → all PASS. Commit `perf: meet lighthouse gates on all pages`.

### Task 11: Readiness report

**Files:**
- Create: `docs/redesign-readiness.md`

- [ ] **Step 1:** Run the full suite (`npm test`, `npm run e2e`, `npm run lh`) and paste the scores per page, test counts and any open issues into `docs/redesign-readiness.md`, with a clear "ready / not ready" verdict for the local gates.
- [ ] **Step 2:** List what still needs Kevin: permission to push `redesign` for a Cloudflare preview URL (then re-run Lighthouse there), real-device wheel/touch/keyboard checks, page-by-page sign-off. Commit `docs: redesign readiness report`. Stop. Do not push.
