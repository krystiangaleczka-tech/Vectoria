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

/**
 * Registry of user-configurable action metadata displayed in menus, command palette, and shortcut settings.
 */
export const SHORTCUT_ACTIONS: readonly ShortcutActionMeta[] = [
  { actionId: 'clipboard.copy', label: 'Kopiuj' },
  { actionId: 'clipboard.cut', label: 'Wytnij' },
  { actionId: 'clipboard.paste', label: 'Wklej' },
  { actionId: 'clipboard.paste-in-place', label: 'Wklej na miejscu' },
  { actionId: 'clipboard.paste-all-artboards', label: 'Wklej na wszystkich artboardach' },
  { actionId: 'edit.duplicate', label: 'Powiel' },
  { actionId: 'edit.group', label: 'Grupuj' },
  { actionId: 'edit.ungroup', label: 'Rozgrupuj' },
  { actionId: 'edit.repeat-transform', label: 'Powtórz transformację' },
  { actionId: 'edit.undo', label: 'Cofnij' },
  { actionId: 'edit.redo', label: 'Ponów' },
  { actionId: 'edit.outline-mode', label: 'Tryb konturu' },
  { actionId: 'view.solo-layer', label: 'Solo warstwy' },
  { actionId: 'view.find-replace', label: 'Znajdź i zamień' },
  { actionId: 'view.command-palette', label: 'Paleta poleceń' },
  { actionId: 'view.zoom-100', label: 'Zoom 100%' },
  { actionId: 'view.fit-artboard', label: 'Dopasuj obszar roboczy' },
  { actionId: 'tool.select', label: 'Narzędzie: Zaznaczanie' },
  { actionId: 'tool.direct-select', label: 'Narzędzie: Zaznaczanie węzłów' },
  { actionId: 'tool.lasso', label: 'Narzędzie: Lasso' },
  { actionId: 'tool.rectangle', label: 'Narzędzie: Prostokąt' },
  { actionId: 'tool.ellipse', label: 'Narzędzie: Elipsa' },
  { actionId: 'tool.line', label: 'Narzędzie: Linia' },
  { actionId: 'tool.text', label: 'Narzędzie: Tekst' },
  { actionId: 'tool.pen', label: 'Narzędzie: Pióro' },
  { actionId: 'tool.pencil', label: 'Narzędzie: Ołówek' },
  { actionId: 'tool.brush', label: 'Narzędzie: Pędzel' },
  { actionId: 'tool.smooth', label: 'Narzędzie: Wygładzanie' },
  { actionId: 'tool.corner', label: 'Narzędzie: Narożnik' },
  { actionId: 'tool.knife', label: 'Narzędzie: Nóż' },
  { actionId: 'tool.scissors', label: 'Narzędzie: Nożyce' },
  { actionId: 'tool.width', label: 'Narzędzie: Szerokość' },
  { actionId: 'tool.eyedropper', label: 'Narzędzie: Pipeta' },
  { actionId: 'tool.bucket', label: 'Narzędzie: Wypełnienie' },
  { actionId: 'tool.hand', label: 'Narzędzie: Ręka' },
  { actionId: 'tool.zoom', label: 'Narzędzie: Lupa' },
];

const combo = (key: string, opts: Partial<ShortcutCombo> = {}): ShortcutCombo =>
  ({ key, meta: false, ctrl: false, shift: false, alt: false, ...opts });

/**
 * Default keyboard shortcuts providing cross-platform fallback matching the legacy editor keydown handlers.
 */
export const DEFAULT_SHORTCUTS: readonly { actionId: string; combo: ShortcutCombo }[] = [
  { actionId: 'clipboard.copy', combo: combo('c', { meta: true, ctrl: true }) },
  { actionId: 'clipboard.cut', combo: combo('x', { meta: true, ctrl: true }) },
  { actionId: 'clipboard.paste', combo: combo('v', { meta: true, ctrl: true }) },
  { actionId: 'clipboard.paste-in-place', combo: combo('v', { meta: true, ctrl: true, shift: true }) },
  { actionId: 'edit.duplicate', combo: combo('d', { meta: true, ctrl: true }) },
  { actionId: 'edit.group', combo: combo('g', { meta: true, ctrl: true }) },
  { actionId: 'edit.ungroup', combo: combo('g', { meta: true, ctrl: true, shift: true }) },
  { actionId: 'edit.repeat-transform', combo: combo('r', { meta: true, ctrl: true, shift: true }) },
  { actionId: 'edit.undo', combo: combo('z', { meta: true, ctrl: true }) },
  { actionId: 'edit.redo', combo: combo('z', { meta: true, ctrl: true, shift: true }) },
  { actionId: 'edit.outline-mode', combo: combo('y', { meta: true, ctrl: true }) },
  { actionId: 'view.find-replace', combo: combo('f', { meta: true, ctrl: true }) },
  { actionId: 'view.command-palette', combo: combo('k', { meta: true, ctrl: true }) },
  { actionId: 'view.zoom-100', combo: combo('0', { meta: true, ctrl: true }) },
  { actionId: 'view.fit-artboard', combo: combo('1', { meta: true, ctrl: true }) },
  { actionId: 'view.solo-layer', combo: combo('s', { alt: true }) },
  { actionId: 'tool.select', combo: combo('v') },
  { actionId: 'tool.direct-select', combo: combo('a') },
  { actionId: 'tool.lasso', combo: combo('o') },
  { actionId: 'tool.rectangle', combo: combo('r') },
  { actionId: 'tool.ellipse', combo: combo('l') },
  { actionId: 'tool.line', combo: combo('\\') },
  { actionId: 'tool.text', combo: combo('t') },
  { actionId: 'tool.pen', combo: combo('p') },
  { actionId: 'tool.pencil', combo: combo('n') },
  { actionId: 'tool.brush', combo: combo('b') },
  { actionId: 'tool.smooth', combo: combo('s') },
  { actionId: 'tool.corner', combo: combo('q') },
  { actionId: 'tool.knife', combo: combo('k') },
  { actionId: 'tool.scissors', combo: combo('c') },
  { actionId: 'tool.width', combo: combo('w') },
  { actionId: 'tool.eyedropper', combo: combo('i') },
  { actionId: 'tool.bucket', combo: combo('g') },
  { actionId: 'tool.hand', combo: combo('h') },
  { actionId: 'tool.zoom', combo: combo('z') },
];

export type ShortcutBinding = { actionId: string; combo: ShortcutCombo };
