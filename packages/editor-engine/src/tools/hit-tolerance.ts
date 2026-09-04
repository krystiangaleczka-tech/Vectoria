export type PointerCategory = 'mouse' | 'touch' | 'pen';

/**
 * Computes screen-pixel hit-test tolerance tailored to input device category.
 * Touch and stylus inputs require larger target footprints (UX-013) to prevent
 * missed taps and inaccurate selections on high-density displays.
 */
export function hitTolerancePx(pointerType: string | undefined, base = 6): number {
  if (pointerType === 'touch') {
    return base * 2.5;
  }
  if (pointerType === 'pen') {
    return base * 1.75;
  }
  return base;
}
