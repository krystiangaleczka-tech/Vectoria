import React, { useEffect, useState } from 'react';
import type { ObjectStyle, SavedObjectStyle } from '@vectoria/core';
import { generateId } from '@vectoria/shared';
import { Button } from '@vectoria/ui';

export interface ObjectStylesPanelProps {
  styles: readonly SavedObjectStyle[];
  selectedStyle: ObjectStyle | null;
  hasSelection: boolean;
  onSave: (style: SavedObjectStyle) => void;
  onApply: (style: ObjectStyle) => void;
  onDelete: (id: string) => void;
}

/** Reusable object-style library with explicit save, apply, duplicate and delete actions. */
export const ObjectStylesPanel: React.FC<ObjectStylesPanelProps> = ({ styles, selectedStyle, hasSelection, onSave, onApply, onDelete }) => {
  const [name, setName] = useState('New style');
  return <aside className="object-styles-panel" data-testid="object-styles-panel">
    <div className="panel-section-heading"><span>Object Styles</span><span className="panel-count">{styles.length}</span></div>
    <div className="palette-create-form">
      <input aria-label="Object style name" value={name} onChange={(event) => setName(event.target.value)} />
      <Button size="sm" variant="secondary" disabled={!selectedStyle} onClick={() => selectedStyle && onSave({ id: generateId(), name: name.trim() || 'New style', style: selectedStyle })}>Save</Button>
    </div>
    {styles.length === 0 && <div className="panel-empty-state"><strong>No object styles</strong><span>Select styled object and save its appearance.</span></div>}
    <div className="object-style-list">
      {styles.map((item) => <ObjectStyleCard key={item.id} item={item} hasSelection={hasSelection} onApply={onApply} onSave={onSave} onDelete={onDelete} />)}
    </div>
  </aside>;
};

const ObjectStyleCard: React.FC<{ item: SavedObjectStyle; hasSelection: boolean; onApply: (style: ObjectStyle) => void; onSave: (style: SavedObjectStyle) => void; onDelete: (id: string) => void }> = ({ item, hasSelection, onApply, onSave, onDelete }) => {
  const [name, setName] = useState(item.name);
  useEffect(() => setName(item.name), [item.name]);
  const updateName = () => {
    const nextName = name.trim();
    if (nextName && nextName !== item.name) onSave({ ...item, name: nextName });
    else setName(item.name);
  };
  return <div className="object-style-card">
    <button type="button" className="object-style-apply" disabled={!hasSelection} onClick={() => onApply(item.style)}><span className="style-swatch" style={{ background: item.style.fill.type === 'solid' ? item.style.fill.color : 'var(--color-accent-subtle)' }} />{item.name}</button>
    <input aria-label={`Rename ${item.name}`} value={name} onChange={(event) => setName(event.target.value)} onBlur={updateName} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); updateName(); event.currentTarget.blur(); } }} />
    <Button size="sm" variant="ghost" onClick={() => onSave({ ...item, id: generateId(), name: `${item.name} copy` })}>Duplicate</Button>
    <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>Delete</Button>
  </div>;
};
