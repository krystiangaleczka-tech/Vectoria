import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function exportSvg(page: Page): Promise<string> {
  const pending = page.waitForEvent('download');
  await page.getByTestId('export-svg-button').click();
  const file = await (await pending).path();
  if (!file) throw new Error('SVG download unavailable');
  return readFile(file, 'utf8');
}

async function rectangleData(page: Page) {
  const svg = await exportSvg(page);
  return page.evaluate((source) => {
    const object = new DOMParser().parseFromString(source, 'image/svg+xml').querySelector('rect[transform], ellipse[transform]');
    if (!object) throw new Error('Exported rectangle unavailable');
    const matrix = object.getAttribute('transform')?.match(/matrix\(([^)]+)\)/)?.[1]?.trim().split(/[\s,]+/).map(Number);
    if (!matrix || matrix.length !== 6) throw new Error('Rectangle matrix unavailable');
    return { width: Number(object.getAttribute('width') ?? Number(object.getAttribute('rx')) * 2), height: Number(object.getAttribute('height') ?? Number(object.getAttribute('ry')) * 2), matrix };
  }, svg);
}

function transformed(matrix: number[], x: number, y: number) {
  return { x: matrix[0]! * x + matrix[2]! * y + matrix[4]!, y: matrix[1]! * x + matrix[3]! * y + matrix[5]! };
}

async function createRectangle(page: Page, angle = 30, tool = 'rectangle') {
  const canvas = page.getByTestId('canvas-viewport');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas unavailable');
  const origin = { x: box.x + 350, y: box.y + 280 };
  await page.getByTestId(`tool-${tool}`).click();
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x + 120, origin.y + 80, { steps: 5 });
  await page.mouse.up();
  await page.getByTestId('tool-select').click();
  const input = page.getByTestId('prop-rotation').locator('input');
  await input.fill(String(angle));
  await input.press('Tab');
  const data = await rectangleData(page);
  const zoom = 120 / data.width;
  const screen = (x: number, y: number) => {
    const world = transformed(data.matrix, x, y);
    return { x: origin.x + (world.x - data.matrix[4]!) * zoom, y: origin.y + (world.y - data.matrix[5]!) * zoom };
  };
  return { canvas, data, screen, zoom };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

for (const frame of [false, true]) {
  test(`text ${frame ? 'frame' : 'click'} owns letter shortcuts and exports typed content`, async ({ page }) => {
    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas unavailable');
    await page.getByTestId('tool-text').click();
    await page.mouse.move(box.x + 220, box.y + 200);
    await page.mouse.down();
    if (frame) await page.mouse.move(box.x + 440, box.y + 320, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.type('prvnalbwsz Tekst');
    await expect(canvas).toHaveAttribute('data-tool', 'text');
    await expect(canvas).toHaveAttribute('data-text-editing', 'true');
    // A canvas click commits the edited object before starting the next draft.
    await page.mouse.click(box.x + 600, box.y + 400);
    await page.keyboard.press('Escape');
    expect(await exportSvg(page)).toContain('prvnalbwsz Tekst');
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Edit Text');
    await expect(page.locator('.save-indicator')).toContainText('Zapisano lokalnie');
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(await exportSvg(page)).toContain('prvnalbwsz Tekst');
  });
}

test('Pen Enter closes, Escape keeps open, Backspace removes a draft point and Delete removes selected path', async ({ page }) => {
  const canvas = page.getByTestId('canvas-viewport');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas unavailable');
  await page.getByTestId('tool-pen').click();
  for (const [x, y] of [[200, 200], [350, 200], [350, 350]]) await page.mouse.click(box.x + x!, box.y + y!);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('statusbar')).toContainText('0 objects');
  await page.mouse.click(box.x + 350, box.y + 350);
  await page.keyboard.press('Enter');
  let svg = await exportSvg(page);
  const closed = await page.evaluate(source => new DOMParser().parseFromString(source, 'image/svg+xml').querySelector('path[transform]')?.getAttribute('d'), svg);
  expect(closed).toMatch(/Z\s*$/i);
  await page.keyboard.press('Delete');
  await expect(page.getByTestId('statusbar')).toContainText('0 objects');
  await page.getByTestId('undo-button').click();
  await expect(page.getByTestId('statusbar')).toContainText('1 object');
  await page.getByTestId('tool-pen').click();
  await page.mouse.click(box.x + 450, box.y + 200);
  await page.mouse.click(box.x + 500, box.y + 300);
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-tool', 'select');
  svg = await exportSvg(page);
  const paths = await page.evaluate(source => Array.from(new DOMParser().parseFromString(source, 'image/svg+xml').querySelectorAll('path[transform]'), el => el.getAttribute('d')), svg);
  expect(paths).toHaveLength(2);
  expect(paths[1]).not.toMatch(/Z\s*$/i);
});

const handles = [
  ['nw', 0, 0], ['n', 0.5, 0], ['ne', 1, 0], ['e', 1, 0.5],
  ['se', 1, 1], ['s', 0.5, 1], ['sw', 0, 1], ['w', 0, 0.5],
] as const;
for (const [id, fx, fy] of handles) {
  test(`rotated rectangle ${id} resize keeps opposite anchor, has one Undo and exports exact preview`, async ({ page }) => {
    const { data, screen } = await createRectangle(page);
    const start = screen(data.width * fx, data.height * fy);
    const target = screen(data.width * fx + (fx === 0.5 ? 0 : fx === 0 ? -20 : 20), data.height * fy + (fy === 0.5 ? 0 : fy === 0 ? -15 : 15));
    const anchor = transformed(data.matrix, data.width * (1 - fx), data.height * (1 - fy));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
    const after = await rectangleData(page);
    const fixed = transformed(after.matrix, data.width * (1 - fx), data.height * (1 - fy));
    expect(fixed.x).toBeCloseTo(anchor.x, 4);
    expect(fixed.y).toBeCloseTo(anchor.y, 4);
    expect(after.matrix).not.toEqual(data.matrix);
    await page.getByTestId('undo-button').click();
    expect((await rectangleData(page)).matrix).toEqual(data.matrix);
    await page.getByTestId('redo-button').click();
    expect((await rectangleData(page)).matrix).toEqual(after.matrix);
  });
}

for (const [id, fx, fy] of handles.filter(([id]) => ['nw', 'ne', 'se', 'sw'].includes(id))) {
  test(`rotation beyond ${id} corner preserves object center`, async ({ page }) => {
    const { data, screen, canvas } = await createRectangle(page, 0);
    const center = screen(data.width / 2, data.height / 2);
    const corner = screen(data.width * fx, data.height * fy);
    const dx = corner.x - center.x; const dy = corner.y - center.y;
    const length = Math.hypot(dx, dy);
    const start = { x: corner.x + dx / length * 24, y: corner.y + dy / length * 24 };
    await page.mouse.move(start.x, start.y);
    await expect(canvas).toHaveCSS('cursor', /url\(/);
    await page.mouse.down();
    await page.mouse.move(center.x - (start.y - center.y), center.y + start.x - center.x, { steps: 12 });
    await page.mouse.up();
    const after = await rectangleData(page);
    const beforeCenter = transformed(data.matrix, data.width / 2, data.height / 2);
    const afterCenter = transformed(after.matrix, data.width / 2, data.height / 2);
    expect(afterCenter.x).toBeCloseTo(beforeCenter.x, 4);
    expect(afterCenter.y).toBeCloseTo(beforeCenter.y, 4);
    expect(after.matrix).not.toEqual(data.matrix);
  });
}

test('closed node lasso selects enclosed path nodes; empty selection explains prerequisite', async ({ page }) => {
  const canvas = page.getByTestId('canvas-viewport');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas unavailable');
  await page.getByTestId('tool-node-lasso').click();
  await expect(canvas).toHaveAttribute('title', /Najpierw zaznacz ścieżkę/);
  await page.getByTestId('tool-pen').click();
  for (const [x, y] of [[240, 240], [350, 240], [350, 350]]) await page.mouse.click(box.x + x!, box.y + y!);
  await page.keyboard.press('Enter');
  await page.getByTestId('tool-node-lasso').click();
  await page.mouse.move(box.x + 210, box.y + 210);
  await page.mouse.down();
  for (const [x, y] of [[380, 210], [380, 380], [210, 380], [210, 210]]) await page.mouse.move(box.x + x!, box.y + y!, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId('prop-node-x')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('prop-node-x')).not.toBeVisible();
  await expect(canvas).toHaveAttribute('data-tool', 'select');
});

for (const tool of ['pencil', 'brush']) {
  test(`${tool} has live overlay before commit and uses Polish status/object names`, async ({ page }) => {
    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas unavailable');
    await page.getByTestId(`tool-${tool}`).click();
    const label = tool === 'pencil' ? 'Ołówek' : 'Pędzel';
    await expect(page.getByTestId('statusbar')).toContainText(label);
    const overlay = canvas.locator('canvas').last();
    await page.mouse.move(box.x + 200, box.y + 200);
    await page.mouse.down();
    const before = await overlay.evaluate(el => el.toDataURL());
    await page.mouse.move(box.x + 380, box.y + 300, { steps: 15 });
    await expect.poll(() => overlay.evaluate(el => el.toDataURL())).not.toBe(before);
    await expect(page.getByTestId('statusbar')).toContainText('0 objects');
    await page.mouse.up();
    await expect(page.getByTestId('statusbar')).toContainText('1 object');
    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await expect(page.getByTestId('right-dock')).toContainText(label);
  });
}

for (const axis of ['horizontal', 'vertical']) {
  test(`drag ${axis} ruler creates one guide only on release and supports undo/cancel`, async ({ page }) => {
    const ruler = page.getByTestId(`ruler-${axis}`);
    const box = await ruler.boundingBox();
    const canvas = page.getByTestId('canvas-viewport');
    const viewport = await canvas.boundingBox();
    if (!box || !viewport) throw new Error('Ruler unavailable');
    const background = canvas.locator('canvas').first();
    const before = await background.evaluate(el => el.toDataURL());
    await page.mouse.move(box.x + Math.min(120, box.width / 2), box.y + Math.min(120, box.height / 2));
    await page.mouse.down();
    await page.mouse.move(viewport.x + 250, viewport.y + 280, { steps: 5 });
    await expect(page.getByTestId('guide-preview')).toBeVisible();
    expect(await background.evaluate(el => el.toDataURL())).toBe(before);
    await page.mouse.up();
    await expect(page.getByTestId('guide-preview')).not.toBeVisible();
    await expect.poll(() => background.evaluate(el => el.toDataURL())).not.toBe(before);
    await page.getByTestId('undo-button').click();
    await expect.poll(() => background.evaluate(el => el.toDataURL())).toBe(before);
    await page.mouse.move(box.x + Math.min(120, box.width / 2), box.y + Math.min(120, box.height / 2));
    await page.mouse.down();
    await page.mouse.move(viewport.x + 300, viewport.y + 330);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(page.getByTestId('guide-preview')).not.toBeVisible();
    expect(await background.evaluate(el => el.toDataURL())).toBe(before);
    for (const reason of ['pointercancel', 'lostpointercapture', 'outside']) {
      await page.mouse.move(box.x + Math.min(120, box.width / 2), box.y + Math.min(120, box.height / 2));
      await page.mouse.down();
      await page.mouse.move(viewport.x + 300, viewport.y + 330);
      if (reason === 'outside') await page.mouse.move(10, 10);
      else await ruler.dispatchEvent(reason, { bubbles: true, pointerId: 1 });
      await page.mouse.up();
      await expect(page.getByTestId('guide-preview')).not.toBeVisible();
      expect(await background.evaluate(el => el.toDataURL())).toBe(before);
    }
  });
}


test('rotated ellipse keeps its opposite anchor after resizing and restores with one Undo', async ({ page }) => {
  const { data, screen } = await createRectangle(page, 135, 'ellipse');
  const start = screen(0, 0);
  const target = screen(-20, -15);
  const anchor = transformed(data.matrix, data.width, data.height);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
  const after = await rectangleData(page);
  const fixed = transformed(after.matrix, data.width, data.height);
  expect(fixed.x).toBeCloseTo(anchor.x, 4);
  expect(fixed.y).toBeCloseTo(anchor.y, 4);
  await page.getByTestId('undo-button').click();
  expect((await rectangleData(page)).matrix).toEqual(data.matrix);
});

test('resize cancellation leaves the original transform and history intact', async ({ page }) => {
  const { data, screen } = await createRectangle(page);
  const start = screen(0, 0);
  for (const reason of ['Escape', 'pointercancel', 'lostpointercapture']) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - 40, start.y - 30, { steps: 5 });
    if (reason === 'Escape') await page.keyboard.press('Escape');
    else await page.getByTestId('canvas-viewport').dispatchEvent(reason, { bubbles: true, pointerId: 1 });
    await page.mouse.up();
    expect((await rectangleData(page)).matrix).toEqual(data.matrix);
  }
});
