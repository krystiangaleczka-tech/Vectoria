import React from 'react';
import type { DocumentModel, ObjectId, ObjectStyle, SceneObject, CornerRadii } from '@vectoria/core';
import { normalizeCornerRadii } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { defaultStroke } from '@vectoria/core';
import { NumberInput, ColorControl, Button } from '@vectoria/ui';
import { convertUnit } from '@vectoria/shared';
import type { DocumentUnit } from '@vectoria/core';
import type { GridSettings } from '@vectoria/editor-engine';

export interface PropertiesPanelProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  selectedObjectIds?: readonly ObjectId[];
  onUpdatePosition: (id: ObjectId, x: number, y: number) => void;
  onUpdateDimensions: (id: ObjectId, width: number, height: number) => void;
  onUpdateLineEndpoint?: (id: ObjectId, endPoint: Vec2) => void;
  onUpdateCornerRadius?: (id: ObjectId, radii: CornerRadii) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
  onUpdateObjectStyle?: (id: ObjectId, patch: Partial<ObjectStyle>) => void;
  onUpdateRotation?: (id: ObjectId, degrees: number) => void;
  onUpdateArtboard?: (width: number, height: number, background?: { type: 'transparent' } | { type: 'color'; color: string }) => void;
  onUpdateUnit?: (unit: DocumentUnit) => void;
  gridSettings?: GridSettings;
  onUpdateGridSettings?: (settings: GridSettings) => void;
}

const dimensions = (object: SceneObject): { width: number; height: number } | null =>
  object.type === 'rectangle' || object.type === 'ellipse' ? { width: object.width, height: object.height } : null;

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  document: doc,
  selectedObjectId,
  selectedObjectIds = selectedObjectId ? [selectedObjectId] : [],
  onUpdatePosition,
  onUpdateDimensions,
  onUpdateLineEndpoint,
  onUpdateCornerRadius,
  onUpdateFill,
  onUpdateObjectStyle,
  onUpdateRotation,
  onUpdateArtboard,
  onUpdateUnit,
  gridSettings,
  onUpdateGridSettings,
}) => {
  const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
  const artboard = doc.artboards[doc.activeArtboardId];
  const size = selected ? dimensions(selected) : null;
  const radii = selected?.type === 'rectangle' ? normalizeCornerRadii(selected.cornerRadius, selected.width, selected.height) : null;
  const patchStyle = (patch: Partial<ObjectStyle>) => selected && onUpdateObjectStyle?.(selected.id, patch);

  return (
    <aside className="properties-panel" data-testid="properties-panel">
       <div className="panel-section-heading"><span>{selected ? 'Object Properties' : 'Artboard Properties'}</span>{selectedObjectIds.length > 1 && <span className="panel-count" data-testid="selection-summary">{selectedObjectIds.length} objects</span>}</div>
      <div className="dock-panel-content">
        {selected ? <>
           {selected.locked && <div className="property-lock-message" role="status">Object is locked. Unlock it in Layers to edit.</div>}
           <section className="property-section">
            <div className="panel-section-heading"><span>Transformacja</span></div>
            <div className="property-grid">
              <NumberInput data-testid="prop-x" label="X" disabled={selected.locked} value={convertUnit(selected.transform.position.x, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdatePosition(selected.id, convertUnit(value, doc.unit, 'px'), selected.transform.position.y)} />
              <NumberInput data-testid="prop-y" label="Y" disabled={selected.locked} value={convertUnit(selected.transform.position.y, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdatePosition(selected.id, selected.transform.position.x, convertUnit(value, doc.unit, 'px'))} />
               {size && <>
                 <NumberInput data-testid="prop-w" label="W" disabled={selected.locked} min={0.000001} value={convertUnit(size.width, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateDimensions(selected.id, convertUnit(value, doc.unit, 'px'), size.height)} />
                 <NumberInput data-testid="prop-h" label="H" disabled={selected.locked} min={0.000001} value={convertUnit(size.height, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateDimensions(selected.id, size.width, convertUnit(value, doc.unit, 'px'))} />
               </>}
               {selected.type === 'line' && <>
                 <NumberInput data-testid="prop-end-x" label="End X" disabled={selected.locked} value={convertUnit(selected.endPoint.x, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateLineEndpoint?.(selected.id, { x: convertUnit(value, doc.unit, 'px'), y: selected.endPoint.y })} />
                 <NumberInput data-testid="prop-end-y" label="End Y" disabled={selected.locked} value={convertUnit(selected.endPoint.y, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateLineEndpoint?.(selected.id, { x: selected.endPoint.x, y: convertUnit(value, doc.unit, 'px') })} />
               </>}
               {selected.type === 'rectangle' && radii && <>
                 <NumberInput data-testid="prop-radius-tl" label="TL" disabled={selected.locked} min={0} value={convertUnit(radii.topLeft, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateCornerRadius?.(selected.id, { ...radii, topLeft: convertUnit(value, doc.unit, 'px') })} />
                 <NumberInput data-testid="prop-radius-tr" label="TR" disabled={selected.locked} min={0} value={convertUnit(radii.topRight, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateCornerRadius?.(selected.id, { ...radii, topRight: convertUnit(value, doc.unit, 'px') })} />
                 <NumberInput data-testid="prop-radius-br" label="BR" disabled={selected.locked} min={0} value={convertUnit(radii.bottomRight, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateCornerRadius?.(selected.id, { ...radii, bottomRight: convertUnit(value, doc.unit, 'px') })} />
                 <NumberInput data-testid="prop-radius-bl" label="BL" disabled={selected.locked} min={0} value={convertUnit(radii.bottomLeft, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateCornerRadius?.(selected.id, { ...radii, bottomLeft: convertUnit(value, doc.unit, 'px') })} />
               </>}
              <NumberInput data-testid="prop-rotation" label="Rot" disabled={selected.locked} value={selected.transform.rotation * 180 / Math.PI} decimals={1} unit="°" onChange={(value) => onUpdateRotation?.(selected.id, value)} />
            </div>
          </section>
          <section className="property-section">
            <div className="panel-section-heading"><span>Wygląd</span></div>
             <ColorControl label="Fill" disabled={selected.locked} color={selected.style.fill.type === 'solid' ? selected.style.fill.color : null} onChange={(value) => onUpdateFill(selected.id, value)} />
             <ColorControl label="Stroke" disabled={selected.locked} color={selected.style.stroke?.color ?? null} onChange={(value) => patchStyle({ stroke: value ? { ...(selected.style.stroke ?? defaultStroke), color: value } : null })} />
             <NumberInput data-testid="prop-stroke-width" label="Stroke" value={selected.style.stroke?.width ?? 0} min={0.1} disabled={selected.locked || !selected.style.stroke} decimals={1} onChange={(value) => selected.style.stroke && patchStyle({ stroke: { ...selected.style.stroke, width: value } })} />
             <NumberInput data-testid="prop-opacity" label="Opacity" value={selected.style.opacity} min={0} max={1} step={0.05} disabled={selected.locked} decimals={2} unit="" onChange={(value) => patchStyle({ opacity: value })} />
            <div className="property-actions">
               <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => patchStyle({ fill: { type: 'linear-gradient', start: { x: 0, y: 0 }, end: { x: size?.width ?? 100, y: 0 }, stops: [{ offset: 0, color: '#5caeff', opacity: 1 }, { offset: 1, color: '#8e5cff', opacity: 1 }] } })}>Gradient</Button>
            </div>
          </section>
        </> : artboard ? <>
          <section className="property-section">
            <div className="panel-section-heading"><span>Artboard</span></div>
            <div className="property-grid">
              <NumberInput data-testid="artboard-width" label="W" min={0.000001} value={convertUnit(artboard.width, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateArtboard?.(convertUnit(value, doc.unit, 'px'), artboard.height)} />
              <NumberInput data-testid="artboard-height" label="H" min={0.000001} value={convertUnit(artboard.height, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateArtboard?.(artboard.width, convertUnit(value, doc.unit, 'px'))} />
            </div>
            <label className="dialog-label">Jednostka<select value={doc.unit} onChange={(event) => onUpdateUnit?.(event.target.value as DocumentUnit)}><option value="px">px</option><option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option></select></label>
            <label className="dialog-label">Tło<select value={artboard.background.type} onChange={(event) => { const type = event.target.value as 'transparent' | 'color'; onUpdateArtboard?.(artboard.width, artboard.height, type === 'transparent' ? { type } : { type, color: artboard.background.type === 'color' ? artboard.background.color : '#ffffff' }); }}><option value="color">Kolor</option><option value="transparent">Przezroczyste</option></select></label>
            {artboard.background.type === 'color' && <label className="dialog-label">Kolor<input type="color" value={artboard.background.color} onChange={(event) => onUpdateArtboard?.(artboard.width, artboard.height, { type: 'color', color: event.target.value })} /></label>}
            {gridSettings && <div className="property-grid"><NumberInput data-testid="grid-size" label="Grid" min={0.000001} value={convertUnit(gridSettings.size, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateGridSettings?.({ ...gridSettings, size: convertUnit(value, doc.unit, 'px') })} /><NumberInput data-testid="grid-subdivisions" label="Sub" min={1} value={gridSettings.subdivisions} unit="×" decimals={0} onChange={(value) => onUpdateGridSettings?.({ ...gridSettings, subdivisions: Math.max(1, Math.round(value)) })} /></div>}
            <p className="panel-note">Rozmiar artboardu zmienia model świata. Canvas zawsze pozostaje wielkości viewportu.</p>
          </section>
        </> : null}
      </div>
    </aside>
  );
};
