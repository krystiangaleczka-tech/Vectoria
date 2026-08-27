# EPIC-10 Tekst i typografia — Podsumowanie i Dump (korekta audytu)

## Metadata

- **Task**: EPIC-10: Tekst i typografia (`TEXT-001` – `TEXT-034`)
- **Date**: 2026-08-27
- **Branch**: master
- **Scope**: Audyt i naprawa częściowej implementacji EPIC-10: realne glyph outlines, atomic inline edit, Unicode Replace All, caret/selection oraz status evidence. Pozostałe taski pozostają jawnie PARTIAL.

---

## State Before

Ten dump opisuje bazową implementację EPIC-10. Audyt wykazał, że część funkcji była tylko API surface; status pozostaje PARTIAL do czasu domknięcia wszystkich tasków.

---

## State After

1. **Model domenowy i niezmienniki**:
   - `TextObject` — tekst artystyczny jedno- lub wielowierszowy z opcjonalnym zakrzywieniem wzdłuż dowolnej ścieżki (`pathId`), bogatymi właściwościami typograficznymi (`fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `letterSpacing`, `lineHeight`, `textAlign`, `kerning`, `variableAxes`, `runs: TextRun[]`).
   - `TextFrameObject` — tekst akapitowy z automatycznym zawijaniem wierszy, definiowaną liczbą kolumn (`columnCount: 1..8`), odstępem międzykolumnowym (`columnGutter`), odstępem międzyakapitowym (`paragraphSpacing`), wcięciem pierwszego wiersza (`indent`) oraz znacznikami list (`none` | `bullet` | `numbered`).
   - Restrykcyjna walidacja niezmienników w `invariants.ts` (brak NaN/Infinity, minimalne dodatnie wymiary ramek, poprawne zakresy kolumn i rozmiarów czcionek).
2. **Silnik składu tekstu i wektoryzacji**:
   - [`text-layout.ts`](file:///Users/krystiangaleczka/Downloads/Vectoria/packages/core/src/geometry/text-layout.ts) — pełny algorytm greedy word-wrap, obsługa wielu kolumn, justowania ze skalowaniem spacji, punktatorów list i precyzyjnego pozycjonowania glifów wzdłuż krzywych Béziera na podstawie długości łuku (Arc-Length parameterization).
   - [`text-outlines.ts`](file:///Users/krystiangaleczka/Downloads/Vectoria/packages/core/src/geometry/text-outlines.ts) — konwerter mapujący realne kontury dostarczone przez `FontOutlineProvider` na compound `PathObject`; brak danych fontu kończy się kontrolowanym błędem.
3. **Komendy i historia Undo/Redo**:
   - Atomowe komendy: `CreateTextObjectCommand`, `CreateTextFrameCommand`, `SetTextContentCommand`, `UpdateTextPropertiesCommand`, `SetTextOnPathCommand`, `ConvertTextToOutlinesCommand`, `BatchReplaceTextCommand`.
4. **Interakcja i edycja na canvasie**:
   - `TextTool` — kliknięcie tworzy tekst artystyczny, przeciągnięcie tworzy ramkę akapitową.
    - `TextEditSession` — Unicode/code-point caret i selection z lokalnym draftem; commit tekstu jest jedną komendą po zakończeniu sesji.
   - Podwójne kliknięcie (`double-click`) na tekście natychmiast otwiera sesję edycji.
5. **Renderer Canvas 2D**:
   - Rendering tekstu artystycznego i ramek tekstowych z uwzględnieniem stylów wypełnień (jednolite, gradienty liniowe/radialne), obrysów (grubość, kreskowanie), transformacji macierzowych i rotacji każdego glifu wzdłuż ścieżki.
6. **Warstwa IO i czcionki**:
   - Zaktualizowany schemat `DocumentV1Schema` o obiekty tekstu.
   - Eksport SVG generujący semantyczne znaczniki `<text>`, `<tspan>` oraz `<textPath>`.
   - Import SVG parsujący elementy `<text>` i powiązania `<textPath>`.
    - `FontService` ładujący i weryfikujący dostępność czcionek webowych i systemowych.
    - Adapter `opentype.js` mapujący realne kontury glifów do kontraktu core.
7. **Interfejs użytkownika**:
   - Skrót `T` w toolbarze `ToolRail`.
   - Rozbudowana sekcja Typografii w `PropertiesPanel`.
   - Okna dialogowe `FindReplaceDialog` (`Ctrl+F`), `UsedFontsPanel` i `SpecialCharactersPopover`.
   - Nowe menu `Tekst` w belce górnej `AppMenuBar`.

---

## Validation

- **`pnpm typecheck`**: ✅ 0 błędów we wszystkich 7 pakietach monorepo i aplikacji webowej
- **`pnpm lint`**: ✅ 0 błędów i 0 ostrzeżeń
- **Targeted Vitest**: ✅ text commands/outlines i OpenType adapter (`11/11`)
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
| `packages/core/src/geometry/text-outlines.ts` | Fałszywe kontury znaków | Wymaga `FontOutlineProvider`, mapuje M/L/C/Q/Z do compound `PathObject` i odrzuca brak danych | Brak placeholder geometry |
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
| `BACKLOG.md` | Legacy status marked TEXT-001–034 as done | Reset incomplete claims to `[ ]`; kept TEXT-026 verified and EPIC-10 status `PARTIAL` | Prevent false epic completion |
| `EPIC-10_atomowe_taski.md` | Istniejący plik tasków | Zachowano jako źródło acceptance criteria; statusy wymagają audytu per task | Dokumentacja wdrożeniowa |

---

## Limitations

1. Adapter `opentype.js` działa dla dostarczonych font bytes; aplikacja dostarcza obecnie bundled Inter, inne fonty wymagają matching font data.
2. Dostęp do lokalnych czcionek systemowych opiera się na `window.queryLocalFonts()` (Local Font Access API), które jest dostępne w przeglądarkach Chromium po wyrażeniu zgody przez użytkownika; w pozostałych przeglądarkach system automatycznie stosuje czcionki systemowe i webowe.

---

## Next Safe Step

Przejście do realizacji **EPIC-11: Warstwy, obiekty i assety** (`LAYER-001` – `LAYER-015`), w tym zaawansowane zarządzanie hierarchią grup, blokowanie atrybutów, widoki szablonowe i izolacja obiektów.

---

## Complete Change Register

Records below cover current worktree files not fully described in table above. Changes marked `pre-existing` were present before this dump/commit pass and are included because user requested commit of current worktree.

| Path | Before | After | Purpose |
|---|---|---|---|
| `AGENTS.md` | Existing agent rules | Added non-negotiable engineering rules, task protocol, DoD, adversarial review and epic completion rule | Prevent placeholder implementations and false DONE status |
| `apps/web/package.json` | No bundled font dependency | Added `@fontsource/inter@5.3.0` | Supply local font bytes for real Inter outlines |
| `apps/web/src/assets.d.ts` | Missing font asset declaration | Added `.woff` module declaration | Type-safe Vite font asset import |
| `apps/web/src/app/EditorApp.tsx` | Text conversion called without font data | Loads bundled Inter font bytes and passes OpenType provider; reports unsupported fonts | Connect UI conversion to real glyph outlines |
| `apps/web/src/features/canvas/CanvasViewport.tsx` | Text draft/selection workflow incomplete | Renders draft preview, supports text selection drag and one edit commit | Complete inline editing behavior |
| `apps/web/src/features/dialogs/FindReplaceDialog.tsx` | Match indexes used UTF-16 offsets | Converts match positions to Unicode code-point indexes | Safe Unicode find/replace |
| `apps/web/src/features/panels/LayersPanel.tsx` | `pre-existing` EPIC-11 panel changes | Kept current layer/assets UI changes | Preserve concurrent user work |
| `apps/web/src/features/panels/RightDock.tsx` | `pre-existing` EPIC-11 dock changes | Kept current dock integration | Preserve concurrent user work |
| `apps/web/src/features/topbar/AppMenuBar.tsx` | `pre-existing` EPIC-11 menu changes | Kept current menu changes | Preserve concurrent user work |
| `apps/web/src/features/topbar/TopBar.tsx` | `pre-existing` EPIC-11 topbar changes | Kept current topbar changes | Preserve concurrent user work |
| `apps/web/src/app/editor.css` | `pre-existing` EPIC-11 styles | Kept current styles; trailing EOF blank line remains | Preserve concurrent user work |
| `apps/web/e2e/editor.spec.ts` | `pre-existing` EPIC-11/text tests | Kept current tests | Preserve concurrent user work |
| `packages/core/src/commands/text-commands.ts` | Replace used first occurrence and dropped runs | Replace All handles string/non-global regex, Unicode indexes and run preservation; typography updates validate inputs | Correct atomic text mutations |
| `packages/core/src/geometry/text-layout.ts` | Justified line width reported natural width | Reports final available width for justified lines | Consistent layout metrics |
| `packages/core/src/geometry/text-outlines.ts` | Hardcoded glyph figures and rectangles | Requires real `FontOutlineProvider`, maps glyph contours to PathObject and rejects missing data | Eliminate fake outlines |
| `packages/core/test/text-commands.test.ts` | No Replace All/runs regression | Added all-occurrence and rich-text run test | Semantic command coverage |
| `packages/core/test/text-outlines.test.ts` | Tests accepted fake generator | Added provider-driven contours, holes, curves and missing-provider rejection | Catch fake outline implementation |
| `packages/editor-engine/src/interaction/text-edit-session.ts` | Horizontal caret only | Added vertical code-point navigation | Complete caret behavior |
| `packages/editor-engine/test/text-edit-session.test.ts` | No vertical caret test | Added multi-line caret test | Caret regression coverage |
| `packages/io/package.json` | No OpenType parser | Added `opentype.js@2.0.0` | Parse real font bytes outside core |
| `packages/io/src/fonts/open-type-font.ts` | Missing | Added OpenType-to-core glyph contour adapter | IO/domain boundary for font outlines |
| `packages/io/src/fonts/opentype-js.d.ts` | Missing declaration | Added typed unknown module boundary | Avoid untyped dependency import |
| `packages/io/test/open-type-font.test.ts` | Missing | Added generated binary OpenType fixture test | Verify actual parser output |
| `pnpm-lock.yaml` | Dependencies before OpenType/fontsource | Locked OpenType and Inter packages | Reproducible dependency installation |
| `docs/adr/ADR_011_TEXT_AND_TYPOGRAPHY.md` | No provider decision | Documented real font outline provider and controlled failure | Record contract change |
| `progress_log/2026-08-27_epic-10.md` | Claimed full completion | Corrected to `PARTIAL`, documented actual evidence and limits | Honest progress reporting |
| `dump/EPIC-10_Tekst_i_typografia.md` | Claimed fake outlines/full completion | Corrected status, validation and current implementation register | Audit trail |
| `EPIC-11_atomowe_taski.md` | `pre-existing` untracked task file | Included unchanged | Preserve concurrent user work |
| `docs/adr/ADR_012_LAYER_SYSTEM_AND_ASSETS.md` | `pre-existing` untracked ADR | Included unchanged | Preserve concurrent user work |
| `progress_log/2026-08-27_epic-11.md` | `pre-existing` untracked progress log | Included unchanged | Preserve concurrent user work |
| `packages/core/src/commands/layer-commands.ts` | `pre-existing` untracked EPIC-11 commands | Included unchanged | Preserve concurrent user work |
| `packages/core/test/layer-commands.test.ts` | `pre-existing` untracked EPIC-11 tests | Included unchanged | Preserve concurrent user work |
| `apps/web/src/features/panels/AssetsPanel.tsx` | `pre-existing` untracked panel | Included unchanged | Preserve concurrent user work |
