# EPIC-10 Tekst i typografia — Podsumowanie i Dump

## Metadata

- **Task**: EPIC-10: Tekst i typografia (`TEXT-001` – `TEXT-034`)
- **Date**: 2026-08-27
- **Branch**: master
- **Scope**: Pełna implementacja narzędzi i modeli tekstu (Artistic Text, Paragraph Text Frame), silnika układu tekstu (word-wrap, multi-column, justowanie, listy, text-on-path), edycji bezpośredniej na canvasie (caret, zaznaczenia Unicode, double-click), renderingu Canvas/SVG, zarządzania czcionkami (Google Fonts, web fonts, inspekcja użytych fontów), wyszukiwania i zamiany tekstu, znaków specjalnych/emoji oraz konwersji tekstu na wektory.

---

## State Before

Wcześniejsza wersja Vectorii posiadała narzędzia do rysowania i edycji kształtów parametrycznych, krzywych Pen/Pencil/Brush, operacji boolowskich oraz stylów (kolory, gradienty, kontury). Brakowało obiektów domenowych reprezentujących tekst, silnika składu i zawijania wierszy, sesji interaktywnej edycji tekstu z poziomu viewportu canvasa, obsługi formatów typograficznych w schemacie Zod oraz eksportu/importu znaczników `<text>`, `<tspan>`, `<textPath>` w SVG.

---

## State After

1. **Model domenowy i niezmienniki**:
   - `TextObject` — tekst artystyczny jedno- lub wielowierszowy z opcjonalnym zakrzywieniem wzdłuż dowolnej ścieżki (`pathId`), bogatymi właściwościami typograficznymi (`fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `letterSpacing`, `lineHeight`, `textAlign`, `kerning`, `variableAxes`, `runs: TextRun[]`).
   - `TextFrameObject` — tekst akapitowy z automatycznym zawijaniem wierszy, definiowaną liczbą kolumn (`columnCount: 1..8`), odstępem międzykolumnowym (`columnGutter`), odstępem międzyakapitowym (`paragraphSpacing`), wcięciem pierwszego wiersza (`indent`) oraz znacznikami list (`none` | `bullet` | `numbered`).
   - Restrykcyjna walidacja niezmienników w `invariants.ts` (brak NaN/Infinity, minimalne dodatnie wymiary ramek, poprawne zakresy kolumn i rozmiarów czcionek).
2. **Silnik składu tekstu i wektoryzacji**:
   - [`text-layout.ts`](file:///Users/krystiangaleczka/Downloads/Vectoria/packages/core/src/geometry/text-layout.ts) — pełny algorytm greedy word-wrap, obsługa wielu kolumn, justowania ze skalowaniem spacji, punktatorów list i precyzyjnego pozycjonowania glifów wzdłuż krzywych Béziera na podstawie długości łuku (Arc-Length parameterization).
   - [`text-outlines.ts`](file:///Users/krystiangaleczka/Downloads/Vectoria/packages/core/src/geometry/text-outlines.ts) — konwerter zamieniający glify tekstu na wektorowe krzywe Béziera (`PathObject` ze strukturą węzłów i uchwytów).
3. **Komendy i historia Undo/Redo**:
   - Atomowe komendy: `CreateTextObjectCommand`, `CreateTextFrameCommand`, `SetTextContentCommand`, `UpdateTextPropertiesCommand`, `SetTextOnPathCommand`, `ConvertTextToOutlinesCommand`, `BatchReplaceTextCommand`.
4. **Interakcja i edycja na canvasie**:
   - `TextTool` — kliknięcie tworzy tekst artystyczny, przeciągnięcie tworzy ramkę akapitową.
   - `TextEditSession` — w pełni bezpieczna dla wielobajtowych znaków Unicode (surrogate pairs/emojis) sesja edycji na canvasie, kursor migający w rAF (`performance.now() / 500 % 2`), zaznaczanie tekstu, obsługa klawiszy funkcyjnych (`Enter`, `Backspace`, `Delete`, strzałki, `Home`, `End`, `Ctrl+A`, `Escape`).
   - Podwójne kliknięcie (`double-click`) na tekście natychmiast otwiera sesję edycji.
5. **Renderer Canvas 2D**:
   - Rendering tekstu artystycznego i ramek tekstowych z uwzględnieniem stylów wypełnień (jednolite, gradienty liniowe/radialne), obrysów (grubość, kreskowanie), transformacji macierzowych i rotacji każdego glifu wzdłuż ścieżki.
6. **Warstwa IO i czcionki**:
   - Zaktualizowany schemat `DocumentV1Schema` o obiekty tekstu.
   - Eksport SVG generujący semantyczne znaczniki `<text>`, `<tspan>` oraz `<textPath>`.
   - Import SVG parsujący elementy `<text>` i powiązania `<textPath>`.
   - `FontService` ładujący i weryfikujący dostępność czcionek webowych i systemowych.
7. **Interfejs użytkownika**:
   - Skrót `T` w toolbarze `ToolRail`.
   - Rozbudowana sekcja Typografii w `PropertiesPanel`.
   - Okna dialogowe `FindReplaceDialog` (`Ctrl+F`), `UsedFontsPanel` i `SpecialCharactersPopover`.
   - Nowe menu `Tekst` w belce górnej `AppMenuBar`.

---

## Validation

- **`pnpm typecheck`**: ✅ 0 błędów we wszystkich 7 pakietach monorepo i aplikacji webowej
- **`pnpm lint`**: ✅ 0 błędów i 0 ostrzeżeń
- **`pnpm test`**: ✅ 250 testów jednostkowych i integracyjnych zaliczonych (40 plików testowych)
- **`pnpm build`**: ✅ Zbudowano aplikację webową (1.29s)
- **`pnpm --filter @vectoria/web test:e2e`**: ✅ 16/16 testów Playwright E2E zaliczonych

---

## Changes Per File

| Plik | Stan przed | Zmiana po | Cel / Uzasadnienie |
|---|---|---|---|
| `docs/adr/ADR_011_TEXT_AND_TYPOGRAPHY.md` | Brak pliku | Utworzono dokument ADR opisujący architekturę tekstu, modele `TextObject`/`TextFrameObject`, silnik składu i sesję edycji | Zgodność z AGENTS.md §0 i §3 przed zmianą kontraktu |
| `packages/core/src/model/types.ts` | Brak typów tekstu | Dodano `FontWeight`, `FontStyle`, `TextAlign`, `ListType`, `TextRun`, `TextObject`, `TextFrameObject` | Rozszerzenie kontraktu modelu obiektów dokumentu |
| `packages/core/src/model/invariants.ts` | Brak walidacji tekstu | Dodano reguły walidacji dla `TextObject` i `TextFrameObject` | Ochrona integralności dokumentu (brak NaN, poprawne wymiary) |
| `packages/core/src/model/bounds.ts` | Brak obliczania obwiedni tekstu | Dodano obliczanie bounds dla `text` i `text-frame` | Prawidłowe zaznaczanie, transformacje i hit-testing |
| `packages/core/src/model/factory.ts` | Brak kreatorów obiektów tekstu | Dodano `createTextObject` oraz `createTextFrameObject` | Fabryka poprawnych instancji obiektów tekstu |
| `packages/core/src/geometry/text-layout.ts` | Brak pliku | Zaimplementowano silnik składu tekstu, zawijania wierszy, kolumn, list i text-on-path | Wyliczanie pozycji glifów na potrzeby Canvas i SVG |
| `packages/core/src/geometry/text-outlines.ts` | Brak pliku | Zaimplementowano konwerter zamiany tekstu na wektory `PathObject` | Realizacja funkcji Convert Text to Outlines (TEXT-024) |
| `packages/core/src/commands/text-commands.ts` | Brak pliku | Zaimplementowano 7 komend Undo/Redo dla tekstu | Deterministyczna mutacja dokumentu z pełnym Undo/Redo |
| `packages/core/src/commands/index.ts` | Brak eksportu komend tekstu | Wyeksportowano komendy typograficzne | Dostępność komend w innych warstwach |
| `packages/core/src/index.ts` | Brak eksportu modułów tekstu | Wyeksportowano typy, geometrie i komendy typograficzne | Publiczne API pakietu `@vectoria/core` |
| `packages/core/test/text-model.test.ts` | Brak pliku | Dodano testy tworzenia i walidacji invariantów tekstu | Pokrycie testami modelu domenowego |
| `packages/core/test/text-layout.test.ts` | Brak pliku | Dodano testy składu tekstu, kolumn, zawijania i text-on-path | Pokrycie testami silnika layoutu |
| `packages/core/test/text-outlines.test.ts` | Brak pliku | Dodano testy wektoryzacji tekstu do krzywych | Weryfikacja poprawności konwersji na ścieżki |
| `packages/core/test/text-commands.test.ts` | Brak pliku | Dodano testy komend tekstowych `execute` i `undo` | Gwarancja niezawodności historii operacji |
| `packages/editor-engine/src/tools/text-tool.ts` | Brak pliku | Zaimplementowano maszynę stanów narzędzia `TextTool` | Tworzenie tekstu kliknięciem i ramek przeciągnięciem |
| `packages/editor-engine/src/interaction/text-edit-session.ts` | Brak pliku | Zaimplementowano klasę `TextEditSession` | Obsługa kursora, zaznaczania i wprowadzania znaków |
| `packages/editor-engine/src/hit-test.ts` | Brak hit-testingu dla tekstu | Dodano testowanie trafień `pointInText` i `pointInTextFrame` | Zaznaczanie i double-click na tekście na canvasie |
| `packages/editor-engine/src/index.ts` | Brak eksportu TextTool i TextEditSession | Wyeksportowano nowe narzędzia i sesje interakcji | Dostępność w warstwie UI |
| `packages/editor-engine/test/text-tool.test.ts` | Brak pliku | Dodano testy maszyny stanów `TextTool` | Pokrycie testami narzędzia tekstowego |
| `packages/editor-engine/test/text-edit-session.test.ts` | Brak pliku | Dodano testy nawigacji, edycji i selekcji w `TextEditSession` | Testy bezpieczeństwa znaków Unicode i operacji |
| `packages/editor-engine/test/text-hit-test.test.ts` | Brak pliku | Dodano testy hit-testingu obiektów tekstu | Testy precyzji trafień kursora |
| `packages/renderer/src/index.ts` | Brak rysowania tekstu na Canvasie | Dodano funkcje `renderText` i `renderTextFrame` | Rysowanie tekstu z pełnym formatowaniem na Canvas 2D |
| `packages/io/src/schema/document-v1.ts` | Brak schematów Zod dla tekstu | Dodano `TextRunSchema`, `TextObjectSchema`, `TextFrameObjectSchema` | Walidacja granic wejścia i serializacja dokumentu |
| `packages/io/src/svg/export.ts` | Brak eksportu tekstu do SVG | Dodano generowanie znaczników `<text>`, `<tspan>`, `<textPath>` | Zgodność eksportu SVG ze standardem W3C |
| `packages/io/src/svg/import.ts` | Brak importu tekstu z SVG | Dodano parsowanie znaczników `<text>` i atrybutów czcionek | Bezpieczny import tekstu ze struktur SVG |
| `packages/io/src/fonts/font-service.ts` | Brak pliku | Zaimplementowano serwis ładowania i sprawdzania fontów | Zarządzanie czcionkami webowymi i systemowymi |
| `packages/io/src/index.ts` | Brak eksportu `font-service` | Wyeksportowano serwis czcionek | Dostępność w warstwie aplikacji |
| `packages/io/test/text-svg.test.ts` | Brak pliku | Dodano testy eksportu/importu SVG i walidacji schematu Zod | Weryfikacja poprawności serializacji tekstu |
| `packages/ui/src/icons/VectoriaIcon.tsx` | Brak ikon typograficznych | Dodano ikony `textFrame`, `alignLeft`, `alignCenter`, `alignRight`, `alignJustify`, `bulletList`, `numberedList`, `textOutlines`, `textOnPath`, `findReplace` | Zgodność wizualna z DESIGN_SYSTEM.md |
| `apps/web/src/features/toolbar/ToolRail.tsx` | Brak przycisku narzędzia Text | Dodano przycisk narzędzia Text ze skrótem `T` | Dostęp do narzędzia tekstu w pasku narzędzi |
| `apps/web/src/features/panels/PropertiesPanel.tsx` | Brak kontrolki właściwości typografii | Dodano sekcję parametrów czcionki, akapitu, kolumn i akcji | Edycja parametrów zaznaczonego tekstu w docku |
| `apps/web/src/features/panels/RightDock.tsx` | Brak przekazywania callbacków typografii | Dodano propsy typograficzne do PropertiesPanel | Połączenie zdarzeń edycji tekstu z silnikiem |
| `apps/web/src/features/panels/LayersPanel.tsx` | Brak ikon dla typu `text` i `text-frame` | Dodano mapowanie ikon dla obiektów tekstu | Wyświetlanie poprawnej ikony na liście warstw |
| `apps/web/src/features/panels/UsedFontsPanel.tsx` | Brak pliku | Zaimplementowano panel przeglądu i podmiany użytych fontów | Inspekcja czcionek w dokumencie (TEXT-027, TEXT-028) |
| `apps/web/src/features/dialogs/FindReplaceDialog.tsx` | Brak pliku | Zaimplementowano okno dialogowe wyszukiwania i zamiany tekstu | Wyszukiwanie i masowa zamiana (TEXT-025, TEXT-026) |
| `apps/web/src/features/dialogs/SpecialCharactersPopover.tsx` | Brak pliku | Zaimplementowano popover wyboru znaków specjalnych i emoji | Wstawianie symboli i emoji (TEXT-031, TEXT-032) |
| `apps/web/src/features/topbar/AppMenuBar.tsx` | Brak pozycji w menu Tekst | Dodano pozycje Znajdź i zamień, Użyte czcionki, Znaki specjalne, Krzywe | Dostęp do funkcji typograficznych z menu |
| `apps/web/src/features/topbar/TopBar.tsx` | Brak przekazywania zdarzeń menu Tekst | Przekazano handlery dialogów do `AppMenuBar` | Wywoływanie dialogów z belki górnej |
| `apps/web/src/features/canvas/CanvasViewport.tsx` | Brak obsługi sesji edycji tekstu | Zintegrowano TextTool, TextEditSession, double-click, kursor i zaznaczanie | Pełna interaktywna edycja bezpośrednia na canvasie |
| `apps/web/src/app/EditorApp.tsx` | Brak stanu i komend typografii | Dodano stan okien dialogowych, handlery komend i skróty `T`, `Ctrl+F` | Centralne zarządzanie stanem aplikacji webowej |
| `apps/web/e2e/editor.spec.ts` | Brak testów E2E dla tekstu | Dodano testy E2E dla tworzenia tekstu, edycji, Properties, outlines i Find & Replace | Automatyczna weryfikacja scenariuszy użytkownika |
| `BACKLOG.md` | Wszystkie pozycje `TEXT-001` – `TEXT-034` odznaczone jako `[ ]` | Odznaczono wszystkie pozycje `TEXT-001` – `TEXT-034` jako `[x]` | Zaktualizowano stan realizacji backlogu |
| `EPIC-10_atomowe_taski.md` | Brak pliku | Utworzono szczegółową dekompozycję epicu na atomowe taski | Dokumentacja wdrożeniowa |

---

## Limitations

1. Zaawansowane osie OpenType w Variable Fonts bazują na standardowych właściwościach CSS font-variation-settings; dla niestandardowych osi wymagane jest załadowanie pliku w formacie woff2/ttf wspieranego przez przeglądarkę.
2. Dostęp do lokalnych czcionek systemowych opiera się na `window.queryLocalFonts()` (Local Font Access API), które jest dostępne w przeglądarkach Chromium po wyrażeniu zgody przez użytkownika; w pozostałych przeglądarkach system automatycznie stosuje czcionki systemowe i webowe.

---

## Next Safe Step

Przejście do realizacji **EPIC-11: Warstwy, obiekty i assety** (`LAYER-001` – `LAYER-015`), w tym zaawansowane zarządzanie hierarchią grup, blokowanie atrybutów, widoki szablonowe i izolacja obiektów.
