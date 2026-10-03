import { test, expect, type Page } from '@playwright/test';

type ThemeMode = {
  theme: 'dark' | 'light';
  highContrast: boolean;
};

const MODES: readonly ThemeMode[] = [
  { theme: 'dark', highContrast: false },
  { theme: 'light', highContrast: false },
  { theme: 'dark', highContrast: true },
  { theme: 'light', highContrast: true },
];

async function setThemeMode(page: Page, mode: ThemeMode): Promise<void> {
  await page.evaluate(({ theme, highContrast }) => {
    document.documentElement.dataset.theme = theme;
    if (highContrast) {
      document.documentElement.dataset.contrast = 'high';
    } else {
      delete document.documentElement.dataset.contrast;
    }
  }, mode);
}

async function expectSemanticColors(
  page: Page,
  selector: string,
  colorToken: string,
  backgroundToken: string,
): Promise<void> {
  const values = await page.locator(selector).first().evaluate(
    (element, tokens) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${tokens.colorToken})`;
      probe.style.backgroundColor = `var(${tokens.backgroundToken})`;
      document.body.appendChild(probe);

      const actual = getComputedStyle(element);
      const expected = getComputedStyle(probe);
      const result = {
        actualColor: actual.color,
        actualBackground: actual.backgroundColor,
        expectedColor: expected.color,
        expectedBackground: expected.backgroundColor,
      };

      probe.remove();
      return result;
    },
    { colorToken, backgroundToken },
  );

  expect(values.actualColor).toBe(values.expectedColor);
  expect(values.actualBackground).toBe(values.expectedBackground);
}

test.describe('VEC009: Assets semantic design tokens', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document.fonts, 'check', {
        configurable: true,
        value: (font: string) => !font.includes('Roboto'),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: 'Zasoby' }).click();
    await expect(page.getByTestId('assets-panel')).toBeVisible();
  });

  test('font availability statuses use success/danger tokens in every theme mode', async ({ page }) => {
    const availableStatus = page
      .locator('.brand-font-pill', { hasText: 'Inter' })
      .getByTestId('brand-font-status');
    const unavailableStatus = page
      .locator('.brand-font-pill', { hasText: 'Roboto' })
      .getByTestId('brand-font-status');

    await expect(availableStatus).toHaveAttribute('data-font-availability', 'available');
    await expect(availableStatus).toHaveClass(/is-available/);
    await expect(availableStatus).toHaveAttribute('aria-label', 'Font dostępny');

    await expect(unavailableStatus).toHaveAttribute('data-font-availability', 'unavailable');
    await expect(unavailableStatus).toHaveClass(/is-unavailable/);
    await expect(unavailableStatus).toHaveAttribute('aria-label', 'Font niedostępny');

    for (const mode of MODES) {
      await setThemeMode(page, mode);
      await expectSemanticColors(
        page,
        '.brand-font-status.is-available',
        '--color-success',
        '--color-success-subtle',
      );
      await expectSemanticColors(
        page,
        '.brand-font-status.is-unavailable',
        '--color-danger',
        '--color-danger-subtle',
      );
    }
  });

  test('Assets surfaces and actions resolve through panel/border tokens', async ({ page }) => {
    const assetCard = page.locator('.asset-card').first();
    const actionButton = page.locator('.section-action-btn').first();

    await expect(assetCard).toBeVisible();
    await expect(actionButton).toBeVisible();

    for (const mode of MODES) {
      await setThemeMode(page, mode);

      const values = await page.evaluate(() => {
        const card = document.querySelector<HTMLElement>('.asset-card');
        const action = document.querySelector<HTMLElement>('.section-action-btn');
        if (!card || !action) throw new Error('Assets token targets missing');

        const raisedProbe = document.createElement('span');
        raisedProbe.style.backgroundColor = 'var(--color-panel-raised)';
        raisedProbe.style.borderColor = 'var(--color-border-subtle)';
        raisedProbe.style.borderStyle = 'solid';
        raisedProbe.style.borderWidth = '1px';
        document.body.appendChild(raisedProbe);

        const expected = getComputedStyle(raisedProbe);
        const cardStyle = getComputedStyle(card);
        const actionStyle = getComputedStyle(action);
        const result = {
          expectedBackground: expected.backgroundColor,
          expectedBorder: expected.borderTopColor,
          cardBackground: cardStyle.backgroundColor,
          cardBorder: cardStyle.borderTopColor,
          actionBackground: actionStyle.backgroundColor,
          actionBorder: actionStyle.borderTopColor,
        };

        raisedProbe.remove();
        return result;
      });

      expect(values.cardBackground).toBe(values.expectedBackground);
      expect(values.cardBorder).toBe(values.expectedBorder);
      expect(values.actionBackground).toBe(values.expectedBackground);
      expect(values.actionBorder).toBe(values.expectedBorder);
    }
  });
});
