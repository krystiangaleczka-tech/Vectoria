export interface ShortcutCombo {
  readonly key: string;
  readonly meta: boolean;
  readonly ctrl: boolean;
  readonly shift: boolean;
  readonly alt: boolean;
}

export class ShortcutManager {
  private bindings = new Map<string, string>(); // comboId -> actionId

  constructor(
    defaults: readonly { actionId: string; combo: ShortcutCombo }[],
    private readonly isMac: boolean
  ) {
    for (const d of defaults) {
      this.bindings.set(ShortcutManager.comboId(d.combo, isMac), d.actionId);
    }
  }

  static comboId(combo: ShortcutCombo, isMac: boolean): string {
    const mod = isMac ? combo.meta : combo.ctrl;
    return [
      mod ? 'mod' : '',
      combo.ctrl && !isMac ? 'ctrl' : '', // on windows ctrl is mod, but if both are passed (not possible natively but for completeness)
      combo.alt ? 'alt' : '',
      combo.shift ? 'shift' : '',
      combo.key.toLowerCase(),
    ]
      .filter(Boolean)
      .join('+');
  }

  match(e: { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; target?: EventTarget | null }): string | null {
    if (shouldIgnoreKeydown(e.target)) return null;
    return this.bindings.get(ShortcutManager.comboId({ key: e.key, meta: e.metaKey, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey }, this.isMac)) ?? null;
  }

  conflicts(combo: ShortcutCombo): string | null {
    return this.bindings.get(ShortcutManager.comboId(combo, this.isMac)) ?? null;
  }

  bind(actionId: string, combo: ShortcutCombo): boolean {
    const id = ShortcutManager.comboId(combo, this.isMac);
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
    this.bindings = new Map(defaults.map((d) => [ShortcutManager.comboId(d.combo, this.isMac), d.actionId]));
  }
}

export function shouldIgnoreKeydown(target: EventTarget | null | undefined): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}
