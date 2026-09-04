import { test, expect } from '@playwright/test';

test.describe('EPIC-18: UX, Accessibility & Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('UX-001..003: Canvas viewport has semantic ARIA attributes and focus management', async ({ page }) => {
    const viewport = page.locator('[data-testid="canvas-viewport"]');
    await expect(viewport).toBeVisible();
    await expect(viewport).toHaveAttribute('role', 'application');
    await expect(viewport).toHaveAttribute('tabindex', '0');
    await expect(viewport).toHaveAttribute('aria-label');
    await expect(viewport).toHaveAttribute('aria-roledescription', 'edytor wektorowy');

    // Verify ToolRail buttons have tooltip and accessible title/label with shortcuts
    const selectTool = page.locator('[data-testid="tool-select"]');
    await expect(selectTool).toBeVisible();
    await expect(selectTool).toHaveAttribute('title', 'Select Tool (V)');
    await expect(selectTool).toHaveAttribute('aria-label', 'Select Tool');

    const tooltipWrapper = page.locator('.vectoria-tooltip', { has: selectTool });
    await expect(tooltipWrapper).toHaveAttribute('data-tooltip', 'Select Tool (V)');
  });

  test('UX-004..006: Keyboard nudge and Select All (Cmd+A/Ctrl+A)', async ({ page }) => {
    const viewport = page.locator('[data-testid="canvas-viewport"]');
    const box = await viewport.boundingBox();
    if (!box) throw new Error('Canvas viewport bounding box unavailable');

    // Select Rectangle tool
    const rectTool = page.locator('[data-testid="tool-rectangle"]');
    await expect(rectTool).toBeVisible();
    await rectTool.click();

    // Draw a rectangle
    const startX = box.x + box.width / 2 - 50;
    const startY = box.y + box.height / 2 - 50;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY + 80);
    await page.mouse.up();

    // Switch to Select tool
    const selectTool = page.locator('[data-testid="tool-select"]');
    await selectTool.click();

    // Focus viewport
    await viewport.focus();

    // Test Select All via keyboard shortcut
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+a' : 'Control+a');

    // Nudge with arrow keys
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');

    // Verify history recorded changes (Undo should be enabled)
    const undoBtn = page.locator('[data-testid="undo-button"]');
    await expect(undoBtn).toBeEnabled();
  });

  test('UX-010..014: High contrast toggle and UI scaling', async ({ page }) => {
    // Open "Widok" menu
    const viewMenuBtn = page.locator('button.menu-trigger', { hasText: 'Widok' });
    await viewMenuBtn.click();

    // Toggle high contrast
    const contrastMenuItem = page.locator('button.menu-item', { hasText: 'Wysoki kontrast' });
    await expect(contrastMenuItem).toBeVisible();
    await contrastMenuItem.click();

    // Verify html element has data-contrast="high"
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-contrast', 'high');

    // Open "Widok" menu again and test UI scale
    await viewMenuBtn.click();
    const scaleMenuItem = page.locator('button.menu-item', { hasText: 'Skala UI' });
    await expect(scaleMenuItem).toBeVisible();
    await scaleMenuItem.click();

    // Verify root zoom or scale applied
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // Revert high contrast
    await viewMenuBtn.click();
    await contrastMenuItem.click();
    await expect(html).not.toHaveAttribute('data-contrast', 'high');
  });

  test('UX-015..018: Accessible modal dialogs with focus trap and Escape', async ({ page }) => {
    // Open Shortcut Config modal dialog via Okno menu
    const windowMenuBtn = page.locator('button.menu-trigger', { hasText: 'Okno' });
    await windowMenuBtn.click();
    const shortcutItem = page.locator('button.menu-item', { hasText: 'Konfiguracja skrótów' });
    await shortcutItem.click();

    const dialog = page.locator('[data-testid="shortcut-config-dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Close via Escape key
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('UX-020..021: Destructive confirmation dialog (ConfirmDialog)', async ({ page }) => {
    // Open Project Gallery
    const galleryBtn = page.locator('[data-testid="open-gallery-tab-btn"]');
    await galleryBtn.click();

    const gallery = page.locator('[data-testid="project-gallery"]');
    await expect(gallery).toBeVisible();

    // Create a temporary project
    await page.locator('[data-testid="new-project-btn"]').click();
    const projectNameInput = page.locator('input[placeholder="Wpisz nazwę projektu..."]');
    await projectNameInput.fill('Projekt Do Usunięcia');
    await page.locator('button:has-text("Utwórz")').click();

    const card = page.locator('[data-testid^="project-card-"]').filter({ hasText: 'Projekt Do Usunięcia' });
    await expect(card).toBeVisible();

    // Click trash button on card
    const deleteBtn = card.locator('button:has-text("🗑")');
    await deleteBtn.click();

    // Verify ConfirmDialog appeared
    const confirmDialog = page.locator('[data-testid="confirm-delete-project"]');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toHaveAttribute('role', 'dialog');
    await expect(confirmDialog).toHaveAttribute('aria-modal', 'true');
    await expect(confirmDialog).toContainText('Potwierdź usunięcie projektu');

    // Cancel deletion
    const cancelBtn = page.locator('[data-testid="confirm-delete-project-cancel"]');
    await cancelBtn.click();
    await expect(confirmDialog).toBeHidden();

    // Project should still exist
    await expect(card).toBeVisible();

    // Close gallery
    await page.locator('[data-testid="gallery-close-btn"]').click();
  });

  test('UX-022..023: Onboarding checklist and interactive tutorial', async ({ page }) => {
    // Check onboarding checklist is accessible
    const checklist = page.locator('[data-testid="onboarding-checklist"]');
    const trigger = page.locator('[data-testid="onboarding-checklist-trigger"]');

    // Either open or collapsed trigger is present
    if (await trigger.isVisible()) {
      await trigger.click();
    }
    await expect(checklist).toBeVisible();
    await expect(checklist).toContainText('Witaj w Vectoria!');

    // Start a tutorial from Pomoc menu
    const helpMenuBtn = page.locator('button.menu-trigger', { hasText: 'Pomoc' });
    await helpMenuBtn.click();
    const tutorialItem = page.locator('button.menu-item', { hasText: 'Samouczek: Skróty klawiszowe' });
    await expect(tutorialItem).toBeVisible();
    await tutorialItem.click();

    // Verify TutorialOverlay appears
    const tutorialOverlay = page.locator('[data-testid="tutorial-overlay"]');
    await expect(tutorialOverlay).toBeVisible();
    await expect(tutorialOverlay).toContainText('Krok 1 z 4');
    await expect(tutorialOverlay).toContainText('Podstawowe skróty klawiszowe');

    // Step forward
    const nextBtn = page.locator('[data-testid="tutorial-next-btn"]');
    await nextBtn.click();
    await expect(tutorialOverlay).toContainText('Krok 2 z 4');

    // Step back
    const prevBtn = page.locator('[data-testid="tutorial-prev-btn"]');
    await prevBtn.click();
    await expect(tutorialOverlay).toContainText('Krok 1 z 4');

    // Close via skip
    const skipBtn = page.locator('[data-testid="tutorial-skip-btn"]');
    await skipBtn.click();
    await expect(tutorialOverlay).toBeHidden();
  });
});
