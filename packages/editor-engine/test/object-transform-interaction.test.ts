import { describe, expect, it } from 'vitest';
import { createDefaultDocument, createTransform, defaultObjectStyle, getTransformMatrix, isValidTransform, TransformObjectsCommand, type Transform2D, type RectangleObject } from '@vectoria/core';
import { mat3TransformPoint, type Vec2 } from '@vectoria/shared';
import { localResizeHandles, resizeObjectTransform, rotateObjectTransform, cornerRotationHandles } from '../src/interaction/object-transform-interaction.js';

const bounds = { x: -10, y: 15, width: 120, height: 80 };
const center = { x: 50, y: 55 };
const world = (transform: Transform2D, point: Vec2) => mat3TransformPoint(getTransformMatrix(transform), point);
const samePoint = (a: Vec2, b: Vec2) => {
  expect(a.x).toBeCloseTo(b.x, 7);
  expect(a.y).toBeCloseTo(b.y, 7);
};

describe('object transform interaction', () => {
  for (const angle of [0, 30, 90, 135]) {
    for (const scale of [{ x: 0.5, y: 0.5 }, { x: 2, y: 0.7 }, { x: -2, y: 1.2 }]) {
      for (const handle of localResizeHandles(bounds)) {
        it(`keeps opposite anchor and follows dragged handle: ${handle.id}, ${angle}, ${scale.x}/${scale.y}`, () => {
          const initial = { ...createTransform({ x: 300, y: 250 }, { x: 18, y: -7 }), rotation: angle * Math.PI / 180, scale, skew: { x: 0.15, y: -0.1 } };
          const snapshot = structuredClone(initial);
          const anchor = { x: 2 * center.x - handle.point.x, y: 2 * center.y - handle.point.y };
          const localTarget = { x: handle.point.x + (handle.point.x === center.x ? 0 : 12), y: handle.point.y + (handle.point.y === center.y ? 0 : 8) };
          const target = world(initial, localTarget);
          const next = resizeObjectTransform(initial, bounds, handle.id, world(initial, handle.point), target);
          samePoint(world(next, anchor), world(initial, anchor));
          samePoint(world(next, handle.point), target);
          expect(initial).toEqual(snapshot);
          expect(isValidTransform(next)).toBe(true);
          expect(resizeObjectTransform(initial, bounds, handle.id, world(initial, handle.point), target)).toEqual(next);
        });
      }
    }
  }

  for (const lineBounds of [{ x: -10, y: 15, width: 120, height: 0 }, { x: -10, y: 15, width: 0, height: 80 }]) {
    for (const handle of localResizeHandles(lineBounds)) {
      it(`resizes a one-dimensional path without division by zero: ${lineBounds.width}/${lineBounds.height}, ${handle.id}`, () => {
        const initial = { ...createTransform({ x: 300, y: 250 }), rotation: 0.8, scale: { x: 2, y: 0.5 } };
        const middle = { x: lineBounds.x + lineBounds.width / 2, y: lineBounds.y + lineBounds.height / 2 };
        const anchor = { x: 2 * middle.x - handle.point.x, y: 2 * middle.y - handle.point.y };
        const targetLocal = { x: handle.point.x + (lineBounds.width && handle.point.x !== middle.x ? 12 : 0), y: handle.point.y + (lineBounds.height && handle.point.y !== middle.y ? 8 : 0) };
        const next = resizeObjectTransform(initial, lineBounds, handle.id, world(initial, handle.point), world(initial, targetLocal));
        expect(isValidTransform(next)).toBe(true);
        samePoint(world(next, anchor), world(initial, anchor));
        samePoint(world(next, handle.point), world(initial, targetLocal));
      });
    }
  }

  it('keeps center fixed when rotating with pivot, scale and skew', () => {
    const initial = { ...createTransform({ x: 200, y: 300 }, { x: 12, y: 19 }), scale: { x: 2, y: 0.5 }, rotation: 0.8, skew: { x: 0.2, y: -0.1 } };
    const pivot = world(initial, center);
    const next = rotateObjectTransform(initial, center, { x: pivot.x + 100, y: pivot.y }, { x: pivot.x, y: pivot.y + 100 });
    samePoint(world(next, center), pivot);
    expect(next.rotation).toBeCloseTo(initial.rotation + Math.PI / 2);
    const snapped = rotateObjectTransform(initial, center, { x: pivot.x + 100, y: pivot.y }, { x: pivot.x + 50, y: pivot.y + 100 }, true);
    expect(snapped.rotation / (Math.PI / 12)).toBeCloseTo(Math.round(snapped.rotation / (Math.PI / 12)));
    samePoint(world(snapped, center), pivot);
  });

  it('clamps crossing the anchor, preserves aspect ratio and rejects nonfinite pointer positions', () => {
    const initial = createTransform({ x: 0, y: 0 });
    const next = resizeObjectTransform(initial, bounds, 'se', { x: 110, y: 95 }, { x: -200, y: -200 });
    expect(isValidTransform(next)).toBe(true);
    expect(next.scale.x).toBeGreaterThan(0);
    const proportional = resizeObjectTransform(initial, bounds, 'e', { x: 110, y: 55 }, { x: 140, y: 55 }, true);
    expect(proportional.scale.x).toBe(proportional.scale.y);
    for (const invalid of [NaN, Infinity, -Infinity]) {
      expect(resizeObjectTransform(initial, bounds, 'se', center, { x: invalid, y: 0 })).toBe(initial);
      expect(rotateObjectTransform(initial, center, center, { x: 0, y: invalid })).toBe(initial);
    }
    expect(resizeObjectTransform(initial, { ...bounds, width: 0 }, 'e', center, center)).toBe(initial);
    expect(resizeObjectTransform({ ...initial, scale: { x: 0, y: 1 } }, bounds, 'e', center, center).scale.x).toBe(0);
  });

  it('extra rotation targets stay 24 screen pixels outside all corners at extreme zooms', () => {
    for (const zoom of [0.01, 1, 100]) {
      const handles = localResizeHandles(bounds).map(({ id, point }) => ({ id, point: { x: point.x * zoom, y: point.y * zoom } }));
      const corners = handles.filter(({ id }) => ['nw', 'ne', 'se', 'sw'].includes(id));
      const targets = cornerRotationHandles(handles, { x: center.x * zoom, y: center.y * zoom });
      expect(targets).toHaveLength(4);
      targets.forEach((point, index) => expect(Math.hypot(point.x - corners[index]!.point.x, point.y - corners[index]!.point.y)).toBeCloseTo(24));
    }
  });

  it('commits, undoes and redoes the exact transform without mutating the document', () => {
    const doc = createDefaultDocument();
    const object: RectangleObject = { id: 'rect', type: 'rectangle', name: 'Rect', layerId: doc.activeLayerId, visible: true, locked: false, style: defaultObjectStyle, transform: createTransform({ x: 200, y: 200 }), width: 120, height: 80, cornerRadius: 0 };
    const before = { ...doc, objects: { rect: object }, layers: { ...doc.layers, [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds: ['rect'] } } };
    const next = resizeObjectTransform(object.transform, { x: 0, y: 0, width: 120, height: 80 }, 'nw', { x: 200, y: 200 }, { x: 160, y: 150 });
    const command = new TransformObjectsCommand(['rect'], new Map([['rect', next]]));
    const after = command.execute(before);
    expect(before.objects.rect.transform).toEqual(object.transform);
    expect(after.objects.rect?.transform).toEqual(next);
    const undone = command.undo(after);
    expect(undone.objects.rect?.transform).toEqual(object.transform);
    expect(command.execute(undone).objects.rect?.transform).toEqual(next);
  });
});
