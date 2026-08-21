import type { DocumentModel } from '../model/types.js';
import { validateInvariants } from '../model/invariants.js';

/**
 * Command interface for document mutations.
 * All document changes go through commands for Undo/Redo support.
 */
export interface Command {
  readonly type: string;
  readonly description: string;

  /** Apply the command to the document, returning the new state. */
  execute(doc: DocumentModel): DocumentModel;

  /** Reverse the command, returning the previous state. */
  undo(doc: DocumentModel): DocumentModel;
}

/**
 * Command history with undo/redo stacks.
 */
export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private _onChange: (() => void) | null = null;

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoDescription(): string | null {
    const cmd = this.undoStack[this.undoStack.length - 1];
    return cmd?.description ?? null;
  }

  get redoDescription(): string | null {
    const cmd = this.redoStack[0];
    return cmd?.description ?? null;
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

    // Dev-mode invariant validation — uses safe type cast since
    // import.meta.env is a Vite feature not available in plain tsc.
    const dev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV;
    if (dev) {
      const violations = validateInvariants(newDoc);
      if (violations.length > 0) {
        console.error('[Vectoria] Invariant violation after command execution:', violations);
        // Note: We don't block the command to allow recovery/debugging, but we log it aggressively.
      }
    }

    this.undoStack.push(command);
    this.redoStack = [];
    this._onChange?.();
    return newDoc;
  }

  /**
   * Undo the last command.
   */
  undo(doc: DocumentModel): DocumentModel | null {
    const command = this.undoStack.pop();
    if (!command) return null;

    const newDoc = command.undo(doc);
    this.redoStack.unshift(command);
    this._onChange?.();
    return newDoc;
  }

  /**
   * Redo the next command.
   */
  redo(doc: DocumentModel): DocumentModel | null {
    const command = this.redoStack.shift();
    if (!command) return null;

    const newDoc = command.execute(doc);
    this.undoStack.push(command);
    this._onChange?.();
    return newDoc;
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this._onChange?.();
  }
}
