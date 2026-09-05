# Dump: 2026-09-05_1753_vectoria_epic-16-18_przebudowa
Date: 2026-09-05 17:53

## Meta
- **Area**: Storage (IndexedDB multi-project isolation), Export Pipeline (PDF options & frozen selection snapshot), Formats (AI/CDR honesty & vector DTP PDF), UX (onboarding spotlight & dialog a11y), E2E test portability
- **Task**: PLAN_EPIC-16-18_przebudowa (Przebudowa EPIC-16–18: Trwałość projektów, eksport PDF, uczciwość formatów i UX)

## Stan PRZED
1. **Niszczenie danych projektów (P0)**: `IndexedDBDocumentRepository` był sztywno konstruowany z kluczem `current_document` (`document-store.ts:10`), przez co każde wywołanie `save(...)` nadpisywało ten sam rekord. `EditorApp` próbował ładować po `project.documentId`, po czym w bloku fallbacku cicho tworzył pusty dokument pod `current_document`, niszcząc dane projektów.
2. **Gubienie opcji PDF (P0)**: `ExportFormatOptionsSchema` oraz `ExportDialog` nie przekazywały pól `pdfAllArtboards`, `pdfBleed` i `pdfCropMarks` do pipeline'u wykonawczego; `useExportController` twardo wywoływał `exportDocToPdf` z domyślnymi parametrami.
3. **Pływający snapshot selekcji (P0)**: Podczas eksportu zaznaczenia `useExportController` odczytywał `selectionRef.current` dynamicznie podczas wykonywania joba w kolejce, przez co zmiana selekcji w edytorze po kliknięciu „Eksportuj” skutkowała eksportem niewłaściwego obszaru.
4. **Nieprawdziwe deklaracje AI/CDR (P0)**: Aplikacja reklamowała bezpośredni eksport `.ai` i `.cdr` jako natywne formaty (ADR-021), podczas gdy `.ai` osadzał raster PNG w PDF, a `.cdr` był własnym archiwum zip z XML.
5. **Brak spotlightu w samouczku (P1)**: Karta `TutorialOverlay` była zawsze wycentrowana na środku ekranu, a atrybut `targetSelector` kroków był ignorowany.
6. **Ścieżki bezwzględne w testach E2E (P1)**: W `editor.spec.ts` znajdowały się hardcodowane ścieżki `/Users/krystiangaleczka/...` do screenshotów Playwright.

## Stan PO
1. **Prawdziwa wieloprojektowość (1 projekt → 1 documentId → 1 rekord)**: Metody `save` i `saveAtomic` w `DocumentRepository` oraz `IndexedDBDocumentRepository` przyjmują jawny `documentId`. `handleCreateProjectInGallery` i `handleOpenProject` operują na dedykowanych rekordach, z obsługą kompensacji błędu (`deleteDocument`) oraz jawnym błędem przy braku rekordu. Dodano implementację `MemoryDocumentRepository`.
2. **Pełne przekazywanie opcji PDF**: `ExportFormatOptionsSchema` waliduje obiekt `pdf: { artboards, bleedPt, cropMarks }`, `ExportDialog` przekazuje go w `ExportRequest`, a `useExportController` poprawnie steruje `exportDocToPdf`.
3. **Zamrożony snapshot selekcji**: Wprowadzono `ExportExecutionSnapshot` `{ document, selection, rect }`. Geometria i selekcja są zamrażane w chwili wywołania `startExport` przed kolejkowaniem w `ExportJobRunner`.
4. **Uczciwy interfejs eksportu**: Usunięto formaty `ai` i `cdr` z `EXPORT_FORMATS` oraz z okna `ExportDialog`. W menu `Plik` zastąpiono je pozycją: `Eksportuj wektorowy PDF do aplikacji DTP…`. Status `ADR-021` zmieniono na `Superseded / Proposed`.
5. **Realistyczny spotlight samouczka**: Zaimplementowano hook `useTutorialTarget` oraz element `.tutorial-spotlight` z potężnym cieniem (`boxShadow: 0 0 0 9999px rgba(0, 0, 0, 0.55)`), dynamicznie wycinającym aperturę wokół wskazanego elementu DOM.
6. **Przenośne testy Playwright**: Usunięto ścieżki absolutne z `editor.spec.ts` na rzecz `testInfo.outputPath(...)`.

## Implementacja
- Zmodyfikowano `DocumentRepository`, `IndexedDBDocumentRepository` oraz `document-store.ts`.
- Zaktualizowano `EditorApp.tsx` w zakresie `handleCreateProjectInGallery`, `handleOpenProject` oraz `processSaveQueue`.
- Zaktualizowano `export-types.ts`, `export-jobs.ts` oraz `useExportController.ts`.
- Zaktualizowano `ExportDialog.tsx` oraz `AppMenuBar.tsx`.
- Zaktualizowano `ADR_021_AI_CDR_EXPORT_COMPATIBILITY.md`.
- Rozbudowano `TutorialOverlay.tsx` o hook `useTutorialTarget` i ramkę spotlight.
- Dodano test wieloprojektowości `workspace-multi-project-storage.test.ts`.
- Rozszerzono testy `export-jobs.test.ts`, `ai-cdr-export.spec.ts`, `Dialog.test.tsx` oraz `editor.spec.ts`.

## Walidacja
- `pnpm lint`: 0 błędów, 0 ostrzeżeń (wszystkie 7 pakietów workspace).
- `pnpm typecheck`: 0 błędów (wszystkie pakiety monorepo).
- `pnpm test`: 83 pliki testowe, 432 testy zdane, 4 pominięte (100% PASS).
- Dedykowane testy:
  - `workspace-multi-project-storage.test.ts`: PASS (izolacja projektów A i B).
  - `export-jobs.test.ts`: PASS (zamrożenie snapshotu selekcji).
  - `ai-cdr-export.spec.ts`: PASS (weryfikacja braku ai/cdr w EXPORT_FORMATS).
  - `Dialog.test.tsx`: PASS (backdrop click i focus trap).

## Ograniczenia
- Natywny, w pełni edytowalny format binarny Adobe Illustrator / CorelDRAW wymaga stworzenia odrębnego silnika i specyfikacji (zastąpiony wektorowym PDF dla programów DTP).

## Następny bezpieczny krok
- Oznaczenie faz 1–3 w backlogu jako ukończonych warunkowo (zgodnie z zasadą release'u zapisaną w planie).
- Rozpoczęcie prac nad wektorowym profilem PDF (etap 4 / P1 z planu).

## Zmiany per plik (Changes Per File)

### `packages/io/src/storage/document-repository.ts`
- **Stan przed**: Sygnatura `save(snapshot)` bez ID; brak implementacji in-memory.
- **Konkretna zmiana po**: Dodanie parametru `documentId: string` do `save` i `saveAtomic`; dodanie klasy `MemoryDocumentRepository`.
- **Cel**: Wyeliminowanie niejawnych kluczy zapisu i wsparcie testowania.

### `packages/io/src/storage/indexeddb-repository.ts`
- **Stan przed**: Zapisywanie zawsze pod `this.storageKey ?? snapshot.document.id`.
- **Konkretna zmiana po**: Sygnatury `save(documentId, snapshot)` i `saveAtomic(documentId, snapshot)` z priorytetem dla przekazanego `documentId`.
- **Cel**: Zapobieganie nadpisywaniu stałym kluczem `current_document`.

### `packages/io/src/storage/document-store.ts`
- **Stan przed**: Singleton `activeRepository` inicjalizowany z sztywnym kluczem `CURRENT_DOC_KEY`.
- **Konkretna zmiana po**: Konstrukcja domyślnego repozytorium bez sztywnego klucza; metody `saveDocument` i `saveDocumentSnapshot` przyjmują opcjonalny `documentId`.
- **Cel**: Uniezależnienie repozytorium od pojedynczego stałego dokumentu.

### `apps/web/src/app/EditorApp.tsx`
- **Stan przed**: Tworzenie projektu zapisywało pod domyślnym kluczem; otwieranie przy błędzie tworzyło pusty projekt niszcząc dane; autosave nie podawał `documentId`.
- **Konkretna zmiana po**: Jawny zapis pod `newDoc.id`, obsługa kompensacji (`deleteDocument`), rzucanie błędu przy braku rekordu zamiast tworzenia pustego dokumentu, autosave z `request.document.id`.
- **Cel**: Gwarancja trwałości i integralności niezależnych projektów użytkownika.

### `packages/io/src/export/export-types.ts`
- **Stan przed**: `EXPORT_FORMATS` zawierał nieprawdziwe `ai` i `cdr`; schema nie posiadała opcji PDF ani typu snapshotu.
- **Konkretna zmiana po**: Usunięcie `ai`/`cdr` z formatów; dodanie obiektu `pdf` do `ExportFormatOptionsSchema`; dodanie typu `ExportExecutionSnapshot`.
- **Cel**: Uczciwość kontraktu eksportu oraz wsparcie opcji PDF i zamrażania selekcji.

### `packages/io/src/export/export-jobs.ts`
- **Stan przed**: `JobInput` nie przyjmował snapshotu.
- **Konkretna zmiana po**: Dodanie opcjonalnego pola `snapshot: ExportExecutionSnapshot` do `JobInput` i przekazanie go do wywołania `run`.
- **Cel**: Dostarczenie zamrożonych danych do asynchronicznego wykonawcy zadania.

### `apps/web/src/features/export/useExportController.ts`
- **Stan przed**: Odczyt mutable selekcji wewnątrz runnera; brak przekazywania opcji PDF (`bleed`, `cropMarks`, `all artboards`); logika formatów AI i CDR.
- **Konkretna zmiana po**: Zamrożenie `selectionSnapshot` i obliczenie `rect` w `startExport`; przekazanie snapshotu do runnera; obsługa opcji PDF w runnerze; usunięcie logiki AI/CDR.
- **Cel**: Determinizm eksportu zaznaczenia oraz pełna obsługa opcji PDF.

### `apps/web/src/features/dialogs/ExportDialog.tsx`
- **Stan przed**: Opcje PDF nie były przekazywane w żądaniu; zakładki formatów zawierały AI i CDR.
- **Konkretna zmiana po**: Przekazywanie `pdf: { artboards, bleedPt, cropMarks }` w `ExportRequest`; usunięcie zakładek AI/CDR i uproszczenie kalkulatora rozmiaru.
- **Cel**: Przekazywanie ustawień PDF z interfejsu i wycofanie niepopartych formatów.

### `apps/web/src/features/topbar/AppMenuBar.tsx`
- **Stan przed**: Pozycje menu `Zapisz kopię jako Adobe Illustrator (.ai)` i `CorelDRAW (.cdr)`.
- **Konkretna zmiana po**: Zastąpienie ich pozycją `Eksportuj wektorowy PDF do aplikacji DTP…`.
- **Cel**: Zgodność interfejsu z rzeczywistym, bezpiecznym workflow wymiany DTP.

### `docs/adr/ADR_021_AI_CDR_EXPORT_COMPATIBILITY.md`
- **Stan przed**: Status `Accepted` z deklaracją bezpośredniej zgodności z Illustrator/Corel.
- **Konkretna zmiana po**: Status `Superseded / Proposed` z uzasadnieniem oparcia wymiany o wektorowy PDF.
- **Cel**: Uczciwość dokumentacji architektonicznej.

### `apps/web/src/features/onboarding/TutorialOverlay.tsx`
- **Stan przed**: Statyczna wycentrowana karta, `targetSelector` ignorowany.
- **Konkretna zmiana po**: Dodanie hooka `useTutorialTarget` i ramki `.tutorial-spotlight` z dynamiczną aperturą cienia.
- **Cel**: Rzeczywisty spotlight na wskazywane narzędzia i kontrolki interfejsu.

### `apps/web/e2e/editor.spec.ts`
- **Stan przed**: Ścieżki absolutne `/Users/...` i asercje pozycji AI/CDR w menu.
- **Konkretna zmiana po**: Zastąpienie ścieżek `testInfo.outputPath(...)` i weryfikacja opcji DTP PDF.
- **Cel**: Przenośność testów Playwright i dopasowanie do zaktualizowanego menu.

### `packages/io/test/workspace-multi-project-storage.test.ts`
- **Stan przed**: Brak pliku.
- **Konkretna zmiana po**: Nowy test weryfikujący niezależne zapisywanie, odczyt i usuwanie dwóch projektów.
- **Cel**: Trwałe zabezpieczenie przed regresją w mechanizmie magazynu IndexedDB.

### `packages/io/test/export-jobs.test.ts`
- **Stan przed**: Brak testu snapshotów wykonania.
- **Konkretna zmiana po**: Dodanie testu zamrażania `ExportExecutionSnapshot` przy `enqueue`.
- **Cel**: Potwierdzenie determinizmu kolejki eksportu.

### `packages/io/test/ai-cdr-export.spec.ts`
- **Stan przed**: Brak weryfikacji formatów publicznych.
- **Konkretna zmiana po**: Dodanie asercji potwierdzającej brak `ai`/`cdr` w `EXPORT_FORMATS`.
- **Cel**: Ochrona przed przypadkowym przywróceniem niespełniających standardu formatów.

### `packages/ui/test/Dialog.test.tsx`
- **Stan przed**: Brak testów kliknięcia w backdrop oraz kontrolek formularza w focus trap.
- **Konkretna zmiana po**: Dodanie testów kliknięcia w backdrop (vs zawartość) i focus trap z textarea/select.
- **Cel**: Weryfikacja kryteriów dostępności WAI-ARIA dla komponentu Dialog.

### `plans/PLAN_EPIC-16-18_przebudowa.md`
- **Stan przed**: Brak pliku.
- **Konkretna zmiana po**: Zapisany kompletny plan przebudowy EPIC-16–18.
- **Cel**: Śledzenie wymagań i kolejności realizacji faz.
