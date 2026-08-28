# Dump: EPIC-11 / EPIC-12 Security, Mutation Guards & File Drop Importer

## Meta
- **Date**: 2026-08-29
- **Task/Issue**: Zabezpieczenie importu plików (file-drop-importer), ochrona przed mutacjami zablokowanych warstw/obiektów (mutation guards), selekcja zablokowanych obiektów bez możliwości edycji (hit-test), import fontów webowych oraz reguły architektoniczne AGENTS.md.
- **Status**: Zaimplementowano, przetestowano, 100% typecheck i testy jednostkowe.

## Stan przed/po
- **Przed**:
  - `file-drop-importer.ts` nie walidował limitu rozmiaru pliku (brak limitu 50MB) ani liczby elementów SVG (brak limitu 5000), co stwarzało ryzyko SVG bomb i memory exhaustion.
  - Brak sanityzacji SVG — potencjalne ataki przez zagnieżdżone `<script>`, `<foreignObject>`, event handlery (`onload`, `onclick` z cudzysłowami lub bez) oraz `javascript:` URI.
  - Upuszczenie pliku PDF zwracało cicho pustą listę obiektów `objects: []` bez feedbacku dla użytkownika.
  - `hit-test.ts` pomijał zablokowane obiekty i warstwy, uniemożliwiając ich zaznaczenie w celu inspekcji właściwości w PropertiesPanel.
  - Brak globalnych guardów przed mutacjami (`validateLockedMutations`) w `CommandHistory`.
  - Brak okna importu fontów webowych z adresu URL (FontFace API).
- **Po**:
  - `file-drop-importer.ts` posiada sztywny limit rozmiaru (50 MB) i liczby elementów SVG (5 000), rzuca zrozumiałe błędy w języku polskim.
  - Wdrożono bezpieczną sanityzację `sanitizeSvgText`, czyszczącą tagi `<script>`, `<foreignObject>`, atrybuty `on*` (zarówno w cudzysłowach podwójnych, pojedynczych jak i bez cudzysłowów `onclick=foo()`) oraz `javascript:` URI.
  - Upuszczenie PDF rzuca jawny błąd z instrukcją eksportu do SVG/PNG.
  - `hit-test.ts` obsługuje opcję `includeLocked: true`, co umożliwia zaznaczanie zablokowanych obiektów, a `CommandHistory` odrzuca wszelkie nieuprawnione mutacje zablokowanych elementów (`validateLockedMutations`).
  - Dodano `WebFontImportDialog` i obsługę importu fontów webowych z paska menu.
  - Do `AGENTS.md` dodano sekcję `1b. Pułapki implementacyjne` opisującą różnice Browser vs Node, obsługę `FileReader`/`Buffer`/`Image` oraz kompletność regexów HTML/SVG.

## Implementacja
1. **`packages/io/src/assets/file-drop-importer.ts`**:
   - Dodano limity `MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024` oraz `MAX_SVG_OBJECTS = 5000`.
   - Zaimplementowano funkcję `sanitizeSvgText(svgText)` operującą na łańcuchu znaków bez mutowania DOM.
   - Wdrożono środowiskowo bezpieczne `readFileAsText` (`file.text()` -> `FileReader`) oraz `readFileAsDataUrl` (`file.arrayBuffer()` z czystym `arrayBufferToBase64()` bez zależności od Node `Buffer`).
   - W `getImageDimensions` dodano timeout guard 200ms zapobiegający blokowaniu w środowiskach testowych/jsdom.
2. **`packages/core/src/model/mutation-guards.ts` & `command.ts`**:
   - Utworzono `validateLockedMutations(oldDoc, newDoc)` sprawdzający czy żadna komenda nie modyfikuje transformacji, geometrii ani styli zablokowanych obiektów/warstw (chyba że operacja dotyczy atrybutów dozwolonych lub odblokowania).
   - Zintegrowano walidację w `CommandHistory.execute()`, `undo()` i `redo()`.
3. **`packages/editor-engine/src/hit-test.ts`**:
   - Dodano flagę `includeLocked` w `HitTestOptions`, aby narzędzie wyboru (`select-tool`) mogło zaznaczać zablokowane elementy.
4. **UI Font Import**:
   - Dodano `WebFontImportDialog.tsx` oraz opcję w menu `AppMenuBar.tsx`.
5. **`AGENTS.md`**:
   - Wzbogacono o sekcję `1b. Pułapki implementacyjne` zapobiegającą błędom API środowiskowych oraz niekompletnym wyrażeniom regularnym.

## Walidacja
- **Typecheck**: `pnpm typecheck` — 100% PASS (wszystkie pakiety + web).
- **Testy**: `pnpm test` — 47 plików testowych, 282 testy przeszły pomyślnie.
- Dodano dedykowany zestaw testów `packages/io/test/file-drop-importer.test.ts`.

## Znane ograniczenia
- Rasteryzacja/podgląd plików PDF nie jest realizowana inline w przeglądarce (brak ciężkich bibliotek typu pdfjs-dist); użytkownik otrzymuje czytelną instrukcję konwersji do SVG/PNG.

## Zmiany per plik (Changes Per File)

- **Path**: `/Users/krystiangaleczka/Downloads/Vectoria/packages/io/src/assets/file-drop-importer.ts`
  - **Przed**: Brak limitów rozmiaru pliku, brak sanityzacji SVG, stub PDF zwracający puste `objects: []`, zależność od `FileReader` i `Buffer`.
  - **Po**: Dodano limity `MAX_FILE_SIZE_BYTES` i `MAX_SVG_OBJECTS`, pełną sanityzację `sanitizeSvgText` z obsługą unquoted/quoted atrybutów, jawny błąd PDF, timeout w `getImageDimensions`, `arrayBufferToBase64`.
  - **Cel**: Bezpieczeństwo i stabilność importu assetów (ASSET-001...005).

- **Path**: `/Users/krystiangaleczka/Downloads/Vectoria/packages/io/test/file-drop-importer.test.ts`
  - **Przed**: Plik nie istniał.
  - **Po**: Utworzono testy pokrywające limity rozmiaru, sanityzację XSS/scriptów/handlerów, puste SVG, PDF i obrazy rastrowe.
  - **Cel**: Weryfikacja regresji i bezpieczeństwa importu.

- **Path**: `/Users/krystiangaleczka/Downloads/Vectoria/packages/core/src/model/mutation-guards.ts`
  - **Przed**: Plik nie istniał.
  - **Po**: Utworzono funkcję `validateLockedMutations(oldDoc, newDoc)` chroniącą zablokowane obiekty i warstwy przed nieuprawnioną modyfikacją.
  - **Cel**: Realizacja invariantów blokady (LAYER-009, LAYER-010).

- **Path**: `/Users/krystiangaleczka/Downloads/Vectoria/packages/core/src/commands/command.ts`
  - **Przed**: `CommandHistory` sprawdzał tylko `validateInvariants`.
  - **Po**: Dodano sprawdzanie `validateLockedMutations` przy execute, undo i redo.
  - **Cel**: Odrzucanie komend naruszających blokadę.

- **Path**: `/Users/krystiangaleczka/Downloads/Vectoria/packages/editor-engine/src/hit-test.ts`
  - **Przed**: `hitTest` bezwzględnie pomijał `layer.locked` i `obj.locked`.
  - **Po**: Dodano opcję `includeLocked?: boolean` w `HitTestOptions`.
  - **Cel**: Umożliwienie zaznaczania zablokowanych obiektów do inspekcji (LAYER-009).

- **Path**: `/Users/krystiangaleczka/Downloads/Vectoria/packages/editor-engine/test/culling.test.ts`
  - **Przed**: `hitTest` wołany z obiektem `visibleWorldRect` zamiast `HitTestOptions`.
  - **Po**: Zaktualizowano sygnaturę wywołania.
  - **Cel**: Spójność typów.

- **Path**: `/Users/krystiangaleczka/Downloads/Vectoria/apps/web/src/features/dialogs/WebFontImportDialog.tsx`
  - **Przed**: Plik nie istniał.
  - **Po**: Utworzono modal z formularzem do wprowadzania URL fontu (Google Fonts / woff2 / ttf) z dynamicznym ładowaniem przez FontFace API.
  - **Cel**: Import fontów webowych z sieci.

- **Path**: `/Users/krystiangaleczka/Downloads/Vectoria/apps/web/src/app/EditorApp.tsx`
  - **Przed**: Hardcoded sprawdzenie fontu Inter przy outline, brak integracji z WebFontImportDialog.
  - **Po**: Usunięto hardcoded check, zintegrowano detekcję brakujących fontów oraz dialog importu fontów webowych.
  - **Cel**: Obsługa typografii i fontów (EPIC-10).

- **Path**: `/Users/krystiangaleczka/Downloads/Vectoria/apps/web/src/features/panels/PropertiesPanel.tsx`
  - **Przed**: Brak kontrolek dla Variable Font Axes.
  - **Po**: Dodano sekcję Variable Font Axes (wght, wdth, slnt) oraz poprawiono błąd TS5076.
  - **Cel**: Obsługa osi fontów zmiennych.

- **Path**: `/Users/krystiangaleczka/Downloads/Vectoria/apps/web/src/features/topbar/AppMenuBar.tsx` & `TopBar.tsx`
  - **Przed**: Brak pozycji menu "Importuj font webowy...".
  - **Po**: Dodano pozycję w menu Plik/Tekst.
  - **Cel**: Dostępność funkcji z poziomu menu.

- **Path**: `/Users/krystiangaleczka/Downloads/Vectoria/AGENTS.md`
  - **Przed**: Brak wytycznych o środowiskach Browser vs Node i kompletności regexów atrybutów.
  - **Po**: Dodano sekcję `1b. Pułapki implementacyjne` zapobiegającą powtarzaniu typowych błędów implementacyjnych.
  - **Cel**: Utrwalenie reguł pracy dla agentów AI.
