import React, { useState, useEffect } from 'react';
import { Button } from '@vectoria/ui';
import type { ShortcutSetting } from '../../hooks/useShortcutSettings.js';
import { ShortcutManager, SHORTCUT_ACTIONS, DEFAULT_SHORTCUTS, type ShortcutCombo } from '@vectoria/editor-engine';

export interface ShortcutConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutSetting[];
  onSave: (shortcuts: ShortcutSetting[]) => void;
  onReset: () => void;
}

export const ShortcutConfigDialog: React.FC<ShortcutConfigDialogProps> = ({
  isOpen,
  onClose,
  shortcuts,
  onSave,
  onReset,
}) => {
  const [localShortcuts, setLocalShortcuts] = useState<ShortcutSetting[]>([]);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac');

  useEffect(() => {
    if (isOpen) {
      setLocalShortcuts(shortcuts.length > 0 ? [...shortcuts] : [...(DEFAULT_SHORTCUTS as ShortcutSetting[])]);
      setEditingActionId(null);
    }
  }, [isOpen, shortcuts]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent, actionId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setEditingActionId(null);
      return;
    }

    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
      return;
    }

    const newCombo: ShortcutCombo = {
      key: e.key,
      meta: e.metaKey,
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
    };

    const newComboId = ShortcutManager.comboId(newCombo, isMac);

    // Check for conflicts
    const conflict = localShortcuts.find(
      s => s.actionId !== actionId && s.combo.key && ShortcutManager.comboId(s.combo, isMac) === newComboId
    );

    if (conflict) {
      if (!confirm(`Ten skrót jest już przypisany do: ${conflict.actionId}. Czy chcesz go nadpisać?`)) {
        setEditingActionId(null);
        return;
      }
      // Remove the conflict
      setLocalShortcuts(prev => prev.map(s => s.actionId === conflict.actionId ? { ...s, combo: { key: '', meta: false, ctrl: false, shift: false, alt: false } } : s));
    }

    setLocalShortcuts(prev => {
      const existing = prev.find(s => s.actionId === actionId);
      if (existing) {
        return prev.map(s => (s.actionId === actionId ? { ...s, combo: newCombo } : s));
      }
      return [...prev, { actionId, combo: newCombo }];
    });
    setEditingActionId(null);
  };

  const handleSave = () => {
    onSave(localShortcuts);
    onClose();
  };

  const handleReset = () => {
    setLocalShortcuts([...(DEFAULT_SHORTCUTS as ShortcutSetting[])]);
    onReset();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '460px',
        backgroundColor: 'var(--color-bg-surface, #1e1e24)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-subtle, #333)',
        padding: '24px',
        color: 'var(--color-text-primary, #fff)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxHeight: '80vh'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>Konfiguracja skrótów</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {SHORTCUT_ACTIONS.map(action => {
          const binding = localShortcuts.find(s => s.actionId === action.actionId);
          const combo = binding?.combo ?? { key: '', meta: false, ctrl: false, shift: false, alt: false };
          return (
            <div key={action.actionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: 'var(--color-bg-base)', borderRadius: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{action.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #888)' }}>{action.actionId}</span>
              </div>
              {editingActionId === action.actionId ? (
                <input
                  autoFocus
                  onBlur={() => setEditingActionId(null)}
                  onKeyDown={(e) => handleKeyDown(e, action.actionId)}
                  placeholder="Wciśnij klawisze..."
                  style={{ width: '130px', padding: '4px', fontSize: '12px', textAlign: 'center' }}
                  readOnly
                />
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setEditingActionId(action.actionId)}>
                  {combo.key ? ShortcutManager.comboId(combo, isMac) : 'Brak'}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        <Button variant="secondary" onClick={handleReset}>Przywróć domyślne</Button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={onClose}>Anuluj</Button>
          <Button variant="primary" onClick={handleSave}>Zapisz</Button>
        </div>
      </div>
    </div>
  );
};
