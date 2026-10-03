import { expect, test, type Locator, type Page } from '@playwright/test';

type ToolId =
  | 'select'
  | 'direct-select'
  | 'lasso'
  | 'node-lasso'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'star'
  | 'arc'
  | 'pie'
  | 'ring'
  | 'spiral'
  | 'callout'
  | 'polyline'
  | 'pen'
  | 'pencil'
  | 'brush'
  | 'smooth'
  | 'corner'
  | 'eraser'
  | 'knife'
  | 'scissors'
  | 'width'
  | 'text'
  | 'eyedropper'
  | 'bucket'
  | 'hand'
  | 'zoom';

type CancelReason = 'escape' | 'pointercancel' | 'lostpointercapture' | 'tool-switch';

const ALL_TOOLS: readonly ToolId[] = [
  'select', 'direct-select', 'lasso', 'node-lasso',
  'rectangle', 'ellipse', 'line', 'polygon', 'star', 'arc', 'pie', 'ring', 'spiral', 'callout', 'polyline',
  'pen', 'pencil', 'brush', 'smooth', 'corner', 'eraser', 'knife', 'scissors', 'width',
  'text', 'eyedropper', 'bucket', 'hand', 'zoom',
];

const DRAG_SHAPES: readonly ToolId[] = [
  'rectangle', 'ellipse', 'line', 'polygon', 'star', 'arc', 'pie', 'ring', 'spiral', 'callout',
];

const BLANK_DRAG_SESSIONS: readonly ToolId[] = [
  'lasso', 'node-lasso', 'pencil', 'brush', 'eraser', 'knife', 'scissors', 'text', 'eyedropper', 'bucket', 'hand',
];

const MULTI_CLICK_DRAFTS: readonly ToolId[] = ['pen', 'polyline'];
const SELECTED_PATH_SESSIONS: readonly ToolId[] = ['direct-select', 'smooth', 'corner', 'width'];

async function viewport(page: Page) {
  const canvas = page.getByTestId('canvas-viewport');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas viewport bounding box unavailable');
  return { canvas, box };
}

async function historyCount(page: Page): Promise<number> {
  await page.getByRole('tab', { name: 'Historia' }).click();
  const entries = page.getByTestId('history-panel').locator('.history-entry-button');
  const count = await entries.count();
  await page.getByRole('tab', { name: 'Właściwości' }).click();
  return count;
}

async function objectCount(page: Page): Promise<number> {
  const text = await page.getByTestId('statusbar').innerText();
  const match = text.match(/(\d+)\s+objects?/i);
  if (!match) throw new Error(`Object count not found in status bar: ${text}`);
  return Number.parseInt(match[1]!, 10);
}

async function readNumber(control: Locator): Promise<number> {
  return Number.parseFloat(await control.locator('input').inputValue());
}

async function activate(page: Page, tool: ToolId): Promise<void> {
  await page.getByTestId(`tool-${tool}`).click();
  await expect(page.getByTestId('canvas-viewport')).toHaveAttribute('data-tool', tool);
}

async function blankDrag(page: Page): Promise<void> {
  const { box } = await viewport(page);
  await page.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.68);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.76, { steps: 4 });
}

async function shapeDrag(page: Page): Promise<void> {
  const { box } = await viewport(page);
  await page.mouse.move(box.x + box.width * 0.34, box.y + box.height * 0.34);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.48, { steps: 4 });
}

async function cancelActivePointer(page: Page, reason: CancelReason, switchTo: ToolId = 'select'): Promise<void> {
  const { canvas } = await viewport(page);
  if (reason === 'escape') {
    await page.keyboard.press('Escape');
  } else if (reason === 'pointercancel') {
    await canvas.dispatchEvent('pointercancel', { bubbles: true, pointerId: 1 });
  } else if (reason === 'lostpointercapture') {
    await canvas.dispatchEvent('lostpointercapture', { bubbles: true, pointerId: 1 });
  } else {
    await page.getByTestId(`tool-${switchTo}`).dispatchEvent('click');
    await expect(canvas).toHaveAttribute('data-tool', switchTo);
  }
  await page.mouse.up();
}

async function createSelectedRectangle(page: Page) {
  const { box } = await viewport(page);
  const start = { x: box.x + box.width / 2 - 60, y: box.y + box.height / 2 - 40 };
  await activate(page, 'rectangle');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 120, start.y + 80, { steps: 4 });
  await page.mouse.up();
  await activate(page, 'select');
  const propX = page.getByTestId('prop-x');
  await expect(propX).toBeVisible();
  return {
    center: { x: start.x + 60, y: start.y + 40 },
    propX,
    undo: page.getByTestId('undo-button'),
    redo: page.getByTestId('redo-button'),
  };
}

async function createSelectedPath(page: Page) {
  const { box } = await viewport(page);
  const p1 = { x: box.x + box.width / 2 - 90, y: box.y + box.height / 2 };
  const p2 = { x: box.x + box.width / 2 + 90, y: box.y + box.height / 2 };
  await activate(page, 'pen');
  await page.mouse.click(p1.x, p1.y);
  await page.mouse.click(p2.x, p2.y);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('statusbar')).toContainText('1 object');
  await activate(page, 'select');
  await expect(page.locator('.status-selection')).toContainText('1 zazn.');
  return { p1, p2, mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } };
}

async function startSelectedPathSession(page: Page, tool: ToolId, points: Awaited<ReturnType<typeof createSelectedPath>>): Promise<void> {
  await activate(page, tool);
  const start = tool === 'direct-select' ? points.p1 : points.mid;
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 36, start.y + 18, { steps: 4 });
}

async function assertNoDocumentMutation(page: Page, baselineObjects: number, baselineHistory: number): Promise<void> {
  await expect.poll(() => objectCount(page)).toBe(baselineObjects);
  await expect.poll(() => historyCount(page)).toBe(baselineHistory);
}

test.describe('TASK-VEC-005: 29-tool lifecycle regression matrix', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('registry covers exactly the 29 Tool Rail tools and idle Escape never changes the document', async ({ page }) => {
    const railTools = page.getByTestId('tool-rail').locator('[data-tool]');
    await expect(railTools).toHaveCount(29);
    expect(new Set(ALL_TOOLS).size).toBe(29);

    const baselineHistory = await historyCount(page);
    for (const tool of ALL_TOOLS) {
      await activate(page, tool);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('canvas-viewport')).toHaveAttribute('data-tool', tool);
      await expect.poll(() => objectCount(page)).toBe(0);
    }
    await expect.poll(() => historyCount(page)).toBe(baselineHistory);
  });

  test('all drag-created shape tools cancel on Escape, pointercancel, lost capture and tool switch', async ({ page }) => {
    test.setTimeout(120_000);
    const baselineHistory = await historyCount(page);
    const reasons: readonly CancelReason[] = ['escape', 'pointercancel', 'lostpointercapture', 'tool-switch'];

    for (const tool of DRAG_SHAPES) {
      for (const reason of reasons) {
        await activate(page, tool);
        await shapeDrag(page);
        await cancelActivePointer(page, reason);
        await expect.poll(() => objectCount(page)).toBe(0);
      }
    }

    await expect.poll(() => historyCount(page)).toBe(baselineHistory);
  });

  test('blank drag/session tools cancel without committing document history', async ({ page }) => {
    test.setTimeout(120_000);
    const baselineHistory = await historyCount(page);

    for (const tool of BLANK_DRAG_SESSIONS) {
      for (const reason of ['escape', 'pointercancel', 'lostpointercapture', 'tool-switch'] as const) {
        await activate(page, tool);
        await blankDrag(page);
        await cancelActivePointer(page, reason, tool === 'select' ? 'rectangle' : 'select');
        await expect.poll(() => objectCount(page)).toBe(0);
      }
    }

    await expect.poll(() => historyCount(page)).toBe(baselineHistory);
  });

  test('Pen and Polyline drafts cancel through Escape, pointer lifecycle and tool switch', async ({ page }) => {
    const { box, canvas } = await viewport(page);
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const baselineHistory = await historyCount(page);

    for (const tool of MULTI_CLICK_DRAFTS) {
      await activate(page, tool);
      await page.mouse.click(point.x, point.y);
      await page.keyboard.press('Escape');
      await assertNoDocumentMutation(page, 0, baselineHistory);

      await activate(page, tool);
      await page.mouse.click(point.x, point.y);
      await canvas.dispatchEvent('pointercancel', { bubbles: true, pointerId: 1 });
      await assertNoDocumentMutation(page, 0, baselineHistory);

      await activate(page, tool);
      await page.mouse.click(point.x, point.y);
      await canvas.dispatchEvent('lostpointercapture', { bubbles: true, pointerId: 1 });
      await assertNoDocumentMutation(page, 0, baselineHistory);

      await activate(page, tool);
      await page.mouse.click(point.x, point.y);
      await page.getByTestId('tool-select').click();
      await assertNoDocumentMutation(page, 0, baselineHistory);
    }
  });

  test('Select move is reverted on tool switch and cancelled preview adds no Undo step', async ({ page }) => {
    const { center, propX, undo, redo } = await createSelectedRectangle(page);
    const beforeX = await readNumber(propX);
    const baselineHistory = await historyCount(page);

    await activate(page, 'select');
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 80, center.y + 20, { steps: 5 });
    await page.getByTestId('tool-rectangle').dispatchEvent('click');
    await expect(page.getByTestId('canvas-viewport')).toHaveAttribute('data-tool', 'rectangle');
    await page.mouse.up();

    await activate(page, 'select');
    await expect.poll(() => readNumber(propX)).toBe(beforeX);
    await expect(page.locator('.status-selection')).toContainText('1 zazn.');
    await expect.poll(() => historyCount(page)).toBe(baselineHistory);

    await undo.click();
    await expect.poll(() => objectCount(page)).toBe(0);
    await redo.click();
    await expect.poll(() => objectCount(page)).toBe(1);
    await expect.poll(() => readNumber(propX)).toBe(beforeX);
  });

  test('Direct Select, Smooth, Corner and Width tool-switch cancellation preserve the selected path and history', async ({ page }) => {
    test.setTimeout(90_000);
    const points = await createSelectedPath(page);
    const baselineHistory = await historyCount(page);

    for (const tool of SELECTED_PATH_SESSIONS) {
      await startSelectedPathSession(page, tool, points);
      await page.getByTestId('tool-select').dispatchEvent('click');
      await page.mouse.up();
      await expect(page.locator('.status-selection')).toContainText('1 zazn.');
      await assertNoDocumentMutation(page, 1, baselineHistory);
    }
  });

  test('Direct Select node preview is reverted on pointercancel and lost pointer capture', async ({ page }) => {
    const points = await createSelectedPath(page);
    const baselineHistory = await historyCount(page);

    for (const reason of ['pointercancel', 'lostpointercapture'] as const) {
      await startSelectedPathSession(page, 'direct-select', points);
      await cancelActivePointer(page, reason);
      await expect(page.locator('.status-selection')).toContainText('1 zazn.');
      await assertNoDocumentMutation(page, 1, baselineHistory);
    }
  });

  test('Lasso tool switch cannot finalize stale selection after the new tool is active', async ({ page }) => {
    const { center } = await createSelectedRectangle(page);
    const baselineHistory = await historyCount(page);
    await expect(page.locator('.status-selection')).toContainText('1 zazn.');

    const { box } = await viewport(page);
    await activate(page, 'lasso');
    await page.mouse.move(box.x + 80, box.y + 80);
    await page.mouse.down();
    await page.mouse.move(box.x + 130, box.y + 80, { steps: 2 });
    await page.mouse.move(box.x + 130, box.y + 130, { steps: 2 });
    await page.mouse.move(box.x + 80, box.y + 130, { steps: 2 });
    await page.getByTestId('tool-select').dispatchEvent('click');
    await page.mouse.move(center.x + 10, center.y + 10, { steps: 2 });
    await page.mouse.up();

    await expect(page.locator('.status-selection')).toContainText('1 zazn.');
    await assertNoDocumentMutation(page, 1, baselineHistory);
  });

  test('Zoom remains one-shot and can immediately hand control back to Select without document history', async ({ page }) => {
    const { box } = await viewport(page);
    const baselineHistory = await historyCount(page);
    await activate(page, 'zoom');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await activate(page, 'select');
    await expect(page.getByTestId('canvas-viewport')).toHaveAttribute('data-tool', 'select');
    await assertNoDocumentMutation(page, 0, baselineHistory);
  });
});
