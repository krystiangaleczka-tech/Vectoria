# PLAN: EPIC-18 UX i dostępność

> Data: 2026-09-03
> Źródła: `BACKLOG.md:612-635` (UX-001..023), `DESIGN_SYSTEM.md`, audyt kodu 2026-09-03.
> Cel: pełna dostępność (keyboard, focus, ARIA, kontrast, skala), input dotykowy/rysik, confirmacje destrukcyjne, onboarding.

---

## 1. Rezultat użytkownika i granica scope

**Użytkownik dostanie:** w pełni obsługiwany z klawiatury edytor (canvas fokusable, select-all), zawsze widoczne focus ringi, spójne dialogi z focus trapem, skalowanie UI, tryb wysokiego kontrastu, pełne wsparcie touch/pincha/rysika (większe hitboxy, eraser-end), jednolite potwierdzenia destrukcyjne (usunięcie warstwy/artboardu/palety/stylu/projektu), onboarding + tutoriale (shortcuts, Pen, Node).

**Wchodzi:** UX-001..020, UX-022, UX-023 (dopięcie do wzorca), UX-021 (ZALEŻNE od EPIC-17 SAAS-002 — stub na DocumentTabs do czasu galerii projektów).
**Nie wchodzi:** backend, zmiany silnika renderu, i18n.

## 2. Status audytu vs kod

| Task | Status | Dowód |
|---|---|---|
| UX-001 pełna klawiatura | PARTIAL | 34 akcje + manager (`shortcut-manager.ts`), input guard `:68-73`; canvas bez `tabIndex`/keyboard (`CanvasViewport.tsx:1703-1787`); „Zaznacz wszystko" disabled (`AppMenuBar.tsx:150`) |
| UX-002 focus management | PARTIAL | trapy: `NewDocumentDialog.tsx:31-54`, `WebFontImportDialog.tsx:34-61`, geometry confirm `EditorApp.tsx:1049-1072`; brak: ImportDialog, FindReplaceDialog, ShortcutConfigDialog; brak wspólnego Dialog primitive |
| UX-003 focus ringi | PARTIAL | reguły `editor.css:16-137`, token `themes.css:27,118`; **`IconButton.tsx:37` inline `outline:'none'` tłumi ring na przyciskach narzędzi** |
| UX-004 tooltipy z nazwą | DONE | `Tooltip.tsx:9-11`, `IconButton.tsx:42,47`, `ToolRail.tsx:14-20` |
| UX-005 skrót w tooltipie | DONE | `IconButton.tsx:42` `title = "Label (shortcut)"` |
| UX-006 ARIA | PARTIAL | dialogi z role/aria-modal; **StatusBar zero aria (`StatusBar.tsx:35-81`)**; **canvas bez aria-label/tabIndex (`CanvasViewport.tsx:1703-1787`)** |
| UX-007 jasny motyw | DONE | `themes.css:96-148`, persist `EditorApp.tsx:209,279-284` |
| UX-008 ciemny motyw | DONE | `themes.css:1-94`, `index.html:2` |
| UX-009 skalowanie UI | MISSING | zero rem/font-scale; px wszędzie |
| UX-010 wysoki kontrast | MISSING | brak |
| UX-011 touch | PARTIAL | Pointer Events + `touchAction:'none'` (`CanvasViewport.tsx:683,1730`); zero touch-specific UX |
| UX-012 rysik/Pencil | PARTIAL | pressure w freehand (`CanvasViewport.tsx:767-768,1022-1023,1140`, `freehand-tools.ts:16,45,51`); brak pointerType detect, eraser-end |
| UX-013 większe hitboxy | MISSING | hit-test tylko zoom-tolerance (`CanvasViewport.tsx:863,876`) |
| UX-014 pinch-to-zoom | MISSING | grep pinch/touches = 0; wheel zoom jest (`:664-680`) |
| UX-015 kontekstowy toolbar | DONE | `ContextualControlBar.tsx:60-95`, render `EditorApp.tsx:1718` |
| UX-016 onboarding | MISSING | grep = 0 |
| UX-017 tutorial 1. dokumentu | MISSING | — |
| UX-018 tutorial skrótów | MISSING | config ≠ tutorial (`ShortcutConfigDialog.tsx:93-131`) |
| UX-019 tutorial Pen | MISSING | — |
| UX-020 tutorial Node | MISSING | — |
| UX-021 confirm usunięcia projektu | MISSING (zależny od EPIC-17) | brak konceptu projektu (`DocumentTabs.tsx:10-14`) |
| UX-022 confirm destrukcyjne | PARTIAL | tylko geometry expand (`EditorApp.tsx:1032,1899`) + native `confirm()` x2 (`AppearancePanel.tsx:92`, `ShortcutConfigDialog.tsx:63`); delete layer/artboard/palette/style **bez potwierdzenia** (`LayersPanel.tsx:474-475`, `ArtboardsPanel.tsx:34`, `PalettesPanel.tsx:100`, `ObjectStylesPanel.tsx:43`) |
| UX-023 ostrzeżenie text→curves | DONE | pełny dialog + focus trap + e2e (`editor.spec.ts:419`) — wzorzec dla UX-022 |

## 3. Zmiany kontraktu domenowego

**Żadnych zmian `DocumentModel`, komend domenowych, renderer, store.** Nowe:
- `packages/ui`: `Dialog` (focus trap, Escape, aria) i `ConfirmDialog` — komponenty UI, brak ADR.
- `packages/editor-engine`: `HitToleranceProvider`-like funkcja tolerancji w narzędziach (parametr istniejących hit-testów, brak zmiany kontraktów engine — tolerancja w px ekranowych już jest parametrem, reguła §4 AGENTS).
- **Zero ADR wymagane** (brak zmian granic pakietów: ui dostaje komponenty, web je konsumuje).

## 4. Pliki per warstwa

### packages/ui
| Plik | Op. | Zmiana |
|---|---|---|
| `src/primitives/IconButton.tsx` | MODIFY | usunięcie inline `outline:'none'` (`:37`), focus-visible z tokenu `--color-border-focus` |
| `src/primitives/Dialog.tsx` | NEW | wspólny dialog: role/aria-modal, focus trap (Tab cycle + powrót do triggera), Escape close, `aria-labelledby`, portal |
| `src/primitives/ConfirmDialog.tsx` | NEW | potwierdzenie na bazie Dialog: title, description, confirm label, destructive wariant (kolor z tokenu `--color-danger` jeśli istnieje w themes.css, inaczej jawne dodanie tokena) |
| `src/primitives/Tooltip.tsx` | MODIFY | wizualny tooltip także dla enabled (dziś tylko disabled `ToolRail.tsx:58`) z label + shortcut |
| `src/index.ts` | MODIFY | eksporty |
| `test/Dialog.test.tsx` | NEW | jsdom: trap, Escape, powrót focusu, aria |
| `test/ConfirmDialog.test.tsx` | NEW | onConfirm/onCancel, destructive aria |

### packages/editor-engine
| Plik | Op. | Zmiana |
|---|---|---|
| `src/tools/hit-tolerance.ts` | NEW | `hitTolerancePx(pointerType, zoom, base)` — touch/pen ×2.5, min w px ekranowych (reguła §4: tolerancja ekranowa) |
| `test/hit-tolerance.test.ts` | NEW | mouse/touch/pen, extreme zoom |

### packages/core — brak zmian (select-all przez istniejące `handleSelectObjects`).

### apps/web
| Plik | Op. | Zmiana |
|---|---|---|
| `src/features/canvas/CanvasViewport.tsx` | MODIFY | (a) kontener: `tabIndex={0}`, `role="application"`, `aria-label`, obsługa klawiszy strzałek = nudge zaznaczenia (komenda transform — 1 komenda na burst z debounce), (b) pinch-to-zoom (2 pointery, cache), (c) `hitTolerancePx` w `hitHandle`/`hitNode` (`:863,876`), (d) pointerType eraser-end |
| `src/features/statusbar/StatusBar.tsx` | MODIFY | `role="status" aria-live="polite"` na wartościach, aria-label sekcji |
| `src/features/dialogs/ImportDialog.tsx` | MODIFY | refactor na `Dialog` (trap) |
| `src/features/dialogs/FindReplaceDialog.tsx` | MODIFY | refactor na `Dialog` |
| `src/features/dialogs/ShortcutConfigDialog.tsx` | MODIFY | refactor na `Dialog` + zamiana native `confirm()` (`:63`) na `ConfirmDialog` |
| `src/features/palette/CommandPalette.tsx` | MODIFY | focus trap przez `Dialog` (zachowanie Cmd+K bez zmian funkcjonalnych) |
| `src/features/panels/AppearancePanel.tsx` | MODIFY | native `confirm()` (`:92`) → `ConfirmDialog` |
| `src/features/panels/LayersPanel.tsx` | MODIFY | delete layer → `ConfirmDialog` (`:474-475`) |
| `src/features/panels/ArtboardsPanel.tsx` | MODIFY | delete artboard → `ConfirmDialog` (`:34`) |
| `src/features/panels/PalettesPanel.tsx` | MODIFY | delete palette → `ConfirmDialog` (`:100`) |
| `src/features/panels/ObjectStylesPanel.tsx` | MODIFY | delete style → `ConfirmDialog` (`:43`) |
| `src/features/topbar/AppMenuBar.tsx` | MODIFY | włączenie „Zaznacz wszystko" (Cmd+A), menu: Skalowanie UI (0.85/1/1.15/1.3), Wysoki kontrast (toggle), Tutoriale (4 pozycje) |
| `src/app/EditorApp.tsx` | MODIFY | select-all handler, `--ui-scale` + `data-contrast` persist (wzorzec theme `:279-284`), nudge komenda, onboarding state |
| `src/features/onboarding/OnboardingChecklist.tsx` | NEW | UX-016: checklist pierwszych kroków (nowy dokument → narysuj → styl → eksport), dismiss localStorage |
| `src/features/onboarding/TutorialOverlay.tsx` | NEW | silnik tutoriali: kroki {targetSelector?, title, body}, highlight, Next/Back/Escape, progress |
| `src/features/onboarding/tutorials.ts` | NEW | dane: shortcuts (UX-018), first-document (UX-017), pen (UX-019), node (UX-020) — dane walidowane, nie HTML |
| `src/hooks/useUiPreferences.ts` | NEW | uiScale, contrast, tutorialSeen — localStorage, walidacja, corrupted → reset (wzorzec `useLayoutPresets.ts:16-32`) |
| `e2e/a11y.spec.ts` | NEW | scenariusze z sekcji 10 |

### Style
| Plik | Op. | Zmiana |
|---|---|---|
| `packages/ui/src/tokens/themes.css` | MODIFY | (a) `:root { --ui-scale: 1 }`, (b) `[data-contrast='high']` — wzmocnione `--color-*` (tekst #fff/#000, border 2px, focus 3px), (c) `--color-danger` jeżeli brak |
| `apps/web/src/app/editor.css` | MODIFY | `#root { zoom: var(--ui-scale) }` + fallback `@supports not (zoom: 1) { font-size scaling }`, focus-visible na `.canvas-viewport:focus-visible` |

## 5. KOD — kluczowe fragmenty

### 5.1 UX-003: `IconButton.tsx:37`

Usunąć `outline: 'none'` z inline style; dodać:

```tsx
  focusRing: { outline: 'none' },
```
→ zamiast tego klasa + CSS:

```css
.vectoria-icon-button:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}
```

Zakaz `!important` — inline styl usuwamy, nie nadpisujemy.

### 5.2 UX-002: `Dialog.tsx` (szkielet)

```tsx
import React, { useRef, useEffect } from 'react';

export interface DialogProps {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

/** Modal dialog: focus trap + Escape + focus return. A11y contract of DESIGN_SYSTEM. */
export const Dialog: React.FC<DialogProps> = ({ labelledBy, onClose, children, width = 640 }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(
      'input, button, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
    return () => previous?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab') return;
    const focusables = ref.current?.querySelectorAll<HTMLElement>(
      'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const list = Array.from(focusables);
    const first = list[0]!, last = list[list.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  };

  return (
    <div role="presentation" onKeyDown={onKeyDown}
      style={{ position: 'fixed', inset: 0, background: 'var(--color-overlay, rgba(0,0,0,.5))', display: 'grid', placeItems: 'center', zIndex: 10000 }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        style={{ width, maxWidth: '95vw', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-dialog)' }}>
        {children}
      </div>
    </div>
  );
};
```

Refaktory 4 dialogów zachowują treść; usuwają własne trapy/kopie. `NewDocumentDialog` zostaje (ma własny, zgodny trap) — decyzja: nie ruszać działającego.

### 5.3 UX-014: pinch-to-zoom w `CanvasViewport.tsx`

Pointer cache (obok `:683` pointerDown):

```tsx
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);

  // w pointerdown: activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  // w pointerup/cancel: delete + pinchRef.current = null;

  // w pointermove przed resztą logiki:
  if (activePointersRef.current.has(e.pointerId)) {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  if (activePointersRef.current.size === 2) {
    const [a, b] = [...activePointersRef.current.values()];
    const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    const center = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
    const rect = containerRef.current!.getBoundingClientRect();
    if (pinchRef.current) {
      const factor = dist / pinchRef.current.dist;
      camera.zoomAtPoint(factor, { x: center.x - rect.left, y: center.y - rect.top });
      camera.panBy({ x: center.x - pinchRef.current.center.x, y: center.y - pinchRef.current.center.y });
      invalidate();
    }
    pinchRef.current = { dist, center };
    return; // dwa palce = nigdy tool
  }
```

Pinch nie tworzy komend (camera transient — zgodne §4: pan/zoom bez historii). `setPointerCapture` per-pointer jak w pan.

### 5.4 UX-013: `hit-tolerance.ts`

```ts
export type PointerKind = 'mouse' | 'touch' | 'pen';

/** Screen-px tolerance by input kind; touch/pen need larger targets (UX-013). */
export function hitTolerancePx(pointerType: string | undefined, base = 6): number {
  if (pointerType === 'touch') return base * 2.5;
  if (pointerType === 'pen') return base * 1.75;
  return base;
}
```

Użycie: `hitHandle(..., hitTolerancePx(e.pointerType) / camera.zoom)` zamiast surowej tolerancji (`:863,876`) — istniejące wywołania już dzielą przez zoom; zachowujemy dzielenie, mnożymy bazę. `e.pointerType` przepływa z eventów do `handleHitTest` (sygnatury internal — dopasować przy implementacji bez zmiany kontraktów publicznych).

### 5.5 UX-009: skalowanie

`useUiPreferences`:

```ts
export type UiScale = 0.85 | 1 | 1.15 | 1.3;
const KEY = 'vectoria.ui-prefs.v1';
// { uiScale, contrast, tutorialsSeen: string[] } — Zod-lite walidacja, corrupted → defaults
```

Efekt w EditorApp (wzorzec theme `:279-284`):

```ts
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(prefs.uiScale));
    if (prefs.contrast === 'high') document.documentElement.dataset.contrast = 'high';
    else delete document.documentElement.dataset.contrast;
  }, [prefs]);
```

CSS: `#root { zoom: var(--ui-scale, 1); }`. Ograniczenie udokumentowane: `zoom` = Chromium/Safari/Firefox 126+; fallback `@supports not (zoom:1)` → `font-size: calc(16px * var(--ui-scale))` na body (częściowe). Skala NIE wpływa na canvas DPI ani `devicePixelRatio` renderu (zoom layoutowy, nie bitmapowy) — wariant bezpieczny; weryfikacja manualna zoom 1.3 @ DPR 2.

### 5.6 UX-010: wysoki kontrast (themes.css)

```css
[data-contrast='high'] {
  --color-text-primary: #ffffff;
  --color-text-secondary: #e6e6e6;
  --color-border-subtle: #8a8a8a;
  --color-border-focus: #ffd60a;
  --color-accent: #7cc0ff;
  /* komplet mapowany per sekcja themes.css:1-94; każdy token nadpisany jawnie */
}
[data-contrast='high'] .vectoria-button:focus-visible,
[data-contrast='high'] .vectoria-icon-button:focus-visible {
  outline-width: 3px;
}
```

Wymóg: complete override (brak mieszania domyślnych i high-contrast tokenów) — checklist do DESIGN_SYSTEM.

### 5.7 UX-022: ConfirmDialog + wiring

```tsx
export interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;      // default 'Usuń'
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

Wiring (każde usunięcie = 1 komenda, confirm przed komendą; undo dalej działa):

- `LayersPanel.tsx:474-475` — „Usunąć warstwę „{name}"? Obiekty wrócą przez Undo."
- `ArtboardsPanel.tsx:34` — analogicznie.
- `PalettesPanel.tsx:100`, `ObjectStylesPanel.tsx:43`, `AppearancePanel.tsx:92`, `ShortcutConfigDialog.tsx:63` — zamiana native confirm.
- **UX-021** (stub): `DocumentTabs` close-tab → ConfirmDialog „Zamknąć projekt? Niezapisane zmiany zostaną zapisane lokalnie." Pełny projekt-delete po EPIC-17 SAAS-002 (nota zależności w planie EPIC-17 §8).

### 5.8 UX-001: select-all + canvas keyboard

- `AppMenuBar.tsx:150`: włączyć pozycję, `onSelectAll` → `handleSelectObjects(allSelectableIds(doc))` (visible, unlocked, active layer scope — decyzja: aktywna warstwa; Cmd+A przez `SHORTCUT_ACTIONS` nowy wpis `edit.select-all` z combo `{meta+ctrl, 'a'}` — rozszerzenie defaults, kompatybilne).
- Canvas: kontener `tabIndex={0}` + `aria-label="Obszar roboczy — użyj strzałek, aby przesunąć zaznaczenie; Escape anuluje narzędzie"`; strzałki = nudge 1 px (Shift = 10 px) przez `TransformObjectsCommand` — 1 komenda na burst (debounce 300 ms), undo cofa cały burst (reguła §4: nie setki komend).

### 5.9 UX-016..020: onboarding

- `OnboardingChecklist`: 5 kroków, stan `done` wykrywany z faktów (utworzony dokument → dokument istnieje; narysowany kształt → `doc.objects` > 0; nadany styl → history ma `SetObjectStyle`; eksport → handler wywołany; shortcut → palette otwarta). Bez telemetrii.
- `TutorialOverlay`: dane kroków w `tutorials.ts` jako **walidowane dane** (nie JSX, nie HTML — reguła layout-JSON §5): `{ id, title, body, targetSelector?, placement }`. Walidacja selectorów: `document.querySelector` przy starcie kroku; brak targetu = karta centralna.
- Tutoriale: shortcuts (8 slajdów z aktualnych `SHORTCUT_ACTIONS`), first-document (6 kroków), pen (7 kroków click/drag/close/Enter/Escape — zgodne z §4 AGENTS), node (6 kroków).
- Persist: `tutorialsSeen: string[]` w `useUiPreferences`; menu Widok → „Tutoriale" relaunch.

### 5.10 UX-006: canvas + StatusBar

- Canvas: `role="application"` + `aria-label` + `aria-roledescription="edytor wektorowy"`; komunikat instrukcji jako visually-hidden `<p>`.
- StatusBar: kontener `role="status" aria-live="polite"`, każdy wskaźnik z `aria-label` (zoom, jednostka, sync, pozycja kursora jako aria-hidden — zmiana częsta, live tylko dla sync).

## 6. Invariants (jawna lista)

1. ConfirmDialog nie mutuje — mutacja dopiero `onConfirm` (1 komenda, undo działa).
2. Pinch/camera: bez komend, bez historii (§4); zoom w kursorze/pinch-center.
3. Tolerancja hit-testu w px ekranowych, zależna od zoomu i pointerType; deterministyczna.
4. `--ui-scale` nie zmienia `devicePixelRatio`, wymiarów canvasa ani `DocumentModel`.
5. Onboarding/tutorial: dane walidowane, corrupted → brak pokazania, bez crasha; zero telemetrii.
6. Focus: żaden dialog nie traci focusu poza trap; zamknięcie zwraca focus do triggera.
7. Nudge: 1 komenda na burst; `NaN`/`Infinity` niemożliwe (walidacja delta).
8. Wszystkie nowe style z tokenów `themes.css` — zero hardcoded kolorów (DESIGN_SYSTEM bezwzględny).

## 7. Error / cancel / recovery

- Tutorial: brak targetu (`querySelector` null) → karta centralna; Escape w każdym kroku zamyka bez zapisu postępu (poza `tutorialsSeen` po ukończeniu).
- `zoom` nieobsługiwany → fallback font-size; brak crasha.
- ConfirmDialog na Escape/anulowanie → zero mutacji.
- Pinch przerwany (utrata pointera) → `pinchRef=null`, brak stuck-state (pointerup/cancel/lostcapture obsłużone — `:1710-1712`).
- Corrupted `useUiPreferences` → defaults + reset storage (wzorzec `:16-32`).

## 8. Zależności międzyepiczne

- **UX-021** zależy od EPIC-17 SAAS-002 (projekty) — dostarczany stub, finalizacja w EPIC-17.
- UX-005/004 korzystają z `SHORTCUT_ACTIONS` (EPIC-14 Faza 2 plan naprawy) — jeśli naprawa EPIC-14 nie weszła, tooltipy czytają z obecnej mapy ToolRail (`:14-20`); plan EPIC-18 nie blokuje się na EPIC-14.
- UX-013 dotyka `hitHandle`/`hitNode` — narzędzia EPIC-04/05/07 (DONE): zmiana tylko mnożnika tolerancji; e2e geometrii muszą przejść bez zmian.
- UX-001 nudge dotyka `TransformObjectsCommand` (istniejący) — bez nowych komend.

## 9. Ryzyko regresji

| Zmiana | Dotyka DONE | Mitigacja |
|---|---|---|
| Refactor 4 dialogów na `Dialog` | EPIC-14/15 flows (import, find/replace, palette, shortcuts) | zachowanie funkcjonalne 1:1; e2e istniejące zielone; nowe testy Dialog |
| Hit-tolerance mnożnik | EPIC-04/05/07 narzędzia | mouse: mnożnik 1 → zero zmiany; testy jednostkowe tolerancji |
| `IconButton` focus fix | wizualne (nie funkcjonalne) | snapshot manualny dark/light |
| Cmd+A select-all | selekcja EPIC-03 | scope: aktywna warstwa, visible+unlocked; test |
| Pinch w pointer pipeline | EPIC-05/06 freehand/pen | dwa pointery = return przed logiką narzędzi; test jednopalcowy niezmieniony |

## 10. Decyzje rozstrzygnięte

1. Skalowanie: `zoom` na `#root` + fallback font-size (nie rem-migracja całego kodu).
2. Select-all scope: aktywna warstwa.
3. Piny/tutorial targets: dane + selektory, nie referencje komponentów.
4. `NewDocumentDialog` zostaje bez refactoru (działający trap).
5. UX-021 stub na DocumentTabs; finalize w EPIC-17.
6. Eraser-end Pencil: `e.pointerType === 'pen' && e.buttons === 32` → eraser narzędzie (po weryfikacji zachowania na urządzeniu referencyjnym; jeśli flaky — task out).
7. Tolerancja: touch ×2.5, pen ×1.75 (początkowe stałe; tune na urządzeniu referencyjnym).

## 11. Macierz testów

**Unit (ui, jsdom):** Dialog trap/Escape/focus-return/aria (4), ConfirmDialog (3), Tooltip enabled (1).
**Unit (engine):** hit-tolerance (mouse/touch/pen, zoom 0.1/1/10) (3).
**E2E (a11y.spec.ts):**
1. Nawigacja klawiaturą: Tab do canvas → strzałki przesuwają zaznaczenie → 1 undo cofa burst.
2. Cmd+A zaznacza wszystkie (active layer), menu enabled.
3. Focus ring: `:focus-visible` widoczny na tool button (computed outline ≠ none).
4. Dialog trap: ImportDialog — Tab cykluje, Escape zamyka, focus wraca.
5. Delete layer → ConfirmDialog → cancel = zero mutacji; confirm = usunięte + undo przywraca.
6. Theme light/dark + high-contrast toggle → `data-contrast` ustawione.
7. UI scale 1.3 → `--ui-scale` ustawione, layout bez crasha (viewport 1280×720).
8. Touch: `page.touchscreen` — pinch zmienia zoom (Playwright CDP).
9. Tutorial: otwórz Pen tutorial → 7 kroków → Escape w kroku 3 → brak postępu; ukończ → `tutorialsSeen` zapisane.
10. Onboarding checklist: nowy dokument → krok 1 done.
**Visual:** brak infra — manualna checklista dark/light/high-contrast × scale 1/1.3 (odnotowane ograniczenie).
**Perf:** pan/zoom przy tutorial-overlay aktywnym — brak degradacji (budget §8 nietknięty).

## 12. Quality gates

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @vectoria/web test:e2e && pnpm build
```

## 13. Kolejność realizacji

1. **Faza 1 — quick wins:** IconButton focus (5.1), StatusBar/canvas ARIA (5.10), hit-tolerance (5.4) + testy.
2. **Faza 2 — Dialog/ConfirmDialog:** primitive + refactor 6 dialogów + confirmacje delete (5.2, 5.7) + UX-021 stub.
3. **Faza 3 — wejście:** pinch (5.3), pointerType/eraser (5.4 usage), nudge + select-all (5.8).
4. **Faza 4 — preferencje:** useUiPreferences, scale, high-contrast (5.5, 5.6).
5. **Faza 5 — onboarding:** checklist + 4 tutoriale (5.9).
6. **Faza 6:** e2e a11y + BACKLOG + checklist DESIGN_SYSTEM (complete override kontrastu).

## 14. Comment rules

JSDoc na publicznych: `Dialog`, `ConfirmDialog`, `hitTolerancePx`, `useUiPreferences`, `TutorialOverlay` props. Bez krokowych komentarzy.
