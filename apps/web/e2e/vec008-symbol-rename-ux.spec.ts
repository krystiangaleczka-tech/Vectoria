import { test, expect } from '@playwright/test';

test.describe('VEC008 symbol rename UX', () => {
  test('rename action is explicit and remains one undoable command', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx - 40, cy - 30);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 30, { steps: 5 });
    await page.mouse.up();

    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await page.getByRole('button', { name: 'Zaznacz Rectangle 1' }).click();

    await page.getByRole('tab', { name: 'Zasoby' }).click();
    await page.once('dialog', async (dialog) => {
      expect(dialog.message()).toBe('Nazwa nowego symbolu:');
      await dialog.accept('VEC008 Symbol');
    });
    await page.locator('button[title="Utwórz nowy symbol z zaznaczenia"]').click();

    const assetsPanel = page.getByTestId('assets-panel');
    await expect(assetsPanel).toContainText('VEC008 Symbol');

    const renameButton = page.getByTestId('symbol-rename-button');
    await expect(renameButton).toHaveAttribute('title', 'Zmień nazwę symbolu');
    await expect(renameButton).toHaveAttribute('aria-label', 'Zmień nazwę symbolu VEC008 Symbol');
    await expect(page.locator('[title*="edytuj definicję symbolu"]')).toHaveCount(0);

    await page.once('dialog', async (dialog) => {
      expect(dialog.message()).toBe('Zmień nazwę symbolu:');
      await dialog.accept('VEC008 Renamed');
    });
    await renameButton.click();

    await expect(assetsPanel).toContainText('VEC008 Renamed');
    await expect(assetsPanel).not.toContainText('VEC008 Symbol');

    await page.getByTestId('undo-button').click();
    await expect(assetsPanel).toContainText('VEC008 Symbol');
    await expect(assetsPanel).not.toContainText('VEC008 Renamed');

    await page.getByTestId('redo-button').click();
    await expect(assetsPanel).toContainText('VEC008 Renamed');
  });
});
