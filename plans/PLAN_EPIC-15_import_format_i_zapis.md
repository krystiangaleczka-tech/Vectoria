# EPIC-15: Import, format i zapis — Plan Implementacji v1

> Wersja: 1.0 — 2026-09-02
> Wzorzec: `plans/PLAN_EPIC-14_precyzja_i_produktywnosc.md` (struktura zaakceptowana).
> Status: **gotowy do akceptacji**. Checklist §3.1/§3.2 AGENTS.md odhaczona na końcu.

---

## 1. Rezultat użytkownika i granica scope

Po wdrożeniu użytkownik będzie mógł:

1. Zapisywać i otwierać projekty jako pliki `.vct` na dysku (obok autosave IndexedDB) (IO-001..005).
2. Importować SVG z pełnym raportem zgodności (editable/simplified/flattened/unsupported) i bez utraty transformacji z atrybutów `transform` (IO-007/008).
3. Importować PNG/JPG/WebP zarówno przez drag&drop (już działa), jak i przez ujednolicony Import Dialog z postępem i anulowaniem (IO-009..011).
4. Importować PDF — etapowo: raster (już jest) → wektory (Etap 0.2) (IO-012).
5. Importować AI (PDF-compatible) i CDR przez provider contract z uczciwym raportem ograniczeń (IO-013..016).
6. Wklejać SVG ze schowka systemowego tym samym, sanitizowanym pipeline'em co pliki (IO-017).
7. Mieć gwarancję, że **każda** ścieżka importu (menu, drop, clipboard) przechodzi przez ten sam sanitizer + limity (IO-018/019).

**Wchodzi:** IO-001…019 (BACKLOG.md:538-556).
**Nie wchodzi:** eksport do natywnych AI/CDR (ADR-008 pkt 8 — osobny ADR), chmurowa konwersja CDR, zmiana schematu autosave IndexedDB.

---

## 2. Status audytu vs kod (zweryfikowane `file:line`)

| Task | Status | Dowód | Brakuje |
|---|---|---|---|
| IO-001 format `.vct` | PARTIAL | Envelope istnieje: `PersistedDocument` `{app:'vectoria', schemaVersion, document, revision, savedAt}` — `packages/io/src/schema/document-v1.ts:508-517`; walidacja Zod `:481`; migracja `parseAndMigrateDocument` `:531`; serializacja `serializeDocument` `:604` | **Zapis/otwarcie pliku `.vct` na dysku** — `serializeDocument` nieużywany w `apps/web` (brak handlerów); envelope z epic (`VctEnvelope`) to podzbiór — brak dedykowanego file IO |
| IO-002 SVG/metadane w `.vct` | PARTIAL | Model serializowany w całości przez `DocumentV1Schema` (`document-v1.ts:481`) | Round-trip testy; decyzja: oryginalny plik SVG NIE jest osadzany (source of truth = DocumentModel, epic Niezmiennik) |
| IO-003 artboardy w `.vct` | PARTIAL | `ArtboardSchema` `document-v1.ts:460` | Testy round-trip artboardów |
| IO-004 warstwy i style w `.vct` | PARTIAL | `LayerSchema` `:449`, `ObjectStyleSchema` `:147`, `StrokeStyleSchema` `:111` | Jw. |
| IO-005 assety embed/link w `.vct` | PARTIAL | `ImageSourceSchema` `:315` (embed/link), `BrandKitSchema` `:442`, palettes `:403` | Metadata re-linku plików zewnętrznych (status missing-file) |
| IO-006 zapis dokumentu jako SVG | **DONE** | `exportArtboardToSvg` `packages/io/src/svg/export.ts:13` (963 linie: gradienty, patterny, maski, markery, symbole, text-frames, viewBox z artboardu `:21`); pobieranie `EditorApp.tsx:546` | — (opcja `optimized` poza backlogiem IO-006) |
| IO-007 SVG import priorytetowy | PARTIAL | `importSvgToDocument` `packages/io/src/svg/import.ts:118` (rect/circle/ellipse/line/polyline/polygon/path/text, gradienty `:130`, patterny `:137`, markery `:146`, clipPath/mask→MaskGroup `:222-266`); menu `EditorApp.tsx:589` | **Atrybut `transform` elementów jest ignorowany** (każdy obiekt dostaje `createTransform({x,y})` — `import.ts:161-164`) → obiekty w transformowanych `<g>` lądują w złym miejscu; brak raportu |
| IO-008 edytowalność SVG | PARTIAL | Tekst→`TextObject` z font-weight parsingiem (`import.ts:180-213`), path→edytowalne nodes | Nieobsługiwane filtry/fonty **nie są raportowane** (nikną po cichu — łamie epic Regułę) |
| IO-009 PNG import | PARTIAL | `processDroppedFile` `packages/io/src/assets/file-drop-importer.ts:84-131` (image/* → data URL, wymiary, limit 600px preview) | Tylko drag&drop; brak Import Dialog; brak raportu |
| IO-010 JPG import | PARTIAL | Ten sam pipeline (`file-drop-importer.ts:84-90` — `.jpg/.jpeg` + `image/*`) | Jw. |
| IO-011 WebP import | PARTIAL | Ten sam pipeline (`.webp` `:89`) | Jw. |
| IO-012 PDF import z wektorami | PARTIAL | `pdf-import-service.ts` (pdfjs-dist `:1`, worker config `:11`, raster `importPdfPageAsImageObject` `:142-145` — uczciwie „avoiding fake vector representation") | **Wektory**: brak ekstrakcji path z operator list; PDF tylko przez drop (`file-drop-importer.ts:135-149`) |
| IO-013 EPS P2 | MISSING | Brak czegokolwiek (`rg -n eps` = 0 trafień w `packages/io`) | Provider + parser P2 |
| IO-014 AI best-effort | MISSING | ADR-008 **Accepted** (AI P0 przez PDF-compatible representation, `ADR_008_AI_CDR_FORMAT_FIRST.md:30-31`) — zero kodu | Provider contract + pipeline |
| IO-015 CDR best-effort | MISSING | ADR-008 `:33-34` (adapter za abstrakcyjnym interfejsem) — zero kodu | Provider contract; realny parser P2 |
| IO-016 jawne ograniczenia AI/CDR | MISSING | Kontrakt `ImportReport` z epic (`epics/EPIC-15:25`) — **`rg "ImportReport"` = 0 trafień w kodzie** | Kontrakt + UI raportu |
| IO-017 paste SVG ze schowka | MISSING | Schowek ma tylko wewnętrzne obiekty (`EditorApp.tsx:1288-1301`); „paste vector fill" `:1470` to eyedropper, nie SVG paste | `navigator.clipboard.read()` + pipeline |
| IO-018 bezpieczne parsowanie SVG | PARTIAL | `sanitizeSvgText` `file-drop-importer.ts:161-187` (script, foreignObject, `on*` handlers z 3 formami cudzysłowów, `javascript:` w href/src) — ale **prywatna** i używana **tylko w drop path** | **Menu import omija sanitizer** (`EditorApp.tsx:589` woła `importSvgToDocument` bezpośrednio na surowym tekście!); brak external `http(s)://` href policy; brak limitu nesting/path complexity |
| IO-019 walidacja i sanityzacja importu | PARTIAL | Limity drop: 50 MB / 5000 obiektów (`file-drop-importer.ts:10-13`) | Limity nie dotyczą menu import; `importSvgToDocument` nie woła `validateInvariants` przed zwrotem; brak walidacji liczby elementów w ścieżce menu |

**Krytyczne znalezisko bezpieczeństwa:** `EditorApp.tsx:588-590` (menu „Importuj SVG") parsuje **niesanityzowany** SVG. Fix w Etapie 0.1 — P0.

Wniosek: SVG export DONE; fundamenty (.vct envelope, sanitizer, pdfjs, drop importer, importer SVG) istnieją. Główne braki: **ImportReport** (kontrakt epic), **file IO dla .vct**, **transform parsing**, **ujednolicenie ścieżek importu**, **UI dialogu**, **providerzy AI/CDR/EPS**.

---

## 3. Decyzje rozstrzygnięte PRZED implementacją

| # | Decyzja | Uzasadnienie |
|---|---|---|
| D1 | **ImportIR + ImportReport**: typy w `packages/core/src/import/import-types.ts` (kontrakt domenowy); adaptery w `io` produkują IR; mapowanie IR→DocumentModel w `io`. | ADR-008 pkt 5 wymaga wspólnego ImportIR; io już zależy od core (reguła §3). Kontrakt z epic L25 zachowany 1:1 (`editable/simplified/flattened/unsupported` + `entries`). |
| D2 | **Sanitizer**: ekstrakcja do publicznego `packages/io/src/svg/sanitizer.ts`; regex-y z `file-drop-importer.ts:161-187` przenoszone 1:1 + rozszerzenia (external `http(s)://` href/xlink:href → strip + warning `unsupported`; limit zagnieżdżenia `<g>` = 32; limit długości `d` = 100k znaków; limit elementów = 5000). `file-drop-importer` i menu import i clipboard wołają **wyłącznie** ten sanitizer. | Jeden punkt wejścia (epic Reguła „Clipboard SVG korzysta z tego samego sanitizer/importer co file import"); naprawia lukę `EditorApp.tsx:589`. |
| D3 | **Strategia transformacji SVG** (§6 AGENTS: jedna strategia): atrybut `transform` elementu dekomponowany do `Transform2D` gdy affine (translate/scale/rotate/matrix afiniczna — `matrix(a,b,c,d,e,f)`); transformacje nieafiniczne lub zagnieżdżone `<g>` z wieloma transformami → **materializacja geometrii** (przetransformowane punkty) + wpis `flattened` w raporcie. Nie mieszamy ad hoc. | Model przechowuje per-object affine transform; pełna decompozycja łańcucha `<g>` bez materializacji byłaby osobnym kontraktem — poza scope. Uczciwy raport zamiast cichej utraty. |
| D4 | **Raport instead of cichej utraty**: elementy `filter`, `fe*`, `font-face` bez dostępnego fontu, `use` z zewnętrznym href → klasyfikowane `unsupported`/`flattened` z `entries` (objectId/layerId gdy znane). `use` wewnętrzne → inline kopii geometrii (`editable`). | Epic Reguła: „unsupported filter/mask/font jest raportowany"; ADR-008 pkt 7. |
| D5 | **Plik `.vct`**: `packages/io/src/vct/vct-file.ts` — `exportVctFile(doc): Promise<Blob>` (reuse `serializeDocument` `document-v1.ts:604` + kompresja przez istniejący `worker-client.compressDocument`), `importVctFile(file): Promise<DocumentModel>` (dekompresja → `PersistedDocumentSchema.parse` → `parseAndMigrateDocument` → `validateInvariants`). Rozszerzenie `.vct`, MIME `application/x-vectoria-vct`. | Zero nowego schematu; envelope + migracja już działają (IO-001 foundations); replikuje bootstrap path z `document-store.ts:49-59`. |
| D6 | **Otwarcie `.vct`/SVG z menu = zamiana dokumentu** (spójnie z obecnym importem SVG `EditorApp.tsx:590`: `history.clear` + nowa rewizja); **import do bieżącego dokumentu** (drop, clipboard) = `CreateObjectsCommand` (jedna komenda, jeden undo). Cancel/error nigdy nie dotykają aktywnego dokumentu (epic Niezmiennik). | Istniejące, przetestowane zachowanie; nie tworzymy trzeciej polityki. |
| D7 | **PDF wektory (Etap 0.2)**: ekstrakcja przez `pdfjs` `getOperatorList` — OPS `constructPath`/`fill`/`stroke`/`transform` → `PathObject`/style; page-level CTM; tekst → `TextObject` gdy font embedded i mapping możliwy, inaczej `flattened` (curves). Fallback raster przy błędzie + wpis raportu. | pdfjs-dist już w deps (`pdf-import-service.ts:1`) i już działa w workerze — nie blokuje UI (epic Niezmiennik). |
| D8 | **AI (Etap 0.2)**: wykrycie PDF-compatible layer w `.ai` (magic bytes `%PDF`) → reuse pipeline D7; brak PDF layer → **explicit error UI** z instrukcją zapisu z kompatybilnością PDF (ADR-008 pkt 3 — bez fałszywej obietnicy). | Dokładnie decyzja ADR-008; zero nowego parsera AI. |
| D9 | **CDR/EPS (P2)**: `FormatProvider` contract (D10) implementowany jako **honest-unsupported provider** w tym epicu: rozpoznanie formatu (magic bytes `RIFX`/`%!PS-Adobe`), raport `unsupported` z komunikatem i guidance. Realny parser CDR/EPS = osobny epik/ADR (ADR-008 dopuszcza etapowanie; epic DoD: „dostarczone **albo etapowane** zgodnie z 0.1/P2"). | IO-013/015 są jawnie P2 w backlogu; IO-016 (jasne oznaczanie ograniczeń) dostarczamy już w 0.1 przez raport. |
| D10 | **Provider contract**: `packages/io/src/providers/format-provider.ts` — `FormatProvider { id; canImport(file): boolean; import(file, {signal, onProgress}): Promise<ProviderResult>; }` + `FormatProviderRegistry`. PDF/AI provider (0.2) korzysta z pdfjs worker; CDR/EPS (P2) = honest-unsupported. UI nie zna implementacji (ADR-008 pkt 4). | Oddziela capability od UI; worker-based = non-blocking (epic Niezmiennik). |
| D11 | **Clipboard SVG (IO-017)**: `navigator.clipboard.read()` → items z typem `image/svg+xml` lub `text/plain` zaczynające się od `<svg`/`<?xml` → sanitizer (D2) → `importSvgWithReport` → pozycjonowanie w centrum viewportu → `CreateObjectsCommand`. Priorytet: wewnętrzny fragment EPIC-14 (gdy `application/x-vectoria-fragment` obecny) ma pierwszeństwo. | Epic Reguła: ten sam pipeline co file import; spójność z EPIC-14 D4. |
| D12 | **Non-blocking**: SVG parse zostaje na main thread (DOMParser niedostępny w worker), ale **ograniczony** limitem 5000 elementów + yield co 500 elementów (`await new Promise(r => setTimeout(r))`) dla responsywności UI i możliwości cancelu między partiami. PDF/AI — worker (pdfjs). Benchmark udowadnia budżet (§11). | Epic Niezmiennik „import nie blokuje inputu"; realistyczny koszt: przy limicie 5000 elementów parse < ~200 ms (benchmark w §11 potwierdzi). |
| D13 | **Import Dialog**: jeden komponent dla wszystkich ścieżek plikowych (menu .vct/SVG/PDF/AI) — drop zone, file name, stage progress (`read→validate→sanitize→parse→report`), Cancel (AbortController), Compatibility Report z filter tabs, Continue/Cancel. | Epic UI sekcja; 640–800 px; aria-live. |

### Wymagane ADR (przed implementacją Etapu 0.1)

- **`ADR_012_ImportIR_ImportReport_i_SVG_Transform_Strategy.md`** — kontrakty ImportIR/ImportReport (epic L24-25), jedyny punkt wejścia sanitizer, strategia transformacji (D3), klasyfikacja raportu, file IO .vct. AI/CDR/EPS kierowane do **istniejącego ADR-008** (Accepted) — nie duplikujemy.

---

## 4. Pliki per warstwa

### `packages/core` (NEW + MODIFY)

| Plik | Zmiana | Cel |
|---|---|---|
| `src/import/import-types.ts` | **NEW**: `ImportReportEntry { category; code; message; layerId?; objectId?; sourceRef? }`, `ImportReport` (kontrakt epic L25), `ImportIR { schemaVersion; nodes: ImportIRNode[]; report }` (neutralna reprezentacja, ADR-008 pkt 5) | IO-016; wspólny kontrakt wszystkich adapterów |
| `src/index.ts` | MODIFY: exports | API |

`ImportIR` w 0.1 jest typem + walidowaną strukturą dla adapterów plikowych; importer SVG (D2/D3) produkuje report bezpośrednio i IR traktuje jako opcjonalny staging (SVG→DocumentModel już istnieje i jest testowany — N-07: nie przepisujemy działającego parsera bez potrzeby; IR staje się obowiązkowy dla providerów PDF/AI w 0.2).

### `packages/io` (NEW + MODIFY)

| Plik | Zmiana | Cel |
|---|---|---|
| `src/svg/sanitizer.ts` | **NEW**: publiczny `sanitizeSvg(svgText, limits): { text: string; warnings: ImportReportEntry[] }` — przeniesione regexy `file-drop-importer.ts:161-187` + external href policy + limity (D2) | IO-018/019; jeden punkt wejścia |
| `src/svg/import.ts` | MODIFY: (a) `importSvgWithReport(svgText, name): { document: DocumentModel; report: ImportReport }` — nowa funkcja orkiestrująca; (b) parsowanie atrybutu `transform` (translate/scale/rotate/matrix) z dekompozycją do `Transform2D` lub materializacją (D3); (c) zbieranie unsupported (filter/font/use-external) do reportu (D4); (d) `validateInvariants` przed zwrotem; (e) **stare `importSvgToDocument` zostaje jako cienki wrapper** (back-compat dla `EditorApp.tsx:589,1179` i testów) | IO-007/008/019 |
| `src/vct/vct-file.ts` | **NEW**: `exportVctFile`, `importVctFile` (D5) | IO-001..005 |
| `src/providers/format-provider.ts` | **NEW**: `FormatProvider`, `FormatProviderRegistry`, `ProviderResult { status: 'ok'\|'unsupported'; document?; objects?; report }` | IO-013..016 |
| `src/providers/svg-file-provider.ts` | **NEW**: provider owijający sanitize+import+report (file path) | Ujednolicenie ścieżek |
| `src/providers/honest-unsupported-providers.ts` | **NEW**: `EpsProvider`, `CdrProvider` — magic-bytes detect + `unsupported` + guidance (D9) | IO-013/015/016 (P2-ready) |
| `src/assets/pdf-import-service.ts` | MODIFY (Etap 0.2): `importPdfPageVectors(buffer, opts)` — operator list → PathObject/TextObject + report; raster zostaje fallbackiem | IO-012 |
| `src/assets/file-drop-importer.ts` | MODIFY: używa publicznego sanitizer + `importSvgWithReport`; zwraca report w wyniku | IO-018/019 spójność |
| `src/index.ts` | MODIFY: exports | API |

### `packages/editor-engine` — **BEZ ZMIAN**

Import nie dotyka camera/tools/selection. (V1 planu EPIC-14 błędnie umieszczał tam serwisy — tu poprawnie: zero plików engine.)

### `apps/web` (NEW + MODIFY)

| Plik | Zmiana | Cel |
|---|---|---|
| `src/features/import/import-registry.ts` | **NEW**: konfiguracja `FormatProviderRegistry` (svg, vct, png/jpg/webp, pdf, eps, cdr, ai) + limity | Jedna definicja capability |
| `src/features/import/useImportController.ts` | **NEW**: hook — przyjmuje `File`, wybiera provider, stage progress (`read→validate→sanitize→parse→report`), AbortController cancel, zwraca `{ status, report?, document?/objects? }`; polityka D6 (replace vs append) jako parametr | IO-007/009..017; non-blocking + cancel |
| `src/features/import/ImportDialog.tsx` | **NEW**: drop zone, file name, progress stages (aria-live), Cancel, Compatibility Report (counts + filter tabs + warning rows z layer/object), Continue/Cancel; focus trap, Escape, 640–800 px, tokeny DESIGN_SYSTEM | Epic UI sekcja |
| `src/app/EditorApp.tsx` | MODIFY: (a) **menu import przez useImportController** (usuwa bypass sanitizera `:589`); (b) handlery Otwórz/Zapisz `.vct`; (c) clipboard SVG paste (D11); (d) drop path z raportem; (e) reset wewnętrznego clipboardu przy replace (spójność z EPIC-14) | Integracja wszystkich ścieżek |
| `src/features/topbar/AppMenuBar.tsx` | MODIFY: pozycje „Otwórz .vct…", „Zapisz .vct", „Importuj SVG/PDF…" z label/tooltip/shortcut | Menu workflow |
| `src/features/canvas/CanvasViewport.tsx` | MODIFY (minimalne): drop przekazuje `File[]` do kontrolera (obecna logika `EditorApp.tsx:1144` przeniesiona, zachowane pozycjonowanie) | Spójność raportów |

**Nie dotykamy**: autosave (`document-store.ts`, debounce 700 ms `EditorApp.tsx:349-359`), `.vct` IndexedDB schema, renderera, eksportu SVG (DONE).

---

## 5. Commands i Undo/Redo

| Operacja | Mechanizm | Status |
|---|---|---|
| Otwarcie `.vct`/SVG z menu (replace) | `history.clear` + nowa rewizja + autosave — polityka istniejąca (`EditorApp.tsx:590`) | EXISTING pattern |
| Drop / clipboard SVG do bieżącego dokumentu | `CreateObjectsCommand` (`document-commands.ts:29`) — pozycjonowane obiekty, jeden wpis undo | EXISTING |
| Drop obrazu rastrowego | `CreateObjectsCommand` z `ImageObject` | EXISTING pattern (`file-drop-importer.ts:104-126` → caller) |
| Cancel/błąd importu | Zero mutacji — kontroler nie wywołuje dispatch przed sukcesem (epic Niezmiennik) | NEW (wymuszone w `useImportController`) |
| Import = jeden wpis historii | `CreateObjectsCommand` raz na całą partię obiektów; zabronione per-obiekt komendy | Reguła §4 AGENTS |

Select Same selekcji nie dotyczy. Po imporcie do bieżącego dokumentu: zaznaczenie nowych obiektów (istniejący wzorzec `EditorApp.tsx:1300`).

---

## 6. Invariants — jawna lista

1. **Envelope `.vct`**: `{app:'vectoria', schemaVersion, document}` — Zod (`PersistedDocumentSchema`) + migracja **przed** użyciem; nieznana `schemaVersion` → hard error (`document-store.ts:54` wzorzec).
2. **Sanitizer przed DOMParser** — zawsze, na każdej ścieżce (menu/drop/clipboard). Regex-y z `file-drop-importer.ts:178-184` obsługują 3 formy wartości atrybutów (wymóg §1b AGENTS).
3. **Limity**: plik ≤ 50 MB, ≤ 5000 elementów SVG, nesting `<g>` ≤ 32, `d` ≤ 100k znaków; przekroczenie → kontrolowany błąd z numerem limitu, nie OOM.
4. **Import atomowy**: success = pełny dokument/partia obiektów + raport; failure/cancel = dokument nietknięty. Zero częściowej mutacji (§4 AGENTS).
5. **Wynik importu przechodzi `validateInvariants`** przed dispatch (unikamy odrzucenia przez `CommandHistory.execute` `command.ts:79-89` po fakcie).
6. **`NaN`/`Infinity`/zero-scale** z parsowania atrybutów → fallback (`number()` helper `import.ts:4-7` zachowany) + `isValidTransform` na każdym nowym obiekcie.
7. **IDs**: wszystkie zaimportowane obiekty i path nodes dostają świeże `generateId()` (drop już to robi, `file-drop-importer.ts:65`; ujednolicone w menu/clipboard).
8. **Raport obowiązkowy**: `unsupported`/`flattened` elementy są liczone i opisane; nic nie znika po cichu (epic Reguła, ADR-008 pkt 7).
9. **Clipboard input nieufny** (§6 AGENTS): read() → whitelist typów → sanitize → limity; odrzucenie = error UI, dokument nietknięty.
10. **Cancel**: `AbortController` przerywa read/parse między partiami; pdfjs `loadingTask.destroy()`; UI wraca do stanu sprzed importu.
11. **Save `.vct` nie mutuje dokumentu** i nie blokuje inputu (async, kompresja w workerze).

---

## 7. Error / cancel / recovery

| Sytuacja | Zachowanie |
|---|---|
| Niepoprawny XML (`parsererror` `import.ts:121`) | Error w dialogu, dokument nietknięty |
| Przekroczenie limitu (size/elements/nesting/d) | Kontrolowany błąd z nazwą limitu i wartością; brak mutacji |
| Sanitizer usunął konstrukcje | Warnings → raport (`unsupported`), import kontynuowany |
| `.vct` nieznana wersja / Zod fail | Error + sugeruj aktualizację aplikacji; brak mutacji |
| Otwarcie `.vct` z invariants violations | Error + detail pierwszych 3 naruszeń; brak mutacji |
| Cancel w dialogu (Escape/przycisk) | AbortController → cleanup, dialog close, focus wraca |
| PDF/AI błąd dekodowania strony | Fallback raster (strona) + wpis `flattened` w raporcie; total failure → error |
| AI bez PDF-compatible layer | Explicit UI z instrukcją (ADR-008 pkt 3), status `unsupported` |
| CDR/EPS | Status `unsupported` + guidance (honest provider) |
| Clipboard read odrzucony (permissions) | Toast error; internal clipboard nadal działa |
| Quota przy zapisie `.vct` | Error toast (plik i tak idzie na dysk — quota dotyczy tylko Blob URL, niskie ryzyko) |

---

## 8. Zależności międzyepiczne / międzywarstwowe

- **EPIC-14 (schowek)**: priorytet `application/x-vectoria-fragment` nad SVG paste (D11); przy replace dokumentu — czyszczenie `clipboardRef` (`EditorApp.tsx:210`). Zależność zweryfikowana: `EditorApp.tsx:1288-1301`.
- **ADR-008 (Accepted)**: AI przez PDF-compatible, CDR za providerem, ImportIR obowiązkowy, eksport AI/CDR poza scope. Plan implementuje pkt 5-7 ADR-008.
- **pdfjs-dist**: już w `packages/io` (`pdf-import-service.ts:1`) — zero nowych dependency w całym epicu.
- **Renderer/core**: zero zmian kontraktów `SceneObject` — import produkuje wyłącznie istniejące typy (path/rectangle/ellipse/line/polyline/text/image/maskGroups).
- **EPIC-10/11/12 assety**: drop importer istnieje — epic go rozszerza, nie duplikuje.

---

## 9. Ryzyko regresji istniejących DONE + testy regresji

| Ryzyko | Ochrona |
|---|---|
| Przeniesienie `sanitizeSvgText` do sanitizer.ts | Import w `file-drop-importer.ts` zaktualizowany; **istniejące testy drop importu przechodzą bez zmian zachowania**; regex-y kopiowane 1:1 (N-07) |
| `importSvgToDocument` wrapper | Wszystkie obecne wywołania (`EditorApp.tsx:589,1179`, `file-drop-importer.ts:46`) dają identyczny wynik dla SVG bez `transform`/unsupported elementów; golden-file testy importu |
| Nowe parsowanie `transform` | Zmienia wynik dla SVG z transformami — to jest **cel** (IO-007); testy: SVG z `<g transform="translate(...)">` wcześniej źle pozycjonowane, teraz poprawne; SVG bez transform → byte-identyczny model |
| Drop path z raportem | Zachowane pozycjonowanie i komunikaty (`file-drop-importer.ts:76-80` message format) |
| Autosave/export SVG | Zero zmian w tych plikach — smoke test E2E save/export |
| Menu import przepływ | E2E happy/failure (AGENTS §8) na nowym kontrolerze |

---

## 10. Etapowanie

**Etap 0.1 (P0):** IO-001..011, IO-016 (kontrakt + raport dla SVG), IO-017, IO-018, IO-019 + ADR-012.

Kolejność: ADR-012 → sanitizer.ts → import-report w import.ts (transform + unsupported) → vct-file.ts → useImportController + ImportDialog → menu wiring (fix luki bezpieczeństwa) → clipboard SVG paste → drop integration → testy.

**Etap 0.2 (P1):** IO-012 (PDF wektory), IO-014 (AI PDF-compatible) — provider + operator list pipeline.

**P2:** IO-013 (EPS), IO-015 (CDR realny parser) — provider contract już gotowy (honest-unsupported dostarczone w 0.1); realne parsery wymagają osobnych decyzji (ADR-008 dopuszcza).

---

## 11. Pełna macierz testów

### Unit (Vitest, `pnpm test`)

1. **Sanitizer** (`packages/io/test/svg-sanitizer.test.ts`): fixture pozytywny (czysty SVG przechodzi bez zmian znaczących); negatywne: `<script>`, `<foreignObject>`, `onclick` w 3 formach cytowania (`"`/`'`/bez), `href="javascript:..."`, `xlink:href="javascript:..."`, `src="javascript:..."`, external `http(s)://` href → strip + warning; nesting > 32 → error; `d` > 100k → error.
2. **Import SVG + transform** (`packages/io/test/svg-import.test.ts`): `translate`/`scale`/`rotate`/`matrix` afiniczna → `Transform2D` poprawny; nieafiniczna → materializacja + wpis `flattened`; zagnieżdżone `<g>` → łączony efekt; elementy `filter`/`font-face`/`use href="http..."` → `unsupported` entries z licznikami; `use href="#internal"` → inline editable; raport counts sumują się do liczby elementów; `validateInvariants` czysty; **golden test**: SVG bez transform/unsupported → model identyczny jak przed refactorem.
3. **Path parser** (regresja `parsePathData` `import.ts:43-115`): istniejące przypadki + `A` (arc) → brak crasha, wpis `flattened` (arc→ brak wsparcia — jawne).
4. **VCT file round-trip** (`packages/io/test/vct-file.test.ts`): export→import deep equal; dokument z gradientami/maskami/symbolami/tekstem; corrupt JSON → error; nieznana `schemaVersion` → error; migration v1 fixture (jeśli powstanie v2 — test migracji).
5. **Provider registry**: canImport po extension+magic bytes; unknown → error; honest-unsupported (EPS `%!PS`, CDR `RIFX`) → status unsupported + guidance message.
6. **PDF raster (regresja)**: obecne zachowanie `importPdfPageAsImageObject` nietknięte w 0.1.
7. **Clipboard pipeline**: sanitize→import→CreateObjectsCommand na sfałszowanym clipboard payload (jsdom + mock `navigator.clipboard`).

### E2E (Playwright, `pnpm test:e2e`)

1. Menu „Importuj SVG" z plikiem zawierającym `<script>` i `onclick` → import OK, zero wykonania skryptu, raport pokazuje unsupported, dokument aktywny nietknięty przy Cancel.
2. Import SVG z transform → obiekty na właściwych pozycjach (screenshot diff).
3. Otwórz `.vct` → dokument załadowany; Zapisz `.vct` → plik pobrany; reopen → round-trip.
4. Import Dialog: Escape/Cancel w trakcie stage → dokument nietknięty; Continue po raporcie → zamiana; keyboard flow (Tab/Enter), aria-live ogłasza stage.
5. Clipboard: skopiuj SVG w zewnętrznym źródle (mock) → Cmd+V → obiekty w centrum viewportu → undo usuwa całą partię.
6. Drag&drop PNG → ImageObject (regresja istniejąca).
7. E2E happy/failure bez zmiany active document (AGENTS §8 obowiązkowy).

### Visual regression

- Import Dialog Dark/Light (empty, progress, report z 4 tabs, error), DPR 1/2.
- Compatibility Report rows z badge`ami kategorii (tokeny DESIGN_SYSTEM, brak hardcodowanych kolorów).

### Performance

- Benchmark: SVG 5000 elementów (mixed shapes) przez sanitize+import — budżet p95 ≤ 250 ms main thread, zero frame > 100 ms (yield co 500 elementów); porównanie w `benchmarks/`. Przekroczenie → dopiero wtedy porcjowanie/weker (D12 jawny warunek).
- VCT export 10 MB dokument: kompresja w worker, UI responywna (istniejący `worker-client`).

### Manual

- `pnpm dev`: realne pliki AI z Illustratora (PDF-compatible i nie), CDR, EPS — weryfikacja komunikatów; schowek z Figma/Inkscape; duży SVG (≥ 50 MB) → komunikat limitu.

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

JSDoc (CO/DLACZEGO) na publicznych: `sanitizeSvg`, `importSvgWithReport`, `exportVctFile`, `importVctFile`, `FormatProvider.import`, `importPdfPageVectors` (0.2). Prywatne helpery < 3 linie — bez komentarzy. Zero komentarzy w hot loop parsowania.

---

## 14. Przykłady kodu

### 14.1 Kontrakty — `packages/core/src/import/import-types.ts` (NEW)

```ts
/** Categories per epic contract: every imported element is counted exactly once. */
export type ImportCategory = 'editable' | 'simplified' | 'flattened' | 'unsupported';

export interface ImportReportEntry {
  readonly category: ImportCategory;
  readonly code: string;            // np. 'svg.filter.unsupported', 'svg.transform.non-affine'
  readonly message: string;
  readonly layerId?: string;
  readonly objectId?: string;
  readonly sourceRef?: string;      // np. XPath/tag źródłowego elementu
}

export interface ImportReport {
  readonly editable: number;
  readonly simplified: number;
  readonly flattened: number;
  readonly unsupported: number;
  readonly entries: readonly ImportReportEntry[];
}

export const emptyImportReport = (): ImportReport => ({ editable: 0, simplified: 0, flattened: 0, unsupported: 0, entries: [] });

export function countReport(entries: readonly ImportReportEntry[]): ImportReport {
  const report = emptyImportReport();
  for (const entry of entries) report[entry.category] += 1;
  return { ...report, entries };
}
```

### 14.2 Sanitizer — `packages/io/src/svg/sanitizer.ts` (NEW)

```ts
import type { ImportReportEntry } from '@vectoria/core';

export const SVG_LIMITS = {
  maxBytes: 50 * 1024 * 1024,
  maxElements: 5_000,
  maxGroupNesting: 32,
  maxPathDataLength: 100_000,
} as const;

export interface SanitizeResult { readonly text: string; readonly warnings: readonly ImportReportEntry[]; }

/** Single entry point for ALL untrusted SVG (file, drop, clipboard).
 *  Regexes must keep the three attribute value forms: "x", 'x', x (§1b AGENTS).
 *  Runs before DOMParser so hostile markup never reaches the DOM. */
export function sanitizeSvg(svgText: string, limits: typeof SVG_LIMITS = SVG_LIMITS): SanitizeResult {
  if (new Blob([svgText]).size > limits.maxBytes) throw new Error(`SVG przekracza limit ${(limits.maxBytes / 1024 / 1024) | 0} MB`);
  if ((svgText.match(/<path[^>]*\sd=/gi) ?? []).some((m) => m.length === 0) === false) { /* no-op, see path check below */ }
  const warnings: ImportReportEntry[] = [];
  let result = svgText;
  // — bloki destrukcyjne (przeniesione 1:1 z file-drop-importer.ts:161-187) —
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<script[^>]*\/>/gi, '');
  result = result.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  result = result.replace(/<foreignObject[^>]*\/>/gi, '');
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  result = result.replace(/\s+(?:xlink:)?href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi, '');
  result = result.replace(/\s+src\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi, '');
  // — nowe: zewnętrzne referencje (epic: unsafe URLs) —
  const external = result.match(/\s(?:xlink:)?href\s*=\s*"(?:https?:)?\/\/[^"]*"/gi) ?? [];
  if (external.length > 0) {
    result = result.replace(/\s(?:xlink:)?href\s*=\s*(?:"(?:https?:)?\/\/[^"]*"|'(?:https?:)?\/\/[^']*'|(?:https?:)?\/\/[^\s>]*)/gi, '');
    warnings.push({ category: 'unsupported', code: 'svg.href.external', message: `Usunięto ${external.length} zewnętrznych referencji href` });
  }
  if (result.length > limits.maxPathDataLength * 4 && /<path[^>]*\sd="[^"]{100000,}"/i.test(result)) {
    warnings.push({ category: 'flattened', code: 'svg.path.complexity', message: 'Ścieżki o ekstremalnej złożoności zostaną uproszczone' });
  }
  return { text: result, warnings };
}
```

(Droga poprawka w implementacji: limit długości `d` sprawdzany per-element w parserze, nie heurystyką globalną — powyższy szkic pokazuje kontrakt.)

### 14.3 Import z raportem + transform — `packages/io/src/svg/import.ts` (MODIFY)

```ts
import { validateInvariants } from '@vectoria/core';
import type { ImportReport, ImportReportEntry } from '@vectoria/core';
import { sanitizeSvg } from './sanitizer.js';

const AFFINE_MATRIX = /^\s*matrix\(([-\d.e\s,]+)\)\s*$/i;

/** Decompose an affine SVG transform into Transform2D; non-affine → null (caller flattens). */
function decomposeTransform(attr: string): Transform2D | null {
  // translate(...) / scale(...) / rotate(...) / matrix(...) — kompozycja mnożona w kolejności
  // matrix(a,b,c,d,e,f): a=cosh… — afiniczna gdy det = a*d-b*c != 0 i bez shear po decompozycji
  // shear obecny → materializacja (null), zgodnie z D3.
}

/** Primary import entry: sanitize → parse → classify → validate invariants.
 *  The legacy importSvgToDocument stays as a thin wrapper for existing callers. */
export function importSvgWithReport(svgText: string, name = 'Imported SVG'): { document: DocumentModel; report: ImportReport } {
  const { text, warnings } = sanitizeSvg(svgText);
  const entries: ImportReportEntry[] = [...warnings];
  const document = parseSvgDocument(text, name, entries); // istniejąca logika + transform (D3) + unsupported (D4)
  const violations = validateInvariants(document);
  if (violations.length > 0) throw new Error(`Import produced invalid document: ${violations.map((v) => v.code).join(', ')}`);
  return { document, report: countReport(entries) };
}

/** Back-compat wrapper — existing callers keep working unchanged. */
export function importSvgToDocument(svgText: string, name = 'Imported SVG'): DocumentModel {
  return importSvgWithReport(svgText, name).document;
}
```

Skeleton parsowania transform w mappingu elementu:

```ts
const transformAttr = element.getAttribute('transform');
let transform = createTransform({ x, y });
let flattened = false;
if (transformAttr) {
  const decomposed = decomposeTransform(accumulateAncestorTransforms(element)); // <g> chain
  if (decomposed) transform = compose(decomposed, transform);
  else flattened = true; // punkty przetransformowane wprost, wpis flattened
}
```

### 14.4 VCT file IO — `packages/io/src/vct/vct-file.ts` (NEW)

```ts
import type { DocumentModel } from '@vectoria/core';
import { validateInvariants } from '@vectoria/core';
import { parseAndMigrateDocument, PersistedDocumentSchema, serializeDocument } from '../schema/document-v1.js';
import { compressDocument, decompressDocument } from '../storage/worker-client.js';

const VCT_MIME = 'application/x-vectoria-vct';

/** Serialize the live document to a portable .vct blob. Compression runs in the
 *  io worker so the main thread never blocks (epic non-blocking invariant). */
export async function exportVctFile(document: DocumentModel): Promise<Blob> {
  const violations = validateInvariants(document);
  if (violations.length > 0) throw new Error(`Refusing to export invalid document: ${violations.map((v) => v.code).join(', ')}`);
  const json = serializeDocument(document);
  try {
    const compressed = await compressDocument(JSON.parse(json));
    return new Blob([compressed], { type: VCT_MIME });
  } catch {
    return new Blob([json], { type: VCT_MIME }); // uncompressed fallback
  }
}

/** Parse a .vct file: decompress → Zod → migrate → invariants. Throws with
 *  user-facing messages; caller guarantees the active document stays untouched. */
export async function importVctFile(file: File): Promise<DocumentModel> {
  const buffer = await file.arrayBuffer();
  let raw: unknown;
  try {
    raw = await decompressDocument(buffer);
  } catch {
    raw = JSON.parse(new TextDecoder().decode(buffer)); // plain JSON .vct
  }
  const persisted = PersistedDocumentSchema.parse(raw);
  const document = parseAndMigrateDocument(persisted.document);
  if (persisted.schemaVersion !== document.schemaVersion) {
    throw new Error(`Nieobsługiwana wersja schematu: ${persisted.schemaVersion}. Zaktualizuj aplikację.`);
  }
  const violations = validateInvariants(document);
  if (violations.length > 0) throw new Error(`Plik narusza invariants: ${violations.slice(0, 3).map((v) => v.code).join(', ')}`);
  return document;
}
```

### 14.5 Provider contract — `packages/io/src/providers/format-provider.ts` (NEW)

```ts
import type { DocumentModel, SceneObject } from '@vectoria/core';
import type { ImportReport } from '@vectoria/core';

export interface ProviderImportOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (stage: 'read' | 'validate' | 'sanitize' | 'parse' | 'report', ratio: number) => void;
}

export type ProviderResult =
  | { status: 'ok'; document: DocumentModel; report: ImportReport }                       // replace (open file)
  | { status: 'ok-partial'; objects: readonly SceneObject[]; report: ImportReport }        // append (drop/clipboard)
  | { status: 'unsupported'; report: ImportReport };                                       // honest, z guidance

/** Capability boundary for external formats. UI never learns the implementation
 *  (ADR-008 pkt 4); heavy providers run their own workers (epic invariant). */
export interface FormatProvider {
  readonly id: string;
  readonly label: string;
  canImport(file: { name: string; type: string }): boolean;
  import(file: File, options?: ProviderImportOptions): Promise<ProviderResult>;
}

export class FormatProviderRegistry {
  private providers: FormatProvider[] = [];
  register(provider: FormatProvider): void { this.providers.push(provider); }
  resolve(file: { name: string; type: string }): FormatProvider | null {
    return this.providers.find((provider) => provider.canImport(file)) ?? null;
  }
}
```

### 14.6 Honest-unsupported provider (EPS/CDR, P2-ready) — szkic

```ts
export const cdrProvider: FormatProvider = {
  id: 'cdr', label: 'CorelDRAW (.cdr)',
  canImport: (file) => file.name.toLowerCase().endsWith('.cdr') || file.type === 'application/x-coreldraw',
  async import(file) {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const isCdr = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x58; // 'RIFX'
    if (!isCdr) throw new Error('Plik nie jest poprawnym dokumentem CDR');
    return {
      status: 'unsupported',
      report: countReport([{
        category: 'unsupported', code: 'cdr.parser.p2',
        message: 'Natywny import CDR jest w przygotowaniu. Zapisz plik jako AI z kompatybilnością PDF lub jako SVG i zaimportuj ponownie.',
      }]),
    };
  },
};
```

### 14.7 Kontroler importu — `apps/web/src/features/import/useImportController.ts` (szkic)

```ts
export type ImportTarget = { mode: 'replace' } | { mode: 'append'; layerId: LayerId; position: Vec2 };

export function useImportController(registry: FormatProviderRegistry) {
  const [stage, setStage] = useState<'idle' | 'read' | 'validate' | 'sanitize' | 'parse' | 'report'>('idle');
  const [report, setReport] = useState<ImportReport | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingRef = useRef<ProviderResult | null>(null);

  const start = useCallback(async (file: File, target: ImportTarget) => {
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const provider = registry.resolve(file);
      if (!provider) throw new Error(`Nieobsługiwany format: ${file.name}`);
      setStage('read');
      const result = await provider.import(file, {
        signal: controller.signal,
        onProgress: (s) => setStage(s),
      });
      pendingRef.current = result;
      setReport(result.report);
      setStage('report'); // UI pokazuje Compatibility Report; commit dopiero Continue
    } catch (error) {
      if ((error as Error).name === 'AbortError') return; // cancel → zero mutacji
      setStage('idle');
      throw error; // dialog pokazuje error UI (toast nie zastępuje critical error — epic UI)
    }
  }, [registry]);

  const commit = useCallback((helpers: { replaceDocument: (doc: DocumentModel) => void; appendObjects: (objects: readonly SceneObject[]) => void }) => {
    const result = pendingRef.current;
    if (!result) return;
    if (result.status === 'ok') helpers.replaceDocument(result.document);
    if (result.status === 'ok-partial') helpers.appendObjects(result.objects);
    pendingRef.current = null; setReport(null); setStage('idle');
  }, []);

  const cancel = useCallback(() => { abortRef.current?.abort(); pendingRef.current = null; setReport(null); setStage('idle'); }, []);

  return { stage, report, start, commit, cancel };
}
```

`ImportDialog.tsx`: `role="dialog"` + focus trap + Escape → `cancel()`; progress `aria-live="polite"`; report — 4 zakładki-filtry z counts, wiersze ostrzeżeń z layer/object; Continue disabled gdy `unsupported === total && status !== 'unsupported-honest'`.

### 14.8 Clipboard SVG paste — `EditorApp` (szkic)

```ts
const handlePasteFromSystemClipboard = async () => {
  try {
    const items = await navigator.clipboard.read();
    const svgItem = items.flatMap((item) => item.types.includes('image/svg+xml') ? [item.getType('image/svg+xml')] : []);
    const textItem = items.find((item) => item.types.includes('text/plain'));
    const blob = svgItem[0] ?? (textItem ? await textItem.getType('text/plain') : null);
    if (!blob) return; // brak SVG → wewnętrzny fragment (EPIC-14) już obsłużony wcześniej
    const svgText = await blob.text();
    if (!/^\s*(?:<\?xml|<svg)/i.test(svgText)) return;
    const { document: imported, report } = importSvgWithReport(svgText, 'Clipboard SVG');
    const objects = repositionToViewportCenter(Object.values(imported.objects));
    handleExecuteCommand(new CreateObjectsCommand(objects, doc.activeLayerId));
    if (report.unsupported > 0) reportStatus(`Import SVG: ${report.unsupported} elementów nieobsługiwanych — zobacz raport`);
  } catch (error) {
    reportStatus('Nie udało się odczytać schowka — sprawdź uprawnienia przeglądarki');
  }
};
```

Priorytet: handler wewnętrznego fragmentu EPIC-14 sprawdza `application/x-vectoria-fragment` **pierwszy**; SVG paste tylko gdy brak fragmentu (D11).

---

## 15. Checklist akceptacji planu (§3.2)

- [x] Scope + ID tasków backlogu: IO-001…019 wchodzi; eksport AI/CDR poza scope (ADR-008 pkt 8) (§1).
- [x] Status DONE/PARTIAL/MISSING per task z `file:line` (§2, 19 wierszy; znaleziona luka bezpieczeństwa `EditorApp.tsx:589`).
- [x] Pliki per warstwa MODIFY/NEW + konkretna zmiana + cel (§4).
- [x] ADR: **ADR-012** (ImportIR/ImportReport/transform/sanitizer/vct-file) przed Etapem 0.1; AI/CDR → istniejący ADR-008 Accepted (§3).
- [x] Komendy: CreateObjectsCommand (EXISTING) dla append, history.clear policy dla replace; import = jeden wpis historii (§5).
- [x] Invariants wylistowane jawnie, 11 pozycji (§6).
- [x] Error/cancel/recovery per sytuacja (§7).
- [x] Zależności międzyepiczne zweryfikowane `file:line` (EPIC-14 clipboard, ADR-008, pdfjs) (§8).
- [x] Ryzyko regresji + testy regresji (sanitizer move, wrapper import, transform parsing, drop path) (§9).
- [x] Decyzje rozstrzygnięte: D1-D13, zero otwartych niejasności (§3).
- [x] Pełna macierz testów: unit (7 grup), E2E (7 scenariuszy), visual, perf z budżetem, manual (§11).
- [x] Quality gates — dokładne skrypty (§12).
- [x] Comment rules (§13).

**Plan gotowy do implementacji po zaakceptowaniu.** Start: Etap 0.1 (§10), pierwszy krok: ADR-012 → sanitizer → fix luki `EditorApp.tsx:589` (P0 bezpieczeństwa, mały diff, natychmiastowa wartość).
