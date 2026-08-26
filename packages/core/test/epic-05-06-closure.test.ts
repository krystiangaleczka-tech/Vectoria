import { describe, expect, it } from 'vitest';
import {
  createDefaultDocument,
  createPathNode,
  createTransform,
  defaultObjectStyle,
  defaultStroke,
  applyAutoSmooth,
  CommandHistory,
  SetPathNodeKindCommand,
  SimplifyPathCommand,
  type DocumentModel,
  type PathNode,
  type PathObject,
} from '../src/index.js';

function kneePath(): PathObject {
  const nodes = [createPathNode({ x: -20, y: 0 }), createPathNode({ x: 0, y: 0 }), createPathNode({ x: 10, y: 10 })];
  return {
    type: 'path', id: 'knee', name: 'knee', layerId: '', visible: true, locked: false,
    transform: createTransform({ x: 100, y: 100 }), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke },
    nodes, closed: false,
  };
}

describe('EPIC-05 auto smooth', () => {
  it('derives handles from the averaged neighbour tangent with adaptive length', () => {
    const node = createPathNode({ x: 0, y: 0 });
    const previous = createPathNode({ x: -10, y: 0 });
    const next = createPathNode({ x: 10, y: 10 });
    const result = applyAutoSmooth(node, previous, next);
    expect(result.kind).toBe('auto');
    // Tangent direction: (20,10) normalized ≈ (0.894, 0.447); shorter segment is 10 → length 3.
    const outLength = Math.hypot(result.outHandle!.x, result.outHandle!.y);
    expect(outLength).toBeCloseTo(3, 5);
    expect(result.outHandle!.x / outLength).toBeCloseTo(0.8944, 3);
    expect(result.inHandle!.x).toBeLessThan(0);
    expect(result.inHandle!.y).toBeLessThan(0);
    // Mirrored through the node point.
    expect(result.inHandle!.x).toBeCloseTo(-result.outHandle!.x, 6);
    expect(result.inHandle!.y).toBeCloseTo(-result.outHandle!.y, 6);
  });

  it('falls back to the single segment on open-path endpoints', () => {
    const first = createPathNode({ x: 0, y: 0 });
    const next = createPathNode({ x: 10, y: 0 });
    const result = applyAutoSmooth(first, null, next);
    expect(result.outHandle!.y).toBeCloseTo(0);
    expect(result.outHandle!.x).toBeCloseTo(3);
  });

  it('leaves degenerate geometry untouched apart from the kind label', () => {
    const stuck = createPathNode({ x: 5, y: 5 });
    const result = applyAutoSmooth(stuck, createPathNode({ x: 5, y: 5 }), createPathNode({ x: 5, y: 5 }));
    expect(result.kind).toBe('auto');
    expect(result.inHandle).toBeNull();
    expect(result.outHandle).toBeNull();
  });

  it('SetPathNodeKindCommand auto recalculates handles inside the document', () => {
    const doc = createDefaultDocument({ width: 800, height: 600 });
    const layerId = doc.activeLayerId;
    const path = { ...kneePath(), layerId };
    const seeded: DocumentModel = { ...doc, objects: { knee: path }, layers: { ...doc.layers, [layerId]: { ...doc.layers[layerId]!, objectIds: ['knee'] } } };
    const history = new CommandHistory();
    const after = history.execute(new SetPathNodeKindCommand('knee', 1, 'auto', seeded), seeded);
    const middle = (after.objects['knee'] as PathObject).nodes[1]!;
    expect(middle.kind).toBe('auto');
    expect(middle.outHandle).not.toBeNull();
    expect(middle.inHandle).not.toBeNull();
    const undone = history.undo(after)!;
    expect(((undone.objects['knee'] as PathObject).nodes[1]!).inHandle).toBeNull();
  });
});

describe('EPIC-06 simplify session contract', () => {
  function docWithNoisyLine(): DocumentModel {
    const doc = createDefaultDocument({ width: 800, height: 600 });
    const layerId = doc.activeLayerId;
    // Nearly straight polyline with jitter — RDP should collapse it to endpoints.
    const points: PathNode[] = Array.from({ length: 12 }, (_, index) => createPathNode({ x: index * 10, y: index % 2 === 0 ? 0 : 0.4 }));
    const path: PathObject = {
      type: 'path', id: 'noisy', name: 'noisy', layerId, visible: true, locked: false,
      transform: createTransform({ x: 0, y: 200 }), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke },
      nodes: points, closed: false,
    };
    return { ...doc, objects: { noisy: path }, layers: { ...doc.layers, [layerId]: { ...doc.layers[layerId]!, objectIds: ['noisy'] } } };
  }

  it('SimplifyPathCommand reduces near-collinear runs to endpoints with undo', () => {
    const history = new CommandHistory();
    let doc = docWithNoisyLine();
    const before = (doc.objects['noisy'] as PathObject).nodes.length;
    doc = history.execute(new SimplifyPathCommand('noisy', 90, doc), doc);
    const reduced = (doc.objects['noisy'] as PathObject).nodes.length;
    expect(reduced).toBeLessThan(before);
    expect(reduced).toBeGreaterThanOrEqual(2);
    doc = history.undo(doc)!;
    expect((doc.objects['noisy'] as PathObject).nodes.length).toBe(before);
  });

  it('keeps endpoints exactly where they were', () => {
    const doc = docWithNoisyLine();
    const original = doc.objects['noisy'] as PathObject;
    const simplified = new SimplifyPathCommand('noisy', 80, doc).execute(doc);
    const nodes = (simplified.objects['noisy'] as PathObject).nodes;
    expect(nodes[0]!.point.x).toBe(original.nodes[0]!.point.x);
    expect(nodes[0]!.point.y).toBe(original.nodes[0]!.point.y);
    expect(nodes.at(-1)!.point.x).toBe(original.nodes.at(-1)!.point.x);
  });
});
