# EPIC-16: Eksport — Plan Implementacji v1

> Wersja: 1.0 — 2026-09-02
> Wzorzec: `plans/PLAN_EPIC-14_precyzja_i_produktywnosc.md`, `plans/PLAN_EPIC-15_import_format_i_zapis.md`.
> Status: **wdrożone (DONE)** — 2026-09-04 — pełna realizacja EXPORT-001…024, testy i quality gates zweryfikowane. Checklist §3.1/§3.2 AGENTS.md odhaczona na końcu.

> **Niezgodność źródeł (zgłoszona, nie rozstrzygana po cichu):** plik epika listuje EXPORT-001…019, ale `BACKLOG.md:560-584` definiuje EXPORT-001…024. BACKLOG jest dokumentem referencyjnym scope (AGENTS.md §0), więc plan obejmuje **001…024**. Plik epika wymaga uzupełnienia sekcji Backlog o EXPORT-020…024 (fix dokumentacyjny, 1 commit).

---

## 1. Rezultat użytkownika i granica scope

Po wdrożeniu użytkownik będzie mógł:

1. Eksportować **artboard, zaznaczenie lub prostokątny obszar** jako SVG (editable/optimized), PNG (1x/2x/3x/ własna skala), JPG, WebP — z dialogu 560–720 px z podglądem ustawień (EXPORT-001..017).
2. Ustawiać jakość JPG/WebP oraz tło eksportu (w tym przezroczyste) z jawną polityką per format (EXPORT-009..011).
3. Eksportować PDF pojedynczego i wszystkich artboardów (EXPORT-012/013), a docelowo (P1) ze spadami i crop marks (EXPORT-014).
4. Uruchamiać Export for Screens: wiele targetów × formaty × skale z szablonem nazewnictwa i raportem częściowych błędów (EXPORT-018..021).
5. Widzieć szacowany rozmiar pliku, postęp stage'ów, anulować eksport i mieć kolejkę zadań bez blokowania edytora (EXPORT-022..024).

**Wchodzi:** EXPORT-001…024 (BACKLOG.md:560-584).
**Nie wchodzi:** eksport AI/CDR (ADR-008 pkt 8 — osobny ADR), wektorowy PDF z pełnym pipeline'm rysowania (P2 — decyzja D5), eksport warstw jako osobne pliki poza Export for Screens.

---

## 2. Status audytu vs kod (zweryfikowane `file:line`)

| Task | Status | Dowód | Brakuje |
|---|---|---|---|
| EXPORT-001 SVG editable | **DONE** | `exportArtboardToSvg` `packages/io/src/svg/export.ts:13` (963 linie: gradienty `:61-68`, patterny, maski `:40-47`, markery, symbole `:651`, text-frames, viewBox z artboardu `:117`); pobieranie `EditorApp.tsx:543-551` | Hardening: tylko target=artboard; brak opcji tła w SVG (patrz 010) |
| EXPORT-002 SVG optimized | MISSING | Brak jakiejkolwiek optymalizacji w `export.ts` (emisja surowa, atrybuty edytorskie np. `data-vectoria-stroke-align` `:877` trafiają do outputu) | Osobny, udokumentowany pass (epic Reguła :165) |
| EXPORT-003 PNG 1x | **DONE** | `rasterizeSvgToPng` `packages/io/src/svg/import.ts:303-314` — SVG → `Image` → **temp canvas** (nie editor canvas ✓ epic Niezmiennik) → `toBlob('image/png')`; `EditorApp.tsx:553-561` | Progress/cancel; 1x tylko implicite |
| EXPORT-004 PNG 2x | MISSING | `rasterizeSvgToPng` przyjmuje width/height (`:309`), ale brak ekspozycji skali w UI/parametrach eksportu | Skala + dialog |
| EXPORT-005 PNG 3x | MISSING | jw. | jw. |
| EXPORT-006 PNG custom | MISSING | jw. | Własna skala/wymiary + **limit pamięci** |
| EXPORT-007 JPG export | MISSING | `toBlob` hardcoduje `'image/png'` (`import.ts:312`); JPG wymaga tła (brak alpha) | Format param + policy tła |
| EXPORT-008 WebP export | MISSING | jw. | jw. |
| EXPORT-009 quality JPG/WebP | MISSING | Brak parametru quality w całym pipeline | Numeric input + estimate |
| EXPORT-010 tło eksportu | PARTIAL | `export.ts:104` renderuje prostokąt artboardu (tło z `artboard.background`), PNG dziedziczy z SVG | Override tła per eksport (none/color) dla raster i SVG |
| EXPORT-011 transparent background | PARTIAL | PNG z transparentnego SVG → alpha zachowana implicite; brak jawnej opcji i brak tła dla JPG | Jawny kontrakt: JPG + transparent = wymuszone tło |
| EXPORT-012 PDF pojedynczy artboard | MISSING | Zero kodu PDF export (`rg "pdf-lib\|jspdf"` = 0); `pdfjs-dist` w deps **tylko do importu** (`packages/io/package.json`); ADR-008 pkt 8 czyni PDF eksportem **P0** | Pipeline PDF + dependency |
| EXPORT-013 PDF wszystkie artboardy | MISSING | jw. | Multi-page |
| EXPORT-014 spady + crop marks (P1) | MISSING | — | Bleed/marks w PDF pipeline |
| EXPORT-015 eksport zaznaczenia | MISSING | `exportArtboardToSvg` renderuje zawsze pełny artboard (`export.ts:52-80` iteruje warstwy, brak filtra regionu) | Selection bounds target |
| EXPORT-016 eksport obszaru | MISSING | jw. | Explicit world rect target |
| EXPORT-017 eksport artboardu | PARTIAL | Aktywny artboard (`export.ts:14`), brak wyboru spośród wielu artboardów w UI | Wybór artboardu |
| EXPORT-018 Export for Screens | MISSING | Brak batch pipeline | Targets × formats × naming |
| EXPORT-019 seryjny eksport ikon | MISSING | jw. | jw. |
| EXPORT-020 naming z artboardu | MISSING | Obecna nazwa: slug nazwy dokumentu (`EditorApp.tsx:547`) | Szablon `{artboard}` |
| EXPORT-021 naming z warstwy | MISSING | — | Szablon `{layer}` |
| EXPORT-022 podgląd rozmiaru pliku | MISSING | — | Estimate w dialogu |
| EXPORT-023 kolejka eksportów | MISSING | Kontrakt `ExportJob` z epic (`EPIC-16:25`) — **zero trafień w kodzie**; precedens job pattern: `trace-worker-service.ts:116` (`cancelTraceJob`) | Job runner + status |
| EXPORT-024 progres + anulowanie | MISSING | Eksport sync/await bez progress i cancel (`EditorApp.tsx:543-561`) | Job lifecycle |

**Braki kontraktowe:** `ExportRequest`/`ExportJob` (epic L24-25) nie istnieją nigdzie; Export Dialog nie istnieje (obecnie dwa wprost podpięte handler `EditorApp.tsx:543-561` pod menu).

Wniosek: SVG editable + PNG 1x DONE na zdrowym fundamencie (temp canvas, viewBox). Reszta = parametryzacja istniejącego pipeline + targets + job model + dialog + PDF.

---

## 3. Decyzje rozstrzygnięte PRZED implementacją

| # | Decyzja | Uzasadnienie |
|---|---|---|
| D1 | **Kontrakty** `ExportRequest`/`ExportJob`/`ExportTarget`/`ExportFormatOptions` w `packages/io/src/export/export-types.ts` (kontrakt epic L24-25 rozszerzony o target rect) — walidacja Zod na granicy (io ma zod `package.json`). | Eksport należy do io (żadnej logiki w core/renderer); UI zna tylko kontrakt. |
| D2 | **Target geometry**: `resolveExportRect(doc, target)` — artboard: `artboard.{x,y,width,height}`; selection: unia `getObjectBounds` po zaznaczonych obiektach (core exports `getObjectBounds`); area: jawny world rect z dialogu (rysunek marquee = P2, wpis liczbowy wystarcza w 0.1). Wszystko **world-space**, niezależne od camera zoom (epic Niezmiennik). | Jedna funkcja, testowalna; zero duplikacji bounds logic. |
| D3 | **SVG region export**: refactor `exportArtboardToSvg` → `exportRegionToSvg(doc, rect, options?: { background?: 'none' \| string; clipToRect?: boolean })`; `exportArtboardToSvg` zostaje **wrapperem** (back-compat dla `EditorApp.tsx:546` i testów). Selection/area = region + clip do rect. | Naprawa DONE-EXPORT-001 ryzyka przez golden test: artboard rect + default options → byte-identyczny output. |
| D4 | **Raster pipeline**: jedna funkcja `rasterizeSvgToBlob(svg, width, height, opts { format: 'png'\|'jpeg'\|'webp'; quality?: number; background?: 'transparent' \| string })` — rozszerzenie `rasterizeSvgToPng` (`import.ts:303-314`); stara funkcja = wrapper. Polityka tła: PNG/WebP default **transparent**; JPG **wymusza** tło (default `#ffffff`, brak alpha w formacie) — epic Reguła :167. Background fill malowany na canvas przed drawImage. | Minimalny diff na DONE pipeline; jasna policy zamiast cichej alpha-straty dla JPG. |
| D5 | **PDF**: nowa dependency **`pdf-lib`** w `packages/io`. Etap 0.2: strona PDF z osadzonym rastrem wysokiej rozdzielczości (render przez D4 przy 2x, honest `flattened`) + metadane; multi-artboard = multi-page. **Wektorowy PDF (drawSvgPath) = P2** — osobny ADR jeśli powstanie. Spady/crop marks (EXPORT-014) w tym samym pipeline P1: powiększony page box + znaczniki cięć rysowane pdf-lib. | pdfjs-dist **nie potrafi zapisywać** PDF; pdf-lib standard, MIT, browser-ready; flattened PDF spełnia ADR-008 pkt 8 (eksport PDF istnieje); uczciwa komunikacja bez fałszywej obietnicy wektorów (wzorzec: `pdf-import-service.ts:142` „avoiding fake vector representation"). |
| D6 | **Job model**: `ExportJobRunner` w io (`export-jobs.ts`) — kolejka sekwencyjna FIFO, `ExportJob { id, status: queued\|running\|done\|error\|cancelled, progress? }`, `AbortSignal` per job, progress stage'y (`serialize → raster → encode → deliver`). Raster na main thread z **guardem pamięci**: `width*height ≤ 100_000_000 px` i `max(w,h) ≤ 16384` — przekroczenie → kontrolowany error `EXPORT_MEMORY_LIMIT` z sugestią skali. OffscreenCanvas+worker tylko po benchmarku (epic Niezmiennik „worker candidates", nie wymóg). | Canvas `toBlob` nie działa w workerze bez OffscreenCanvas; 100 MP guard chroni przed OOM na mobile (§6 AGENTS); kolejka = EXPORT-023/024 jednym mechanizmem. |
| D7 | **Snapshot niezmienniczość**: runner dostaje **immutable referencję** `DocumentModel` z chwili startu joba (`latestDocRef`); błąd/cancel/redo w edytorze w trakcie eksportu nie wpływa na wynik; eksport **nigdy nie dotyka** dirty/revision/autosave (epic Niezmienniki). | Dokument read-only w pipeline; test: edytuj w trakcie eksportu → plik z wariantu sprzed edycji. |
| D8 | **Export for Screens** (Etap 0.2): batch definicji `{ target, variants: [{format, scale}] }` + szablon nazwy `{artboard}/{layer}/{object}@{scale}x.{ext}` (tokeny: artboard, layer, object, scale, format); część plików może się nie powieść → **partial failure report** (lista nieudanych z przyczyną), sukcesy i tak pobrane. Kolejne joby przechodzą przez D6 runner. | Epic Reguła :170; EXPORT-019/020/021 jednym szablonem nazw. |
| D9 | **SVG optimized** (Etap 0.2): osobny pass `optimizeSvg(svg): string` — (a) usunięcie atrybutów edytorskich (`data-vectoria-*`), (b) zaokrąglenie liczb do 2 miejsc, (c) skrócenie id defs (`grad-0`→`g0`), (d) usunięcie nieużywanych defs. Editable zachowuje IDs i strukturę (epic Reguła :165). Oba warianty dostępne w dialogu (radio). | Jawna, udokumentowana optymalizacja zamiast jednej „magicznej" ścieżki; DIFF test editable vs optimized. |
| D10 | **Export Dialog** (560–720 px, epic UI): target selector (Artboard [wybór]/Selection [disabled gdy pusta]/Area X,Y,W,H), format tabs (SVG/PNG/JPG/WebP/PDF), scale presets 1x/2x/3x + custom numeric, quality slider (JPG/WebP), background select (Transparent/Artboard/Custom color), szacowany rozmiar (EXPORT-022: dla ustawień user — quick encode probe przy zmniejszonej skali × ekstrapolacja; ostateczny rozmiar w success toast), progress + Cancel, error z code + recovery action (nie tylko toast — epic UI :178). | Spełnia epic UI sekcję + accessibility (aria-live, focus trap, keyboard). |
| D11 | **Naming**: `exportFileName(template, context)` — slug z istniejącego wzorca (`EditorApp.tsx:547`), tokeny z D8; default template `{artboard}.{ext}`. | EXPORT-020/021. |

### Wymagane ADR (przed implementacją Etapu 0.1)

- **`docs/adr/ADR_016_EXPORT_PIPELINE_TARGETS_JOBS_AND_PDF.md`** — formalny rekord decyzji architektonicznych: kontrakty export, target geometry (world-space), job model + memory guard, polityka tła per format, PDF przez pdf-lib (flattened 0.2 / vector P2), SVG optimized pass.

---

## 4. Pliki per warstwa

### `packages/io` (NEW + MODIFY)

| Plik | Zmiana | Cel |
|---|---|---|
| `src/export/export-types.ts` | **NEW**: `ExportRequest`, `ExportTarget`, `ExportFormatOptions` (+ Zod schemas), `ExportJob`, `ExportJobStatus`, `EXPORT_MEMORY_LIMITS` | Kontrakty epic; walidacja opcji na granicy |
| `src/export/export-targets.ts` | **NEW**: `resolveExportRect(doc, target): Rect` (D2) | EXPORT-015/016/017 |
| `src/export/raster-export.ts` | **NEW**: `rasterizeSvgToBlob` (D4) + memory guard (D6); `src/svg/import.ts:303` `rasterizeSvgToPng` → cienki wrapper (back-compat `EditorApp.tsx:558`) | EXPORT-003..011 |
| `src/export/export-jobs.ts` | **NEW**: `ExportJobRunner` — kolejka sekwencyjna, progress, cancel, snapshot doc (D6/D7) | EXPORT-023/024 |
| `src/export/svg-export-region.ts` | **NEW** (lub MODIFY w `svg/export.ts`): `exportRegionToSvg(doc, rect, options)` — refactor rdzenia `export.ts:13-80` (iteracja warstw ograniczona do rect, clip, background override) | EXPORT-015/016/010 |
| `src/svg/export.ts` | MODIFY: `exportArtboardToSvg` = wrapper na `exportRegionToSvg` (D3, back-compat) | Bezpieczny refactor DONE |
| `src/export/svg-optimize.ts` | **NEW** (Etap 0.2): `optimizeSvg` (D9) | EXPORT-002 |
| `src/export/pdf-export.ts` | **NEW** (Etap 0.2): `exportArtboardsToPdf(doc, artboardIds, options)` — pdf-lib, embed raster 2x, bleed/crop marks opcje (D5) | EXPORT-012..014 |
| `package.json` | MODIFY (Etap 0.2): + `pdf-lib` | D5 |
| `src/index.ts` | MODIFY: exports | API |

### `packages/editor-engine` — **BEZ ZMIAN**. `packages/core` — **BEZ ZMIAN** (getObjectBounds już eksportowane).

### `apps/web` (NEW + MODIFY)

| Plik | Zmiana | Cel |
|---|---|---|
| `src/features/export/useExportController.ts` | **NEW**: spinanie dialogu z `ExportJobRunner` (jobs state, progress, cancel, downloads przez `downloadBlob`), snapshot ref (D7) | EXPORT-023/024 |
| `src/features/export/ExportDialog.tsx` | **NEW**: pełny dialog (D10); 560–720 px; focus trap; aria-live progress; error panel z code+recovery; success toast `Export ready` | Epic UI |
| `src/features/export/export-for-screens.ts` | **NEW** (Etap 0.2): definicja batchu, szablon nazwy, partial failure report UI (wewnątrz dialogu) | EXPORT-018..021 |
| `src/app/EditorApp.tsx` | MODIFY: (a) usunięcie bezpośrednich handlerów `:543-561` → dialog (handle **zachowane jako szybka akcja** „Eksportuj SVG/PNG" z ostatnimi ustawieniami — bez regresji UX); (b) `downloadSvg` helper (istnieje) wywoływany przez controller | Integracja |
| `src/features/topbar/AppMenuBar.tsx` | MODIFY: „Eksportuj…" otwiera dialog (tooltip + shortcut); pozycje szybkiego eksportu zachowane | Menu workflow |

**Nie dotykamy**: autosave, `.vct` (EPIC-15), renderera, camera.

---

## 5. Commands i Undo/Redo

Eksport **nie tworzy komend** — jest read-only na DocumentModel (epic Niezmiennik „błąd eksportu nie zmienia dokumentu ani dirty state"). Weryfikacja w testach: `history.canUndo/canRedo` i `revision` niezmienione po export done/error/cancel.

---

## 6. Invariants — jawna lista

1. **Temp canvas, nie editor canvas**: raster zawsze z nowego `document.createElement('canvas')` o wymiarach target×scale (`import.ts:309` wzorzec zachowany) — zakaz §9 AGENTS (eksport PNG z viewport canvas).
2. **Immutable snapshot**: job eksportuje referencję doc z chwili enqueue; edycja w trakcie nie wpływa na output (D7).
3. **Memory guard**: `w*h ≤ 100 MP`, `max(w,h) ≤ 16384 px`; przekroczenie → error `EXPORT_MEMORY_LIMIT` z sugestią niższej skali, brak alokacji canvasa (§6 AGENTS memory limits).
4. **Polityka tła per format**: PNG/WebP default transparent; JPG wymusza tło (default `#ffffff`); SVG default = bez prostokąta tła (artboard background tylko gdy `options.background !== 'none'` i user wybierze) — jasny kontrakt, zero cichej alpha-straty.
5. **World-space target**: rect w world coords; wynik niezależny od camera.zoom/pan (test: zmiana zoomu między enqueue a done nie zmienia pliku).
6. **Quality ∈ [0,1]** po walidacji Zod; poza zakres → kontrolowany błąd, nie ciche clampowanie.
7. **Job lifecycle**: `queued→running→done|error|cancelled`; cancel między stage'ami → brak pliku, brak download; error → dialog error UI z `code` + recovery (np. „zmniejsz skalę"), nie tylko toast.
8. **Eksport read-only**: zero mutacji doc/revision/dirty/autosave w każdym stanie (done/error/cancel) — test asercyjny.
9. **Optimized SVG nie psuje editable**: osobny pass, osobny plik; editable output byte-identyczny z obecnym (golden test).
10. **PDF uczciwy**: metadane dokumentu PDF + UI zaznaczają flattened raster (0.2); brak deklaracji wektorowości.

---

## 7. Error / cancel / recovery

| Sytuacja | Zachowanie |
|---|---|
| Cancel (przycisk/Escape) w trakcie joba | `AbortSignal` → status `cancelled`, brak pliku, kolejka przechodzi do następnego |
| Błąd serializacji (np. artboard usunięty w międzyczasie) | `error` + code `EXPORT_TARGET_MISSING` + recovery: odśwież target w dialogu |
| Memory limit | `EXPORT_MEMORY_LIMIT` + recovery: zmniejsz skalę / wybierz obszar |
| Puste zaznaczenie przy target=selection | Opcja disabled w dialogu z powodem (epic: disabled reason) |
| Area o zerowym/negatywnym wymiarze | Walidacja Zod odrzuca, inline error |
| WebP nieobsługiwany przez przeglądarkę | Feature detect `canvas.toBlob('image/webp')` → format disabled z reason |
| Download zablokowany (popup guard) | Success toast z instrukcją; plik w kolejce `done` do ponownego pobrania |
| Batch: część plików fail | Partial failure report (lista + przyczyny), sukcesy dostarczone (D8) |

---

## 8. Zależności międzyepiczne / międzywarstwowe

- **EPIC-15**: `.vct` save (ADR-010/012 kontrakty) — osobna ścieżka, zero konfliktu; `downloadBlob` (`import.ts:316-321`) wspólny helper.
- **ADR-008 pkt 8**: P0 export = `.vct`, SVG, PDF, PNG — plan dostarcza PDF (0.2, flattened) i potwierdza SVG/PNG; `.vct` w EPIC-15.
- **core `getObjectBounds`**: już eksportowane (użyte w `selection-service.ts:5`, `PropertiesPanel.tsx:3`) — selection target bez zmian core.
- **Renderer**: zero zależności — raster idzie przez SVG string (istniejący export pipeline), nie przez canvas renderer (celowo: renderer jest zoptymalizowany pod viewport/culling, nie pod high-res).

---

## 9. Ryzyko regresji istniejących DONE + testy regresji

| Ryzyko | Ochrona |
|---|---|
| Refactor `exportArtboardToSvg` → `exportRegionToSvg` | **Golden test**: pełny artboard + default options → output byte-identyczny z obecnym; cała istniejąca matryca testów export SVG przechodzi |
| `rasterizeSvgToPng` → wrapper | Obecne wywołanie `EditorApp.tsx:558` i testy: identyczny Blob (PNG 1x) |
| Przeniesienie handlerów `EditorApp.tsx:543-561` | E2E szybkiego eksportu z menu (SVG+PNG) przechodzi; nazwa pliku slug zachowana |
| Menadżer jobów opóźnia download | Sekwencyjna kolejka: pojedynczy eksport wykonuje się natychmiast (bez czekania na inne joby — FIFO pusta kolejka) |

---

## 10. Etapowanie

**Etap 0.1 (P0):** EXPORT-001 (hardening), 003, 004, 005, 006, 007, 008, 009, 010, 011, 015, 016, 017, 023, 024 + kontrakty + Export Dialog + ADR-013.

Kolejność: ADR-013 → export-types/targets → exportRegionToSvg refactor (golden test) → raster-export (formaty/quality/background/guard) → ExportJobRunner → useExportController + ExportDialog → menu wiring → testy.

**Etap 0.2 (P1):** EXPORT-002 (SVG optimized), 012, 013 (PDF + pdf-lib), 014 (bleed/crop marks), 018, 019, 020, 021 (for screens + naming), 022 (size estimate).

Kolejność: svg-optimize → pdf-export (+pdf-lib) → batch/naming → estimate → testy.

**P2:** wektorowy PDF (drawSvgPath pipeline — osobny ADR), area marquee drawing na canvasie (0.1 ma wpis liczbowy X/Y/W/H).

---

## 11. Pełna macierz testów

### Unit (Vitest, `pnpm test`)

1. **export-targets** (`packages/io/test/export-targets.test.ts`): artboard → rect artboardu; selection → unia bounds (multi-obiekt, grupy przez `getObjectBounds`); area → jawny rect; pusta selekcja → error; niezależność od camera (brak parametru camera w sygnaturze — asercja typowa).
2. **exportRegionToSvg**: golden test full-artboard = byte-identyczny z `exportArtboardToSvg` (regresja DONE); region obcinający obiekty → clip; background `'none'` → brak rect tła; background color → rect z kolorem; selection rect poza obiektami → pusty SVG (valid).
3. **rasterizeSvgToBlob**: format→MIME (`image/png|jpeg|webp`); dimensions scale 1x/2x/3x/custom; quality przekazane do `toBlob` (spy); background transparent vs color (pixel probe przez canvas getImageData w jsdom-mock lub fixture); JPG+transparent → wymuszone `#ffffff` (policy test); memory guard: 200 MP → throw `EXPORT_MEMORY_LIMIT` **przed** alokacją.
4. **ExportJobRunner**: kolejka FIFO; status transitions (queued→running→done); cancel w `queued` i `running` (AbortSignal); error → status + brak download; progress callback stage'y; edycja dokumentu w trakcie joba → output ze snapshotu (D7); eksport nie zmienia revision/dirty (asercja).
5. **exportFileName**: tokeny `{artboard}/{layer}/{scale}x/{format}`, slug, kolizje.
6. **optimizeSvg** (0.2): usunięte `data-vectoria-*`; zaokrąglone liczby; usunięte nieużywane defs; editable wariant nietknięty; round-trip import optimized SVG przez `importSvgToDocument` nie crashuje (sanity).
7. **exportArtboardsToPdf** (0.2): 1 artboard → 1 strona; 2 artboardy → 2 strony; bleed → powiększony mediabox + marki; page size poprawny (pdf-lib API w jsdom — biblioteka czysto JS, działa w Node).
8. **Zod contracts**: quality poza [0,1], scale ≤ 0, format spoza enum → odrzucenie.

### E2E (Playwright, `pnpm test:e2e`)

1. Dialog: artboard → PNG 2x → Export → success toast `Export ready` → download event z poprawną nazwą; dimensions zweryfikowane (decode w teście).
2. Selection export: 2 obiekty → target Selection → PNG → plik = bounds zaznaczenia (±1 px).
3. Cancel w trakcie progress → brak download, kolejka pusta.
4. Error path: custom scale 50x na dużym artboardzie → `EXPORT_MEMORY_LIMIT` panel z recovery (nie sam toast).
5. Keyboard: Tab order, Enter = Export, Escape = Cancel, aria-live ogłasza stage'y.
6. Edycja w trakcie eksportu (drag obiektu podczas PNG export) → plik ze snapshotu, dokument spójny.
7. Szybki eksport SVG/PNG z menu (regresja istniejąca).

### Visual regression

- Export Dialog Dark/Light: empty, options, progress, error, success; DPR 1/2; mały viewport (560 px min).

### Performance

- Benchmark: PNG 4000×4000 (16 MP) — p95 ≤ 1.5 s, zero main-thread freeze > 100 ms (stage yields); SVG export 5000 obiektów ≤ 250 ms. Porównanie w `benchmarks/`; przekroczenie → OffscreenCanvas worker path (D6 warunek jawny).

### Manual

- `pnpm dev`: WebP w Safari (fallback disabled reason), PDF otwarcie w Acrobat/Preview (wymiary, tło), batch 12 ikon 3 formaty, bardzo duży artboard (1350×4500 px @2x → guard).

---

## 12. Quality gates (root `package.json` — zweryfikowane)

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

---

## 13. Comment rules

JSDoc (CO/DLACZEGO) na publicznych: `resolveExportRect`, `rasterizeSvgToBlob`, `ExportJobRunner.enqueue`, `exportRegionToSvg`, `optimizeSvg`, `exportArtboardsToPdf`, `exportFileName`. Memory guard i policy tła udokumentowane w ADR-013, nie w komentarzach inline. Prywatne helpery < 3 linie — bez komentarzy.

---

## 14. Przykłady kodu

### 14.1 Kontrakty — `packages/io/src/export/export-types.ts` (NEW)

```ts
import { z } from 'zod';

export const EXPORT_FORMATS = ['svg', 'png', 'jpeg', 'webp', 'pdf'] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number];

export const ExportTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('artboard'), artboardId: z.string().min(1) }),
  z.object({ kind: z.literal('selection') }),                       // bounds liczone z doc+selection w resolveExportRect
  z.object({ kind: z.literal('area'), rect: z.object({ x: z.number().finite(), y: z.number().finite(), width: z.number().positive(), height: z.number().positive() }) }),
]);
export type ExportTarget = z.infer<typeof ExportTargetSchema>;

export const ExportFormatOptionsSchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  scale: z.number().positive().max(16).default(1),
  quality: z.number().min(0).max(1).optional(),          // jpeg/webp tylko
  background: z.union([z.literal('transparent'), z.string().regex(/^#[0-9a-fA-F]{3,8}$/)]).optional(),
  optimizeSvg: z.boolean().default(false),               // svg optimized (0.2)
  fileNameTemplate: z.string().default('{artboard}.{ext}'),
});
export type ExportFormatOptions = z.infer<typeof ExportFormatOptionsSchema>;

/** Epic contract L24, uzupełniony o target i validated options. */
export interface ExportRequest { readonly target: ExportTarget; readonly options: ExportFormatOptions; }

export type ExportJobStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled';
export interface ExportJob {
  readonly id: string;
  readonly status: ExportJobStatus;
  readonly stage?: 'serialize' | 'raster' | 'encode' | 'deliver';
  readonly progress?: number;   // 0..1, undefined = indeterminate
  readonly error?: { code: string; message: string };
  readonly result?: { readonly blob: Blob; readonly fileName: string };
}

/** Hard memory guard (epic: limit pamięci/wymiaru). 100 MP ≈ 400 MB RGBA. */
export const EXPORT_MEMORY_LIMITS = { maxPixels: 100_000_000, maxSidePx: 16_384 } as const;
```

### 14.2 Target rect — `packages/io/src/export/export-targets.ts` (NEW)

```ts
import type { DocumentModel, SelectionState } from '@vectoria/core';
import { getObjectBounds } from '@vectoria/core';
import type { Rect } from '@vectoria/shared';
import type { ExportTarget } from './export-types.js';

/** Resolve the world-space export rect. Independent of camera zoom/pan by design
 *  (epic invariant) — the camera never enters this function. */
export function resolveExportRect(doc: DocumentModel, target: ExportTarget, selection: SelectionState): Rect {
  if (target.kind === 'area') return target.rect;
  if (target.kind === 'artboard') {
    const artboard = doc.artboards[target.artboardId];
    if (!artboard) throw new Error('EXPORT_TARGET_MISSING');
    return { x: artboard.x, y: artboard.y, width: artboard.width, height: artboard.height };
  }
  const ids = selection.objectIds;
  if (ids.length === 0) throw new Error('EXPORT_EMPTY_SELECTION');
  const bounds = ids.map((id) => doc.objects[id]).filter((o) => o && o.visible).map((o) => getObjectBounds(o, doc));
  if (bounds.length === 0) throw new Error('EXPORT_EMPTY_SELECTION');
  const minX = Math.min(...bounds.map((b) => b.x));
  const minY = Math.min(...bounds.map((b) => b.y));
  return { x: minX, y: minY, width: Math.max(...bounds.map((b) => b.x + b.width)) - minX, height: Math.max(...bounds.map((b) => b.y + b.height)) - minY };
}
```

### 14.3 Raster pipeline — `packages/io/src/export/raster-export.ts` (NEW)

```ts
export interface RasterOptions { format: 'png' | 'jpeg' | 'webp'; quality?: number; background?: 'transparent' | string; }

const MIME: Record<RasterOptions['format'], string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

/** Rasterize an SVG string to an encoded blob on a temporary canvas.
 *  Never touches the editor canvas. Throws EXPORT_MEMORY_LIMIT before any
 *  allocation when the scaled size exceeds safe limits (epic invariant). */
export async function rasterizeSvgToBlob(svg: string, width: number, height: number, options: RasterOptions): Promise<Blob> {
  const pixels = width * height;
  if (!Number.isFinite(pixels) || pixels > EXPORT_MEMORY_LIMITS.maxPixels || Math.max(width, height) > EXPORT_MEMORY_LIMITS.maxSidePx) {
    throw new Error(`EXPORT_MEMORY_LIMIT: ${width}x${height} przekracza ${EXPORT_MEMORY_LIMITS.maxPixels / 1_000_000} MP — zmniejsz skalę`);
  }
  if (typeof Image === 'undefined' || typeof document === 'undefined') throw new Error('Raster export requires browser canvas');
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Unable to rasterize SVG')); image.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width));
    canvas.height = Math.max(1, Math.ceil(height));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    // JPG has no alpha: explicit background instead of silent black (epic rule).
    if (options.background && options.background !== 'transparent') {
      context.fillStyle = options.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    } else if (options.format === 'jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(`${options.format.toUpperCase()} encoding failed`)), MIME[options.format], options.quality));
  } finally { URL.revokeObjectURL(url); }
}
```

`src/svg/import.ts` — back-compat wrapper:

```ts
/** Legacy single-format entry kept for existing callers (EditorApp, tests). */
export async function rasterizeSvgToPng(svg: string, width: number, height: number): Promise<Blob> {
  return rasterizeSvgToBlob(svg, width, height, { format: 'png' });
}
```

### 14.4 Job runner — `packages/io/src/export/export-jobs.ts` (NEW, szkic)

```ts
export interface JobInput { readonly request: ExportRequest; readonly run: (signal: AbortSignal, onStage: (stage: ExportJob['stage'], progress?: number) => void) => Promise<{ blob: Blob; fileName: string }>; }

/** Sequential FIFO export queue with progress and cancellation.
 *  Documents are captured by reference at enqueue time (immutable snapshot). */
export class ExportJobRunner {
  private jobs: ExportJob[] = [];
  private running = false;
  private controllers = new Map<string, AbortController>();
  private listeners = new Set<(jobs: readonly ExportJob[]) => void>();

  constructor(private readonly defaults: { maxPixels?: number } = {}) {}

  enqueue(input: JobInput): string {
    const id = `export-${Date.now()}-${this.jobs.length}`;
    this.jobs = [...this.jobs, { id, status: 'queued' }];
    this.notify();
    void this.drain([input, id]);
    return id;
  }

  cancel(id: string): void { this.controllers.get(id)?.abort(); }

  private async drain(input: [JobInput, string], signal?: never): Promise<void> { /* sekwencyjny worker: queued→running→stage'y→done|error|cancelled, notify po każdej zmianie */ }
  private notify(): void { for (const l of this.listeners) l(this.jobs); }
  subscribe(listener: (jobs: readonly ExportJob[]) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  get snapshot(): readonly ExportJob[] { return this.jobs; }
}
```

(Pełne ciało `drain`: 1 controller per job, `onStage` mapuje na `stage`+`progress`, `AbortError` → `cancelled`, inne → `error{code,message}`; całość ≤ 80 linii.)

### 14.5 Region export refactor — `packages/io/src/svg/export.ts` (MODIFY, szkic)

```ts
export interface RegionExportOptions { readonly background?: 'none' | string; readonly clipToRect?: boolean; }

/** Core export: render visible objects intersecting `rect` into an SVG string.
 *  exportArtboardToSvg delegates here with the artboard rect — the golden test
 *  pins byte-identical output for the legacy call. */
export function exportRegionToSvg(doc: DocumentModel, rect: Rect, options: RegionExportOptions = {}): string {
  // …istniejąca logika export.ts:22-80 z trzema zmianami:
  // (1) viewBox/width/height z `rect` zamiast artboardu,
  // (2) iteracja obiektów: skip gdy bounds ∩ rect = ∅ (tanie culling, spójny wynik),
  // (3) background rect tylko gdy options.background !== 'none' i podany.
}

/** Back-compat: exact legacy behaviour (artboard, its background). */
export function exportArtboardToSvg(doc: DocumentModel, artboardId?: string): string {
  const targetArtboardId = artboardId ?? doc.activeArtboardId;
  const artboard = doc.artboards[targetArtboardId];
  if (!artboard) throw new Error(`Artboard with ID "${targetArtboardId}" not found`);
  return exportRegionToSvg(doc, { x: artboard.x, y: artboard.y, width: artboard.width, height: artboard.height }, { background: artboard.background?.type === 'color' ? artboard.background.color : 'none' });
}
```

**Uwaga implementacyjna**: obecne `export.ts:104` renderuje rect (tło/clip) bezwarunkowo — wrapper musi odtworzyć obecne zachowanie co do bajta (golden test decyduje, nie intencja).

### 14.6 Dialog wiring — `apps/web/src/features/export/useExportController.ts` (szkic)

```ts
const runner = useMemo(() => new ExportJobRunner(), []);
const [jobs, setJobs] = useState<readonly ExportJob[]>([]);
useEffect(() => runner.subscribe(setJobs), [runner]);

const startExport = useCallback((target: ExportTarget, options: ExportFormatOptions) => {
  if (!latestDocRef.current) return;
  runner.enqueue({
    request: { target, options },
    run: async (signal, onStage) => {
      const doc = latestDocRef.current!;                    // immutable snapshot (D7)
      const rect = resolveExportRect(doc, target, selectionRef.current);
      const fileName = exportFileName(options.fileNameTemplate, { artboard: doc.artboards[doc.activeArtboardId]?.name, scale: options.scale, ext: options.format });
      onStage('serialize');
      if (options.format === 'svg') {
        const svg = exportRegionToSvg(doc, rect, { background: options.background });
        return { blob: new Blob([options.optimizeSvg ? optimizeSvg(svg) : svg], { type: 'image/svg+xml' }), fileName };
      }
      if (options.format === 'pdf') return exportArtboardsToPdfBlob(doc, rect, options, onStage);   // 0.2
      onStage('raster');
      const svg = exportRegionToSvg(doc, rect, { background: options.background });
      const blob = await rasterizeSvgToBlob(svg, rect.width * options.scale, rect.height * options.scale, { format: options.format as 'png' | 'jpeg' | 'webp', quality: options.quality, background: options.background });
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      onStage('deliver');
      return { blob, fileName };
    },
  });
}, [runner]);

const cancelExport = useCallback((id: string) => runner.cancel(id), [runner]);
const deliver = useCallback((job: ExportJob) => { if (job.status === 'done' && job.result) downloadBlob(job.result.blob, job.result.fileName); }, []);
```

### 14.7 Naming — `apps/web/src/features/export/` (szkic)

```ts
/** Token template: '{artboard}.{ext}', '{layer}@{scale}x.{ext}', '{artboard}/{object}-{scale}x.{format}'. */
export function exportFileName(template: string, ctx: { artboard?: string; layer?: string; object?: string; scale?: number; format?: string; ext: string }): string {
  const slug = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_/.]/g, '') || 'export';
  return slug(template
    .replaceAll('{artboard}', ctx.artboard ?? 'artboard')
    .replaceAll('{layer}', ctx.layer ?? 'layer')
    .replaceAll('{object}', ctx.object ?? 'selection')
    .replaceAll('{scale}', String(ctx.scale ?? 1))
    .replaceAll('{format}', ctx.format ?? ctx.ext)
    .replaceAll('{ext}', ctx.ext));
}
```

---

## 15. Checklist akceptacji planu (§3.2)

- [x] Scope + ID tasków backlogu: EXPORT-001…024 wchodzi; eksport AI/CDR i wektorowy PDF poza scope; niezgodność epic (019) vs BACKLOG (024) zgłoszona na górze dokumentu (§1).
- [x] Status DONE/PARTIAL/MISSING per task z `file:line` (§2, 24 wierszy).
- [x] Pliki per warstwa MODIFY/NEW + konkretna zmiana + cel (§4); engine i core bez zmian.
- [x] ADR: **ADR-013** (export pipeline, targets, jobs, memory guard, PDF strategy, optimized pass) przed Etapem 0.1 (§3).
- [x] Komendy: eksport read-only — zero komend, zero mutacji; asercja w testach (§5).
- [x] Invariants wylistowane jawnie, 10 pozycji (§6).
- [x] Error/cancel/recovery per sytuacja (§7).
- [x] Zależności międzyepiczne zweryfikowane `file:line` (ADR-008 pkt 8, core getObjectBounds, downloadBlob, EPIC-15) (§8).
- [x] Ryzyko regresji + golden testy byte-identyczności dla DONE eksportów (§9).
- [x] Decyzje rozstrzygnięte: D1-D11, zero otwartych niejasności (§3).
- [x] Pełna macierz testów: unit (8 grup), E2E (7 scenariuszy), visual, perf z budżetem, manual (§11).
- [x] Quality gates — dokładne skrypty (§12).
- [x] Comment rules (§13).

**Plan gotowy do implementacji po zaakceptowaniu.** Start: Etap 0.1 (§10), pierwszy krok: ADR-013 → export-types/targets → golden test na `exportArtboardToSvg` → refactor region.
