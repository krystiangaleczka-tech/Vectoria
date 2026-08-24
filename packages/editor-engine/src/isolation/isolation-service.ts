import type { MaskGroup, ObjectId } from '@vectoria/core';

export interface IsolationContext {
  readonly rootId: ObjectId;
  readonly kind: 'group' | 'mask';
  readonly label: string;
  readonly objectIds: readonly ObjectId[];
}

/** Keeps transient isolate-mode scope outside React and restores it on cancel. */
export class IsolationService {
  private readonly stack: IsolationContext[] = [];
  get context(): IsolationContext | null { return this.stack[this.stack.length - 1] ?? null; }
  get breadcrumb(): readonly IsolationContext[] { return [...this.stack]; }
  enterGroup(rootId: ObjectId, objectIds: readonly ObjectId[], label = 'Group'): IsolationContext { return this.enter({ rootId, kind: 'group', label, objectIds }); }
  enterMask(group: MaskGroup, label = `${group.mode} mask`): IsolationContext { return this.enter({ rootId: group.maskId, kind: 'mask', label, objectIds: [group.maskId, ...group.contentIds] }); }
  exit(): IsolationContext | null { return this.stack.pop() ?? null; }
  exitAll(): void { this.stack.length = 0; }
  contains(objectId: ObjectId): boolean { return this.context?.objectIds.includes(objectId) ?? true; }
  private enter(context: IsolationContext): IsolationContext { this.stack.push(context); return context; }
}
