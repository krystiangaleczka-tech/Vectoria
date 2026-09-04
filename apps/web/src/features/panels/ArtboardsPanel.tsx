import React, { useState } from 'react';
import type { DocumentModel, ArtboardId } from '@vectoria/core';
import { Button, IconButton, VectoriaIcon, ConfirmDialog } from '@vectoria/ui';
import { convertUnit } from '@vectoria/shared';

export interface ArtboardsPanelProps {
  document: DocumentModel;
  onSelect: (id: ArtboardId) => void;
  onCreate: () => void;
  onDuplicate: (id: ArtboardId) => void;
  onDelete: (id: ArtboardId) => void;
  onRename: (id: ArtboardId, name: string) => void;
  onOrientation: (id: ArtboardId, orientation: 'portrait' | 'landscape') => void;
  onVisibilityToggle?: (id: ArtboardId, visible: boolean) => void;
}

export const ArtboardsPanel: React.FC<ArtboardsPanelProps> = ({ document: doc, onSelect, onCreate, onDuplicate, onDelete, onRename, onOrientation, onVisibilityToggle }) => {
  const [editingId, setEditingId] = useState<ArtboardId | null>(null);
  const [name, setName] = useState('');
  const [artboardToDelete, setArtboardToDelete] = useState<{ id: ArtboardId; name: string } | null>(null);

  return (
  <section className="artboards-panel" data-testid="artboards-panel">
    <div className="dock-panel-content">
      <div className="panel-section-heading"><span>Artboardy</span><span className="panel-count">{doc.artboardIds.length}</span></div>
      <div className="artboard-list">
        {doc.artboardIds.map((id) => {
          const board = doc.artboards[id];
          if (!board) return null;
           return <div key={id} className={`artboard-row ${id === doc.activeArtboardId ? 'is-selected' : ''}`}>
             <button type="button" className="artboard-select-button" aria-pressed={id === doc.activeArtboardId} onClick={() => onSelect(id)}><VectoriaIcon name="rectangle" size={14} /><span>{board.name}</span><small>{convertUnit(board.width, 'px', doc.unit).toFixed(1)} × {convertUnit(board.height, 'px', doc.unit).toFixed(1)} {doc.unit}</small></button>
             {editingId === id ? <form className="artboard-rename-form" onSubmit={(event) => { event.preventDefault(); if (name.trim()) onRename(id, name); setEditingId(null); }}><input aria-label={`Nazwa ${board.name}`} autoFocus value={name} onChange={(event) => setName(event.target.value)} onBlur={() => setEditingId(null)} /></form> : <IconButton size="sm" icon={<VectoriaIcon name="more" size={13} />} label={`Zmień nazwę ${board.name}`} onClick={() => { setEditingId(id); setName(board.name); }} />}
             <select className="artboard-orientation" aria-label={`Orientacja ${board.name}`} value={board.orientation ?? (board.width >= board.height ? 'landscape' : 'portrait')} onChange={(event) => onOrientation(id, event.target.value as 'portrait' | 'landscape')}><option value="landscape">Pozioma</option><option value="portrait">Pionowa</option></select>
             {onVisibilityToggle && <IconButton size="sm" icon={<VectoriaIcon name={board.visible !== false ? 'visible' : 'hidden'} size={13} />} label={board.visible !== false ? 'Ukryj' : 'Pokaż'} onClick={() => onVisibilityToggle(id, board.visible === false)} />}
            <IconButton size="sm" icon={<VectoriaIcon name="plus" size={13} />} label={`Duplikuj ${board.name}`} onClick={() => onDuplicate(id)} />
            <IconButton size="sm" icon={<VectoriaIcon name="trash" size={13} />} label={`Usuń ${board.name}`} disabled={doc.artboardIds.length <= 1} onClick={() => setArtboardToDelete({ id, name: board.name })} />
          </div>;
        })}
      </div>
      <Button size="sm" variant="secondary" icon={<VectoriaIcon name="plus" size={13} />} onClick={onCreate}>Dodaj artboard</Button>
    </div>

    {artboardToDelete && (
      <ConfirmDialog
        title="Usuń artboard"
        description={`Czy na pewno chcesz usunąć artboard „${artboardToDelete.name}”? Zawarte na nim obiekty mogą zostać usunięte lub przesunięte poza obszar roboczy.`}
        confirmLabel="Usuń"
        cancelLabel="Anuluj"
        destructive
        testId="confirm-delete-artboard"
        onConfirm={() => {
          onDelete(artboardToDelete.id);
          setArtboardToDelete(null);
        }}
        onCancel={() => setArtboardToDelete(null)}
      />
    )}
  </section>
  );
};
