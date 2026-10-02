import { expect, test } from '@playwright/test';

const legacyStoredShortcuts = [
  {
    actionId: 'tool.select',
    combo: { key: 'v', meta: false, ctrl: false, shift: false, alt: false },
  },
];

test.describe('TASK-VEC-006: Tool Rail and shortcut registry parity', () => {
  test('audited default tool shortcuts activate the intended tools and Hand distinguishes H from temporary Space pan', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('canvas-viewport');

    await page.keyboard.press('Shift+O');
    await expect(canvas).toHaveAttribute('data-tool', 'node-lasso');
    await expect(page.getByTestId('tool-node-lasso')).toHaveAttribute('data-shortcut', 'Shift+O');

    await page.keyboard.press('Shift+E');
    await expect(canvas).toHaveAttribute('data-tool', 'eraser');
    await expect(page.getByTestId('tool-eraser')).toHaveAttribute('data-shortcut', 'Shift+E');

    await page.keyboard.press('h');
    await expect(canvas).toHaveAttribute('data-tool', 'hand');
    await expect(page.getByTestId('tool-hand')).toHaveAttribute('data-shortcut', 'H');
    await expect(page.getByTestId('tool-hand').locator('..')).toHaveAttribute('data-tooltip', /H.*Space \(hold\).*Temporary Pan/);

    await page.getByTestId('tool-rectangle').click();
    await expect(canvas).toHaveAttribute('data-tool', 'rectangle');
    await page.keyboard.down('Space');
    await expect(canvas).toHaveAttribute('data-tool', 'rectangle');
    await page.keyboard.up('Space');
    await expect(canvas).toHaveAttribute('data-tool', 'rectangle');
  });

  test('legacy saved shortcut settings receive newly introduced defaults without overwriting existing bindings', async ({ page }) => {
    await page.addInitScript((stored) => {
      localStorage.setItem('vectoria.shortcuts.v1', JSON.stringify(stored));
    }, legacyStoredShortcuts);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('canvas-viewport');
    await page.keyboard.press('Shift+O');
    await expect(canvas).toHaveAttribute('data-tool', 'node-lasso');
    await page.keyboard.press('Shift+E');
    await expect(canvas).toHaveAttribute('data-tool', 'eraser');
    await expect(page.getByTestId('tool-select')).toHaveAttribute('data-shortcut', 'V');
  });

  test('Tool Rail reflects a user-rebound shortcut and the keyboard router uses the same binding', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vectoria.shortcuts.v1', JSON.stringify([
        {
          actionId: 'tool.eraser',
          combo: { key: 'x', meta: false, ctrl: false, shift: false, alt: false },
        },
      ]));
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('canvas-viewport');
    await expect(page.getByTestId('tool-eraser')).toHaveAttribute('data-shortcut', 'X');
    await page.keyboard.press('x');
    await expect(canvas).toHaveAttribute('data-tool', 'eraser');

    await page.keyboard.press('Shift+E');
    await expect(canvas).toHaveAttribute('data-tool', 'eraser');
  });
});
