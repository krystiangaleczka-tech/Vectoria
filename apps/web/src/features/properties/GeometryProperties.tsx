import React, { useState } from 'react';
import type { DocumentModel, ObjectId, GeometryPreview, PathObject } from '@vectoria/core';
import { Button, NumberInput } from '@vectoria/ui';
import { convertUnit } from '@vectoria/shared';

export type GeometryAction =
  | { type: 'expand'; objectIds: readonly ObjectId[] }
  | { type: 'corners'; objectId: ObjectId; mode: 'rounded' | 'chamfer' | 'inverted'; radius: number }
  | { type: 'offset'; objectId: ObjectId; direction: 'inside' | 'outside'; distance: number }
  | { type: 'outline'; objectId: ObjectId }
  | { type: 'close'; objectId: ObjectId }
  | { type: 'reverse'; objectId: ObjectId }
  | { type: 'boolean'; operation: 'unite' | 'subtract' | 'intersect' | 'exclude' | 'divide' | 'crop'; objectIds: readonly ObjectId[] }
  | { type: 'compound'; objectIds: readonly ObjectId[] };

interface GeometryPropertiesProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  selectedObjectIds: readonly ObjectId[];
  preview: GeometryPreview | null;
  onAction: (action: GeometryAction) => void;
  onApplyPreview: () => void;
  onCancelPreview: () => void;
  onOpenCleanup: () => void;
}

export const GeometryProperties: React.FC<GeometryPropertiesProps> = ({ document: doc, selectedObjectId, selectedObjectIds, preview, onAction, onApplyPreview, onCancelPreview, onOpenCleanup }) => {
  const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
  const path = selected?.type === 'path' ? selected as PathObject : null;
  const [cornerMode, setCornerMode] = useState<Extract<GeometryAction, { type: 'corners' }>['mode']>('rounded');
  const [cornerRadius, setCornerRadius] = useState(12);
  const [offsetDistance, setOffsetDistance] = useState(8);

  return (
    <section className="property-section geometry-properties" aria-label="Geometry operations">
      <div className="panel-section-heading"><span>Geometria</span><span className="panel-count">EDIT-07</span></div>
      {preview && (
        <div className={`geometry-preview-status ${preview.warnings.length > 0 ? 'has-warning' : ''}`} role="status">
          <strong>{preview.warnings.length > 0 ? 'Preview blocked' : 'Preview ready'}</strong>
          <span>{preview.warnings[0] ?? `${preview.proposed.length} proposed object(s)`}</span>
          <div className="property-actions">
            <Button size="sm" variant="primary" disabled={preview.warnings.length > 0 || preview.proposed.length === 0} onClick={onApplyPreview}>Apply</Button>
            <Button size="sm" variant="ghost" onClick={onCancelPreview}>Cancel</Button>
          </div>
        </div>
      )}
      <div className="geometry-action-group">
        <Button size="sm" variant="ghost" disabled={selectedObjectIds.length === 0} onClick={() => onAction({ type: 'expand', objectIds: selectedObjectIds })}>Convert to curves</Button>
        <div className="geometry-operation-title">Boolean</div>
        <div className="property-actions" role="group" aria-label="Boolean operations">
          {(['unite', 'subtract', 'intersect', 'exclude', 'divide', 'crop'] as const).map((operation) => <Button key={operation} size="sm" variant="ghost" disabled={selectedObjectIds.length < 2} aria-label={operation} onClick={() => onAction({ type: 'boolean', operation, objectIds: selectedObjectIds })}>{operation}</Button>)}
          <Button size="sm" variant="ghost" disabled={selectedObjectIds.length < 2} onClick={() => onAction({ type: 'compound', objectIds: selectedObjectIds })}>Compound</Button>
        </div>
        <Button size="sm" variant="ghost" onClick={onOpenCleanup}>Clean Up document</Button>
      </div>
      {path && (
        <>
          <div className="geometry-operation-card">
            <div className="geometry-operation-title">Corner Tool</div>
            <label className="dialog-label">Mode<select value={cornerMode} onChange={(event) => setCornerMode(event.target.value as typeof cornerMode)}><option value="rounded">Rounded</option><option value="chamfer">Chamfer</option><option value="inverted">Inverted</option></select></label>
            <NumberInput label="Radius" min={0} value={convertUnit(cornerRadius, 'px', doc.unit)} unit={doc.unit} decimals={1} onChange={(value) => setCornerRadius(convertUnit(value, doc.unit, 'px'))} />
            <Button size="sm" variant="ghost" onClick={() => onAction({ type: 'corners', objectId: path.id, mode: cornerMode, radius: cornerRadius })}>Preview corners</Button>
          </div>
          <div className="geometry-operation-card">
            <div className="geometry-operation-title">Offset Path</div>
            <NumberInput label="Distance" min={0} value={convertUnit(offsetDistance, 'px', doc.unit)} unit={doc.unit} decimals={1} onChange={(value) => setOffsetDistance(convertUnit(value, doc.unit, 'px'))} />
            <div className="property-actions">
              <Button size="sm" variant="ghost" onClick={() => onAction({ type: 'offset', objectId: path.id, direction: 'inside', distance: offsetDistance })}>Inside</Button>
              <Button size="sm" variant="ghost" onClick={() => onAction({ type: 'offset', objectId: path.id, direction: 'outside', distance: offsetDistance })}>Outside</Button>
            </div>
          </div>
          <div className="property-actions path-actions">
            <Button size="sm" variant="ghost" disabled={path.closed} onClick={() => onAction({ type: 'close', objectId: path.id })}>Close path</Button>
            <Button size="sm" variant="ghost" onClick={() => onAction({ type: 'reverse', objectId: path.id })}>Reverse direction</Button>
            <Button size="sm" variant="ghost" disabled={!path.style.stroke} onClick={() => onAction({ type: 'outline', objectId: path.id })}>Outline stroke</Button>
          </div>
        </>
      )}
    </section>
  );
};
