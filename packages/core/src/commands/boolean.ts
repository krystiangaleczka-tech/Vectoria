import { generateId } from '@vectoria/shared';
import type { Command } from './command.js';
import type { BooleanOperation, DocumentModel, MaskGroup, ObjectId, PathObject } from '../model/types.js';
import { normalizeObjectPath, previewBoolean } from '../geometry/boolean.js';
import { outlineStroke } from '../geometry/operations.js';
import { isValidPathGeometry } from '../model/path.js';

export class BooleanCommand implements Command {
  readonly type = 'Boolean';
  readonly label: string;
  private before: DocumentModel | null = null;
  private after: DocumentModel | null = null;
  constructor(private readonly operation: BooleanOperation, private readonly objectIds: readonly ObjectId[]) { this.label = `${operation} selection`; }
  execute(doc: DocumentModel): DocumentModel {
    if (this.after) return this.after;
    const preview = previewBoolean(doc, this.operation, this.objectIds);
    if (preview.warnings.length || preview.result.length === 0) return doc;
    const result = replaceObjects(doc, this.objectIds, preview.result);
    if (!result || result === doc) return doc;
    this.before = doc;
    this.after = result;
    return result;
  }
  undo(doc: DocumentModel): DocumentModel { return this.before ?? doc; }
}

export class CompoundPathCommand implements Command {
  readonly type = 'CompoundPath';
  readonly label = 'Create compound path';
  private before: DocumentModel | null = null;
  private after: DocumentModel | null = null;
  constructor(private readonly objectIds: readonly ObjectId[], private readonly fillRule: 'nonzero' | 'evenodd' = 'evenodd') {}
  execute(doc: DocumentModel): DocumentModel {
    if (this.after) return this.after;
    const sources = this.objectIds.map((id) => { const object = doc.objects[id]; return object ? normalizeObjectPath(object) : null; }).filter((object): object is PathObject => Boolean(object));
    if (sources.length !== this.objectIds.length || sources.length < 2) return doc;
    const first = sources[0]!;
    const compound: PathObject = { ...first, name: `${first.name} Compound`, compoundChildren: sources.map((source) => source.nodes), fillRule: this.fillRule };
    const result = replaceObjects(doc, this.objectIds, [compound]);
    if (!result || result === doc) return doc;
    this.before = doc; this.after = result; return result;
  }
  undo(doc: DocumentModel): DocumentModel { return this.before ?? doc; }
}

export class MaskCommand implements Command {
  readonly type = 'Mask';
  readonly label: string;
  private before: DocumentModel | null = null;
  private after: DocumentModel | null = null;
  constructor(private readonly mode: 'clip' | 'opacity', private readonly maskId: ObjectId, private readonly contentIds: readonly ObjectId[], private readonly opacityMode: 'alpha' | 'luminance' = 'alpha') { this.label = `${mode} mask`; }
  execute(doc: DocumentModel): DocumentModel {
    if (this.after) return this.after;
    if (!doc.objects[this.maskId] || this.contentIds.length === 0 || this.contentIds.some((id) => !doc.objects[id] || id === this.maskId)) return doc;
    const group: MaskGroup = { id: generateId(), mode: this.mode, maskId: this.maskId, contentIds: [...this.contentIds], opacityMode: this.mode === 'opacity' ? this.opacityMode : undefined };
    const result = { ...doc, maskGroups: { ...(doc.maskGroups ?? {}), [group.id]: group }, updatedAt: new Date().toISOString() };
    this.before = doc; this.after = result; return result;
  }
  undo(doc: DocumentModel): DocumentModel { return this.before ?? doc; }
}

/** Mutate one mask group's content list as a single undoable step. */
export class UpdateMaskContentCommand implements Command {
  readonly type: 'AddMaskContent' | 'RemoveMaskContent';
  readonly label = 'Update mask content';
  private previous: readonly ObjectId[] | null = null;
  constructor(private readonly groupId: string, private readonly objectIds: readonly ObjectId[], private readonly action: 'add' | 'remove') {
    this.type = action === 'add' ? 'AddMaskContent' : 'RemoveMaskContent';
  }
  execute(doc: DocumentModel): DocumentModel {
    const group = doc.maskGroups?.[this.groupId];
    if (!group) return doc;
    if (this.objectIds.some((id) => !doc.objects[id])) return doc;
    if (this.action === 'add' && this.objectIds.some((id) => id === group.maskId || group.contentIds.includes(id))) return doc;
    if (this.action === 'remove' && this.objectIds.some((id) => !group.contentIds.includes(id))) return doc;
    this.previous = group.contentIds;
    const next = this.action === 'add'
      ? [...group.contentIds, ...this.objectIds.filter((id) => !group.contentIds.includes(id))]
      : group.contentIds.filter((id) => !this.objectIds.includes(id));
    return { ...doc, maskGroups: { ...doc.maskGroups, [this.groupId]: { ...group, contentIds: next } }, updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel {
    const group = doc.maskGroups?.[this.groupId];
    if (!group || !this.previous) return doc;
    return { ...doc, maskGroups: { ...doc.maskGroups, [this.groupId]: { ...group, contentIds: [...this.previous] } }, updatedAt: new Date().toISOString() };
  }
}

/**
 * Destructively bake appearance into geometry. Currently expands variable
 * width profiles into outlined fills; other effects have no representation
 * yet and pass through unchanged.
 */
export class ExpandAppearanceCommand implements Command {
  readonly type = 'ExpandAppearance';
  readonly label = 'Expand appearance';
  private before: DocumentModel | null = null;
  private after: DocumentModel | null = null;
  constructor(private readonly objectIds: readonly ObjectId[]) {}
  execute(doc: DocumentModel): DocumentModel {
    if (this.after) return this.after;
    const objects = { ...doc.objects };
    let changed = false;
    for (const id of this.objectIds) {
      const object = objects[id];
      if (!object || object.type !== 'path' || !object.widthProfile || !object.style.stroke) continue;
      const outline = outlineStroke(object, object.style.stroke);
      if (!outline.path) continue;
      objects[id] = { ...outline.path, name: `${object.name} expanded`, widthProfile: undefined };
      changed = true;
    }
    if (!changed) return doc;
    this.before = doc;
    this.after = { ...doc, objects, updatedAt: new Date().toISOString() };
    return this.after;
  }
  undo(doc: DocumentModel): DocumentModel { return this.before ?? doc; }
}

function replaceObjects(doc: DocumentModel, ids: readonly ObjectId[], result: readonly PathObject[]): DocumentModel | null {
  const source = doc.objects[ids[0]!];
  if (!source || result.some((object) => !isValidPathGeometry(object.nodes, object.closed))) return null;
  const removed = new Set(ids);
  const objects = { ...doc.objects };
  ids.forEach((id) => delete objects[id]);
  result.forEach((object) => { objects[object.id] = object; });
  const layer = doc.layers[source.layerId];
  if (!layer || ids.some((id) => doc.objects[id]?.layerId !== source.layerId)) return null;
  const firstIndex = Math.min(...ids.map((id) => layer.objectIds.indexOf(id)).filter((index) => index >= 0));
  const objectIds = layer.objectIds.filter((id) => !removed.has(id));
  objectIds.splice(firstIndex < 0 ? objectIds.length : firstIndex, 0, ...result.map((object) => object.id));
  return { ...doc, objects, layers: { ...doc.layers, [source.layerId]: { ...layer, objectIds } }, updatedAt: new Date().toISOString() };
}
