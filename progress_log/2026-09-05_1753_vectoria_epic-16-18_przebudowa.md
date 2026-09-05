# Progress Log: 2026-09-05_1753_vectoria_epic-16-18_przebudowa
Date: 2026-09-05 17:53

## Meta
- **Area**: Storage (IndexedDB multi-project isolation), Export Pipeline (PDF options & frozen selection snapshot), Formats (AI/CDR honesty & vector DTP PDF), UX (onboarding spotlight & dialog a11y), E2E test portability
- **Task**: PLAN_EPIC-16-18_przebudowa — Przebudowa EPIC-16–18 (P0–P1)

## Summary
Pomyślnie zrealizowano kluczowe fazy P0 i P1 planu przebudowy EPIC-16–18. Wyeliminowano krytyczny błąd nadpisywania projektów w IndexedDB spowodowany sztywnym kluczem singletona magazynu, wprowadzono jawny `documentId` w `DocumentRepository`, zabezpieczono otwieranie i tworzenie projektów przed cichym niszczeniem danych. W pipeline eksportu PDF przeprowadzono pełen zestaw parametrów (`artboards`, `bleedPt`, `cropMarks`) z UI do generatora oraz zaimplementowano zamrażanie snapshotu selekcji i geometrii w chwili kliknięcia „Eksportuj”. Uczciwie zreorganizowano formaty wymiany: usunięto niezweryfikowane claims AI/CDR na rzecz wektorowej wymiany PDF z aplikacjami DTP oraz zaktualizowano ADR-021. W warstwie UX zaimplementowano realistyczny spotlight samouczka (`TutorialOverlay`) i oczyszczono testy Playwright ze ścieżek bezwzględnych. Wszystkie jakościo-bramki przeszły w 100%.

## Problem
1. **Trwałość projektów (P0)**: Singleton magazynu IndexedDB korzystał z jednego stałego klucza `current_document`, przez co wszystkie projekty nadpisywały ten sam rekord w bazie. Przy próbie otwarcia projektu kod nie znajdował rekordu i cicho tworzył pusty dokument, nadpisując stan.
2. **Pipeline PDF (P0)**: Parametry spadu (`bleed`), znaczników cięcia (`cropMarks`) i wyboru wszystkich artboardów nie były przekazywane z okna dialogowego do funkcji `exportDocToPdf`.
3. **Pływający snapshot selekcji (P0)**: Zaznaczenie podczas eksportu było odczytywane asynchronicznie wewnątrz runnera z mutable refa, co powodowało eksport błędnego obszaru, gdy użytkownik zmienił selekcję w trakcie kolejkowania zadania.
4. **Nieprawdziwe deklaracje formatów (P0)**: Eksport `.ai` i `.cdr` nie zapewniał zapowiadanej edytowalności (osadzał raster PNG lub niestandardowy zip z XML).
5. **Samouczek bez spotlightu (P1)**: `TutorialOverlay` ignorował `targetSelector`, wyświetlając jedynie statyczną kartę w centrum ekranu.
6. **Nielokalne ścieżki w E2E (P1)**: Testy Playwright w `editor.spec.ts` zawierały hardcodowane ścieżki `/Users/krystiangaleczka/...`.

## Implementation
1. **Magazyn IndexedDB**:
   - `packages/io/src/storage/document-repository.ts`: wprowadzono `save(documentId, snapshot)` oraz `saveAtomic(documentId, snapshot)`; dodano `MemoryDocumentRepository`.
   - `packages/io/src/storage/indexeddb-repository.ts`: usunięto sztywne nadpisywanie kluczem; operacje zapisu kierowane są pod podany `documentId`.
   - `packages/io/src/storage/document-store.ts`: usunięto sztywny klucz z domyślnej instancji repozytorium.
   - `apps/web/src/app/EditorApp.tsx`: zaktualizowano `handleCreateProjectInGallery`, `handleOpenProject` (jawny błąd przy braku rekordu zamiast cichego pustego dokumentu) oraz `processSaveQueue`.
2. **Eksport PDF i zamrażanie selekcji**:
   - `packages/io/src/export/export-types.ts`: rozszerzono `ExportFormatOptionsSchema` o walidowany obiekt `pdf`; dodano strukturę `ExportExecutionSnapshot`.
   - `packages/io/src/export/export-jobs.ts`: `JobInput` przekazuje opcjonalny snapshot do funkcji wykonawczej `run`.
   - `apps/web/src/features/export/useExportController.ts`: natychmiastowe zamrożenie geometrii i selekcji przy `startExport`; obsługa parametrów PDF (`artboardIds`, `scale`, `bleed`, `cropMarks`).
   - `apps/web/src/features/dialogs/ExportDialog.tsx`: przekazanie opcji `pdf` w `ExportRequest`.
3. **Uczciwość formatów**:
   - `packages/io/src/export/export-types.ts`: `EXPORT_FORMATS` ograniczono do `['svg', 'png', 'jpeg', 'webp', 'pdf']`.
   - `apps/web/src/features/dialogs/ExportDialog.tsx`: usunięto zakładki AI i CDR.
   - `apps/web/src/features/topbar/AppMenuBar.tsx`: dodano pozycję `Eksportuj wektorowy PDF do aplikacji DTP…`.
   - `docs/adr/ADR_021_AI_CDR_EXPORT_COMPATIBILITY.md`: status zmieniony na `Superseded / Proposed`.
4. **UX i testy**:
   - `apps/web/src/features/onboarding/TutorialOverlay.tsx`: dodano hook `useTutorialTarget` oraz ramkę `.tutorial-spotlight` z dynamicznym cieniem wycinającym aperturę.
   - `apps/web/e2e/editor.spec.ts`: ścieżki screenshotów zamienione na `testInfo.outputPath(...)`.
   - `packages/ui/test/Dialog.test.tsx`: dodano testy kliknięcia w backdrop oraz kontrolek formularza.

## Validation
- `pnpm lint`: 0 błędów, 0 ostrzeżeń we wszystkich pakietach.
- `pnpm typecheck`: 0 błędów we wszystkich 7 pakietach monorepo.
- `pnpm test`: 83 pliki testowe, 432 testy zdane (100% PASS), w tym:
  - `workspace-multi-project-storage.test.ts` (nowy test izolacji projektów w pamięci/repozytorium)
  - `export-jobs.test.ts` (zamrożenie snapshotu selekcji)
  - `pdf-export.test.ts` (wielostronicowy PDF, spady, crop marks)
  - `ai-cdr-export.spec.ts` (weryfikacja EXPORT_FORMATS bez ai/cdr)
  - `Dialog.test.tsx` (a11y i focus trap)

## Files Changed
- `apps/web/e2e/editor.spec.ts`
- `apps/web/src/app/EditorApp.tsx`
- `apps/web/src/features/dialogs/ExportDialog.tsx`
- `apps/web/src/features/export/useExportController.ts`
- `apps/web/src/features/onboarding/TutorialOverlay.tsx`
- `apps/web/src/features/topbar/AppMenuBar.tsx`
- `docs/adr/ADR_021_AI_CDR_EXPORT_COMPATIBILITY.md`
- `dump/2026-09-05_1753_vectoria_epic-16-18_przebudowa.md`
- `packages/io/src/export/export-jobs.ts`
- `packages/io/src/export/export-types.ts`
- `packages/io/src/storage/document-repository.ts`
- `packages/io/src/storage/document-store.ts`
- `packages/io/src/storage/indexeddb-repository.ts`
- `packages/io/test/ai-cdr-export.spec.ts`
- `packages/io/test/export-jobs.test.ts`
- `packages/io/test/workspace-multi-project-storage.test.ts`
- `packages/ui/test/Dialog.test.tsx`
- `plans/PLAN_EPIC-16-18_przebudowa.md`
- `progress_log/2026-09-05_1753_vectoria_epic-16-18_przebudowa.md`

## Outcome
Wszystkie błędy P0 i P1 zidentyfikowane w planie przebudowy zostały trwale naprawione, sprawdzając integralność danych wieloprojektowych, determinizm eksportu PDF i selekcji, uczciwość formatów wymiany oraz dostępność interfejsu.
