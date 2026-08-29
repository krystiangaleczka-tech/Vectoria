import { describe, expect, it } from 'vitest';
import {
  MoveHierarchyObjectsCommand,
  validateHierarchyMove,
  isDescendantOf,
} from '../src/commands/hierarchy-commands.js';
import { createDefaultDocument, defaultObjectStyle, defaultCornerRadii } from '../src/model/factory.js';
import { createTransform } from '../src/model/transform.js';
import type { GroupObject, RectangleObject } from '../src/model/types.js';

describe('Hierarchy Commands & Validation (LAYER-006, LAYER-007)', () => {
  it('detects and rejects cyclical hierarchy moves', () => {
    let doc = createDefaultDocument({ name: 'Hierarchy Cycle Test' });
    const layerId = doc.activeLayerId;

    const rectA: RectangleObject = {
      id: 'rect-a',
      name: 'Rect A',
      layerId,
      visible: true,
      locked: false,
      type: 'rectangle',
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      width: 100,
      height: 100,
      cornerRadius: defaultCornerRadii,
    };

    const groupB: GroupObject = {
      id: 'group-b',
      name: 'Group B',
      layerId,
      visible: true,
      locked: false,
      type: 'group',
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      childIds: ['rect-a'],
    };

    const groupA: GroupObject = {
      id: 'group-a',
      name: 'Group A',
      layerId,
      visible: true,
      locked: false,
      type: 'group',
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      childIds: ['group-b'],
    };

    doc = {
      ...doc,
      objects: {
        ...doc.objects,
        'rect-a': rectA,
        'group-b': groupB,
        'group-a': groupA,
      },
      layers: {
        ...doc.layers,
        [layerId]: {
          ...doc.layers[layerId]!,
          objectIds: ['group-a'],
        },
      },
    };

    // group-b is inside group-a. Attempting to move group-a inside group-b must be rejected.
    expect(isDescendantOf(doc, 'group-b', 'group-a')).toBe(true);
    expect(isDescendantOf(doc, 'rect-a', 'group-a')).toBe(true);

    const validation = validateHierarchyMove(doc, ['group-a'], { type: 'inside', targetId: 'group-b' });
    expect(validation.valid).toBe(false);
    expect(validation.reason).toMatch(/cycle/i);

    // Attempting to move group-a before/after rect-a (which is inside group-b inside group-a) must also be rejected
    const validationBefore = validateHierarchyMove(doc, ['group-a'], { type: 'before', targetId: 'rect-a' });
    expect(validationBefore.valid).toBe(false);
  });

  it('moves object before, after, and inside groups with full undo/redo', () => {
    let doc = createDefaultDocument({ name: 'DnD Test' });
    const layerId = doc.activeLayerId;

    const makeRect = (id: string, name: string): RectangleObject => ({
      id,
      name,
      layerId,
      visible: true,
      locked: false,
      type: 'rectangle',
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      width: 50,
      height: 50,
      cornerRadius: defaultCornerRadii,
    });

    const rect1 = makeRect('r1', 'Rect 1');
    const rect2 = makeRect('r2', 'Rect 2');
    const rect3 = makeRect('r3', 'Rect 3');

    const group1: GroupObject = {
      id: 'g1',
      name: 'Group 1',
      layerId,
      visible: true,
      locked: false,
      type: 'group',
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      childIds: ['r2'],
    };

    doc = {
      ...doc,
      objects: {
        ...doc.objects,
        r1: rect1,
        r2: rect2,
        r3: rect3,
        g1: group1,
      },
      layers: {
        ...doc.layers,
        [layerId]: {
          ...doc.layers[layerId]!,
          objectIds: ['r1', 'g1', 'r3'],
        },
      },
    };

    // Test 1: Move r3 before r1
    const moveCmd1 = new MoveHierarchyObjectsCommand(['r3'], { type: 'before', targetId: 'r1' });
    doc = moveCmd1.execute(doc);
    expect(doc.layers[layerId]!.objectIds).toEqual(['r3', 'r1', 'g1']);

    doc = moveCmd1.undo(doc);
    expect(doc.layers[layerId]!.objectIds).toEqual(['r1', 'g1', 'r3']);

    // Test 2: Move r1 inside g1
    const moveCmd2 = new MoveHierarchyObjectsCommand(['r1'], { type: 'inside', targetId: 'g1' });
    doc = moveCmd2.execute(doc);
    expect(doc.layers[layerId]!.objectIds).toEqual(['g1', 'r3']);
    expect((doc.objects.g1 as GroupObject).childIds).toEqual(['r2', 'r1']);

    doc = moveCmd2.undo(doc);
    expect(doc.layers[layerId]!.objectIds).toEqual(['r1', 'g1', 'r3']);
    expect((doc.objects.g1 as GroupObject).childIds).toEqual(['r2']);

    // Test 3: Move r3 after r2 (inside g1)
    const moveCmd3 = new MoveHierarchyObjectsCommand(['r3'], { type: 'after', targetId: 'r2' });
    doc = moveCmd3.execute(doc);
    expect(doc.layers[layerId]!.objectIds).toEqual(['r1', 'g1']);
    expect((doc.objects.g1 as GroupObject).childIds).toEqual(['r2', 'r3']);
  });

  it('rejects moves involving locked objects, locked layers, and locked groups', () => {
    let doc = createDefaultDocument({ name: 'Locked Hierarchy Test' });
    const layerId = doc.activeLayerId;

    const makeRect = (id: string, name: string, locked = false): RectangleObject => ({
      id,
      name,
      layerId,
      visible: true,
      locked,
      type: 'rectangle',
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      width: 50,
      height: 50,
      cornerRadius: defaultCornerRadii,
    });

    const lockedLayerId = 'layer-locked';
    const unlockedLayerId = 'layer-unlocked';

    doc = {
      ...doc,
      objects: {
        ...doc.objects,
        rLocked: makeRect('rLocked', 'Locked Rect', true),
        rInLockedGroup: makeRect('rInLockedGroup', 'Rect In Locked Group'),
        rFree: makeRect('rFree', 'Free Rect'),
        gLocked: {
          id: 'gLocked',
          name: 'Locked Group',
          layerId,
          visible: true,
          locked: true,
          type: 'group',
          transform: createTransform({ x: 0, y: 0 }),
          style: defaultObjectStyle,
          childIds: ['rInLockedGroup'],
        },
      },
      layers: {
        ...doc.layers,
        [lockedLayerId]: {
          id: lockedLayerId,
          name: 'Locked Layer',
          visible: true,
          locked: true,
          opacity: 1,
          objectIds: [],
        },
        [unlockedLayerId]: {
          id: unlockedLayerId,
          name: 'Unlocked Layer',
          visible: true,
          locked: false,
          opacity: 1,
          objectIds: ['rFree'],
        },
        [layerId]: {
          ...doc.layers[layerId]!,
          objectIds: ['rLocked', 'gLocked'],
        },
      },
    };

    // Locked object cannot be moved
    const lockedObjectMove = validateHierarchyMove(doc, ['rLocked'], { type: 'layer', targetLayerId: unlockedLayerId });
    expect(lockedObjectMove.valid).toBe(false);
    expect(lockedObjectMove.reason).toMatch(/locked object/i);

    // Object inside a locked group cannot be moved out
    const lockedGroupMove = validateHierarchyMove(doc, ['rInLockedGroup'], { type: 'layer', targetLayerId: unlockedLayerId });
    expect(lockedGroupMove.valid).toBe(false);
    expect(lockedGroupMove.reason).toMatch(/locked group/i);

    // Cannot drop into a locked layer
    const lockedLayerDrop = validateHierarchyMove(doc, ['rFree'], { type: 'layer', targetLayerId: lockedLayerId });
    expect(lockedLayerDrop.valid).toBe(false);
    expect(lockedLayerDrop.reason).toMatch(/is locked/i);

    // Cannot drop into a locked group
    const lockedGroupDrop = validateHierarchyMove(doc, ['rFree'], { type: 'inside', targetId: 'gLocked' });
    expect(lockedGroupDrop.valid).toBe(false);
    expect(lockedGroupDrop.reason).toMatch(/locked group/i);

    // Cannot reorder relative to an object living in a locked group
    const lockedGroupReorder = validateHierarchyMove(doc, ['rFree'], { type: 'after', targetId: 'rInLockedGroup' });
    expect(lockedGroupReorder.valid).toBe(false);
    expect(lockedGroupReorder.reason).toMatch(/locked group/i);

    // Command must not mutate the document when validation fails
    const rejectedCommand = new MoveHierarchyObjectsCommand(['rLocked'], { type: 'layer', targetLayerId: unlockedLayerId });
    const afterReject = rejectedCommand.execute(doc);
    expect(afterReject).toBe(doc);
  });
});
