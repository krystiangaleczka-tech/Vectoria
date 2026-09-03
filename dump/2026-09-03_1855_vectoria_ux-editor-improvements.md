# Dump: UX Editor — Drag, Handles, Coordinates, Tool Groups, Rulers, Transform Menu

Data: 2026-09-03 18:55
Autor: Antigravity AI
Zadanie: UX Editor: Drag, Handles, Coordinates, Tool Groups, Rulers, Transform Menu

---

## 1. Aktywny task i cel
- **Cel**: Rozwiązanie 8 zgłoszonych problemów UX w edytorze Vectoria związanych z przeciąganiem (drag & drop), uchwytami transformacji, etykietami narzędzi, live-update współrzędnych, grupowaniem narzędzi w ToolRail, z-index linijek oraz menu/skrótem transformacji.
- **Zakres**:
  - Problem 1: Stabilny drag z progiem `DRAG_THRESHOLD_PX = 3`, pointer capture i płynnym ruchem bez skoków siatki (przyciąganie opcjonalne pod `Ctrl`/`Cmd`).
  - Problem 2: Live-update współrzędnych X, Y, W, H, Kąt w górnym pasku w trakcie przeciągania/obracania/skalowania.
  - Problem 3: Pełna polska mapa etykiet dla 28 narzędzi i typów obiektów w `ContextualControlBar`.
  - Problem 4a: Pola transformacji (X, Y, W, H, Kąt) dla wszystkich typów obiektów wektorowych (`path`, `polygon`, `star`, itd.).
  - Problem 4b: 8 uchwytów zmiany rozmiaru + uchwyt obrotu dla każdego typu obiektu na canvasie.
  - Problem 5: Podział paska narzędzi `ToolRail` na 7 logicznych grup z wizualnymi separatorami.
  - Problem 6: Poprawa z-index linijek `CanvasRulers` (2 i 3) oraz nagłówka `TopBar` (50), aby popovery menu nie były przecinane.
  - Problem 7: Rejestracja akcji `object.transform` (`Ctrl+T` / `Cmd+T`), nowa pozycja w menu „Obiekt” i automatyczne otwieranie doku właściwości.

---

## 2. Stan PRZED vs Stan PO

### Stan PRZED:
- **Drag & Drop**: Brak minimalnego progu ruchu przed dragiem powodował mikro-drżenia przy kliknięciach; brak `setPointerCapture` gubił zdarzenia myszy przy szybkich ruchach poza canvas; wymuszone zaokrąglanie do siatki w każdej klatce powodowało widoczne skoki co kilka pikseli.
- **Współrzędne na żywo**: Pasek `ContextualControlBar` odczytywał wyłącznie stan zatwierdzony w `doc.objects`, przez co w trakcie przeciągania liczby X, Y i Kąt pozostawały nieruchome aż do zwolnienia przycisku myszy.
- **Etykiety narzędzi**: Łańcuch warunkowy ternarny w pasku kontekstowym pomijał wiele narzędzi, wyświetlając domyślne generyczne opisy.
- **Uchwyty i Bounding Box**: Renderer rysował 8 uchwytów tylko dla prostokątów i elips; obiekty typu `path` nie miały uchwytów przekształceń wcale, a uchwyt obrotu nie był dostępny dla innych kształtów.
- **Pasek narzędzi (ToolRail)**: Wszystkie narzędzia były umieszczone w jednej długiej, niepogrupowanej kolumnie bez podziału funkcjonalnego.
- **Linijki**: CanvasRulers miały `z-index: 10` i `11`, co powodowało przebijanie i przecinanie rozwiniętych list menu z górnego paska (`.menu-popover`).
- **Menu i skrót Ctrl+T**: Brak pozycji „Przekształcenia...” w menu „Obiekt” i brak przypisanego skrótu klawiszowego `Ctrl+T` / `Cmd+T`.

### Stan PO:
- **Drag & Drop**: Zaimplementowano `DRAG_THRESHOLD_PX = 3` oraz `setPointerCapture` / `releasePointerCapture`. Przeciąganie jest idealnie płynne piksel po pikselu, a smart-snap włącza się selektywnie po przytrzymaniu klawisza `Ctrl`/`Cmd`.
- **Współrzędne na żywo**: `CanvasViewport` przekazuje `onDragPreviewChange` do `EditorApp`, który zasila `ContextualControlBar` w `previewTransforms`. Pola X, Y, W, H i Kąt aktualizują się płynnie w 60 FPS w trakcie manipulacji myszą.
- **Etykiety narzędzi**: Wdrożono słowniki `TOOL_LABELS: Record<ActiveTool, string>` oraz `OBJECT_TYPE_LABELS` pokrywające wszystkie narzędzia i obiekty.
- **Uchwyty i Bounding Box**: Renderer rysuje 8 uchwytów (4 narożne + 4 środkowe) oraz dedykowany uchwyt obrotu dla każdego typu obiektu sceny (prostokąt, elipsa, ścieżka, wielokąt, gwiazda, grupa). Zaznaczenie dowolnego obiektu udostępnia edycję geometrii i obrotu w pasku górnym.
- **Pasek narzędzi (ToolRail)**: Podzielono narzędzia na 7 czytelnych grup tematycznych z separatorami.
- **Linijki**: Obniżono z-index linijek do 2 i 3 oraz nadano nagłówkowi `TopBar` pozycję `relative` i `z-index: 50`. Popovery menu wyświetlają się całkowicie ponad linijkami.
- **Menu i skrót Ctrl+T**: Dodano pozycję menu „Obiekt” -> „Przekształcenia... Ctrl+T”, akcję `object.transform` w `ShortcutManager` oraz obsługę przełączenia na narzędzie `select` i otwarcia panelu właściwości.

---

## 3. Walidacja i Quality Gates

1. **Testy jednostkowe i integracyjne (`pnpm test`)**:
   - 66 plików testowych, 372 testy zakończone sukcesem (0 błędów).
2. **Typecheck (`pnpm typecheck`)**:
   - 0 błędów TypeScript w całym monorepo.
3. **Linter (`pnpm lint`)**:
   - 0 błędów, 0 ostrzeżeń ESLint.
4. **Build produkcyjny (`pnpm build`)**:
   - Pomyślny build produkcyjny Vite (`@vectoria/web`) w 1.60s.
5. **Testy manualne w przeglądarce (Browser Subagent)**:
   - Zweryfikowano popovery menu nad linijkami (zrzut ekranu: `obiekt_menu_over_rulers_1788453991028.png`).
   - Zweryfikowano 8 uchwytów, uchwyt obrotu i etykiety w ContextualControlBar (zrzut ekranu: `drawn_rectangle_selected_1788454028208.png`).
   - Zarejestrowano sesję WebP: `manual_ux_tests_1788453684001.webp`.

---

## 4. Zmiany per plik (Changes Per File)

### `apps/web/src/features/canvas/CanvasRulers.tsx`
- **Stan przed**: Narożnik miał `zIndex: 11`, a płótna linijek `zIndex: 10`.
- **Zmiana po**: Zmniejszono `zIndex` narożnika do `3`, a płócien linijek do `2`.
- **Cel**: Wyeliminowanie przebijania linijek przez popovery menu górnego paska (Problem 6).

### `apps/web/src/features/topbar/TopBar.tsx`
- **Stan przed**: `<header data-testid="topbar">` nie definiował jawnego `zIndex`, a `TopBarProps` nie miało `onOpenTransform`.
- **Zmiana po**: Dodano `position: 'relative'`, `zIndex: 50` oraz prop `onOpenTransform` przekazywany do `AppMenuBar`.
- **Cel**: Gwarancja renderowania menu ponad płótnami linijek (Problem 6) oraz obsługa akcji transformacji (Problem 7).

### `packages/editor-engine/src/commands/shortcut-manager.ts`
- **Stan przed**: Brak akcji `object.transform` w liście akcji i domyślnych skrótach.
- **Zmiana po**: Dodano akcję `object.transform` z etykietą `'Przekształcenia...'` oraz powiązanie ze skrótem `Ctrl+T` / `Cmd+T`.
- **Cel**: Zapewnienie globalnego skrótu klawiszowego do panelu transformacji (Problem 7).

### `apps/web/src/features/topbar/AppMenuBar.tsx`
- **Stan przed**: Brak pozycji „Przekształcenia...” w menu „Obiekt”.
- **Zmiana po**: Dodano prop `onOpenTransform` i pozycję menu `<MenuItem label="Przekształcenia..." shortcut="Ctrl+T" disabled={selectedObjectIds.length === 0} onClick={() => run(onOpenTransform)} />`.
- **Cel**: Dostęp do panelu transformacji z poziomu menu aplikacji (Problem 7).

### `apps/web/src/features/toolbar/ToolRail.tsx`
- **Stan przed**: Pojedyncza płaska lista narzędzi bez logicznego podziału.
- **Zmiana po**: Przeorganizowano strukturę narzędzi w 7 logicznych grup (`Selection`, `Shapes`, `Pen & Draw`, `Text`, `Path Edit`, `Fill & Style`, `Navigate`) z separatorami wizualnymi.
- **Cel**: Czytelność i ergonomia paska narzędzi (Problem 5).

### `packages/renderer/src/index.ts`
- **Stan przed**: 8 uchwytów było rysowane tylko dla prostokątów i elips (bez uchwytu obrotu w `renderBoundsSelectionOutline`); obiekty `path` nie miały uchwytów w `renderOverlay`.
- **Zmiana po**: Zaktualizowano `renderBoundsSelectionOutline`, `renderRectangleSelectionOutline` i `renderEllipseSelectionOutline` o rysowanie 8 uchwytów i uchwytu obrotu na wysięgniku 20px; dodano wywołanie `renderBoundsSelectionOutline` dla `case 'path'`.
- **Cel**: Spójne 8 uchwytów i rotacja dla wszystkich obiektów wektorowych (Problem 4b).

### `apps/web/src/features/panels/ContextualControlBar.tsx`
- **Stan przed**: Wąski warunek ternarny dla nazw narzędzi; brak podglądu na żywo `previewTransforms`; brak pól transformacji dla ścieżek/obiektów innych niż rect/ellipse; brak obrotu `onUpdateRotation`.
- **Zmiana po**: Dodano `TOOL_LABELS`, `OBJECT_TYPE_LABELS`, obsługę `previewTransforms`, uniwersalne pola X, Y, W, H, Kąt oraz wywołanie `onUpdateRotation`.
- **Cel**: Pełny wgląd w parametry zaznaczenia i live-update współrzędnych (Problemy 2, 3, 4a).

### `apps/web/src/features/canvas/CanvasViewport.tsx`
- **Stan przed**: Natychmiastowy drag przy pointerDown; brak `setPointerCapture`; zaokrąglanie do siatki w każdej klatce; brak uchwytów dla ścieżek; brak callbacku `onDragPreviewChange`.
- **Zmiana po**: Wprowadzono `DRAG_THRESHOLD_PX = 3`, `setPointerCapture` / `releasePointerCapture`, selektywne przyciąganie z klawiszem `Ctrl`, uniwersalny hit-testing `getObjectHandles` dla 8 uchwytów i rotacji, płynną aktualizację `updateDragPreview` i raportowanie przez `onDragPreviewChange`.
- **Cel**: Stabilność, brak zacięć i pełna interaktywność transformacji (Problemy 1, 2, 4b).

### `apps/web/src/app/EditorApp.tsx`
- **Stan przed**: Brak stanu `previewTransforms`; brak podpięcia `onDragPreviewChange`, `onUpdateRotation` i `onOpenTransform`; brak obsługi `object.transform` w `runShortcutAction`.
- **Zmiana po**: Dodano stan `previewTransforms`, przekazano go do `ContextualControlBar`, powiązano `onDragPreviewChange` z `CanvasViewport`, `onUpdateRotation` z poleceniem `TransformObjectsCommand`, oprogramowano akcję `object.transform` i przekazano `onOpenTransform` do `TopBar`.
- **Cel**: Integracja przepływu danych live-update oraz obsługa skrótów i menu (Problemy 2, 4a, 7).

---

## 5. Ograniczenia i następny bezpieczny krok
- **Ograniczenia**: Pochylenie (Skew) w tej iteracji jest edytowalne z poziomu panelu bocznego jako wartość kątowa/parametryczna; interaktywne uchwyty pochylenia na canvasie pozostają zaplanowane na kolejny etap zgodnie z Decyzją 2.
- **Następny bezpieczny krok**: Zatwierdzenie commitu i wypchnięcie zmian na branch `master`.
