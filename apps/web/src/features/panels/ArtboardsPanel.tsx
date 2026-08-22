import React from 'react';
import type { DocumentModel, ArtboardId } from '@vectoria/core';
import { Button, IconButton, VectoriaIcon } from '@vectoria/ui';
import { convertUnit } from '@vectoria/shared';

export interface ArtboardsPanelProps {
  document: DocumentModel;
  onSelect: (id: ArtboardId) => void;
  onCreate: () => void;
  onDuplicate: (id: ArtboardId) => void;
  onDelete: (id: ArtboardId) => void;
}

export const ArtboardsPanel: React.FC<ArtboardsPanelProps> = ({ document: doc, onSelect, onCreate, onDuplicate, onDelete }) => (
  <section className="artboards-panel" data-testid="artboards-panel">
    <div className="dock-panel-content">
      <div className="panel-section-heading"><span>Artboardy</span><span className="panel-count">{doc.artboardIds.length}</span></div>
      <div className="artboard-list">
        {doc.artboardIds.map((id) => {
          const board = doc.artboards[id];
          if (!board) return null;
          return <div key={id} className={`artboard-row ${id === doc.activeArtboardId ? 'is-selected' : ''}`}>
            <button type="button" className="artboard-select-button" aria-pressed={id === doc.activeArtboardId} onClick={() => onSelect(id)}><VectoriaIcon name="rectangle" size={14} /><span>{board.name}</span><small>{convertUnit(board.width, 'px', doc.unit).toFixed(1)} × {convertUnit(board.height, 'px', doc.unit).toFixed(1)} {doc.unit}</small></button>
            <IconButton size="sm" icon={<VectoriaIcon name="plus" size={13} />} label={`Duplikuj ${board.name}`} onClick={() => onDuplicate(id)} />
            <IconButton size="sm" icon={<VectoriaIcon name="trash" size={13} />} label={`Usuń ${board.name}`} disabled={doc.artboardIds.length <= 1} onClick={() => onDelete(id)} />
          </div>;
        })}
      </div>
      <Button size="sm" variant="secondary" icon={<VectoriaIcon name="plus" size={13} />} onClick={onCreate}>Dodaj artboard</Button>
    </div>
  </section>
);
