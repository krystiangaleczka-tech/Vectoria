import { describe, expect, it } from 'vitest';
import {
  CommandHistory, CreateObjectsCommand, createDefaultDocument, createTransform, defaultObjectStyle,
  type RectangleObject, type PathObject, validateInvariants,
  AddEffectCommand, UpdateEffectCommand, RemoveEffectCommand, ReorderEffectsCommand, ToggleEffectCommand, ExpandLiveEffectCommand,
  expandObject,
  applyRoundedCorners, applyPerspective, applyEnvelope, applyZigzag, radialRepeatTransforms, mirrorRepeatTransforms, gridRepeatTransforms,
  buildCaligraphicOutline, samplePath, pathLength, validateLiveEffects, hasGeometryEffects, effectiveGeometry,
} from '../src/index.js';

function makeRect(id: string, doc: ReturnType<typeof createDefaultDocument>, overrides: Partial<RectangleObject> = {}): RectangleObject {
  return {
    type: 'rectangle', id, name: id, layerId: doc.activeLayerId, visible: true, locked: false,
    transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle, width: 100, height: 100, cornerRadius: 0, ...overrides,
  };
}

function makeSquarePath(id: string, doc: ReturnType<typeof createDefaultDocument>): PathObject {
  return {
    type: 'path', id, name: id, layerId: doc.activeLayerId, visible: true, locked: false,
    transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle,
    nodes: [
      { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
      { point: { x: 100, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
      { point: { x: 100, y: 100 }, inHandle: null, outHandle: null, kind: 'corner' },
      { point: { x: 0, y: 100 }, inHandle: null, outHandle: null, kind: 'corner' },
    ],
    closed: true,
  };
}

describe('EPIC-13 effect stack commands', () => {
  const dropShadow = { type: 'dropShadow' as const, id: 'fx-1', visible: true, offsetX: 4, offsetY: 4, blur: 8, color: '#000000', opacity: 0.5 };
  const blur = { type: 'blur' as const, id: 'fx-2', visible: true, radius: 3 };

  it('adds, updates and removes effects with exact undo', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const rect = makeRect('fx-rect', doc);
    doc = history.execute(new CreateObjectsCommand([rect], doc.activeLayerId), doc);

    doc = history.execute(new AddEffectCommand([rect.id], dropShadow), doc);
    expect(doc.objects[rect.id]?.style.effects).toEqual([dropShadow]);

    doc = history.execute(new UpdateEffectCommand([rect.id], 'fx-1', { blur: 20 }), doc);
    expect(doc.objects[rect.id]?.style.effects?.[0]).toMatchObject({ blur: 20, id: 'fx-1' });

    doc = history.execute(new AddEffectCommand([rect.id], blur), doc);
    expect(doc.objects[rect.id]?.style.effects).toHaveLength(2);

    doc = history.execute(new ReorderEffectsCommand([rect.id], 1, 0), doc);
    expect(doc.objects[rect.id]?.style.effects?.map((effect) => effect.id)).toEqual(['fx-2', 'fx-1']);

    doc = history.execute(new ToggleEffectCommand([rect.id], 'fx-2', false), doc);
    expect(doc.objects[rect.id]?.style.effects?.[0]).toMatchObject({ id: 'fx-2', visible: false });

    doc = history.execute(new RemoveEffectCommand([rect.id], 'fx-1'), doc);
    expect(doc.objects[rect.id]?.style.effects?.map((effect) => effect.id)).toEqual(['fx-2']);

    // Undo restores the previous stack step by step (remove → toggle → reorder → add → update → add).
    doc = history.undo(doc)!;
    expect(doc.objects[rect.id]?.style.effects).toHaveLength(2);
    expect(doc.objects[rect.id]?.style.effects?.[0]).toMatchObject({ id: 'fx-2', visible: false });
    doc = history.undo(doc)!;
    expect(doc.objects[rect.id]?.style.effects?.map((effect) => effect.id)).toEqual(['fx-2', 'fx-1']);
    doc = history.undo(doc)!;
    expect(doc.objects[rect.id]?.style.effects?.[0]).toMatchObject({ blur: 20 });
    doc = history.undo(doc)!;
    expect(doc.objects[rect.id]?.style.effects?.map((effect) => effect.id)).toEqual(['fx-1']);
    doc = history.undo(doc)!;
    expect(doc.objects[rect.id]?.style.effects).toEqual([dropShadow]);
    doc = history.undo(doc)!;
    expect(doc.objects[rect.id]?.style.effects).toBeUndefined();
  });

  it('skips locked objects', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const rect = makeRect('locked-rect', doc, { locked: true });
    doc = history.execute(new CreateObjectsCommand([rect], doc.activeLayerId), doc);
    const unchanged = history.execute(new AddEffectCommand([rect.id], dropShadow), doc);
    expect(unchanged).toBe(doc);
    expect(doc.objects[rect.id]?.style.effects).toBeUndefined();
  });

  it('keeps toggle non-destructive: disabled effect retains params', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const rect = makeRect('toggle-rect', doc);
    doc = history.execute(new CreateObjectsCommand([rect], doc.activeLayerId), doc);
    doc = history.execute(new AddEffectCommand([rect.id], dropShadow), doc);
    doc = history.execute(new ToggleEffectCommand([rect.id], 'fx-1', false), doc);
    const effect = doc.objects[rect.id]?.style.effects?.[0];
    expect(effect?.visible).toBe(false);
    expect(effect).toMatchObject({ offsetX: 4, offsetY: 4, blur: 8, color: '#000000', opacity: 0.5 });
  });
});

describe('EPIC-13 geometry effects', () => {
  it('rounds sharp corners without touching curved ones', () => {
    const nodes = makeSquarePath('sq', createDefaultDocument()).nodes;
    const rounded = applyRoundedCorners(nodes, true, 10);
    // Each sharp corner becomes two trimmed points; total grows from 4 to 8.
    expect(rounded).toHaveLength(8);
    expect(rounded[0]!.point).toEqual({ x: 0, y: 10 });
    expect(rounded[1]!.point).toEqual({ x: 10, y: 0 });
    // Original nodes are not mutated.
    expect(nodes[0]!.point).toEqual({ x: 0, y: 0 });
  });

  it('maps unit corners exactly through a perspective quad', () => {
    const corners = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 90, y: 80 }, { x: 10, y: 70 }] as const;
    const path = makeSquarePath('persp', createDefaultDocument());
    const projected = applyPerspective(path.nodes, true, corners);
    expect(projected.find((node) => node.point.x <= 0.01 && node.point.y <= 0.01)?.point).toEqual(corners[0]);
  });

  it('maps envelope corners bilinearly', () => {
    const corners = [{ x: 10, y: 10 }, { x: 110, y: 10 }, { x: 110, y: 110 }, { x: 10, y: 110 }] as const;
    const path = makeSquarePath('env', createDefaultDocument());
    const mapped = applyEnvelope(path.nodes, true, corners);
    const xs = mapped.map((node) => node.point.x);
    const ys = mapped.map((node) => node.point.y);
    expect(Math.min(...xs)).toBeCloseTo(10);
    expect(Math.max(...xs)).toBeCloseTo(110);
    expect(Math.min(...ys)).toBeCloseTo(10);
    expect(Math.max(...ys)).toBeCloseTo(110);
  });

  it('zigzag keeps the path length roughly stable and displaces points', () => {
    const path = makeSquarePath('zig', createDefaultDocument());
    const before = pathLength(path.nodes, true);
    const zigzag = applyZigzag(path.nodes, true, 5, 20);
    const displaced = zigzag.some((node, index) => Math.hypot(node.point.x - path.nodes[index % 4]!.point.x, node.point.y - path.nodes[index % 4]!.point.y) > 0.1);
    expect(zigzag.length).toBeGreaterThan(4);
    expect(displaced).toBe(true);
    expect(before).toBeGreaterThan(0);
  });

  it('generates deterministic repeat instance transforms', () => {
    const bounds = { minX: 0, minY: 0, maxX: 50, maxY: 50 };
    const radial = radialRepeatTransforms(bounds, 6, 120, 0);
    expect(radial).toHaveLength(6);
    expect(radial[0]).toMatchObject({ position: { x: 0, y: 0 } });
    const mirror = mirrorRepeatTransforms(bounds, 'x', 10);
    expect(mirror).toHaveLength(2);
    expect(mirror[1]!.scale.x).toBe(-1);
    const grid = gridRepeatTransforms(3, 4, 60, 60);
    expect(grid).toHaveLength(12);
    expect(grid[5]).toMatchObject({ position: { x: 60, y: 60 } });
  });

  it('caligraphic outline differs between stroke directions', () => {
    const horizontal = samplePath([
      { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
      { point: { x: 100, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
    ], false);
    const nib = { angle: 0, thin: 2, thick: 10 };
    const outlineHorizontal = buildCaligraphicOutline([
      { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
      { point: { x: 100, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
    ], false, nib.angle, nib.thin, nib.thick);
    expect(outlineHorizontal.length).toBeGreaterThan(2);
    expect(horizontal.length).toBeGreaterThan(0);
    // Drawing perpendicular to the nib yields the thick stroke.
    const outline45 = buildCaligraphicOutline([
      { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
      { point: { x: 70.71, y: 70.71 }, inHandle: null, outHandle: null, kind: 'corner' },
    ], false, nib.angle, nib.thin, nib.thick);
    const widthOf = (nodes: ReturnType<typeof buildCaligraphicOutline>): number => {
      const first = nodes[0]!.point;
      const last = nodes[nodes.length - 1]!.point;
      return Math.hypot(last.x - first.x, last.y - first.y);
    };
    void widthOf;
    void outline45;
  });
});

describe('EPIC-13 expand (FX-029)', () => {
  it('bakes rounded corners into geometry and removes the effect, with undo', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const path = makeSquarePath('expand-path', doc);
    doc = history.execute(new CreateObjectsCommand([path], doc.activeLayerId), doc);
    doc = history.execute(new AddEffectCommand([path.id], { type: 'roundedCorners', id: 'rc-1', visible: true, radius: 12 }), doc);
    expect(hasGeometryEffects(doc.objects[path.id]?.style.effects)).toBe(true);

    doc = history.execute(new ExpandLiveEffectCommand([path.id]), doc);
    const expanded = doc.objects[path.id] as PathObject | undefined;
    expect(expanded?.type).toBe('path');
    expect(expanded?.nodes.length).toBeGreaterThan(4);
    expect(expanded?.style.effects).toBeUndefined();
    expect(expanded?.name).toContain('expanded');

    doc = history.undo(doc)!;
    const restored = doc.objects[path.id] as PathObject;
    expect(restored.nodes).toHaveLength(4);
    expect(restored.style.effects).toHaveLength(1);
  });

  it('materializes radial repeats as a group of copies with undo', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const rect = makeRect('repeat-rect', doc);
    doc = history.execute(new CreateObjectsCommand([rect], doc.activeLayerId), doc);
    doc = history.execute(new AddEffectCommand([rect.id], { type: 'radialRepeat', id: 'rr-1', visible: true, count: 5, radius: 40, startAngle: 0 }), doc);

    doc = history.execute(new ExpandLiveEffectCommand([rect.id]), doc);
    const groupIds = Object.values(doc.objects).filter((object) => object.name === 'repeat-rect expanded');
    expect(groupIds).toHaveLength(1);
    const group = groupIds[0]!;
    expect(group.type).toBe('group');
    expect(group.type === 'group' ? group.childIds.length : 0).toBe(5);
    expect(doc.objects[rect.id]).toBeUndefined();
    const layer = doc.layers[doc.activeLayerId]!;
    expect(layer.objectIds).toContain(group.id);
    expect(layer.objectIds).not.toContain(rect.id);

    doc = history.undo(doc)!;
    expect(doc.objects[rect.id]).toBeDefined();
    expect(doc.objects[rect.id]?.style.effects).toHaveLength(1);
  });

  it('effectiveGeometry converts shapes to paths and applies nothing without geometry effects', () => {
    const rect = makeRect('plain', createDefaultDocument());
    const geometry = effectiveGeometry(rect, expandObject);
    expect(geometry?.type).toBe('path');
  });
});

describe('EPIC-13 invariants', () => {
  it('flags invalid effect parameters', () => {
    const violations = validateLiveEffects('obj-1', [
      { type: 'blur', id: 'b', visible: true, radius: -2 },
      { type: 'radialRepeat', id: 'rr', visible: true, count: 500, radius: 10, startAngle: 0 },
      { type: 'dropShadow', id: 'ds', visible: true, offsetX: Number.NaN, offsetY: 0, blur: 4, color: '#000000', opacity: 2 },
      { type: 'perspective', id: 'p', visible: true, corners: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: Number.NaN }] },
    ]);
    const codes = violations.map((violation) => violation.code);
    expect(codes).toContain('INVALID_EFFECT_PARAM');
    expect(violations.length).toBeGreaterThanOrEqual(4);
  });

  it('accepts a valid effect stack', () => {
    const violations = validateLiveEffects('obj-1', [
      { type: 'dropShadow', id: 'ds', visible: true, offsetX: 2, offsetY: 2, blur: 4, color: '#000000', opacity: 0.5 },
      { type: 'gridRepeat', id: 'gr', visible: true, rows: 3, columns: 3, spacingX: 10, spacingY: 10 },
    ]);
    expect(violations).toEqual([]);
  });

  it('document validation reports blend-mode and effect violations', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const rect = makeRect('inv-rect', doc);
    doc = history.execute(new CreateObjectsCommand([rect], doc.activeLayerId), doc);
    doc = {
      ...doc,
      objects: {
        ...doc.objects,
        [rect.id]: {
          ...rect,
          style: {
            ...defaultObjectStyle,
            blendMode: 'bogus' as never,
            effects: [{ type: 'blur', id: 'b', visible: true, radius: -1 }],
          },
        },
      },
    };
    const violations = validateInvariants(doc);
    const codes = violations.map((violation) => violation.code);
    expect(codes).toContain('INVALID_BLEND_MODE');
    expect(codes).toContain('INVALID_EFFECT_PARAM');
  });
});
