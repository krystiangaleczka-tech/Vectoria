import type { Vec2 } from './vec2.js';

/**
 * 3×3 affine transformation matrix stored as a flat array in column-major order.
 *
 * Layout:
 *   | a  c  tx |     indices: [0, 1, 2, 3, 4, 5, 6, 7, 8]
 *   | b  d  ty |     mapping: a=0, b=1, c=3, d=4, tx=6, ty=7
 *   | 0  0  1  |              last row always [0, 0, 1]
 *
 * Column-major: [a, b, 0, c, d, 0, tx, ty, 1]
 */
export type Matrix3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

export const Matrix3Identity: Matrix3 = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];

export function mat3(
  a: number, b: number,
  c: number, d: number,
  tx: number, ty: number,
): Matrix3 {
  return [a, b, 0, c, d, 0, tx, ty, 1];
}

/** Create translation matrix. */
export function mat3Translate(tx: number, ty: number): Matrix3 {
  return [1, 0, 0, 0, 1, 0, tx, ty, 1];
}

/** Create rotation matrix (radians, counterclockwise). */
export function mat3Rotate(angle: number): Matrix3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [cos, sin, 0, -sin, cos, 0, 0, 0, 1];
}

/** Create scale matrix. */
export function mat3Scale(sx: number, sy: number): Matrix3 {
  return [sx, 0, 0, 0, sy, 0, 0, 0, 1];
}

/** Multiply two 3×3 matrices: result = a · b */
export function mat3Multiply(a: Matrix3, b: Matrix3): Matrix3 {
  return [
    a[0] * b[0] + a[3] * b[1],
    a[1] * b[0] + a[4] * b[1],
    0,
    a[0] * b[3] + a[3] * b[4],
    a[1] * b[3] + a[4] * b[4],
    0,
    a[0] * b[6] + a[3] * b[7] + a[6],
    a[1] * b[6] + a[4] * b[7] + a[7],
    1,
  ];
}

/** Transform a point by a matrix. */
export function mat3TransformPoint(m: Matrix3, p: Vec2): Vec2 {
  return {
    x: m[0] * p.x + m[3] * p.y + m[6],
    y: m[1] * p.x + m[4] * p.y + m[7],
  };
}

/** Transform a direction vector (ignores translation). */
export function mat3TransformVector(m: Matrix3, v: Vec2): Vec2 {
  return {
    x: m[0] * v.x + m[3] * v.y,
    y: m[1] * v.x + m[4] * v.y,
  };
}

/** Compute the determinant of the 2×2 affine sub-matrix. */
export function mat3Determinant(m: Matrix3): number {
  return m[0] * m[4] - m[1] * m[3];
}

/** Compute the inverse of an affine 3×3 matrix. Returns null if singular. */
export function mat3Inverse(m: Matrix3): Matrix3 | null {
  const det = mat3Determinant(m);
  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1 / det;
  const a = m[4] * invDet;
  const b = -m[1] * invDet;
  const c = -m[3] * invDet;
  const d = m[0] * invDet;
  const tx = (m[3] * m[7] - m[4] * m[6]) * invDet;
  const ty = (m[1] * m[6] - m[0] * m[7]) * invDet;

  return [a, b, 0, c, d, 0, tx, ty, 1];
}

/** Chain multiply: result = m1 · m2 · ... · mn */
export function mat3Chain(...matrices: Matrix3[]): Matrix3 {
  let result = Matrix3Identity;
  for (const m of matrices) {
    result = mat3Multiply(result, m);
  }
  return result;
}

/** Extract translation from a matrix. */
export function mat3GetTranslation(m: Matrix3): Vec2 {
  return { x: m[6], y: m[7] };
}

/** Extract scale magnitudes from a matrix. */
export function mat3GetScale(m: Matrix3): Vec2 {
  return {
    x: Math.sqrt(m[0] * m[0] + m[1] * m[1]),
    y: Math.sqrt(m[3] * m[3] + m[4] * m[4]),
  };
}

/** Extract rotation angle from a matrix (radians). */
export function mat3GetRotation(m: Matrix3): number {
  return Math.atan2(m[1], m[0]);
}

/** Check if all matrix elements are finite. */
export function mat3IsFinite(m: Matrix3): boolean {
  return m.every(Number.isFinite);
}
