import { describe, expect, it } from 'vitest';
import { DragSession, InteractionStateStore, LassoSession } from '../src/index.js';

describe('InteractionStateStore', () => {
  it('starts with no shared transient interaction state', () => {
    const state = new InteractionStateStore();

    expect(state.drag).toBeNull();
    expect(state.dragSession).toBeNull();
    expect(state.lasso).toBeNull();
    expect(state.snap).toBeNull();
    expect(state.objectSnap).toBeNull();
    expect(state.freehandCursor).toBeNull();
  });

  it('owns canvas transient state without mutating document state', () => {
    const state = new InteractionStateStore();
    const dragSession = new DragSession(
      {
        objectIds: ['object-1'],
        initialTransforms: {},
        initialBounds: { x: 0, y: 0, width: 10, height: 10 },
        pivotWorld: { x: 5, y: 5 },
        operation: 'move',
      },
      { x: 1, y: 2 }
    );
    const lasso = new LassoSession({ x: 3, y: 4 });

    state.drag = {
      type: 'move-object',
      startScreen: { x: 10, y: 20 },
      startWorld: { x: 1, y: 2 },
      currentWorld: { x: 2, y: 3 },
      pointerId: 7,
    };
    state.dragSession = dragSession;
    state.lasso = lasso;
    state.snap = { snapped: true, worldPoint: { x: 5, y: 6 } };
    state.objectSnap = {
      dx: 1,
      dy: -1,
      snappedX: true,
      snappedY: true,
      guides: [],
    };
    state.freehandCursor = { x: 8, y: 9 };

    expect(state.drag?.type).toBe('move-object');
    expect(state.dragSession).toBe(dragSession);
    expect(state.lasso).toBe(lasso);
    expect(state.snap?.worldPoint).toEqual({ x: 5, y: 6 });
    expect(state.objectSnap?.dx).toBe(1);
    expect(state.freehandCursor).toEqual({ x: 8, y: 9 });
  });

  it('clears every shared transient field atomically', () => {
    const state = new InteractionStateStore();
    state.drag = {
      type: 'pan',
      startScreen: { x: 0, y: 0 },
      startWorld: { x: 0, y: 0 },
      currentWorld: { x: 1, y: 1 },
      pointerId: 1,
    };
    state.lasso = new LassoSession({ x: 0, y: 0 });
    state.snap = { snapped: false, worldPoint: { x: 2, y: 2 } };
    state.freehandCursor = { x: 3, y: 3 };

    state.clear();

    expect(state.drag).toBeNull();
    expect(state.dragSession).toBeNull();
    expect(state.lasso).toBeNull();
    expect(state.snap).toBeNull();
    expect(state.objectSnap).toBeNull();
    expect(state.freehandCursor).toBeNull();
  });
});
