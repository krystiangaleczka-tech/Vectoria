import { generateId } from '@vectoria/shared';
import type { Command } from './command.js';
import type { DocumentModel, LiveEffect, ObjectId, ObjectStyle, SceneObject } from '../model/types.js';
import { expandObject } from '../geometry/operations.js';
import { effectiveGeometry, gridRepeatTransforms, mirrorRepeatTransforms, radialRepeatTransforms } from '../geometry/effects.js';

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function objectBounds(obj: SceneObject): Bounds {
  const corners: Array<[number, number]> = [];
  if (obj.type === 'path') {
    for (const node of obj.nodes) corners.push([node.point.x, node.point.y]);
  } else if ('width' in obj && 'height' in obj) {
    corners.push([0, 0], [obj.width, obj.height]);
  } else {
    corners.push([0, 0], [1, 1]);
  }
  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/** Shared bookkeeping for commands that patch each object's effect stack. */
abstract class EffectStackCommand implements Command {
  abstract readonly type: string;
  abstract readonly description: string;
  protected previous = new Map<ObjectId, ObjectStyle>();

  protected abstract nextEffects(current: readonly LiveEffect[] | undefined, obj: SceneObject): readonly LiveEffect[] | undefined;

  execute(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    this.previous.clear();
    let changed = false;
    for (const [id, object] of Object.entries(doc.objects)) {
      if (object.locked) continue;
      const next = this.nextEffects(object.style.effects, object);
      if (next === object.style.effects) continue;
      this.previous.set(id, object.style);
      objects[id] = { ...object, style: { ...object.style, effects: next } };
      changed = true;
    }
    return changed ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }

  undo(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    for (const [id, style] of this.previous) if (objects[id]) objects[id] = { ...objects[id], style };
    return this.previous.size ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }
}

export class AddEffectCommand extends EffectStackCommand {
  readonly type = 'AddEffect';
  readonly description: string;
  constructor(private readonly objectIds: readonly ObjectId[], private readonly effect: LiveEffect) {
    super();
    this.description = `Add ${effect.type} effect`;
  }
  protected nextEffects(current: readonly LiveEffect[] | undefined, obj: SceneObject): readonly LiveEffect[] | undefined {
    if (!this.objectIds.includes(obj.id)) return current;
    return [...(current ?? []), this.effect];
  }
}

export class UpdateEffectCommand extends EffectStackCommand {
  readonly type = 'UpdateEffect';
  readonly description: string;
  constructor(private readonly objectIds: readonly ObjectId[], private readonly effectId: string, private readonly patch: Partial<LiveEffect>) {
    super();
    this.description = 'Update effect';
  }
  protected nextEffects(current: readonly LiveEffect[] | undefined, obj: SceneObject): readonly LiveEffect[] | undefined {
    if (!current || !this.objectIds.includes(obj.id)) return current;
    let changed = false;
    const next = current.map((effect) => {
      if (effect.id !== this.effectId) return effect;
      changed = true;
      return { ...effect, ...this.patch, id: effect.id, type: effect.type } as LiveEffect;
    });
    return changed ? next : current;
  }
}

export class RemoveEffectCommand extends EffectStackCommand {
  readonly type = 'RemoveEffect';
  readonly description: string;
  constructor(private readonly objectIds: readonly ObjectId[], private readonly effectId: string) {
    super();
    this.description = 'Remove effect';
  }
  protected nextEffects(current: readonly LiveEffect[] | undefined, obj: SceneObject): readonly LiveEffect[] | undefined {
    if (!current || !this.objectIds.includes(obj.id)) return current;
    const next = current.filter((effect) => effect.id !== this.effectId);
    return next.length === current.length ? current : (next.length > 0 ? next : undefined);
  }
}

export class ReorderEffectsCommand extends EffectStackCommand {
  readonly type = 'ReorderEffects';
  readonly description = 'Reorder effects';
  constructor(private readonly objectIds: readonly ObjectId[], private readonly fromIndex: number, private readonly toIndex: number) {
    super();
  }
  protected nextEffects(current: readonly LiveEffect[] | undefined, obj: SceneObject): readonly LiveEffect[] | undefined {
    if (!current || !this.objectIds.includes(obj.id)) return current;
    if (this.fromIndex < 0 || this.toIndex < 0 || this.fromIndex >= current.length || this.toIndex >= current.length) return current;
    const next = [...current];
    const [moved] = next.splice(this.fromIndex, 1);
    next.splice(this.toIndex, 0, moved!);
    return next;
  }
}

export class ToggleEffectCommand extends EffectStackCommand {
  readonly type = 'ToggleEffect';
  readonly description: string;
  constructor(private readonly objectIds: readonly ObjectId[], private readonly effectId: string, private readonly visible: boolean) {
    super();
    this.description = visible ? 'Enable effect' : 'Disable effect';
  }
  protected nextEffects(current: readonly LiveEffect[] | undefined, obj: SceneObject): readonly LiveEffect[] | undefined {
    if (!current || !this.objectIds.includes(obj.id)) return current;
    let changed = false;
    const next = current.map((effect) => {
      if (effect.id !== this.effectId || effect.visible === this.visible) return effect;
      changed = true;
      return { ...effect, visible: this.visible } as LiveEffect;
    });
    return changed ? next : current;
  }
}

function darkenColor(color: string, factor: number): string {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return color;
  const r = Math.max(0, Math.round(parseInt(hex.slice(0, 2), 16) * factor));
  const g = Math.max(0, Math.round(parseInt(hex.slice(2, 4), 16) * factor));
  const b = Math.max(0, Math.round(parseInt(hex.slice(4, 6), 16) * factor));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

const GEOMETRY_EFFECT_TYPES: readonly string[] = ['roundedCorners', 'distort', 'envelope', 'perspective'];
const REPEAT_EFFECT_TYPES: readonly string[] = ['radialRepeat', 'mirrorRepeat', 'gridRepeat'];

/**
 * Expand (FX-029): bake geometry effects into path data, materialize repeats
 * as real grouped copies and materialize extrude as shaded copies. Raster
 * effects are left in place — they have no vector representation. One command,
 * full undo restores the live effect stack.
 */
export class ExpandLiveEffectCommand implements Command {
  readonly type = 'ExpandLiveEffect';
  readonly description = 'Expand live effect';
  private before: DocumentModel | null = null;
  private after: DocumentModel | null = null;
  private pendingLayers: DocumentModel['layers'] | null = null;

  constructor(private readonly objectIds: readonly ObjectId[]) {}

  execute(doc: DocumentModel): DocumentModel {
    if (this.after) return this.after;
    const objects = { ...doc.objects };
    let changed = false;
    for (const id of this.objectIds) {
      const object = doc.objects[id];
      if (!object || object.locked) continue;
      const effects = object.style.effects ?? [];
      const hasGeometry = effects.some((effect) => effect.visible && GEOMETRY_EFFECT_TYPES.includes(effect.type));
      const hasRepeat = effects.some((effect) => effect.visible && REPEAT_EFFECT_TYPES.includes(effect.type));
      const hasExtrude = effects.some((effect) => effect.visible && effect.type === 'extrude');
      if (!hasGeometry && !hasRepeat && !hasExtrude) continue;

      const path = effectiveGeometry(object, expandObject);
      if (!path) continue;
      const remaining = effects.filter((effect) => !effect.visible || (!GEOMETRY_EFFECT_TYPES.includes(effect.type) && !REPEAT_EFFECT_TYPES.includes(effect.type) && effect.type !== 'extrude'));

      if (!hasRepeat && !hasExtrude) {
        objects[id] = { ...path, id, name: `${object.name} expanded`, style: { ...path.style, effects: remaining.length > 0 ? remaining : undefined } };
        changed = true;
        continue;
      }

      // Materialize instances as real objects inside a group.
      const bounds = objectBounds(path);
      const localTransforms: { position: { x: number; y: number }; rotation: number; scale: { x: number; y: number } }[] = [];
      for (const effect of effects) {
        if (!effect.visible) continue;
        if (effect.type === 'radialRepeat') localTransforms.push(...radialRepeatTransforms(bounds, effect.count, effect.radius, effect.startAngle).map((t) => ({ position: t.position, rotation: t.rotation, scale: t.scale })));
        else if (effect.type === 'mirrorRepeat') localTransforms.push(...mirrorRepeatTransforms(bounds, effect.axis, effect.offset).map((t) => ({ position: t.position, rotation: t.rotation, scale: t.scale })));
        else if (effect.type === 'gridRepeat') localTransforms.push(...gridRepeatTransforms(effect.rows, effect.columns, effect.spacingX, effect.spacingY).map((t) => ({ position: t.position, rotation: t.rotation, scale: t.scale })));
        else if (effect.type === 'extrude') {
          const dir = { x: Math.cos(effect.angle), y: Math.sin(effect.angle) };
          const stepDepth = effect.depth / effect.steps;
          for (let step = effect.steps; step >= 1; step -= 1) localTransforms.push({ position: { x: dir.x * stepDepth * step, y: dir.y * stepDepth * step }, rotation: 0, scale: { x: 1, y: 1 } });
        }
      }
      if (localTransforms.length === 0) {
        objects[id] = { ...path, id, name: `${object.name} expanded`, style: { ...path.style, effects: remaining.length > 0 ? remaining : undefined } };
        changed = true;
        continue;
      }

      const childIds: ObjectId[] = [];
      const nextObjects = { ...objects };
      const baseFill = path.style.fill;
      for (let index = 0; index < localTransforms.length; index += 1) {
        const transform = localTransforms[index]!;
        const isTop = index === localTransforms.length - 1;
        const childId = generateId();
        const shadedStyle = isTop
          ? path.style
          : {
              ...path.style,
              fill: baseFill.type === 'solid' ? { type: 'solid' as const, color: darkenColor(baseFill.color, 0.55 + 0.45 * (index / localTransforms.length)) } : baseFill,
              stroke: null,
              effects: undefined,
            };
        nextObjects[childId] = {
          ...path, id: childId, style: shadedStyle, brush: undefined,
          transform: { position: transform.position, rotation: transform.rotation, scale: transform.scale, pivot: { x: 0, y: 0 } },
        };
        childIds.push(childId);
      }
      const groupId = generateId();
      nextObjects[groupId] = {
        id: groupId, name: `${object.name} expanded`, layerId: object.layerId, visible: object.visible, locked: object.locked,
        transform: object.transform, style: { fill: { type: 'none' }, stroke: null, opacity: 1, blendMode: 'normal' }, childIds, type: 'group',
      };
      delete nextObjects[id];
      let layers = doc.layers;
      const layer = doc.layers[object.layerId];
      if (layer) {
        layers = { ...doc.layers, [object.layerId]: { ...layer, objectIds: layer.objectIds.map((oid) => (oid === id ? groupId : oid)) } };
      }
      Object.assign(objects, nextObjects);
      delete objects[id];
      this.pendingLayers = layers;
      changed = true;
    }
    if (!changed) return doc;
    this.before = doc;
    this.after = { ...doc, objects, layers: this.pendingLayers ?? doc.layers, updatedAt: new Date().toISOString() };
    this.pendingLayers = null;
    return this.after;
  }

  undo(doc: DocumentModel): DocumentModel { return this.before ?? doc; }
}
