import React from 'react';
import type { DocumentModel, ObjectId, SceneObject } from '@vectoria/core';
import { IconButton, VectoriaIcon } from '@vectoria/ui';

export interface LayersPanelProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  selectedObjectIds?: readonly ObjectId[];
  onSelectObject: (id: ObjectId, additive?: boolean) => void;
  onSelectObjects?: (ids: readonly ObjectId[], additive?: boolean) => void;
  onToggleObject?: (id: ObjectId, field: 'visible' | 'locked') => void;
}

const objectIcon: Record<SceneObject['type'], React.ComponentProps<typeof VectoriaIcon>['name']> = {
  rectangle: 'rectangle', ellipse: 'ellipse', line: 'line', path: 'pen',
};

export const LayersPanel: React.FC<LayersPanelProps> = ({ document: doc, selectedObjectId, selectedObjectIds = [], onSelectObject, onToggleObject }) => {
  const objects = doc.layerIds.flatMap((layerId) => {
    const layer = doc.layers[layerId];
    return layer ? layer.objectIds.map((objectId) => doc.objects[objectId]).filter((object): object is SceneObject => Boolean(object)) : [];
  });

  return (
    <section className="dock-panel-content layers-panel" data-testid="layers-panel" aria-label="Warstwy">
      <div className="panel-section-heading"><span>Obiekty</span><span className="panel-count">{objects.length}</span></div>
      {objects.length === 0 ? <div className="panel-empty-state"><VectoriaIcon name="layers" size={24} /><strong>Brak obiektów</strong><span>Wybierz Prostokąt i przeciągnij na obszarze roboczym.</span></div> : (
        <div role="list" aria-label="Lista obiektów">
          {objects.map((object) => (
            <div key={object.id} role="listitem" className={`layer-row ${selectedObjectIds.includes(object.id) || selectedObjectId === object.id ? 'is-selected' : ''}`}>
              <button type="button" className="layer-select-button" onClick={(event) => onSelectObject(object.id, event.shiftKey)} aria-label={`Zaznacz ${object.name}`} aria-pressed={selectedObjectIds.includes(object.id) || selectedObjectId === object.id}>
                <VectoriaIcon name={objectIcon[object.type]} size={16} /><span>{object.name}</span>
              </button>
               <IconButton size="sm" icon={<VectoriaIcon name={object.visible ? 'visible' : 'hidden'} size={14} />} label={`${object.name}: widoczność`} onClick={() => onToggleObject?.(object.id, 'visible')} />
               <IconButton size="sm" icon={<VectoriaIcon name={object.locked ? 'lock' : 'unlock'} size={14} />} label={`${object.name}: blokada`} onClick={() => onToggleObject?.(object.id, 'locked')} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
