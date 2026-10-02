import { test, expect } from '@playwright/test';

test.describe('VEC007 Brand Kit logo insertion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: 'Zasoby' }).click();
    await page.getByLabel('Kategoria zasobów').selectOption('brandKit');
  });

  test('SVG logo stays editable and inserts through one undoable vector command', async ({ page }) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40">
        <rect x="2" y="3" width="60" height="34" rx="4" fill="#3366ff"/>
      </svg>
    `;

    await page.getByTestId('brand-logo-input').setInputFiles({
      name: 'vec007-mark.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(svg),
    });

    const logoCard = page.getByTestId('brand-logo-card').filter({ hasText: 'vec007-mark' });
    await expect(logoCard).toHaveAttribute('data-logo-kind', 'svg');
    await logoCard.click();

    await expect(page.getByTestId('statusbar')).toContainText('1 object');

    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await expect(page.getByTestId('layers-panel')).toContainText('vec007-mark');
    await expect(page.getByTestId('layers-panel')).not.toContainText('Image');

    await page.getByTestId('undo-button').click();
    await expect(page.getByTestId('statusbar')).toContainText('0 objects');
    await page.getByTestId('redo-button').click();
    await expect(page.getByTestId('statusbar')).toContainText('1 object');
  });

  test('raster logo still inserts as an image asset', async ({ page }) => {
    await page.getByTestId('brand-logo-input').setInputFiles({
      name: 'vec007-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('not-a-real-jpeg'),
    });

    const logoCard = page.getByTestId('brand-logo-card').filter({ hasText: 'vec007-photo' });
    await expect(logoCard).toHaveAttribute('data-logo-kind', 'image');
    await logoCard.click();

    await expect(page.getByTestId('statusbar')).toContainText('1 object');
    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await expect(page.getByTestId('layers-panel')).toContainText('vec007-photo');
  });
});
