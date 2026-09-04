import type { Vec2 } from '@vectoria/shared';
import type { CanvasAnnotation, DocumentModel } from '../model/types.js';
import type { Command } from './command.js';

/**
 * Adds a new canvas annotation to the document model with undo/redo support.
 */
export class AddAnnotationCommand implements Command {
  readonly type = 'add-annotation';
  readonly description = 'Add annotation';

  constructor(readonly annotation: CanvasAnnotation) {}

  execute(doc: DocumentModel): DocumentModel {
    const current = doc.annotations ?? [];
    return {
      ...doc,
      annotations: [...current, this.annotation],
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const current = doc.annotations ?? [];
    return {
      ...doc,
      annotations: current.filter((item) => item.id !== this.annotation.id),
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Updates an existing annotation's body, resolved state, or position.
 */
export class UpdateAnnotationCommand implements Command {
  readonly type = 'update-annotation';
  readonly description = 'Update annotation';
  private previousAnnotation?: CanvasAnnotation;

  constructor(
    readonly annotationId: string,
    readonly patch: Partial<Pick<CanvasAnnotation, 'body' | 'resolved' | 'worldPoint' | 'mentions'>>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const current = doc.annotations ?? [];
    const target = current.find((item) => item.id === this.annotationId);
    if (!target) return doc;

    this.previousAnnotation = target;
    const updated: CanvasAnnotation = {
      ...target,
      ...this.patch,
      updatedAt: new Date().toISOString(),
    };

    return {
      ...doc,
      annotations: current.map((item) => (item.id === this.annotationId ? updated : item)),
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previousAnnotation) return doc;
    const current = doc.annotations ?? [];
    return {
      ...doc,
      annotations: current.map((item) => (item.id === this.annotationId ? this.previousAnnotation! : item)),
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Deletes a canvas annotation, preserving the original record for undo restoration.
 */
export class DeleteAnnotationCommand implements Command {
  readonly type = 'delete-annotation';
  readonly description = 'Delete annotation';
  private deletedAnnotation?: CanvasAnnotation;

  constructor(readonly annotationId: string) {}

  execute(doc: DocumentModel): DocumentModel {
    const current = doc.annotations ?? [];
    const target = current.find((item) => item.id === this.annotationId);
    if (!target) return doc;

    this.deletedAnnotation = target;
    return {
      ...doc,
      annotations: current.filter((item) => item.id !== this.annotationId),
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.deletedAnnotation) return doc;
    const current = doc.annotations ?? [];
    return {
      ...doc,
      annotations: [...current, this.deletedAnnotation],
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Moves an annotation pin to a new world coordinate upon pointerup.
 */
export class MoveAnnotationPinCommand implements Command {
  readonly type = 'move-annotation-pin';
  readonly description = 'Move annotation pin';
  private previousWorldPoint?: Vec2;

  constructor(
    readonly annotationId: string,
    readonly newWorldPoint: Vec2,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const current = doc.annotations ?? [];
    const target = current.find((item) => item.id === this.annotationId);
    if (!target) return doc;

    this.previousWorldPoint = target.worldPoint;
    const updated: CanvasAnnotation = {
      ...target,
      worldPoint: this.newWorldPoint,
      updatedAt: new Date().toISOString(),
    };

    return {
      ...doc,
      annotations: current.map((item) => (item.id === this.annotationId ? updated : item)),
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previousWorldPoint) return doc;
    const current = doc.annotations ?? [];
    const target = current.find((item) => item.id === this.annotationId);
    if (!target) return doc;

    const restored: CanvasAnnotation = {
      ...target,
      worldPoint: this.previousWorldPoint,
      updatedAt: new Date().toISOString(),
    };

    return {
      ...doc,
      annotations: current.map((item) => (item.id === this.annotationId ? restored : item)),
      updatedAt: new Date().toISOString(),
    };
  }
}
