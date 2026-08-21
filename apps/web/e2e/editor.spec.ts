import { test, expect } from '@playwright/test';

test.describe('Vectoria MVP Skeleton', () => {
  test('should load the editor and initialize properly', async ({ page }) => {
    // Navigate to the editor
    await page.goto('/');

    // Verify title
    await expect(page).toHaveTitle(/Vectoria/i);

    // Verify the UI elements are present
    const canvasContainer = page.locator('div[style*="cursor: default"]');
    await expect(canvasContainer).toBeVisible();

    // Verify properties panel is present
    const propertiesPanel = page.locator('aside:has-text("Properties")');
    await expect(propertiesPanel).toBeVisible();

    // Verify toolbar is present
    const rectangleTool = page.locator('button[title="Rectangle Tool (R)"]');
    await expect(rectangleTool).toBeVisible();
  });
});
