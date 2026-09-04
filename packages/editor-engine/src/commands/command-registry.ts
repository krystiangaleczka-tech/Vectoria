export type EditorSelectionState =
  | readonly string[]
  | { readonly objectIds: readonly string[]; readonly nodeIds?: readonly string[]; readonly mode?: string };

export interface EditorContext {
  readonly selection: EditorSelectionState;
  readonly activeLayerId?: string;
  readonly canUndo?: boolean;
  readonly canRedo?: boolean;
  readonly documentName?: string;
  readonly doc?: unknown;
  readonly execute?: (command: never) => void;
  readonly report?: () => void;
  readonly readOnly?: boolean;
}

export interface EditorCommand {
  readonly id: string;
  readonly title: string;
  readonly category?: string;
  readonly shortcut?: string;
  readonly enabledReason?: string;
  readonly isMutating?: boolean;
  enabled(ctx: EditorContext): boolean;
  execute(ctx: EditorContext): void;
}

/**
 * Central Command Registry (EPIC-14 PROD-024).
 * Single source of truth for Command Palette, menus, and shortcut triggers.
 */
export class CommandRegistry {
  private readonly commands = new Map<string, EditorCommand>();

  register(command: EditorCommand): void {
    this.commands.set(command.id, command);
  }

  unregister(id: string): boolean {
    return this.commands.delete(id);
  }

  get(id: string): EditorCommand | undefined {
    return this.commands.get(id);
  }

  getAll(): EditorCommand[] {
    return Array.from(this.commands.values());
  }

  list(): EditorCommand[] {
    return this.getAll();
  }

  canExecute(command: EditorCommand, ctx: EditorContext): boolean {
    if (ctx.readOnly && command.isMutating) return false;
    return command.enabled(ctx);
  }

  search(query: string, ctx: EditorContext): { command: EditorCommand; enabled: boolean }[] {
    const q = query.trim().toLowerCase();
    return this.getAll()
      .filter((cmd) => !q || cmd.title.toLowerCase().includes(q) || cmd.id.toLowerCase().includes(q))
      .map((cmd) => ({
        command: cmd,
        enabled: this.canExecute(cmd, ctx),
      }));
  }

  clear(): void {
    this.commands.clear();
  }
}

export const commandRegistry = new CommandRegistry();
