import React from 'react';
import type { DocumentModel, ObjectId, RectangleObject, EllipseObject, LineObject } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { ColorControl, NumberInput } from '@vectoria/ui';
import { convertUnit } from '@vectoria/shared';
import type { ActiveTool } from '../toolbar/ToolRail.js';

export interface ContextualControlBarProps {
  document: DocumentModel;
  activeTool: ActiveTool;
  selectedObjectId: ObjectId | null;
  onUpdatePosition: (id: ObjectId, x: number, y: number) => void;
  onUpdateDimensions: (id: ObjectId, width: number, height: number) => void;
  onUpdateLineEndpoint?: (id: ObjectId, endPoint: Vec2) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
}

export const ContextualControlBar: React.FC<ContextualControlBarProps> = ({
  document: doc,
  activeTool,
  selectedObjectId,
  onUpdatePosition,
  onUpdateDimensions,
  onUpdateLineEndpoint,
  onUpdateFill,
}) => {
  const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
  const rectangle = selected?.type === 'rectangle' ? selected as RectangleObject : null;
  const ellipse = selected?.type === 'ellipse' ? selected as EllipseObject : null;
  const line = selected?.type === 'line' ? selected as LineObject : null;
  const selectedShape = rectangle ?? ellipse;
  const selectedFillColor = selectedShape?.style.fill.type === 'solid' ? selectedShape.style.fill.color : null;

  return (
    <section className="contextual-control-bar" data-testid="contextual-control-bar" aria-label="Kontrolki kontekstowe">
      <span className="contextual-label">{rectangle ? 'Prostokąt' : ellipse ? 'Elipsa' : line ? 'Linia' : activeTool === 'select' ? 'Zaznaczenie' : activeTool === 'direct-select' ? 'Węzły' : activeTool === 'rectangle' ? 'Prostokąt' : activeTool === 'ellipse' ? 'Elipsa' : activeTool === 'line' ? 'Linia' : activeTool === 'zoom' ? 'Zoom' : 'Nawigacja'}</span>
      {rectangle || ellipse ? (
        <>
          <div className="contextual-field-group" aria-label="Transformacja">
             <NumberInput data-testid="contextual-x" label="X" value={convertUnit(selectedShape!.transform.position.x, 'px', doc.unit)} unit={doc.unit} onChange={(value) => onUpdatePosition(selectedShape!.id, convertUnit(value, doc.unit, 'px'), selectedShape!.transform.position.y)} />
             <NumberInput data-testid="contextual-y" label="Y" value={convertUnit(selectedShape!.transform.position.y, 'px', doc.unit)} unit={doc.unit} onChange={(value) => onUpdatePosition(selectedShape!.id, selectedShape!.transform.position.x, convertUnit(value, doc.unit, 'px'))} />
             <NumberInput data-testid="contextual-w" label="W" min={0.000001} value={convertUnit(selectedShape!.width, 'px', doc.unit)} unit={doc.unit} onChange={(value) => onUpdateDimensions(selectedShape!.id, convertUnit(value, doc.unit, 'px'), selectedShape!.height)} />
             <NumberInput data-testid="contextual-h" label="H" min={0.000001} value={convertUnit(selectedShape!.height, 'px', doc.unit)} unit={doc.unit} onChange={(value) => onUpdateDimensions(selectedShape!.id, selectedShape!.width, convertUnit(value, doc.unit, 'px'))} />
           </div>
           <ColorControl label="Fill" color={selectedFillColor} onChange={(value) => onUpdateFill(selectedShape!.id, value)} />
         </>
      ) : line ? (
        <div className="contextual-field-group" aria-label="Punkt końcowy linii">
          <NumberInput data-testid="contextual-end-x" label="End X" value={convertUnit(line.endPoint.x, 'px', doc.unit)} unit={doc.unit} onChange={(value) => onUpdateLineEndpoint?.(line.id, { x: convertUnit(value, doc.unit, 'px'), y: line.endPoint.y })} />
          <NumberInput data-testid="contextual-end-y" label="End Y" value={convertUnit(line.endPoint.y, 'px', doc.unit)} unit={doc.unit} onChange={(value) => onUpdateLineEndpoint?.(line.id, { x: line.endPoint.x, y: convertUnit(value, doc.unit, 'px') })} />
        </div>
      ) : (
        <span className="contextual-hint">{activeTool === 'select' ? 'Wybierz obiekt, aby edytować właściwości' : activeTool === 'direct-select' ? 'Wybierz węzeł ścieżki' : activeTool === 'rectangle' ? 'Przeciągnij na obszarze roboczym, aby narysować' : 'Przeciągnij, aby nawigować po obszarze roboczym'}</span>
      )}
    </section>
  );
};
