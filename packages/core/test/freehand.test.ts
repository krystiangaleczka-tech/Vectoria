import { describe, expect, it } from 'vitest';
import {
  CommandHistory,
  CreateFreehandPathCommand,
  ReplacePathWithFragmentsCommand,
  SetPathWidthCommand,
  SimplifyPathCommand,
  SmoothPathCommand,
  createDefaultDocument,
  createFreehandPath,
  defaultObjectStyle,
  defaultStroke,
  erasePath,
  freehandSamplesToPathNodes,
  normalizeFreehandSamples,
  normalizeWidthProfile,
  pressureToWidth,
  splitPathAtPoint,
  splitPathByPolyline,
  type DocumentModel,
  type FreehandSample,
  type PathObject,
} from '../src/index.js';

const samples: FreehandSample[] = [
  { point: { x: 0, y: 0 }, pressure: 0, time: 0 },
  { point: { x: 0, y: 0 }, pressure: 2, time: 1 },
  { point: { x: 50, y: 10 }, pressure: 0.5, time: 2 },
  { point: { x: 100, y: 0 }, pressure: 1, time: 3 },
];

function pathDocument(): { doc: DocumentModel; path: PathObject } {
  const doc = createDefaultDocument({ width: 400, height: 300 });
  const path = createFreehandPath(samples, { layerId: doc.activeLayerId, style: { fill: { type: 'none' }, stroke: defaultStroke, opacity: 1 } });
  if (!path) throw new Error('path fixture failed');
  return { doc: { ...doc, objects: { [path.id]: path }, layers: { ...doc.layers, [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds: [path.id] } } }, path };
}

describe('freehand geometry', () => {
  it('filters duplicate samples and clamps pressure', () => {
    const result = normalizeFreehandSamples(samples, 1);
    expect(result).toHaveLength(3);
    expect(result[1]!.pressure).toBe(0.5);
  });

  it('preserves endpoints while smoothing and bounds node count', () => {
    const nodes = freehandSamplesToPathNodes(samples, 80, 3);
    expect(nodes).toHaveLength(3);
    expect(nodes[0]!.point).toEqual({ x: 0, y: 0 });
    expect(nodes.at(-1)!.point).toEqual({ x: 100, y: 0 });
  });

  it('maps pressure to positive finite widths and normalizes profile', () => {
    expect(pressureToWidth(4, 0)).toBeGreaterThan(0);
    expect(pressureToWidth(4, 2)).toBe(4);
    expect(normalizeWidthProfile([{ t: 2, width: -4 }, { t: 0.5, width: 3 }], 2)).toEqual([
      { t: 0, width: 2 }, { t: 0.5, width: 3 }, { t: 1, width: 0.1 },
    ]);
  });

  it('splits path at a point and with a cutter', () => {
    const { path } = pathDocument();
    expect(splitPathAtPoint(path, { x: 50, y: 8 }, 5)).toHaveLength(2);
    expect(splitPathByPolyline(path, [{ x: 50, y: -20 }, { x: 50, y: 20 }])).toHaveLength(0);
    expect(splitPathByPolyline(path, [{ x: 25, y: -20 }, { x: 25, y: 20 }, { x: 75, y: 20 }, { x: 75, y: -20 }])).toHaveLength(2);
  });

  it('returns surviving eraser fragments without mutating source', () => {
    const { path } = pathDocument();
    const fragments = erasePath(path, [{ x: 50, y: 0 }], 3);
    expect(fragments.length).toBeGreaterThanOrEqual(1);
    expect(path.nodes).toHaveLength(3);
  });
});

describe('freehand commands', () => {
  it('creates one history entry and exact undo state', () => {
    const doc = createDefaultDocument();
    const path = createFreehandPath(samples, { layerId: doc.activeLayerId, style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke } });
    if (!path) throw new Error('path fixture failed');
    const history = new CommandHistory();
    const before = doc;
    const after = history.execute(new CreateFreehandPathCommand(path), before);
    expect(Object.keys(after.objects)).toHaveLength(1);
    expect(history.undo(after)).toEqual(before);
  });

  it('replaces path with fragments and restores original order on undo', () => {
    const { doc, path } = pathDocument();
    const fragments = splitPathAtPoint(path, { x: 50, y: 8 }, 5);
    expect(fragments).toHaveLength(2);
    const history = new CommandHistory();
    const after = history.execute(new ReplacePathWithFragmentsCommand(path.id, fragments), doc);
    expect(after.layers[doc.activeLayerId]!.objectIds).toEqual(fragments.map((fragment) => fragment.id));
    expect(history.undo(after)).toEqual(doc);
  });

  it('smooths, simplifies and changes width as one undoable operation', () => {
    const { doc, path } = pathDocument();
    const history = new CommandHistory();
    const smoothed = history.execute(new SmoothPathCommand(path.id, 60, doc), doc);
    expect((smoothed.objects[path.id] as PathObject).nodes.length).toBeGreaterThan(2);
    const simplified = history.execute(new SimplifyPathCommand(path.id, 90, smoothed), smoothed);
    const widened = history.execute(new SetPathWidthCommand(path.id, [{ t: 0.5, width: 8 }]), simplified);
    expect((widened.objects[path.id] as PathObject).widthProfile).toEqual([{ t: 0, width: 1 }, { t: 0.5, width: 8 }, { t: 1, width: 1 }]);
    expect(history.undo(widened)).toEqual(simplified);
  });
});
