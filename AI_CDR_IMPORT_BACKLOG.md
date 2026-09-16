# AI_CDR_IMPORT_BACKLOG.md

> Status: **Proposed implementation backlog**  
> Data: 2026-09-16  
> Strategia: `FORMAT_STRATEGY_AI_CDR.md`

## Cel

Ten backlog rozbija high-fidelity import PDF/AI/CDR na małe, weryfikowalne etapy. Kolejność jest celowa: najpierw kontrakty i pomiar jakości, potem parsery, a dopiero na końcu native/cloud bridges i eksport round-trip.

Nie wolno deklarować pełnej kompatybilności na podstawie pojedynczych fixture'ów lub testów typu „parser zwrócił co najmniej jeden obiekt”.

---

## PHASE 0 — zatrzymanie fałszywych gwarancji

### HF-001 — Audyt ekspozycji pseudo-native AI/CDR export

**Priorytet:** P0  
**Ryzyko:** wysokie produktowo, niskie technicznie

Zakres:

- znaleźć wszystkie miejsca UI/API, które oferują `exportAiFile()` i `exportCdrFile()` jako natywne formaty;
- zmienić etykiety/availability tak, aby użytkownik nie otrzymywał obietnicy natywnego AI/CDR;
- jeśli funkcja musi pozostać dla testów/legacy, oznaczyć ją jako experimental/internal;
- nie usuwać istniejących testów bez zastąpienia ich testem zgodności z nowym kontraktem.

**DoD:** użytkownik nie może wygenerować z produkcyjnego UI pliku deklarowanego jako natywny AI/CDR, jeżeli nie jest on otwierany i weryfikowany przez program docelowy.

### HF-002 — Uczciwe raportowanie AI/PDF import

Zakres:

- przestać automatycznie klasyfikować każdy odzyskany obiekt z PDF-compatible AI jako `editable`;
- klasyfikacja musi pochodzić z parsera/mappingu;
- brak obsługi operatora PDF musi wejść do `ImportReport`;
- import nie może przejść jako „exact” bez reference comparison.

**DoD:** raport nie zawyża kompatybilności.

---

## PHASE 1 — corpus i quality harness przed wymianą parsera

### HF-010 — Struktura corpus fixtures

Dodać katalog zgodny z `TESTING_STRATEGY.md`, np.:

```text
fixtures/import-fidelity/
  pdf/
  ai/
  cdr/
  references/
  manifests/
```

Każdy fixture posiada manifest:

```json
{
  "id": "pdf-clipping-basic",
  "format": "pdf",
  "sourceApplication": "Adobe Illustrator",
  "sourceVersion": "...",
  "features": ["clip-path", "gradient"],
  "expected": {
    "minEditable": 2,
    "preservedAllowed": true,
    "unsupportedAllowed": false
  },
  "reference": "references/pdf-clipping-basic.png"
}
```

Nie commitować do publicznego repo plików, których licencja nie pozwala na redystrybucję.

### HF-011 — Reference renderer harness

Stworzyć wspólny kontrakt testowy:

```ts
interface FidelityReferenceRenderer {
  render(input: Uint8Array, options: ReferenceRenderOptions): Promise<ReferenceRender>;
}
```

Harness nie może zależeć od Reacta ani głównego canvasu edytora.

### HF-012 — Visual diff metric

Wprowadzić minimum:

- pixel diff;
- tolerancję antyaliasingu;
- perceptual/SSIM-like metric lub równoważną stabilną metrykę;
- bounding-box diff dla elementów transparentnych;
- zapis diff image jako CI artifact przy failu.

Progi mają być per-fixture lub per-feature, nie jedną magiczną stałą dla wszystkich plików.

### HF-013 — Import fidelity report schema

Rozszerzyć raport o:

- `preserved`;
- source feature/type;
- loss reason;
- affected page/artboard/layer/object;
- visual verification status;
- missing dependency (`font`, `asset`, `profile`).

**Uwaga:** migracja publicznego typu `ImportReport` wymaga aktualizacji testów i konsumentów.

---

## PHASE 2 — ImportIR v2

### HF-020 — ADR dla ImportIR v2

Przed kodem zatwierdzić discriminated union ImportIR node types.

Minimalne rodziny:

- document/page/artboard;
- layer/group;
- path/compound path;
- text/glyph run;
- image;
- clip;
- mask;
- gradient/shading;
- pattern/tile;
- transparency group;
- foreign/preserved appearance.

### HF-021 — Color model w ImportIR

Dodać neutralny typ:

```ts
type ImportColor =
  | GrayColor
  | RgbColor
  | CmykColor
  | LabColor
  | IccColor
  | SeparationColor;
```

Nie zmieniać od razu `ObjectStyle` — IR ma najpierw zachować źródło bez strat.

### HF-022 — Font/text source model

Model ma przechowywać:

- font identity;
- embedded/subset flag;
- glyph IDs;
- Unicode mapping;
- per-glyph positioning;
- text matrix;
- writing mode;
- source font dependency.

### HF-023 — ImportIR validator

Zod/validator na granicy `io -> core mapping` z limitami:

- node count;
- max path nodes;
- image dimensions/bytes;
- recursion depth;
- numeric finite checks;
- page count;
- max strings/metadata size.

### HF-024 — Mapper ImportIR v2 -> DocumentModel

Mapper ma być deterministyczny i oddzielony od parsera formatów.

Każda stratna decyzja musi dopisać `ImportReportEntry`.

### HF-025 — Preserved appearance ADR + domain implementation

Osobny ADR przed rozszerzeniem `SceneObject`.

Wymagania:

- zachowanie wyglądu;
- bounds/transform;
- source metadata;
- bezpieczny storage;
- brak wykonywania obcego kodu;
- możliwość przyszłego remapowania do natywnego obiektu;
- renderer nie mutuje źródła.

---

## PHASE 3 — PDF engine spike i migracja

### HF-030 — MuPDF.js spike

Na minimum 20 trudnych fixture'ach sprawdzić:

- `Page.run(Device)` callbacks;
- paths;
- text/glyph walk;
- images;
- clipping;
- shadings;
- soft masks;
- transparency groups;
- layers;
- blend modes;
- color spaces;
- memory;
- bundle size;
- worker execution;
- abort/timeout strategy.

Dodatkowo: formalna decyzja AGPL/commercial.

### HF-031 — PDFium WASM spike

Na tym samym corpusie zmierzyć:

- page objects coverage;
- render parity;
- text/font metadata;
- color spaces;
- build complexity;
- WASM size;
- worker startup;
- memory.

### HF-032 — ADR: główny PDF engine

Decyzja musi zawierać tabelę wyników z HF-030/HF-031. Nie wybierać engine'u wyłącznie na podstawie popularności albo ergonomii API.

### HF-033 — Nowy PDF adapter -> ImportIR v2

Usunąć `pdf-vector-importer.ts` z roli source of truth.

Docelowo:

```text
PDF bytes
 -> selected engine in worker
 -> ImportIR v2
 -> validate
 -> map
 -> report
```

### HF-034 — Multi-page/artboard mapping

- strony PDF -> artboards/pages Vectorii zgodnie z zatwierdzonym UX;
- poprawne boxy;
- rotation;
- page ordering;
- import selected pages.

### HF-035 — PDF font fidelity

Scenariusze:

- embedded full font;
- subset font;
- font missing;
- ToUnicode missing;
- text rendered as outlines;
- rotated text;
- text clipping.

### HF-036 — PDF color fidelity

Scenariusze:

- DeviceRGB;
- DeviceCMYK;
- Gray;
- ICCBased;
- Lab;
- Separation/spot;
- transparency blend.

### HF-037 — PDF visual regression gate

Importer nie może zostać uznany za stabilny, dopóki corpus nie przechodzi ustalonych progów.

---

## PHASE 4 — AI

### HF-040 — AI container inspector

Rozpoznawać:

- PDF-compatible AI;
- legacy PostScript/EPS-compatible AI;
- unknown/unsupported;
- uszkodzony dokument.

Nie opierać się wyłącznie na pierwszych 1024 bajtach, jeśli spec/corpus pokaże inne legalne przypadki.

### HF-041 — AI PDF-compatible -> PDF ImportIR

AI PDF-compatible używa tego samego zatwierdzonego engine'u PDF, nie osobnego parsera.

Report musi zaznaczać, że odzyskano PDF representation, a nie pełną semantykę AI.

### HF-042 — Adobe Illustrator API feasibility spike

Zweryfikować:

- credentials/auth flow;
- Custom Scripts API beta constraints;
- input/output asset flow;
- timeouts/limits;
- koszt;
- prywatność;
- dostępność fontów;
- możliwość odczytu wymaganych Illustrator page items i appearance;
- terms/licensing.

### HF-043 — `vectoria-extractor.jsx` prototype

Pierwszy extractor eksportuje:

- artboards;
- layers;
- groups;
- paths;
- basic fills/strokes;
- text metadata;
- images;
- source IDs/type names;
- reference rendition.

### HF-044 — Adobe manifest -> ImportIR v2

Adapter manifestu jest wersjonowany. Nigdy nie przyjmować niezwalidowanego JSON od usługi zewnętrznej jako `DocumentModel`.

### HF-045 — AI feature expansion

Iteracyjnie:

- compound paths;
- clipping masks;
- opacity masks;
- gradients;
- mesh;
- patterns;
- symbols;
- blend modes;
- appearance stack;
- live effects;
- linked assets;
- color profiles/spot colors.

### HF-046 — AI cloud privacy UX

Przed uploadem:

- jawna informacja, że plik zostanie przetworzony w chmurze;
- local-only alternative, jeśli PDF-compatible data istnieje;
- cancel;
- retention policy link;
- brak silent upload.

---

## PHASE 5 — CDR

### HF-050 — libcdr native spike

Zbudować mały CLI/worker:

```text
CDR bytes -> libcdr -> tracing RVNGDrawingInterface -> JSON trace
```

Zmierz:

- wersje CDR corpus;
- paths;
- text;
- fills;
- gradients;
- layers;
- PowerClip-like constructs;
- bitmapy;
- mesh/effects;
- memory/time.

### HF-051 — libcdr WASM feasibility

Ocenić build dependencies:

- boost;
- ICU;
- lcms2;
- librevenge;
- zlib.

Kryteria:

- compressed WASM size;
- cold start;
- mobile memory;
- browser compatibility;
- worker integration.

### HF-052 — ADR: libcdr WASM vs backend sandbox

Jeśli WASM ma nieakceptowalny koszt, parser działa w ephemeral sandbox backendzie za istniejącym `FormatProvider`.

UI nie może zależeć od miejsca wykonania parsera.

### HF-053 — Custom RVNGDrawingInterface -> ImportIR v2

Nie konwertować najpierw do SVG, jeśli callback parsera udostępnia bogatsze dane.

### HF-054 — CDR corpus + reference renders

Minimum wersje:

- starsze RIFF;
- nowsze dokumenty;
- tekst;
- PowerClip;
- gradients;
- transparency;
- mesh;
- blend/extrude/contour;
- bitmapy;
- multiple pages;
- spot/CMYK.

### HF-055 — CorelDRAW native bridge feasibility

Zweryfikować:

- CorelDRAW 2026 automation API;
- Windows worker deployment;
- license/EULA dla automation/service use;
- concurrency;
- headless/interactive session requirements;
- crash recovery;
- temp-file isolation;
- document close/cleanup;
- malware/macro policy.

### HF-056 — Corel native extractor prototype

Użyć oficjalnego object model do eksportu znormalizowanego manifestu + reference PDF.

Pierwszy zakres:

- pages/layers;
- shape type;
- geometry;
- text;
- fill/outline;
- group hierarchy;
- bitmap;
- clipping/effects metadata;
- source IDs/names.

### HF-057 — CDR native fallback routing

Routing:

```text
try local libcdr
 -> score compatibility
 -> if threshold insufficient and cloud allowed:
      offer native Corel bridge
 -> compare result
 -> select best representation
```

Nie uploadować automatycznie bez polityki prywatności i zgody.

---

## PHASE 6 — Fidelity fallback i UX

### HF-060 — `preserved` import category

Dodać ją do reportów i UI.

Znaczenie:

> appearance zachowany, ale obiekt nie jest w pełni natywnie edytowalny.

### HF-061 — Import status summary

Po imporcie pokazać krótkie podsumowanie:

- exact editable;
- exact partially editable;
- preserved;
- simplified;
- unsupported;
- missing fonts/assets.

### HF-062 — Detailed compatibility inspector

Kliknięcie wpisu raportu wybiera/centruje affected object, jeśli mapping jest dostępny.

### HF-063 — Visual mismatch fallback

Jeśli native-mapped subtree przekracza próg visual diff:

- nie oznaczać go jako exact;
- preferować preserved appearance;
- zachować native candidate/source mapping do debugowania.

### HF-064 — Re-map preserved object

Po późniejszym dodaniu wsparcia importer/migrator może przeliczyć `ForeignAppearanceObject` na nowy natywny typ bez ponownego proszenia użytkownika o źródło, o ile bezpiecznie zachowaliśmy wymagane dane.

---

## PHASE 7 — profesjonalny eksport i round-trip

### HF-070 — Vector PDF writer strategy

Osobny ADR. Cel: PDF bez rasteryzowania całego artboardu.

Zakres:

- paths;
- text;
- images;
- clipping;
- gradients;
- transparency;
- page boxes;
- color profiles w zakresie modelu;
- bleed/crop marks.

### HF-071 — PDF round-trip tests

```text
Vectoria -> PDF -> selected PDF importer -> Vectoria
```

Porównanie geometrii, reportu i renderu.

### HF-072 — Native AI export feasibility

Preferowana ścieżka do zbadania: oficjalny Illustrator API/custom script.

DoD przed udostępnieniem:

- otwiera się w obsługiwanych wersjach Illustrator;
- reference render przechodzi;
- artboards/layers/text/path expectations przechodzą;
- brak fake extension/MIME strategy.

### HF-073 — Native CDR export feasibility

Preferowana ścieżka do zbadania: CorelDRAW native bridge po potwierdzeniu licencji.

DoD analogiczne do AI.

---

## Cross-cutting security tasks

### HF-080 — Import resource limits

Wspólne twarde limity i kody błędów dla PDF/AI/CDR.

### HF-081 — Parser fuzzing

Fuzz/property tests:

- corrupted object streams;
- huge lengths;
- recursive structures;
- NaN/Infinity;
- malformed strings;
- decompression bombs;
- invalid image metadata.

### HF-082 — Worker cancellation and cleanup

Każdy parser:

- wspiera `AbortSignal`;
- kończy job po timeout;
- zwalnia dokument/engine resources;
- nie pozostawia temp assets.

### HF-083 — External asset policy

Nie pobierać linkowanych zasobów automatycznie. Użytkownik/host policy decyduje o resolving links.

---

## Cross-cutting performance tasks

### HF-090 — Import benchmark suite

Pomiar:

- cold engine startup;
- parse time;
- map time;
- reference render time;
- diff time;
- peak memory;
- generated object count.

Profile:

- small logo;
- medium marketing artwork;
- large print file;
- multi-page PDF;
- pathological file.

### HF-091 — Progressive import

Dla dużych dokumentów zbadać:

- metadata first;
- page thumbnails;
- import selected page;
- lazy parse non-active pages;
- background indexing.

Nie implementować progressive mutation dokumentu bez zachowania transakcyjności.

---

## Minimalna kolejność realizacji

1. `HF-001`, `HF-002` — usunąć fałszywe gwarancje.
2. `HF-010`–`HF-013` — corpus + pomiar.
3. `HF-020`–`HF-025` — ImportIR v2 + preserved appearance design.
4. `HF-030`–`HF-037` — PDF engine i stabilny importer.
5. `HF-040`–`HF-046` — AI local + native Adobe path.
6. `HF-050`–`HF-057` — libcdr + Corel native fallback.
7. `HF-060`–`HF-064` — fidelity UX/fallback.
8. `HF-070`–`HF-073` — eksport i round-trip.
9. `HF-080`–`HF-091` są egzekwowane równolegle w odpowiednich fazach.

## Warunki zakończenia programu high-fidelity import

Program nie jest zakończony przez samo „otwieranie” rozszerzeń `.pdf`, `.ai`, `.cdr`.

Jest zakończony, gdy:

- zatwierdzony corpus ma stabilny measured visual fidelity;
- żadna utrata danych nie jest cicha;
- import nie niszczy bieżącego dokumentu;
- unsupported constructs mają preserved appearance albo jawny błąd;
- missing fonts/assets są wykrywane;
- high-fidelity paths mają potwierdzone licencje;
- regresje są blokowane przez CI;
- pliki eksportowane jako AI/CDR są rzeczywiście walidowane w aplikacji docelowej.
