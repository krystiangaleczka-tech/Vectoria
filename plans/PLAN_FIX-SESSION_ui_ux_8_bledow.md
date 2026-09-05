# PLAN IMPLEMENTACJI — FIX-SESSION: 8 błędów UI/UX

> Data: 2026-09-05
> Status: zatwierdzony do implementacji (po akceptacji decyzji 1–4)
> Zakres: `apps/web`, `packages/renderer`, `packages/ui` — zero zmian kontraktu domenowego, zero nowych komend.

---

## 0. Decyzje do rozstrzygnięcia (domyślne założenia)

| # | Decyzja | Domyślnie |
|---|---|---|
| D1 | Menu „Zaznacz podobne" | **Usuwane** z UI (silnik `selectSame` zostaje nietknięty) |
| D2 | Presety zoomu | `[25, 50, 75, 87, 100, 150]` — po 150 wraca do 25 |
| D3 | Zielona etykieta ΔX/ΔY | Usunięta **tylko przy przesuwaniu**; pomiary przy Alt+hover zostają |
| D4 | Repro diagnostyczne | Zgoda na dev-server + licznik zdarzeń w trakcie fazy 1 (usuwany przed finalem) |

---

## 1. Audyt — przyczyny (file:line, zweryfikowane w kodzie)

| # | Problem | Przyczyna |
|---|---|---|
| 1 | Kolory miarki | Tokeny JUŻ POPRAWNE: `packages/ui/src/tokens/themes.css:14` dark `#262624`, `:110` light `#f2f2ed`. Realny problem = odświeżanie (pkt 3) |
| 2 | Fill/Stroke: hex za blisko swatcha | `packages/ui/src/primitives/ColorControl.tsx:63` — gap 8px, hex width 78px sztywny; przy wąskich panelach elementy się zlewają |
| 3a | Motyw: canvas pod artboardem nie odświeża się | Przełącznik motywu (`apps/web/src/app/EditorApp.tsx:310-315`) zmienia `data-theme`, ale **nikt nie woła `invalidate()`** → `renderBackground` rysuje starym kolorem do pierwszego kliknięcia. Cache kolorów (`packages/renderer/src/index.ts:16-33`, unieważnianie przez `__themeGen`) — OK |
| 3b | Motyw: miarka nie odświeża się | `apps/web/src/features/canvas/CanvasRulers.tsx:43-179` — rAF-effect ma deps `[camera, unit]`, **brak `currentTheme`** → zamknięcie ma stary stan, `sig` (linia 57) się nie zmienia → brak repaintu |
| 4a | Szybki drag obiektu → wraca do punktu startu | `CanvasViewport.tsx:1711` — commit `move-object` czyta `dragPreview` **ze stanu Reacta w closure** handlera. Szybki gest: ostatni render z `setDragPreview` (DefaultLane) nie zdążył się skommitować → closure widzi `{}` → `transforms.size === 0` → komenda nie powstaje → preview znika → obiekt „wraca" |
| 4b | Szybki resize/rotate | Ten sam bug: `CanvasViewport.tsx:1726`, `:1733` czytają `dragPreview`/`stylePreview` ze stanu |
| 4c | Szybkie tworzenie kształtu | Commit (:1682-1701) czyta refs, ALE `cancelInteraction` (:1811-1813) kasuje `shapeToolRef`, wyzwalane przez `onLostPointerCapture` (:2144). Do potwierdzenia live (D4). Dodatkowo :1683 przekazuje `drag.currentWorld` jako screenPoint (world w miejsce screen) |
| 5 | Zielony napis ΔX/ΔY pod kursorem | `packages/renderer/src/index.ts:1485-1490` — `smartDistance` label, kolor `--color-smart-distance: #5acc9a` (themes.css:66). Zasilane z `CanvasViewport.tsx:517-521` (branch `move-object`) |
| 6 | Uchwyty resize rozciągają się ze skalą | `packages/renderer/src/index.ts:1817` — ctx dostaje macierz obiektu (ze scale), potem `drawResizeHandles` (:2018-2028) dzieli rozmiar tylko przez `camera.zoom` (`8/zoom`), nie przez `scale.x/scale.y` → uchwyt elonguje. To samo `drawRotationHandle` (:2003-2016) |
| 7 | „Zaznacz podobne" | `AppMenuBar.tsx:211-217` — Select Same (Inkscape/Figma: zaznacz wszystkie obiekty z tą samą wartością fill/stroke/font/size/opacity/typ). Taski PROD-016..021 DONE w backlogu; usuwamy wejście UI, silnik zostaje |
| 8 | Zoom readout | `AppMenuBar.tsx:288` — click → sztywne `onZoom100`. `Camera.setZoom(zoom, viewportSize)` istnieje (camera.ts:127, clamp MIN 1% / MAX 6400% — camera.ts:4-5) |

---

## 2. FAZA 1 — Commit-drift fix (refs) · priorytet krytyczny

**Cel**: commit gestu czyta refy, nie stan Reacta → szybki drag/create/resize/rotate działa.

### Pliki

| Plik | Op | Zmiana |
|---|---|---|
| `apps/web/src/features/canvas/CanvasViewport.tsx` | NEW | `dragPreviewRef`, `stylePreviewRef`, `pathPreviewRef` (obok stanów :311-321) |
| j.w. | MODIFY | `updateDragPreview` :312-318 → pisze także `dragPreviewRef.current` |
| j.w. | NEW | wrappery `updateStylePreview` / `updatePathPreview`; każde wywołanie `setStylePreview`/`setPathPreview` w drag-path przechodzi przez wrapper (linie: 1009, 1280, 1369, 1574-1576, 1647, 1724) |
| j.w. | MODIFY | commity czytają refy: `move-object` :1711, `rotate-object` :1726, `resize-object` :1733, `gradient-handle` :1645, `move-node` :1722, `smooth` :1574 |
| j.w. | MODIFY | `create-shape` pointerUp :1683 — `screenPoint: getPointerScreen(e)`, `worldPoint: camera.screenToWorld(screenPos)` zamiast `drag.currentWorld` |
| j.w. | MODIFY | `cancelInteraction` :1811-1813 — cancel `create-shape` tylko gdy `shapeToolRef.current?.currentState === 'drawing'` |

### Przykład kodu

```tsx
// CanvasViewport.tsx — refy
const dragPreviewRef = React.useRef<Record<string, import('@vectoria/core').Transform2D>>({});
const stylePreviewRef = React.useRef<Record<string, import('@vectoria/core').ObjectStyle>>({});
const pathPreviewRef = React.useRef<Record<string, readonly import('@vectoria/core').PathNode[]>>({});

const updateDragPreview = React.useCallback((preview) => {
  dragPreviewRef.current = preview;   // ← nowość
  setDragPreview(preview);
  onDragPreviewChange?.(preview);
}, [onDragPreviewChange]);
```

```tsx
// commit czyta ref, nie stan
} else if (drag.type === 'move-object') {
  const transforms = new Map(Object.entries(dragPreviewRef.current) as ...);  // ← było: dragPreview
  if (transforms.size > 0) {
    const moved = [...transforms.entries()].some(([id, transform]) => { ... });
    if (moved) onExecuteCommand(new TransformObjectsCommand([...transforms.keys()], transforms));
  }
  updateDragPreview({});
}
```

### Krok diagnostyczny (przed 1.5, D4)

Tymczasowy licznik `window.__vpDebug = { up: 0, lost: 0 }` w `finishInteraction` / `cancelInteraction` → `pnpm dev` → powtórzyć szybki gest create → jeśli `lost` poprzedza `up`, dodać guard. **Licznik usunięty przed finalem.**

### Testy

- e2e nowy spec `apps/web/e2e/fast-gesture.spec.ts`:
  - drag obiektu 200px <300ms → pozycja po pointerup ≠ start; dokładnie 1 wpis undo;
  - rect <300ms → obiekt istnieje w modelu.

---

## 3. FAZA 2 — Motyw refresh

### Pliki

| Plik | Op | Zmiana |
|---|---|---|
| `apps/web/src/features/canvas/CanvasViewport.tsx` | NEW | effect: MutationObserver `data-theme` → `renderLoopRef.current?.invalidate()` (wzorzec CanvasRulers.tsx:33-41, cleanup `disconnect`) |
| `apps/web/src/features/canvas/CanvasRulers.tsx` | MODIFY | :179 deps `[camera, unit]` → `[camera, unit, currentTheme]` |

### Przykład kodu

```tsx
// CanvasViewport.tsx — po zmianie motywu renderBackground/renderOverlay
// muszą przerysować kolory z CSS vars; render loop nie wie o data-theme.
useEffect(() => {
  if (typeof document === 'undefined') return;
  const observer = new MutationObserver(() => renderLoopRef.current?.invalidate());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}, []);
```

### Testy

- e2e: przełącz motyw → pixel tła canvasu zmienia się bez interakcji (dark `#1e1e1c` ↔ light `#d9d9d4`).

---

## 4. FAZA 3 — Uchwyty o stałym rozmiarze ekranowym

### Pliki

| Plik | Op | Zmiana |
|---|---|---|
| `packages/renderer/src/index.ts` | MODIFY | `drawResizeHandles` :2018 → param `scale`; `sizeX = 8/(zoom*|sx|)`, `sizeY = 8/(zoom*|sy|)`; guard `\|\| 1` |
| j.w. | MODIFY | `drawRotationHandle` :2003 → offset `20/(zoom*|sy|)`, promień `4/(zoom*sqrt(|sx*sy|))` |
| j.w. | MODIFY | wywołania :1829/:1839 (rect), :1867/:1877 (ellipse) → przekazują `obj.transform.scale` |

### Przykład kodu

```ts
function drawResizeHandles(
  ctx: CanvasRenderingContext2D, camera: Camera,
  points: readonly { x: number; y: number }[],
  scale: { x: number; y: number },
): void {
  // Uchwyty muszą mieć stały rozmiar EKRANOWY; ctx jest już przetransformowany
  // macierzą obiektu (w tym scale), więc dzielimy przez scale osiowo.
  const sizeX = 8 / (camera.zoom * Math.abs(scale.x || 1));
  const sizeY = 8 / (camera.zoom * Math.abs(scale.y || 1));
  ctx.fillStyle = themeColor('--color-node', '#ffffff');
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1 / camera.zoom;
  for (const point of points) {
    ctx.fillRect(point.x - sizeX / 2, point.y - sizeY / 2, sizeX, sizeY);
    ctx.strokeRect(point.x - sizeX / 2, point.y - sizeY / 2, sizeX, sizeY);
  }
}
```

### Invariant

Zero-scale: `Math.abs(scale.x || 1)` — brak NaN/∞ (zakaz NaN/Infinity/zero-scale z AGENTS.md §4).

### Testy

- unit (vitest, renderer): scale `{x:3, y:0.5}` → wymiary ekranowe 8×8 px; scale 0 → brak NaN;
- visual regression: snapshot uchwytów przy scale 3×.

---

## 5. FAZA 4 — Etykieta ΔX/ΔY przy przesuwaniu (D3)

### Pliki

| Plik | Op | Zmiana |
|---|---|---|
| `apps/web/src/features/canvas/CanvasViewport.tsx` | MODIFY | `renderAll` :517-521 — usunięcie branch `drag?.type === 'move-object'` z `smartDistance` (hover-Alt zostaje) |
| `packages/renderer/src/index.ts` | MODIFY | :1490 — `fillText('ΔX…ΔY…')` tylko gdy `options.smartDistance.hover` |

### Przykład kodu

```ts
if (options?.smartDistance) {
  const point = camera.worldToScreen(options.smartDistance.point);
  ctx.fillStyle = themeColor('--color-smart-distance', '#5acc9a');
  ctx.strokeStyle = themeColor('--color-smart-distance', '#5acc9a');
  ctx.font = '10px var(--font-mono)';
  // Etykieta ΔX/ΔY tylko w trybie hover-pomiary (Alt), nigdy przy przesuwaniu.
  if (options.smartDistance.hover) {
    ctx.fillText(`ΔX ${options.smartDistance.dx.toFixed(1)} · ΔY ${options.smartDistance.dy.toFixed(1)}`, point.x + 8, point.y + 16);
  }
  // ...linie odległości hover (bez zmian)
}
```

### Testy

- unit: `smartDistance` bez `hover` → brak `fillText('ΔX…')`; z `hover` → rysuje.

---

## 6. FAZA 5 — ColorControl odstępy (Fill/Stroke)

### Pliki

| Plik | Op | Zmiana |
|---|---|---|
| `packages/ui/src/primitives/ColorControl.tsx` | MODIFY | :63 `gap: '12px'`; grupa prawej kolumny `flex: 1, justifyContent: 'flex-end', minWidth: 0` |
| j.w. | MODIFY | :118 hex input: `flex: '1 1 78px', minWidth: '64px'` zamiast sztywnego `width: '78px'` |

Jedna zmiana komponentu obejmuje wszystkie miejsca użycia: PropertiesPanel (Fill / gradient stops), AppearancePanel (Fill/Stroke/efekty), ContextualControlBar (Fill).

### Testy

- e2e/visual: panel Properties + ContextualControlBar — brak nachodzenia swatch↔hex przy szerokości kolumny 200px.

---

## 7. FAZA 6 — Zoom readout: cykl + custom (D2)

### Pliki

| Plik | Op | Zmiana |
|---|---|---|
| `apps/web/src/features/topbar/AppMenuBar.tsx` | NEW | `ZOOM_PRESETS`, `holdTimerRef`, `longPressRef`, stan `customEditing` |
| j.w. | MODIFY | :288 button → warunkowy input/button; click = cykl, long-press 500ms → input |
| `apps/web/src/features/topbar/TopBar.tsx` | NEW | prop `onSetZoom: (factor: number) => void` |
| `apps/web/src/app/EditorApp.tsx` | NEW | `handleSetZoom` + przepięcie do TopBar (:1843) |
| `apps/web/src/app/editor.css` | NEW | `.zoom-input` (tokeny `--color-input`, `--radius-xs`, width 64px) |

### Przykład kodu

```tsx
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 0.87, 1, 1.5];

const handleZoomPointerDown = () => {
  longPressRef.current = false;
  holdTimerRef.current = setTimeout(() => {
    longPressRef.current = true;
    setCustomEditing(true);
  }, 500);
};

const handleZoomClick = () => {
  if (longPressRef.current) return;      // long-press obsłużony przez input
  const current = zoomPercent / 100;
  const next = ZOOM_PRESETS.find((p) => p > current + 0.005) ?? ZOOM_PRESETS[0]!;
  onSetZoom(next);
};
```

```tsx
{customEditing ? (
  <input
    className="zoom-readout zoom-input" autoFocus
    defaultValue={`${zoomPercent}%`}
    aria-label="Zoom custom"
    onBlur={() => setCustomEditing(false)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        const parsed = parseFloat(e.currentTarget.value.replace('%', '').replace(',', '.'));
        if (Number.isFinite(parsed)) onSetZoom(parsed / 100);  // clamp 1%–6400% robi Camera.setZoom
        setCustomEditing(false);
      }
      if (e.key === 'Escape') setCustomEditing(false);
    }}
  />
) : (
  <button
    type="button" className="zoom-readout"
    title="Klik: cykl zoomu · Przytrzymaj: własna wartość"
    onPointerDown={handleZoomPointerDown}
    onPointerUp={() => holdTimerRef.current && clearTimeout(holdTimerRef.current)}
    onPointerLeave={() => holdTimerRef.current && clearTimeout(holdTimerRef.current)}
    onClick={handleZoomClick}
  >
    {zoomPercent}%
  </button>
)}
```

```tsx
// EditorApp.tsx
const handleSetZoom = useCallback((factor: number) => {
  const canvas = document.querySelector<HTMLElement>('[data-testid="canvas-viewport"]');
  if (!canvas) return;
  camera.setZoom(factor, { x: canvas.clientWidth, y: canvas.clientHeight });
  setZoomPercent(camera.zoomPercent);
}, [camera]);
```

### Uwagi

- Zoom = stan kamery (nie dokument) — **bez komendy**; clamp 1%–6400% w `Camera.setZoom` (camera.ts:4-5, 127-130).
- Walidacja inputu: `parseFloat` + `Number.isFinite` → invalid = no-op, bez crasha.
- `onZoom100` zostaje w menu Widok (`AppMenuBar.tsx:193`); readout przestaje go używać.
- Timery czyszczone: `onPointerUp`, `onPointerLeave`, unmount — brak wycieku.

### Testy

- unit: cykl 100→150→25→50→75→87→100; Enter „137%" → 1.37; „abc" → bez zmiany;
- e2e: click cykluje, long-press pokazuje input.

---

## 8. FAZA 7 — Menu „Zaznacz podobne" (D1)

### Pliki

| Plik | Op | Zmiana |
|---|---|---|
| `apps/web/src/features/topbar/AppMenuBar.tsx` | DELETE | :211-217 + `onSelectSame` z interfejsu (:54) i destructuringu (:120) |
| `apps/web/src/features/topbar/TopBar.tsx` | DELETE | prop :56 + przepięcie |
| `apps/web/src/app/EditorApp.tsx` | DELETE | handler :1573-1577 + prop do TopBar |

Silnik `selectSame` w `@vectoria/core` — **nietknięty** (PROD-016..021 zachowane w silniku, wejście UI usunięte decyzją użytkownika).

### Testy

- typecheck (usunięte propsy), e2e: menu Obiekt bez „Zaznacz podobne".

---

## 9. FAZA 8 — Dokumentacja + backlog

| Plik | Op | Zmiana |
|---|---|---|
| `BACKLOG.md` | MODIFY | nanotatki: SEL-038 (etykieta przy move usunięta decyzją UX); PROD-016..021 (UI removed, engine kept) |

---

## 10. Kolejność i quality gates

Fazy: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**. Każda faza = osobny commit.

```bash
pnpm typecheck && pnpm lint && pnpm test   # po każdej fazie
pnpm --filter @vectoria/web test:e2e       # po fazach 1, 2, 6, 7
pnpm build                                 # final
```

Skrypty z `package.json` (rzeczywiste): `typecheck` = `pnpm -r typecheck`, `lint` = `pnpm -r lint`, `test` = `vitest run`, e2e = `playwright test` (apps/web), `build` = `tsc --noEmit && vite build`.

## 11. Macierz testów — finalna

| Typ | Scenariusze |
|---|---|
| unit | uchwyty przy scale `{x:3,y:0.5}` i scale 0 (F); zoom cykl + walidacja inputu (H); smartDistance label gating (E) |
| e2e | szybki drag + szybki rect + undo×1 (D); motyw pixel-refresh bez kliknięcia (C); zoom cykl + custom input (H); brak „Zaznacz podobne" (G) |
| visual | Dark/Light × DPR 1/2: ColorControl, miarka, uchwyty przy scale 3× |
| regresja | istniejący `apps/web/e2e/editor.spec.ts` (drag/resize/undo/redo/zoom-100) bez zmian musi przejść |

## 12. Ryzyka i mitygacje

| Ryzyko | Mitygacja |
|---|---|
| Refactor commitów dotyka transform workflow (Issue #6) | ref-stan = te same dane, zmiana mechaniczna; e2e drag/undo jako brama |
| `lostpointercapture` pre-emptuje create (D3) | krok diagnostyczny w F1; guard `currentState === 'drawing'` |
| MutationObserver → pętla invalidate | filter `data-theme` only; `invalidate()` idempotentne (rAF coalesce) |
| Usunięcie propsów Select Same | typecheck + e2e menu |

## 13. Kryteria akceptacji

- [ ] Szybki drag (<300ms) przesuwa obiekt trwale; undo = 1 krok
- [ ] Szybki rect (<300ms) tworzy obiekt
- [ ] Zmiana motywu: tło canvasu + miarka odświeżają się bez kliknięcia
- [ ] Uchwyty 8px ekranowe przy dowolnej skali obiektu
- [ ] Brak etykiety ΔX/ΔY przy przesuwaniu
- [ ] Fill/Stroke: brak nachodzenia swatch↔hex
- [ ] Zoom: click cykluje 25→50→75→87→100→150; hold 500ms → custom input (1%–6400%)
- [ ] Menu Obiekt bez „Zaznacz podobne"
- [ ] Wszystkie quality gates zielone; żadna tolerancja/test/budget nie rozluzniony
