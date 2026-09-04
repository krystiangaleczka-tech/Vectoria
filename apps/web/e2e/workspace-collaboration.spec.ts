import { test, expect } from '@playwright/test';

test.describe('EPIC-17: Workspace, Collaboration & SaaS (Local-first)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('SAAS-002..005: opens project gallery, creates project, searches, and closes gallery', async ({ page }) => {
    // Open Gallery via DocumentTabs button
    const galleryBtn = page.locator('[data-testid="open-gallery-tab-btn"]');
    await expect(galleryBtn).toBeVisible();
    await galleryBtn.click();

    // Verify gallery is open
    const gallery = page.locator('[data-testid="project-gallery"]');
    await expect(gallery).toBeVisible();
    await expect(gallery).toContainText('Vectoria Workspace');

    // Create a new project
    const newProjectBtn = page.locator('[data-testid="new-project-btn"]');
    await newProjectBtn.click();
    const projectNameInput = page.locator('input[placeholder="Wpisz nazwę projektu..."]');
    await expect(projectNameInput).toBeVisible();
    await projectNameInput.fill('Baner Wiosenny');
    await page.locator('button:has-text("Utwórz")').click();

    // Verify project card appears in the gallery grid
    const projectCard = page.locator('[data-testid^="project-card-"]').filter({ hasText: 'Baner Wiosenny' });
    await expect(projectCard).toBeVisible();

    // Test Search filter
    const searchInput = page.locator('[data-testid="project-search-input"]');
    await searchInput.fill('Wiosenny');
    await expect(projectCard).toBeVisible();

    await searchInput.fill('NieistniejącyProjektXYZ');
    await expect(projectCard).toBeHidden();
    await searchInput.fill('');

    // Close Gallery
    const closeBtn = page.locator('[data-testid="gallery-close-btn"]');
    await closeBtn.click();
    await expect(gallery).toBeHidden();
  });

  test('SAAS-012..014 & SAAS-018: comments panel, annotation pins, mentions, resolve toggle, and export', async ({ page }) => {
    // Open Comments Panel via tab button
    const commentsTabBtn = page.locator('[data-testid="toggle-comments-tab-btn"]');
    await expect(commentsTabBtn).toBeVisible();
    await commentsTabBtn.click();

    const commentsPanel = page.locator('[data-testid="comments-panel"]');
    await expect(commentsPanel).toBeVisible();

    // Add a comment with @mention
    const commentInput = page.locator('[data-testid="new-comment-textarea"]');
    await commentInput.fill('Proszę sprawdzić ten obszar @design i @marketing');
    await page.locator('[data-testid="submit-comment-btn"]').click();

    // Verify comment is displayed in panel list
    await expect(commentsPanel).toContainText('Proszę sprawdzić ten obszar @design i @marketing');
    await expect(commentsPanel).toContainText('@design');
    await expect(commentsPanel).toContainText('@marketing');

    // Verify DOM pin is rendered over canvas
    const pin = page.locator('[data-testid^="annotation-pin-"]').first();
    await expect(pin).toBeVisible();

    // Toggle resolve status
    const resolveBtn = page.locator('button:has-text("Oznacz")').first();
    await resolveBtn.click();
    await expect(page.locator('button:has-text("✓ Rozwiązany")').first()).toBeVisible();

    // Filter by open comments -> should hide the resolved one
    await page.locator('[data-testid="filter-comments-open"]').click();
    await expect(commentsPanel).toContainText('Brak uwag w tym widoku');

    // Filter by resolved comments -> should show the resolved one
    await page.locator('[data-testid="filter-comments-resolved"]').click();
    await expect(commentsPanel).toContainText('Proszę sprawdzić ten obszar');

    // Test JSON export download
    const [downloadJson] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="export-comments-json-btn"]').click(),
    ]);
    expect(downloadJson.suggestedFilename()).toContain('.json');

    // Test Markdown export download
    const [downloadMd] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="export-comments-md-btn"]').click(),
    ]);
    expect(downloadMd.suggestedFilename()).toContain('.md');

    // Close comments panel
    const closeBtn = page.locator('[data-testid="close-comments-panel-btn"]');
    await closeBtn.click();
    await expect(commentsPanel).toBeHidden();
  });

  test('SAAS-015..016: history versions with confirmation modal on restore', async ({ page }) => {
    // Open History panel via menu
    await page.getByRole('button', { name: 'Okno' }).click();
    await page.getByRole('menuitem', { name: 'Historia' }).click();

    const historyPanel = page.locator('[data-testid="history-panel"]');
    await expect(historyPanel).toBeVisible();

    // Create a named version
    const versionNameInput = page.locator('input[placeholder="Nazwa wersji"]');
    await versionNameInput.fill('Snapshot-1.0');
    await page.locator('button:has-text("Zapisz")').click();

    // Verify version appears in list
    const versionItem = page.locator('.version-list li').filter({ hasText: 'Snapshot-1.0' });
    await expect(versionItem).toBeVisible();

    // Click Restore button on version
    const restoreBtn = versionItem.locator('button:has-text("Przywróć")');
    await restoreBtn.click();

    // Modal dialog must open for confirmation
    const confirmDialog = page.locator('[data-testid="version-restore-modal"]');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText('Przywrócić wersję dokumentu?');
    await expect(confirmDialog).toContainText('Snapshot-1.0');

    // Cancel restore
    await confirmDialog.locator('button:has-text("Anuluj")').click();
    await expect(confirmDialog).toBeHidden();
  });

  test('SAAS-017: offline indicator in status bar', async ({ page }) => {
    const syncStatus = page.locator('[data-testid="status-bar-sync"]');
    await expect(syncStatus).toBeVisible();

    // Simulate going offline
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Status bar shows offline indicator
    await expect(syncStatus).toContainText('Offline (IndexedDB)');

    // Simulate coming back online
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(syncStatus).toContainText('Saved locally');
  });
});
