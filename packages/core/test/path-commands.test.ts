import { describe, expect, it } from 'vitest';
import {
  AddPathNodeCommand,
  CommandHistory,
  RemovePathNodeCommand,
  ReversePathCommand,
  SetPathNodeKindCommand,
  createDefaultDocument,
  createPathNode,
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

  it('reverses node order and swaps handles as one command', () => {
    const history = new CommandHistory();
    let doc = documentWithPath(true);
    const before = doc.objects['path-1'];
    doc = history.execute(new ReversePathCommand('path-1'), doc);
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes[0]?.id).toBe('n3');
    doc = history.undo(doc)!;
    expect(doc.objects['path-1']).toEqual(before);
  });
});
