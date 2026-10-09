import { test, expect } from '@playwright/test';

const SLUGS = ['hybrid-rag', 'executive-data-assistant', 'material-property-prediction', 'taskflow-devsecops', '19mj-career-platform', 'realtime-lakehouse', 'onchain-todo-dapp'];
const PROJECTS = SLUGS.map((s) => `/projects/${s}/`);
const BANNED = [/;/, /pass rate/i, /Surabaya/, /TODO/, /Lorem/];

for (const url of ['/', ...PROJECTS]) {
  test(`copy lint ${url}`, async ({ page }) => {
    await page.goto(url);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.length).toBeGreaterThan(0);
    for (const re of BANNED) expect(text, String(re)).not.toMatch(re);
  });
}
