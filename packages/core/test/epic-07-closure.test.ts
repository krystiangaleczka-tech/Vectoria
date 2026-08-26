import { describe, expect, it } from 'vitest';
import {
  CleanUpCommand,
  applyCorners,
  createDefaultDocument,
  createPathNode,
  createTransform,
  defaultObjectStyle,
  defaultStroke,
  offsetPath,
  scanCleanup,
  type DocumentModel,
  type GroupObject,
  type PathObject,
} from '../src/index.js';

function straightPath(id = 'line'): PathObject {
  return {
    type: 'path', id, name: id, layerId: '', visible: true, locked: false,
    transform: createTransform({ x: 0, y: 0 }),
    style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke },
    nodes: [createPathNode({ x: 0, y: 0 }), createPathNode({ x: 100, y: 0 })],
    closed: false,
  };
}

function trianglePath(id = 'tri'): PathObject {
  return {
    type: 'path', id, name: id, layerId: '', visible: true, locked: false,
    transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle,
    nodes: [createPathNode({ x: 0, y: 0 }), createPathNode({ x: 100, y: 0 }), createPathNode({ x: 50, y: 80 })],
    closed: true,
  };
}

function seed(objects: Record<string, DocumentModel['objects'][string]>, objectStyles?: DocumentModel['objectStyles']): DocumentModel {
  const doc = createDefaultDocument();
  const ids = Object.keys(objects);
  return {
    ...doc,
    objects,
    ...(objectStyles ? { objectStyles } : {}),
    layers: { ...doc.layers, [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds: ids } },
  };
}

describe('EPIC-07 cleanup scan', () => {
  it('detects empty groups', () => {
    const empty: GroupObject = { type: 'group', id: 'g', name: 'g', layerId: '', visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle, childIds: [] };
    const plan = scanCleanup(seed({ g: empty }));
    const kinds = plan.findings.map((finding) => finding.kind);
    expect(kinds).toContain('empty-group');
    expect(plan.findings.find((finding) => finding.kind === 'empty-group')!.targetIds).toEqual(['g']);
  });

  it('ignores non-empty groups', () => {
    const group: GroupObject = { type: 'group', id: 'g', name: 'g', layerId: '', visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle, childIds: ['p'] };
    const plan = scanCleanup(seed({ g: group, p: trianglePath() }));
    expect(plan.findings.filter((finding) => finding.kind === 'empty-group')).toHaveLength(0);
  });

  it('flags saved styles no object carries anymore', () => {
    const live = defaultObjectStyle;
    const orphan = { ...defaultObjectStyle, opacity: 0.37 };
    const doc = seed(
      { p: trianglePath(), q: trianglePath('q') },
      [
        { id: 's-live', name: 'Live', style: JSON.parse(JSON.stringify(live)) },
        { id: 's-orphan', name: 'Orphan', style: orphan },
      ],
    );
    // Give q a distinct style so exactly one object matches the saved "live".
    const withDistinct = { ...doc, objects: { ...doc.objects, q: { ...trianglePath('q'), style: { ...defaultObjectStyle, opacity: 0.5 } } } };
    const findings = scanCleanup(withDistinct).findings.filter((finding) => finding.kind === 'unused-style');
    expect(findings).toHaveLength(1);
    expect(findings[0]!.targetIds).toEqual(['style:s-orphan']);
  });

  it('CleanUpCommand prunes styles and objects atomically with undo', () => {
    const emptyGroup: GroupObject = { type: 'group', id: 'g', name: 'g', layerId: '', visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle, childIds: [] };
    const doc = seed(
      { g: emptyGroup, keep: trianglePath('keep') },
      [{ id: 'dead', name: 'Dead', style: { ...defaultObjectStyle, opacity: 0.1 } }],
    );
    const plan = scanCleanup(doc);
    const history = new CleanUpCommand(plan);
    const cleaned = history.execute(doc);
    expect(cleaned.objects.g).toBeUndefined();
    expect(cleaned.objectStyles).toHaveLength(0);
    expect(cleaned.objects.keep).toBeDefined();

    const restored = history.undo(cleaned);
    expect(restored.objects.g).toBeDefined();
    expect(restored.objectStyles).toHaveLength(1);
  });
});

describe('EPIC-07 offset edge cases', () => {
  it('rejects open paths', () => {
    const result = offsetPath(straightPath(), { distance: 5, direction: 'outside' });
    expect(result.path).toBeNull();
    expect(result.warning).toMatch(/closed/i);
  });

  it('warns on zero distance without changing geometry', () => {
    const source = trianglePath();
    const result = offsetPath(source, { distance: 0, direction: 'outside' });
    expect(result.path).toBe(source);
    expect(result.warning).toBeUndefined();
  });

  it('clamps huge inside offsets into self-intersection warning', () => {
    const source = trianglePath();
    const result = offsetPath(source, { distance: 10000, direction: 'inside' });
    expect(result.path).toBeNull();
    expect(result.warning).toBeDefined();
  });
});

describe('EPIC-07 corner edge cases', () => {
  it('requires a closed path', () => {
    const result = applyCorners(straightPath(), { mode: 'rounded', radius: 10 });
    expect(result.path).toBeNull();
  });

  it('clamps radius to half of the shortest adjacent segment', () => {
    // Triangle with one very short edge (length 10): radius must clamp to ≤5.
    const path: PathObject = {
      ...trianglePath(),
      nodes: [createPathNode({ x: 0, y: 0 }), createPathNode({ x: 10, y: 0 }), createPathNode({ x: 50, y: 0.001 })],
    };
    const result = applyCorners(path, { mode: 'rounded', radius: 500 });
    expect(result.path).not.toBeNull();
    expect(result.warning).toMatch(/clamp/i);
    for (const node of result.path!.nodes) {
      if (node.outHandle) {
        const length = Math.hypot(node.outHandle.x - node.point.x, node.outHandle.y - node.point.y);
        expect(length).toBeLessThanOrEqual(500 * 0.5523 + 1e-6);
      }
    }
  });

  it('keeps mixed handle states when radius is zero', () => {
    const path = trianglePath();
    const result = applyCorners(path, { mode: 'rounded', radius: 0 });
    expect(result.path).toBe(path);
  });
});
