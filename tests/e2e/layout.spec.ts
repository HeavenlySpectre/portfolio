import { test, expect } from '@playwright/test';

const WIDTHS = [320, 375, 768, 1280, 2560];
// headless Chromium falls back to a software renderer that draws the spiral at about 2 fps: ask for the real GPU when there is one
const GPU = ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])];
test.use({ launchOptions: { args: GPU } });

for (const w of WIDTHS) {
  test(`width ${w}: no horizontal overflow and nothing with text overlaps the hero h1`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => { try { sessionStorage.setItem('kv-loader-seen', '1'); } catch { /* ignore */ } });
    await page.setViewportSize({ width: w, height: w < 500 ? 700 : 900 });
    await page.goto('/');
    await expect(page.locator('#loader')).toHaveCount(0);
    await page.waitForTimeout(500);

    const overlaps = await page.evaluate(() => {
      const h1 = document.querySelector('h1')!;
      const h = h1.getBoundingClientRect();
      const out: string[] = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el === h1 || h1.contains(el) || el.contains(h1)) continue;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
        if (!own) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) continue; // .vh copies
        const ix = Math.min(r.right, h.right) - Math.max(r.left, h.left);
        const iy = Math.min(r.bottom, h.bottom) - Math.max(r.top, h.top);
        if (ix > 1 && iy > 1) out.push(`${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').trim().slice(0, 30)}"`);
      }
      return out;
    });
    expect(overlaps).toEqual([]);

    const top = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    expect(top.sw).toBeLessThanOrEqual(top.iw);

    // scroll through the whole page so every section is armed, revealed and laid out, then measure again
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += 700) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(40);
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(800);
    const bottom = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, bw: document.body.scrollWidth }));
    expect(bottom.sw).toBeLessThanOrEqual(bottom.iw);
    expect(bottom.bw).toBeLessThanOrEqual(bottom.iw);
  });
}
