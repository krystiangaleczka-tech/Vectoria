import React from 'react';
import type { DocumentModel, ObjectId, RectangleObject } from '@vectoria/core';
import { ColorControl, NumberInput } from '@vectoria/ui';
import type { ActiveTool } from '../toolbar/ToolRail.js';

export interface ContextualControlBarProps {
  document: DocumentModel;
  activeTool: ActiveTool;
  selectedObjectId: ObjectId | null;
  onUpdatePosition: (id: ObjectId, x: number, y: number) => void;
  onUpdateDimensions: (id: ObjectId, width: number, height: number) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
}

export const ContextualControlBar: React.FC<ContextualControlBarProps> = ({
  document: doc,
  activeTool,
  selectedObjectId,
  onUpdatePosition,
  onUpdateDimensions,
  onUpdateFill,
}) => {
  const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
  const rectangle = selected?.type === 'rectangle' ? selected as RectangleObject : null;

  return (
    <section className="contextual-control-bar" data-testid="contextual-control-bar" aria-label="Kontrolki kontekstowe">
      <span className="contextual-label">{rectangle ? 'Prostokąt' : activeTool === 'select' ? 'Zaznaczenie' : activeTool === 'rectangle' ? 'Prostokąt' : activeTool === 'zoom' ? 'Zoom' : 'Nawigacja'}</span>
      {rectangle ? (
        <>
          <div className="contextual-field-group" aria-label="Transformacja">
            <NumberInput data-testid="contextual-x" label="X" value={rectangle.transform.position.x} onChange={(value) => onUpdatePosition(rectangle.id, value, rectangle.transform.position.y)} />
            <NumberInput data-testid="contextual-y" label="Y" value={rectangle.transform.position.y} onChange={(value) => onUpdatePosition(rectangle.id, rectangle.transform.position.x, value)} />
            <NumberInput data-testid="contextual-w" label="W" min={1} value={rectangle.width} onChange={(value) => onUpdateDimensions(rectangle.id, value, rectangle.height)} />
            <NumberInput data-testid="contextual-h" label="H" min={1} value={rectangle.height} onChange={(value) => onUpdateDimensions(rectangle.id, rectangle.width, value)} />
          </div>
          <ColorControl label="Fill" color={rectangle.style.fill.type === 'solid' ? rectangle.style.fill.color : null} onChange={(value) => onUpdateFill(rectangle.id, value)} />
        </>
      ) : (
        <span className="contextual-hint">{activeTool === 'select' ? 'Wybierz obiekt, aby edytować właściwości' : activeTool === 'rectangle' ? 'Przeciągnij na obszarze roboczym, aby narysować' : 'Przeciągnij, aby nawigować po obszarze roboczym'}</span>
      )}
    </section>
  );
};
