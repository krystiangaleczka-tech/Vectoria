import { describe, it, expect } from 'vitest';
import { ShortcutManager, DEFAULT_SHORTCUTS, TOOL_SHORTCUT_ACTIONS, comboId, formatShortcutCombo } from '../src/commands/shortcut-manager.js';

const keyEvent = (key: string, mods: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean } = {}) => ({
  key,
  metaKey: mods.metaKey ?? false,
  ctrlKey: mods.ctrlKey ?? false,
  shiftKey: mods.shiftKey ?? false,
  altKey: mods.altKey ?? false,
  target: null as EventTarget | null,
});

describe('ShortcutManager', () => {
  it('matches default tool and clipboard combos', () => {
    const m = new ShortcutManager(DEFAULT_SHORTCUTS, true);
    expect(m.match(keyEvent('v'))).toBe('tool.select');
    expect(m.match(keyEvent('c', { metaKey: true }))).toBe('clipboard.copy');
    expect(m.match(keyEvent('v', { metaKey: true, shiftKey: true }))).toBe('clipboard.paste-in-place');
    expect(m.match(keyEvent('z', { metaKey: true, shiftKey: true }))).toBe('edit.redo');
  });

  it('ignores keydown in inputs and contenteditable', () => {
    const m = new ShortcutManager(DEFAULT_SHORTCUTS, true);
    expect(m.match({ ...keyEvent('v'), target: { tagName: 'INPUT' } as unknown as EventTarget })).toBeNull();
    expect(m.match({ ...keyEvent('v'), target: { tagName: 'DIV', isContentEditable: true } as unknown as EventTarget })).toBeNull();
  });

  it('rebind respects conflicts and unbindAction', () => {
    const m = new ShortcutManager(DEFAULT_SHORTCUTS, true);
    expect(m.conflicts({ key: 'p', meta: false, ctrl: false, shift: false, alt: false })).toBe('tool.pen');
    expect(m.bind('tool.zoom', { key: 'p', meta: false, ctrl: false, shift: false, alt: false })).toBe(false);
    m.unbindAction('tool.pen');
    expect(m.bind('tool.zoom', { key: 'p', meta: false, ctrl: false, shift: false, alt: false })).toBe(true);
    expect(m.match(keyEvent('p'))).toBe('tool.zoom');
    m.reset(DEFAULT_SHORTCUTS);
    expect(m.match(keyEvent('p'))).toBe('tool.pen');
  });

  it('comboId is platform-aware', () => {
    const c = { key: 'c', meta: true, ctrl: true, shift: false, alt: false };
    expect(comboId(c, true)).toBe('mod+c');
    expect(comboId(c, false)).toBe('mod+c');
  });

  it('registers every Tool Rail tool once and includes the audited Shift shortcuts', () => {
    expect(TOOL_SHORTCUT_ACTIONS).toHaveLength(29);
    expect(new Set(TOOL_SHORTCUT_ACTIONS.map((action) => action.toolId)).size).toBe(29);
    expect(new Set(TOOL_SHORTCUT_ACTIONS.map((action) => action.actionId)).size).toBe(29);

    const m = new ShortcutManager(DEFAULT_SHORTCUTS, false);
    expect(m.match(keyEvent('o', { shiftKey: true }))).toBe('tool.node-lasso');
    expect(m.match(keyEvent('e', { shiftKey: true }))).toBe('tool.eraser');
    expect(m.match(keyEvent('h'))).toBe('tool.hand');
  });

  it('formats tool shortcut hints using platform conventions', () => {
    expect(formatShortcutCombo({ key: 'e', meta: false, ctrl: false, shift: true, alt: false }, false)).toBe('Shift+E');
    expect(formatShortcutCombo({ key: 'o', meta: false, ctrl: false, shift: true, alt: false }, false)).toBe('Shift+O');
    expect(formatShortcutCombo({ key: 'h', meta: false, ctrl: false, shift: false, alt: false }, false)).toBe('H');
    expect(formatShortcutCombo({ key: 'k', meta: true, ctrl: true, shift: false, alt: false }, true)).toBe('Cmd+K');
    expect(formatShortcutCombo({ key: 'k', meta: true, ctrl: true, shift: false, alt: false }, false)).toBe('Ctrl+K');
  });
});
