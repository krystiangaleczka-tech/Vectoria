import type { Command, DocumentModel, SelectionState } from '@vectoria/core';

export interface EditorContext {
  readonly doc: DocumentModel;
  readonly selection: SelectionState;
  execute(command: Command): void;
  report(message: string): void;
}

export interface EditorCommand {
  readonly id: string;
  readonly title: string;
  readonly shortcut?: string;
  readonly enabled: (ctx: EditorContext) => boolean;
  readonly enabledReason?: string;
  execute(ctx: EditorContext): void;
}

export class CommandRegistry {
  private commands = new Map<string, EditorCommand>();

  register(command: EditorCommand): void {
    this.commands.set(command.id, command);
  }

  list(): EditorCommand[] {
    return Array.from(this.commands.values());
  }

  search(query: string): EditorCommand[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.list();
    return this.list().filter((c) => c.title.toLowerCase().includes(q));
  }
}
