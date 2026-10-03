import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_SHORTCUTS, type ShortcutBinding, type ShortcutCombo } from '@vectoria/editor-engine';

export interface ShortcutSetting {
  actionId: string;
  combo: ShortcutCombo;
}

const SHORTCUTS_STORAGE_KEY = 'vectoria.shortcuts.v1';
const DEFAULTS: ShortcutBinding[] = DEFAULT_SHORTCUTS as ShortcutBinding[];

export function mergeShortcutDefaults(
  stored: readonly ShortcutSetting[],
  defaults: readonly ShortcutSetting[]
): ShortcutSetting[] {
  const storedByAction = new Map(stored.map((setting) => [setting.actionId, setting]));
  const defaultActionIds = new Set(defaults.map((setting) => setting.actionId));
  return [
    ...defaults.map((setting) => storedByAction.get(setting.actionId) ?? setting),
    ...stored.filter((setting) => !defaultActionIds.has(setting.actionId)),
  ];
}

export function useShortcutSettings(defaultShortcuts: ShortcutSetting[] = DEFAULTS) {
  const [shortcuts, setShortcuts] = useState<ShortcutSetting[]>(defaultShortcuts);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every(s => typeof s.actionId === 'string' && s.combo && typeof s.combo.key === 'string')) {
          setShortcuts(mergeShortcutDefaults(parsed as ShortcutSetting[], defaultShortcuts));
        } else {
          console.warn('Corrupted shortcut settings found. Resetting to defaults.');
          setShortcuts(defaultShortcuts);
        }
      }
    } catch (e) {
      console.warn('Failed to load shortcut settings. Resetting to defaults.', e);
      setShortcuts(defaultShortcuts);
    }
    setIsLoaded(true);
  }, [defaultShortcuts]);

  const saveShortcuts = useCallback((newShortcuts: ShortcutSetting[]) => {
    setShortcuts(newShortcuts);
    try {
      localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(newShortcuts));
    } catch (e) {
      console.warn('Failed to save shortcut settings.', e);
    }
  }, []);

  const resetShortcuts = useCallback(() => {
    setShortcuts(defaultShortcuts);
    try {
      localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove shortcut settings.', e);
    }
  }, [defaultShortcuts]);

  return { shortcuts, isLoaded, saveShortcuts, resetShortcuts };
}
