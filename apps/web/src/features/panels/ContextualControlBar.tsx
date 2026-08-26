import React from 'react';
import type { DocumentModel, ObjectId, RectangleObject, EllipseObject, LineObject } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { ColorControl, NumberInput } from '@vectoria/ui';
import { convertUnit } from '@vectoria/shared';
import type { ActiveTool } from '../toolbar/ToolRail.js';
import type { StyleSampleTarget } from '@vectoria/editor-engine';

export interface FreehandSettings {
  smoothing: number;
  accuracy: number;
  width: number;
  pressure: boolean;
  cap: 'butt' | 'round' | 'square';
  join: 'miter' | 'round' | 'bevel';
  eraserRadius: number;
}

export interface ContextualControlBarProps {
  document: DocumentModel;
  activeTool: ActiveTool;
  selectedObjectId: ObjectId | null;
  onUpdatePosition: (id: ObjectId, x: number, y: number) => void;
  onUpdateDimensions: (id: ObjectId, width: number, height: number) => void;
  onUpdateLineEndpoint?: (id: ObjectId, endPoint: Vec2) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
  freehandSettings?: FreehandSettings;
  onFreehandSettingsChange?: (settings: FreehandSettings) => void;
  styleSampleTarget?: StyleSampleTarget;
  onStyleSampleTargetChange?: (target: StyleSampleTarget) => void;
  styleSampleTolerance?: number;
  onStyleSampleToleranceChange?: (tolerance: number) => void;
}

export const ContextualControlBar: React.FC<ContextualControlBarProps> = ({
  document: doc,
  activeTool,
  selectedObjectId,
  onUpdatePosition,
  onUpdateDimensions,
  onUpdateLineEndpoint,
  onUpdateFill,
  freehandSettings,
  onFreehandSettingsChange,
  styleSampleTarget = 'style',
  onStyleSampleTargetChange,
  styleSampleTolerance = 0,
  onStyleSampleToleranceChange,
}) => {
  const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
  const rectangle = selected?.type === 'rectangle' ? selected as RectangleObject : null;
  const ellipse = selected?.type === 'ellipse' ? selected as EllipseObject : null;
  const line = selected?.type === 'line' ? selected as LineObject : null;
  const selectedShape = rectangle ?? ellipse;
  const selectedFillColor = selectedShape?.style.fill.type === 'solid' ? selectedShape.style.fill.color : null;
  const drawing = freehandSettings;
  const updateDrawing = (patch: Partial<FreehandSettings>) => drawing && onFreehandSettingsChange?.({ ...drawing, ...patch });

  return (
    <section className="contextual-control-bar" data-testid="contextual-control-bar" aria-label="Kontrolki kontekstowe">
       <span className="contextual-label">{rectangle ? 'Prostokąt' : ellipse ? 'Elipsa' : line ? 'Linia' : activeTool === 'select' ? 'Zaznaczenie' : activeTool === 'direct-select' ? 'Węzły' : activeTool === 'rectangle' ? 'Prostokąt' : activeTool === 'ellipse' ? 'Elipsa' : activeTool === 'line' ? 'Linia' : activeTool === 'pencil' ? 'Pencil' : activeTool === 'brush' ? 'Brush' : activeTool === 'smooth' ? 'Smooth' : activeTool === 'corner' ? 'Corner Tool' : activeTool === 'eraser' ? 'Eraser' : activeTool === 'knife' ? 'Knife' : activeTool === 'scissors' ? 'Scissors' : activeTool === 'width' ? 'Width' : activeTool === 'zoom' ? 'Zoom' : 'Nawigacja'}</span>
       {(activeTool === 'eyedropper' || activeTool === 'bucket') ? (
         <div className="contextual-field-group" aria-label="Style sampling target">
            <label className="contextual-select-label">Target<select className="contextual-select" aria-label="Style sampling target" value={activeTool === 'bucket' && styleSampleTarget === 'style' ? 'fill' : styleSampleTarget} onChange={(event) => onStyleSampleTargetChange?.(event.target.value as StyleSampleTarget)}><option value="fill">Fill</option><option value="stroke">Stroke</option>{activeTool === 'eyedropper' && <option value="style">Whole style</option>}</select></label>
            {activeTool === 'bucket' && <NumberInput data-testid="bucket-tolerance" label="Tolerance" min={0} max={100} value={styleSampleTolerance} unit="%" decimals={0} onChange={onStyleSampleToleranceChange ?? (() => undefined)} />}
            <span className="contextual-hint">Click source object, then apply to selection</span>
         </div>
       ) : rectangle || ellipse ? (
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
       ) : drawing && (activeTool === 'pencil' || activeTool === 'brush' || activeTool === 'smooth' || activeTool === 'eraser') ? (
         <div className="contextual-field-group" aria-label="Ustawienia rysowania">
           {(activeTool === 'pencil' || activeTool === 'brush' || activeTool === 'smooth') && <NumberInput data-testid="drawing-smoothing" label="Smooth" min={0} max={100} value={drawing.smoothing} unit="%" onChange={(value) => updateDrawing({ smoothing: value })} />}
           {(activeTool === 'pencil' || activeTool === 'brush') && <NumberInput data-testid="drawing-width" label="Width" min={0.1} value={drawing.width} unit="px" decimals={1} onChange={(value) => updateDrawing({ width: value })} />}
           {activeTool === 'eraser' && <NumberInput data-testid="eraser-radius" label="Radius" min={1} value={drawing.eraserRadius} unit="px" decimals={0} onChange={(value) => updateDrawing({ eraserRadius: value })} />}
           {(activeTool === 'brush') && <label className="contextual-toggle"><input type="checkbox" checked={drawing.pressure} onChange={(event) => updateDrawing({ pressure: event.target.checked })} /> Pressure</label>}
           {(activeTool === 'brush') && <label className="contextual-select-label">Cap<select className="contextual-select" aria-label="Brush cap" value={drawing.cap} onChange={(event) => updateDrawing({ cap: event.target.value as FreehandSettings['cap'] })}><option value="butt">Butt</option><option value="round">Round</option><option value="square">Square</option></select></label>}
           {(activeTool === 'brush') && <label className="contextual-select-label">Join<select className="contextual-select" aria-label="Brush join" value={drawing.join} onChange={(event) => updateDrawing({ join: event.target.value as FreehandSettings['join'] })}><option value="miter">Miter</option><option value="round">Round</option><option value="bevel">Bevel</option></select></label>}
         </div>
       ) : (
        <span className="contextual-hint">{activeTool === 'select' ? 'Wybierz obiekt, aby edytować właściwości' : activeTool === 'direct-select' ? 'Wybierz węzeł ścieżki' : activeTool === 'rectangle' ? 'Przeciągnij na obszarze roboczym, aby narysować' : 'Przeciągnij, aby nawigować po obszarze roboczym'}</span>
      )}
    </section>
  );
};
