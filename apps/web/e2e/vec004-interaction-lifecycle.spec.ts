import { test, expect } from '@playwright/test';

// VEC004 locks cancellation semantics for migrated Width, Smooth and Text sessions.
async function drawSelectedPath(page: import('@playwright/test').Page) {
  const canvas = page.getByTestId('canvas-viewport');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  const start = { x: box.x + 240, y: box.y + 240 };
  await page.getByTestId('tool-pencil').click();
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 80, start.y + 25, { steps: 4 });
  await page.mouse.move(start.x + 160, start.y - 10, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId('statusbar')).toContainText('1 object');
  return { canvas, start };
}

test.describe('VEC004 interaction lifecycle', () => {
  test('Escape and tool switch cancel text drafts without Edit Text history', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    await page.getByTestId('tool-text').click();
    await page.mouse.click(box.x + 240, box.y + 220);
    await page.keyboard.type('draft-by-escape');
    await page.keyboard.press('Escape');

    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Create Text');
    await expect(page.getByTestId('history-panel')).not.toContainText('Edit Text');

    await page.getByTestId('tool-text').click();
    const nextBox = await canvas.boundingBox();
    if (!nextBox) throw new Error('Canvas not found');
    await page.mouse.click(nextBox.x + 360, nextBox.y + 280);
    await page.keyboard.type('draft-by-tool-switch');
    await page.getByTestId('tool-select').click();

    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).not.toContainText('Edit Text');
  });

  test('pointercancel and lost pointer capture cancel text creation before commit', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    await page.getByTestId('tool-text').click();
    await page.mouse.move(box.x + 220, box.y + 220);
    await page.mouse.down();
    await canvas.dispatchEvent('pointercancel', { bubbles: true, pointerId: 1 });
    await page.mouse.up();
    await expect(page.getByTestId('statusbar')).toContainText('0 objects');

    await page.mouse.move(box.x + 320, box.y + 220);
    await page.mouse.down();
    await canvas.dispatchEvent('lostpointercapture', { bubbles: true, pointerId: 1 });
    await page.mouse.up();
    await expect(page.getByTestId('statusbar')).toContainText('0 objects');

    await page.mouse.click(box.x + 420, box.y + 220);
    await expect(page.getByTestId('statusbar')).toContainText('1 object');
  });

  test('Width and Smooth tool switch mid-gesture leave history unchanged', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const { canvas, start } = await drawSelectedPath(page);

    await page.getByRole('tab', { name: 'Historia' }).click();
    const entries = page.getByTestId('history-panel').locator('.history-entry-button');
    const baseline = await entries.count();

    await page.getByTestId('tool-width').click();
    await page.mouse.move(start.x + 80, start.y + 10);
    await page.mouse.down();
    await page.mouse.move(start.x + 130, start.y + 10, { steps: 3 });
    await page.getByTestId('tool-select').dispatchEvent('click');
    await page.mouse.up();
    await expect(entries).toHaveCount(baseline);

    await page.getByTestId('tool-smooth').click();
    await page.mouse.move(start.x + 80, start.y + 10);
    await page.mouse.down();
    await page.mouse.move(start.x + 140, start.y + 10, { steps: 3 });
    await page.getByTestId('tool-select').dispatchEvent('click');
    await page.mouse.up();
    await expect(entries).toHaveCount(baseline);

    await expect(canvas).toHaveAttribute('data-tool', 'select');
  });
});
