# ADR 016: Eksport — Kontrakty, Pipeline Rastrowy, Targety, Kolejka Zadań i PDF

**Data:** 2026-09-04  
**Status:** Accepted  
**Kontekst:** Wdrożenie kompleksowego systemu eksportu dokumentów i zaznaczeń (EPIC-16, EXPORT-001…024), obejmującego formaty SVG (editable/optimized), rastry (PNG/JPG/WebP), PDF oraz model zadań asynchronicznych i wsadowych (Export for Screens).

---

## Kontekst i problem

W edytorze wektorowym Vectoria istniał wyłącznie elementarny eksport SVG (`exportArtboardToSvg`) oraz PNG 1x w skali 1:1 (`rasterizeSvgToPng`). Brakowało:
1. Możliwości eksportowania określonego wycinka: zaznaczenia obiektów (`selection`) lub dowolnego prostokątnego obszaru (`area`) w przestrzeni świata (world-space).
2. Obsługi skalowania (2x, 3x, custom) oraz kontroli limitów pamięci zapobiegających awariom przeglądarki na urządzeniach mobilnych i desktopowych.
3. Obsługi formatów JPG (wymagającego twardej polityki tła, gdyż nie posiada kanału alpha) oraz WebP z regulacją jakości kompresji.
4. Eksportu do formatu PDF (zarówno pojedynczych artboardów, jak i wielostronicowego dla wszystkich artboardów, wraz ze spadami i znacznikami cięcia).
5. Asynchronicznego modelu zadań (`ExportJobRunner`) z kolejką FIFO, raportowaniem etapów (`serialize -> raster -> encode -> deliver`) oraz możliwością anulowania (`AbortSignal`).
6. Trybu zoptymalizowanego SVG (`optimizeSvg`), który minifikuje liczby i usuwa metadane edytora (`data-vectoria-*`).
7. Bezpieczeństwa danych: eksport nie może mutować stanu edytora, historii Undo/Redo ani blokować interakcji na canvasie.

---

## Decyzja

1. **Warstwa domenowa i kontrakty wejścia (`packages/io/src/export/export-types.ts`)**:
   - Wprowadzono schematy Zod dla `ExportTarget` (dyskr. unia: `artboard`, `selection`, `area`) oraz `ExportFormatOptions`.
   - Wprowadzono twarde ograniczenie alokacji rastra `EXPORT_MEMORY_LIMITS`: maksymalnie 100 000 000 pikseli (100 MP) oraz maksymalny bok 16 384 px. Przekroczenie rzuca kontrolowany błąd `EXPORT_MEMORY_LIMIT` przed alokacją canvasu.

2. **Geometria eksportu w World-Space (`packages/io/src/export/export-targets.ts`)**:
   - `resolveExportRect(doc, target, selection)` oblicza obszar prostokąta w przestrzeni logicznej dokumentu.
   - Kamera edytora (`camera.zoom`, `camera.pan`) celowo nie jest parametrem tej funkcji — eksport jest niezmienny względem widoku.
   - Target `selection` oblicza obwiednię unii widocznych zaznaczonych obiektów (`getObjectBounds`). Puste zaznaczenie rzuca `EXPORT_EMPTY_SELECTION`.

3. **Rdzeń generowania SVG z regionu (`packages/io/src/svg/export.ts`)**:
   - Wyodrębniono `exportRegionToSvg(doc, rect, options)` jako uniwersalną metodę generującą SVG z dowolnego `Rect`.
   - `exportArtboardToSvg` pozostaje w pełni kompatybilnym wstecznie wrapperem, gwarantującym bajtową identyczność wyjścia z poprzednią implementacją (zweryfikowaną testem golden).

4. **Zunifikowany potok rastrowy (`packages/io/src/export/raster-export.ts`)**:
   - Funkcja `rasterizeSvgToBlob(svg, width, height, options)` realizuje rasteryzację wyłącznie na tymczasowym canvasie (`document.createElement('canvas')`). Nigdy nie dotyka canvasu edytora.
   - Polityka tła: PNG i WebP zachowują przezroczystość (chyba że użytkownik wskaże tło). Format JPEG wymusza kryjące tło (domyślnie `#ffffff`), chroniąc przed niechcianym czarnym tłem po utracie przezroczystości.
   - `rasterizeSvgToPng` staje się cienkim wrapperem dla zachowania kompatybilności.

5. **Architektura PDF (`packages/io/src/export/pdf-export.ts`)**:
   - Zastosowanie biblioteki `pdf-lib` (MIT, kompatybilnej ze środowiskiem przeglądarki i Node.js).
   - Eksport generuje strony odpowiadające rozmiarowi artboardów, osadzając raster wysokiej rozdzielczości (2x) z zachowaniem metadanych.
   - Obsługa spadów (bleed) i znaczników cięcia (crop marks) powiększa `MediaBox` strony i dorysowuje linie kalibracyjne.

6. **Kolejka zadań i snapshot (`packages/io/src/export/export-jobs.ts`)**:
   - Klasa `ExportJobRunner` realizuje sekwencyjne kolejkowanie zadań FIFO.
   - Każde zadanie przechowuje niezmienny snapshot `DocumentModel` z chwili zlecenia (`enqueue`). Edycje na żywo w trakcie eksportu nie wpływają na wynik.
   - Obsługa `AbortSignal` umożliwia natychmiastowe przerwanie przetwarzania na dowolnym etapie bez generowania pliku.

7. **Optymalizacja SVG (`packages/io/src/export/svg-optimize.ts`)**:
   - Osobny pass `optimizeSvg` usuwający atrybuty edytorskie `data-vectoria-*`, minifikujący liczby do 2 miejsc po przecinku i usuwający nieużywane identyfikatory `<defs>`. Wariant editable pozostaje nienaruszony.

8. **UI i integracja (`apps/web/src/features/dialogs/ExportDialog.tsx`)**:
   - Modal o szerokości 560–720 px z tokenami design systemu (`--color-panel-raised`, `--shadow-dialog`), focus trap, obsługą klawisza Escape, wskaźnikiem postępu ARIA i estymacją rozmiaru pliku.
   - Zachowanie skrótu `Ctrl+Shift+E` oraz przycisku w menu górnym.

---

## Konsekwencje

**Pozytywne:**
- Kompletne pokrycie wymagań `EXPORT-001…024` w architekturze IO bez naruszania renderera i domeny rdzennej.
- Gwarancja bezpieczeństwa pamięci (guard 100 MP) zapobiegająca crashom przeglądarki.
- Pełna niezależność procesu od bieżących manipulacji użytkownika na scenie (immutable snapshot).
- Zachowanie 100% wstecznej kompatybilności dla dotychczasowego kodu pobierającego SVG/PNG.

**Negatywne / Ograniczenia:**
- Eksport PDF bazuje na osadzaniu rastra wysokiej gęstości w kontenerze PDF (`pdf-lib`), a nie na bezpośredniej translacji operatorów PostScript/Béziera (pełny wektorowy PDF stanowi zadanie P2).
- Konieczność instalacji dodatkowej zależności `pdf-lib` w pakiecie `@vectoria/io`.
