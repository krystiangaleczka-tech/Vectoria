import React from 'react';
import type { DocumentModel, ObjectId, ObjectStyle, SceneObject, CornerRadii, PathNode, SelectionState, GeometryPreview, BlendMode, ArrowheadStyle, ImageObject, ImageCrop } from '@vectoria/core';
import { normalizeCornerRadii, getObjectBounds } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { defaultStroke } from '@vectoria/core';
import { DocumentProperties } from '../properties/DocumentProperties.js';
import { NumberInput, ColorControl, Button } from '@vectoria/ui';
import { convertUnit } from '@vectoria/shared';
import type { DocumentUnit } from '@vectoria/core';
import type { GridSettings } from '@vectoria/editor-engine';
import { GeometryProperties, type GeometryAction } from '../properties/GeometryProperties.js';
import { PivotControl } from './PivotControl.js';

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

export type ParametricPatch =
  | { kind: 'polygon'; sides?: number; radius?: number }
  | { kind: 'star'; points?: number; outerRadius?: number; innerRadius?: number }
  | { kind: 'arc'; radiusX?: number; radiusY?: number; startAngle?: number; endAngle?: number; closed?: boolean }
  | { kind: 'pie'; radiusX?: number; radiusY?: number; startAngle?: number; endAngle?: number }
  | { kind: 'ring'; outerRadius?: number; innerRadius?: number }
  | { kind: 'spiral'; turns?: number; decay?: number; direction?: 'cw' | 'ccw' }
  | { kind: 'callout'; width?: number; height?: number; cornerRadius?: number; tailTip?: Vec2; tailBaseWidth?: number };

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
  onUpdatePivot?: (id: ObjectId, pivot: Vec2) => void;
  onUpdateSkew?: (id: ObjectId, axis: 'x' | 'y', degrees: number) => void;
  onAlign?: (alignment: import('@vectoria/core').Alignment, target: 'selection' | 'artboard' | 'key') => void;
  onDistribute?: (axis: 'horizontal' | 'vertical') => void;
  onReorder?: (direction: import('@vectoria/core').ReorderDirection) => void;
  onUpdateArtboard?: (width: number, height: number, background?: { type: 'transparent' } | { type: 'color'; color: string }) => void;
  onUpdateUnit?: (unit: DocumentUnit) => void;
  gridSettings?: GridSettings;
  onUpdateGridSettings?: (settings: GridSettings) => void;
  selection?: SelectionState;
  onUpdatePathNode?: (id: ObjectId, index: number, patch: Partial<Omit<PathNode, 'id'>>) => void;
  onUpdatePathNodeKind?: (id: ObjectId, index: number, kind: PathNode['kind']) => void;
  onUpdatePathClosed?: (id: ObjectId, closed: boolean) => void;
  onPathAction?: (action: PathAction) => void;
  onExecuteCommand?: (command: import('@vectoria/core').Command) => void;
  geometryPreview?: GeometryPreview | null;
  onGeometryAction?: (action: GeometryAction) => void;
  onApplyGeometryPreview?: () => void;
  onCancelGeometryPreview?: () => void;
  onOpenCleanup?: () => void;
  onUpdateGroupTransform?: (ids: readonly ObjectId[], scaleX: number, scaleY: number, pivotWorld: { x: number; y: number }) => void;
  onUpdateParametric?: (id: ObjectId, patch: ParametricPatch) => void;
  onUpdateArrowheads?: (id: ObjectId, markerStart: ArrowheadStyle | null, markerEnd: ArrowheadStyle | null) => void;
  onUpdateTypography?: (id: ObjectId, patch: Partial<import('@vectoria/core').TextFrameObject>) => void;
  onConvertToOutlines?: (id: ObjectId) => void;
  onSetTextOnPath?: (id: ObjectId, pathId?: ObjectId) => void;
  onUpdateImageProperties?: (id: ObjectId, patch: Partial<ImageObject>) => void;
  onCropImage?: (id: ObjectId, crop: ImageCrop | undefined) => void;
  onOpenTraceImage?: (image: ImageObject) => void;
  onDetachSymbolInstance?: (id: ObjectId) => void;
}

const dimensions = (object: SceneObject): { width: number; height: number } | null =>
  object.type === 'rectangle' || object.type === 'ellipse' || object.type === 'image' || object.type === 'symbol-instance'
    ? { width: object.width, height: object.height }
    : null;

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
  onUpdatePivot,
  onUpdateSkew,
  onAlign,
  onDistribute,
  onReorder,

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
  onUpdateGroupTransform,
  onUpdateParametric,
  onUpdateArrowheads,
  onUpdateTypography,
  onConvertToOutlines,
  onSetTextOnPath,
  onUpdateImageProperties,
  onCropImage,
  onOpenTraceImage,
  onDetachSymbolInstance,
 }) => {
  const [aspectLocked, setAspectLocked] = React.useState(true);
  const [alignTarget, setAlignTarget] = React.useState<'selection' | 'artboard' | 'key'>('selection');
  const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
  const size = selected ? dimensions(selected) : null;
  const radii = selected?.type === 'rectangle' ? normalizeCornerRadii(selected.cornerRadius, selected.width, selected.height) : null;
  const patchStyle = (patch: Partial<ObjectStyle>) => selected && onUpdateObjectStyle?.(selected.id, patch);

  // Effective signed dimensions (reflect flip state via scale sign)
  const flipX = selected ? (selected.transform.scale.x < 0 ? -1 : 1) : 1;
  const flipY = selected ? (selected.transform.scale.y < 0 ? -1 : 1) : 1;
  const effectiveWidth = size ? size.width * flipX : 0;
  const effectiveHeight = size ? size.height * flipY : 0;

  // Group bounds for multiselect using proper getObjectBounds
  const groupBounds = selectedObjectIds.length > 1 ? selectedObjectIds.reduce<{ x: number; y: number; right: number; bottom: number } | null>((acc, id) => {
    const obj = doc.objects[id];
    if (!obj) return acc;
    const b = getObjectBounds(obj, doc);
    if (!acc) return { x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height };
    return { x: Math.min(acc.x, b.x), y: Math.min(acc.y, b.y), right: Math.max(acc.right, b.x + b.width), bottom: Math.max(acc.bottom, b.y + b.height) };
  }, null) : null;
  const groupW = groupBounds ? groupBounds.right - groupBounds.x : 0;
  const groupH = groupBounds ? groupBounds.bottom - groupBounds.y : 0;
  const groupPivotWorld = groupBounds ? { x: groupBounds.x + groupW / 2, y: groupBounds.y + groupH / 2 } : { x: 0, y: 0 };
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
                 <NumberInput data-testid="prop-w" label="W" disabled={selected.locked} value={convertUnit(effectiveWidth, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => { const newWidth = convertUnit(value, doc.unit, 'px'); onUpdateDimensions(selected.id, newWidth, aspectLocked && size.width !== 0 ? Math.abs(size.height) * (Math.abs(newWidth) / Math.abs(size.width)) * (newWidth < 0 ? -1 : 1) : effectiveHeight); }} />
                 <button type="button" className={`aspect-lock-button ${aspectLocked ? 'locked' : 'unlocked'}`} onClick={() => setAspectLocked(!aspectLocked)} title={aspectLocked ? 'Unlock proportions' : 'Lock proportions'} aria-label="Toggle aspect ratio lock">{aspectLocked ? '🔒' : '🔓'}</button>
                 <NumberInput data-testid="prop-h" label="H" disabled={selected.locked} value={convertUnit(effectiveHeight, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => { const newHeight = convertUnit(value, doc.unit, 'px'); onUpdateDimensions(selected.id, aspectLocked && size.height !== 0 ? Math.abs(size.width) * (Math.abs(newHeight) / Math.abs(size.height)) * (newHeight < 0 ? -1 : 1) : effectiveWidth, newHeight); }} />
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
               {size && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <PivotControl pivot={selected.transform.pivot} size={size} disabled={selected.locked} onChange={(pivot) => onUpdatePivot?.(selected.id, pivot)} />
                 <div style={{ flex: 1, display: 'flex', gap: '4px', flexDirection: 'column' }}>
                   <NumberInput data-testid="prop-pivot-x" label="Pivot X" disabled={selected.locked} value={selected.transform.pivot.x} decimals={2} onChange={(value) => onUpdatePivot?.(selected.id, { x: value, y: selected.transform.pivot.y })} />
                   <NumberInput data-testid="prop-pivot-y" label="Pivot Y" disabled={selected.locked} value={selected.transform.pivot.y} decimals={2} onChange={(value) => onUpdatePivot?.(selected.id, { x: selected.transform.pivot.x, y: value })} />
                 </div>
               </div>}
               <NumberInput data-testid="prop-skew-x" label="Skew X" disabled={selected.locked} min={-89} max={89} value={(selected.transform.skew?.x ?? 0) * 180 / Math.PI} decimals={1} unit="°" onChange={(value) => onUpdateSkew?.(selected.id, 'x', value)} />
               <NumberInput data-testid="prop-skew-y" label="Skew Y" disabled={selected.locked} min={-89} max={89} value={(selected.transform.skew?.y ?? 0) * 180 / Math.PI} decimals={1} unit="°" onChange={(value) => onUpdateSkew?.(selected.id, 'y', value)} />
             </div>
             </section>
             {selectedObjectIds.length > 1 && groupBounds && <section className="property-section" aria-label="Group transform">
               <div className="panel-section-heading"><span>Group Transform</span><span className="panel-count">{selectedObjectIds.length} objects</span></div>
               <div className="property-grid">
                 <NumberInput data-testid="group-w" label="W" value={convertUnit(groupW, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => {
                   const newW = convertUnit(Math.abs(value), doc.unit, 'px');
                   if (groupW > 0) onUpdateGroupTransform?.(selectedObjectIds, newW / groupW, 1, groupPivotWorld);
                 }} />
                 <button type="button" className={`aspect-lock-button ${aspectLocked ? 'locked' : 'unlocked'}`} onClick={() => setAspectLocked(!aspectLocked)} title={aspectLocked ? 'Unlock proportions' : 'Lock proportions'} aria-label="Toggle aspect ratio lock">{aspectLocked ? '🔒' : '🔓'}</button>
                 <NumberInput data-testid="group-h" label="H" value={convertUnit(groupH, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => {
                   const newH = convertUnit(Math.abs(value), doc.unit, 'px');
                   if (groupH > 0) onUpdateGroupTransform?.(selectedObjectIds, aspectLocked && groupH > 0 ? newH / groupH : 1, newH / groupH, groupPivotWorld);
                 }} />
               </div>
             </section>}
            {selectedObjectIds.length > 1 && <section className="property-section" aria-label="Selection operations">
              <div className="panel-section-heading">
                <span>Arrange</span>
                <select className="arrange-target-select" style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', marginLeft: 'auto', fontSize: '11px' }} value={alignTarget} onChange={(e) => setAlignTarget(e.target.value as 'selection' | 'artboard' | 'key')} aria-label="Align target">
                  <option value="selection">Selection</option>
                  <option value="artboard">Artboard</option>
                  <option value="key">Key Object</option>
                </select>
                <span className="panel-count">{selectedObjectIds.length}</span>
              </div>
              <div className="property-actions path-actions">
                <Button size="sm" variant="ghost" onClick={() => onAlign?.('left', alignTarget)}>Left</Button>
                <Button size="sm" variant="ghost" onClick={() => onAlign?.('center', alignTarget)}>Center</Button>
                <Button size="sm" variant="ghost" onClick={() => onAlign?.('right', alignTarget)}>Right</Button>
                <Button size="sm" variant="ghost" onClick={() => onAlign?.('top', alignTarget)}>Top</Button>
                <Button size="sm" variant="ghost" onClick={() => onAlign?.('middle', alignTarget)}>Middle</Button>
                <Button size="sm" variant="ghost" onClick={() => onAlign?.('bottom', alignTarget)}>Bottom</Button>
                <Button size="sm" variant="ghost" onClick={() => onDistribute?.('horizontal')}>Distribute X</Button>
                <Button size="sm" variant="ghost" onClick={() => onDistribute?.('vertical')}>Distribute Y</Button>
                <Button size="sm" variant="ghost" onClick={() => onReorder?.('front')}>Front</Button>
                <Button size="sm" variant="ghost" onClick={() => onReorder?.('back')}>Back</Button>
                <Button size="sm" variant="ghost" onClick={() => onReorder?.('forward')}>Forward</Button>
                <Button size="sm" variant="ghost" onClick={() => onReorder?.('backward')}>Backward</Button>
              </div>
            </section>}
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
          {(selected.type === 'polygon' || selected.type === 'star' || selected.type === 'arc' || selected.type === 'pie' || selected.type === 'ring' || selected.type === 'spiral' || selected.type === 'callout') && <section className="property-section" aria-label="Parametric shape">
            <div className="panel-section-heading"><span>Kształt</span></div>
            <div className="property-grid">
              {selected.type === 'polygon' && <>
                <NumberInput data-testid="prop-sides" label="Sides" disabled={selected.locked} min={3} max={64} decimals={0} unit="" value={selected.sides} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'polygon', sides: Math.round(value) })} />
                <NumberInput data-testid="prop-poly-radius" label="Radius" disabled={selected.locked} min={0.01} decimals={2} unit={doc.unit} value={convertUnit(selected.radius, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'polygon', radius: convertUnit(value, doc.unit, 'px') })} />
              </>}
              {selected.type === 'star' && <>
                <NumberInput data-testid="prop-points" label="Points" disabled={selected.locked} min={3} max={64} decimals={0} unit="" value={selected.points} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'star', points: Math.round(value) })} />
                <NumberInput data-testid="prop-star-outer" label="Outer R" disabled={selected.locked} min={0.01} decimals={2} unit={doc.unit} value={convertUnit(selected.outerRadius, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'star', outerRadius: convertUnit(value, doc.unit, 'px') })} />
                <NumberInput data-testid="prop-star-inner" label="Inner R" disabled={selected.locked} min={0} decimals={2} unit={doc.unit} value={convertUnit(selected.innerRadius, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'star', innerRadius: convertUnit(value, doc.unit, 'px') })} />
              </>}
              {(selected.type === 'arc' || selected.type === 'pie') && <>
                <NumberInput data-testid="prop-arc-rx" label="Radius X" disabled={selected.locked} min={0.01} decimals={2} unit={doc.unit} value={convertUnit(selected.radiusX, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, selected.type === 'arc' ? { kind: 'arc', radiusX: convertUnit(value, doc.unit, 'px') } : { kind: 'pie', radiusX: convertUnit(value, doc.unit, 'px') })} />
                <NumberInput data-testid="prop-arc-ry" label="Radius Y" disabled={selected.locked} min={0.01} decimals={2} unit={doc.unit} value={convertUnit(selected.radiusY, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, selected.type === 'arc' ? { kind: 'arc', radiusY: convertUnit(value, doc.unit, 'px') } : { kind: 'pie', radiusY: convertUnit(value, doc.unit, 'px') })} />
                <NumberInput data-testid="prop-arc-start" label="Start °" disabled={selected.locked} decimals={1} unit="°" value={selected.startAngle * 180 / Math.PI} onChange={(value) => onUpdateParametric?.(selected.id, selected.type === 'arc' ? { kind: 'arc', startAngle: value * Math.PI / 180 } : { kind: 'pie', startAngle: value * Math.PI / 180 })} />
                <NumberInput data-testid="prop-arc-end" label="End °" disabled={selected.locked} decimals={1} unit="°" value={selected.endAngle * 180 / Math.PI} onChange={(value) => onUpdateParametric?.(selected.id, selected.type === 'arc' ? { kind: 'arc', endAngle: value * Math.PI / 180 } : { kind: 'pie', endAngle: value * Math.PI / 180 })} />
                {selected.type === 'arc' && <label className="dialog-label">Zamknięty<select data-testid="prop-arc-closed" value={selected.closed ? 'closed' : 'open'} disabled={selected.locked} onChange={(event) => onUpdateParametric?.(selected.id, { kind: 'arc', closed: event.target.value === 'closed' })}><option value="open">Otwarty</option><option value="closed">Zamknięty</option></select></label>}
              </>}
              {selected.type === 'ring' && <>
                <NumberInput data-testid="prop-ring-outer" label="Outer R" disabled={selected.locked} min={0.01} decimals={2} unit={doc.unit} value={convertUnit(selected.outerRadius, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'ring', outerRadius: convertUnit(value, doc.unit, 'px') })} />
                <NumberInput data-testid="prop-ring-inner" label="Inner R" disabled={selected.locked} min={0} decimals={2} unit={doc.unit} value={convertUnit(selected.innerRadius, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'ring', innerRadius: convertUnit(value, doc.unit, 'px') })} />
              </>}
              {selected.type === 'spiral' && <>
                <NumberInput data-testid="prop-turns" label="Turns" disabled={selected.locked} min={0.1} max={20} decimals={1} unit="" value={selected.turns} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'spiral', turns: value })} />
                <NumberInput data-testid="prop-decay" label="Decay" disabled={selected.locked} min={0.01} decimals={2} unit={doc.unit} value={convertUnit(selected.decay, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'spiral', decay: convertUnit(value, doc.unit, 'px') })} />
                <label className="dialog-label">Kierunek<select data-testid="prop-spiral-dir" value={selected.direction} disabled={selected.locked} onChange={(event) => onUpdateParametric?.(selected.id, { kind: 'spiral', direction: event.target.value as 'cw' | 'ccw' })}><option value="cw">CW</option><option value="ccw">CCW</option></select></label>
              </>}
              {selected.type === 'callout' && <>
                <NumberInput data-testid="prop-callout-corner" label="Corner R" disabled={selected.locked} min={0} decimals={2} unit={doc.unit} value={convertUnit(selected.cornerRadius, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'callout', cornerRadius: convertUnit(value, doc.unit, 'px') })} />
                <NumberInput data-testid="prop-tail-tip-x" label="Tail X" disabled={selected.locked} decimals={2} unit={doc.unit} value={convertUnit(selected.tailTip.x, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'callout', tailTip: { x: convertUnit(value, doc.unit, 'px'), y: selected.tailTip.y } })} />
                <NumberInput data-testid="prop-tail-tip-y" label="Tail Y" disabled={selected.locked} decimals={2} unit={doc.unit} value={convertUnit(selected.tailTip.y, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'callout', tailTip: { x: selected.tailTip.x, y: convertUnit(value, doc.unit, 'px') } })} />
                <NumberInput data-testid="prop-tail-base" label="Tail W" disabled={selected.locked} min={0} decimals={2} unit={doc.unit} value={convertUnit(selected.tailBaseWidth, 'px', doc.unit)} onChange={(value) => onUpdateParametric?.(selected.id, { kind: 'callout', tailBaseWidth: convertUnit(value, doc.unit, 'px') })} />
              </>}
            </div>
          </section>}
          {(selected.type === 'line' || selected.type === 'polyline') && selected.style.stroke && <section className="property-section" aria-label="Arrowheads">
            <div className="panel-section-heading"><span>Groty</span></div>
            <label className="dialog-label">Start<select data-testid="prop-marker-start" value={selected.style.stroke.markerStart?.type ?? 'none'} disabled={selected.locked} onChange={(event) => { const type = event.target.value as ArrowheadStyle['type'] | 'none'; const size = selected.style.stroke?.markerEnd?.size ?? selected.style.stroke?.markerStart?.size ?? 12; onUpdateArrowheads?.(selected.id, type === 'none' ? null : { type, size }, selected.style.stroke?.markerEnd ?? null); }}><option value="none">Brak</option><option value="arrow">Strzałka</option><option value="triangle">Trójkąt</option><option value="circle">Kółko</option><option value="square">Kwadrat</option></select></label>
            <label className="dialog-label">End<select data-testid="prop-marker-end" value={selected.style.stroke.markerEnd?.type ?? 'none'} disabled={selected.locked} onChange={(event) => { const type = event.target.value as ArrowheadStyle['type'] | 'none'; const size = selected.style.stroke?.markerStart?.size ?? selected.style.stroke?.markerEnd?.size ?? 12; onUpdateArrowheads?.(selected.id, selected.style.stroke?.markerStart ?? null, type === 'none' ? null : { type, size }); }}><option value="none">Brak</option><option value="arrow">Strzałka</option><option value="triangle">Trójkąt</option><option value="circle">Kółko</option><option value="square">Kwadrat</option></select></label>
            {(selected.style.stroke.markerStart || selected.style.stroke.markerEnd) && <NumberInput data-testid="prop-marker-size" label="Rozmiar" disabled={selected.locked} min={1} decimals={1} unit={doc.unit} value={convertUnit(selected.style.stroke.markerEnd?.size ?? selected.style.stroke.markerStart?.size ?? 12, 'px', doc.unit)} onChange={(value) => { const px = convertUnit(value, doc.unit, 'px'); const start = selected.style.stroke?.markerStart ? { ...selected.style.stroke.markerStart, size: px } : null; const end = selected.style.stroke?.markerEnd ? { ...selected.style.stroke.markerEnd, size: px } : null; onUpdateArrowheads?.(selected.id, start, end); }} />}
          </section>}
          {(selected.type === 'text' || selected.type === 'text-frame') && (
            <section className="property-section" aria-label="Typography">
              <div className="panel-section-heading"><span>Typografia</span></div>
              <div className="property-grid">
                <label className="dialog-label">
                  Font
                  <select
                    data-testid="prop-font-family"
                    value={selected.fontFamily}
                    disabled={selected.locked}
                    onChange={(e) => onUpdateTypography?.(selected.id, { fontFamily: e.target.value })}
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="Outfit, sans-serif">Outfit</option>
                    <option value="Open Sans, sans-serif">Open Sans</option>
                    <option value="Montserrat, sans-serif">Montserrat</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Helvetica, sans-serif">Helvetica</option>
                    <option value="Times New Roman, serif">Times New Roman</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Courier New, monospace">Courier New</option>
                  </select>
                </label>
                <NumberInput
                  data-testid="prop-font-size"
                  label="Rozmiar"
                  disabled={selected.locked}
                  min={1}
                  max={1000}
                  decimals={1}
                  unit="px"
                  value={selected.fontSize}
                  onChange={(value) => onUpdateTypography?.(selected.id, { fontSize: Math.max(1, value) })}
                />
                <label className="dialog-label">
                  Waga
                  <select
                    data-testid="prop-font-weight"
                    value={String(selected.fontWeight)}
                    disabled={selected.locked}
                    onChange={(e) => {
                      const num = Number(e.target.value) as import('@vectoria/core').FontWeight;
                      onUpdateTypography?.(selected.id, { fontWeight: num });
                    }}
                  >
                    <option value="100">100 — Thin</option>
                    <option value="300">300 — Light</option>
                    <option value="400">400 — Regular</option>
                    <option value="500">500 — Medium</option>
                    <option value="600">600 — SemiBold</option>
                    <option value="700">700 — Bold</option>
                    <option value="800">800 — ExtraBold</option>
                    <option value="900">900 — Black</option>
                  </select>
                </label>
                <label className="dialog-label">
                  Styl
                  <select
                    data-testid="prop-font-style"
                    value={selected.fontStyle}
                    disabled={selected.locked}
                    onChange={(e) => onUpdateTypography?.(selected.id, { fontStyle: e.target.value as 'normal' | 'italic' | 'oblique' })}
                  >
                    <option value="normal">Normal</option>
                    <option value="italic">Italic</option>
                    <option value="oblique">Oblique</option>
                  </select>
                </label>
                <NumberInput
                  data-testid="prop-line-height"
                  label="Interlinia"
                  disabled={selected.locked}
                  min={0.5}
                  max={5}
                  step={0.1}
                  decimals={2}
                  unit=""
                  value={selected.lineHeight}
                  onChange={(value) => onUpdateTypography?.(selected.id, { lineHeight: Math.max(0.5, value) })}
                />
                <NumberInput
                  data-testid="prop-letter-spacing"
                  label="Tracking"
                  disabled={selected.locked}
                  min={-50}
                  max={200}
                  decimals={1}
                  unit="px"
                  value={selected.letterSpacing}
                  onChange={(value) => onUpdateTypography?.(selected.id, { letterSpacing: value })}
                />
                <label className="dialog-label">
                  Wyrównanie
                  <select
                    data-testid="prop-text-align"
                    value={selected.textAlign}
                    disabled={selected.locked}
                    onChange={(e) => onUpdateTypography?.(selected.id, { textAlign: e.target.value as 'left' | 'center' | 'right' | 'justify' })}
                  >
                    <option value="left">Do lewej</option>
                    <option value="center">Do środka</option>
                    <option value="right">Do prawej</option>
                    <option value="justify">Justowanie</option>
                  </select>
                </label>
                <label className="dialog-label">
                  Kerning
                  <select
                    data-testid="prop-kerning"
                    value={selected.kerning ? 'on' : 'off'}
                    disabled={selected.locked}
                    onChange={(e) => onUpdateTypography?.(selected.id, { kerning: e.target.value === 'on' })}
                  >
                    <option value="on">Włączony</option>
                    <option value="off">Wyłączony</option>
                  </select>
                </label>
                
                <div className="variable-axes-section">
                  <div className="dialog-label" style={{ marginTop: 8, marginBottom: 4 }}>Variable Font Axes</div>
                  <NumberInput
                    data-testid="prop-axis-wght"
                    label="Weight (wght)"
                    disabled={selected.locked}
                    min={100} max={1000} decimals={0} unit=""
                    value={selected.variableAxes?.wght ?? (Number(selected.fontWeight) || 400)}
                    onChange={(value) => onUpdateTypography?.(selected.id, { variableAxes: { ...selected.variableAxes, wght: value } })}
                  />
                  <NumberInput
                    data-testid="prop-axis-wdth"
                    label="Width (wdth)"
                    disabled={selected.locked}
                    min={50} max={200} decimals={0} unit="%"
                    value={selected.variableAxes?.wdth ?? 100}
                    onChange={(value) => onUpdateTypography?.(selected.id, { variableAxes: { ...selected.variableAxes, wdth: value } })}
                  />
                  <NumberInput
                    data-testid="prop-axis-slnt"
                    label="Slant (slnt)"
                    disabled={selected.locked}
                    min={-90} max={90} decimals={0} unit="°"
                    value={selected.variableAxes?.slnt ?? 0}
                    onChange={(value) => onUpdateTypography?.(selected.id, { variableAxes: { ...selected.variableAxes, slnt: value } })}
                  />
                </div>

                {selected.type === 'text-frame' && (
                  <>
                    <NumberInput
                      data-testid="prop-columns"
                      label="Kolumny"
                      disabled={selected.locked}
                      min={1}
                      max={8}
                      decimals={0}
                      unit=""
                      value={selected.columnCount}
                      onChange={(value) => onUpdateTypography?.(selected.id, { columnCount: Math.max(1, Math.min(8, Math.round(value))) })}
                    />
                    <NumberInput
                      data-testid="prop-gutter"
                      label="Gutter"
                      disabled={selected.locked}
                      min={0}
                      decimals={1}
                      unit={doc.unit}
                      value={convertUnit(selected.columnGutter, 'px', doc.unit)}
                      onChange={(value) => onUpdateTypography?.(selected.id, { columnGutter: convertUnit(value, doc.unit, 'px') })}
                    />
                    <NumberInput
                      data-testid="prop-para-spacing"
                      label="Odstęp akapitu"
                      disabled={selected.locked}
                      min={0}
                      decimals={1}
                      unit={doc.unit}
                      value={convertUnit(selected.paragraphSpacing, 'px', doc.unit)}
                      onChange={(value) => onUpdateTypography?.(selected.id, { paragraphSpacing: convertUnit(value, doc.unit, 'px') })}
                    />
                    <NumberInput
                      data-testid="prop-indent"
                      label="Wcięcie"
                      disabled={selected.locked}
                      min={0}
                      decimals={1}
                      unit={doc.unit}
                      value={convertUnit(selected.indent, 'px', doc.unit)}
                      onChange={(value) => onUpdateTypography?.(selected.id, { indent: convertUnit(value, doc.unit, 'px') })}
                    />
                    <label className="dialog-label">
                      Lista
                      <select
                        data-testid="prop-list-type"
                        value={selected.listType ?? 'none'}
                        disabled={selected.locked}
                        onChange={(e) => onUpdateTypography?.(selected.id, { listType: e.target.value as 'none' | 'bullet' | 'numbered' })}
                      >
                        <option value="none">Brak</option>
                        <option value="bullet">Wypunktowanie (•)</option>
                        <option value="numbered">Numerowana (1.)</option>
                      </select>
                    </label>
                  </>
                )}
                {selected.type === 'text' && (
                  <label className="dialog-label">
                    Text on Path
                    <select
                      data-testid="prop-text-path"
                      value={selected.pathId ?? ''}
                      disabled={selected.locked}
                      onChange={(e) => onSetTextOnPath?.(selected.id, e.target.value ? e.target.value : undefined)}
                    >
                      <option value="">Brak ścieżki</option>
                      {Object.values(doc.objects)
                        .filter((o) => o.type === 'path')
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                  </label>
                )}
              </div>
              <div className="property-actions">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={selected.locked}
                  onClick={() => onConvertToOutlines?.(selected.id)}
                >
                  Convert to outlines
                </Button>
              </div>
            </section>
          )}

          {selected.type === 'image' && (
            <section className="property-section" aria-label="Image Properties">
              <div className="panel-section-heading">
                <span>Obraz rasterowy</span>
                <span className="panel-count">{selected.naturalWidth}×{selected.naturalHeight}px</span>
              </div>
              <div className="property-grid">
                <label className="dialog-label">
                  Źródło
                  <div className="storage-mode-row" style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                    <span className={`link-status-badge ${selected.source.type === 'embed' ? 'status-embedded' : 'status-linked'}`}>
                      {selected.source.type === 'embed' ? 'Osadzony (Base64)' : 'Link zewnętrzny'}
                    </span>
                    {selected.source.type === 'link' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // Trigger convert to embed
                          if (selected.source.type === 'link') {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              canvas.width = img.naturalWidth;
                              canvas.height = img.naturalHeight;
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.drawImage(img, 0, 0);
                                const data = canvas.toDataURL('image/png');
                                onUpdateImageProperties?.(selected.id, {
                                  source: { type: 'embed', data, mimeType: 'image/png' },
                                });
                              }
                            };
                            img.src = selected.source.url;
                          }
                        }}
                      >
                        Osadź
                      </Button>
                    )}
                  </div>
                </label>
              </div>

              {/* Crop Controls (ASSET-010 to ASSET-013) */}
              <div className="panel-section-heading" style={{ marginTop: '10px' }}>
                <span>Kadrowanie (Crop)</span>
                {selected.crop && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCropImage?.(selected.id, undefined)}
                  >
                    Reset
                  </Button>
                )}
              </div>
              <div className="property-grid">
                <NumberInput
                  data-testid="prop-crop-x"
                  label="Crop X"
                  min={0}
                  max={selected.naturalWidth - 1}
                  decimals={0}
                  value={selected.crop?.offset ? -selected.crop.offset.x : (selected.crop?.x ?? 0)}
                  onChange={(val) => {
                    const currentFrame = selected.crop?.frame ?? { x: 0, y: 0, width: selected.width, height: selected.height };
                    const currentOffset = selected.crop?.offset ?? { x: -(selected.crop?.x ?? 0), y: -(selected.crop?.y ?? 0) };
                    const currentScale = selected.crop?.scale ?? { x: 1, y: 1 };
                    onCropImage?.(selected.id, {
                      offset: { ...currentOffset, x: -Math.max(0, val) },
                      scale: currentScale,
                      frame: currentFrame,
                      x: Math.max(0, val),
                      y: -currentOffset.y,
                      width: currentFrame.width,
                      height: currentFrame.height,
                    });
                  }}
                />
                <NumberInput
                  data-testid="prop-crop-y"
                  label="Crop Y"
                  min={0}
                  max={selected.naturalHeight - 1}
                  decimals={0}
                  value={selected.crop?.offset ? -selected.crop.offset.y : (selected.crop?.y ?? 0)}
                  onChange={(val) => {
                    const currentFrame = selected.crop?.frame ?? { x: 0, y: 0, width: selected.width, height: selected.height };
                    const currentOffset = selected.crop?.offset ?? { x: -(selected.crop?.x ?? 0), y: -(selected.crop?.y ?? 0) };
                    const currentScale = selected.crop?.scale ?? { x: 1, y: 1 };
                    onCropImage?.(selected.id, {
                      offset: { ...currentOffset, y: -Math.max(0, val) },
                      scale: currentScale,
                      frame: currentFrame,
                      x: -currentOffset.x,
                      y: Math.max(0, val),
                      width: currentFrame.width,
                      height: currentFrame.height,
                    });
                  }}
                />
                <NumberInput
                  data-testid="prop-crop-w"
                  label="Crop W"
                  min={1}
                  max={selected.naturalWidth}
                  decimals={0}
                  value={selected.crop?.frame?.width ?? selected.crop?.width ?? selected.naturalWidth}
                  onChange={(val) => {
                    const currentFrame = selected.crop?.frame ?? { x: 0, y: 0, width: selected.width, height: selected.height };
                    const currentOffset = selected.crop?.offset ?? { x: -(selected.crop?.x ?? 0), y: -(selected.crop?.y ?? 0) };
                    const currentScale = selected.crop?.scale ?? { x: 1, y: 1 };
                    const w = Math.max(1, val);
                    onCropImage?.(selected.id, {
                      offset: currentOffset,
                      scale: currentScale,
                      frame: { ...currentFrame, width: w },
                      x: -currentOffset.x,
                      y: -currentOffset.y,
                      width: w,
                      height: currentFrame.height,
                    });
                  }}
                />
                <NumberInput
                  data-testid="prop-crop-h"
                  label="Crop H"
                  min={1}
                  max={selected.naturalHeight}
                  decimals={0}
                  value={selected.crop?.frame?.height ?? selected.crop?.height ?? selected.naturalHeight}
                  onChange={(val) => {
                    const currentFrame = selected.crop?.frame ?? { x: 0, y: 0, width: selected.width, height: selected.height };
                    const currentOffset = selected.crop?.offset ?? { x: -(selected.crop?.x ?? 0), y: -(selected.crop?.y ?? 0) };
                    const currentScale = selected.crop?.scale ?? { x: 1, y: 1 };
                    const h = Math.max(1, val);
                    onCropImage?.(selected.id, {
                      offset: currentOffset,
                      scale: currentScale,
                      frame: { ...currentFrame, height: h },
                      x: -currentOffset.x,
                      y: -currentOffset.y,
                      width: currentFrame.width,
                      height: h,
                    });
                  }}
                />
              </div>

              {/* Filters (ASSET-014, ASSET-015) */}
              <div className="panel-section-heading" style={{ marginTop: '10px' }}>
                <span>Filtry obrazu</span>
              </div>
              <div className="property-grid">
                <NumberInput
                  data-testid="prop-filter-brightness"
                  label="Jasność"
                  min={-100}
                  max={100}
                  decimals={0}
                  unit="%"
                  value={selected.filters?.brightness ?? 0}
                  onChange={(val) => {
                    onUpdateImageProperties?.(selected.id, {
                      filters: { ...(selected.filters ?? {}), brightness: val },
                    });
                  }}
                />
                <NumberInput
                  data-testid="prop-filter-contrast"
                  label="Kontrast"
                  min={-100}
                  max={100}
                  decimals={0}
                  unit="%"
                  value={selected.filters?.contrast ?? 0}
                  onChange={(val) => {
                    onUpdateImageProperties?.(selected.id, {
                      filters: { ...(selected.filters ?? {}), contrast: val },
                    });
                  }}
                />
                <NumberInput
                  data-testid="prop-filter-saturation"
                  label="Nasycenie"
                  min={0}
                  max={200}
                  decimals={0}
                  unit="%"
                  value={selected.filters?.saturation ?? 100}
                  onChange={(val) => {
                    onUpdateImageProperties?.(selected.id, {
                      filters: { ...(selected.filters ?? {}), saturation: val },
                    });
                  }}
                />
                <label className="dialog-label">
                  Czarno-biały
                  <input
                    type="checkbox"
                    checked={selected.filters?.grayscale ?? false}
                    onChange={(e) => {
                      onUpdateImageProperties?.(selected.id, {
                        filters: { ...(selected.filters ?? {}), grayscale: e.target.checked },
                      });
                    }}
                    style={{ marginTop: '6px' }}
                  />
                </label>
              </div>

              {/* Trace Image Action (ASSET-016, ASSET-017) */}
              <div className="property-actions" style={{ marginTop: '10px' }}>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={selected.locked}
                  onClick={() => onOpenTraceImage?.(selected)}
                >
                  Wektoryzuj obraz (Trace)
                </Button>
              </div>
            </section>
          )}

          {selected.type === 'symbol-instance' && (
            <section className="property-section" aria-label="Symbol Instance Properties">
              <div className="panel-section-heading">
                <span>Instancja Symbolu</span>
                <span className="panel-count">{doc.symbols?.[selected.symbolId]?.name ?? selected.symbolId}</span>
              </div>
              <div className="property-actions" style={{ marginTop: '8px' }}>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={selected.locked}
                  onClick={() => onDetachSymbolInstance?.(selected.id)}
                >
                  Odłącz symbol (Rozbij na obiekty)
                </Button>
              </div>
            </section>
          )}
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
                 <label className="dialog-label">Align<select data-testid="prop-stroke-align" value={selected.style.stroke.align ?? 'center'} disabled={selected.locked} onChange={(event) => patchStyle({ stroke: { ...(selected.style.stroke ?? defaultStroke), align: event.target.value as 'center' | 'inside' | 'outside' } })}><option value="center">Center</option><option value="inside">Inside</option><option value="outside">Outside</option></select></label>
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
        </> : (
          <DocumentProperties document={doc} onExecuteCommand={() => {}} />
        )}
      </div>
    </aside>
  );
};
