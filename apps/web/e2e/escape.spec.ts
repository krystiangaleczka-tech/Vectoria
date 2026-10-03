import { test, expect, type Page } from '@playwright/test';

async function createAndSelectRectangle(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const canvas = page.getByTestId('canvas-viewport');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  const center = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };

  await page.getByTestId('tool-rectangle').click();
  await page.mouse.move(center.x - 45, center.y - 45);
  await page.mouse.down();
  await page.mouse.move(center.x + 45, center.y + 45, { steps: 5 });
  await page.mouse.up();

  await page.getByTestId('tool-select').click();
  await page.mouse.click(center.x, center.y);

  const xInput = page.getByTestId('prop-x').locator('input');
  const yInput = page.getByTestId('prop-y').locator('input');
  await expect(xInput).toBeVisible();
  await expect(yInput).toBeVisible();

  return { canvas, center, xInput, yInput };
}

test.describe('Escape clears idle selection and preserves cancellation', () => {
  test('idle Escape clears selection and returns to the arrow tool without deleting objects', async ({ page }) => {
    const { canvas, xInput } = await createAndSelectRectangle(page);
    await page.getByTestId('tool-rectangle').click();
    await canvas.focus();
    await page.keyboard.press('Escape');
    await expect(xInput).not.toBeVisible();
    await expect(canvas).toHaveAttribute('data-tool', 'select');
    await expect(page.getByTestId('statusbar')).toContainText('1 object');
  });

  test('Escape during a move cancels the preview without clearing selection or adding history', async ({ page }) => {
    const { center, xInput, yInput } = await createAndSelectRectangle(page);
    const initialX = await xInput.inputValue();
    const initialY = await yInput.inputValue();

    await page.getByRole('tab', { name: 'Historia' }).click();
    const historyEntries = page.getByTestId('history-panel').locator('.history-entry-button');
    const historyCountBefore = await historyEntries.count();
    await page.getByRole('tab', { name: 'Właściwości' }).click();

    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 70, center.y + 55, { steps: 5 });
    await page.keyboard.press('Escape');
    await page.mouse.up();

    await expect(xInput).toBeVisible();
    await expect(yInput).toBeVisible();
    await expect(xInput).toHaveValue(initialX);
    await expect(yInput).toHaveValue(initialY);
    await expect(page.getByTestId('properties-panel')).toContainText('Object Properties');

    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel').locator('.history-entry-button')).toHaveCount(historyCountBefore);
  });
});
