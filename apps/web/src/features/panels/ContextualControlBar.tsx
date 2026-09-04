import React from 'react';
import {
  type DocumentModel,
  type ObjectId,
  type LineObject,
  type Transform2D,
  getObjectBounds,
} from '@vectoria/core';
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
  onUpdateRotation?: (id: ObjectId, rotation: number) => void;
  onUpdateLineEndpoint?: (id: ObjectId, endPoint: Vec2) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
  previewTransforms?: Record<string, Transform2D>;
  freehandSettings?: FreehandSettings;
  onFreehandSettingsChange?: (settings: FreehandSettings) => void;
  styleSampleTarget?: StyleSampleTarget;
  onStyleSampleTargetChange?: (target: StyleSampleTarget) => void;
  styleSampleTolerance?: number;
  onStyleSampleToleranceChange?: (tolerance: number) => void;
}

const TOOL_LABELS: Record<ActiveTool, string> = {
  select: 'Zaznaczenie',
  'direct-select': 'Węzły',
  lasso: 'Lasso',
  'node-lasso': 'Lasso węzłów',
  rectangle: 'Prostokąt',
  ellipse: 'Elipsa',
  line: 'Linia',
  polygon: 'Wielokąt',
  star: 'Gwiazda',
  arc: 'Łuk',
  pie: 'Sektor',
  ring: 'Pierścień',
  spiral: 'Spirala',
  callout: 'Dymek',
  polyline: 'Polilinia',
  pen: 'Pióro',
  pencil: 'Ołówek',
  brush: 'Pędzel',
  smooth: 'Wygładzanie',
  corner: 'Narożnik',
  eraser: 'Gumka',
  knife: 'Nóż',
  scissors: 'Nożyczki',
  width: 'Szerokość',
  text: 'Tekst',
  eyedropper: 'Kroplomierz',
  bucket: 'Wiadro koloru',
  hand: 'Łapa / Pan',
  zoom: 'Zoom',
};

const OBJECT_TYPE_LABELS: Record<string, string> = {
  rectangle: 'Prostokąt',
  ellipse: 'Elipsa',
  line: 'Linia',
  path: 'Ścieżka',
  polygon: 'Wielokąt',
  star: 'Gwiazda',
  arc: 'Łuk',
  pie: 'Sektor',
  ring: 'Pierścień',
  spiral: 'Spirala',
  callout: 'Dymek',
  polyline: 'Polilinia',
  text: 'Tekst',
  'text-frame': 'Ramka tekstowa',
  group: 'Grupa',
  image: 'Obraz',
};

export const ContextualControlBar: React.FC<ContextualControlBarProps> = ({
  document: doc,
  activeTool,
  selectedObjectId,
  onUpdatePosition,
  onUpdateDimensions,
  onUpdateRotation,
  onUpdateLineEndpoint,
  onUpdateFill,
  previewTransforms,
  freehandSettings,
  onFreehandSettingsChange,
  styleSampleTarget = 'style',
  onStyleSampleTargetChange,
  styleSampleTolerance = 0,
  onStyleSampleToleranceChange,
}) => {
  const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
  const line = selected?.type === 'line' ? (selected as LineObject) : null;
  const drawing = freehandSettings;
  const updateDrawing = (patch: Partial<FreehandSettings>) => drawing && onFreehandSettingsChange?.({ ...drawing, ...patch });

  const isDrawingTool = activeTool === 'pencil' || activeTool === 'brush' || activeTool === 'smooth' || activeTool === 'eraser';
  const labelText = isDrawingTool || activeTool === 'eyedropper' || activeTool === 'bucket'
    ? (TOOL_LABELS[activeTool] ?? 'Rysowanie')
    : selected
    ? (OBJECT_TYPE_LABELS[selected.type] ?? TOOL_LABELS[activeTool] ?? 'Obiekt')
    : (TOOL_LABELS[activeTool] ?? 'Nawigacja');

  const currentTransform: Transform2D | null = selected
    ? (previewTransforms && selected.id in previewTransforms ? previewTransforms[selected.id]! : selected.transform)
    : null;

  const baseBounds = selected ? getObjectBounds(selected, doc) : null;
  const currentBounds = selected && baseBounds
    ? {
        ...baseBounds,
        width: baseBounds.width * Math.abs((currentTransform?.scale?.x ?? 1) / (selected.transform.scale?.x || 1)),
        height: baseBounds.height * Math.abs((currentTransform?.scale?.y ?? 1) / (selected.transform.scale?.y || 1)),
      }
    : null;
  const currentFillColor = selected?.style?.fill?.type === 'solid' ? selected.style.fill.color : null;
  const currentAngleDeg = currentTransform
    ? Math.round(((((currentTransform.rotation * 180) / Math.PI) % 360) + 360) % 360 * 10) / 10
    : 0;

  return (
    <section className="contextual-control-bar" data-testid="contextual-control-bar" aria-label="Kontrolki kontekstowe">
      <span className="contextual-label">{labelText}</span>
      {activeTool === 'eyedropper' || activeTool === 'bucket' ? (
        <div className="contextual-field-group" aria-label="Style sampling target">
          <label className="contextual-select-label">
            Target
            <select
              className="contextual-select"
              aria-label="Style sampling target"
              value={activeTool === 'bucket' && styleSampleTarget === 'style' ? 'fill' : styleSampleTarget}
              onChange={(event) => onStyleSampleTargetChange?.(event.target.value as StyleSampleTarget)}
            >
              <option value="fill">Fill</option>
              <option value="stroke">Stroke</option>
              {activeTool === 'eyedropper' && <option value="style">Whole style</option>}
            </select>
          </label>
          {activeTool === 'bucket' && (
            <NumberInput
              data-testid="bucket-tolerance"
              label="Tolerance"
              min={0}
              max={100}
              value={styleSampleTolerance}
              unit="%"
              decimals={0}
              onChange={onStyleSampleToleranceChange ?? (() => undefined)}
            />
          )}
          <span className="contextual-hint">Click source object, then apply to selection</span>
        </div>
      ) : drawing && isDrawingTool ? (
        <div className="contextual-field-group" aria-label="Ustawienia rysowania">
          {(activeTool === 'pencil' || activeTool === 'brush' || activeTool === 'smooth') && (
            <NumberInput
              data-testid="drawing-smoothing"
              label="Smooth"
              min={0}
              max={100}
              value={drawing.smoothing}
              unit="%"
              onChange={(value) => updateDrawing({ smoothing: value })}
            />
          )}
          {(activeTool === 'pencil' || activeTool === 'brush') && (
            <NumberInput
              data-testid="drawing-width"
              label="Width"
              min={0.1}
              value={drawing.width}
              unit="px"
              decimals={1}
              onChange={(value) => updateDrawing({ width: value })}
            />
          )}
          {activeTool === 'eraser' && (
            <NumberInput
              data-testid="eraser-radius"
              label="Radius"
              min={1}
              value={drawing.eraserRadius}
              unit="px"
              decimals={0}
              onChange={(value) => updateDrawing({ eraserRadius: value })}
            />
          )}
          {activeTool === 'brush' && (
            <>
              <label className="contextual-toggle">
                <input
                  type="checkbox"
                  checked={drawing.pressure}
                  onChange={(event) => updateDrawing({ pressure: event.target.checked })}
                />
                Pressure
              </label>
              <label className="contextual-select-label">
                Cap
                <select
                  className="contextual-select"
                  aria-label="Brush cap"
                  value={drawing.cap}
                  onChange={(event) => updateDrawing({ cap: event.target.value as FreehandSettings['cap'] })}
                >
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                  <option value="butt">Butt</option>
                </select>
              </label>
              <label className="contextual-select-label">
                Join
                <select
                  className="contextual-select"
                  aria-label="Brush join"
                  value={drawing.join}
                  onChange={(event) => updateDrawing({ join: event.target.value as FreehandSettings['join'] })}
                >
                  <option value="round">Round</option>
                  <option value="bevel">Bevel</option>
                  <option value="miter">Miter</option>
                </select>
              </label>
            </>
          )}
        </div>
      ) : selected && currentTransform && currentBounds ? (
        <>
          <div className="contextual-field-group" aria-label="Transformacja">
            <NumberInput
              data-testid="contextual-x"
              label="X"
              value={convertUnit(currentTransform.position.x, 'px', doc.unit)}
              unit={doc.unit}
              onChange={(value) =>
                onUpdatePosition(selected.id, convertUnit(value, doc.unit, 'px'), currentTransform.position.y)
              }
            />
            <NumberInput
              data-testid="contextual-y"
              label="Y"
              value={convertUnit(currentTransform.position.y, 'px', doc.unit)}
              unit={doc.unit}
              onChange={(value) =>
                onUpdatePosition(selected.id, currentTransform.position.x, convertUnit(value, doc.unit, 'px'))
              }
            />
            <NumberInput
              data-testid="contextual-w"
              label="W"
              min={0.000001}
              value={convertUnit(currentBounds.width, 'px', doc.unit)}
              unit={doc.unit}
              onChange={(value) =>
                onUpdateDimensions(selected.id, convertUnit(value, doc.unit, 'px'), currentBounds.height)
              }
            />
            <NumberInput
              data-testid="contextual-h"
              label="H"
              min={0.000001}
              value={convertUnit(currentBounds.height, 'px', doc.unit)}
              unit={doc.unit}
              onChange={(value) =>
                onUpdateDimensions(selected.id, currentBounds.width, convertUnit(value, doc.unit, 'px'))
              }
            />
            <NumberInput
              data-testid="contextual-angle"
              label="Kąt"
              value={currentAngleDeg}
              unit="°"
              decimals={1}
              onChange={(deg) => onUpdateRotation?.(selected.id, (deg * Math.PI) / 180)}
            />
          </div>
          {line ? (
            <div className="contextual-field-group" aria-label="Punkt końcowy linii">
              <NumberInput
                data-testid="contextual-end-x"
                label="End X"
                value={convertUnit(line.endPoint.x, 'px', doc.unit)}
                unit={doc.unit}
                onChange={(value) =>
                  onUpdateLineEndpoint?.(line.id, { x: convertUnit(value, doc.unit, 'px'), y: line.endPoint.y })
                }
              />
              <NumberInput
                data-testid="contextual-end-y"
                label="End Y"
                value={convertUnit(line.endPoint.y, 'px', doc.unit)}
                unit={doc.unit}
                onChange={(value) =>
                  onUpdateLineEndpoint?.(line.id, { x: line.endPoint.x, y: convertUnit(value, doc.unit, 'px') })
                }
              />
            </div>
          ) : null}
          {selected.style?.fill ? (
            <ColorControl
              label="Fill"
              color={currentFillColor}
              onChange={(value) => onUpdateFill(selected.id, value)}
            />
          ) : null}
        </>
      ) : (
        <span className="contextual-hint">
          {activeTool === 'select'
            ? 'Wybierz obiekt, aby edytować właściwości'
            : activeTool === 'direct-select'
            ? 'Wybierz węzeł ścieżki'
            : activeTool === 'rectangle'
            ? 'Przeciągnij na obszarze roboczym, aby narysować'
            : 'Przeciągnij, aby nawigować po obszarze roboczym'}
        </span>
      )}
    </section>
  );
};
