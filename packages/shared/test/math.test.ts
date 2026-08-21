import { describe, it, expect } from 'vitest';
import {
  vec2,
  vec2Add,
  vec2Sub,
  vec2Scale,
  vec2Length,
  vec2Distance,
  vec2Rotate,
  rect,
  rectContainsPoint,
  rectIntersects,
  rectUnion,
  mat3,
  mat3Translate,
  mat3Rotate,
  mat3Scale,
  mat3Multiply,
  mat3Inverse,
  mat3TransformPoint,
  degToRad,
} from '../src/index.js';

describe('Vec2 Math', () => {
  it('adds and subtracts vectors', () => {
    const a = vec2(10, 20);
    const b = vec2(5, 15);
    expect(vec2Add(a, b)).toEqual({ x: 15, y: 35 });
    expect(vec2Sub(a, b)).toEqual({ x: 5, y: 5 });
  });

  it('scales and calculates length and distance', () => {
    const v = vec2(3, 4);
    expect(vec2Length(v)).toBe(5);
    expect(vec2Scale(v, 2)).toEqual({ x: 6, y: 8 });
    expect(vec2Distance(vec2(0, 0), vec2(3, 4))).toBe(5);
  });

  it('rotates vector around origin', () => {
    const v = vec2(1, 0);
    const rotated = vec2Rotate(v, degToRad(90));
    expect(rotated.x).toBeCloseTo(0, 5);
    expect(rotated.y).toBeCloseTo(1, 5);
  });
});

describe('Rect Math', () => {
  it('checks point containment', () => {
    const r = rect(10, 10, 100, 50);
    expect(rectContainsPoint(r, vec2(50, 30))).toBe(true);
    expect(rectContainsPoint(r, vec2(5, 30))).toBe(false);
    expect(rectContainsPoint(r, vec2(150, 30))).toBe(false);
  });

  it('checks intersection and union', () => {
    const a = rect(0, 0, 50, 50);
    const b = rect(25, 25, 50, 50);
    const c = rect(100, 100, 50, 50);

    expect(rectIntersects(a, b)).toBe(true);
    expect(rectIntersects(a, c)).toBe(false);

    const u = rectUnion(a, b);
    expect(u).toEqual({ x: 0, y: 0, width: 75, height: 75 });
  });
});

describe('Matrix3 Math', () => {
  it('creates matrix directly with mat3', () => {
    const m = mat3(1, 0, 0, 1, 10, 20);
    expect(m[6]).toBe(10);
    expect(m[7]).toBe(20);
  });

  it('multiplies translation matrices', () => {
    const t1 = mat3Translate(10, 20);
    const t2 = mat3Translate(5, -5);
    const combined = mat3Multiply(t1, t2);

    const p = vec2(0, 0);
    const transformed = mat3TransformPoint(combined, p);
    expect(transformed).toEqual({ x: 15, y: 15 });
  });

  it('inverts affine matrix', () => {
    const t = mat3Translate(100, 200);
    const r = mat3Rotate(degToRad(45));
    const s = mat3Scale(2, 3);
    const m = mat3Multiply(mat3Multiply(t, r), s);

    const inv = mat3Inverse(m);
    expect(inv).not.toBeNull();

    const p = vec2(42, 88);
    const pTransformed = mat3TransformPoint(m, p);
    const pRestored = mat3TransformPoint(inv!, pTransformed);

    expect(pRestored.x).toBeCloseTo(p.x, 5);
    expect(pRestored.y).toBeCloseTo(p.y, 5);
  });
});
