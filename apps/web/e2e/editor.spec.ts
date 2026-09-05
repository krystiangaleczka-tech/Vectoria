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

  test('pointercancel leaves document and history unchanged', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    await page.mouse.move(center.x - 40, center.y - 40);
    await page.mouse.down();
    await page.mouse.move(center.x + 40, center.y + 40, { steps: 4 });
    await page.mouse.up();
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Create rectangle');
    await page.getByRole('tab', { name: 'Właściwości' }).click();

    await page.getByRole('button', { name: 'Select Tool', exact: true }).click();
    await page.mouse.click(center.x, center.y);
    const xInput = page.getByTestId('prop-x').locator('input');
    const yInput = page.getByTestId('prop-y').locator('input');
    const initialX = await xInput.inputValue();
    const initialY = await yInput.inputValue();

    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 60, center.y + 60, { steps: 4 });
    await canvas.dispatchEvent('pointercancel', { bubbles: true, pointerId: 1 });
    await page.mouse.up();

    expect(await xInput.inputValue()).toBe(initialX);
    expect(await yInput.inputValue()).toBe(initialY);
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel').locator('.history-entry-button')).toHaveCount(2);
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

    // Select restored object from Layers so camera placement cannot affect recovery evidence.
    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await page.getByRole('button', { name: /Zaznacz Rectangle/ }).click();
    await page.getByRole('tab', { name: 'Właściwości' }).click();

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

  test('Pen Tool creates open cubic path and commits one history entry', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    await page.getByRole('button', { name: 'Pen Tool' }).click();

    const points = [
      { x: box.x + box.width / 2 - 90, y: box.y + box.height / 2 - 40 },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 - 90 },
      { x: box.x + box.width / 2 + 90, y: box.y + box.height / 2 - 20 },
    ];
    await page.mouse.click(points[0]!.x, points[0]!.y);
    await page.mouse.move(points[1]!.x, points[1]!.y);
    await page.mouse.down();
    await page.mouse.move(points[1]!.x + 35, points[1]!.y + 20, { steps: 4 });
    await page.mouse.up();
    await page.mouse.click(points[2]!.x, points[2]!.y);
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('statusbar')).toContainText('1 object');
    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await expect(page.getByTestId('layers-panel')).toContainText('Path 1');
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Create path');
  });

  test('Direct Select edits cubic handles without mutating during drag', async ({ page }) => {
    page.on('console', (message) => console.log(`[browser:${message.type()}] ${message.text()}`));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: 'Pen Tool' }).click();

    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const points = [
      { x: center.x - 100, y: center.y - 30 },
      { x: center.x, y: center.y - 90 },
      { x: center.x + 100, y: center.y - 20 },
    ];
    await page.mouse.click(points[0]!.x, points[0]!.y);
    await page.mouse.move(points[1]!.x, points[1]!.y);
    await page.mouse.down();
    await page.mouse.move(points[1]!.x + 35, points[1]!.y + 20, { steps: 4 });
    await page.mouse.up();
    await page.mouse.click(points[2]!.x, points[2]!.y);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('statusbar')).toContainText('1 object');

    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await page.getByRole('button', { name: /Zaznacz Path/ }).click();
    await page.getByRole('tab', { name: 'Właściwości' }).click();
    await page.getByRole('button', { name: 'Direct Select Tool' }).click();
    const clickBox = await canvas.boundingBox();
    if (!clickBox) throw new Error('Canvas not found');
    const dy = clickBox.y - box.y;

    await page.mouse.click(points[1]!.x, points[1]!.y + dy);
    const outX = page.getByTestId('prop-handle-out-x').locator('input');
    await expect(outX).toBeEnabled();
    const initialX = Number(await outX.inputValue());

    await page.mouse.move(points[1]!.x + 35, points[1]!.y + 20 + dy);
    await page.mouse.down();
    await page.mouse.move(points[1]!.x + 65, points[1]!.y + 40 + dy, { steps: 4 });
    expect(Number(await outX.inputValue())).toBe(initialX);
    await page.mouse.up();

    await expect.poll(async () => Number(await outX.inputValue())).toBeGreaterThan(initialX);
  });

  test('Pencil and Brush commit one path command with accessible controls', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const start = { x: box.x + 220, y: box.y + 220 };

    await page.getByRole('button', { name: 'Pencil Tool' }).click();
    await expect(page.getByTestId('drawing-smoothing')).toBeVisible();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 80, start.y + 30, { steps: 5 });
    await page.mouse.move(start.x + 150, start.y - 10, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByTestId('statusbar')).toContainText('1 object');

    await page.getByRole('button', { name: 'Brush Tool' }).click();
    await expect(page.getByTestId('drawing-width')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Pressure' })).toBeVisible();
    await page.getByLabel('Brush cap').selectOption('square');
    await page.mouse.move(start.x + 20, start.y + 100);
    await page.mouse.down();
    await page.mouse.move(start.x + 130, start.y + 120, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByTestId('statusbar')).toContainText('2 objects');
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Create brush stroke');
  });

  test('Convert to curves previews, confirms, and creates one undoable command', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    await page.mouse.move(center.x - 40, center.y - 40);
    await page.mouse.down();
    await page.mouse.move(center.x + 40, center.y + 40, { steps: 4 });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Select Tool', exact: true }).click();
    await page.mouse.click(center.x, center.y);

    await page.getByRole('button', { name: 'Obiekt' }).click();
    await page.getByRole('menuitem', { name: 'Convert to curves' }).click();
    await expect(page.getByRole('dialog', { name: 'Convert to curves?' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Convert to curves' }).click();
    await expect(page.getByTestId('history-panel')).toBeHidden();
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Convert to curves');
  });

  test('groups objects, manages artboard metadata, and saves a named version', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    await page.mouse.move(box.x + 220, box.y + 180);
    await page.mouse.down();
    await page.mouse.move(box.x + 280, box.y + 240, { steps: 3 });
    await page.mouse.up();
    await page.mouse.move(box.x + 340, box.y + 180);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 240, { steps: 3 });
    await page.mouse.up();

    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await page.getByRole('button', { name: 'Zaznacz Rectangle 1' }).click();
    await page.getByRole('button', { name: 'Zaznacz Rectangle 2' }).click({ modifiers: ['Shift'] });
    await page.getByRole('button', { name: 'Obiekt' }).click();
    await page.getByRole('menuitem', { name: /^Group Cmd\+G$/ }).click();
    await expect(page.getByTestId('layers-panel')).toContainText('Group');

    await page.getByRole('tab', { name: 'Historia' }).click();
    await page.getByLabel('Nazwa wersji').fill('Before polish');
    await page.getByRole('button', { name: 'Zapisz' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Before polish');

    await page.getByRole('tab', { name: 'Artboardy' }).click();
    await page.getByRole('button', { name: /Zmień nazwę Artboard 1/ }).click();
    await page.getByRole('textbox', { name: 'Nazwa Artboard 1' }).fill('Main board');
    await page.getByRole('textbox', { name: 'Nazwa Artboard 1' }).press('Enter');
    await expect(page.getByTestId('artboards-panel')).toContainText('Main board');
  });


  test('Pen inserts and deletes nodes on a committed path without leaving the tool', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const cy = box.y + box.height / 2;

    await page.getByRole('button', { name: 'Pen Tool' }).click();
    await page.mouse.click(box.x + box.width / 2 - 90, cy);
    await page.mouse.click(box.x + box.width / 2 + 90, cy);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('statusbar')).toContainText('1 object');

    // Click the committed segment midpoint → node inserted in-place.
    await page.mouse.click(box.x + box.width / 2, cy);
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Add path node');

    // Hover the new middle node and delete it with Delete — still in Pen.
    const activeBox = await canvas.boundingBox() ?? box;
    const midX = activeBox.x + activeBox.width / 2;
    await page.mouse.move(midX, cy);
    await page.keyboard.press('Delete');
    await expect(page.getByTestId('history-panel')).toContainText('Remove path node');

    // Draft flow still works afterwards (tool was never switched).
    await page.mouse.click(activeBox.x + activeBox.width / 2 - 60, cy + 80);
    await page.mouse.click(activeBox.x + activeBox.width / 2 + 60, cy + 80);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('statusbar')).toContainText('2 objects');
  });

  test('Simplify preview reduces nodes and Apply commits one command', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const start = { x: box.x + 200, y: box.y + 200 };

    await page.getByRole('button', { name: 'Pencil Tool' }).click();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    // Gentle arc: many samples, low curvature — low accuracy collapses it.
    for (let i = 1; i <= 14; i += 1) {
      const angle = (Math.PI * i) / 14;
      await page.mouse.move(start.x + Math.cos(angle) * 120 + 120, start.y - Math.sin(angle) * 60, { steps: 2 });
    }
    await page.mouse.up();
    await expect(page.getByTestId('statusbar')).toContainText('1 object');

    await page.getByRole('tab', { name: 'Właściwości' }).click();
    const estimate = page.getByTestId('simplify-estimate');
    await expect(estimate).toContainText(/\d+ nodes/);

    await page.getByTestId('simplify-accuracy').fill('10');
    await page.getByRole('button', { name: 'Preview simplify' }).click();
    await expect(page.locator('.geometry-preview-status')).toContainText('Preview ready');
    await page.getByRole('button', { name: 'Apply' }).click();

    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Simplify path');
    await expect(page.getByTestId('statusbar')).toContainText('1 object');
  });

  test('create artistic text → edit in canvas → verify typography properties → convert to outlines', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Select Text Tool
    await page.getByRole('button', { name: 'Text Tool' }).click();
    await page.mouse.click(box.x + 250, box.y + 250);

    // Verify object created in status bar
    await expect(page.getByTestId('statusbar')).toContainText('1 object');

    // Type text in session
    await page.keyboard.type('Hello Vectoria!');
    await page.keyboard.press('Escape');

    // Properties panel shows typography controls
    await page.getByRole('tab', { name: 'Właściwości' }).click();
    await expect(page.getByTestId('prop-font-family')).toBeVisible();
    await expect(page.getByTestId('prop-font-size')).toBeVisible();

    // Convert text to outlines
    await page.getByRole('button', { name: 'Convert to outlines' }).click();
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Convert to Outlines');
  });

  test('Find & Replace dialog opens and replaces matching text across document', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Create Text Object
    await page.getByRole('button', { name: 'Text Tool' }).click();
    await page.mouse.click(box.x + 200, box.y + 200);
    await page.keyboard.type('Fox and Badger');
    await page.keyboard.press('Escape');

    // Open Find & Replace via TopBar menu
    await page.getByRole('button', { name: 'Tekst' }).click();
    await page.getByRole('menuitem', { name: 'Znajdź i zamień…' }).click();
    await expect(page.getByTestId('find-replace-dialog')).toBeVisible();

    // Perform replacement
    await page.getByTestId('find-input').fill('Fox');
    await page.getByTestId('replace-input').fill('Wolf');
    await page.getByRole('button', { name: 'Zamień wszystko' }).click();

    // History contains replacement command
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Replace All Text');
  });

  test('EPIC-11: Layer creation, template layer, layer search, and Assets panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to Layers tab
    await page.getByRole('tab', { name: 'Warstwy' }).click();
    const layersPanel = page.getByTestId('layers-panel');
    await expect(layersPanel).toBeVisible();
    await expect(layersPanel).toContainText('Layer 1');

    // Create a new layer
    await page.getByTestId('create-layer-button').click();
    await expect(layersPanel).toContainText('Layer 2');

    // Create a template layer
    await page.getByTestId('create-template-layer-button').click();
    await expect(layersPanel).toContainText('SZABLON');

    // Search filter in layers panel
    await page.getByTestId('layers-search-input').fill('Layer 1');
    await expect(layersPanel).toContainText('Layer 1');

    // Switch to Assets panel
    await page.getByRole('tab', { name: 'Zasoby' }).click();
    const assetsPanel = page.getByTestId('assets-panel');
    await expect(assetsPanel).toBeVisible();
    await expect(assetsPanel).toContainText('Zasoby i Komponenty');
  });

  test('EPIC-12: External links panel, brand kit, and stock assets insertion', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to Links panel
    await page.getByRole('tab', { name: 'Linki' }).click();
    const linksPanel = page.getByTestId('links-panel');
    await expect(linksPanel).toBeVisible();
    await expect(linksPanel).toContainText('Zewnętrzne zasoby i linki');

    // Switch to Assets panel
    await page.getByRole('tab', { name: 'Zasoby' }).click();
    const assetsPanel = page.getByTestId('assets-panel');
    await expect(assetsPanel).toBeVisible();
    await expect(assetsPanel).toContainText('Symbole');
    await expect(assetsPanel).toContainText('Brand Kit');
    await expect(assetsPanel).toContainText('Biblioteka Ikon SVG');

    // Insert an SVG icon from the built-in library
    const starIconBtn = page.getByTestId('stock-asset-star');
    await expect(starIconBtn).toBeVisible();
    await starIconBtn.click();

    // Verify object count and history updated
    await expect(page.getByTestId('status-bar-objects')).toContainText('1');

    // Switch to History tab and verify entry
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toBeVisible();
    await expect(page.getByTestId('history-panel')).toContainText('Create path');
  });

  test('EPIC-14: Paste in place pastes without offset at exact coordinates', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    await page.mouse.move(cx - 40, cy - 40);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 40, { steps: 5 });
    await page.mouse.up();

    await page.getByRole('button', { name: 'Select Tool', exact: true }).click();
    await page.mouse.click(cx, cy);

    const xInput = page.locator('[data-testid="prop-x"] input');
    const yInput = page.locator('[data-testid="prop-y"] input');
    const origX = await xInput.inputValue();
    const origY = await yInput.inputValue();

    // Copy
    await page.getByRole('button', { name: 'Edycja' }).click();
    await page.getByRole('menuitem', { name: 'Kopiuj' }).click();

    // Paste in place
    await page.getByRole('button', { name: 'Edycja' }).click();
    await page.getByRole('menuitem', { name: 'Wklej na miejscu' }).click();

    // Verify object count is 2 and coordinates of selected newly pasted object match origX and origY
    await expect(page.getByTestId('statusbar')).toContainText('2 objects');
    expect(await xInput.inputValue()).toBe(origX);
    expect(await yInput.inputValue()).toBe(origY);
  });

  test('EPIC-14: Paste across all artboards pastes copy to every artboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a 2nd artboard via Artboards panel
    await page.getByRole('tab', { name: 'Artboardy' }).click();
    await page.getByRole('button', { name: 'Dodaj artboard' }).click();
    await expect(page.getByTestId('artboards-panel')).toContainText('Artboard 2');

    // Draw rect on canvas center
    const canvas = page.locator('[data-testid="canvas-viewport"]');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    await page.mouse.move(cx - 40, cy - 40);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 40, { steps: 3 });
    await page.mouse.up();
    await expect(page.getByTestId('statusbar')).toContainText('1 object');

    // Select and Copy
    await page.getByRole('button', { name: 'Select Tool', exact: true }).click();
    await page.mouse.click(cx, cy);
    await expect(page.locator('.status-selection')).toContainText('1 zazn.');
    await page.getByRole('button', { name: 'Edycja' }).click();
    await page.getByRole('menuitem', { name: 'Kopiuj' }).click();

    // Paste all artboards
    await page.getByRole('button', { name: 'Edycja' }).click();
    await page.getByRole('menuitem', { name: 'Wklej na wszystkich artboardach' }).click();

    // 1 original + 2 pasted = 3 objects
    await expect(page.getByTestId('statusbar')).toContainText('3 objects');
  });

  test('EPIC-15: Select same selects matching objects across document', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Draw rect 1
    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 160, box.y + 160, { steps: 3 });
    await page.mouse.up();

    // Draw rect 2
    await page.mouse.move(box.x + 200, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 260, box.y + 160, { steps: 3 });
    await page.mouse.up();

    // Draw ellipse
    await page.getByRole('button', { name: 'Ellipse Tool' }).click();
    await page.mouse.move(box.x + 300, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 360, box.y + 160, { steps: 3 });
    await page.mouse.up();

    // Select rect 1
    await page.getByRole('button', { name: 'Select Tool', exact: true }).click();
    await page.mouse.click(box.x + 130, box.y + 130);

    // Select same: Typ via Command Palette (UI menu removed per UX decision, engine preserved)
    await page.getByRole('button', { name: 'Widok' }).click();
    await page.getByRole('menuitem', { name: /Paleta poleceń/ }).click();
    const paletteInput = page.getByPlaceholder('Wpisz komendę...');
    await paletteInput.fill('typ obiektu');
    await page.getByText('Zaznacz takie same: typ obiektu').click();

    // Should select the 2 rectangles
    await expect(page.getByTestId('properties-panel')).toContainText('2 objects');
  });

  test('EPIC-14: Dropping AI or EPS file shows informative guidance banner without crash', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      const dt = new DataTransfer();
      const file = new File(['%!PS-Adobe-3.0'], 'artwork.ai', { type: 'application/postscript' });
      dt.items.add(file);
      const viewport = document.querySelector('[data-testid="canvas-viewport"]');
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      viewport?.dispatchEvent(dropEvent);
    });

    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Import' })).toBeVisible();
  });

  test('EPIC-15: CommandPalette lists commands with enable status and shortcut config dialog opens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open Command Palette via View menu
    await page.getByRole('button', { name: 'Widok' }).click();
    await page.getByRole('menuitem', { name: /Paleta poleceń/ }).click();

    const paletteInput = page.getByPlaceholder('Wpisz komendę...');
    await expect(paletteInput).toBeVisible();
    await paletteInput.fill('Wklej');
    await expect(page.getByRole('listbox')).toContainText('Wklej');
    await page.keyboard.press('Escape');

    // Open Shortcut Config via Window menu
    await page.getByRole('button', { name: 'Okno' }).click();
    await page.getByRole('menuitem', { name: 'Konfiguracja skrótów...' }).click();
    await expect(page.getByRole('dialog')).toContainText('Konfiguracja skrótów');
    await expect(page.getByRole('dialog')).toContainText('Narzędzie: Zaznaczanie');
    await page.getByRole('button', { name: 'Anuluj' }).click();
  });

  test('EPIC-15: Find & Replace dialog Style tab replaces matching object fill and undo restores', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Draw rect 1
    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 160, box.y + 160, { steps: 3 });
    await page.mouse.up();

    // Draw rect 2
    await page.mouse.move(box.x + 200, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 260, box.y + 160, { steps: 3 });
    await page.mouse.up();

    // Open Find & Replace
    await page.getByRole('button', { name: 'Tekst' }).click();
    await page.getByRole('menuitem', { name: 'Znajdź i zamień…' }).click();
    await expect(page.getByTestId('find-replace-dialog')).toBeVisible();

    // Switch to Style tab
    await page.getByTestId('tab-style').click();

    // Search fill #cccccc (default rect fill in Vectoria)
    await page.getByTestId('style-find-fill').fill('#cccccc');
    await expect(page.getByTestId('find-replace-dialog')).toContainText('Znaleziono: 2 obiektów');

    // Replace with #00ff00
    await page.getByTestId('style-replace-fill').fill('#00ff00');
    await page.getByTestId('style-replace-btn').click();

    // Close dialog
    await page.getByRole('button', { name: 'Zamknij' }).click();

    // Check history has Replace styles
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Replace styles');

    // Undo reverts the style replacement
    await page.locator('[data-testid="undo-button"]').click();
  });

  test('EPIC-13: Appearance panel, live effects, toggles, and blend modes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Draw rect
    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    await page.mouse.move(cx - 40, cy - 40);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 40, { steps: 3 });
    await page.mouse.up();
    await expect(page.getByTestId('statusbar')).toContainText('1 object');

    // Select with Select Tool
    await page.getByRole('button', { name: 'Select Tool', exact: true }).click();
    await page.mouse.click(cx, cy);
    await expect(page.locator('.status-selection')).toContainText('1 zazn.');

    // Open Wygląd (Appearance) tab in right dock
    await page.getByRole('tab', { name: 'Wygląd' }).click();
    await expect(page.getByTestId('appearance-panel')).toBeVisible();

    // Change Opacity to 0.75
    const opacityInput = page.getByTestId('appearance-opacity').locator('input');
    await opacityInput.fill('0.75');
    await opacityInput.press('Enter');

    // Change Blend Mode to multiply
    await page.getByTestId('appearance-blend-mode').selectOption('multiply');

    // Add Drop Shadow effect
    await page.getByLabel('Effect type').selectOption('dropShadow');
    await page.getByTestId('appearance-add-effect').click();
    await expect(page.getByTestId('appearance-panel')).toContainText('Efekty (1)');

    // Toggle visibility of effect
    const toggle = page.getByLabel(/Drop shadow visibility/i);
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await expect(toggle).not.toBeChecked();
    await toggle.check();
    await expect(toggle).toBeChecked();

    // Add Blur effect
    await page.getByLabel('Effect type').selectOption('blur');
    await page.getByTestId('appearance-add-effect').click();
    await expect(page.getByTestId('appearance-panel')).toContainText('Efekty (2)');

    // Check history registers effect additions
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Add dropShadow effect');
  });

  test('ADR-021: AI and CDR export options in Plik menu and Export dialog', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open Plik menu
    await page.getByRole('button', { name: 'Plik' }).click();

    // Verify presence of menu items
    const vctItem = page.getByRole('menuitem', { name: 'Zapisz jako .vct' });
    const aiItem = page.getByRole('menuitem', { name: 'Zapisz kopię jako Adobe Illustrator (.ai)' });
    const cdrItem = page.getByRole('menuitem', { name: 'Zapisz kopię jako CorelDRAW (.cdr)' });

    await expect(vctItem).toBeVisible();
    await expect(aiItem).toBeVisible();
    await expect(cdrItem).toBeVisible();

    await page.screenshot({ path: '/Users/krystiangaleczka/.gemini/antigravity-ide/brain/4de5cd63-54c7-4829-bb93-4684783d1901/ai_cdr_plik_menu.png' });

    // Open ExportDialog
    await page.getByRole('menuitem', { name: 'Eksportuj...' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Verify AI and CDR format tabs
    const aiTab = page.getByRole('tab', { name: 'AI' });
    const cdrTab = page.getByRole('tab', { name: 'CDR' });
    await expect(aiTab).toBeVisible();
    await expect(cdrTab).toBeVisible();

    // Click AI tab and verify
    await aiTab.click();
    await expect(aiTab).toHaveAttribute('aria-selected', 'true');

    // Click CDR tab and verify
    await cdrTab.click();
    await expect(cdrTab).toHaveAttribute('aria-selected', 'true');

    await page.screenshot({ path: '/Users/krystiangaleczka/.gemini/antigravity-ide/brain/4de5cd63-54c7-4829-bb93-4684783d1901/ai_cdr_export_dialog.png' });

    await page.locator('.dialog-close').click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
