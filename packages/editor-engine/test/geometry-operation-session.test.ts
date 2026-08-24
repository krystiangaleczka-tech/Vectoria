import { describe, expect, it } from 'vitest';
import { GeometryOperationSession } from '../src/index.js';
import { createDefaultDocument, createPathNode, createTransform, defaultObjectStyle, type PathObject } from '@vectoria/core';

function documentWithPath() {
  const doc = createDefaultDocument();
  const path: PathObject = { type: 'path', id: 'path', name: 'Path', layerId: doc.activeLayerId, visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }), style: { ...defaultObjectStyle, fill: { type: 'solid', color: '#fff' } }, nodes: [createPathNode({ x: 0, y: 0 }), createPathNode({ x: 100, y: 0 }), createPathNode({ x: 100, y: 100 })], closed: true };
  return { ...doc, objects: { path }, layers: { ...doc.layers, [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds: ['path'] } } };
}

describe('geometry operation session', () => {
  it('keeps preview transient and returns command only on apply', () => {
    const doc = documentWithPath();
    const session = new GeometryOperationSession(doc, ['path']);
    const preview = session.previewCorners('path', { mode: 'rounded', radius: 8 });
    expect(preview.proposed).toHaveLength(1);
    expect(doc.objects.path?.type).toBe('path');
    expect(session.apply()?.type).toBe('CornerPath');
    expect(session.preview).toBeNull();
  });

  it('cancel discards proposed operation', () => {
    const session = new GeometryOperationSession(documentWithPath(), ['path']);
    session.previewOffset('path', { direction: 'outside', distance: 8 });
    session.cancel();
    expect(session.apply()).toBeNull();
  });
});
