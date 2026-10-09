import { test, expect, type Page } from '@playwright/test';

const IDS = ['top', 'drives', 'projects', 'experience', 'achievements', 'organizations', 'toolkit', 'education', 'contact'];

function watchErrors(page: Page) {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  return errs;
}

test('fresh session: loader shows, exits within 4 s, hero is complete', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/');
  await expect(page.locator('#loader')).toBeVisible();
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator('#top .prompt')).toContainText('kevin@portfolio:~$ whoami');
  await expect(page.locator('h1')).toHaveText('Kevin Anugerah Faza');
  await expect(page.locator('#top')).toContainText('AI & Data Engineer');
  await expect(page.locator('#top')).toContainText('I build AI and data systems that work beyond the notebook.');
  expect(errs).toEqual([]);
});

test('second load in the same session has no loader', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 4000 });
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('#loader')).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('kv-loader-seen'))).toBe('1');
  expect(errs).toEqual([]);
});

test('any key skips the loader quickly', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loader')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 2500 });
});

test('reduced motion: loader is gone within 500 ms', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.goto('/');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 500 });
  await expect(page.locator('h1')).toHaveText('Kevin Anugerah Faza');
  await expect(page.locator('#top .prompt')).toContainText('kevin@portfolio:~$ whoami');
  expect(errs).toEqual([]);
  await ctx.close();
});

test('javascript disabled: no loader, hero and every section visible', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('#loader')).toHaveCount(0);
  await expect(page.locator('h1')).toHaveText('Kevin Anugerah Faza');
  await expect(page.locator('h1')).toBeVisible();
  for (const id of IDS) await expect(page.locator('#' + id), id).toBeVisible();
  await ctx.close();
});
