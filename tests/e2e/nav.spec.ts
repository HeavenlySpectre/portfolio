import { test, expect } from '@playwright/test';

const ITEMS: [string, string][] = [
  ['~/projects', '#projects'],
  ['~/experience', '#experience'],
  ['~/about', '#drives'],
  ['~/contact', '#contact'],
  ['cv', '/media/documents/kevin-anugerah-faza-cv.pdf'],
];

test('desktop nav has the five links', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const links = page.locator('#nav ul a');
  await expect(links).toHaveCount(5);
  for (let i = 0; i < ITEMS.length; i++) {
    await expect(links.nth(i)).toHaveText(ITEMS[i][0]);
    await expect(links.nth(i)).toHaveAttribute('href', ITEMS[i][1]);
  }
});

test('mobile menu opens full screen, closes on Esc and on link click', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  const menu = page.locator('#menu');
  await expect(menu).toBeHidden();
  await page.getByRole('button', { name: 'menu' }).click();
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  expect(box!.width).toBe(375);
  expect(box!.height).toBe(700);
  const items = menu.locator('.menu-list a');
  await expect(items).toHaveCount(5);
  for (let i = 0; i < ITEMS.length; i++) await expect(items.nth(i)).toContainText(ITEMS[i][0]);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await page.getByRole('button', { name: 'menu' }).click();
  await expect(menu).toBeVisible();
  await items.nth(0).click();
  await expect(menu).toBeHidden();
});

test('scroll progress bar grows with scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const sx = () => page.locator('#navp').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
  expect(await sx()).toBeLessThan(0.05);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await expect.poll(sx).toBeGreaterThan(0.3);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(sx).toBeGreaterThan(0.95);
});

test('active nav item follows the nearest preceding anchor', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/#experience');
  await expect(page.locator('#nav ul a.on')).toHaveText('~/experience');
});
