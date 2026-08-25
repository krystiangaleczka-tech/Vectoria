import type { DocumentModel } from '@vectoria/core';
import { getObjectBounds } from '@vectoria/core';
import type { Rect } from '@vectoria/shared';

export interface ObjectSnapResult {
  dx: number;
  dy: number;
  snappedX: boolean;
  snappedY: boolean;
  guides: { axis: 'horizontal' | 'vertical'; position: number; targetId: string }[];
}

export function calculateObjectSnap(
  dragRect: Rect,
  doc: DocumentModel,
  ignoreIds: ReadonlySet<string>,
  tolerancePx: number,
  zoom: number
): ObjectSnapResult {
  const toleranceWorld = tolerancePx / zoom;
  let bestDx = 0;
  let bestDy = 0;
  let minDiffX = Infinity;
  let minDiffY = Infinity;
  let snappedX = false;
  let snappedY = false;
  const guides: ObjectSnapResult['guides'] = [];

  const dragLeft = dragRect.x;
  const dragRight = dragRect.x + dragRect.width;
  const dragCenterX = dragRect.x + dragRect.width / 2;
  const dragTop = dragRect.y;
  const dragBottom = dragRect.y + dragRect.height;
  const dragCenterY = dragRect.y + dragRect.height / 2;

  const dragPointsX = [
    { value: dragLeft },
    { value: dragCenterX },
    { value: dragRight },
  ];

  const dragPointsY = [
    { value: dragTop },
    { value: dragCenterY },
    { value: dragBottom },
  ];

  // Collect all visible target bounds (excluding dragged objects)
  const targetBoundsList: { id: string; bounds: Rect }[] = [];
  for (const obj of Object.values(doc.objects)) {
    if (!obj || !obj.visible || ignoreIds.has(obj.id)) continue;
    targetBoundsList.push({ id: obj.id, bounds: getObjectBounds(obj, doc) });
  }

  // Pass 1: edge/center snap
  for (const { bounds } of targetBoundsList) {
    const targetLeft = bounds.x;
    const targetRight = bounds.x + bounds.width;
    const targetCenterX = bounds.x + bounds.width / 2;
    const targetTop = bounds.y;
    const targetBottom = bounds.y + bounds.height;
    const targetCenterY = bounds.y + bounds.height / 2;

    const targetPointsX = [targetLeft, targetCenterX, targetRight];
    const targetPointsY = [targetTop, targetCenterY, targetBottom];

    for (const dp of dragPointsX) {
      for (const tp of targetPointsX) {
        const diff = tp - dp.value;
        if (Math.abs(diff) < minDiffX && Math.abs(diff) <= toleranceWorld) {
          minDiffX = Math.abs(diff);
          bestDx = diff;
          snappedX = true;
        }
      }
    }

    for (const dp of dragPointsY) {
      for (const tp of targetPointsY) {
        const diff = tp - dp.value;
        if (Math.abs(diff) < minDiffY && Math.abs(diff) <= toleranceWorld) {
          minDiffY = Math.abs(diff);
          bestDy = diff;
          snappedY = true;
        }
      }
    }
  }

  // Pass 2: gap/equal-spacing snap
  // Sort targets by horizontal and vertical position to find pairs
  const sortedByX = [...targetBoundsList].sort((a, b) => a.bounds.x - b.bounds.x);
  const sortedByY = [...targetBoundsList].sort((a, b) => a.bounds.y - b.bounds.y);

  // Horizontal gap snap: drag object fits in a gap equal to spacing between two other objects
  for (let i = 0; i < sortedByX.length - 1; i++) {
    const a = sortedByX[i]!;
    const b = sortedByX[i + 1]!;
    const gap = b.bounds.x - (a.bounds.x + a.bounds.width); // gap between a and b
    if (gap <= 0) continue;

    // Candidate 1: drag goes to the left of A with same gap
    const snapLeftOfA = a.bounds.x - gap - dragRect.width;
    const diffLeft = snapLeftOfA - dragLeft;
    if (Math.abs(diffLeft) < minDiffX && Math.abs(diffLeft) <= toleranceWorld) {
      minDiffX = Math.abs(diffLeft);
      bestDx = diffLeft;
      snappedX = true;
    }

    // Candidate 2: drag goes to the right of B with same gap
    const snapRightOfB = b.bounds.x + b.bounds.width + gap;
    const diffRight = snapRightOfB - dragLeft;
    if (Math.abs(diffRight) < minDiffX && Math.abs(diffRight) <= toleranceWorld) {
      minDiffX = Math.abs(diffRight);
      bestDx = diffRight;
      snappedX = true;
    }

    // Candidate 3: drag fits between A and B with equal gaps on both sides
    const totalInner = b.bounds.x - (a.bounds.x + a.bounds.width);
    if (dragRect.width < totalInner) {
      const betweenGap = (totalInner - dragRect.width) / 2;
      const snapBetween = a.bounds.x + a.bounds.width + betweenGap;
      const diffBetween = snapBetween - dragLeft;
      if (Math.abs(diffBetween) < minDiffX && Math.abs(diffBetween) <= toleranceWorld) {
        minDiffX = Math.abs(diffBetween);
        bestDx = diffBetween;
        snappedX = true;
      }
    }
  }

  // Vertical gap snap
  for (let i = 0; i < sortedByY.length - 1; i++) {
    const a = sortedByY[i]!;
    const b = sortedByY[i + 1]!;
    const gap = b.bounds.y - (a.bounds.y + a.bounds.height);
    if (gap <= 0) continue;

    const snapAboveA = a.bounds.y - gap - dragRect.height;
    const diffTop = snapAboveA - dragTop;
    if (Math.abs(diffTop) < minDiffY && Math.abs(diffTop) <= toleranceWorld) {
      minDiffY = Math.abs(diffTop);
      bestDy = diffTop;
      snappedY = true;
    }

    const snapBelowB = b.bounds.y + b.bounds.height + gap;
    const diffBottom = snapBelowB - dragTop;
    if (Math.abs(diffBottom) < minDiffY && Math.abs(diffBottom) <= toleranceWorld) {
      minDiffY = Math.abs(diffBottom);
      bestDy = diffBottom;
      snappedY = true;
    }

    const totalInner = b.bounds.y - (a.bounds.y + a.bounds.height);
    if (dragRect.height < totalInner) {
      const betweenGap = (totalInner - dragRect.height) / 2;
      const snapBetween = a.bounds.y + a.bounds.height + betweenGap;
      const diffBetween = snapBetween - dragTop;
      if (Math.abs(diffBetween) < minDiffY && Math.abs(diffBetween) <= toleranceWorld) {
        minDiffY = Math.abs(diffBetween);
        bestDy = diffBetween;
        snappedY = true;
      }
    }
  }

  // Pass 3: collect guides for the chosen bestDx/bestDy
  if (snappedX || snappedY) {
    const snappedDragLeft = dragLeft + bestDx;
    const snappedDragRight = dragRight + bestDx;
    const snappedDragCenterX = dragCenterX + bestDx;
    const snappedDragTop = dragTop + bestDy;
    const snappedDragBottom = dragBottom + bestDy;
    const snappedDragCenterY = dragCenterY + bestDy;

    for (const { id, bounds } of targetBoundsList) {
      const targetPointsX = [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width];
      const targetPointsY = [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height];

      if (snappedX) {
        for (const tp of targetPointsX) {
          if (
            Math.abs(tp - snappedDragLeft) < 1e-3 ||
            Math.abs(tp - snappedDragRight) < 1e-3 ||
            Math.abs(tp - snappedDragCenterX) < 1e-3
          ) {
            if (!guides.some((g) => g.axis === 'vertical' && Math.abs(g.position - tp) < 1e-6)) {
              guides.push({ axis: 'vertical', position: tp, targetId: id });
            }
          }
        }
      }

      if (snappedY) {
        for (const tp of targetPointsY) {
          if (
            Math.abs(tp - snappedDragTop) < 1e-3 ||
            Math.abs(tp - snappedDragBottom) < 1e-3 ||
            Math.abs(tp - snappedDragCenterY) < 1e-3
          ) {
            if (!guides.some((g) => g.axis === 'horizontal' && Math.abs(g.position - tp) < 1e-6)) {
              guides.push({ axis: 'horizontal', position: tp, targetId: id });
            }
          }
        }
      }
    }
  }

  return { dx: bestDx, dy: bestDy, snappedX, snappedY, guides };
}
