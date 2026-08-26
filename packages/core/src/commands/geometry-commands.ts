import type { Command } from './command.js';
import type { DocumentModel, ObjectId, PathObject, SceneObject } from '../model/types.js';
import { applyCorners, expandObject, offsetPath, outlineStroke, type CleanupPlan, type CornerOptions, type OffsetOptions } from '../geometry/operations.js';
import { isValidPathGeometry, reversePathNodes } from '../model/path.js';

interface PreviousObject {
  readonly id: ObjectId;
  readonly object: SceneObject;
}

abstract class ReplaceObjectCommand implements Command {
  abstract readonly type: string;
  abstract readonly description: string;
  protected previous: PreviousObject[] = [];

  protected replace(doc: DocumentModel, replacements: readonly SceneObject[]): DocumentModel {
    if (replacements.length === 0) return doc;
    const previous: PreviousObject[] = [];
    for (const replacement of replacements) {
      const object = doc.objects[replacement.id];
      if (!object || object.locked || object.layerId !== replacement.layerId) return doc;
      previous.push({ id: replacement.id, object });
    }
    const objects = { ...doc.objects };
    this.previous = previous;
    for (const replacement of replacements) {
      objects[replacement.id] = replacement;
    }
    return { ...doc, objects, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.previous.length === 0) return doc;
    const objects = { ...doc.objects };
    for (const item of this.previous) objects[item.id] = item.object;
    return { ...doc, objects, updatedAt: new Date().toISOString() };
  }

  abstract execute(doc: DocumentModel): DocumentModel;
}

export class ConvertToCurvesCommand extends ReplaceObjectCommand {
  readonly type = 'ConvertToCurves';
  readonly description = 'Convert to curves';

  constructor(private readonly objectIds: readonly ObjectId[]) { super(); }

  execute(doc: DocumentModel): DocumentModel {
    const replacements: SceneObject[] = [];
    for (const id of this.objectIds) {
      const object = doc.objects[id];
      const converted = object ? expandObject(object) : null;
      if (converted && converted.type !== object?.type) replacements.push(converted);
    }
    return this.replace(doc, replacements);
  }
}

export class CornerPathCommand extends ReplaceObjectCommand {
  readonly type = 'CornerPath';
  readonly description = 'Edit corners';

  constructor(private readonly objectId: ObjectId, private readonly options: CornerOptions) { super(); }

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path') return doc;
    const result = applyCorners(object, this.options);
    return result.path ? this.replace(doc, [result.path]) : doc;
  }
}

export class OffsetPathCommand extends ReplaceObjectCommand {
  readonly type = 'OffsetPath';
  readonly description: string;

  constructor(private readonly objectId: ObjectId, private readonly options: OffsetOptions) {
    super();
    this.description = options.direction === 'inside' ? 'Offset path inward' : 'Offset path outward';
  }

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path') return doc;
    const result = offsetPath(object, this.options);
    return result.path ? this.replace(doc, [result.path]) : doc;
  }
}

export class OutlineStrokeCommand extends ReplaceObjectCommand {
  readonly type = 'OutlineStroke';
  readonly description = 'Outline stroke';

  constructor(private readonly objectId: ObjectId) { super(); }

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (!object || !object.style.stroke) return doc;
    const path = object.type === 'path'
      ? object
      : expandObject(object);
    if (!path || path.type !== 'path') return doc;
    const result = outlineStroke(path, object.style.stroke);
    return result.path ? this.replace(doc, [{ ...result.path, id: object.id, layerId: object.layerId, name: object.name }]) : doc;
  }
}

export class ClosePathCommand extends ReplaceObjectCommand {
  readonly type = 'ClosePath';
  readonly description = 'Close path';

  constructor(private readonly objectId: ObjectId) { super(); }

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || object.closed || object.nodes.length < 3 || !isValidPathGeometry(object.nodes, true)) return doc;
    return this.replace(doc, [{ ...object, closed: true }]);
  }
}

export class ReversePathDirectionCommand extends ReplaceObjectCommand {
  readonly type = 'ReversePathDirection';
  readonly description = 'Reverse path direction';

  constructor(private readonly objectId: ObjectId) { super(); }

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path') return doc;
    return this.replace(doc, [{ ...object, nodes: reversePathNodes(object.nodes) }]);
  }
}

export class JoinPathsCommand implements Command {
  readonly type = 'JoinPaths';
  readonly description = 'Join paths';
  private previous: { first: PathObject; second: PathObject; index: number } | null = null;

  constructor(private readonly firstId: ObjectId, private readonly secondId: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const first = doc.objects[this.firstId];
    const second = doc.objects[this.secondId];
    const layer = first ? doc.layers[first.layerId] : undefined;
    if (first?.type !== 'path' || second?.type !== 'path' || first.closed || second.closed || first.layerId !== second.layerId || !layer || first.locked || second.locked) return doc;
    const candidates = [
      { first: first.nodes, second: second.nodes },
      { first: first.nodes, second: reversePathNodes(second.nodes) },
      { first: reversePathNodes(first.nodes), second: second.nodes },
      { first: reversePathNodes(first.nodes), second: reversePathNodes(second.nodes) },
    ];
    const best = candidates.reduce((winner, candidate) => {
      const distance = pointDistance(candidate.first.at(-1)!.point, candidate.second[0]!.point);
      return !winner || distance < winner.distance ? { ...candidate, distance } : winner;
    }, null as ({ first: readonly PathObject['nodes'][number][]; second: readonly PathObject['nodes'][number][]; distance: number } | null));
    if (!best || best.distance > 1e-4) return doc;
    const nodes = best.first.concat(best.second.slice(1));
    if (!isValidPathGeometry(nodes, false)) return doc;
    this.previous = { first, second, index: layer.objectIds.indexOf(second.id) };
    const objects = { ...doc.objects, [first.id]: { ...first, nodes } };
    delete objects[second.id];
    return { ...doc, objects, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds: layer.objectIds.filter((id) => id !== second.id) } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const layer = doc.layers[this.previous.first.layerId];
    if (!layer) return doc;
    const objectIds = [...layer.objectIds];
    objectIds.splice(Math.max(0, this.previous.index), 0, this.previous.second.id);
    return { ...doc, objects: { ...doc.objects, [this.previous.first.id]: this.previous.first, [this.previous.second.id]: this.previous.second }, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds } }, updatedAt: new Date().toISOString() };
  }
}

interface DeletedCleanupObject {
  readonly object: SceneObject;
  readonly index: number;
}

export class CleanUpCommand implements Command {
  readonly type = 'CleanUp';
  readonly description = 'Clean up document';
  private deleted: { layerId: string; objects: DeletedCleanupObject[] }[] = [];
  private previousStyles: readonly import('../model/types.js').SavedObjectStyle[] | null = null;

  constructor(private readonly plan: CleanupPlan) {}

  execute(doc: DocumentModel): DocumentModel {
    const selected = new Set(this.plan.selectedFindingIds);
    const targetIds = new Set(this.plan.findings.filter((finding) => selected.has(finding.id)).flatMap((finding) => finding.targetIds));
    if (targetIds.size === 0) return doc;
    // Style findings use a "style:" prefix and prune doc.objectStyles instead
    // of touching scene objects.
    const styleTargets = new Set([...targetIds].filter((id) => id.startsWith('style:')).map((id) => id.slice('style:'.length)));
    for (const id of styleTargets) targetIds.delete(`style:${id}`);
    const objects = { ...doc.objects };
    const layers = { ...doc.layers };
    this.deleted = [];
    this.previousStyles = null;
    let nextStyles = doc.objectStyles;
    if (styleTargets.size > 0 && nextStyles) {
      const filtered = nextStyles.filter((saved) => !styleTargets.has(saved.id));
      if (filtered.length !== nextStyles.length) {
        this.previousStyles = nextStyles;
        nextStyles = filtered;
      }
    }
    for (const layerId of doc.layerIds) {
      const layer = doc.layers[layerId];
      if (!layer || layer.locked) continue;
      const deleted = layer.objectIds.flatMap((id, index) => {
        if (!targetIds.has(id)) return [];
        const object = doc.objects[id];
        if (!object || object.locked) return [];
        delete objects[id];
        return [{ object, index }];
      });
      if (deleted.length > 0) {
        this.deleted.push({ layerId, objects: deleted });
        layers[layerId] = { ...layer, objectIds: layer.objectIds.filter((id) => !targetIds.has(id)) };
      }
    }
    if (this.deleted.length === 0 && this.previousStyles === null) return doc;
    return { ...doc, objects, layers, ...(this.previousStyles ? { objectStyles: nextStyles } : {}), updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.deleted.length === 0 && this.previousStyles === null) return doc;
    const objects = { ...doc.objects };
    const layers = { ...doc.layers };
    for (const group of this.deleted) {
      const layer = layers[group.layerId];
      if (!layer) continue;
      const ids = [...layer.objectIds];
      for (const item of [...group.objects].reverse()) {
        objects[item.object.id] = item.object;
        ids.splice(Math.min(item.index, ids.length), 0, item.object.id);
      }
      layers[group.layerId] = { ...layer, objectIds: ids };
    }
    return { ...doc, objects, layers, ...(this.previousStyles ? { objectStyles: this.previousStyles } : {}), updatedAt: new Date().toISOString() };
  }
}

function pointDistance(first: { x: number; y: number }, second: { x: number; y: number }): number { return Math.hypot(first.x - second.x, first.y - second.y); }
