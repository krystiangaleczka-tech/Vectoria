import type { Command, DocumentModel, GeometryPreview, ObjectId, SceneObject } from '@vectoria/core';
import {
  CleanUpCommand,
  ConvertToCurvesCommand,
  CornerPathCommand,
  ExpandAppearanceCommand,
  OffsetPathCommand,
  OutlineStrokeCommand,
  SimplifyPathCommand,
  applyCorners,
  createGeometryPreview,
  expandObject,
  offsetPath,
  outlineStroke,
  simplifyPathNodes,
  type CleanupPlan,
  type CornerOptions,
  type OffsetOptions,
} from '@vectoria/core';

export type GeometrySessionOperation = 'expand' | 'corners' | 'offset' | 'outline-stroke' | 'simplify' | 'expand-appearance' | 'cleanup';

export class GeometryOperationSession {
  private current: { readonly preview: GeometryPreview; readonly command: Command } | null = null;

  constructor(private readonly document: DocumentModel, private readonly objectIds: readonly ObjectId[]) {}

  get preview(): GeometryPreview | null { return this.current?.preview ?? null; }

  previewExpand(): GeometryPreview {
    const proposed = this.objectIds.flatMap((id) => { const object = this.document.objects[id]; const expanded = object ? expandObject(object) : null; return expanded && expanded.type !== object?.type ? [expanded] : []; });
    return this.set('expand', proposed, proposed.length === 0 ? ['No selected object can be converted to curves.'] : [], new ConvertToCurvesCommand(this.objectIds));
  }

  previewCorners(objectId: ObjectId, options: CornerOptions): GeometryPreview {
    const object = this.document.objects[objectId];
    const result = object?.type === 'path' ? applyCorners(object, options) : { path: null, warning: 'Corner operations require a path.' };
    return this.set('corners', result.path ? [result.path] : [], result.warning ? [result.warning] : [], new CornerPathCommand(objectId, options));
  }

  previewOffset(objectId: ObjectId, options: OffsetOptions): GeometryPreview {
    const object = this.document.objects[objectId];
    const result = object?.type === 'path' ? offsetPath(object, options) : { path: null, warning: 'Offset operations require a path.' };
    return this.set('offset', result.path ? [result.path] : [], result.warning ? [result.warning] : [], new OffsetPathCommand(objectId, options));
  }

  previewOutline(objectId: ObjectId): GeometryPreview {
    const object = this.document.objects[objectId];
    const result = object?.style.stroke && object.type === 'path' ? outlineStroke(object, object.style.stroke) : { path: null, warning: 'Outline Stroke requires a stroked path.' };
    return this.set('outline-stroke', result.path ? [result.path] : [], result.warning ? [result.warning] : [], new OutlineStrokeCommand(objectId));
  }

  /** Preview node reduction before committing; accuracy mirrors the command's tolerance. */
  previewSimplify(objectId: ObjectId, accuracy: number): GeometryPreview {
    const object = this.document.objects[objectId];
    if (object?.type !== 'path') {
      return this.set('simplify', [], ['Simplify requires a path.'], new SimplifyPathCommand(objectId, accuracy));
    }
    const nodes = simplifyPathNodes(object, accuracy);
    const proposed: readonly SceneObject[] = nodes.length >= (object.closed ? 3 : 2) && nodes.length < object.nodes.length
      ? [{ ...object, nodes }]
      : [];
    return this.set('simplify', proposed, proposed.length === 0 ? ['Nothing to simplify at this accuracy.'] : [], new SimplifyPathCommand(objectId, accuracy, this.document));
  }

  /**
   * Destructive appearance bake: variable-width strokes become filled
   * outlines. Preview shows the exact geometry Apply would commit.
   */
  previewExpandAppearance(objectId: ObjectId): GeometryPreview {
    const object = this.document.objects[objectId];
    if (object?.type !== 'path' || !object.widthProfile || !object.style.stroke) {
      return this.set('expand-appearance', [], ['Expand Appearance requires a path with a variable width stroke.'], new ExpandAppearanceCommand([objectId]));
    }
    const result = outlineStroke(object, object.style.stroke);
    return this.set(
      'expand-appearance',
      result.path ? [{ ...result.path, name: `${object.name} expanded` }] : [],
      result.warning ? [result.warning] : [],
      new ExpandAppearanceCommand([objectId]),
    );
  }

  previewCleanup(plan: CleanupPlan): GeometryPreview {
    const proposed = plan.findings.filter((finding) => plan.selectedFindingIds.includes(finding.id)).flatMap((finding) => finding.targetIds).map((id) => this.document.objects[id]).filter((object): object is SceneObject => Boolean(object));
    return this.set('cleanup', proposed, plan.findings.length === 0 ? ['Document is clean.'] : [], new CleanUpCommand(plan));
  }

  apply(): Command | null {
    const active = this.current;
    this.current = null;
    return active && active.preview.warnings.length === 0 && active.preview.proposed.length > 0 ? active.command : null;
  }

  cancel(): void { this.current = null; }

  private set(operation: GeometrySessionOperation, proposed: readonly SceneObject[], warnings: readonly string[], command: Command): GeometryPreview {
    const preview = createGeometryPreview(this.document, operation, this.objectIds, proposed, warnings);
    this.current = { preview, command };
    return preview;
  }
}
