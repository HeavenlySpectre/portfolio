import { test, expect } from '@playwright/test';

const PROJECTS = [1, 2, 3, 4, 5, 6, 7].map((n) => `/projects/placeholder-${n}/`);// real slugs land in Task 7
const BANNED = [/;/, /pass rate/i, /Surabaya/, /TODO/, /Lorem/];

for (const url of ['/', ...PROJECTS]) {
  const t = url === '/' ? test : test.fixme;
  t(`copy lint ${url}`, async ({ page }) => {
    await page.goto(url);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.length).toBeGreaterThan(0);
    for (const re of BANNED) expect(text, String(re)).not.toMatch(re);
  });
}
