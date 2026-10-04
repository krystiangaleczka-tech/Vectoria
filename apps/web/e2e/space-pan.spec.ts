import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test('held Space pans temporarily without scrolling the focused tool rail', async ({ page }) => {
  const rail = page.getByTestId('tool-rail');
  const canvas = page.getByTestId('canvas-viewport');
  expect(await rail.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await rail.evaluate((element) => element.focus());
  await expect(rail).toBeFocused();

  await page.keyboard.down('Space');
  await expect(canvas).toHaveCSS('cursor', 'grab');
  await page.keyboard.down('Space');
  await page.waitForTimeout(500);
  expect(await rail.evaluate((element) => element.scrollTop)).toBe(0);
  await page.keyboard.up('Space');
  await expect(canvas).not.toHaveCSS('cursor', 'grab');
  await expect(canvas).toHaveAttribute('data-tool', 'select');
});

test('Space does not activate a focused tool button after temporary pan', async ({ page }) => {
  const canvas = page.getByTestId('canvas-viewport');
  await page.getByTestId('tool-rectangle').focus();
  await page.keyboard.down('Space');
  await expect(canvas).toHaveCSS('cursor', 'grab');
  await page.keyboard.up('Space');
  await expect(canvas).toHaveAttribute('data-tool', 'select');
  await expect(canvas).not.toHaveCSS('cursor', 'grab');
});

test('Space remains text input when an editor field has focus', async ({ page }) => {
  const canvas = page.getByTestId('canvas-viewport');
  await page.getByRole('button', { name: /%$/ }).click({ delay: 600 });
  const input = page.getByRole('textbox', { name: 'Zoom custom' });
  await expect(input).toBeFocused();
  await input.fill('100');
  await page.keyboard.press('End');
  await page.keyboard.down('Space');
  await expect(input).toHaveValue('100 ');
  await expect(canvas).not.toHaveCSS('cursor', 'grab');
  await page.keyboard.up('Space');
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-tool', 'select');
});
