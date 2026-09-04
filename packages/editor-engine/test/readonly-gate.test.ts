import { describe, expect, it } from 'vitest';
import { CommandRegistry, type EditorCommand, type EditorContext } from '../src/commands/command-registry.js';

describe('ReadOnly Gate (EPIC-17 SAAS-011 groundwork)', () => {
  it('blocks mutating commands when readOnly is true and allows non-mutating commands', () => {
    const registry = new CommandRegistry();

    const zoomCmd: EditorCommand = {
      id: 'view.zoom-in',
      title: 'Powiększ',
      isMutating: false,
      enabled: () => true,
      execute: () => {},
    };

    const pasteCmd: EditorCommand = {
      id: 'edit.paste',
      title: 'Wklej',
      isMutating: true,
      enabled: () => true,
      execute: () => {},
    };

    registry.register(zoomCmd);
    registry.register(pasteCmd);

    const normalCtx: EditorContext = {
      selection: [],
      readOnly: false,
    };

    const readOnlyCtx: EditorContext = {
      selection: [],
      readOnly: true,
    };

    // Normal mode: both enabled
    expect(registry.canExecute(zoomCmd, normalCtx)).toBe(true);
    expect(registry.canExecute(pasteCmd, normalCtx)).toBe(true);

    // ReadOnly mode: zoom enabled, paste blocked
    expect(registry.canExecute(zoomCmd, readOnlyCtx)).toBe(true);
    expect(registry.canExecute(pasteCmd, readOnlyCtx)).toBe(false);

    // Search reflects enabled states
    const searchResults = registry.search('', readOnlyCtx);
    const zoomResult = searchResults.find((r) => r.command.id === 'view.zoom-in');
    const pasteResult = searchResults.find((r) => r.command.id === 'edit.paste');

    expect(zoomResult?.enabled).toBe(true);
    expect(pasteResult?.enabled).toBe(false);
  });
});
