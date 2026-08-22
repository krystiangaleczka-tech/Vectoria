import React, { useState } from 'react';
import { Button, NumberInput } from '@vectoria/ui';
import type { DocumentUnit } from '@vectoria/core';

export interface NewDocumentDialogProps {
  onCreate: (options: { name: string; width: number; height: number; unit: DocumentUnit }) => void;
  onClose: () => void;
}

export const NewDocumentDialog: React.FC<NewDocumentDialogProps> = ({ onCreate, onClose }) => {
  const [name, setName] = useState('Untitled');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [unit, setUnit] = useState<DocumentUnit>('px');

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="new-document-dialog" role="dialog" aria-modal="true" aria-labelledby="new-document-title">
      <h2 id="new-document-title">Nowy dokument</h2>
      <label className="dialog-label">Nazwa<input value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
      <div className="dialog-presets">
        <button type="button" onClick={() => { setWidth(1920); setHeight(1080); setUnit('px'); }}>Ekran 1920 × 1080</button>
        <button type="button" onClick={() => { setWidth(794); setHeight(1123); setUnit('px'); }}>A4</button>
        <button type="button" onClick={() => { setWidth(1080); setHeight(1080); setUnit('px'); }}>Kwadrat</button>
      </div>
      <div className="property-grid">
        <NumberInput label="W" min={1} value={width} onChange={setWidth} />
        <NumberInput label="H" min={1} value={height} onChange={setHeight} />
      </div>
      <label className="dialog-label">Jednostka<select value={unit} onChange={(event) => setUnit(event.target.value as DocumentUnit)}><option value="px">px</option><option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option></select></label>
      <div className="dialog-actions"><Button variant="ghost" onClick={onClose}>Anuluj</Button><Button variant="primary" onClick={() => onCreate({ name: name.trim() || 'Untitled', width, height, unit })}>Utwórz</Button></div>
    </section>
  </div>;
};
