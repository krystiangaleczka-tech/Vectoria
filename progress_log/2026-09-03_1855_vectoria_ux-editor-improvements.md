# Progress Log: 2026-09-03_1855_vectoria_ux-editor-improvements
Date: 2026-09-03 18:55

## Meta
- **Area**: UX Editor (Canvas, Controls, Toolbar, Menus)
- **Task**: UX Editor: Drag, Handles, Coordinates, Tool Groups, Rulers, Transform Menu

## Summary
Rozwiązano 8 kluczowych problemów UX w edytorze Vectoria. Wprowadzono próg przeciągania `DRAG_THRESHOLD_PX = 3` oraz `setPointerCapture`, eliminując zacięcia i niepożądane mikro-ruchy przy kliknięciach. Wyeliminowano szarpnięcia siatki – ruch jest płynny, a przyciąganie aktywuje się selektywnie pod klawiszem `Ctrl`/`Cmd`. Wdrożono 8 uchwytów zmiany rozmiaru oraz uchwyt obrotu dla każdego typu obiektu na scenie, a także edycję geometrii w górnym pasku z live-updatem współrzędnych podczas przeciągania. Podzielono pasek narzędzi na 7 logicznych grup z separatorami, poprawiono z-index linijek (nie przecinają już menu popover) oraz dodano pozycję w menu „Obiekt” i globalny skrót `Ctrl+T` / `Cmd+T` do panelu przekształceń.

## Problem
1. Drag & drop był niestabilny i skakał co kilka pikseli z powodu agresywnego zaokrąglania do siatki w każdej klatce; brakowało progu dragu i przechwytywania wskaźnika.
2. Współrzędne w górnym pasku nie aktualizowały się w trakcie manipulacji na żywo.
3. Wiele narzędzi nie miało przetłumaczonych polskich etykiet w pasku kontekstowym.
4. Tylko prostokąty i elipsy miały uchwyty transformacji – ścieżki i inne kształty nie posiadały obwiedni transformacji, a górny pasek nie wyświetlał dla nich pól wymiarów i obrotu.
5. Pasek narzędzi ToolRail był nieuporządkowany (pojedyncza długa kolumna).
6. Linijki canvasu przebijały menu rozwijane z górnego paska.
7. Brakowało skrótu `Ctrl+T` oraz opcji w menu dla transformacji.

## Implementation
1. **CanvasViewport**:
   - `DRAG_THRESHOLD_PX = 3`, `setPointerCapture` / `releasePointerCapture`.
   - Płynny `rawWorldPos` bez szarpnięć siatki, przyciąganie z klawiszem `Ctrl`/`Cmd`.
   - Funkcja `getObjectHandles` generująca 8 uchwytów i uchwyt rotacji dla wszystkich typów obiektów.
   - Nowy callback `onDragPreviewChange` przekazujący transformacje podglądu do aplikacji.
2. **ContextualControlBar**:
   - Dodano słownik `TOOL_LABELS: Record<ActiveTool, string>` oraz `OBJECT_TYPE_LABELS`.
   - Dodano obsługę `previewTransforms` i pola X, Y, W, H, Kąt dla wszystkich obiektów.
   - Dodano obsługę obrotu `onUpdateRotation`.
3. **EditorApp**:
   - Dodano stan `previewTransforms`, przekazany do paska kontekstowego.
   - Powiązano `onDragPreviewChange`, `onUpdateRotation` i `onOpenTransform`.
   - Zarejestrowano akcję `object.transform` otwierającą dok właściwości.
4. **ToolRail**:
   - Podzielono narzędzia na 7 grup funkcjonalnych z separatorami.
5. **CanvasRulers & TopBar**:
   - Obniżono z-index linijek do 2 i 3; dodano `position: relative` i `z-index: 50` w nagłówku TopBar.
6. **ShortcutManager & AppMenuBar**:
   - Zarejestrowano akcję `object.transform` ze skrótem `Ctrl+T` / `Cmd+T` i dodano pozycję w menu „Obiekt”.

## Validation
- `pnpm typecheck`: 0 błędów w 7 pakietach monorepo.
- `pnpm lint`: 0 błędów i ostrzeżeń ESLint.
- `pnpm test`: 372/372 testów Vitest zdanych (66 plików testowych).
- `pnpm build`: Pomyślny build produkcyjny Vite.
- Testy manualne (Browser subagent): Zrealizowano interakcję z menu, linijkami, rysowaniem obiektów i uchwytami, zarejestrowano zrzuty ekranu i wideo WebP.

## Files Changed
- `apps/web/src/app/EditorApp.tsx`
- `apps/web/src/features/canvas/CanvasRulers.tsx`
- `apps/web/src/features/canvas/CanvasViewport.tsx`
- `apps/web/src/features/panels/ContextualControlBar.tsx`
- `apps/web/src/features/toolbar/ToolRail.tsx`
- `apps/web/src/features/topbar/AppMenuBar.tsx`
- `apps/web/src/features/topbar/TopBar.tsx`
- `packages/editor-engine/src/commands/shortcut-manager.ts`
- `packages/renderer/src/index.ts`
- `dump/2026-09-03_1855_vectoria_ux-editor-improvements.md`
- `progress_log/2026-09-03_1855_vectoria_ux-editor-improvements.md`

## Outcome
Zrealizowano pełny zestaw poprawek UX. Edytor zapewnia płynne przeciąganie, natychmiastowy feedback numeryczny w 60 FPS, spójne uchwyty transformacji dla dowolnej grafiki wektorowej, czytelny pasek narzędzi i ergonomiczne menu.

## Known Limitations
Pochylenie (Skew) edytowalne parametrycznie w panelu bocznym; interaktywne uchwyty pochylenia na obwiedni canvasu odłożone do dedykowanego taska.
