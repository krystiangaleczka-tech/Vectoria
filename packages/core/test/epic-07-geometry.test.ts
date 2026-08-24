import { describe, expect, it } from 'vitest';
import {
  CleanUpCommand,
  ClosePathCommand,
  CommandHistory,
  ConvertToCurvesCommand,
  CornerPathCommand,
  JoinPathsCommand,
  OffsetPathCommand,
  OutlineStrokeCommand,
  ReversePathDirectionCommand,
  applyCorners,
  createDefaultDocument,
  createPathNode,
  createTransform,
  defaultObjectStyle,
  defaultStroke,
  expandObject,
  offsetPath,
  scanCleanup,
  type DocumentModel,
  type PathObject,
  type RectangleObject,
} from '../src/index.js';

function documentWithObjects(objects: DocumentModel['objects']): DocumentModel {
  const doc = createDefaultDocument({ width: 800, height: 600 });
  const normalized = Object.fromEntries(Object.entries(objects).map(([id, object]) => [id, { ...object, layerId: doc.activeLayerId }])) as DocumentModel['objects'];
  return { ...doc, objects: normalized, layers: { ...doc.layers, [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds: Object.keys(normalized) } } };
}

function rectangle(id: string, x = 20): RectangleObject {
  return { type: 'rectangle', id, name: id, layerId: 'layer', visible: true, locked: false, transform: createTransform({ x, y: 20 }), style: defaultObjectStyle, width: 100, height: 80, cornerRadius: 0 };
}

function path(id: string, nodes: readonly ReturnType<typeof createPathNode>[], closed = true): PathObject {
  return { type: 'path', id, name: id, layerId: 'layer', visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }), style: { ...defaultObjectStyle, fill: { type: 'solid', color: '#48a' }, stroke: defaultStroke }, nodes, closed };
}

describe('EPIC-07 geometry contracts', () => {
  it('keeps parametric shapes until explicit conversion', () => {
    const source = rectangle('rect');
    const expanded = expandObject(source);
    expect(source.type).toBe('rectangle');
    expect(expanded?.type).toBe('path');
    expect(expanded?.style).toEqual(source.style);

    const history = new CommandHistory();
    let doc = documentWithObjects({ rect: source });
    doc = history.execute(new ConvertToCurvesCommand(['rect']), doc);
    expect(doc.objects.rect?.type).toBe('path');
    doc = history.undo(doc)!;
    expect(doc.objects.rect?.type).toBe('rectangle');
  });

  it('clamps rounded and chamfer corners to adjacent segments', () => {
    const source = path('shape', [createPathNode({ x: 0, y: 0 }), createPathNode({ x: 100, y: 0 }), createPathNode({ x: 100, y: 80 }), createPathNode({ x: 0, y: 80 })]);
    const result = applyCorners(source, { mode: 'rounded', radius: 1000 });
    expect(result.path).not.toBeNull();
    expect(result.warning).toContain('clamped');
    expect(result.path!.nodes.length).toBe(8);

    const chamfer = applyCorners(source, { mode: 'chamfer', radius: 10 });
    expect(chamfer.path!.nodes.length).toBe(8);
    const inverted = applyCorners(source, { mode: 'inverted', radius: 10 });
    expect(inverted.path!.nodes.length).toBe(12);
  });

  it('offsets closed paths and rejects collinear geometry', () => {
    const square = path('square', [createPathNode({ x: 0, y: 0 }), createPathNode({ x: 100, y: 0 }), createPathNode({ x: 100, y: 100 }), createPathNode({ x: 0, y: 100 })]);
    const outside = new OffsetPathCommand('square', { direction: 'outside', distance: 10 });
    const history = new CommandHistory();
    let doc = documentWithObjects({ square });
    doc = history.execute(outside, doc);
    expect((doc.objects.square as PathObject).nodes[0]!.point).toEqual({ x: -10, y: -10 });
    doc = history.undo(doc)!;
    expect((doc.objects.square as PathObject).nodes).toEqual(square.nodes);
    const tooLarge = offsetPath(square, { direction: 'inside', distance: 1000 });
    expect(tooLarge.path).toBeNull();

    const collinear = path('line', [createPathNode({ x: 0, y: 0 }), createPathNode({ x: 10, y: 0 }), createPathNode({ x: 20, y: 0 })]);
    const collinearDoc = documentWithObjects({ line: collinear });
    expect(new OffsetPathCommand('line', { direction: 'inside', distance: 2 }).execute(collinearDoc)).toBe(collinearDoc);
  });

  it('applies close and reverse as single reversible commands', () => {
    const open = path('open', [createPathNode({ x: 0, y: 0 }, { id: 'a' }), createPathNode({ x: 100, y: 0 }, { id: 'b' }), createPathNode({ x: 100, y: 100 }, { id: 'c' })], false);
    const history = new CommandHistory();
    let doc = documentWithObjects({ open });
    doc = history.execute(new ClosePathCommand('open'), doc);
    doc = history.execute(new ReversePathDirectionCommand('open'), doc);
    expect((doc.objects.open as PathObject).closed).toBe(true);
    expect((doc.objects.open as PathObject).nodes[0]!.id).toBe('c');
    doc = history.undo(doc)!;
    expect((doc.objects.open as PathObject).nodes[0]!.id).toBe('a');
  });

  it('materializes stroke outline while keeping source style reversible', () => {
    const source = path('stroke', [createPathNode({ x: 0, y: 0 }), createPathNode({ x: 100, y: 0 })], false);
    const history = new CommandHistory();
    let doc = documentWithObjects({ stroke: source });
    doc = history.execute(new OutlineStrokeCommand('stroke'), doc);
    const outlined = doc.objects.stroke as PathObject;
    expect(outlined.closed).toBe(true);
    expect(outlined.nodes.length).toBeGreaterThanOrEqual(3);
    expect(outlined.style.stroke).toBeNull();
    doc = history.undo(doc)!;
    expect((doc.objects.stroke as PathObject).style.stroke).not.toBeNull();
  });

  it('joins compatible endpoints and preserves z-order on undo', () => {
    const first = path('first', [createPathNode({ x: 0, y: 0 }), createPathNode({ x: 100, y: 0 })], false);
    const second = path('second', [createPathNode({ x: 100, y: 0 }), createPathNode({ x: 100, y: 100 })], false);
    const history = new CommandHistory();
    let doc = documentWithObjects({ first, second });
    doc = history.execute(new JoinPathsCommand('first', 'second'), doc);
    expect(doc.layers[doc.activeLayerId]!.objectIds).toEqual(['first']);
    expect((doc.objects.first as PathObject).nodes).toHaveLength(3);
    doc = history.undo(doc)!;
    expect(doc.layers[doc.activeLayerId]!.objectIds).toEqual(['first', 'second']);
  });

  it('scans duplicate geometry and applies selected cleanup atomically', () => {
    const first = rectangle('first');
    const duplicate = { ...rectangle('second'), transform: first.transform };
    const doc = documentWithObjects({ first, second: duplicate });
    const plan = scanCleanup(doc);
    expect(plan.findings.some((finding) => finding.kind === 'duplicate')).toBe(true);
    const history = new CommandHistory();
    const cleaned = history.execute(new CleanUpCommand(plan), doc);
    expect(Object.keys(cleaned.objects)).toEqual(['first']);
    const restored = history.undo(cleaned)!;
    expect(Object.keys(restored.objects)).toEqual(['first', 'second']);
  });

  it('does not apply invalid corner previews', () => {
    const open = path('open', [createPathNode({ x: 0, y: 0 }), createPathNode({ x: 1, y: 1 })], false);
    const result = applyCorners(open, { mode: 'inverted', radius: 20 });
    expect(result.path).toBeNull();
    expect(result.warning).toContain('closed path');
    const openDoc = documentWithObjects({ open });
    expect(new CornerPathCommand('open', { mode: 'inverted', radius: 20 }).execute(openDoc)).toBe(openDoc);
  });
});
