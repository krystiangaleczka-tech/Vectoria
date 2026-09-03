# Dump: 2026-09-03_1912_vectoria_handle-cursors-live-resize
Date: 2026-09-03 19:12

## Metadata
- **Task**: Kursor uchwytowy na hover, rozciąganie w czasie rzeczywistym (live preview) oraz opcja Nowy artboard
- **Branch**: master
- **Status**: Complete & Verified

## Problem
1. Najechanie kursorem na uchwyty zmiany rozmiaru (8 uchwytów) oraz uchwyt obrotu nie zmieniało kursora – cały czas wyświetlał się domyślny kursor narzędzia (strzałka/crosshair).
2. Podczas przeciągania uchwytów (resize-object) obiekty nie rozciągały się w czasie rzeczywistym na scenie (brak live preview w trakcie ruchu, zmiana widoczna była dopiero po puszczeniu przycisku myszy).
3. Górny pasek kontekstowy nie aktualizował dynamicznie wymiarów W i H przy manipulacji uchwytami.
4. Użytkownik poprosił również o możliwość utworzenia nowego artboardu / czystego obszaru do testów.

## Implementation Details
1. **Dynamiczne kursory uchwytów (`CanvasViewport.tsx`)**:
   - Zdefiniowano `getResizeCursor(screenPoint, centerScreen)` obliczający kąt wektora uchwytu względem środka obiektu i zwracający odpowiedni kursor CSS (`nwse-resize`, `ns-resize`, `nesw-resize`, `ew-resize`), automatycznie uwzględniający obrót kształtu.
   - Zdefiniowano `ROTATE_CURSOR` z dedykowanym SVG z dwoma zakrzywionymi strzałkami i kontrastowym obrysem (`fallback: crosshair`).
   - W `handlePointerMove` dodano wykrywanie najechania na uchwyt obrotu i 8 uchwytów skalowania, aktualizując stan `hoverHandleCursor`.
   - Zastosowano `hoverHandleCursor` jako nadrzędny kursor kontenera canvasu.
2. **Skalowanie w czasie rzeczywistym (Live Preview)**:
   - W `handlePointerMove` dla `resize-object` zaimplementowano pełne rzutowanie przesunięcia na lokalne osie obiektu, uwzględniając kierunek uchwytu (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`) oraz klawisz `Shift` dla zachowania proporcji.
   - Wyliczane są natychmiastowo: `newPosition`, `scaleX`, `scaleY`.
   - Podgląd jest natychmiast przekazywany do `updateDragPreview(preview)` oraz wymuszana jest klatka renderowania `renderLoopRef.current?.invalidate()`.
   - W `finishInteraction` zatwierdzane są finalne wymiary i pozycje (`SetRectangleGeometryCommand`, `SetEllipseGeometryCommand`, `TransformObjectsCommand`).
3. **Pasek kontrolny (`ContextualControlBar.tsx`)**:
   - `currentBounds` dynamicznie skaluje `width` i `height` w oparciu o aktualny `currentTransform.scale` w trakcie przeciągania uchwytów, zapewniając płynny odczyt wymiarów w 60 FPS.
4. **Opcja Nowy artboard**:
   - Dodano pozycję `Nowy artboard` do menu `Plik` (`AppMenuBar.tsx`), powiązaną z `CreateArtboardCommand` przez `onCreateArtboard` w `TopBar.tsx` i `EditorApp.tsx`.

## Changes Per File
### `apps/web/src/features/canvas/CanvasViewport.tsx`
- **Stan przed**: Kursor był statyczny w oparciu o `activeTool`. `resize-object` nie wyliczał `preview` dla prostokątów/elips i nie wywoływał `invalidate()`. Brak obsługi rotacji i orientacji uchwytów.
- **Stan po**: Dodano `ROTATE_CURSOR`, `getResizeCursor`, stan `hoverHandleCursor`, wykrywanie najechania na uchwyty w `handlePointerMove`, pełne live preview skalowania i repozycjonowania dla każdego uchwytu i typu obiektu oraz płynne odświeżanie w `renderLoop`.
- **Uzasadnienie**: Spełnienie wymagań UX w zakresie profesjonalnego feedbacku kursora i natychmiastowej odpowiedzi wizualnej.

### `apps/web/src/features/panels/ContextualControlBar.tsx`
- **Stan przed**: `currentBounds` brał pod uwagę wyłącznie statyczne wymiary obiektu z bazy dokumentu.
- **Stan po**: `currentBounds` uwzględnia `currentTransform.scale` z `previewTransforms`, aktualizując live pola W i H.
- **Uzasadnienie**: Natychmiastowy feedback numeryczny podczas manipulacji uchwytami.

### `apps/web/src/features/topbar/AppMenuBar.tsx`
- **Stan przed**: Menu `Plik` zawierało tylko `Nowy dokument`.
- **Stan po**: Dodano pozycję `Nowy artboard` powiązaną z `onCreateArtboard`.
- **Uzasadnienie**: Wygodne tworzenie nowych obszarów roboczych z poziomu menu.

### `apps/web/src/features/topbar/TopBar.tsx`
- **Stan przed**: Brak `onCreateArtboard` w `TopBarProps`.
- **Stan po**: Przekazano `onCreateArtboard` do `AppMenuBar`.
- **Uzasadnienie**: Połączenie akcji menu z kontrolerem aplikacji.

### `apps/web/src/app/EditorApp.tsx`
- **Stan przed**: `TopBar` nie otrzymywał `onCreateArtboard`.
- **Stan po**: Przekazano `onCreateArtboard={handleCreateArtboard}` do `TopBar`.
- **Uzasadnienie**: Realizacja komendy `CreateArtboardCommand`.

## Quality Gates
- `pnpm typecheck`: 0 błędów w 7 projektach monorepo.
- `pnpm lint`: 0 błędów, 0 ostrzeżeń.
- `pnpm test`: 372/372 testów zdanych (66 plików testowych).
- `pnpm build`: Pomyślna kompilacja produkcyjna Vite.
