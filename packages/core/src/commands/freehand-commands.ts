import { generateId } from '@vectoria/shared';
import type { Command } from './command.js';
import type { DocumentModel, ObjectId, PathObject, PathNode, WidthPoint } from '../model/types.js';
import {
  flattenPath,
  freehandSamplesToPathNodes,
  normalizeWidthProfile,
  simplifyPolyline,
  smoothPolyline,
  widthProfileFromSamples,
  type FreehandSample,
} from '../model/freehand.js';
import { createPathNode, isValidPathGeometry } from '../model/path.js';

/** Add one completed freehand path as one history entry. */
export class CreateFreehandPathCommand implements Command {
  readonly type = 'CreateFreehandPath';
  readonly description: string;
  private previousUpdatedAt: string | null = null;

  constructor(private readonly path: PathObject) {
    this.description = path.name.startsWith('Brush') ? 'Create brush stroke' : 'Create pencil path';
  }

  execute(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.path.layerId];
    if (!layer || layer.locked || doc.objects[this.path.id] || !isValidPathGeometry(this.path.nodes, this.path.closed)) return doc;
    this.previousUpdatedAt = doc.updatedAt;
    return {
      ...doc,
      objects: { ...doc.objects, [this.path.id]: this.path },
      layers: { ...doc.layers, [layer.id]: { ...layer, objectIds: [...layer.objectIds, this.path.id] } },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.path.layerId];
    if (!layer || !doc.objects[this.path.id]) return doc;
    const objects = { ...doc.objects };
    delete objects[this.path.id];
    return {
      ...doc,
      objects,
      layers: { ...doc.layers, [layer.id]: { ...layer, objectIds: layer.objectIds.filter((id) => id !== this.path.id) } },
      updatedAt: this.previousUpdatedAt ?? doc.updatedAt,
    };
  }
}

/** Replace path geometry while retaining object identity, style and layer ownership. */
export class UpdatePathOperationCommand implements Command {
  readonly type = 'UpdatePathOperation';
  readonly description: string;
  private previous: PathObject | null = null;
  private previousUpdatedAt: string | null = null;

  constructor(private readonly objectId: ObjectId, private readonly nodes: readonly PathNode[], private readonly closed: boolean, label: string) {
    this.description = label;
  }

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || object.locked || !isValidPathGeometry(this.nodes, this.closed)) return doc;
    this.previous = object;
    this.previousUpdatedAt = doc.updatedAt;
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...object, nodes: this.nodes, closed: this.closed } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, objects: { ...doc.objects, [this.objectId]: this.previous }, updatedAt: this.previousUpdatedAt ?? doc.updatedAt } : doc;
  }
}

export class UpdatePathCommand extends UpdatePathOperationCommand {}

/** Smooth an existing path deterministically and make one undoable operation. */
export class SmoothPathCommand extends UpdatePathOperationCommand {
  constructor(objectId: ObjectId, amount = 50, doc?: DocumentModel) {
    const object = doc?.objects[objectId];
    const nodes = object?.type === 'path' ? smoothPathNodes(object, amount) : [];
    super(objectId, nodes, object?.type === 'path' ? object.closed : false, 'Smooth path');
  }
}

/** Simplify an existing path while preserving endpoints and path validity. */
export class SimplifyPathCommand extends UpdatePathOperationCommand {
  constructor(objectId: ObjectId, accuracy = 75, doc?: DocumentModel) {
    const object = doc?.objects[objectId];
    const nodes = object?.type === 'path' ? simplifyPathNodes(object, accuracy) : [];
    super(objectId, nodes, object?.type === 'path' ? object.closed : false, 'Simplify path');
  }
}

/** Apply normalized local width points to a brush stroke as one command. */
export class SetPathWidthCommand implements Command {
  readonly type = 'SetPathWidth';
  readonly description = 'Change stroke width';
  private previous: { widthProfile?: readonly WidthPoint[]; width: number } | null = null;
  private previousUpdatedAt: string | null = null;

  constructor(private readonly objectId: ObjectId, private readonly points: readonly WidthPoint[], private readonly fallbackWidth?: number) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || object.locked) return doc;
    const width = this.fallbackWidth ?? object.style.stroke?.width ?? 1;
    if (!Number.isFinite(width) || width <= 0) return doc;
    this.previous = { widthProfile: object.widthProfile, width: object.style.stroke?.width ?? width };
    this.previousUpdatedAt = doc.updatedAt;
    const profile = normalizeWidthProfile(this.points, width);
    return {
      ...doc,
      objects: {
        ...doc.objects,
        [object.id]: {
          ...object,
          widthProfile: profile,
          style: object.style.stroke ? { ...object.style, stroke: { ...object.style.stroke, width } } : object.style,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || !this.previous) return doc;
    const style = object.style.stroke ? { ...object.style, stroke: { ...object.style.stroke, width: this.previous.width } } : object.style;
    const restored = this.previous.widthProfile === undefined
      ? (() => { const { widthProfile: ignoredWidthProfile, ...withoutProfile } = object; void ignoredWidthProfile; return { ...withoutProfile, style }; })()
      : { ...object, style, widthProfile: this.previous.widthProfile };
    return { ...doc, objects: { ...doc.objects, [object.id]: restored }, updatedAt: this.previousUpdatedAt ?? doc.updatedAt };
  }
}

/** Replace one path with cut fragments while preserving exact undo state. */
export class ReplacePathWithFragmentsCommand implements Command {
  readonly type = 'ReplacePathWithFragments';
  readonly description: string;
  private original: PathObject | null = null;
  private fragmentIds: readonly ObjectId[] = [];
  private originalIndex = -1;
  private previousUpdatedAt: string | null = null;

  constructor(private readonly objectId: ObjectId, private readonly fragments: readonly PathObject[], label = 'Cut path') {
    this.description = label;
  }

  execute(doc: DocumentModel): DocumentModel {
    const original = doc.objects[this.objectId];
    const layer = original ? doc.layers[original.layerId] : undefined;
    const fragmentIds = new Set(this.fragments.map((fragment) => fragment.id));
    if (original?.type !== 'path' || original.locked || !layer || fragmentIds.size !== this.fragments.length || this.fragments.some((fragment) => fragment.id === original.id || doc.objects[fragment.id] || fragment.layerId !== original.layerId || !isValidPathGeometry(fragment.nodes, fragment.closed))) return doc;
    this.original = original;
    this.previousUpdatedAt = doc.updatedAt;
    this.fragmentIds = this.fragments.map((fragment) => fragment.id);
    this.originalIndex = layer.objectIds.indexOf(original.id);
    const objects = { ...doc.objects };
    delete objects[original.id];
    for (const fragment of this.fragments) objects[fragment.id] = fragment;
    const objectIds = layer.objectIds.flatMap((id) => id === original.id ? this.fragments.map((fragment) => fragment.id) : [id]);
    return { ...doc, objects, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.original) return doc;
    const objects = { ...doc.objects, [this.original.id]: this.original };
    for (const id of this.fragmentIds) delete objects[id];
    const layer = doc.layers[this.original.layerId];
    if (!layer) return doc;
    const objectIds = layer.objectIds.filter((id) => !this.fragmentIds.includes(id));
    objectIds.splice(Math.max(0, Math.min(this.originalIndex, objectIds.length)), 0, this.original.id);
    return { ...doc, objects, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds } }, updatedAt: this.previousUpdatedAt ?? doc.updatedAt };
  }
}

export class KnifePathCommand extends ReplacePathWithFragmentsCommand {
  constructor(objectId: ObjectId, fragments: readonly PathObject[]) {
    super(objectId, fragments, 'Knife cut');
  }
}

export class EraserPathCommand extends ReplacePathWithFragmentsCommand {
  constructor(objectId: ObjectId, fragments: readonly PathObject[]) {
    super(objectId, fragments, 'Erase path');
  }
}

export class ScissorsPathCommand extends ReplacePathWithFragmentsCommand {
  constructor(objectId: ObjectId, fragments: readonly PathObject[]) {
    super(objectId, fragments, 'Scissors split');
  }
}

export class CutPathCommand extends ReplacePathWithFragmentsCommand {}

function smoothPathNodes(path: PathObject, amount: number): PathNode[] {
  const points = withoutClosingDuplicate(smoothPolyline(flattenPath(path), amount), path.closed);
  return pointsToNodes(points, path.closed);
}

/** Reduce a path to fewer corner nodes; shared by the command and the preview session. */
export function simplifyPathNodes(path: PathObject, accuracy: number): PathNode[] {
  const tolerance = Math.max(0.05, (100 - Math.min(100, Math.max(0, accuracy))) * 0.08);
  return pointsToNodes(simplifyPolyline(withoutClosingDuplicate(flattenPath(path), path.closed), tolerance), path.closed);
}

function withoutClosingDuplicate(points: readonly { x: number; y: number }[], closed: boolean): { x: number; y: number }[] {
  if (!closed || points.length < 2) return [...points];
  const first = points[0]!;
  const last = points.at(-1)!;
  return first.x === last.x && first.y === last.y ? points.slice(0, -1) : [...points];
}

function pointsToNodes(points: readonly { x: number; y: number }[], closed: boolean): PathNode[] {
  const nodes = points.map((point) => createPathNode(point, { kind: 'corner' }));
  if (closed && nodes.length > 2) return nodes;
  return nodes.length >= 2 ? nodes : [];
}

/** Build a path object from sampled input without mutating the document. */
export function createFreehandPath(
  samples: readonly FreehandSample[],
  options: { id?: string; name?: string; layerId: string; smoothing?: number; width?: number; widthProfile?: readonly WidthPoint[]; samples?: readonly FreehandSample[]; style: PathObject['style'] },
): PathObject | null {
  const nodes = freehandSamplesToPathNodes(samples, options.smoothing ?? 0);
  if (!isValidPathGeometry(nodes, false)) return null;
  return {
    type: 'path',
    id: options.id ?? generateId(),
    name: options.name ?? 'Freehand path',
    layerId: options.layerId,
    visible: true,
    locked: false,
    transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
    style: options.style,
    nodes,
    closed: false,
    ...((options.widthProfile ?? options.samples) ? { widthProfile: normalizeWidthProfile(options.widthProfile ?? widthProfileFromSamples(options.samples ?? [], options.width ?? 1), options.width ?? 1) } : {}),
  };
}
