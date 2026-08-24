import type { Vec2 } from '@vectoria/shared';
import {
  mat3Translate,
  mat3Rotate,
  mat3Scale,
  mat3Skew,
  mat3Multiply,
  mat3Inverse,
  type Matrix3,
} from '@vectoria/shared';
import type { Transform2D } from './types.js';

/**
 * Canonical transform matrix:
 * M = T(position) · R(rotation) · S(scale) · T(-pivot)
 *
 * Property: M(pivot) = position
 */
export function getTransformMatrix(transform: Transform2D): Matrix3 {
  const { position, rotation, scale, pivot } = transform;

  const tPos = mat3Translate(position.x, position.y);
  const rot = mat3Rotate(rotation);
  const sc = mat3Scale(scale.x, scale.y);
  const skew = transform.skew ?? { x: 0, y: 0 };
  const skewMatrix = mat3Skew(skew.x, skew.y);
  const tPivot = mat3Translate(-pivot.x, -pivot.y);

  return mat3Multiply(
    mat3Multiply(mat3Multiply(mat3Multiply(tPos, rot), skewMatrix), sc),
    tPivot,
  );
}

/**
 * Inverse of the canonical transform matrix.
 * Returns null if the transform is degenerate (zero scale).
 */
export function getInverseTransformMatrix(transform: Transform2D): Matrix3 | null {
  const m = getTransformMatrix(transform);
  return mat3Inverse(m);
}

/**
 * Create a default identity transform at a given position.
 */
export function createTransform(position: Vec2, pivot?: Vec2): Transform2D {
  return {
    position,
    rotation: 0,
    scale: { x: 1, y: 1 },
    pivot: pivot ?? { x: 0, y: 0 },
  };
}

/**
 * Identity transform at the origin.
 */
export const Transform2DIdentity: Transform2D = {
  position: { x: 0, y: 0 },
  rotation: 0,
  scale: { x: 1, y: 1 },
  pivot: { x: 0, y: 0 },
};

/**
 * Minimum absolute scale value to prevent degenerate transforms.
 */
export const MIN_SCALE = 1e-6;

/**
 * Validate that a transform has non-degenerate scale.
 */
export function isValidTransform(transform: Transform2D): boolean {
  return (
    Math.abs(transform.scale.x) >= MIN_SCALE &&
    Math.abs(transform.scale.y) >= MIN_SCALE &&
    Number.isFinite(transform.position.x) &&
    Number.isFinite(transform.position.y) &&
    Number.isFinite(transform.rotation) &&
    Number.isFinite(transform.scale.x) &&
    Number.isFinite(transform.scale.y) &&
    (!transform.skew || (Number.isFinite(transform.skew.x) && Number.isFinite(transform.skew.y))) &&
    Number.isFinite(transform.pivot.x) &&
    Number.isFinite(transform.pivot.y)
  );
}
