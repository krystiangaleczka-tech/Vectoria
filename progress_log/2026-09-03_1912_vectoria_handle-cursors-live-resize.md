# Progress Log: 2026-09-03_1912_vectoria_handle-cursors-live-resize
Date: 2026-09-03 19:12

## Meta
- **Area**: Canvas Viewport, Cursors, Transformation Engine, TopBar Menu
- **Task**: Handle hover cursors, real-time live preview during resize, and new artboard menu action

## Summary
Zaimplementowano dynamiczną zmianę kursora myszy przy najechaniu na uchwyty zmiany rozmiaru (kierunkowe kursory `nwse-resize`, `ns-resize`, `nesw-resize`, `ew-resize` z automatyczną adaptacją do obrotu obiektu) oraz na uchwyt obrotu (kontrastowy kursor SVG). Wdrożono płynne skalowanie obiektów w czasie rzeczywistym podczas przeciągania dowolnego z 8 uchwytów wraz z natychmiastowym odświeżaniem w `renderLoop` oraz aktualizacją pól W, H, X, Y w górnym pasku. Dodano również opcję „Nowy artboard” w menu „Plik”.

## Problem
- Brak reakcji kursora myszy przy najechaniu na uchwyty obwiedni transformacji.
- Brak podglądu rozciągania w czasie rzeczywistym podczas przeciągania uchwytów – zmiany pojawiały się dopiero po zwolnieniu przycisku myszy.
- Brak bezpośredniej opcji dodawania nowego artboardu z menu głównego.

## Implementation
1. `CanvasViewport.tsx`:
   - Dodano funkcję `getResizeCursor(screenPoint, centerScreen)` przeliczającą kąt ekranowy uchwytu na właściwy kursor CSS.
   - Dodano `ROTATE_CURSOR` dla uchwytu rotacji.
   - Zaimplementowano detekcję hover w `handlePointerMove` i stan `hoverHandleCursor`.
   - Zaimplementowano live transform preview dla każdego z 8 uchwytów (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`) z obsługą klawisza `Shift` (proporcjonalny resize) oraz natychmiastowe inwalidowanie renderera.
2. `ContextualControlBar.tsx`:
   - Zaktualizowano `currentBounds`, by uwzględniał `previewTransforms.scale` na żywo.
3. `AppMenuBar.tsx` & `TopBar.tsx` & `EditorApp.tsx`:
   - Dodano pozycję menu „Nowy artboard” podpinającą `CreateArtboardCommand`.

## Validation
- `pnpm typecheck`: 0 błędów w monorepo.
- `pnpm lint`: 0 błędów, 0 ostrzeżeń.
- `pnpm test`: 372/372 testów zdanych.
- `pnpm build`: Pomyślny build produkcyjny.

## Files Changed
- `apps/web/src/features/canvas/CanvasViewport.tsx`
- `apps/web/src/features/panels/ContextualControlBar.tsx`
- `apps/web/src/features/topbar/AppMenuBar.tsx`
- `apps/web/src/features/topbar/TopBar.tsx`
- `apps/web/src/app/EditorApp.tsx`
- `dump/2026-09-03_1912_vectoria_handle-cursors-live-resize.md`
- `progress_log/2026-09-03_1912_vectoria_handle-cursors-live-resize.md`

## Outcome
Edytor zapewnia pełną informację zwrotną: kursor precyzyjnie informuje o kierunku rozciągania lub obrotu, kształty deformują się i dopasowują płynnie w 60 FPS w trakcie ruchu myszą, a wymiary w pasku kontrolnym aktualizują się na żywo.
