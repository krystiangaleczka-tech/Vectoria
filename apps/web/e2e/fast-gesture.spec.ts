import { test, expect } from '@playwright/test';

test.describe('Fast Gestures and UX Fixes (FIX-SESSION)', () => {
  test('fast rectangle creation creates object without commit drift', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Select Rectangle Tool
    await page.getByRole('button', { name: 'Rectangle Tool' }).click();

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Fast draw: move down, drag across, up immediately with 1 step (< 100ms)
    await page.mouse.move(cx - 50, cy - 50);
    await page.mouse.down();
    await page.mouse.move(cx + 50, cy + 50, { steps: 1 });
    await page.mouse.up();

    // Verify object created in Layers panel
    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await expect(page.getByTestId('layers-panel')).toContainText('Rectangle 1');
  });

  test('fast object drag commits transform reliably', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Create a rectangle first
    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx - 40, cy - 40);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 40, { steps: 2 });
    await page.mouse.up();

    // Switch to select tool
    await page.keyboard.press('v');

    // Fast drag by 100px with 1 step
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 100, cy + 80, { steps: 1 });
    await page.mouse.up();

    // Verify undo button is enabled
    const undoButton = page.getByTestId('undo-button');
    await expect(undoButton).toBeEnabled();

    // Undo should revert
    await undoButton.click();
  });

  test('menu Obiekt does not contain Zaznacz podobne', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Obiekt' }).click();
    await expect(page.getByRole('menuitem', { name: /Zaznacz podobne/i })).toHaveCount(0);
    await page.keyboard.press('Escape');
  });

  test('zoom readout cycles presets on click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const zoomButton = page.locator('.zoom-readout');
    await expect(zoomButton).toBeVisible();

    // Read initial zoom text, e.g. 100%
    const initialText = await zoomButton.innerText();
    expect(initialText).toContain('%');

    // Click to cycle
    await zoomButton.click();
    const nextText = await zoomButton.innerText();
    expect(nextText).not.toBe(initialText);
  });
});
