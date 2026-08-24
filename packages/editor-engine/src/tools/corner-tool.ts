import type { Command, DocumentModel, GeometryPreview, ObjectId } from '@vectoria/core';
import { CornerPathCommand, applyCorners, createGeometryPreview, type CornerMode } from '@vectoria/core';

export interface CornerToolPreview extends GeometryPreview {
  readonly radius: number;
  readonly mode: CornerMode;
}

export class CornerTool {
  private document: DocumentModel | null = null;
  private objectId: ObjectId | null = null;
  private current: CornerToolPreview | null = null;

  start(document: DocumentModel, objectId: ObjectId, mode: CornerMode = 'rounded'): CornerToolPreview | null {
    const object = document.objects[objectId];
    if (object?.type !== 'path') return null;
    this.document = document;
    this.objectId = objectId;
    return this.update(0, mode);
  }

  update(radius: number, mode = this.current?.mode ?? 'rounded'): CornerToolPreview | null {
    const object = this.objectId && this.document?.objects[this.objectId];
    if (!object || object.type !== 'path') return null;
    const result = applyCorners(object, { radius, mode });
    const preview = createGeometryPreview(this.document!, 'corners', [object.id], result.path ? [result.path] : [], result.warning ? [result.warning] : []) as CornerToolPreview;
    this.current = { ...preview, radius, mode };
    return this.current;
  }

  get preview(): CornerToolPreview | null { return this.current; }

  apply(): Command | null {
    if (!this.objectId || !this.current || this.current.radius <= 0 || this.current.warnings.length > 0 || this.current.proposed.length === 0) return null;
    const command = new CornerPathCommand(this.objectId, { radius: this.current.radius, mode: this.current.mode });
    this.cancel();
    return command;
  }

  cancel(): void {
    this.document = null;
    this.objectId = null;
    this.current = null;
  }
}
