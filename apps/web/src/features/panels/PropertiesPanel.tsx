import React from 'react';
import type { DocumentModel, ObjectId, ObjectStyle, SceneObject, CornerRadii, PathNode, SelectionState, GeometryPreview, BlendMode } from '@vectoria/core';
import { normalizeCornerRadii } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { defaultStroke } from '@vectoria/core';
import { NumberInput, ColorControl, Button } from '@vectoria/ui';
import { convertUnit } from '@vectoria/shared';
import type { DocumentUnit } from '@vectoria/core';
import type { GridSettings } from '@vectoria/editor-engine';
import { GeometryProperties, type GeometryAction } from '../properties/GeometryProperties.js';

export type PathAction =
   | { type: 'stroke-to-path'; objectId: ObjectId }
   | { type: 'smooth'; objectId: ObjectId; amount: number }
   | { type: 'simplify'; objectId: ObjectId; accuracy: number }
  | { type: 'reverse'; objectId: ObjectId }
  | { type: 'add-node'; objectId: ObjectId; segmentIndex: number }
  | { type: 'remove-node'; objectId: ObjectId; nodeIndex: number }
  | { type: 'convert-segment'; objectId: ObjectId; segmentIndex: number; to: 'line' | 'curve' }
  | { type: 'split'; objectId: ObjectId; nodeIndex: number }
  | { type: 'merge-nodes'; objectId: ObjectId; firstIndex: number; secondIndex: number }
  | { type: 'connect-handles'; objectId: ObjectId; nodeIndex: number }
  | { type: 'disconnect-handles'; objectId: ObjectId; nodeIndex: number }
  | { type: 'join'; objectIds: readonly [ObjectId, ObjectId] };

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
  selection?: SelectionState;
  onUpdatePathNode?: (id: ObjectId, index: number, patch: Partial<Omit<PathNode, 'id'>>) => void;
  onUpdatePathNodeKind?: (id: ObjectId, index: number, kind: PathNode['kind']) => void;
  onUpdatePathClosed?: (id: ObjectId, closed: boolean) => void;
  onPathAction?: (action: PathAction) => void;
  geometryPreview?: GeometryPreview | null;
  onGeometryAction?: (action: GeometryAction) => void;
  onApplyGeometryPreview?: () => void;
  onCancelGeometryPreview?: () => void;
  onOpenCleanup?: () => void;
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
  selection = { objectIds: [], nodeIds: [], mode: 'object' },
  onUpdatePathNode,
  onUpdatePathNodeKind,
  onUpdatePathClosed,
  onPathAction,
  geometryPreview,
  onGeometryAction,
  onApplyGeometryPreview,
  onCancelGeometryPreview,
  onOpenCleanup,
}) => {
  const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
  const artboard = doc.artboards[doc.activeArtboardId];
  const size = selected ? dimensions(selected) : null;
  const radii = selected?.type === 'rectangle' ? normalizeCornerRadii(selected.cornerRadius, selected.width, selected.height) : null;
  const patchStyle = (patch: Partial<ObjectStyle>) => selected && onUpdateObjectStyle?.(selected.id, patch);
  const selectedPathNodeIndex = selected?.type === 'path'
    ? Math.max(0, selected.nodes.findIndex((_, index) => selection.nodeIds.includes(`${selected.id}:${index}`)))
    : -1;
  const selectedPathNode = selected?.type === 'path' ? selected.nodes[selectedPathNodeIndex] : null;
  const gradient = selected && (selected.style.fill.type === 'linear-gradient' || selected.style.fill.type === 'radial-gradient' || selected.style.fill.type === 'angular-gradient') ? selected.style.fill : null;
  const selectedPathNodeIndices = selected?.type === 'path'
    ? selection.nodeIds.filter((id) => id.startsWith(`${selected.id}:`)).map((id) => Number(id.slice(selected.id.length + 1))).filter((index) => Number.isInteger(index) && index >= 0 && index < selected.nodes.length)
    : [];

  return (
    <aside className="properties-panel" data-testid="properties-panel">
       <div className="panel-section-heading"><span>{selected ? 'Object Properties' : 'Artboard Properties'}</span>{selectedObjectIds.length > 1 && <span className="panel-count" data-testid="selection-summary">{selectedObjectIds.length} objects</span>}</div>
      <div className="dock-panel-content">
        {selected ? <>
           {selected.locked && <div className="property-lock-message" role="status">Object is locked. Unlock it in Layers to edit.</div>}
           <GeometryProperties document={doc} selectedObjectId={selectedObjectId} selectedObjectIds={selectedObjectIds} preview={geometryPreview ?? null} onAction={onGeometryAction ?? (() => undefined)} onApplyPreview={onApplyGeometryPreview ?? (() => undefined)} onCancelPreview={onCancelGeometryPreview ?? (() => undefined)} onOpenCleanup={onOpenCleanup ?? (() => undefined)} />
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
                {selected.type === 'path' && selectedPathNode && <>
                  <NumberInput data-testid="prop-node-x" label="Node X" disabled={selected.locked} value={selectedPathNode.point.x} decimals={2} onChange={(value) => onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { point: { ...selectedPathNode.point, x: value } })} />
                  <NumberInput data-testid="prop-node-y" label="Node Y" disabled={selected.locked} value={selectedPathNode.point.y} decimals={2} onChange={(value) => onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { point: { ...selectedPathNode.point, y: value } })} />
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
            {selected.type === 'path' && <section className="property-section" aria-label="Path operations">
              <div className="panel-section-heading"><span>Drawing</span><span className="panel-count">{selected.nodes.length} nodes</span></div>
              <div className="property-actions path-actions">
                <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'smooth', objectId: selected.id, amount: 50 })}>Smooth</Button>
                <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'simplify', objectId: selected.id, accuracy: 75 })}>Simplify</Button>
              </div>
            </section>}
            {selected.type === 'path' && selectedPathNode && <section className="property-section" aria-label="Path node properties">
             <div className="panel-section-heading"><span>Node</span><span className="panel-count">{selectedPathNodeIndex + 1}/{selected.nodes.length}</span></div>
             <label className="dialog-label">Type<select value={selectedPathNode.kind} disabled={selected.locked} onChange={(event) => onUpdatePathNodeKind?.(selected.id, selectedPathNodeIndex, event.target.value as PathNode['kind'])}><option value="corner">Corner</option><option value="cusp">Cusp</option><option value="smooth">Smooth</option><option value="symmetric">Symmetric</option><option value="auto">Auto smooth</option></select></label>
              <div className="property-grid">
                <NumberInput data-testid="prop-handle-in-x" label="In X" disabled={selected.locked || !selectedPathNode.inHandle} value={selectedPathNode.inHandle?.x ?? 0} decimals={2} onChange={(value) => selectedPathNode.inHandle && onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { inHandle: { ...selectedPathNode.inHandle, x: value } })} />
                <NumberInput data-testid="prop-handle-in-y" label="In Y" disabled={selected.locked || !selectedPathNode.inHandle} value={selectedPathNode.inHandle?.y ?? 0} decimals={2} onChange={(value) => selectedPathNode.inHandle && onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { inHandle: { ...selectedPathNode.inHandle, y: value } })} />
                <NumberInput data-testid="prop-handle-out-x" label="Out X" disabled={selected.locked || !selectedPathNode.outHandle} value={selectedPathNode.outHandle?.x ?? 0} decimals={2} onChange={(value) => selectedPathNode.outHandle && onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { outHandle: { ...selectedPathNode.outHandle, x: value } })} />
                <NumberInput data-testid="prop-handle-out-y" label="Out Y" disabled={selected.locked || !selectedPathNode.outHandle} value={selectedPathNode.outHandle?.y ?? 0} decimals={2} onChange={(value) => selectedPathNode.outHandle && onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { outHandle: { ...selectedPathNode.outHandle, y: value } })} />
              </div>
              <label className="dialog-label">Path<select value={selected.closed ? 'closed' : 'open'} disabled={selected.locked} onChange={(event) => onUpdatePathClosed?.(selected.id, event.target.value === 'closed')}><option value="open">Open</option><option value="closed">Closed</option></select></label>
              <div className="property-actions path-actions">
                <Button size="sm" variant="ghost" disabled={selected.locked || selected.nodes.length <= (selected.closed ? 3 : 2)} onClick={() => onPathAction?.({ type: 'remove-node', objectId: selected.id, nodeIndex: selectedPathNodeIndex })}>Remove node</Button>
                <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'reverse', objectId: selected.id })}>Reverse</Button>
                {selectedPathNodeIndex < selected.nodes.length - (selected.closed ? 0 : 1) && <>
                  <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'add-node', objectId: selected.id, segmentIndex: selectedPathNodeIndex })}>Add node</Button>
                  <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'convert-segment', objectId: selected.id, segmentIndex: selectedPathNodeIndex, to: selected.nodes[selectedPathNodeIndex]?.outHandle || selected.nodes[(selectedPathNodeIndex + 1) % selected.nodes.length]?.inHandle ? 'line' : 'curve' })}>{selected.nodes[selectedPathNodeIndex]?.outHandle || selected.nodes[(selectedPathNodeIndex + 1) % selected.nodes.length]?.inHandle ? 'Make line' : 'Make curve'}</Button>
                </>}
                {selectedPathNodeIndex > 0 && selectedPathNodeIndex < selected.nodes.length - 1 && !selected.closed && <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'split', objectId: selected.id, nodeIndex: selectedPathNodeIndex })}>Split path</Button>}
                {selectedPathNodeIndices.length >= 2 && <Button size="sm" variant="ghost" disabled={selected.locked || selected.nodes.length <= (selected.closed ? 3 : 2)} onClick={() => onPathAction?.({ type: 'merge-nodes', objectId: selected.id, firstIndex: selectedPathNodeIndices[0]!, secondIndex: selectedPathNodeIndices[1]! })}>Merge nodes</Button>}
                <Button size="sm" variant="ghost" disabled={selected.locked || (!selectedPathNode.inHandle && !selectedPathNode.outHandle)} onClick={() => onPathAction?.({ type: 'disconnect-handles', objectId: selected.id, nodeIndex: selectedPathNodeIndex })}>Disconnect</Button>
                <Button size="sm" variant="ghost" disabled={selected.locked || (!selectedPathNode.inHandle && !selectedPathNode.outHandle)} onClick={() => onPathAction?.({ type: 'connect-handles', objectId: selected.id, nodeIndex: selectedPathNodeIndex })}>Connect</Button>
                {selectedObjectIds.length === 2 && selectedObjectIds.every((id) => doc.objects[id]?.type === 'path' && !(doc.objects[id] as Extract<SceneObject, { type: 'path' }>).closed) && <Button size="sm" variant="ghost" onClick={() => onPathAction?.({ type: 'join', objectIds: selectedObjectIds as readonly [ObjectId, ObjectId] })}>Join paths</Button>}
              </div>
            </section>}
          <section className="property-section">
            <div className="panel-section-heading"><span>Wygląd</span></div>
              <ColorControl label="Fill" disabled={selected.locked} color={selected.style.fill.type === 'solid' ? selected.style.fill.color : null} onChange={(value) => onUpdateFill(selected.id, value)} />
              <div className="style-swatch-grid" aria-label="Document palette">{(doc.palettes?.[0]?.colors ?? []).map((color) => <button key={color.id} type="button" className="style-swatch" title={color.name} aria-label={`Set fill ${color.name}`} disabled={selected.locked} style={{ background: color.color }} onClick={() => patchStyle({ fill: { type: 'solid', color: color.color } })} />)}</div>
              {gradient && <section className="gradient-editor" aria-label="Gradient editor"><div className="panel-section-heading"><span>Gradient stops</span><span className="panel-count">{gradient.stops.length}</span></div>{gradient.stops.map((stop, index) => <div className="gradient-stop" key={stop.id ?? index}><ColorControl label={`Stop ${index + 1}`} disabled={selected.locked} color={stop.color} onChange={(value) => value && patchStyle({ fill: { ...gradient, stops: gradient.stops.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, color: value } : candidate) } })} /><NumberInput label="Offset" min={0} max={1} step={0.05} decimals={2} disabled={selected.locked} value={stop.offset} onChange={(value) => patchStyle({ fill: { ...gradient, stops: gradient.stops.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, offset: value } : candidate) } })} /><NumberInput label="Alpha" min={0} max={1} step={0.05} decimals={2} disabled={selected.locked} value={stop.opacity} onChange={(value) => patchStyle({ fill: { ...gradient, stops: gradient.stops.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, opacity: value } : candidate) } })} /></div>)}</section>}
              <ColorControl label="Stroke" disabled={selected.locked} color={selected.style.stroke?.color ?? null} onChange={(value) => patchStyle({ stroke: value ? { ...(selected.style.stroke ?? defaultStroke), color: value } : null })} />
              <NumberInput data-testid="prop-stroke-width" label="Stroke" value={selected.style.stroke?.width ?? 0} min={0.1} disabled={selected.locked || !selected.style.stroke} decimals={1} onChange={(value) => selected.style.stroke && patchStyle({ stroke: { ...selected.style.stroke, width: value } })} />
              {selected.style.stroke && <>
                <label className="dialog-label">Cap<select data-testid="prop-stroke-cap" value={selected.style.stroke.lineCap} disabled={selected.locked} onChange={(event) => patchStyle({ stroke: { ...(selected.style.stroke ?? defaultStroke), lineCap: event.target.value as typeof defaultStroke.lineCap } })}><option value="butt">Butt</option><option value="round">Round</option><option value="square">Square</option></select></label>
                <label className="dialog-label">Join<select data-testid="prop-stroke-join" value={selected.style.stroke.lineJoin} disabled={selected.locked} onChange={(event) => patchStyle({ stroke: { ...(selected.style.stroke ?? defaultStroke), lineJoin: event.target.value as typeof defaultStroke.lineJoin } })}><option value="miter">Miter</option><option value="round">Round</option><option value="bevel">Bevel</option></select></label>
                <NumberInput data-testid="prop-miter-limit" label="Miter" value={selected.style.stroke.miterLimit} min={1} disabled={selected.locked} decimals={1} onChange={(value) => patchStyle({ stroke: { ...(selected.style.stroke ?? defaultStroke), miterLimit: value } })} />
                <label className="dialog-label">Dash / gap<input data-testid="prop-dash-array" value={selected.style.stroke.dashArray.join(', ')} disabled={selected.locked} aria-label="Dash and gap lengths" onChange={(event) => { const values = event.target.value.split(',').map((part) => Number(part.trim())); if (values.length > 0 && values.every((value) => Number.isFinite(value) && value >= 0)) patchStyle({ stroke: { ...(selected.style.stroke ?? defaultStroke), dashArray: values } }); }} /></label>
              </>}
              <NumberInput data-testid="prop-opacity" label="Opacity" value={selected.style.opacity} min={0} max={1} step={0.05} disabled={selected.locked} decimals={2} unit="" onChange={(value) => patchStyle({ opacity: value })} />
              <label className="dialog-label">Blend<select data-testid="prop-blend-mode" value={selected.style.blendMode ?? 'normal'} disabled={selected.locked} onChange={(event) => patchStyle({ blendMode: event.target.value as BlendMode })}><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option></select></label>
              <div className="property-actions">
                 <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => patchStyle({ fill: { type: 'linear-gradient', start: { x: 0, y: 0 }, end: { x: size?.width ?? 100, y: 0 }, stops: [{ offset: 0, color: '#5caeff', opacity: 1 }, { offset: 1, color: '#8e5cff', opacity: 1 }] } })}>Gradient</Button>
                 <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => patchStyle({ fill: { type: 'radial-gradient', center: { x: (size?.width ?? 100) / 2, y: (size?.height ?? 100) / 2 }, radius: Math.max(size?.width ?? 100, size?.height ?? 100) / 2, stops: [{ offset: 0, color: '#ffffff', opacity: 1 }, { offset: 1, color: '#5caeff', opacity: 1 }] } })}>Radial</Button>
                 <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => patchStyle({ fill: { type: 'angular-gradient', center: { x: (size?.width ?? 100) / 2, y: (size?.height ?? 100) / 2 }, angle: 0, stops: [{ offset: 0, color: '#5caeff', opacity: 1 }, { offset: 1, color: '#8e5cff', opacity: 1 }] } })}>Angular</Button>
                 <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => patchStyle({ fill: { type: 'pattern', kind: 'grid', foreground: '#5caeff', background: '#ffffff', size: 12 } })}>Pattern</Button>
                {selected.style.stroke && <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'stroke-to-path', objectId: selected.id })}>Stroke to path</Button>}
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
