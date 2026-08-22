import React from 'react';
import type { DocumentModel, ObjectId, ObjectStyle, SceneObject } from '@vectoria/core';
import { defaultStroke } from '@vectoria/core';
import { NumberInput, ColorControl, Button } from '@vectoria/ui';

export interface PropertiesPanelProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  onUpdatePosition: (id: ObjectId, x: number, y: number) => void;
  onUpdateDimensions: (id: ObjectId, width: number, height: number) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
  onUpdateObjectStyle?: (id: ObjectId, patch: Partial<ObjectStyle>) => void;
  onUpdateRotation?: (id: ObjectId, degrees: number) => void;
  onUpdateArtboard?: (width: number, height: number) => void;
}

const dimensions = (object: SceneObject): { width: number; height: number } | null =>
  object.type === 'rectangle' || object.type === 'ellipse' ? { width: object.width, height: object.height } : null;

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  document: doc,
  selectedObjectId,
  onUpdatePosition,
  onUpdateDimensions,
  onUpdateFill,
  onUpdateObjectStyle,
  onUpdateRotation,
  onUpdateArtboard,
}) => {
  const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
  const artboard = doc.artboards[doc.activeArtboardId];
  const size = selected ? dimensions(selected) : null;
  const patchStyle = (patch: Partial<ObjectStyle>) => selected && onUpdateObjectStyle?.(selected.id, patch);

  return (
    <aside className="properties-panel" data-testid="properties-panel">
      <div className="panel-section-heading"><span>{selected ? 'Object Properties' : 'Artboard Properties'}</span></div>
      <div className="dock-panel-content">
        {selected ? <>
          <section className="property-section">
            <div className="panel-section-heading"><span>Transformacja</span></div>
            <div className="property-grid">
              <NumberInput data-testid="prop-x" label="X" value={selected.transform.position.x} decimals={2} onChange={(value) => onUpdatePosition(selected.id, value, selected.transform.position.y)} />
              <NumberInput data-testid="prop-y" label="Y" value={selected.transform.position.y} decimals={2} onChange={(value) => onUpdatePosition(selected.id, selected.transform.position.x, value)} />
              {size && <>
                <NumberInput data-testid="prop-w" label="W" min={1} value={size.width} decimals={2} onChange={(value) => onUpdateDimensions(selected.id, value, size.height)} />
                <NumberInput data-testid="prop-h" label="H" min={1} value={size.height} decimals={2} onChange={(value) => onUpdateDimensions(selected.id, size.width, value)} />
              </>}
              <NumberInput data-testid="prop-rotation" label="Rot" value={selected.transform.rotation * 180 / Math.PI} decimals={1} unit="°" onChange={(value) => onUpdateRotation?.(selected.id, value)} />
            </div>
          </section>
          <section className="property-section">
            <div className="panel-section-heading"><span>Wygląd</span></div>
            <ColorControl label="Fill" color={selected.style.fill.type === 'solid' ? selected.style.fill.color : null} onChange={(value) => onUpdateFill(selected.id, value)} />
            <ColorControl label="Stroke" color={selected.style.stroke?.color ?? null} onChange={(value) => patchStyle({ stroke: value ? { ...(selected.style.stroke ?? defaultStroke), color: value } : null })} />
            <NumberInput data-testid="prop-stroke-width" label="Stroke" value={selected.style.stroke?.width ?? 0} min={0.1} disabled={!selected.style.stroke} decimals={1} onChange={(value) => selected.style.stroke && patchStyle({ stroke: { ...selected.style.stroke, width: value } })} />
            <NumberInput data-testid="prop-opacity" label="Opacity" value={selected.style.opacity} min={0} max={1} step={0.05} decimals={2} unit="" onChange={(value) => patchStyle({ opacity: value })} />
            <div className="property-actions">
              <Button size="sm" variant="ghost" onClick={() => patchStyle({ fill: { type: 'linear-gradient', start: { x: 0, y: 0 }, end: { x: size?.width ?? 100, y: 0 }, stops: [{ offset: 0, color: '#5caeff', opacity: 1 }, { offset: 1, color: '#8e5cff', opacity: 1 }] } })}>Gradient</Button>
            </div>
          </section>
        </> : artboard ? <>
          <section className="property-section">
            <div className="panel-section-heading"><span>Artboard</span></div>
            <div className="property-grid">
              <NumberInput data-testid="artboard-width" label="W" min={1} value={artboard.width} decimals={2} onChange={(value) => onUpdateArtboard?.(value, artboard.height)} />
              <NumberInput data-testid="artboard-height" label="H" min={1} value={artboard.height} decimals={2} onChange={(value) => onUpdateArtboard?.(artboard.width, value)} />
            </div>
            <p className="panel-note">Rozmiar artboardu zmienia model świata. Canvas zawsze pozostaje wielkości viewportu.</p>
          </section>
        </> : null}
      </div>
    </aside>
  );
};
