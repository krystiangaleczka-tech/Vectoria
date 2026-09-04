# Progress Log: 2026-09-04_0453_vectoria_epic-16-export
Date: 2026-09-04 04:53

## Meta
- **Area**: Export Pipeline, Rasterization, PDF Generation, Memory Safety, UI Dialogs, E2E Testing
- **Task**: EPIC-16: Eksport (EXPORT-001…024)

## Summary
Zrealizowano pełny, bezpieczny pamięciowo i architektonicznie odizolowany pipeline eksportu dla Vectoria obejmujący formaty SVG (editable oraz optimized), raster (PNG 1x/2x/3x/custom, JPEG z wymuszonym tłem, WebP z kontrolą jakości), jedno- i wielostronicowy PDF z obsługą spadów i crop marks, cele wycinków w przestrzeni świata (artboard, zaznaczenie, wycinek rect), asynchroniczną kolejkę zadań FIFO (`ExportJobRunner`) z immutable snapshotem oraz pełny dialog eksportu (`ExportDialog`, 640 px) z podglądem, estymacją rozmiaru pliku i szablonami nazewnictwa Export for Screens.

## Problem
- Brak obsługi formatów JPEG, WebP oraz PDF.
- Eksport PNG działał tylko dla całego artboardu w skali 1x i nie posiadał ograniczeń chroniących przed awarią pamięci (OOM).
- Eksportowany kod SVG zawierał wewnętrzne metadane edytora (`data-vectoria-*`).
- Brak możliwości wycinania zaznaczenia lub dowolnego prostokątnego obszaru roboczego.
- Brak kolejki zadań ze wskaźnikiem etapów, możliwością anulowania i estymacją rozmiaru pliku.

## Implementation
1. **`packages/io`**:
   - `export-types.ts`: Kontrakty i schematy Zod dla żądań eksportu, celów, opcji i statusów zadań.
   - `export-targets.ts`: `resolveExportRect` obliczająca geometrię w koordynatach świata niezależnie od kamery.
   - `svg/export.ts`: Refaktoryzacja rdzenia do `exportRegionToSvg` z zachowaniem `exportArtboardToSvg` jako kompatybilnego wrappera.
   - `export/svg-optimize.ts`: `optimizeSvg` czyszczący atrybuty edytorskie i minifikujący liczby.
   - `export/raster-export.ts`: `rasterizeSvgToBlob` na izolowanym canvasie z `assertSafeRasterDimensions` (limit 100 MP i 16 384 px).
   - `export/pdf-export.ts`: `exportDocToPdf` oparty o `pdf-lib` ze wsparciem jedno- i wielostronicowym, spadami i znacznikami cięcia.
   - `export/export-jobs.ts`: `ExportJobRunner` sekwencyjnie realizujący zadania FIFO ze snapshotem i `AbortSignal`.
2. **`apps/web`**:
   - `ExportDialog.tsx`: Dialog modalny 640 px (zakładki formatów, podgląd targetów, estymacja rozmiaru, aria-live).
   - `useExportController.ts`: Hook łączący kolejkę runnera z wyzwalaniem pobierania plików.
   - `export-naming.ts`: Szablony nazw `{artboard}`, `{layer}`, `{object}`, `{scale}`, `{format}`.
   - `AppMenuBar.tsx` & `TopBar.tsx`: Integracja z menu Plik i belką górną.
   - `ContextualControlBar.tsx`: Zapewnienie priorytetu ustawień narzędzia rysowania nad zaznaczeniem.
3. **Dokumentacja i ADR**:
   - Spisano [ADR-016](file:///Users/krystiangaleczka/Downloads/Vectoria/docs/adr/ADR_016_EXPORT_PIPELINE_TARGETS_JOBS_AND_PDF.md).
   - Zaktualizowano [BACKLOG.md](file:///Users/krystiangaleczka/Downloads/Vectoria/BACKLOG.md), [epics/EPIC-16_Eksport.md](file:///Users/krystiangaleczka/Downloads/Vectoria/epics/EPIC-16_Eksport.md) oraz [plans/PLAN_EPIC-16_eksport.md](file:///Users/krystiangaleczka/Downloads/Vectoria/plans/PLAN_EPIC-16_eksport.md).

## Validation
- `pnpm typecheck`: 0 błędów we wszystkich pakietach.
- `pnpm lint`: 0 błędów, 0 ostrzeżeń.
- `pnpm test`: 73 pliki zaliczone, 395 testów zaliczonych (100%).
- `pnpm test:e2e`: 25/25 testów Playwright zaliczonych (100%).
- `pnpm build`: Czysty build produkcyjny Vite (1.99s).

## Files Changed
- `docs/adr/ADR_016_EXPORT_PIPELINE_TARGETS_JOBS_AND_PDF.md`
- `packages/io/package.json`
- `packages/io/src/index.ts`
- `packages/io/src/svg/export.ts`
- `packages/io/src/svg/import.ts`
- `packages/io/src/export/export-types.ts`
- `packages/io/src/export/export-targets.ts`
- `packages/io/src/export/raster-export.ts`
- `packages/io/src/export/export-jobs.ts`
- `packages/io/src/export/svg-optimize.ts`
- `packages/io/src/export/pdf-export.ts`
- `packages/io/test/export-jobs.test.ts`
- `packages/io/test/export-region.test.ts`
- `packages/io/test/export-targets.test.ts`
- `packages/io/test/pdf-export.test.ts`
- `packages/io/test/raster-export.test.ts`
- `packages/io/test/svg-optimize.test.ts`
- `apps/web/src/features/dialogs/ExportDialog.tsx`
- `apps/web/src/features/export/export-naming.ts`
- `apps/web/src/features/export/useExportController.ts`
- `apps/web/src/features/panels/ContextualControlBar.tsx`
- `apps/web/src/features/topbar/AppMenuBar.tsx`
- `apps/web/src/features/topbar/TopBar.tsx`
- `apps/web/src/app/EditorApp.tsx`
- `apps/web/src/app/editor.css`
- `apps/web/test/export-naming.test.ts`
- `BACKLOG.md`
- `epics/EPIC-16_Eksport.md`
- `plans/PLAN_EPIC-16_eksport.md`
- `dump/2026-09-04_0453_vectoria_epic-16-export.md`
- `progress_log/2026-09-04_0453_vectoria_epic-16-export.md`
- `pnpm-lock.yaml`

## Outcome
Vectoria posiada kompletny, w pełni profesjonalny system eksportu wektorowego i rastrowego spełniający wszystkie wymagania specyfikacji EPIC-16, gwarantujący stabilność pamięciową, niezmienność historii Undo/Redo oraz stuprocentową zgodność z testami regresyjnymi i E2E.
