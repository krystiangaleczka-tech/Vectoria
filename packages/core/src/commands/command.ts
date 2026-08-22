import type { DocumentModel } from '../model/types.js';
import { validateInvariants } from '../model/invariants.js';

/**
 * Command interface for document mutations.
 * All document changes go through commands for Undo/Redo support.
 */
export interface Command {
  readonly type: string;
  readonly description?: string;
  readonly id?: string;
  readonly label?: string;

  /** Apply the command to the document, returning the new state. */
  execute(doc: DocumentModel): DocumentModel;

  /** Reverse the command, returning the previous state. */
  undo(doc: DocumentModel): DocumentModel;
}

/**
 * Command history with undo/redo stacks.
 */
export class CommandHistory {
  private entries: HistoryEntry[] = [];
  private historyCursor = -1;
  private nextCommandId = 1;
  private baseRevision = 0;
  private _onChange: (() => void) | null = null;

  get canUndo(): boolean {
    return this.historyCursor >= 0;
  }

  get canRedo(): boolean {
    return this.historyCursor < this.entries.length - 1;
  }

  get undoDescription(): string | null {
    const cmd = this.entries[this.historyCursor]?.command;
    return cmd ? commandLabel(cmd) : null;
  }

  get redoDescription(): string | null {
    const cmd = this.entries[this.historyCursor + 1]?.command;
    return cmd ? commandLabel(cmd) : null;
  }

  /** History entries, including commands currently available for redo. */
  get history(): readonly HistoryEntry[] {
    return [...this.entries];
  }

  /** Current history cursor. -1 represents the state before the first command. */
  get cursor(): number {
    return this.historyCursor;
  }

  /** Commands already applied, oldest first. Used by existing read-only views. */
  get historyEntries(): readonly Command[] {
    return this.entries.slice(0, this.historyCursor + 1).map((entry) => entry.command);
  }

  set onChange(callback: (() => void) | null) {
    this._onChange = callback;
  }

  /**
   * Execute a command and push it to the undo stack.
   * Clears the redo stack.
   */
  execute(command: Command, doc: DocumentModel): DocumentModel {
    const newDoc = command.execute(doc);

    // Rejected commands must not create empty undo entries.
    if (newDoc === doc) return doc;

    const violations = validateInvariants(newDoc);
    if (violations.length > 0) {
      console.error('[Vectoria] Command rejected by document invariants:', violations);
      return doc;
    }

    this.entries = this.entries.slice(0, this.historyCursor + 1);
    const commandNumber = this.nextCommandId++;
    const entryId = `${command.type}-${commandNumber}`;
    const beforeRevision = this.entries[this.entries.length - 1]?.afterRevision ?? this.baseRevision;
    this.entries.push({
      id: entryId,
      commandId: command.id ?? entryId,
      label: commandLabel(command),
      timestamp: new Date().toISOString(),
      beforeRevision,
      afterRevision: beforeRevision + 1,
      command,
    });
    this.historyCursor = this.entries.length - 1;
    this._onChange?.();
    return newDoc;
  }

  /**
   * Undo the last command.
   */
  undo(doc: DocumentModel): DocumentModel | null {
    const entry = this.entries[this.historyCursor];
    if (!entry) return null;

    const newDoc = entry.command.undo(doc);
    if (newDoc === doc || validateInvariants(newDoc).length > 0) return null;
    this.historyCursor -= 1;
    this._onChange?.();
    return newDoc;
  }

  /**
   * Redo the next command.
   */
  redo(doc: DocumentModel): DocumentModel | null {
    const entry = this.entries[this.historyCursor + 1];
    if (!entry) return null;

    const newDoc = entry.command.execute(doc);
    if (newDoc === doc || validateInvariants(newDoc).length > 0) return null;
    this.historyCursor += 1;
    this._onChange?.();
    return newDoc;
  }

  /** Moves document to selected history entry without deleting redo branch. */
  jumpTo(targetCursor: number, doc: DocumentModel): DocumentModel {
    const target = Math.max(-1, Math.min(targetCursor, this.entries.length - 1));
    let nextDoc = doc;
    while (this.historyCursor > target) {
      const undone = this.undo(nextDoc);
      if (!undone) return doc;
      nextDoc = undone;
    }
    while (this.historyCursor < target) {
      const redone = this.redo(nextDoc);
      if (!redone) return doc;
      nextDoc = redone;
    }
    return nextDoc;
  }

  /**
   * Clear all history.
   */
  clear(baseRevision = 0): void {
    this.entries = [];
    this.historyCursor = -1;
    this.baseRevision = baseRevision;
    this._onChange?.();
  }
}

function commandLabel(command: Command): string {
  return command.label ?? command.description ?? command.type;
}

export interface HistoryEntry {
  readonly id: string;
  readonly commandId: string;
  readonly label: string;
  readonly timestamp: string;
  readonly beforeRevision: number;
  readonly afterRevision: number;
  readonly command: Command;
}
