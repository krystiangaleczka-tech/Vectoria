import { useState, useEffect, useCallback } from 'react';

export interface LayoutPreset {
  id: string;
  name: string;
  rightDockOpen: boolean;
  activePanel: string;
  theme: string;
}

const PRESETS_STORAGE_KEY = 'vectoria.layout-presets.v1';

export function useLayoutPresets() {
  const [presets, setPresets] = useState<LayoutPreset[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every(p => typeof p.id === 'string' && typeof p.name === 'string')) {
          setPresets(parsed);
        } else {
          console.warn('Corrupted layout presets found. Resetting.');
          setPresets([]);
        }
      }
    } catch (e) {
      console.warn('Failed to load layout presets. Resetting.', e);
      setPresets([]);
    }
  }, []);

  const savePreset = useCallback((preset: LayoutPreset) => {
    setPresets(prev => {
      const existingIdx = prev.findIndex(p => p.id === preset.id);
      const next = [...prev];
      if (existingIdx >= 0) {
        next[existingIdx] = preset;
      } else {
        next.push(preset);
      }
      try {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save layout preset.', e);
      }
      return next;
    });
  }, []);

  const removePreset = useCallback((id: string) => {
    setPresets(prev => {
      const next = prev.filter(p => p.id !== id);
      try {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to remove layout preset.', e);
      }
      return next;
    });
  }, []);

  const applyPreset = useCallback((preset: LayoutPreset) => {
    try {
      localStorage.setItem('vectoria.workspace-layout.v1', JSON.stringify(preset));
    } catch (e) {
      console.warn('Failed to apply layout preset.', e);
    }
  }, []);

  return { presets, savePreset, removePreset, applyPreset };
}
