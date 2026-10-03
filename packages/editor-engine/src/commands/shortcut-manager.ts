export interface ShortcutCombo {
  readonly key: string;
  readonly meta: boolean;
  readonly ctrl: boolean;
  readonly shift: boolean;
  readonly alt: boolean;
}

/**
 * Normalizes a ShortcutCombo into a canonical string identifier based on platform modifier conventions.
 */
export function comboId(combo: ShortcutCombo, isMac: boolean): string {
  const mod = isMac ? combo.meta : combo.ctrl;
  return [
    mod ? 'mod' : '',
    combo.alt ? 'alt' : '',
    combo.shift ? 'shift' : '',
    combo.key.toLowerCase(),
  ]
    .filter(Boolean)
    .join('+');
}

export class ShortcutManager {
  private bindings = new Map<string, string>(); // comboId -> actionId

  constructor(
    defaults: readonly { actionId: string; combo: ShortcutCombo }[],
    private readonly isMac: boolean
  ) {
    for (const d of defaults) {
      this.bindings.set(comboId(d.combo, isMac), d.actionId);
    }
  }

  static comboId(combo: ShortcutCombo, isMac: boolean): string {
    return comboId(combo, isMac);
  }

  match(e: { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; target?: EventTarget | null }): string | null {
    if (shouldIgnoreKeydown(e.target)) return null;
    return this.bindings.get(comboId({ key: e.key, meta: e.metaKey, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey }, this.isMac)) ?? null;
  }

  conflicts(combo: ShortcutCombo): string | null {
    return this.bindings.get(comboId(combo, this.isMac)) ?? null;
  }

  bind(actionId: string, combo: ShortcutCombo): boolean {
    const id = comboId(combo, this.isMac);
    if (this.bindings.has(id)) return false;
    this.unbindAction(actionId);
    this.bindings.set(id, actionId);
    return true;
  }

  unbindAction(actionId: string): void {
    for (const [id, action] of this.bindings) {
      if (action === actionId) this.bindings.delete(id);
    }
  }

  reset(defaults: readonly { actionId: string; combo: ShortcutCombo }[]): void {
    this.bindings = new Map(defaults.map((d) => [comboId(d.combo, this.isMac), d.actionId]));
  }
}

export function shouldIgnoreKeydown(target: EventTarget | null | undefined): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

/** Canonical action ids. Keys match KeyboardEvent.key (lowercased by comboId). */
export interface ShortcutActionMeta {
  readonly actionId: string;
  readonly label: string;
}

export interface ToolShortcutActionMeta extends ShortcutActionMeta {
  readonly toolId: string;
  readonly defaultCombo?: ShortcutCombo;
}

const combo = (key: string, opts: Partial<ShortcutCombo> = {}): ShortcutCombo =>
  ({ key, meta: false, ctrl: false, shift: false, alt: false, ...opts });

/**
 * Canonical registry for every Tool Rail tool. Tool UI derives shortcut hints
 * from this registry instead of maintaining a second hardcoded shortcut list.
 */
export const TOOL_SHORTCUT_ACTIONS: readonly ToolShortcutActionMeta[] = [
  { toolId: 'select', actionId: 'tool.select', label: 'Narzędzie: Zaznaczanie', defaultCombo: combo('v') },
  { toolId: 'direct-select', actionId: 'tool.direct-select', label: 'Narzędzie: Zaznaczanie węzłów', defaultCombo: combo('a') },
  { toolId: 'lasso', actionId: 'tool.lasso', label: 'Narzędzie: Lasso', defaultCombo: combo('o') },
  { toolId: 'node-lasso', actionId: 'tool.node-lasso', label: 'Narzędzie: Lasso węzłów', defaultCombo: combo('o', { shift: true }) },
  { toolId: 'rectangle', actionId: 'tool.rectangle', label: 'Narzędzie: Prostokąt', defaultCombo: combo('r') },
  { toolId: 'ellipse', actionId: 'tool.ellipse', label: 'Narzędzie: Elipsa', defaultCombo: combo('l') },
  { toolId: 'line', actionId: 'tool.line', label: 'Narzędzie: Linia', defaultCombo: combo('\\') },
  { toolId: 'polygon', actionId: 'tool.polygon', label: 'Narzędzie: Wielokąt' },
  { toolId: 'star', actionId: 'tool.star', label: 'Narzędzie: Gwiazda' },
  { toolId: 'arc', actionId: 'tool.arc', label: 'Narzędzie: Łuk' },
  { toolId: 'pie', actionId: 'tool.pie', label: 'Narzędzie: Wycinek koła' },
  { toolId: 'ring', actionId: 'tool.ring', label: 'Narzędzie: Pierścień' },
  { toolId: 'spiral', actionId: 'tool.spiral', label: 'Narzędzie: Spirala' },
  { toolId: 'callout', actionId: 'tool.callout', label: 'Narzędzie: Dymek' },
  { toolId: 'polyline', actionId: 'tool.polyline', label: 'Narzędzie: Polilinia' },
  { toolId: 'pen', actionId: 'tool.pen', label: 'Narzędzie: Pióro', defaultCombo: combo('p') },
  { toolId: 'pencil', actionId: 'tool.pencil', label: 'Narzędzie: Ołówek', defaultCombo: combo('n') },
  { toolId: 'brush', actionId: 'tool.brush', label: 'Narzędzie: Pędzel', defaultCombo: combo('b') },
  { toolId: 'smooth', actionId: 'tool.smooth', label: 'Narzędzie: Wygładzanie', defaultCombo: combo('s') },
  { toolId: 'corner', actionId: 'tool.corner', label: 'Narzędzie: Narożnik', defaultCombo: combo('q') },
  { toolId: 'eraser', actionId: 'tool.eraser', label: 'Narzędzie: Gumka', defaultCombo: combo('e', { shift: true }) },
  { toolId: 'knife', actionId: 'tool.knife', label: 'Narzędzie: Nóż', defaultCombo: combo('k') },
  { toolId: 'scissors', actionId: 'tool.scissors', label: 'Narzędzie: Nożyce', defaultCombo: combo('c') },
  { toolId: 'width', actionId: 'tool.width', label: 'Narzędzie: Szerokość', defaultCombo: combo('w') },
  { toolId: 'text', actionId: 'tool.text', label: 'Narzędzie: Tekst', defaultCombo: combo('t') },
  { toolId: 'eyedropper', actionId: 'tool.eyedropper', label: 'Narzędzie: Pipeta', defaultCombo: combo('i') },
  { toolId: 'bucket', actionId: 'tool.bucket', label: 'Narzędzie: Wypełnienie', defaultCombo: combo('g') },
  { toolId: 'hand', actionId: 'tool.hand', label: 'Narzędzie: Ręka', defaultCombo: combo('h') },
  { toolId: 'zoom', actionId: 'tool.zoom', label: 'Narzędzie: Lupa', defaultCombo: combo('z') },
];

const GENERAL_SHORTCUT_ACTIONS: readonly ShortcutActionMeta[] = [
  { actionId: 'clipboard.copy', label: 'Kopiuj' },
  { actionId: 'clipboard.cut', label: 'Wytnij' },
  { actionId: 'clipboard.paste', label: 'Wklej' },
  { actionId: 'clipboard.paste-in-place', label: 'Wklej na miejscu' },
  { actionId: 'clipboard.paste-all-artboards', label: 'Wklej na wszystkich artboardach' },
  { actionId: 'edit.duplicate', label: 'Powiel' },
  { actionId: 'edit.group', label: 'Grupuj' },
  { actionId: 'edit.ungroup', label: 'Rozgrupuj' },
  { actionId: 'edit.repeat-transform', label: 'Powtórz transformację' },
  { actionId: 'edit.select-all', label: 'Zaznacz wszystko' },
  { actionId: 'object.transform', label: 'Przekształcenia...' },
  { actionId: 'edit.undo', label: 'Cofnij' },
  { actionId: 'edit.redo', label: 'Ponów' },
  { actionId: 'edit.outline-mode', label: 'Tryb konturu' },
  { actionId: 'view.solo-layer', label: 'Solo warstwy' },
  { actionId: 'view.find-replace', label: 'Znajdź i zamień' },
  { actionId: 'view.command-palette', label: 'Paleta poleceń' },
  { actionId: 'view.zoom-100', label: 'Zoom 100%' },
  { actionId: 'view.fit-artboard', label: 'Dopasuj obszar roboczy' },
];

/**
 * Registry of user-configurable action metadata displayed in menus, command palette, and shortcut settings.
 */
export const SHORTCUT_ACTIONS: readonly ShortcutActionMeta[] = [
  ...GENERAL_SHORTCUT_ACTIONS,
  ...TOOL_SHORTCUT_ACTIONS.map(({ actionId, label }) => ({ actionId, label })),
];

const GENERAL_DEFAULT_SHORTCUTS: readonly ShortcutBinding[] = [
  { actionId: 'clipboard.copy', combo: combo('c', { meta: true, ctrl: true }) },
  { actionId: 'clipboard.cut', combo: combo('x', { meta: true, ctrl: true }) },
  { actionId: 'clipboard.paste', combo: combo('v', { meta: true, ctrl: true }) },
  { actionId: 'clipboard.paste-in-place', combo: combo('v', { meta: true, ctrl: true, shift: true }) },
  { actionId: 'edit.duplicate', combo: combo('d', { meta: true, ctrl: true }) },
  { actionId: 'edit.group', combo: combo('g', { meta: true, ctrl: true }) },
  { actionId: 'edit.ungroup', combo: combo('g', { meta: true, ctrl: true, shift: true }) },
  { actionId: 'edit.repeat-transform', combo: combo('r', { meta: true, ctrl: true, shift: true }) },
  { actionId: 'edit.select-all', combo: combo('a', { meta: true, ctrl: true }) },
  { actionId: 'object.transform', combo: combo('t', { meta: true, ctrl: true }) },
  { actionId: 'edit.undo', combo: combo('z', { meta: true, ctrl: true }) },
  { actionId: 'edit.redo', combo: combo('z', { meta: true, ctrl: true, shift: true }) },
  { actionId: 'edit.outline-mode', combo: combo('y', { meta: true, ctrl: true }) },
  { actionId: 'view.find-replace', combo: combo('f', { meta: true, ctrl: true }) },
  { actionId: 'view.command-palette', combo: combo('k', { meta: true, ctrl: true }) },
  { actionId: 'view.zoom-100', combo: combo('0', { meta: true, ctrl: true }) },
  { actionId: 'view.fit-artboard', combo: combo('1', { meta: true, ctrl: true }) },
  { actionId: 'view.solo-layer', combo: combo('s', { alt: true }) },
];

/**
 * Default keyboard shortcuts. Tool defaults are generated from TOOL_SHORTCUT_ACTIONS
 * so the runtime router, settings dialog and Tool Rail share one source of truth.
 */
export const DEFAULT_SHORTCUTS: readonly ShortcutBinding[] = [
  ...GENERAL_DEFAULT_SHORTCUTS,
  ...TOOL_SHORTCUT_ACTIONS.flatMap(({ actionId, defaultCombo }) =>
    defaultCombo ? [{ actionId, combo: defaultCombo }] : []
  ),
];

export function getToolShortcutAction(toolId: string): ToolShortcutActionMeta | undefined {
  return TOOL_SHORTCUT_ACTIONS.find((action) => action.toolId === toolId);
}

export function formatShortcutCombo(combo: ShortcutCombo, isMac: boolean): string {
  if (!combo.key) return '';
  const parts: string[] = [];
  if ((isMac && combo.meta) || (!isMac && combo.ctrl)) parts.push(isMac ? 'Cmd' : 'Ctrl');
  if (combo.alt) parts.push(isMac ? 'Option' : 'Alt');
  if (combo.shift) parts.push('Shift');

  let key = combo.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();

  parts.push(key);
  return parts.join('+');
}

export type ShortcutBinding = { actionId: string; combo: ShortcutCombo };
