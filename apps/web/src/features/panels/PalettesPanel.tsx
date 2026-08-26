import React, { useEffect, useRef, useState } from 'react';
import type { ColorPalette, FillStyle, PaletteSwatch } from '@vectoria/core';
import { generateId } from '@vectoria/shared';
import { Button } from '@vectoria/ui';
import { importPalette } from '@vectoria/io';

export interface PalettesPanelProps {
  documentPalettes: readonly ColorPalette[];
  libraryPalettes: readonly ColorPalette[];
  hasSelection: boolean;
  onApplyFill: (fill: FillStyle) => void;
  onUpsertDocumentPalette: (palette: ColorPalette) => void;
  onDeleteDocumentPalette: (id: string) => void;
  onLibraryChange: (palettes: readonly ColorPalette[]) => void;
}

/** Palette and swatch library UI; document edits are delegated as commands by the host. */
export const PalettesPanel: React.FC<PalettesPanelProps> = ({ documentPalettes, libraryPalettes, hasSelection, onApplyFill, onUpsertDocumentPalette, onDeleteDocumentPalette, onLibraryChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('New palette');
  const [scope, setScope] = useState<'document' | 'user'>('document');
  const [error, setError] = useState<string | null>(null);
  const allPalettes = [...documentPalettes, ...libraryPalettes];

  const createPalette = () => {
    const palette: ColorPalette = { id: generateId(), name: name.trim() || 'New palette', scope, colors: [{ id: generateId(), name: 'Accent', color: '#5caeff' }] };
    if (scope === 'document') onUpsertDocumentPalette(palette);
    else onLibraryChange([...libraryPalettes, palette]);
    setName('New palette');
  };

  const duplicatePalette = (palette: ColorPalette) => {
    const copy: ColorPalette = { ...palette, id: generateId(), name: `${palette.name} copy`, scope: palette.scope === 'document' ? 'document' : 'saved', colors: palette.colors.map((color) => ({ ...color, id: generateId() })), swatches: palette.swatches?.map((swatch) => ({ ...swatch, id: generateId() })) };
    if (copy.scope === 'document') onUpsertDocumentPalette(copy);
    else onLibraryChange([...libraryPalettes.filter((item) => item.id !== copy.id), copy]);
  };

  const renamePalette = (palette: ColorPalette, nextName: string) => {
    const next = { ...palette, name: nextName.trim() || palette.name };
    if (palette.scope === 'document') onUpsertDocumentPalette(next);
    else onLibraryChange(libraryPalettes.map((item) => item.id === palette.id ? next : item));
  };

  const deletePalette = (palette: ColorPalette) => {
    if (palette.scope === 'document') onDeleteDocumentPalette(palette.id);
    else onLibraryChange(libraryPalettes.filter((item) => item.id !== palette.id));
  };

  const handleImport = async (file: File) => {
    try {
      const binary = file.name.toLowerCase().endsWith('.ase');
      const imported = importPalette(binary ? await file.arrayBuffer() : await file.text(), { name: file.name.replace(/\.[^.]+$/, '') });
      onLibraryChange([...libraryPalettes, imported]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Palette import failed');
    }
  };

  return <aside className="palette-panel" data-testid="palettes-panel">
    <div className="panel-section-heading"><span>Palettes</span><span className="panel-count">{allPalettes.length}</span></div>
    <div className="palette-create-form">
      <input aria-label="Palette name" value={name} onChange={(event) => setName(event.target.value)} />
      <label className="sr-only" htmlFor="palette-scope">Palette scope</label>
      <select id="palette-scope" aria-label="Palette scope" value={scope} onChange={(event) => setScope(event.target.value as 'document' | 'user')}>
        <option value="document">Document</option>
        <option value="user">User</option>
      </select>
      <Button size="sm" variant="secondary" onClick={createPalette}>Create</Button>
    </div>
    <div className="palette-actions">
      <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()}>Import</Button>
      <input ref={inputRef} type="file" accept=".json,.svg,.gpl,.ase,application/json,image/svg+xml" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImport(file); event.target.value = ''; }} />
    </div>
    {error && <p className="palette-error" role="alert">{error}</p>}
    {allPalettes.length === 0 && <div className="panel-empty-state"><strong>No palettes</strong><span>Create or import palette.</span></div>}
    {allPalettes.map((palette) => <PaletteCard key={palette.id} palette={palette} hasSelection={hasSelection} onApplyFill={onApplyFill} onRename={renamePalette} onDuplicate={duplicatePalette} onDelete={deletePalette} />)}
  </aside>;
};

const PaletteCard: React.FC<{ palette: ColorPalette; hasSelection: boolean; onApplyFill: (fill: FillStyle) => void; onRename: (palette: ColorPalette, name: string) => void; onDuplicate: (palette: ColorPalette) => void; onDelete: (palette: ColorPalette) => void }> = ({ palette, hasSelection, onApplyFill, onRename, onDuplicate, onDelete }) => {
  const [draftName, setDraftName] = useState(palette.name);
  useEffect(() => setDraftName(palette.name), [palette.name]);
  const commitName = () => {
    const nextName = draftName.trim();
    if (nextName && nextName !== palette.name) onRename(palette, nextName);
    else setDraftName(palette.name);
  };
  return <section className="palette-card">
    <div className="palette-card-header">
      <input aria-label={`Rename ${palette.name}`} value={draftName} onChange={(event) => setDraftName(event.target.value)} onBlur={commitName} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitName(); event.currentTarget.blur(); } }} />
      <span className="palette-scope">{palette.scope}</span>
    </div>
    <div className="palette-swatch-grid" aria-label={`${palette.name} swatches`}>
      {palette.colors.map((color) => <button key={color.id} type="button" className="style-swatch" title={color.name} aria-label={`Apply ${color.name}`} disabled={!hasSelection} style={{ background: color.color }} onClick={() => onApplyFill({ type: 'solid', color: color.color })} />)}
      {(palette.swatches ?? []).map((swatch) => <SwatchButton key={swatch.id} swatch={swatch} disabled={!hasSelection} onApply={onApplyFill} />)}
    </div>
    <div className="palette-card-actions">
      <Button size="sm" variant="ghost" onClick={() => onDuplicate(palette)}>Duplicate</Button>
      <Button size="sm" variant="ghost" onClick={() => onDelete(palette)}>Delete</Button>
    </div>
  </section>;
};

const SwatchButton: React.FC<{ swatch: PaletteSwatch; disabled: boolean; onApply: (fill: FillStyle) => void }> = ({ swatch, disabled, onApply }) => {
  const fill = swatch.type === 'solid' ? { type: 'solid' as const, color: swatch.color } : swatch.fill;
  const background = swatch.type === 'solid' ? swatch.color : swatch.type === 'pattern' ? swatch.fill.background : swatch.fill.stops[0]?.color ?? '#000000';
  return <button type="button" className="style-swatch style-swatch-complex" title={swatch.name} aria-label={`Apply ${swatch.name}`} disabled={disabled} style={{ background }} onClick={() => onApply(fill)} />;
};
