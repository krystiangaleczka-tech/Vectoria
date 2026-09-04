import React, { useState } from 'react';
import { Button, Dialog, ConfirmDialog } from '@vectoria/ui';
import { ShortcutManager, SHORTCUT_ACTIONS, DEFAULT_SHORTCUTS, type ShortcutCombo } from '@vectoria/editor-engine';
import type { ShortcutSetting } from '../../hooks/useShortcutSettings.js';

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
  const [localShortcuts, setLocalShortcuts] = useState<ShortcutSetting[]>(shortcuts);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [conflictPrompt, setConflictPrompt] = useState<{
    actionId: string;
    newCombo: ShortcutCombo;
    conflictActionId: string;
  } | null>(null);

  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const applyCombo = (actionId: string, newCombo: ShortcutCombo) => {
    setLocalShortcuts(prev => {
      const existing = prev.find(s => s.actionId === actionId);
      if (existing) {
        return prev.map(s => (s.actionId === actionId ? { ...s, combo: newCombo } : s));
      }
      return [...prev, { actionId, combo: newCombo }];
    });
    setEditingActionId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, actionId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setEditingActionId(null);
      return;
    }

    // Ignore solitary modifier presses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }

    const newCombo: ShortcutCombo = {
      key: e.key.toLowerCase(),
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
      setConflictPrompt({
        actionId,
        newCombo,
        conflictActionId: conflict.actionId,
      });
      return;
    }

    applyCombo(actionId, newCombo);
  };

  const handleConfirmConflict = () => {
    if (!conflictPrompt) return;
    const { actionId, newCombo, conflictActionId } = conflictPrompt;
    // Remove the conflict
    setLocalShortcuts(prev =>
      prev.map(s =>
        s.actionId === conflictActionId
          ? { ...s, combo: { key: '', meta: false, ctrl: false, shift: false, alt: false } }
          : s
      )
    );
    applyCombo(actionId, newCombo);
    setConflictPrompt(null);
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
    <>
      <Dialog
        ariaLabel="Konfiguracja skrótów"
        onClose={onClose}
        width={480}
        testId="shortcut-config-dialog"
      >
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '80vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Konfiguracja skrótów</h3>
            <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {SHORTCUT_ACTIONS.map(action => {
              const binding = localShortcuts.find(s => s.actionId === action.actionId);
              const combo = binding?.combo ?? { key: '', meta: false, ctrl: false, shift: false, alt: false };
              return (
                <div key={action.actionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: 'var(--color-input, #1d1d1b)', borderRadius: '4px' }}>
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
      </Dialog>

      {conflictPrompt && (
        <ConfirmDialog
          title="Konflikt skrótu"
          description={`Ten skrót jest już przypisany do: „${conflictPrompt.conflictActionId}”. Czy chcesz go nadpisać?`}
          confirmLabel="Nadpisz"
          cancelLabel="Anuluj"
          destructive={false}
          onConfirm={handleConfirmConflict}
          onCancel={() => {
            setConflictPrompt(null);
            setEditingActionId(null);
          }}
        />
      )}
    </>
  );
};
