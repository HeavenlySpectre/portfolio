import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

const dir = 'docs/content/projects';
const SLUGS = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
  const raw = readFileSync(`${dir}/${f}`, 'utf8').replace(/\r\n/g, '\n');
  return (parse(/^---\n([\s\S]*?)\n---/.exec(raw)![1]) as { slug: string }).slug;
});
const PAGES = ['/', ...SLUGS.map((s) => `/projects/${s}/`)];

test('every page has unique title and description, canonical, 1200x630 og image, valid JSON-LD', async ({ page, request }) => {
  const titles = new Set<string>(), descs = new Set<string>();
  for (const path of PAGES) {
    await page.goto(path);
    const title = await page.title();
    const desc = (await page.locator('meta[name=description]').getAttribute('content'))!;
    expect(desc.length, path).toBeLessThanOrEqual(160);
    expect(desc, path).not.toContain(';');
    expect(titles.has(title), `dup title ${path}`).toBe(false);
    expect(descs.has(desc), `dup desc ${path}`).toBe(false);
    titles.add(title); descs.add(desc);
    expect(await page.locator('link[rel=canonical]').getAttribute('href')).toBe(`https://kevinanugerah.dev${path}`);
    const og = (await page.locator('meta[property="og:image"]').getAttribute('content'))!;
    const res = await request.get(new URL(og).pathname);
    expect(res.status(), og).toBe(200);
    const buf = await res.body();
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20)], og).toEqual([1200, 630]);
    for (const s of await page.locator('script[type="application/ld+json"]').allTextContents()) expect(() => JSON.parse(s)).not.toThrow();
  }
});

test('sitemap index lists the sitemap with 8 URLs', async ({ request }) => {
  const idx = await (await request.get('/sitemap-index.xml')).text();
  const locs = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs.length).toBeGreaterThan(0);
  let urls: string[] = [];
  for (const l of locs) urls = urls.concat([...(await (await request.get(new URL(l).pathname)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  expect(urls).toHaveLength(8);
});

test('llms.txt lists all projects', async ({ request }) => {
  const t = await (await request.get('/llms.txt')).text();
  for (const s of SLUGS) expect(t).toContain(`https://kevinanugerah.dev/projects/${s}/`);
  expect(t).not.toMatch(/Surabaya/);
});

test('robots points to the sitemap index', async ({ request }) => {
  expect(await (await request.get('/robots.txt')).text()).toContain('https://kevinanugerah.dev/sitemap-index.xml');
});

test('404 page renders in Kernel style with a 404 status', async ({ page }) => {
  const res = await page.goto('/no-such-page/');
  expect(res!.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('404');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(9, 12, 10)');
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('IBM Plex Mono');
});

test('legacy anchors resolve', async ({ page }) => {
  await page.goto('/#leadership');
  await expect(page).toHaveURL(/#organizations$/);
  await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById('organizations')!.getBoundingClientRect().top)), { timeout: 15000 }).toBeLessThan(120);
  await page.goto('/#work');
  await expect(page).toHaveURL(/#projects$/);
  await page.goto('/#bogus');
  await expect(page).toHaveURL(/#bogus$/);
});
