import type { BooleanOperation, BooleanPreview, Command, DocumentModel, ObjectId } from '@vectoria/core';
import { BooleanCommand, CompoundPathCommand, MaskCommand, previewBoolean } from '@vectoria/core';

export class BooleanOperationSession {
  private current: { preview: BooleanPreview; command: Command } | null = null;
  constructor(private readonly document: DocumentModel, private readonly objectIds: readonly ObjectId[]) {}
  get preview(): BooleanPreview | null { return this.current?.preview ?? null; }
  previewBoolean(operation: BooleanOperation): BooleanPreview { const preview = previewBoolean(this.document, operation, this.objectIds); this.current = { preview, command: new BooleanCommand(operation, this.objectIds) }; return preview; }
  previewCompound(fillRule: 'nonzero' | 'evenodd' = 'evenodd'): BooleanPreview { const result = this.objectIds.map((id) => this.document.objects[id]).filter((object): object is import('@vectoria/core').PathObject => object?.type === 'path'); const preview: BooleanPreview = { operation: 'unite', inputIds: this.objectIds, result, warnings: result.length === this.objectIds.length && result.length > 1 ? [] : ['Compound path requires at least two paths.'] }; this.current = { preview, command: new CompoundPathCommand(this.objectIds, fillRule) }; return preview; }
  previewMask(mode: 'clip' | 'opacity', maskId: ObjectId, contentIds: readonly ObjectId[]): BooleanPreview { const preview: BooleanPreview = { operation: 'crop', inputIds: [maskId, ...contentIds], result: [], warnings: this.document.objects[maskId] && contentIds.length ? [] : ['Mask and content must be selected.'] }; this.current = { preview, command: new MaskCommand(mode, maskId, contentIds) }; return preview; }
  apply(): Command | null { const current = this.current; this.current = null; return current && current.preview.warnings.length === 0 ? current.command : null; }
  cancel(): void { this.current = null; }
}
