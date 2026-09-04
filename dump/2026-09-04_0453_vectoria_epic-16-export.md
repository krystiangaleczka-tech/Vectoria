# Dump: 2026-09-04_0453_vectoria_epic-16-export
Date: 2026-09-04 04:53

## Metadata
- **Task**: EPIC-16: Eksport (EXPORT-001…024)
- **Branch**: master
- **Status**: Complete & Verified

## Problem
1. Wektorowy eksport SVG był ograniczony wyłącznie do całego aktywnego artboardu, bez możliwości wyboru tła, wycinania zaznaczenia lub wycinka obszaru roboczego, a eksportowany kod SVG zawierał wewnętrzne atrybuty edytora (`data-vectoria-*`).
2. Brak zaawansowanego eksportu rastrowego: PNG działał tylko w 1x bez skali i bez ochrony pamięci przed OOM, brakowało formatów JPEG i WebP oraz kontroli jakości kompresji.
3. Brak obsługi eksportu do PDF (brak jedno- i wielostronicowego eksportu artboardów, brak spadów i znaczników cięcia).
4. Brak kolejki zadań eksportu FIFO z obsługą postępu i anulowania – eksport był synchroniczny i nie informował o etapach serializacji i kodowania.
5. Brak dedykowanego dialogu eksportu (`ExportDialog`) z podglądem parametrów, estymacją rozmiaru pliku i elastycznym nazewnictwem wsadowym (Export for Screens).

## Implementation Details
1. **Kontrakty i walidacja (`packages/io/src/export/export-types.ts`)**:
   - Wprowadzono typy i schematy Zod: `ExportRequest`, `ExportTarget`, `ExportFormatOptions`, `ExportJob` oraz stałe `EXPORT_MEMORY_LIMITS`.
2. **Geometria targetów w przestrzeni świata (`packages/io/src/export/export-targets.ts`)**:
   - Zaimplementowano `resolveExportRect(doc, target, selection)` obliczający world-space rect dla artboardu, unii wielu zaznaczonych obiektów oraz jawnego obszaru rect, niezależnie od zoomu i pozycji kamery.
3. **Rdzeń eksportu SVG (`packages/io/src/svg/export.ts`)**:
   - Wydzielono `exportRegionToSvg(doc, rect, options)` jako uniwersalny rdzeń eksportu ze wsparciem dla tła (`none` / color) i obcinania obiektów.
   - `exportArtboardToSvg` zachowano jako kompatybilny wstecznie wrapper zabezpieczony testem golden.
4. **Optymalizator SVG (`packages/io/src/export/svg-optimize.ts`)**:
   - `optimizeSvg(svg)` oczyszcza atrybuty `data-vectoria-*`, usuwa komentarze XML i zaokrągla liczby zmiennoprzecinkowe do 2 miejsc po przecinku (EXPORT-002).
5. **Zunifikowana rasteryzacja i ochrona pamięci (`packages/io/src/export/raster-export.ts`)**:
   - `rasterizeSvgToBlob` na izolowanym canvasie dla formatów PNG, JPEG i WebP z parametrem jakości.
   - Wymuszenie tła `#ffffff` dla formatu JPEG (brak przezroczystości).
   - Twardy guard `assertSafeRasterDimensions` rzucający `EXPORT_MEMORY_LIMIT` przy próbie alokacji >100 MP lub boku >16 384 px.
6. **Wielostronicowy eksport PDF (`packages/io/src/export/pdf-export.ts`)**:
   - Wprowadzono bibliotekę `pdf-lib` do generowania jedno- i wielostronicowych dokumentów PDF z osadzonym rastrem wysokiej rozdzielczości, opcją spadów (bleed 3 mm) oraz znacznikami cięcia crop marks (EXPORT-012..014).
7. **Kolejka FIFO i model zadań (`packages/io/src/export/export-jobs.ts`)**:
   - `ExportJobRunner` sekwencyjnie realizuje zadania z immutowalnym snapshotem dokumentu, raportując etapy `serialize` → `raster` → `encode` → `deliver` z pełną obsługą `AbortController`.
8. **Interfejs użytkownika edytora (`apps/web`)**:
   - `ExportDialog.tsx`: responsywny dialog modalny 640 px z obsługą focus trap, klawiatury Esc/Enter, aria-live, dynamicznym estymatorem rozmiaru pliku i zakładkami formatów.
   - `useExportController.ts`: React hook integrujący runnera z automatycznym pobieraniem wygenerowanych plików.
   - `export-naming.ts`: obsługa szablonów nazw z tokenami `{artboard}`, `{layer}`, `{object}`, `{scale}`, `{format}`.
   - Integracja z `AppMenuBar.tsx` i `TopBar.tsx`.
9. **Architektura i dokumentacja**:
   - Spisano formalny rekord decyzji architektonicznych [ADR-016](file:///Users/krystiangaleczka/Downloads/Vectoria/docs/adr/ADR_016_EXPORT_PIPELINE_TARGETS_JOBS_AND_PDF.md).
   - Zaktualizowano [BACKLOG.md](file:///Users/krystiangaleczka/Downloads/Vectoria/BACKLOG.md), [epics/EPIC-16_Eksport.md](file:///Users/krystiangaleczka/Downloads/Vectoria/epics/EPIC-16_Eksport.md) oraz [plans/PLAN_EPIC-16_eksport.md](file:///Users/krystiangaleczka/Downloads/Vectoria/plans/PLAN_EPIC-16_eksport.md).

## Changes Per File

### `docs/adr/ADR_016_EXPORT_PIPELINE_TARGETS_JOBS_AND_PDF.md`
- **Stan przed**: Brak formalnego rekordu decyzji dla pipeline'u eksportu.
- **Stan po**: Nowy plik dokumentujący decyzje D1–D11, kontrakty, niezmienniki, memory guard oraz architekturę PDF.
- **Uzasadnienie**: Zgodność z AGENTS.md §10 (wymóg ADR przed modyfikacją kontraktów IO).

### `packages/io/package.json`
- **Stan przed**: Brak zależności `pdf-lib`.
- **Stan po**: Dodano zależność `pdf-lib` (^1.17.9).
- **Uzasadnienie**: Umożliwienie tworzenia plików PDF w przeglądarce i Node.js.

### `packages/io/src/export/export-types.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Zdefiniowano schematy Zod i typy TypeScript dla żądań, celów, opcji i statusów zadań eksportu.
- **Uzasadnienie**: Ścisła walidacja granic modułu IO (D1).

### `packages/io/src/export/export-targets.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Zaimplementowano funkcję `resolveExportRect` wyznaczającą geometrię w koordynatach świata dla artboardu, zaznaczenia i wycinka.
- **Uzasadnienie**: Unifikacja wyliczania obszarów eksportu niezależnie od kamery (D2).

### `packages/io/src/export/raster-export.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Zaimplementowano `rasterizeSvgToBlob` oraz `assertSafeRasterDimensions` z obsługą PNG/JPEG/WebP, quality i tła.
- **Uzasadnienie**: Centralny pipeline rasteryzacji z ochroną pamięci RAM (D4/D6).

### `packages/io/src/export/svg-optimize.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Zaimplementowano `optimizeSvg` czyszczący `data-vectoria-*`, komentarze i minifikujący liczby.
- **Uzasadnienie**: Realizacja zadania EXPORT-002.

### `packages/io/src/export/pdf-export.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Zaimplementowano `exportDocToPdf` z obsługą jednego/wielu artboardów, spadów i znaczników cięcia.
- **Uzasadnienie**: Realizacja zadań EXPORT-012..014.

### `packages/io/src/export/export-jobs.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Zaimplementowano klasę `ExportJobRunner` z kolejką FIFO, obsługą etapów, `AbortController` i immutowalnym snapshotem.
- **Uzasadnienie**: Realizacja zadań EXPORT-023..024.

### `packages/io/src/svg/export.ts`
- **Stan przed**: Sztywny eksport całego artboardu wewnątrz `exportArtboardToSvg`.
- **Stan po**: Dodano `exportRegionToSvg(doc, rect, options)` i przepisano `exportArtboardToSvg` jako wstecznie zgodny wrapper.
- **Uzasadnienie**: Eksport zaznaczenia i dowolnych wycinków bez duplikacji kodu (D3).

### `packages/io/src/svg/import.ts`
- **Stan przed**: `rasterizeSvgToPng` bezpośrednio tworzył canvas i sztywny Blob PNG.
- **Stan po**: `rasterizeSvgToPng` przekształcono w wrapper delegujący do `rasterizeSvgToBlob`.
- **Uzasadnienie**: Eliminacja duplikacji kodu rasteryzacji.

### `packages/io/src/index.ts`
- **Stan przed**: Eksportował tylko starsze funkcje importu/eksportu.
- **Stan po**: Wyeksportowano moduły z katalogu `src/export/`.
- **Uzasadnienie**: Publiczne API pakietu IO.

### `packages/io/test/*`
- **Stan przed**: Brak testów dla nowych modułów eksportu.
- **Stan po**: Dodano testy jednostkowe: `export-jobs.test.ts`, `export-region.test.ts` (w tym golden test), `export-targets.test.ts`, `pdf-export.test.ts`, `raster-export.test.ts`, `svg-optimize.test.ts`.
- **Uzasadnienie**: Pełne pokrycie testami warstwy domenowej IO.

### `apps/web/src/features/export/export-naming.ts` & `test/export-naming.test.ts`
- **Stan przed**: Pliki nie istniały.
- **Stan po**: Zaimplementowano `resolveFileName` z tokenami `{artboard}`, `{layer}`, `{object}`, `{scale}`, `{format}` oraz testy jednostkowe.
- **Uzasadnienie**: Realizacja zadań EXPORT-020..021.

### `apps/web/src/features/export/useExportController.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Dodano hook zarządzający kolejką eksportu, snapshotem dokumentu i wyzwalaniem pobierania plików.
- **Uzasadnienie**: Integracja runnera IO z warstwą React.

### `apps/web/src/features/dialogs/ExportDialog.tsx`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Zaimplementowano kompletny modal dialogu eksportu z podglądem, estymacją rozmiaru, zakładkami i raportem błędów.
- **Uzasadnienie**: Realizacja wymagań UI i dostępności dla EPIC-16.

### `apps/web/src/features/topbar/AppMenuBar.tsx` & `TopBar.tsx`
- **Stan przed**: Brak pozycji otwierającej dialog eksportu.
- **Stan po**: Dodano pozycję „Eksportuj…” (Ctrl+Shift+E), zachowano szybki eksport SVG/PNG, dodano przycisk dialogu w TopBar.
- **Uzasadnienie**: Dostępność eksportu z menu i belki głównej.

### `apps/web/src/features/panels/ContextualControlBar.tsx`
- **Stan przed**: Rysowanie ołówkiem/pędzlem po utworzeniu ścieżki przełączało pasek w tryb właściwości zaznaczonego obiektu.
- **Stan po**: Nadano priorytet kontrolkom aktywnego narzędzia rysowania (ołówek, pędzel, gumka, wygładzanie).
- **Uzasadnienie**: Zapewnienie stałego dostępu do opcji narzędzia rysowania bez blokowania przez selekcję.

### `apps/web/src/app/EditorApp.tsx` & `editor.css`
- **Stan przed**: Brak dialogu eksportu i jego stylów.
- **Stan po**: Podpięto `ExportDialog`, stan otwarcia dialogu oraz dodano style CSS dla zakładek, podglądów i wskaźników postępu.
- **Uzasadnienie**: Pełna integracja UI w aplikacji.

### `BACKLOG.md`, `epics/EPIC-16_Eksport.md`, `plans/PLAN_EPIC-16_eksport.md`
- **Stan przed**: Zadania EXPORT-001..024 w statusie nieukończonym / brak synchronizacji.
- **Stan po**: Zaznaczono zadania EXPORT-001…024 jako ukończone (`[x]`), potwierdzono Definition of Done i oznaczono plan jako **wdrożone (DONE)**.
- **Uzasadnienie**: Utrzymanie spójności dokumentacji projektu.

## Quality Gates
- `pnpm typecheck`: 0 błędów w monorepo.
- `pnpm lint`: 0 błędów, 0 ostrzeżeń.
- `pnpm test`: 73 pliki zaliczone, 395 testów zaliczonych (100%).
- `pnpm test:e2e`: 25/25 testów Playwright zaliczonych (100%).
- `pnpm build`: Pomyślna kompilacja produkcyjna Vite (1.99s).
