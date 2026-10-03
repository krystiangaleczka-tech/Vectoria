import { expect, test } from '@playwright/test';

const EXPECTED_TOOL_LABELS = {
  select: 'Zaznaczanie',
  'direct-select': 'Zaznaczanie węzłów',
  lasso: 'Lasso',
  'node-lasso': 'Lasso węzłów',
  rectangle: 'Prostokąt',
  ellipse: 'Elipsa',
  polygon: 'Wielokąt',
  star: 'Gwiazda',
  arc: 'Łuk',
  pie: 'Wycinek koła',
  ring: 'Pierścień',
  spiral: 'Spirala',
  callout: 'Dymek',
  line: 'Linia',
  polyline: 'Polilinia',
  pen: 'Pióro',
  pencil: 'Ołówek',
  brush: 'Pędzel',
  text: 'Tekst',
  corner: 'Narożnik',
  smooth: 'Wygładzanie',
  width: 'Szerokość',
  eraser: 'Gumka',
  knife: 'Nóż',
  scissors: 'Nożyce',
  eyedropper: 'Pipeta',
  bucket: 'Wypełnienie',
  hand: 'Ręka',
  zoom: 'Lupa',
} as const;

const EXPECTED_GROUP_LABELS = [
  'Zaznaczanie',
  'Kształty',
  'Rysowanie',
  'Tekst',
  'Edycja ścieżki',
  'Wypełnienie i styl',
  'Nawigacja',
] as const;

test.describe('TASK-VEC-010: spójny język Tool Rail', () => {
  test('wszystkie 29 narzędzi i grupy używają polskich nazw z canonical registry', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const rail = page.getByTestId('tool-rail');
    await expect(rail).toBeVisible();

    const groups = rail.locator('.tool-group');
    await expect(groups).toHaveCount(EXPECTED_GROUP_LABELS.length);
    for (const [index, label] of EXPECTED_GROUP_LABELS.entries()) {
      await expect(groups.nth(index)).toHaveAttribute('aria-label', label);
    }

    for (const [toolId, label] of Object.entries(EXPECTED_TOOL_LABELS)) {
      const tool = page.getByTestId(`tool-${toolId}`);
      await expect(tool).toHaveAttribute('aria-label', label);
      const tooltip = await tool.locator('..').getAttribute('data-tooltip');
      expect(tooltip?.startsWith(label)).toBe(true);
    }
  });

  test('Ręka rozróżnia aktywację H od tymczasowego przesuwania Spacją bez angielskiego komunikatu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hand = page.getByTestId('tool-hand');
    await expect(hand).toHaveAttribute('aria-label', 'Ręka');
    await expect(hand.locator('..')).toHaveAttribute(
      'data-tooltip',
      /Ręka.*H.*Spacja \(przytrzymaj\).*tymczasowe przesuwanie/,
    );
    await expect(hand.locator('..')).not.toHaveAttribute('data-tooltip', /Temporary Pan|Space \(hold\)|Hand \/ Pan Tool/);
  });
});
