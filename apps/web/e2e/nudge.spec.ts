import { test, expect, type Locator, type Page } from '@playwright/test';

const BURST_SETTLE_MS = 400;

async function readNumber(control: Locator): Promise<number> {
  return Number.parseFloat(await control.locator('input').inputValue());
}

async function expectNumber(control: Locator, expected: number): Promise<void> {
  await expect.poll(() => readNumber(control)).toBe(expected);
}

async function createSelectedRectangle(page: Page) {
  const viewport = page.locator('[data-testid="canvas-viewport"]');
  await expect(viewport).toBeVisible();
  const box = await viewport.boundingBox();
  if (!box) throw new Error('Canvas viewport bounding box unavailable');

  await page.locator('[data-testid="tool-rectangle"]').click();
  const startX = box.x + box.width / 2 - 60;
  const startY = box.y + box.height / 2 - 40;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 120, startY + 80);
  await page.mouse.up();

  const selectTool = page.locator('[data-testid="tool-select"]');
  await selectTool.click();

  const propX = page.locator('[data-testid="prop-x"]');
  const propY = page.locator('[data-testid="prop-y"]');
  await expect(propX).toBeVisible();
  await expect(propY).toBeVisible();

  return {
    viewport,
    selectTool,
    propX,
    propY,
    undo: page.locator('[data-testid="undo-button"]'),
    redo: page.locator('[data-testid="redo-button"]'),
  };
}

test.describe('TASK-VEC-001: canonical keyboard nudge path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('one ArrowRight moves exactly +1 px and one Undo restores the exact pre-nudge position', async ({ page }) => {
    const { viewport, propX, undo, redo } = await createSelectedRectangle(page);
    const beforeX = await readNumber(propX);

    await viewport.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(BURST_SETTLE_MS);

    await expectNumber(propX, beforeX + 1);

    await undo.click();
    await expectNumber(propX, beforeX);

    await redo.click();
    await expectNumber(propX, beforeX + 1);
  });

  test('ten ArrowRight presses in one burst move exactly +10 px and create one logical Undo step', async ({ page }) => {
    const { viewport, propX, undo, redo } = await createSelectedRectangle(page);
    const beforeX = await readNumber(propX);

    await viewport.focus();
    for (let index = 0; index < 10; index += 1) {
      await page.keyboard.press('ArrowRight');
    }
    await page.waitForTimeout(BURST_SETTLE_MS);

    await expectNumber(propX, beforeX + 10);

    await undo.click();
    await expectNumber(propX, beforeX);

    await redo.click();
    await expectNumber(propX, beforeX + 10);
  });

  test('Shift+Arrow uses the 10 px product step with exact Undo/Redo', async ({ page }) => {
    const { viewport, propY, undo, redo } = await createSelectedRectangle(page);
    const beforeY = await readNumber(propY);

    await viewport.focus();
    await page.keyboard.press('Shift+ArrowDown');
    await page.waitForTimeout(BURST_SETTLE_MS);

    await expectNumber(propY, beforeY + 10);

    await undo.click();
    await expectNumber(propY, beforeY);

    await redo.click();
    await expectNumber(propY, beforeY + 10);
  });

  test('nudge uses the same burst semantics when normal editor chrome, not the viewport, owns focus', async ({ page }) => {
    const { selectTool, propX, undo } = await createSelectedRectangle(page);
    const beforeX = await readNumber(propX);

    await selectTool.focus();
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(BURST_SETTLE_MS);

    await expectNumber(propX, beforeX - 1);

    await undo.click();
    await expectNumber(propX, beforeX);
  });

  test('arrow keys inside numeric inputs are not stolen by the global nudge router', async ({ page }) => {
    const { propX } = await createSelectedRectangle(page);
    const input = propX.locator('input');
    const beforeX = await readNumber(propX);

    await input.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(BURST_SETTLE_MS);

    await expectNumber(propX, beforeX);
  });
});
