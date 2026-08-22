import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, NumberInput } from '@vectoria/ui';
import { DOCUMENT_PRESETS, type DocumentPreset, type DocumentUnit } from '@vectoria/core';

export interface NewDocumentDialogProps {
  onCreate: (options: { name: string; width: number; height: number; unit: DocumentUnit }) => void;
  onClose: () => void;
}

const focusable = 'button:not([disabled]), input:not([disabled]), select:not([disabled])';

export const NewDocumentDialog: React.FC<NewDocumentDialogProps> = ({ onCreate, onClose }) => {
  const [name, setName] = useState('Untitled');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [unit, setUnit] = useState<DocumentUnit>('px');
  const [presetId, setPresetId] = useState('screen-1920');
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null);

  const error = useMemo(() => {
    if (!name.trim()) return 'Podaj nazwę dokumentu.';
    if (!Number.isFinite(width) || width <= 0) return 'Szerokość musi być dodatnią, skończoną liczbą.';
    if (!Number.isFinite(height) || height <= 0) return 'Wysokość musi być dodatnią, skończoną liczbą.';
    return null;
  }, [name, width, height]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>(focusable);
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const elements = [...dialog.querySelectorAll<HTMLElement>(focusable)];
      if (elements.length === 0) return;
      const firstElement = elements[0]!;
      const lastElement = elements[elements.length - 1]!;
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [onClose]);

  const selectPreset = (preset: DocumentPreset) => {
    setPresetId(preset.id);
    setWidth(preset.width);
    setHeight(preset.height);
    setUnit(preset.unit);
    if (preset.defaultName) setName(preset.defaultName);
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="new-document-dialog" role="dialog" aria-modal="true" aria-labelledby="new-document-title" aria-describedby="new-document-description" data-testid="new-document-dialog">
        <header className="dialog-header">
          <div>
            <p className="dialog-eyebrow">Dokument</p>
            <h2 id="new-document-title">Nowy dokument</h2>
            <p id="new-document-description" className="dialog-description">Wybierz format lub ustaw własny rozmiar obszaru roboczego.</p>
          </div>
          <button type="button" className="dialog-close" aria-label="Zamknij" onClick={onClose}>×</button>
        </header>

        <label className="dialog-label">Nazwa<input value={name} onChange={(event) => { setName(event.target.value); setPresetId('custom'); }} autoFocus /></label>

        <div className="dialog-field-heading"><span>Presety</span><span className="dialog-field-hint">Wartości pozostają edytowalne</span></div>
        <div className="dialog-presets" role="listbox" aria-label="Presety dokumentu">
          {DOCUMENT_PRESETS.map((preset) => (
            <button key={preset.id} type="button" role="option" aria-selected={preset.id === presetId} className={preset.id === presetId ? 'is-selected' : ''} onClick={() => selectPreset(preset)}>
              <strong>{preset.name.split(' · ')[0]}</strong>
              <span>{preset.width} × {preset.height} {preset.unit}</span>
            </button>
          ))}
        </div>

        <div className="dialog-field-heading"><span>Rozmiar</span><span className="dialog-field-hint">Canvas pozostaje viewportem</span></div>
        <div className="property-grid">
          <NumberInput label="W" min={0.000001} value={width} onChange={(value) => { setWidth(value); setPresetId('custom'); }} />
          <NumberInput label="H" min={0.000001} value={height} onChange={(value) => { setHeight(value); setPresetId('custom'); }} />
        </div>
        <label className="dialog-label">Jednostka<select value={unit} onChange={(event) => { setUnit(event.target.value as DocumentUnit); setPresetId('custom'); }}><option value="px">px — ekran</option><option value="mm">mm — druk</option><option value="cm">cm — druk</option><option value="in">in — druk</option></select></label>

        <div className={`dialog-validation ${error ? 'has-error' : ''}`} role={error ? 'alert' : 'status'}>
          <span aria-hidden="true">{error ? '!' : '✓'}</span>
          <span>{error ?? `${width} × ${height} ${unit} · ${name.trim() || 'Untitled'}`}</span>
        </div>
        <div className="dialog-actions"><Button variant="ghost" onClick={onClose}>Anuluj</Button><Button variant="primary" disabled={Boolean(error)} onClick={() => { if (!error) onCreate({ name: name.trim(), width, height, unit }); }}>Utwórz dokument</Button></div>
      </section>
    </div>
  );
};
