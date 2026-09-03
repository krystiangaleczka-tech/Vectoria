# PLAN NAPRAWY: EPIC-14 + EPIC-15 — implementacja z kodem

> Data: 2026-09-02
> Zakres: naprawa 16×PARTIAL + 4×MISSING (PROD) oraz 5×PARTIAL + 1×MISSING (IO).
> Bazuje na audycie 2026-09-02 (sekcja dowodów: file:line).
> Epik 16 poza zakresem. IO-012 PDF-wektory poza zakresem (etap 0.2, BACKLOG.md:549).

---

## 0. Status audytu vs kod (skrót)

| Grupa | Problem | Dowód |
|---|---|---|
| PROD-002/009 | `DocumentProperties` z no-op executorem | `PropertiesPanel.tsx:819` |
| PROD-010..014 | copy bez testu; paste tylko tryb `offset`; duplicate hardcoded +20/+20 | `EditorApp.tsx:664-685`, `paste-commands.ts:42-44`, `duplicate-transform-command.ts:49-59` |
| PROD-016..021 | Select Same: brak normalizacji/tolerancji; font/size/opacity/type MISSING | `select-same.ts:3,18,25` |
| PROD-023 | `ReplaceStylesBatchCommand` nieeksportowany, zero testów, zero UI | `commands/index.ts:1-143` (brak wpisu) |
| PROD-024 | Palette ignoruje `enabled`/`enabledReason`, brak focus trap, brak testów | `CommandPalette.tsx:104-110` |
| PROD-025/026 | keydown hardcoded; `useShortcutSettings([])` puste; ShortcutManager martwy | `EditorApp.tsx:1413-1516`, `EditorApp.tsx:222` |
| PROD-027 | `useLayoutPresets` zero użyć | `useLayoutPresets.ts:13-65` |
| IO-008 | raport nie emituje `editable`/`simplified` | `svg/import.ts:218-302` |
| IO-014 | brak provider AI | `import-registry.ts:6-8` |
| IO-017 | clipboard SVG bez testów | `clipboard-service.ts:38-72` |
| IO-019 | dziura `vbscript:`/`data:` w sanitizer | `svg/sanitizer.ts:42-44` |

---

## 1. Zmiany kontraktu domenowego — decyzje

1. **SelectSameTarget**: `'fill'|'stroke'|'fill-stroke'` → `+ 'font'|'size'|'opacity'|'type'`.
   Zapytanie w `packages/core`, nie komenda/dokument → **bez ADR** (ADR_010/011 istnieją i pokrywają clipboard/skróty).
2. **DuplicateTransformCommand**: nowy opcjonalny parametr `options` `{dx,dy,rotationDeg}` — kompatybilny wstecz (default = zachowanie obecne).
3. Sanitizer: `data:` tylko allowlista raster (`image/png|jpeg|webp|gif`); `vbscript:` zawsze strip; `data:image/svg+xml` **blokowane** (może nieść script).
4. Bez zmian `DocumentModel`, bez nowego typu obiektu, bez nowych komend (tylko eksport + wiring + testy istniejących).

---

## 2. Pliki per warstwa

### packages/core
| Plik | Op. |
|---|---|
| `src/query/select-same.ts` | MODIFY |
| `src/commands/duplicate-transform-command.ts` | MODIFY |
| `src/commands/index.ts` | MODIFY (+eksport) |
| `test/query/select-same.test.ts` | MODIFY |
| `test/commands/paste-commands.test.ts` | MODIFY |
| `test/commands/duplicate-transform-command.test.ts` | MODIFY |
| `test/commands/replace-styles-command.test.ts` | NEW |
| `test/clipboard/clipboard-fragment.test.ts` | NEW |

### packages/editor-engine
| Plik | Op. |
|---|---|
| `src/commands/shortcut-manager.ts` | MODIFY (defaults + metadata) |
| `test/shortcut-manager.test.ts` | NEW |

### packages/io
| Plik | Op. |
|---|---|
| `src/svg/sanitizer.ts` | MODIFY |
| `src/svg/import.ts` | MODIFY (editable/simplified) |
| `src/providers/honest-unsupported-providers.ts` | MODIFY (AI provider) |
| `test/sanitizer-uri.test.ts` | NEW |
| `test/import-report-categories.test.ts` | NEW |
| `test/vct-file.test.ts` | NEW |
| `test/file-drop-importer.test.ts` | MODIFY (JPG/WebP case) |

### apps/web
| Plik | Op. |
|---|---|
| `src/features/panels/PropertiesPanel.tsx` | MODIFY (no-op → realny executor) |
| `src/app/EditorApp.tsx` | MODIFY (shortcuts, paste modes, select-same, replace-style, presets) |
| `src/features/topbar/AppMenuBar.tsx` | MODIFY (menu items) |
| `src/features/palette/CommandPalette.tsx` | MODIFY (enabled/enabledReason/focus trap) |
| `src/features/dialogs/ShortcutConfigDialog.tsx` | MODIFY (lista z defaults) |
| `src/features/dialogs/FindReplaceDialog.tsx` | MODIFY (zakładka Style) |
| `src/hooks/useShortcutSettings.ts` | MODIFY (defaults z engine) |
| `src/hooks/useLayoutPresets.ts` | MODIFY (apply do layoutu) |
| `src/features/import/import-registry.ts` | MODIFY (AI provider) |
| `e2e/editor.spec.ts` | MODIFY (nowe scenariusze) |

### Dokumenty
| Plik | Op. |
|---|---|
| `BACKLOG.md` | MODIFY (statusy: [x] tylko DONE, [~] z notą) |

---

## 3. KOD — Faza 1: packages/core

### 3.1 `src/query/select-same.ts` — pełny rewrite

```ts
import type { DocumentModel, ObjectStyle, SceneObject, ObjectId } from '../model/types.js';
import { getObjectBounds } from '../model/bounds.js';
import { normalizeColor } from '@vectoria/shared';

export type SelectSameTarget =
  | 'fill' | 'stroke' | 'fill-stroke'
  | 'font' | 'size' | 'opacity' | 'type';
export type SelectSameScope = 'document' | 'active-artboard' | 'active-layer';

const EPS = 1e-6;

interface StyledText extends SceneObject {
  readonly fontFamily: string;
  readonly fontSize: number;
}

function isStyledText(obj: SceneObject): obj is StyledText {
  return obj.type === 'text' || obj.type === 'text-frame';
}

/** Normalized solid color; `null` for non-solid fills. */
function solidColor(fill: ObjectStyle['fill']): string | null {
  return fill.type === 'solid' ? normalizeColor(fill.color) : null;
}

/** Gradients/patterns match when type and stop colors match (geometry ignored by design). */
function matchesFill(a: ObjectStyle, b: ObjectStyle): boolean {
  if (a.fill.type !== b.fill.type) return false;
  const ca = solidColor(a.fill);
  const cb = solidColor(b.fill);
  if (ca !== null && cb !== null) return ca === cb;
  if (a.fill.type === 'linear-gradient' && b.fill.type === 'linear-gradient') {
    if (a.fill.stops.length !== b.fill.stops.length) return false;
    return a.fill.stops.every((s, i) =>
      s.offset === b.fill.stops[i]!.offset && normalizeColor(s.color) === normalizeColor(b.fill.stops[i]!.color));
  }
  // radial/angular/pattern: same type counts as same (documented simplification)
  return true;
}

function matchesStroke(a: ObjectStyle, b: ObjectStyle): boolean {
  if (!a.stroke && !b.stroke) return true;
  if (!a.stroke || !b.stroke) return false;
  const na = normalizeColor(a.stroke.color);
  const nb = normalizeColor(b.stroke.color);
  if (na === null || nb === null) return a.stroke.color === b.stroke.color;
  return na === nb && Math.abs(a.stroke.width - b.stroke.width) <= EPS;
}

function matchesFont(a: SceneObject, b: SceneObject): boolean {
  if (!isStyledText(a) || !isStyledText(b)) return false;
  return a.fontFamily.trim() === b.fontFamily.trim();
}

function matchesSize(doc: DocumentModel, a: SceneObject, b: SceneObject): boolean {
  const ba = getObjectBounds(a, doc);
  const bb = getObjectBounds(b, doc);
  return Math.abs(ba.width - bb.width) <= EPS && Math.abs(ba.height - bb.height) <= EPS;
}

/** Hidden or locked objects are never selected by Select Same. */
function isSelectable(obj: SceneObject): boolean {
  return obj.visible && !obj.locked;
}

export function selectSame(
  doc: DocumentModel,
  referenceId: ObjectId,
  target: SelectSameTarget,
  scope: SelectSameScope = 'document'
): ObjectId[] {
  const refObj = doc.objects[referenceId];
  if (!refObj) return [];

  let candidates: SceneObject[] = [];
  if (scope === 'active-layer') {
    const layer = doc.layers[doc.activeLayerId];
    candidates = (layer?.objectIds ?? [])
      .map(id => doc.objects[id])
      .filter((o): o is SceneObject => Boolean(o));
  } else {
    // 'document' i 'active-artboard': iteracja per warstwa pomija ukryte/zablokowane warstwy
    for (const layerId of doc.layerIds) {
      const layer = doc.layers[layerId];
      if (!layer || !layer.visible || layer.locked) continue;
      for (const id of layer.objectIds) {
        const obj = doc.objects[id];
        if (obj) candidates.push(obj);
      }
    }
  }

  return candidates.filter(obj => {
    if (obj.id === referenceId) return true;
    if (!isSelectable(obj)) return false;
    const style = obj.style;
    const refStyle = refObj.style;

    switch (target) {
      case 'fill': return matchesFill(style, refStyle);
      case 'stroke': return matchesStroke(style, refStyle);
      case 'fill-stroke': return matchesFill(style, refStyle) && matchesStroke(style, refStyle);
      case 'font': return matchesFont(refObj, obj);
      case 'size': return matchesSize(doc, refObj, obj);
      case 'opacity': return Math.abs(style.opacity - refStyle.opacity) <= EPS;
      case 'type': return obj.type === refObj.type;
      default: return false;
    }
  }).map(obj => obj.id);
}
```

Uwaga: poprzedni `getObjectStyle` type-guard zbędny — `SceneObjectBase.style: ObjectStyle` (types.ts:342) istnieje na każdym obiekcie.

### 3.2 `src/commands/duplicate-transform-command.ts`

```ts
import type { Command } from './command.js';
import type { DocumentModel, ObjectId, SceneObject, Transform2D } from '../model/types.js';
import { isValidTransform } from '../model/transform.js';
import { cloneObjectsWithNewIds } from '../clipboard/clipboard-fragment.js';

export interface DuplicateTransformOptions {
  readonly dx?: number;
  readonly dy?: number;
  readonly rotationDeg?: number;
}

/** Duplicate objects and apply a delta transform to each copy (transform-again). */
export class DuplicateTransformCommand implements Command {
  readonly type = 'DuplicateTransform';
  readonly description: string;
  private createdIds: ObjectId[] = [];

  constructor(
    private readonly sourceIds: readonly ObjectId[],
    private readonly options: DuplicateTransformOptions = { dx: 20, dy: 20 },
  ) {
    const { dx = 0, dy = 0, rotationDeg = 0 } = this.options;
    this.description = rotationDeg !== 0 ? 'Duplicate and transform' : 'Duplicate';
  }

  execute(doc: DocumentModel): DocumentModel {
    const { dx = 0, dy = 0, rotationDeg = 0 } = this.options;
    if (![dx, dy, rotationDeg].every(Number.isFinite)) return doc;

    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };
    let changed = false;

    for (const layerId of doc.layerIds) {
      const layer = doc.layers[layerId];
      if (!layer || layer.locked) continue;

      const layerSources = layer.objectIds
        .filter(id => this.sourceIds.includes(id))
        .map(id => doc.objects[id])
        .filter((o): o is SceneObject => o !== undefined && !o.locked);

      if (layerSources.length === 0) continue;

      const objectIds = [...layer.objectIds];
      const clones = cloneObjectsWithNewIds(layerSources);

      for (const clone of clones) {
        const transform: Transform2D = {
          ...clone.transform,
          position: { x: clone.transform.position.x + dx, y: clone.transform.position.y + dy },
          rotation: clone.transform.rotation + (rotationDeg * Math.PI) / 180,
        };
        if (!isValidTransform(transform)) continue;
        const modifiedClone: SceneObject = { ...clone, transform };
        newObjects[modifiedClone.id] = modifiedClone;
        objectIds.push(modifiedClone.id);
        this.createdIds.push(modifiedClone.id);
      }

      newLayers[layerId] = { ...layer, objectIds };
      changed = true;
    }

    if (!changed) return doc;
    return { ...doc, objects: newObjects, layers: newLayers, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.createdIds.length === 0) return doc;
    const created = new Set(this.createdIds);
    const objects = { ...doc.objects };
    for (const id of created) delete objects[id];
    const layers = Object.fromEntries(
      Object.entries(doc.layers).map(([id, l]) => [id, { ...l, objectIds: l.objectIds.filter((oid) => !created.has(oid)) }]),
    ) as DocumentModel['layers'];
    return { ...doc, objects, layers, updatedAt: new Date().toISOString() };
  }
}
```

### 3.3 `src/commands/index.ts` — dopisać na końcu

```ts
export { ReplaceStylesBatchCommand } from './replace-styles-command.js';
```

### 3.4 Testy core

`test/query/select-same.test.ts` — **dopisać** (istniejące 2 testy zostają; helper buduje poprawny `ObjectStyle` — obecne testy używają `strokeWidth` poza stylem, co przez `as any` przechodzi; nowe używają realnego kształtu):

```ts
import { describe, it, expect } from 'vitest';
import { selectSame } from '../../src/query/select-same.js';
import type { DocumentModel, SceneObject, ObjectStyle, StrokeStyle } from '../../src/index.js';

const stroke = (color: string, width: number): StrokeStyle => ({
  color, width, lineCap: 'butt', lineJoin: 'miter', miterLimit: 4, dashArray: [], opacity: 1,
});
const style = (fillColor: string | null, s?: StrokeStyle, opacity = 1): ObjectStyle => ({
  fill: fillColor ? { type: 'solid', color: fillColor } : { type: 'none' },
  stroke: s ?? null,
  opacity,
});

function makeDoc(objects: SceneObject[]): DocumentModel {
  const layers = { layer1: { id: 'layer1', name: 'L1', visible: true, locked: false, opacity: 1, objectIds: objects.map(o => o.id) } };
  return {
    schemaVersion: 1, id: 'doc', name: 'Doc', artboards: {}, layerIds: ['layer1'],
    layers, objects: Object.fromEntries(objects.map(o => [o.id, o])),
    activeArtboardId: '', activeLayerId: 'layer1', createdAt: '', updatedAt: '',
  } as any as DocumentModel;
}

function rect(id: string, st: ObjectStyle, visible = true, locked = false): SceneObject {
  return {
    id, type: 'rectangle', name: id, layerId: 'layer1', visible, locked,
    transform: { position: { x: 10, y: 10 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
    style: st, width: 100, height: 50, cornerRadius: { tl: 0, tr: 0, bl: 0, br: 0 },
  } as any as SceneObject;
}

describe('selectSame — normalization & tolerance', () => {
  it('normalizes color forms (name vs hex vs rgb)', () => {
    const doc = makeDoc([
      rect('a', style('#ff0000')),
      rect('b', style('red')),
      rect('c', style('rgb(255, 0, 0)')),
      rect('d', style('#00ff00')),
    ]);
    expect(selectSame(doc, 'a', 'fill')).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(selectSame(doc, 'a', 'fill')).not.toContain('d');
  });

  it('stroke width tolerance 1e-6', () => {
    const doc = makeDoc([
      rect('a', style(null, stroke('#000000', 2))),
      rect('b', style(null, stroke('#000000', 2 + 5e-7))),
      rect('c', style(null, stroke('#000000', 2.1))),
    ]);
    expect(selectSame(doc, 'a', 'stroke')).toEqual(expect.arrayContaining(['a', 'b']));
    expect(selectSame(doc, 'a', 'stroke')).not.toContain('c');
  });

  it('excludes locked and hidden objects', () => {
    const doc = makeDoc([
      rect('a', style('#ff0000')),
      rect('b', style('#ff0000'), true, true),
      rect('c', style('#ff0000'), false, false),
    ]);
    expect(selectSame(doc, 'a', 'fill')).toEqual(['a']);
  });

  it('target font matches text objects by fontFamily only', () => {
    const text = (id: string, fontFamily: string): SceneObject => ({
      id, type: 'text', name: id, layerId: 'layer1', visible: true, locked: false,
      transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
      style: style('#000000'), text: 'Hello', fontFamily, fontSize: 16, fontWeight: 400,
      fontStyle: 'normal', letterSpacing: 0, lineHeight: 1.2, textAlign: 'left', kerning: true,
    } as any as SceneObject);
    const doc = makeDoc([text('t1', 'Arial'), text('t2', ' Arial '), text('t3', 'Inter'), rect('r1', style('#000000'))]);
    expect(selectSame(doc, 't1', 'font')).toEqual(expect.arrayContaining(['t1', 't2']));
    expect(selectSame(doc, 't1', 'font')).not.toContain('t3');
    expect(selectSame(doc, 't1', 'font')).not.toContain('r1');
  });

  it('target size matches bounds with tolerance', () => {
    const doc = makeDoc([
      rect('a', style('#ff0000')),
      rect('b', style('#00ff00')),
    ]);
    expect(selectSame(doc, 'a', 'size')).toEqual(['a', 'b']);
  });

  it('target opacity matches with tolerance', () => {
    const doc = makeDoc([
      rect('a', style('#ff0000', undefined, 0.5)),
      rect('b', style('#00ff00', undefined, 0.5 + 5e-7)),
      rect('c', style('#00ff00', undefined, 0.75)),
    ]);
    expect(selectSame(doc, 'a', 'opacity')).toEqual(expect.arrayContaining(['a', 'b']));
    expect(selectSame(doc, 'a', 'opacity')).not.toContain('c');
  });

  it('target type matches by object type', () => {
    const ell = { ...rect('e', style('#ff0000')), type: 'ellipse', width: 100, height: 50 } as any as SceneObject;
    const doc = makeDoc([rect('a', style('#ff0000')), rect('b', style('#00ff00')), ell]);
    expect(selectSame(doc, 'a', 'type')).toEqual(['a', 'b']);
  });
});
```

`test/commands/paste-commands.test.ts` — **dopisać**:

```ts
it('paste preserves full style (fill, stroke, opacity)', () => {
  const doc = baseDoc();
  const fragment: ClipboardFragment = {
    schemaVersion: 1, type: 'ClipboardFragment',
    objects: [{
      id: 'src1', type: 'rectangle', name: 'R', layerId: 'layer1', visible: true, locked: false,
      transform: { position: { x: 10, y: 10 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
      style: {
        fill: { type: 'solid', color: '#123456' },
        stroke: { color: '#abcdef', width: 3, lineCap: 'round', lineJoin: 'bevel', miterLimit: 2, dashArray: [1, 2], opacity: 0.9 },
        opacity: 0.5, blendMode: 'multiply',
      },
      width: 100, height: 100, cornerRadius: { tl: 0, tr: 0, bl: 0, br: 0 },
    } as any as SceneObject],
    origin: { x: 0, y: 0 },
  };
  const cmd = new PasteObjectsCommand(fragment, 'layer1', 'offset', []);
  const result = cmd.execute(doc);
  const pasted = Object.values(result.objects).find((o) => o!.id !== 'src1')!;
  expect(pasted.style.fill).toEqual({ type: 'solid', color: '#123456' });
  expect(pasted.style.stroke).toMatchObject({ color: '#abcdef', width: 3, dashArray: [1, 2] });
  expect(pasted.style.opacity).toBe(0.5);
  expect(pasted.id).not.toBe('src1'); // nowe ID
});

it('paste in-place keeps source world transform and is undoable', () => {
  const doc = baseDoc();
  const fragment = fragmentAt(42, 24);
  const cmd = new PasteObjectsCommand(fragment, 'layer1', 'in-place', []);
  const result = cmd.execute(doc);
  const pasted = Object.values(result.objects).find((o) => o!.id !== 'src1')!;
  expect(pasted.transform.position).toEqual({ x: 42, y: 24 });
  const undone = cmd.undo(result);
  expect(undone.objects[pasted.id]).toBeUndefined();
  expect(undone.layers['layer1']!.objectIds).toHaveLength(0);
});

it('paste all-artboards creates one copy per artboard, single undo removes all', () => {
  const doc = baseDoc();
  doc.artboards = {
    ab1: { id: 'ab1', name: 'A1', x: 0, y: 0, width: 800, height: 600, visible: true, background: { type: 'color', color: '#ffffff' } },
    ab2: { id: 'ab2', name: 'A2', x: 900, y: 0, width: 800, height: 600, visible: true, background: { type: 'color', color: '#ffffff' } },
  } as any;
  const cmd = new PasteObjectsCommand(fragmentAt(5, 5), 'layer1', 'all-artboards', ['ab1', 'ab2']);
  const result = cmd.execute(doc);
  expect(result.layers['layer1']!.objectIds).toHaveLength(2);
  expect(cmd.undo(result).layers['layer1']!.objectIds).toHaveLength(0);
});
```

(Pomocniki `baseDoc`/`fragmentAt` wyciągnąć na górę pliku testowego; realny kształt `ObjectStyle`.)

`test/commands/duplicate-transform-command.test.ts` — **dopisać**:

```ts
it('applies custom delta (dx, dy, rotationDeg) to the copy', () => {
  const doc = docWithRect('src1', 10, 10); // transform.position {10,10}, rotation 0
  const cmd = new DuplicateTransformCommand(['src1'], { dx: 30, dy: -10, rotationDeg: 90 });
  const result = cmd.execute(doc);
  const copy = Object.values(result.objects).find((o) => o!.id !== 'src1')!;
  expect(copy.transform.position).toEqual({ x: 40, y: 0 });
  expect(copy.transform.rotation).toBeCloseTo(Math.PI / 2, 10);
  const undone = cmd.undo(result);
  expect(undone.objects[copy.id]).toBeUndefined();
});

it('rejects non-finite delta without mutation', () => {
  const doc = docWithRect('src1', 10, 10);
  const cmd = new DuplicateTransformCommand(['src1'], { dx: Number.NaN });
  expect(cmd.execute(doc)).toBe(doc);
});
```

`test/commands/replace-styles-command.test.ts` — **NEW** (pełny):

```ts
import { describe, it, expect } from 'vitest';
import { ReplaceStylesBatchCommand } from '../../src/commands/replace-styles-command.js';
import type { DocumentModel, ObjectStyle, SceneObject } from '../../src/index.js';

const style = (color: string, opacity = 1): ObjectStyle => ({
  fill: { type: 'solid', color }, stroke: null, opacity,
});

function docWith(id: string, st: ObjectStyle, locked = false): DocumentModel {
  const obj = {
    id, type: 'rectangle', name: id, layerId: 'layer1', visible: true, locked,
    transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
    style: st, width: 10, height: 10, cornerRadius: { tl: 0, tr: 0, bl: 0, br: 0 },
  } as any as SceneObject;
  return {
    schemaVersion: 1, id: 'doc', name: 'D', artboards: {}, layerIds: ['layer1'],
    layers: { layer1: { id: 'layer1', name: 'L', visible: true, locked: false, opacity: 1, objectIds: [id] } },
    objects: { [id]: obj }, activeArtboardId: '', activeLayerId: 'layer1', createdAt: '', updatedAt: '',
  } as any as DocumentModel;
}

describe('ReplaceStylesBatchCommand', () => {
  it('applies patches and undo restores exact previous styles', () => {
    const doc = docWith('a', style('#ff0000'));
    const updates = new Map([['a', { fill: { type: 'solid' as const, color: '#00ff00' }, opacity: 0.5 }]]);
    const cmd = new ReplaceStylesBatchCommand(updates);
    const result = cmd.execute(doc);
    expect(result.objects['a']!.style.fill).toEqual({ type: 'solid', color: '#00ff00' });
    expect(result.objects['a']!.style.opacity).toBe(0.5);
    const undone = cmd.undo(result);
    expect(undone.objects['a']!.style).toEqual(style('#ff0000'));
  });

  it('skips locked objects and out-of-range opacity', () => {
    const lockedDoc = docWith('a', style('#ff0000'), true);
    const cmd = new ReplaceStylesBatchCommand(new Map([['a', { opacity: 0.1 }]]));
    expect(cmd.execute(lockedDoc)).toBe(lockedDoc);
    const badOpacity = new ReplaceStylesBatchCommand(new Map([['a', { opacity: 1.5 }]]));
    const doc = docWith('a', style('#ff0000'));
    expect(badOpacity.execute(doc)).toBe(doc);
  });

  it('input map is not mutated (command immutability)', () => {
    const updates = new Map([['a', { opacity: 0.3 }]]);
    const snapshot = new Map(updates);
    const cmd = new ReplaceStylesBatchCommand(updates);
    cmd.execute(docWith('a', style('#ff0000')));
    expect(updates).toEqual(snapshot);
  });
});
```

`test/clipboard/clipboard-fragment.test.ts` — **NEW**: clone zachowuje styl + nowe ID + serialize/deserialize round-trip:

```ts
import { describe, it, expect } from 'vitest';
import { cloneObjectsWithNewIds } from '../../src/clipboard/clipboard-fragment.js';
import { serializeFragment, deserializeFragment } from '../../../io/src/clipboard/clipboard-serialization.js';
import type { ClipboardFragment, SceneObject } from '../../src/index.js';

it('clone keeps style and generates fresh ids', () => {
  const obj = { /* rectangle z pełnym ObjectStyle jak w paste-test */ } as any as SceneObject;
  const [clone] = cloneObjectsWithNewIds([obj]);
  expect(clone!.id).not.toBe(obj.id);
  expect(clone!.style).toEqual(obj.style);
});

it('serialize → deserialize round-trips fragment with style', () => {
  const fragment: ClipboardFragment = { schemaVersion: 1, type: 'ClipboardFragment', objects: [/* jw. */], origin: { x: 0, y: 0 } };
  const parsed = deserializeFragment(serializeFragment(fragment));
  expect(parsed.ok).toBe(true);
  if (parsed.ok) expect(parsed.value.objects[0]!.style).toEqual(fragment.objects[0]!.style);
});
```

(W pliku rozbudować obiekt obj z pełnym stylem — wzór: test paste powyżej.)

---

## 4. KOD — Faza 2: packages/editor-engine

### 4.1 `src/commands/shortcut-manager.ts` — dodać defaults + rebind

Na końcu pliku (istniejący kod bez zmian):

```ts
/** Canonical action ids. Keys match KeyboardEvent.key (lowercased by comboId). */
export interface ShortcutActionMeta {
  readonly actionId: string;
  readonly label: string;
}

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

/** Defaults replicate the legacy hardcoded keydown chain exactly (regression-safe). */
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
```

Uwaga projektowa: `comboId` buduje id z `meta` (Mac) **lub** `ctrl` (win) — dlatego defaults ustawiają oba (`{meta:true, ctrl:true}`); na danej platformie i tak użyty jest jeden modyfikator. Escape (solo-exit) zostaje poza managerem (modal-cancel semantyka, nie akcja).

### 4.2 `test/shortcut-manager.test.ts` — NEW

```ts
import { describe, it, expect } from 'vitest';
import { ShortcutManager, DEFAULT_SHORTCUTS, comboId } from '../src/commands/shortcut-manager.js';

const keyEvent = (key: string, mods: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean } = {}) => ({
  key, metaKey: mods.metaKey ?? false, ctrlKey: mods.ctrlKey ?? false,
  shiftKey: mods.shiftKey ?? false, altKey: mods.altKey ?? false, target: null,
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
    expect(m.match({ ...keyEvent('v'), target: { tagName: 'INPUT' } })).toBeNull();
    expect(m.match({ ...keyEvent('v'), target: { tagName: 'DIV', isContentEditable: true } })).toBeNull();
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
});
```

---

## 5. KOD — Faza 3: packages/io

### 5.1 `src/svg/sanitizer.ts` — łatanie URI (wstawić po bloku `javascript:`)

```ts
  // Strip vbscript: and disallowed data: URIs (allowlist: raster images only).
  // data:image/svg+xml is intentionally blocked — an SVG payload can carry script.
  const DATA_URI_ALLOWED = /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i;
  const uriAttr = /\s(?:xlink:)?(?:href|src)\s*=\s*("data:[^"]*"|'data:[^']*'|data:[^\s>]*)/gi;
  const blockedData = [...svgText.matchAll(uriAttr)]
    .map((m) => m[1]!.slice(1, -1))
    .filter((uri) => !DATA_URI_ALLOWED.test(uri));
  result = result.replace(
    /\s(?:xlink:)?(?:href|src)\s*=\s*(?:"vbscript:[^"]*"|'vbscript:[^']*'|vbscript:[^\s>]*)/gi,
    '',
  );
  for (const uri of blockedData) {
    const escaped = uri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\s(?:xlink:)?(?:href|src)\\s*=\\s*(?:"${escaped}"|'${escaped}'|${escaped})`, 'gi'), '');
  }
  if (blockedData.length > 0) {
    warnings.push({
      category: 'unsupported',
      code: 'svg.uri.blocked',
      message: `Usunięto ${blockedData.length} niedozwolonych URI (vbscript:/data:)`,
    });
  }
```

Regresja obowiązkowa: test na import poprawnego pliku z embedded raster (`data:image/png;base64,...`) — nie może zostać usunięty (EPIC-12 DONE).

### 5.2 `src/svg/import.ts` — kategorie editable/simplified

W `parseSvgDocument` (sygnatura: `(svgText, name, entries)` — entries już przekazywane):

Po udanym utworzeniu obiektu (linia `objects[id] = object;`):

```ts
      entries.push({ category: 'editable', code: 'svg.object.mapped', message: `Zmapowano ${tag} jako obiekt edytowalny` });
```

Simplified — dwa realne przypadki redukcji:
1. text z `textPath`, gdy definicja ścieżki nie istnieje (pathId wskazuje nieistniejący obiekt):

```ts
      if (tag === 'text' && object.type === 'text' && object.pathId && !importedPathIds.has(object.pathId)) {
        entries.push({ category: 'simplified', code: 'svg.textpath.missing', message: 'Tekst na ścieżce spłaszczonej — ścieżka nie istnieje w dokumencie' });
      }
```

2. `pattern` fill bez pełnej definicji (fallback do solid) — w `styleFor` nie ma dostępu do entries, więc: po pętli elements wykryć elementy z `fill="url(#...)"`, których id nie ma w `definitions`:

```ts
  for (const element of elements) {
    const fillAttr = element.getAttribute('fill');
    const ref = fillAttr?.match(/^url\(#(.+)\)$/)?.[1];
    if (ref && !definitions.has(ref) && !referencedMasks.has(ref)) {
      entries.push({ category: 'simplified', code: 'svg.fill.unresolved', message: 'Wypełnienie url(#…) zredukowane do braku wypełnienia' });
    }
  }
```

 (`referencedMasks` = zbiór id z mask/clipPath; kolejność: policzyć po zbudowaniu zbioru `referenced`.)

`countReport(entries)` na końcu `importSvgWithReport` zliczy kategorie automatycznie — bez zmiany kontraktu `ImportReport`.

### 5.3 `src/providers/honest-unsupported-providers.ts` — AI provider

```ts
export const aiProvider: FormatProvider = {
  id: 'ai',
  label: 'Adobe Illustrator (.ai)',
  canImport: (file) => file.name.toLowerCase().endsWith('.ai'),
  async import(file: File): Promise<ProviderResult> {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const isPs = head[0] === 0x25 && head[1] === 0x21 && head[2] === 0x50 && head[3] === 0x53; // '%!PS'
    const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // '%PDF'
    if (!isPs && !isPdf) throw new Error('Plik nie jest poprawnym dokumentem AI');
    return {
      status: 'unsupported',
      report: countReport([{
        category: 'unsupported',
        code: 'ai.parser.best-effort',
        message: 'Natywny import AI jest w przygotowaniu. Zapisz plik jako SVG lub PDF (z kompatybilnością) i zaimportuj ponownie.',
      }]),
    };
  },
};
```

### 5.4 `apps/web/src/features/import/import-registry.ts`

```ts
import { FormatProviderRegistry, svgProvider, epsProvider, cdrProvider, aiProvider, importVctFile } from '@vectoria/io';
// ...
importRegistry.register(aiProvider);   // po eps/cdr
```

### 5.5 Testy io

`test/sanitizer-uri.test.ts` — NEW:
- `vbscript:alert(1)` w href → strip + warning `svg.uri.blocked`;
- `data:text/html;base64,...` → strip;
- `data:image/png;base64,iVBOR...` → **zachowany**, brak warninga;
- `data:image/svg+xml;base64,...` → strip (decyzja 3).

`test/import-report-categories.test.ts` — NEW (jsdom potrzebny: DOMParser):

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { importSvgWithReport } from '../src/svg/import.js';

it('counts editable per mapped object', () => {
  const { report, document } = importSvgWithReport(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="10" height="10"/><circle cx="5" cy="5" r="4"/></svg>',
  );
  expect(report.editable).toBe(2);
  expect(report.flattened).toBe(0);
  expect(Object.keys(document.objects).length).toBe(2);
});

it('counts unsupported filters and simplified unresolved fills', () => {
  const { report } = importSvgWithReport(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<filter id="f"><feGaussianBlur/></filter>' +
    '<rect width="10" height="10" fill="url(#missing)"/>' +
    '</svg>',
  );
  expect(report.unsupported).toBeGreaterThanOrEqual(1);
  expect(report.simplified).toBeGreaterThanOrEqual(1);
});
```

`test/vct-file.test.ts` — NEW. Uwaga środowiskowa: w Node `Worker` nie istnieje → `compressDocument`/`decompressDocument` reject → `exportVctFile`/`importVctFile` przechodzą na fallback uncompressed (vct-file.ts:21-23, :35-37) — test pokrywa ścieżkę fallbacku; ścieżka skompresowana pozostaje bez pokrycia (odnotowane ograniczenie).

```ts
import { describe, it, expect } from 'vitest';
import { exportVctFile, importVctFile } from '../src/vct/vct-file.js';
import { createDefaultDocument } from '@vectoria/core';
import { CreateObjectsCommand } from '@vectoria/core';

it('export → import round-trips the document (uncompressed fallback in Node)', async () => {
  let doc = createDefaultDocument({ name: 'T', width: 800, height: 600 });
  doc = new CreateObjectsCommand([/* prostokąt z pełnym stylem */]).execute(doc);
  const blob = await exportVctFile(doc);
  const file = new File([blob], 'test.vct', { type: 'application/x-vectoria-vct' });
  const restored = await importVctFile(file);
  expect(restored.name).toBe('T');
  expect(restored.schemaVersion).toBe(doc.schemaVersion);
});

it('import rejects corrupted file without partial state', async () => {
  const file = new File(['not json'], 'broken.vct');
  await expect(importVctFile(file)).rejects.toThrow();
});
```

`test/file-drop-importer.test.ts` — dopisać case `.jpg`/`.webp` przez wspólną gałąź obrazu (wzór: istniejący test PNG `:71-84`).

---

## 6. KOD — Faza 4: apps/web

### 6.1 `PropertiesPanel.tsx` — naprawa no-op

Destructure (linia ~86, po `onReorder`):

```tsx
  onUpdateArtboard,
  onUpdateUnit,
  onExecuteCommand,
```

Linia 819:

```tsx
          <DocumentProperties document={doc} onExecuteCommand={onExecuteCommand ?? (() => {})} />
```

Ale poprawnie: wywołanie tylko gdy executor istnieje — brak executora = nie renderuj interaktywnych kontrolek? Decision: RightDock zawsze przekazuje `onExecuteCommand` (RightDock.tsx:289), więc `onExecuteCommand` jest dostępny; fallback no-op usuwamy i typ zmieniamy na wymagany w wywołaniu:

```tsx
        ) : onExecuteCommand ? (
          <DocumentProperties document={doc} onExecuteCommand={onExecuteCommand} />
        ) : null
```

`onUpdateArtboard`/`onUpdateUnit` — dokumentowe operacje idą przez `DocumentProperties` (komendy); propsy zostają w interfejsie (RightDock przekazuje), nieużywane — bez zmian, bez lint-unused (nie destrukturyzować `onUpdateArtboard`/`onUpdateUnit`, jeśli nieużywane; destrukturyzujemy tylko `onExecuteCommand`).

**Korekta:** destrukturyzujemy wyłącznie `onExecuteCommand`.

### 6.2 `EditorApp.tsx` — skróty przez ShortcutManager

Import:

```ts
import { ShortcutManager, DEFAULT_SHORTCUTS, SHORTCUT_ACTIONS, type ShortcutBinding } from '@vectoria/editor-engine';
```

Zamiana linii 222:

```ts
  const { shortcuts, isLoaded, saveShortcuts, resetShortcuts } = useShortcutSettings(DEFAULT_SHORTCUTS as ShortcutBinding[]);
```

(`useShortcutSettings` otrzymuje `ShortcutSetting[]` — typ zgodny; przeładuj import typu.)

Manager (po definicji `isMacPlatform` — już istnieje, używany w `:1422`):

```ts
  const shortcutManager = useMemo(
    () => new ShortcutManager(shortcuts, isMacPlatform()),
    [shortcuts],
  );
```

`useShortcutSettings` — useEffect zależny od `defaultShortcuts`; aby nie zapętlać, przekazać stabilną referencję: `const DEFAULTS = DEFAULT_SHORTCUTS` modułowo w hooku (zmienna modułowa). W pliku hooka: `const DEFAULT_SHORTCUTS_REF = DEFAULT_SHORTCUTS;` i domyślny parametr `defaultShortcuts: ShortcutSetting[] = DEFAULT_SHORTCUTS_REF`. Wtedy `useShortcutSettings()` bez argumentów.

Handler akcji — wyciągnięcie z if/else (pełna mapa zachowań z `:1413-1516`):

```ts
  const runShortcutAction = useCallback((actionId: string, e: KeyboardEvent) => {
    switch (actionId) {
      case 'clipboard.copy': handleCopy(); break;
      case 'clipboard.cut': handleCut(); break;
      case 'clipboard.paste': handlePaste(); break;
      case 'clipboard.paste-in-place': handlePaste('in-place'); break;
      case 'clipboard.paste-all-artboards': handlePaste('all-artboards'); break;
      case 'edit.duplicate': handleDuplicate(); break;
      case 'edit.group': handleGroup(); break;
      case 'edit.ungroup': handleUngroup(); break;
      case 'edit.repeat-transform': handleRepeatTransform(); break;
      case 'edit.undo': handleUndo(); break;
      case 'edit.redo': handleRedo(); break;
      case 'edit.outline-mode': handleToggleOutlineMode(); break;
      case 'view.solo-layer': if (doc?.activeLayerId) handleToggleSoloLayer(doc.activeLayerId); break;
      case 'view.find-replace': setFindReplaceOpen(true); break;
      case 'view.command-palette': setCommandPaletteOpen(true); break;
      case 'view.zoom-100': handleZoom100(); break;
      case 'view.fit-artboard': handleFitArtboard(); break;
      default:
        if (actionId.startsWith('tool.')) {
          const tool = actionId.slice(5);
          setActiveTool(tool as ActiveTool);
        }
        break;
    }
    if (actionId !== 'clipboard.copy' && actionId !== 'clipboard.cut' && actionId !== 'clipboard.paste'
      && actionId !== 'clipboard.paste-in-place' && actionId !== 'clipboard.paste-all-artboards') {
      e.preventDefault();
    }
  }, [/* wszystkie handle* */]);
```

Nowy keydown effect (zastępuje `:1413-1516`):

```ts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const actionId = shortcutManager.match(e);
      if (!actionId) {
        if (e.key === 'Escape' && soloLayerId) setSoloLayerId(null);
        return;
      }
      runShortcutAction(actionId, e);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcutManager, runShortcutAction, soloLayerId]);
```

Semantyka zachowana: guard input-focus w `shouldIgnoreKeydown` (engine `:62-66`) — równoważny staremu checkowi `:1415-1420`; cmd+C/X/V bez preventDefault (clipboard natywny) jak w starym kodzie.

### 6.3 `EditorApp.tsx` — paste in place / all artboards

`handlePaste` rozbudowany o tryb:

```ts
  const handlePaste = useCallback((mode: 'offset' | 'in-place' | 'all-artboards' = 'offset') => {
    if (!doc) return;
    const pasteFragment = (fragment: import('@vectoria/core').ClipboardFragment) => {
      const artboardIds = mode === 'all-artboards'
        ? Object.values(doc.artboards).map((a) => a.id)
        : [];
      handleExecuteCommand(new PasteObjectsCommand(fragment, doc.activeLayerId, mode, artboardIds));
    };
    void readFromSystemClipboard().then(systemFragment => {
      if (systemFragment) {
        if (systemFragment.fragment) pasteFragment(systemFragment.fragment);
        else if (systemFragment.svgText && mode === 'offset') {
          const file = new File([systemFragment.svgText], 'Pasted SVG.svg', { type: 'image/svg+xml' });
          void importController.start(file);
        }
        return;
      }
      if (clipboardRef.current.length > 0) pasteFragment(createClipboardFragment(clipboardRef.current));
    });
  }, [doc, handleExecuteCommand, importController]);
```

Import SVG ze schowka tylko przy zwykłym paste (decyzja: paste-in-place nie otwiera import-dialogu).

### 6.4 `EditorApp.tsx` — Select Same nowe targety + registry

`commandRegistry` (po `select.same-fill`):

```ts
    r.register({ id: 'select.same-stroke', title: 'Zaznacz takie same: obrys', enabled: () => selectedObjectIds.length === 1, execute: () => handleSelectSame('stroke') });
    r.register({ id: 'select.same-font', title: 'Zaznacz takie same: czcionka', enabled: () => selectedObjectIds.length === 1, execute: () => handleSelectSame('font') });
    r.register({ id: 'select.same-size', title: 'Zaznacz takie same: rozmiar', enabled: () => selectedObjectIds.length === 1, execute: () => handleSelectSame('size') });
    r.register({ id: 'select.same-opacity', title: 'Zaznacz takie same: krycie', enabled: () => selectedObjectIds.length === 1, execute: () => handleSelectSame('opacity') });
    r.register({ id: 'select.same-type', title: 'Zaznacz takie same: typ obiektu', enabled: () => selectedObjectIds.length === 1, execute: () => handleSelectSame('type') });
    r.register({ id: 'edit.paste-in-place', title: 'Wklej na miejscu', shortcut: '⇧⌘V', enabled: () => true, execute: () => handlePaste('in-place') });
    r.register({ id: 'edit.paste-all-artboards', title: 'Wklej na wszystkich artboardach', enabled: () => true, execute: () => handlePaste('all-artboards') });
```

Typ `handleSelectSame` poszerza się automatycznie (SelectSameTarget z core).

### 6.5 `EditorApp.tsx` — Replace Style (PROD-023)

```ts
  const handleReplaceStyles = useCallback((updates: ReadonlyMap<ObjectId, Partial<ObjectStyle>>) => {
    if (updates.size === 0) return;
    handleExecuteCommand(new ReplaceStylesBatchCommand(updates));
  }, [handleExecuteCommand]);
```

Import: `ReplaceStylesBatchCommand` z `@vectoria/core` (eksport z 3.3). Przekazać do `FindReplaceDialog`:

```tsx
  <FindReplaceDialog
    document={doc}
    isOpen={findReplaceOpen}
    onClose={() => setFindReplaceOpen(false)}
    onSelectObject={handleSelectObject}
    onReplaceMatch={...}
    onReplaceAll={...}
    onReplaceStyles={handleReplaceStyles}
  />
```

### 6.6 `FindReplaceDialog.tsx` — zakładka Style

Nowe propsy:

```ts
import { findObjectsByStyleCriteria } from '@vectoria/core';
import type { FindStyleCriteria } from '@vectoria/core';

export interface FindReplaceDialogProps {
  // ...istniejące...
  onReplaceStyles?: (updates: ReadonlyMap<ObjectId, Partial<ObjectStyle>>) => void;
}
```

Stan: `tab: 'text' | 'style'`. Zakładka Style:

```tsx
  const [styleCriteria, setStyleCriteria] = useState<FindStyleCriteria>({});
  const [stylePatch, setStylePatch] = useState<Partial<ObjectStyle>>({});

  const styleMatches = useMemo(
    () => (isOpen && tab === 'style' ? findObjectsByStyleCriteria(doc, styleCriteria) : []),
    [doc, styleCriteria, isOpen, tab],
  );
```

UI: pola fillColor (input color), strokeWidth (number), opacity (0–1 step 0.05), fontFamily (text) — każde opcjonalne; replace fields: fillColor/opacity; przycisk `Replace` disabled gdy `styleMatches.length === 0` lub patch pusty:

```tsx
  const applyStyleReplace = () => {
    const updates = new Map<ObjectId, Partial<ObjectStyle>>();
    for (const m of styleMatches) updates.set(m.objectId, stylePatch);
    onReplaceStyles?.(updates);
  };
```

Dostępność: `role="tablist"`/`role="tab"`, aria-selected, focus-visible (klasy dialog-label istnieją).

### 6.7 `AppMenuBar.tsx`

Edycja (po "Wklej"):

```tsx
        <MenuItem label="Wklej na miejscu" shortcut="⇧⌘V" onClick={() => run(() => onPasteInPlace?.())} />
        <MenuItem label="Wklej na wszystkich artboardach" onClick={() => run(() => onPasteAllArtboards?.())} />
```

Obiekt (po fill-stroke):

```tsx
        <MenuItem label="Zaznacz podobne: Czcionka" disabled={selectedObjectIds.length !== 1} onClick={() => run(() => onSelectSame('font'))} />
        <MenuItem label="Zaznacz podobne: Rozmiar" disabled={selectedObjectIds.length !== 1} onClick={() => run(() => onSelectSame('size'))} />
        <MenuItem label="Zaznacz podobne: Krycie" disabled={selectedObjectIds.length !== 1} onClick={() => run(() => onSelectSame('opacity'))} />
        <MenuItem label="Zaznacz podobne: Typ" disabled={selectedObjectIds.length !== 1} onClick={() => run(() => onSelectSame('type'))} />
```

Typ `onSelectSame` w propsach menu rozszerzyć do pełnego `SelectSameTarget`. Widok (presety):

```tsx
        <MenuItem label="Zapisz układ jako preset…" onClick={() => run(() => onSaveLayoutPreset?.())} />
```

### 6.8 `CommandPalette.tsx` — enabled/enabledReason + focus trap

Nowy props:

```ts
import type { EditorContext } from '@vectoria/editor-engine';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: EditorCommand[];
  ctx: EditorContext | null;
  onExecute: (commandId: string) => void;
}
```

Render pozycji:

```tsx
          filteredCommands.map((cmd, idx) => {
            const enabled = ctx ? cmd.enabled(ctx) : true;
            const reason = ctx ? cmd.enabledReason?.(ctx) : undefined;
            return (
              <div
                key={cmd.id}
                role="option"
                aria-selected={idx === selectedIndex}
                aria-disabled={!enabled}
                onClick={() => {
                  if (!enabled) return;
                  onExecute(cmd.id);
                  onClose();
                }}
                style={{
                  padding: '12px 16px',
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  opacity: enabled ? 1 : 0.5,
                  /* ...istniejące style... */
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span style={{ color: 'var(--color-text-primary, #fff)' }}>{cmd.title}</span>
                {!enabled && reason && <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #aaa)' }}>{reason}</span>}
                {cmd.shortcut && (/* badge bez zmian */)}
              </div>
            );
          })
```

Enter w `handleKeyDown`: execute tylko gdy `enabled`. Focus trap: `role="dialog" aria-modal` + Tab pętla między inputem a listą:

```tsx
    } else if (e.key === 'Tab') {
      e.preventDefault(); // pojedynczy focusowalny input — trap przez ignorowanie Tab
    }
```

(Prosty poprawny trap dla jednopolowego dialogu; pełny cycle niepotrzebny.)

EditorApp przekazuje `ctx`:

```ts
  const paletteCtx = useMemo<EditorContext | null>(() => doc ? {
    doc,
    selection: { objectIds: selectedObjectIds, nodeIds: [], mode: 'object' },
    execute: handleExecuteCommand,
    report: () => {},
  } : null, [doc, selectedObjectIds, handleExecuteCommand]);
```

(`SelectionState` kształt: `{ objectIds, nodeIds, mode }` — zgodnie z PropertiesPanel default `:87`.)

### 6.9 `ShortcutConfigDialog.tsx` — lista z defaults

Props: dodać `actions: readonly ShortcutActionMeta[]`, `bindings: readonly ShortcutBinding[]`, `onRebind(actionId, combo)`, `onReset()`. Render listę `SHORTCUT_ACTIONS` z bieżącym combo z `bindings` (nie pusta lista), capture jak dotychczas; conflict → `manager.conflicts(combo)` przez callback `onConflictCheck` lub lokalnie nowy manager. Decision: dialog otrzymuje gotowe `bindings` + callbacki; logika conflicts w EditorApp (jeden manager source of truth).

### 6.10 `useLayoutPresets.ts` — apply

Dodać:

```ts
  const applyPreset = useCallback((preset: LayoutPreset) => {
    try {
      localStorage.setItem('vectoria.workspace-layout.v1', JSON.stringify(preset));
    } catch (e) {
      console.warn('Failed to apply layout preset.', e);
    }
  }, []);
  return { presets, savePreset, removePreset, applyPreset };
```

EditorApp: stan layoutu (rightDockOpen/activePanel/theme) — po apply odczyt przez istniejący efekt inicjalizujący (sprawdzić klucz przy implementacji; jeśli klucz inny — użyć faktycznego). Menu „Zapisz układ jako preset…" → `savePreset({ id: crypto.randomUUID(), name: `Preset ${presets.length + 1}`, rightDockOpen, activePanel, theme })`. Walidacja corrupted JSON już w hooku (`:16-32`).

### 6.11 `useShortcutSettings.ts` — stabilne defaults

```ts
import { DEFAULT_SHORTCUTS } from '@vectoria/editor-engine';
import type { ShortcutBinding } from '@vectoria/editor-engine';

const DEFAULTS: ShortcutBinding[] = DEFAULT_SHORTCUTS as ShortcutBinding[];

export function useShortcutSettings(defaultShortcuts: ShortcutSetting[] = DEFAULTS) { /* ciało bez zmian */ }
```

EditorApp: `useShortcutSettings()` — brak pustej tablicy.

### 6.12 e2e `editor.spec.ts` — nowe scenariusze

1. **Unit switch**: otwórz Properties bez selekcji → zmień unit na `mm` → expect `SetDocumentUnitCommand` efekt (statusbar unit = mm) → undo → px.
2. **Paste in place**: narysuj rect, copy, przesuń kamerę, Cmd+Shift+V → nowy obiekt na tej samej pozycji world; undo usuwa.
3. **Select Same font**: dwa teksty Arial + jeden Inter → menu Obiekt → Czcionka → 2 zaznaczone.
4. **Shortcut remap**: otwórz config, zmień `tool.pen` na inne combo, zamknij → stare combo nie aktywuje pióra, nowe tak; reset przywraca.
5. **Import AI**: drop fikcyjnego `.ai` (`%!PS-Adobe-3.0`) → raport unsupported, commit disabled, dokument niezmieniony.
6. **Replace Style**: dwa recty `#ff0000` → zakładka Style fill=#ff0000 → replace na `#00ff00` → 2 obiekty zmienione; undo przywraca.

---

## 7. Invariants (jawna lista)

1. Paste tworzy nowe IDs; ownership/layer/z-order wg ADR_010; locked sources pomijane.
2. Select Same: tolerancja `1e-6`, normalizacja koloru, wynik bez locked/hidden/ukrytych warstw.
3. Replace Style: 1 komenda = 1 wpis historii; opacity ∈ [0,1] walidowane w komendzie.
4. Duplicate: delta walidowana `Number.isFinite`; `isValidTransform` na kopi.
5. Skróty: `shouldIgnoreKeydown` blokuje input/textarea/select/contenteditable.
6. Sanitizer: `data:` tylko raster allowlista; `vbscript:` zawsze strip; embedded raster import niezmieniony.
7. Import report: editable+simplified+flattened+unsupported = liczba elementów źródłowych.
8. Błąd eksportu/importu nie mutuje aktywnego dokumentu (istniejące flow `useImportController` — cancel → zero mutation).
9. Corrupted localStorage (shortcuts/presety) → reset do defaults, bez crasha.

## 8. Error/cancel/recovery

- Apply Replace Style na pustym wyniku → przycisk disabled, brak komendy.
- Paste all-artboards bez artboardów → `artboardIds=[]` → komenda no-op (zachowanie istniejące `:57`).
- Bind na zajęte combo → `bind` zwraca false → dialog pokazuje konflikt (istniejący flow `:conflict confirm`).
- `.ai` z garbage header → throw → `useImportController` pokazuje error, dokument nietknięty.
- Worker compress niedostępny (Node/test) → fallback uncompressed (istnieje, testowany).

## 9. Zależności międzyepiczne

- FindReplaceDialog Style → eksport `ReplaceStylesBatchCommand` (Faza 1.3) — **sekwencja: core przed web**.
- ShortcutManager runtime → ADR_011 (storage) istnieje; hook `useShortcutSettings` gotowy.
- Paste modes → `PasteObjectsCommand` gotowy (paste-commands.ts:7-44), ADR_010 policy gotowa.
- Sanitizer allowlista → EPIC-12 embedded raster (DONE) — test regresji obowiązkowy.
- Select Same → renderer/hit-test nietknięte; query tylko do selekcji.

## 10. Ryzyko regresji + testy regresji

| Zmiana | Dotyka DONE | Mitigacja |
|---|---|---|
| Przepisanie keydown na ShortcutManager | EPIC-04/05/10 narzędzia, undo/redo, palette | defaults = 1:1 stare mapowanie; cała istniejąca e2e przechodzi bez zmian; nowe testy managera |
| Executor w DocumentProperties | brak (był no-op) | e2e unit-switch |
| Sanitizer data: | EPIC-12 embedded images | test: png data URI przetrwa import |
| selectSame rewrite | EPIC-14 menu fill/stroke | stare 2 testy przechodzą (semantyka zachowana: raw equal ⊂ normalized) |
| Palette enabled | EPIC-14 palette | e2e: enabled commands nadal wykonywalne |

## 11. Decyzje rozstrzygnięte

1. PDF-wektory — poza scope (etap 0.2).
2. AI import — honest-unsupported.
3. SelectSameTarget — rozszerzenie enumu, bez ADR.
4. Duplicate — parametr delta, kompatybilny wstecz.
5. Locked/hidden — wyłączone z Select Same.
6. `data:image/svg+xml` — blokowane.
7. Paste SVG ze schowka — tylko zwykły paste (offset), nie in-place/all-artboards.
8. Escape (solo exit) — poza ShortcutManagerem (modal-cancel).
9. Radial/angular/pattern fill w Select Same — zgodność typu wystarcza (dokumentowane uproszczenie).
10. Gradient fill — porównanie stopów (offset+normalizowany kolor), geometria ignorowana.

## 12. Comment rules

JSDoc (CO/DLACZEGO) na: `selectSame` (nowe targety, tolerancja), `DuplicateTransformCommand`, `aiProvider`, blok sanitizer data-URI, `SHORTCUT_ACTIONS`/`DEFAULT_SHORTCUTS`. Usunięte: deliberacyjne komentarze `duplicate-transform-command.ts:21-33` (zastąpione implementacją), zbędny if `honest-unsupported-providers.ts:33-35`.

## 13. Kolejność realizacji

1. **Faza 1** core (3.1–3.4) + `pnpm --filter @vectoria/core test`
2. **Faza 2** engine (4.1–4.2) + `pnpm --filter @vectoria/editor-engine test`
3. **Faza 3** io (5.1–5.5) + `pnpm --filter @vectoria/io test`
4. **Faza 4** web (6.1–6.12)
5. **Faza 5** BACKLOG + pełne bramki

## 14. Quality gates (każda faza + finał)

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @vectoria/web test:e2e
pnpm build
```

## 15. Test matrix — podsumowanie

- **Unit**: select-same (7 nowych), paste (3 nowe), duplicate (2 nowe), replace-styles (3), clipboard round-trip (2), shortcut-manager (4), sanitizer-uri (4), import-report (2), vct-file (2), file-drop jpg/webp (2).
- **E2E**: 6 nowych scenariuszy (6.12) + cała istniejąca suita zielona.
- **Visual/perf**: brak infra visual w repo (odnotowane); brak zmian hot-path.
- **Znane ograniczenia**: skompresowana ścieżka .vct bez testu w Node (fallback pokryty); radial/angular/pattern Select Same uproszczone do zgodności typu; Space-pan w CanvasViewport poza ShortcutManagerem (osobny handler, zachowany).
