import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { parsePipeline } from '../../src/lib/pipeline';

const dir = 'docs/content/projects';
const projects = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
  const raw = readFileSync(`${dir}/${f}`, 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw)!;
  const data = parse(m[1]) as { title: string; slug: string; order: number; metrics: { value: string; label: string }[]; stack: string[]; seo_description: string };
  return { ...data, pipeline: parsePipeline(m[2]) };
}).sort((a, b) => a.order - b.order);
const SLUGS = projects.map((p) => p.slug);
const NDA = ['hybrid-rag', 'executive-data-assistant'];
const NDA_BANNED = [/PKB/, /odoo/i, /account_move/, /sale_order/, /\.env/];
const url = (slug: string) => `/projects/${slug}/`;
const GPU = ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])];
test.use({ viewport: { width: 1280, height: 800 }, launchOptions: { args: GPU } });

test('there are seven case studies', () => expect(SLUGS).toHaveLength(7));

for (const p of projects) {
  test(`${p.slug}: 200, one h1 with the title, generated diagram, metrics and meta`, async ({ page }) => {
    const res = await page.goto(url(p.slug));
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(p.title);
    // diagram: one node per parsed pipeline node (the visible layout)
    await expect(page.locator('svg.pipe:visible .pnode')).toHaveCount(p.pipeline.nodes.length);
    await expect(page.locator('svg.pipe:visible .pedge')).toHaveCount(p.pipeline.edges.length);
    // metrics exactly as in the frontmatter
    const metrics = page.locator('.cs-metric');
    await expect(metrics).toHaveCount(p.metrics.length);
    for (let i = 0; i < p.metrics.length; i++) {
      await expect(metrics.nth(i).locator('.cs-mv')).toHaveText(p.metrics[i].value);
      await expect(metrics.nth(i).locator('.cs-ml')).toHaveText(p.metrics[i].label);
    }
    // meta grid: timeframe, status, stack, never empty and never a role
    const dds = page.locator('.cs-meta dd');
    const n = await dds.count();
    expect(n).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < n; i++) expect((await dds.nth(i).innerText()).trim().length).toBeGreaterThan(0);
    await expect(page.locator('.cs-meta')).not.toContainText(/role/i);
    await expect(page.locator('.cs-meta .cs-tags span')).toHaveCount(p.stack.length);
    // section order
    const heads = await page.locator('main h2').allTextContents();
    expect(heads.map((h) => h.trim())).toEqual(['Numbers', 'Problem', 'How it works', 'Key decisions', 'Results', 'More projects']);
    // seo
    expect(await page.title()).toContain(p.title);
    await expect(page.locator('meta[name=description]')).toHaveAttribute('content', p.seo_description);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://kevinanugerah.dev/projects/${p.slug}/`);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `https://kevinanugerah.dev/og/projects/${p.slug}.png`);
    // source comments never render
    expect(await page.content()).not.toContain('src:');
  });
}

for (const slug of NDA) {
  test(`${slug}: NDA page carries no internal identifiers`, async ({ page }) => {
    await page.goto(url(slug));
    const html = await page.content();
    for (const re of NDA_BANNED) expect(html, String(re)).not.toMatch(re);
    await expect(page.locator('.cs-meta')).toContainText('NDA');
  });
}

test('hybrid-rag keeps its evaluation line exactly', async ({ page }) => {
  await page.goto(url('hybrid-rag'));
  await expect(page.locator('main')).toContainText('Evaluated with RAGAS (LLM-as-a-judge).');
});

test('prev/next links form a 7-cycle', async ({ page }) => {
  const nextOf: Record<string, string> = {};
  const prevOf: Record<string, string> = {};
  const slugOf = (h: string | null) => h!.split('/').filter(Boolean).pop()!;
  for (const slug of SLUGS) {
    await page.goto(url(slug));
    nextOf[slug] = slugOf(await page.locator('.cs-pn a[rel=next]').getAttribute('href'));
    prevOf[slug] = slugOf(await page.locator('.cs-pn a[rel=prev]').getAttribute('href'));
  }
  let cur = SLUGS[0];
  const seen: string[] = [];
  for (let i = 0; i < 7; i++) { seen.push(cur); expect(prevOf[nextOf[cur]]).toBe(cur); cur = nextOf[cur]; }
  expect(cur).toBe(SLUGS[0]);
  expect(new Set(seen).size).toBe(7);
  expect(nextOf[SLUGS[6]]).toBe(SLUGS[0]);
  expect(prevOf[SLUGS[0]]).toBe(SLUGS[6]);
});

test('nav on a case page links back to the home sections and does not mark contact', async ({ page }) => {
  await page.goto(url('hybrid-rag'));
  const hrefs = await page.locator('#nav ul a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual(['/#projects', '/#experience', '/#drives', '/#contact', '/media/documents/kevin-anugerah-faza-cv.pdf']);
  await expect(page.locator('#nav .brand')).toHaveAttribute('href', '/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  await expect(page.locator('#nav ul a.on')).toHaveCount(1);
  await expect(page.locator('#nav ul a.on')).toHaveText('~/projects');
});

test('hover and tap on a node show its note', async ({ page }) => {
  await page.goto(url('hybrid-rag'));
  const node = page.locator('svg.pipe:visible .pnode[data-id=fuse]');
  await node.scrollIntoViewIfNeeded();
  await node.hover();
  await expect(page.locator('.pipe-tip')).toContainText('Top 10 vector and top 10 BM25 candidates are merged with RRF.');
  await node.click();
  await page.mouse.move(0, 0);
  await expect(page.locator('.pipe-tip')).toContainText('Rank fusion');
});

test('scroll scrubs the pipeline: lit edges grow with scroll progress', async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem('kv-loader-seen', '1'); } catch { /* ignore */ } });
  await page.goto(url('hybrid-rag'));
  await page.waitForTimeout(600);
  const lit = () => page.evaluate(() => [...document.querySelectorAll<SVGPathElement>('svg.pipe:not([hidden]) .lit')]
    .filter((p) => p.getBoundingClientRect().width > 0 || p.getBoundingClientRect().height > 0)
    .filter((p) => parseFloat(getComputedStyle(p).strokeDashoffset) < 1).length);
  const total = await page.evaluate(() => [...document.querySelectorAll<SVGPathElement>('svg.pipe .lit')].filter((p) => p.closest('svg')!.getBoundingClientRect().width > 0).length);
  await page.evaluate(() => { const t = document.querySelector('.cs-track')!.getBoundingClientRect(); window.scrollTo(0, scrollY + t.top - 330); });
  await page.waitForTimeout(900);
  const early = await lit();
  await page.evaluate(() => { const t = document.querySelector('.cs-track')!.getBoundingClientRect(); window.scrollTo(0, scrollY + t.bottom - 400); });
  await page.waitForTimeout(1600);
  const late = await lit();
  expect(early).toBeLessThan(late);
  expect(late).toBe(total);
});

test('reduced motion renders the finished pipeline immediately', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(url('hybrid-rag'));
  await page.waitForTimeout(400);
  const unlit = await page.evaluate(() => [...document.querySelectorAll<SVGPathElement>('svg.pipe .lit')].filter((p) => {
    const cs = getComputedStyle(p);
    return cs.strokeDasharray !== 'none' && parseFloat(cs.strokeDashoffset) > 1;
  }).length);
  expect(unlit).toBe(0);
  await expect(page.locator('.cs-metric .cs-mv').first()).toHaveText('86.67%');
  await ctx.close();
});

test('JavaScript disabled: every section is readable', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(url('executive-data-assistant'));
  for (const h of ['Problem', 'How it works', 'Key decisions', 'Results']) await expect(page.getByRole('heading', { name: h })).toBeVisible();
  await expect(page.locator('main')).toContainText('Managers wanted business numbers');
  await expect(page.locator('svg.pipe:visible .pnode')).toHaveCount(8);
  await expect(page.locator('.cs-steps')).toContainText('Destructive requests are blocked before the model sees them.');
  await ctx.close();
});

for (const w of [320, 375, 768, 2560]) {
  test(`width ${w}: no horizontal overflow and exactly one diagram layout shown`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: w, height: 800 });
    for (const slug of SLUGS) {
      await page.goto(url(slug));
      await page.waitForTimeout(150);
      const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
      expect(sw.sw, slug).toBeLessThanOrEqual(sw.iw);
      await expect(page.locator('svg.pipe:visible')).toHaveCount(1);
    }
  });
}

// 1 SVG unit is 1 CSS px: labels must be at least 12px on screen at every width, and the diagram never scrolls sideways
for (const w of [320, 375, 900, 1280, 1920, 2560]) {
  test(`width ${w}: diagram labels render at 12px or more and the box never scrolls sideways`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: w, height: 800 });
    for (const slug of SLUGS) {
      await page.goto(url(slug));
      await page.waitForTimeout(100);
      const m = await page.evaluate(() => {
        const svg = [...document.querySelectorAll<SVGSVGElement>('svg.pipe')].find((s) => s.getClientRects().length > 0)!;
        const box = document.querySelector<HTMLElement>('.pipe-box')!;
        const sizes = [...svg.querySelectorAll<SVGTextElement>('.pnode text')].map((t) => {
          const ctm = t.getScreenCTM()!;
          return ctm.a * parseFloat(getComputedStyle(t).fontSize);
        });
        const heights = [...svg.querySelectorAll<SVGTSpanElement>('.pnode tspan')].map((t) => t.getBoundingClientRect().height);
        const sr = svg.getBoundingClientRect(), br = box.getBoundingClientRect();
        return { min: Math.min(...sizes), nodes: sizes.length, minH: Math.min(...heights), scroll: box.scrollWidth - box.clientWidth, over: Math.max(0, sr.right - br.right, br.left - sr.left), mode: svg.dataset.mode };
      });
      expect(m.nodes, slug).toBeGreaterThan(0);
      expect(m.min, `${slug} label font px at ${w} (${m.mode})`).toBeGreaterThanOrEqual(11.99);
      expect(m.minH, `${slug} rendered label height at ${w}`).toBeGreaterThanOrEqual(11.99);
      expect(m.scroll, `${slug} box scrollWidth at ${w}`).toBeLessThanOrEqual(0);
      expect(m.over, `${slug} svg outside box at ${w}`).toBeLessThanOrEqual(0.5);
    }
  });
}

test('header carries the view-transition name for its card', async ({ page }) => {
  await page.goto(url('hybrid-rag'));
  const name = await page.locator('.cs-head').evaluate((el) => getComputedStyle(el).viewTransitionName);
  expect(name).toBe('card-hybrid-rag');
});
