import React from 'react';
import type { DocumentModel, ObjectId, RectangleObject } from '@vectoria/core';
import { ColorControl, NumberInput } from '@vectoria/ui';
import { convertUnit } from '@vectoria/shared';
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
            <NumberInput data-testid="contextual-x" label="X" value={convertUnit(rectangle.transform.position.x, 'px', doc.unit)} unit={doc.unit} onChange={(value) => onUpdatePosition(rectangle.id, convertUnit(value, doc.unit, 'px'), rectangle.transform.position.y)} />
            <NumberInput data-testid="contextual-y" label="Y" value={convertUnit(rectangle.transform.position.y, 'px', doc.unit)} unit={doc.unit} onChange={(value) => onUpdatePosition(rectangle.id, rectangle.transform.position.x, convertUnit(value, doc.unit, 'px'))} />
            <NumberInput data-testid="contextual-w" label="W" min={0.000001} value={convertUnit(rectangle.width, 'px', doc.unit)} unit={doc.unit} onChange={(value) => onUpdateDimensions(rectangle.id, convertUnit(value, doc.unit, 'px'), rectangle.height)} />
            <NumberInput data-testid="contextual-h" label="H" min={0.000001} value={convertUnit(rectangle.height, 'px', doc.unit)} unit={doc.unit} onChange={(value) => onUpdateDimensions(rectangle.id, rectangle.width, convertUnit(value, doc.unit, 'px'))} />
          </div>
          <ColorControl label="Fill" color={rectangle.style.fill.type === 'solid' ? rectangle.style.fill.color : null} onChange={(value) => onUpdateFill(rectangle.id, value)} />
        </>
      ) : (
        <span className="contextual-hint">{activeTool === 'select' ? 'Wybierz obiekt, aby edytować właściwości' : activeTool === 'rectangle' ? 'Przeciągnij na obszarze roboczym, aby narysować' : 'Przeciągnij, aby nawigować po obszarze roboczym'}</span>
      )}
    </section>
  );
};
