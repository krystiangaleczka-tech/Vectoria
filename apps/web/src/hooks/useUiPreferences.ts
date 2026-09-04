import { useState, useEffect, useCallback } from 'react';

export type UiScale = 0.85 | 1 | 1.15 | 1.3;
export type ContrastMode = 'normal' | 'high';

export interface UiPreferences {
  readonly uiScale: UiScale;
  readonly contrast: ContrastMode;
  readonly tutorialsSeen: readonly string[];
  readonly checklistDismissed: boolean;
}

const UI_PREFS_KEY = 'vectoria.ui-prefs.v1';

const DEFAULT_PREFERENCES: UiPreferences = {
  uiScale: 1,
  contrast: 'normal',
  tutorialsSeen: [],
  checklistDismissed: false,
};

const VALID_SCALES: readonly UiScale[] = [0.85, 1, 1.15, 1.3];

function isValidScale(val: unknown): val is UiScale {
  return typeof val === 'number' && (VALID_SCALES as readonly number[]).includes(val);
}

function isValidContrast(val: unknown): val is ContrastMode {
  return val === 'normal' || val === 'high';
}

/**
 * Manages user interface preferences including scaling, high-contrast mode,
 * and onboarding/tutorial progress, with persistence in localStorage.
 */
export function useUiPreferences() {
  const [preferences, setPreferences] = useState<UiPreferences>(() => {
    try {
      const stored = localStorage.getItem(UI_PREFS_KEY);
      if (!stored) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        typeof parsed === 'object' &&
        isValidScale(parsed.uiScale) &&
        isValidContrast(parsed.contrast) &&
        Array.isArray(parsed.tutorialsSeen)
      ) {
        return {
          uiScale: parsed.uiScale,
          contrast: parsed.contrast,
          tutorialsSeen: parsed.tutorialsSeen.filter((id: unknown): id is string => typeof id === 'string'),
          checklistDismissed: Boolean(parsed.checklistDismissed),
        };
      }
      console.warn('Corrupted UI preferences found in localStorage. Resetting to defaults.');
      return DEFAULT_PREFERENCES;
    } catch (e) {
      console.warn('Failed to parse UI preferences. Resetting.', e);
      return DEFAULT_PREFERENCES;
    }
  });

  // Apply CSS custom properties and dataset attributes to root document
  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--ui-scale', String(preferences.uiScale));
      if (preferences.contrast === 'high') {
        document.documentElement.dataset.contrast = 'high';
      } else {
        delete document.documentElement.dataset.contrast;
      }
    } catch {
      // In SSR or non-browser test environment
    }
  }, [preferences.uiScale, preferences.contrast]);

  const persist = useCallback((next: UiPreferences) => {
    setPreferences(next);
    try {
      localStorage.setItem(UI_PREFS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to persist UI preferences to localStorage.', e);
    }
  }, []);

  const setUiScale = useCallback((scale: UiScale) => {
    persist({ ...preferences, uiScale: scale });
  }, [preferences, persist]);

  const setContrast = useCallback((contrast: ContrastMode) => {
    persist({ ...preferences, contrast });
  }, [preferences, persist]);

  const toggleContrast = useCallback(() => {
    persist({
      ...preferences,
      contrast: preferences.contrast === 'high' ? 'normal' : 'high',
    });
  }, [preferences, persist]);

  const markTutorialSeen = useCallback((tutorialId: string) => {
    if (preferences.tutorialsSeen.includes(tutorialId)) return;
    persist({
      ...preferences,
      tutorialsSeen: [...preferences.tutorialsSeen, tutorialId],
    });
  }, [preferences, persist]);

  const setChecklistDismissed = useCallback((dismissed: boolean) => {
    persist({ ...preferences, checklistDismissed: dismissed });
  }, [preferences, persist]);

  const resetPreferences = useCallback(() => {
    persist(DEFAULT_PREFERENCES);
  }, [persist]);

  return {
    preferences,
    uiScale: preferences.uiScale,
    contrast: preferences.contrast,
    tutorialsSeen: preferences.tutorialsSeen,
    checklistDismissed: preferences.checklistDismissed,
    setUiScale,
    setContrast,
    toggleContrast,
    markTutorialSeen,
    setChecklistDismissed,
    resetPreferences,
  };
}
