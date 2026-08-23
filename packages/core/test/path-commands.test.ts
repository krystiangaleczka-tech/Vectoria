import { describe, expect, it } from 'vitest';
import {
  AddPathNodeCommand,
  CommandHistory,
  RemovePathNodeCommand,
  ReversePathCommand,
  SetPathNodeKindCommand,
  SetPathNodeHandlesCommand,
  SetPathGeometryCommand,
  ConvertPathSegmentCommand,
  ConvertStrokeToPathCommand,
  JoinOpenPathsCommand,
  SplitPathCommand,
  MergePathNodesCommand,
  createDefaultDocument,
  createPathNode,
  updatePathNodeHandle,
  createTransform,
  defaultObjectStyle,
  defaultStroke,
  type DocumentModel,
  type PathObject,
} from '../src/index.js';

function documentWithPath(closed = false): DocumentModel {
  const doc = createDefaultDocument({ width: 800, height: 600 });
  const path: PathObject = {
    type: 'path', id: 'path-1', name: 'Path', layerId: doc.activeLayerId, visible: true, locked: false,
    transform: createTransform({ x: 0, y: 0 }), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke }, closed,
    nodes: [createPathNode({ x: 0, y: 0 }, { id: 'n1' }), createPathNode({ x: 200, y: 0 }, { id: 'n2' }), ...(closed ? [createPathNode({ x: 200, y: 200 }, { id: 'n3' })] : [])],
  };
  return { ...doc, objects: { [path.id]: path }, layers: { ...doc.layers, [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds: [path.id] } } };
}

describe('path edit commands', () => {
  it('adds a node by de Casteljau split and undoes it', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    doc = history.execute(new AddPathNodeCommand('path-1', 0), doc);
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes).toHaveLength(3);
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes[1]?.point).toEqual({ x: 100, y: 0 });
    doc = history.undo(doc)!;
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes).toHaveLength(2);
  });

  it('rejects removing a node when it would violate open-path minimum', () => {
    const doc = documentWithPath();
    expect(new RemovePathNodeCommand('path-1', 0).execute(doc)).toBe(doc);
  });

  it('keeps node kind and handle changes reversible', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    doc = history.execute(new SetPathNodeKindCommand('path-1', 0, 'symmetric', doc), doc);
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes[0]?.kind).toBe('symmetric');
    doc = history.undo(doc)!;
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes[0]?.kind).toBe('corner');
  });

  it('mirrors a dragged symmetric handle in local path space', () => {
    const node = createPathNode({ x: 10, y: 10 }, { kind: 'symmetric', outHandle: { x: 20, y: 15 }, inHandle: { x: 0, y: 5 } });
    expect(updatePathNodeHandle(node, 'out', { x: 25, y: 20 }).inHandle).toEqual({ x: -5, y: 0 });
  });

  it('reverses node order and swaps handles as one command', () => {
    const history = new CommandHistory();
    let doc = documentWithPath(true);
    const before = doc.objects['path-1'];
    doc = history.execute(new ReversePathCommand('path-1'), doc);
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes[0]?.id).toBe('n3');
    doc = history.undo(doc)!;
    expect(doc.objects['path-1']).toEqual(before);
  });

  it('keeps symmetric handles mirrored when one handle moves', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    const path = doc.objects['path-1'] as PathObject;
    const nodes = [
      { ...path.nodes[0]!, kind: 'symmetric' as const, outHandle: { x: 40, y: 20 }, inHandle: { x: -40, y: -20 } },
      path.nodes[1]!,
    ];
    doc = history.execute(new SetPathGeometryCommand('path-1', { nodes }), doc);
    doc = history.execute(new SetPathNodeHandlesCommand('path-1', 0, { outHandle: { x: 60, y: 30 }, inHandle: { x: -60, y: -30 } }), doc);
    const updated = doc.objects['path-1'] as PathObject;
    expect(updated.nodes[0]!.inHandle).toEqual({ x: -60, y: -30 });
    doc = history.undo(doc)!;
    expect((doc.objects['path-1'] as PathObject).nodes[0]!.outHandle).toEqual({ x: 40, y: 20 });
  });

  it('converts a line segment to curve and back reversibly', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    doc = history.execute(new ConvertPathSegmentCommand('path-1', 0, 'curve'), doc);
    expect((doc.objects['path-1'] as PathObject).nodes[0]!.outHandle).not.toBeNull();
    doc = history.execute(new ConvertPathSegmentCommand('path-1', 0, 'line'), doc);
    expect((doc.objects['path-1'] as PathObject).nodes[0]!.outHandle).toBeNull();
    doc = history.undo(doc)!;
    expect((doc.objects['path-1'] as PathObject).nodes[0]!.outHandle).not.toBeNull();
  });

  it('splits an open path into two paths and joins them back', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    const split = new SplitPathCommand('path-1', 1);
    doc = history.execute(split, { ...doc, objects: { 'path-1': { ...(doc.objects['path-1'] as PathObject), nodes: [...(doc.objects['path-1'] as PathObject).nodes, createPathNode({ x: 200, y: 100 }, { id: 'n3' })] } } });
    const pathIds = doc.layers[doc.activeLayerId]!.objectIds;
    expect(pathIds).toHaveLength(2);
    const secondId = pathIds[1]!;
    doc = history.execute(new JoinOpenPathsCommand('path-1', secondId), doc);
    expect(doc.layers[doc.activeLayerId]!.objectIds).toEqual(['path-1']);
    expect((doc.objects['path-1'] as PathObject).nodes).toHaveLength(3);
  });

  it('merges adjacent nodes while preserving path minimum', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    const path = doc.objects['path-1'] as PathObject;
    const expanded = { ...path, nodes: [...path.nodes, createPathNode({ x: 200, y: 100 }, { id: 'n3' })] };
    doc = history.execute(new SetPathGeometryCommand('path-1', { nodes: expanded.nodes }), doc);
    doc = history.execute(new MergePathNodesCommand('path-1', 1, 2), doc);
    expect((doc.objects['path-1'] as PathObject).nodes).toHaveLength(2);
    doc = history.undo(doc)!;
    expect((doc.objects['path-1'] as PathObject).nodes).toHaveLength(3);
  });

  it('converts stroked open path to a filled closed outline and undoes it', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    const before = doc.objects['path-1'];
    doc = history.execute(new ConvertStrokeToPathCommand('path-1'), doc);
    const converted = doc.objects['path-1'] as PathObject;
    expect(converted.type).toBe('path');
    expect(converted.closed).toBe(true);
    expect(converted.nodes.length).toBeGreaterThanOrEqual(3);
    expect(converted.style.stroke).toBeNull();
    expect(converted.style.fill).toEqual({ type: 'solid', color: defaultStroke.color });
    doc = history.undo(doc)!;
    expect(doc.objects['path-1']).toEqual(before);
  });

  it('rejects strokeless objects', () => {
    const doc = documentWithPath();
    const path = doc.objects['path-1'] as PathObject;
    const withoutStroke = { ...doc, objects: { ...doc.objects, [path.id]: { ...path, style: { ...path.style, stroke: null } } } };
    expect(new ConvertStrokeToPathCommand(path.id).execute(withoutStroke)).toBe(withoutStroke);
  });
});
