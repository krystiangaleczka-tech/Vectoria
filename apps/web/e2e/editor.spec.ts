import { test, expect } from '@playwright/test';

test.describe('Vectoria MVP Skeleton', () => {
  test('should load the editor and initialize properly', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Vectoria/i);

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    await expect(canvas).toBeVisible();

    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propertiesPanel).toBeVisible();

    const rectangleTool = page.locator('button[title="Rectangle Tool (R)"]');
    await expect(rectangleTool).toBeVisible();
  });

  test('workspace navigation closes menus and layers select document objects', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Plik' }).click();
    await expect(page.getByRole('menuitem', { name: 'Eksportuj SVG' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem', { name: 'Eksportuj SVG' })).toBeHidden();

    await page.getByRole('button', { name: 'Okno' }).click();
    await page.getByRole('menuitem', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Okno' }).click();
    await page.getByRole('menuitem', { name: 'Ukryj dock' }).click();
    await expect(page.getByTestId('right-dock')).toBeHidden();
    await page.getByRole('button', { name: 'Okno' }).click();
    await page.getByRole('menuitem', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toBeVisible();

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;
    await page.mouse.move(cx - 35, cy - 35);
    await page.mouse.down();
    await page.mouse.move(cx + 35, cy + 35, { steps: 5 });
    await page.mouse.up();

    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await expect(page.getByTestId('layers-panel')).toContainText('Rectangle 1');
    await page.getByRole('button', { name: 'Zaznacz Rectangle 1' }).click();
    await page.getByRole('tab', { name: 'Właściwości' }).click();
    await expect(page.getByTestId('properties-panel')).toContainText('Object Properties');
  });

  test('draw rectangle → select → drag → verify position changes → undo → redo', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    await expect(canvas).toBeVisible();

    // Select rectangle tool
    const rectTool = page.locator('button[title="Rectangle Tool (R)"]');
    await rectTool.click();

    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;

    // Draw a rectangle by dragging
    await page.mouse.move(cx - 50, cy - 50);
    await page.mouse.down();
    await page.mouse.move(cx + 50, cy + 50, { steps: 10 });
    await page.mouse.up();

    // Switch to select tool
    const selectTool = page.locator('button[title="Select Tool (V)"]');
    await selectTool.click();

    // Click on the rectangle to select it
    await page.mouse.click(cx, cy);

    // Verify properties panel shows the rectangle with initial position
    const propsPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propsPanel).toContainText('Object Properties');

    const xInput = page.locator('[data-testid="prop-x"] input');
    const yInput = page.locator('[data-testid="prop-y"] input');
    
    const initialX = await xInput.inputValue();
    const initialY = await yInput.inputValue();

    // Drag the rectangle to move it
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    
    // Move but don't release yet - verify position hasn't changed (no doc mutation during drag)
    await page.mouse.move(cx + 50, cy + 50, { steps: 5 });
    
    // Position should still be initial (preview only, not committed)
    const xDuringDrag = await xInput.inputValue();
    const yDuringDrag = await yInput.inputValue();
    expect(xDuringDrag).toBe(initialX);
    expect(yDuringDrag).toBe(initialY);
    
    // Release mouse to commit the move
    await page.mouse.up();

    // Now position should have changed
    await expect.poll(async () => parseFloat(await xInput.inputValue())).toBeGreaterThan(parseFloat(initialX));
    await expect.poll(async () => parseFloat(await yInput.inputValue())).toBeGreaterThan(parseFloat(initialY));
    const newX = await xInput.inputValue();
    const newY = await yInput.inputValue();

    // Undo the move through toolbar action.
    await page.locator('[data-testid="undo-button"]').click();

    // Verify rectangle is back at original position
    await expect.poll(() => xInput.inputValue()).toBe(initialX);
    await expect.poll(() => yInput.inputValue()).toBe(initialY);

    // Redo the move through toolbar action.
    await page.locator('[data-testid="redo-button"]').click();

    // Verify rectangle moved again
    await expect.poll(() => xInput.inputValue()).toBe(newX);
    await expect.poll(() => yInput.inputValue()).toBe(newY);
  });

  test('history panel exposes current cursor and jumps without direct document mutation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    await page.locator('button[title="Rectangle Tool (R)"]').click();
    await page.mouse.move(canvasBox.x + 240, canvasBox.y + 180);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 300, canvasBox.y + 240, { steps: 4 });
    await page.mouse.up();

    await page.getByRole('tab', { name: 'Historia' }).click();
    const historyPanel = page.getByTestId('history-panel');
    await expect(historyPanel).toContainText('Create rectangle');
    await expect(historyPanel.locator('[aria-current="step"]')).toContainText('Create rectangle');

    await historyPanel.getByRole('button', { name: 'Stan początkowy' }).click();
    await expect(historyPanel.locator('[aria-current="step"]')).toContainText('Stan początkowy');
    await expect(page.getByTestId('statusbar')).toContainText('0 objects');

    await historyPanel.getByRole('button', { name: 'Create rectangle' }).click();
    await expect(historyPanel.locator('[aria-current="step"]')).toContainText('Create rectangle');
  });

  test('SVG export contains correct structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    await expect(canvas).toBeVisible();

    const rectTool = page.locator('button[title="Rectangle Tool (R)"]');
    await rectTool.click();

    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;

    await page.mouse.move(cx - 30, cy - 30);
    await page.mouse.down();
    await page.mouse.move(cx + 30, cy + 30, { steps: 5 });
    await page.mouse.up();

    // Set up download interception
    const downloadPromise = page.waitForEvent('download');

    // Click export SVG button
    const exportBtn = page.locator('[data-testid="export-svg-button"]');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Verify download was triggered and contains correct SVG structure
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.svg$/i);

    // Read the downloaded file content
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    
    await new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    const svgContent = Buffer.concat(chunks).toString('utf-8');

    // Verify SVG structure
    expect(svgContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('viewBox="0 0');
    expect(svgContent).toContain('<rect');
    expect(svgContent).toContain('width="');
    expect(svgContent).toContain('height="');
    expect(svgContent).toContain('transform="matrix(');
  });

  test('autosave: document persists after page reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    await expect(canvas).toBeVisible();

    // Draw a rectangle
    const rectTool = page.locator('button[title="Rectangle Tool (R)"]');
    await rectTool.click();

    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;

    await page.mouse.move(cx - 40, cy - 40);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 40, { steps: 5 });
    await page.mouse.up();

    // Verify object count is 1
    const statusbar = page.locator('[data-testid="statusbar"]');
    await expect(statusbar).toContainText('1 object');

    // Wait for autosave (debounced at 700ms)
    await page.waitForTimeout(1500);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify the editor loaded with the saved document
    await expect(canvas).toBeVisible();

    // Verify object count is still 1 after reload
    await expect(statusbar).toContainText('1 object');

    // Switch to select tool and click where the rectangle was
    const selectTool = page.locator('button[title="Select Tool (V)"]');
    await selectTool.click();
    await page.mouse.click(cx, cy);

    // Verify properties panel shows the rectangle (proves it was saved and restored)
    const propsPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propsPanel).toContainText('Object Properties');
    
    // Verify X and Y inputs have values (not empty)
    const xInput = page.locator('[data-testid="prop-x"] input');
    const yInput = page.locator('[data-testid="prop-y"] input');
    
    const xValue = await xInput.inputValue();
    const yValue = await yInput.inputValue();
    
    expect(xValue).not.toBe('');
    expect(yValue).not.toBe('');
    expect(parseFloat(xValue)).toBeGreaterThan(0);
    expect(parseFloat(yValue)).toBeGreaterThan(0);
  });
});
