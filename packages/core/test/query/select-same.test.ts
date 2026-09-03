import { describe, it, expect } from 'vitest';
import { selectSame } from '../../src/query/select-same.js';
import {
  createDefaultDocument,
  createTransform,
  type DocumentModel,
  type SceneObject,
  type RectangleObject,
  type TextObject,
  type EllipseObject,
  type ObjectStyle,
  type StrokeStyle,
} from '../../src/index.js';

const stroke = (color: string, width: number): StrokeStyle => ({
  color,
  width,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 4,
  dashArray: [],
  opacity: 1,
});

const style = (fillColor: string | null, s?: StrokeStyle, opacity = 1): ObjectStyle => ({
  fill: fillColor ? { type: 'solid', color: fillColor } : { type: 'none' },
  stroke: s ?? null,
  opacity,
});

function makeDoc(objects: SceneObject[]): DocumentModel {
  const base = createDefaultDocument();
  const layerId = base.activeLayerId;
  const layer = base.layers[layerId]!;
  const updatedLayer = { ...layer, objectIds: objects.map((o) => o.id) };
  return {
    ...base,
    layerIds: [layerId],
    layers: { [layerId]: updatedLayer },
    objects: Object.fromEntries(objects.map((o) => [o.id, { ...o, layerId }])),
  };
}

function rect(id: string, st: ObjectStyle, visible = true, locked = false): RectangleObject {
  return {
    id,
    type: 'rectangle',
    name: id,
    layerId: '',
    visible,
    locked,
    transform: createTransform({ x: 10, y: 10 }),
    style: st,
    width: 100,
    height: 50,
    cornerRadius: 0,
  };
}

function textObj(id: string, fontFamily: string): TextObject {
  return {
    id,
    type: 'text',
    name: id,
    layerId: '',
    visible: true,
    locked: false,
    transform: createTransform({ x: 0, y: 0 }),
    style: style('#000000'),
    text: 'Hello',
    fontFamily,
    fontSize: 16,
    fontWeight: 400,
    fontStyle: 'normal',
    letterSpacing: 0,
    lineHeight: 1.2,
    textAlign: 'left',
    kerning: true,
  };
}

describe('selectSame — normalization & tolerance', () => {
  it('selects objects with the same fill', () => {
    const doc = makeDoc([
      rect('obj1', style('#ff0000')),
      rect('obj2', style('#ff0000')),
      rect('obj3', style('#00ff00')),
    ]);
    const result = selectSame(doc, 'obj1', 'fill', 'document');
    expect(result).toHaveLength(2);
    expect(result).toContain('obj1');
    expect(result).toContain('obj2');
  });

  it('selects objects with the same stroke', () => {
    const doc = makeDoc([
      rect('obj1', style(null, stroke('#ff0000', 2))),
      rect('obj2', style(null, stroke('#ff0000', 2))),
    ]);
    const result = selectSame(doc, 'obj1', 'stroke', 'document');
    expect(result).toHaveLength(2);
  });

  it('normalizes color forms (name vs hex vs rgb)', () => {
    const doc = makeDoc([
      rect('a', style('#ff0000')),
      rect('b', style('red')),
      rect('c', style('rgb(255, 0, 0)')),
      rect('d', style('#00ff00')),
    ]);
    expect(selectSame(doc, 'a', 'fill')).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(selectSame(doc, 'a', 'fill')).not.toContain('d');
  });

  it('stroke width tolerance 1e-6', () => {
    const doc = makeDoc([
      rect('a', style(null, stroke('#000000', 2))),
      rect('b', style(null, stroke('#000000', 2 + 5e-7))),
      rect('c', style(null, stroke('#000000', 2.1))),
    ]);
    expect(selectSame(doc, 'a', 'stroke')).toEqual(expect.arrayContaining(['a', 'b']));
    expect(selectSame(doc, 'a', 'stroke')).not.toContain('c');
  });

  it('excludes locked and hidden objects', () => {
    const doc = makeDoc([
      rect('a', style('#ff0000')),
      rect('b', style('#ff0000'), true, true),
      rect('c', style('#ff0000'), false, false),
    ]);
    expect(selectSame(doc, 'a', 'fill')).toEqual(['a']);
  });

  it('target font matches text objects by fontFamily only', () => {
    const doc = makeDoc([
      textObj('t1', 'Arial'),
      textObj('t2', ' Arial '),
      textObj('t3', 'Inter'),
      rect('r1', style('#000000')),
    ]);
    expect(selectSame(doc, 't1', 'font')).toEqual(expect.arrayContaining(['t1', 't2']));
    expect(selectSame(doc, 't1', 'font')).not.toContain('t3');
    expect(selectSame(doc, 't1', 'font')).not.toContain('r1');
  });

  it('target size matches bounds with tolerance', () => {
    const doc = makeDoc([
      rect('a', style('#ff0000')),
      rect('b', style('#00ff00')),
    ]);
    expect(selectSame(doc, 'a', 'size')).toEqual(['a', 'b']);
  });

  it('target opacity matches with tolerance', () => {
    const doc = makeDoc([
      rect('a', style('#ff0000', undefined, 0.5)),
      rect('b', style('#00ff00', undefined, 0.5 + 5e-7)),
      rect('c', style('#00ff00', undefined, 0.75)),
    ]);
    expect(selectSame(doc, 'a', 'opacity')).toEqual(expect.arrayContaining(['a', 'b']));
    expect(selectSame(doc, 'a', 'opacity')).not.toContain('c');
  });

  it('target type matches by object type', () => {
    const ell: EllipseObject = {
      id: 'e',
      type: 'ellipse',
      name: 'e',
      layerId: '',
      visible: true,
      locked: false,
      transform: createTransform({ x: 10, y: 10 }),
      style: style('#ff0000'),
      width: 100,
      height: 50,
    };
    const doc = makeDoc([rect('a', style('#ff0000')), rect('b', style('#00ff00')), ell]);
    expect(selectSame(doc, 'a', 'type')).toEqual(['a', 'b']);
  });
});
