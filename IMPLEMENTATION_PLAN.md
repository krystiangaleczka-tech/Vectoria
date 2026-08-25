# Vectoria — plan pełnego wdrożenia EPIC-00–09

> Status: plan wykonawczy
>
> Vectoria jest pełnym, długoterminowo rozwijanym projektem. MVP/Skeleton jest kamieniem milowym fundamentu, nie ograniczeniem zakresu. Zadania poniżej domykają pełne specyfikacje epiców, nie tylko ich vertical slice.

## 1. Zasady realizacji

Każdy task przechodzi przez tę samą ścieżkę:

1. Najpierw kontrakt domenowy i invariants.
2. Następnie deterministyczna komenda z `execute`, `undo` i ochroną przed częściową mutacją.
3. Potem adapter renderera/IO, bez importu Reacta do `core`.
4. Następnie UI z tokenami `DESIGN_SYSTEM.md`, klawiaturą, ARIA, focus ringiem i stanami error/empty/disabled/loading.
5. Na końcu testy: unit, integration, persistence/import-export, Playwright oraz visual/performance, jeśli zmiana dotyczy renderera lub hot path.

Nie wolno zamykać taska samym modelem albo samym przyciskiem UI. Funkcja jest ukończona, gdy workflow użytkownika działa od inputu do zapisu/eksportu i można go cofnąć.

## 2. Kolejność wdrożenia

1. EPIC-00: stabilizacja kontraktów, culling, pomiary i bezpieczna infrastruktura.
2. EPIC-01: pełny dokument, artboardy, guides, grid i snap.
3. EPIC-02: recovery i wersjonowanie dokumentów.
4. EPIC-03: pełna selekcja, grupy, transformacje i produktywność.
5. EPIC-04: pełny zestaw kształtów parametrycznych.
6. EPIC-05: domknięcie dokumentacji i brakujących testów Pen/Node.
7. EPIC-06: domknięcie UX i test matrix narzędzi rysowania.
8. EPIC-07: domknięcie workflow geometrii i regresji.
9. EPIC-08: pełny renderer/UI masek i booleanów.
10. EPIC-09: pełny system fill/stroke/kolor/style.

EPIC-05–09 mają istniejące fundamenty. Nie przepisywać ich od nowa; najpierw porównać implementację z kontraktem, uzupełnić brakujące ścieżki i testy.

---

## 3. EPIC-00 — Architektura i wydajność

### Stan

Częściowo wdrożone: model dokumentu, camera, world/screen transform, viewport canvas, rAF, culling, hit-test, Performance HUD. Brakuje pełnych benchmarków, R-tree, adaptive quality, workerów i limitów wydajnościowych.

### Lista wdrożenia

- [ ] Ustabilizować publiczne typy `DocumentModel`, `SceneObject`, `ObjectStyle`, `Camera`, `Viewport`, `Command` i wersję `.vct`.
- [ ] Dodać walidator całego dokumentu na granicy IO oraz przed każdym command commit.
- [ ] Utrzymać logiczne współrzędne świata; canvas ma zawsze rozmiar viewportu × DPR.
- [ ] Dodać komplet transformacji world→screen i screen→world z testami rotacji, zoomu, DPR i ekstremalnych wartości.
- [ ] Utrzymać jeden render na `requestAnimationFrame`; eventy tylko aktualizują interaction state i invalidują loop.
- [ ] Rozdzielić render background, scene i overlay; overlay nie może wymuszać pełnego renderu sceny.
- [ ] Zmierzyć p95 frame time, input-to-render i liczbę renderów na event.
- [ ] Dodać benchmarki: 100 prostych obiektów, 10 000 obiektów, 1 000 ścieżek × 100 nodes, 500 obiektów podczas dragu i ogromny artboard.
- [ ] Dopiero po benchmarku wdrożyć R-tree dla broad-phase bounds/hit-test.
- [ ] Dodać tryby `interactive`, `settling`, `final`; w interactive ograniczyć kosztowne detale.
- [ ] Dodać bezpieczny resize ogromnego artboardu: natychmiastowa zmiana metadanych, brak gigantycznej bitmapy, asynchroniczne przeliczenia.
- [ ] Dodać limity nodes, elementów, nesting, path complexity i pamięci dla importu.
- [ ] Dodać worker boundary dla ciężkiego importu, eksportu, simplify, boolean i trace dopiero po pomiarze.

### Pliki i warstwy

- `packages/core/src/model/*`: kontrakty i invariants.
- `packages/editor-engine/src/camera.ts`, `hit-test.ts`, `interaction/*`: input i broad-phase.
- `packages/renderer/src/index.ts`: loop, culling, quality policy.
- `packages/io/src/*`: limity, parser boundary i atomic recovery.
- `benchmarks/` lub istniejący katalog testów performance: scenariusze i budżety.

### Testy i DoD

- Unit: matrix, bounds, culling, finite values, zero scale, huge dimensions.
- Integration: Document→Engine→Renderer bez React rerenderu na pointermove.
- Performance: p95 frame time i input latency zapisane jako wynik benchmarku.
- DoD: brak freeze przy ogromnym artboardzie, culling działa, canvas nie ma rozmiaru dokumentu, quality gates mają mierzalne budżety.

---

## 4. EPIC-01 — Dokument i obszar roboczy

### Stan

Częściowo wdrożone: New Document, presety, jednostki, artboardy, grid, guides, snap, linijki i panel artboardów. Brakuje pełnych wariantów artboard workflow, zmiany nazw/orientacji oraz pełnej polityki guide/snap.

### Lista wdrożenia

- [ ] Domknąć `NewDocumentDialog`: screen, social, A4/A3, business card, custom, unit i walidację.
- [ ] Dodać komendy `CreateArtboard`, `DuplicateArtboard`, `DeleteArtboard`, `RenameArtboard`, `SetArtboardOrientation` i `UpdateArtboardBackground`.
- [ ] Chronić aktywny artboard przed usunięciem ostatniego elementu dokumentu.
- [ ] Dodać panel artboardów z wyborem, rename, duplicate, delete, visibility i czytelnym rozmiarem.
- [ ] Dodać linijki zależne od kamery i jednostki; nie używać statycznych etykiet jako źródła geometrii.
- [ ] Dodać guide drag-from-ruler, move, lock, hide, delete i keyboard fallback.
- [ ] Rozdzielić grid presentation state od `DocumentModel`; persist tylko walidowane ustawienia.
- [ ] Dodać snap sources: grid, guide, node, edge, center, intersection, pixel oraz tolerance UI.
- [ ] Dodać snap indicator w overlay z ikoną/tekstem, nie tylko kolorem.
- [ ] Sprawdzić Dark/Light, mały viewport, focus order, keyboard i touch fallback.

### Pliki i komendy

- `packages/core/src/model/types.ts`, `factory.ts`, `commands/document-commands.ts`.
- `packages/editor-engine/src/grid.ts`, `snapping.ts`, `camera.ts`.
- `apps/web/src/features/dialogs/NewDocumentDialog.tsx`.
- `apps/web/src/features/panels/ArtboardsPanel.tsx`, `CanvasViewport.tsx`, `PropertiesPanel.tsx`.

### Testy i DoD

- Unit: unit conversion, artboard invariants, snap source/tolerance, guide boundaries.
- Playwright: create document→add/duplicate/rename/delete artboard→grid/guide/snap→reload.
- Visual: linijki, grid, guides, transparent background w Dark/Light.
- DoD: wszystkie zmiany są command-based, persistują się i nie zmieniają przypadkowo selection/document geometry.

---

## 5. EPIC-02 — Historia i zapisywanie

### Stan

Wdrożone: command pattern, Undo, Redo, grouped drag, history panel, jump, IndexedDB autosave i status. Brakuje crash recovery, ręcznych wersji i listy wersji.

### Lista wdrożenia

- [ ] Rozdzielić `last-known-good` snapshot od bieżącego autosave.
- [ ] Dodać atomowy zapis z revision, checksum/schemaVersion, savedAt i status `pending/saving/saved/error/recovery`.
- [ ] Przy starcie wykrywać niezamknięty albo nowszy snapshot recovery; pokazać użytkownikowi wybór restore/discard.
- [ ] Nie nadpisywać aktywnego dokumentu uszkodzonym payloadem; fallback do ostatniego poprawnego snapshotu.
- [ ] Dodać `SaveVersionCommand` lub wersjonowany repository adapter z nazwą, timestampem i revision.
- [ ] Dodać panel wersji: lista, preview metadata, restore jako jedna atomowa operacja z Undo.
- [ ] Zdefiniować limit liczby/rozmiaru wersji i politykę usuwania starych wersji.
- [ ] Dodać recovery po pagehide, crash marker i ponownym otwarciu karty.
- [ ] Opcjonalną synchronizację cloud pozostawić za osobnym auth/RLS taskiem; nie udawać bezpieczeństwa UI.

### Pliki i testy

- `packages/io/src/storage/*`, `packages/io/src/schema/*`.
- `apps/web/src/app/EditorApp.tsx`, `features/panels/HistoryPanel.tsx`.
- Testy: corrupt payload, interrupted save, revision race, restore/discard, version restore, reload.

### DoD

Autosave nie blokuje inputu, crash recovery nie traci ostatniego poprawnego dokumentu, każda wersja ma restore i Undo, a błędny zapis nie niszczy stanu pamięci.

---

## 6. EPIC-03 — Zaznaczanie i transformacje

### Stan

Częściowo wdrożone: Select, Direct Select, top-most hit-test, Shift selection, marquee, move, resize, rotate, delete, nudge i podstawowy Transform panel. Brakuje lasso, grup, cycling, skew, pełnego pivot, align/distribute, z-order i smart distance.

### Lista wdrożenia

- [ ] Dodać cycling przez nakładające się obiekty z widocznym status/keyboard hint.
- [ ] Dodać lasso obiektów i nodes jako osobne state machines z screen-space tolerance.
- [x] Dodać `GroupObjectsCommand`, `UngroupObjectsCommand`, group hierarchy i isolate mode.
- [x] Dodać transformację w panelu dla multiselectu z zachowaniem pivot pointu.
- [x] Dodać komendy SkewX, SkewY i zmianę Pivot z UI wizualnym.
- [x] Dodać komendy Distribute (poziomo/pionowo) i rozbudować Align.
- [x] Dodać precyzyjny z-order: MoveToFront, MoveForward, MoveBackward, MoveToBack, InsertBefore, InsertAfter.
- [x] Dodać Smart Distance i Snap-to-Object (edge, center, gap).
- [x] Dodać pivot/transform origin UI i persist transform state.
- [ ] Dodać skew z ograniczeniami i handle/NumberInput.
- [x] Dodać aspect lock przy resize oraz poprawne zachowanie przy negative scale.
- [x] Dodać align do artboardu, selection i key object.
- [ ] Dodać repeat transform zapisujący ostatnią deterministyczną deltę.
- [ ] Dodać smart distance overlay, niezależny od koloru i zależny od zoomu.

### Pliki i testy

- `packages/core/src/commands/document-commands.ts`, `model/types.ts`.
- `packages/editor-engine/src/tools/select-tool.ts`, `selection-service.ts`.
- `apps/web/src/features/canvas/CanvasViewport.tsx`, `LayersPanel.tsx`, `PropertiesPanel.tsx`.
- Unit: selection algebra, group invariants, transforms, z-order, align/distribute.
- E2E: overlap cycling, lasso, group/isolate, transform/pivot, align, z-order, undo/redo.

### DoD

Selection nie mutuje dokumentu przed commit, drag tworzy jedną komendę, grupy zachowują ownership, a wszystkie operacje mają keyboard/accessibility workflow.

---

## 7. EPIC-04 — Kształty podstawowe

### Stan

Wdrożone częściowo: rectangle, square, ellipse, circle, line, rounded corners. Brakuje Arc, Pie, Ring/Donut, Polyline, Arrowheads, Polygon, Star, Spiral, Triangle, Diamond, Callout, parametrów i presetów.

### Lista wdrożenia

- [ ] Ujednolicić `ShapeTool` contract: preview, commit, Escape cancel, Shift constraint, minimum geometry i style defaults.
- [ ] Dodać Arc z normalized start/end angle, wrap-around i pełnym 360°.
- [ ] Dodać Pie jako zamknięty sektor z polityką fill/stroke.
- [ ] Dodać Ring/Donut z outer/inner radius i invariant `0 <= inner < outer`.
- [ ] Dodać Polyline state machine: click vertices, double-click/Enter commit, Escape cancel.
- [ ] Dodać Arrowheads jako jawny model start/end type/size/orientation i SVG marker/geometry adapter.
- [ ] Dodać Polygon i Star z integer sides/points, outer/inner radius i rotation.
- [ ] Dodać Spiral z limitem turns/segments i bez memory bomb.
- [ ] Dodać Triangle/Diamond jako parametric polygon, nie nowe niekompatybilne typy.
- [ ] Dodać Callout/Speech Bubble z walidowanym tail anchor bez self-intersection.
- [ ] Dodać parametric handles w overlay z minimum 14 px hit target.
- [ ] Dodać Properties inputs, preset library i ikonografię.

### Pliki i testy

- `packages/core/src/model/shapes.ts`, `types.ts`, `bounds.ts`, `path.ts`.
- `packages/editor-engine/src/tools/*` oraz nowy wspólny shape tool contract.
- `packages/renderer/src/index.ts`, `packages/io/src/svg/{import,export}.ts`.
- Unit: all shape geometry, constraints, angles, bounds, hit-test, finite/limit cases.
- E2E/visual: create/edit/cancel/export każdego shape family w Dark/Light.

### DoD

Każdy kształt ma parametric model, preview, command, undo/redo, hit-test, renderer, SVG policy, Properties i test edge cases.

---

## 8. EPIC-05 — Pen Tool i ścieżki

### Stan

Najpełniej wdrożony w kodzie: Pen state machine, corners, cubic handles, open/closed paths, rubber band, node/segment operations, path join, node kinds i conversion. Dokument epica oraz rozbudowany test matrix nie są zsynchronizowane.

### Lista domknięcia

- [ ] Porównać każde `PATH-001…031` z kodem i oznaczyć status w backlogu/specyfikacji.
- [ ] Dodać osobne testy Pen: click, drag, close, Enter, Escape, pointercancel, modifiers i snap.
- [ ] Dodać testy node/segment: add, remove, move, merge, split, join, reverse, convert.
- [ ] Dodać testy handles: in/out, connect/disconnect, cusp/smooth/symmetric/auto.
- [ ] Sprawdzić stable node IDs podczas importu, duplicate, split i undo/redo.
- [ ] Dodać visual regression rubber band, tangent lines, nodes i handles przy różnych zoomach.
- [ ] Oznaczyć jawnie funkcje zrealizowane oraz ewentualne ograniczenia w `EPIC-05`.

### DoD

Każdy path workflow ma state machine, screen/world transform, invariants, single command commit, undo/redo, SVG round-trip i Playwright evidence.

---

## 9. EPIC-06 — Rysowanie swobodne i cięcie

### Stan

Kod posiada Pencil, Brush, Smooth, Simplify, Eraser, Knife, Scissors i Width. Brakuje pełnego dopracowania UX, test matrix i jawnego statusu backlogu.

### Lista domknięcia

- [ ] Ujednolicić sampling: min distance zależny od zoomu, pressure mapping, duplicate filtering i node limit.
- [ ] Dodać Pencil settings: smoothing, accuracy, preserve endpoints/corners.
- [ ] Dodać Brush settings: width, pressure curve, cap, join, width profile i mouse fallback.
- [ ] Dodać Smooth/Simplify preview with before/after node count, estimated error, Apply/Cancel.
- [ ] Sprawdzić Eraser/Knife/Scissors candidate filtering i zachowanie style/layer/visibility.
- [ ] Dodać Width Tool screen hit target, local `t` validation i single commit.
- [ ] Dodać explicit destructive feedback dla cięcia i recovery po pustym wyniku.
- [ ] Dodać Properties controls z Enter commit, Escape revert i accessible descriptions.
- [ ] Uzupełnić SVG parity dla cap/join/dash/width profile w zakresie adaptera.
- [ ] Odhaczyć rzeczywiste taski `DRAW-001…017` dopiero po testach.

### Testy i DoD

Unit dla sampling/pressure/geometry, integration dla renderer overlay, E2E dla każdego toola z cancel/undo/autosave, visual dla preview i Dark/Light.

---

## 10. EPIC-07 — Edycja geometrii

### Stan

Większość operacji istnieje: Convert/Expand, corners, offset, outline stroke, join, close, reverse i Clean Up. Brakuje pełnej walidacji workflow, test matrix i synchronizacji specyfikacji.

### Lista domknięcia

- [ ] Zweryfikować `GeometryOperationSession` jako transient preview bez mutacji dokumentu.
- [ ] Dodać testy Apply/Cancel dla każdej operacji i Escape recovery.
- [ ] Sprawdzić zachowanie style, transform, layer, z-order, visibility, lock i IDs.
- [ ] Dodać edge cases offset: collinear, self-intersection, zero/huge distance i open path.
- [ ] Dodać edge cases corners: clamp, closed/open, mixed handles i radius bounds.
- [ ] Dodać outline stroke parity dla cap/join/miter/dash i brak stroke.
- [ ] Dodać Cleanup finding selection, empty result, duplicate detection i one-command apply.
- [ ] Uzupełnić Properties preview status, warnings, destructive confirmation i keyboard.
- [ ] Odhaczyć `EDIT-001…018` dopiero po unit + Playwright evidence.

### DoD

Każda operacja ma operation session, preview, cancel, atomic apply, Undo/Redo, invariants, feedback i regression test.

---

## 11. EPIC-08 — Boolean, maski i compositing

### Stan

Istnieją BooleanCommand, CompoundPathCommand, MaskCommand, BooleanOperationSession, preview i invariants dla mask references. Brakuje pełnego renderer/UI workflow, edycji zawartości maski i pełnego coverage.

### Lista wdrożenia

- [ ] Ustalić canonical boolean contract: input order, fill rule, holes, output IDs, z-order, style ownership.
- [ ] Zweryfikować Unite, Subtract, Intersect, Exclude, Divide i Crop na polygonach oraz cubic paths.
- [ ] Dodać empty/invalid/partial result warnings bez nadpisania aktywnego dokumentu.
- [ ] Dodać compound path z `fillRule`, child ownership i holes.
- [ ] Dodać clipping mask renderer: mask geometry, content list, transforms, visibility i isolation.
- [ ] Dodać opacity mask: alpha/luminance policy, renderer compositing i SVG export/import.
- [ ] Dodać isolate mode dla grup i masek z bezpiecznym powrotem.
- [ ] Dodać Expand Appearance jako jawnie destrukcyjną operację z confirmation.
- [ ] Dodać overlay preview oraz Apply/Cancel dla ciężkich booleanów.
- [ ] Dodać SVG `<clipPath>`, mask, fill-rule i round-trip policy.
- [ ] Uzupełnić panel Properties/Geometry i Layers feedback dla mask ownership.
- [ ] Odhaczyć `BOOL-001…016` tylko po geometry, SVG i E2E coverage.

### Pliki i DoD

- `packages/core/src/geometry/boolean.ts`, `commands/boolean.ts`, `model/invariants.ts`.
- `packages/editor-engine/src/operations/boolean-session.ts`, `isolation/*`.
- `packages/renderer/src/index.ts` lub wydzielony adapter mask/compositing.
- `packages/io/src/svg/{import,export}.ts`.
- DoD: no dangling refs, preview/cancel is non-mutating, Apply is one command, Canvas/SVG semantics documented and tested.

---

## 12. EPIC-09 — Fill, stroke, kolor i style

### Stan

Rozszerzone w commitach `0339505` i `61c2843`: solid/none fill, linear/radial/angular/pattern fills, color parser, gradient stops/editor, stroke controls, opacity, four blend modes, document palette, global-color command, object-style commands, eyedropper i paint bucket. Nadal brakuje pełnego zarządzania paletami, importu palet, pełnego global-color UI, style library UI i visual regression.

### 12.1. Kontrakt domeny

- [ ] Ustabilizować `FillStyle`: `none`, `solid`, `linear-gradient`, `radial-gradient`, `angular-gradient`, `pattern`.
- [ ] Ustabilizować `GradientStop`: stable `id`, offset `[0,1]`, color canonical, opacity `[0,1]`.
- [ ] Ustabilizować `StrokeStyle`: enabled/null policy, color, width, cap, join, miterLimit, dashArray, opacity.
- [ ] Dodać `BlendMode` z mapowaniem Canvas/SVG i fallbackiem dla nieobsługiwanych trybów.
- [ ] Dodać `ColorPalette`, `PaletteColor`, `SavedObjectStyle` oraz referencje global colors.
- [ ] Zdecydować, czy global color jest referencją ID, czy propagacją po semantic token; zapisać ADR przed rozszerzeniem modelu.

### 12.2. Color pipeline — STYLE-001…008

- [ ] Przepuścić każdy kolor przez jeden parser w `packages/shared`.
- [ ] Obsłużyć HEX 3/4/6/8, RGB/RGBA, HSL/HSLA i CMYK z canonical output.
- [ ] Dodać formatowanie kanałów i round-trip tests bez niezależnych konwersji w UI.
- [ ] Dodać out-of-gamut state z warning icon + tekstem; nie zmieniać koloru automatycznie.
- [ ] Dodać ColorControl target toggle Fill/Stroke, No Fill, swatch, text input, native picker fallback i error state.
- [ ] Pokryć empty/invalid/null, alpha, wartości poza zakresem, keyboard Enter/Escape i Dark/Light.

### 12.3. Stroke — STYLE-009…016

- [ ] Dodać stroke enable/disable jako jawny command, bez utraty poprzedniego stroke.
- [ ] Dodać width, position policy albo jawne ograniczenie modelu, cap, join i miter limit.
- [ ] Dodać dash pattern editor z parzystą/nieparzystą tablicą, non-negative validation i reset.
- [ ] Ujednolicić Canvas/SVG/import policy dla line, rectangle, ellipse i path.
- [ ] Dodać testy screen-space hit-test z szerokim/dashed stroke oraz zero/huge width.

### 12.4. Gradients i patterns — STYLE-017…022

- [ ] Dodać radial gradient editor: center, radius, stops, preview, Apply/Cancel, command.
- [ ] Dodać angular gradient editor: center, angle, stops i browser fallback.
- [ ] Ustalić SVG angular policy: native support brak, więc eksport musi mieć opisane przybliżenie albo geometry expansion, nie cichy mismatch.
- [ ] Dodać add/remove/reorder gradient stops, stable IDs, offset clamp, opacity i keyboard editing.
- [ ] Dodać canvas handles w screen space z transient preview i commit po pointerup.
- [ ] Dodać pattern definitions: dots/grid/hatch jako minimum, size/colors/transform i safe limits.
- [ ] Dodać pattern SVG `<pattern>`, import definitions i filtrowanie elementów `<defs>` z object list.
- [ ] Dodać Canvas/SVG visual fixtures dla linear/radial/angular/pattern.

### 12.5. Palety i swatches — STYLE-023…029

- [ ] Dodać document palette do `DocumentModel` z add/remove/rename/reorder color.
- [ ] Dodać user palette poza dokumentem przez osobny validated persistence adapter.
- [ ] Dodać saved palette CRUD, duplicate, rename i delete z confirmation.
- [ ] Dodać import palette z bezpiecznym formatem JSON/ASE/ACO tylko po ustaleniu parsera i limitów.
- [ ] Dodać swatches solid, gradient i pattern z selected/hover/focus tokens.
- [ ] Dodać Apply swatch jako `SetObjectStyleCommand` lub dedykowaną komendę.
- [ ] Dodać tests corrupted palette, duplicate IDs, invalid colors, empty palettes i restore.

### 12.6. Global colors i object styles — STYLE-030…033

- [ ] Dodać global color ID w style/fill/stroke zgodnie z ADR; nie opierać propagacji tylko na string equality.
- [ ] Dodać impact preview przed propagacją.
- [ ] Dodać atomowy `UpdateGlobalColorCommand`, który aktualizuje wszystkie referencje albo odrzuca całość.
- [ ] Dodać object style library: save, rename, apply, update, delete i duplicate.
- [ ] Zachować override policy: użytkownik widzi, które wartości pochodzą ze style/global color.
- [ ] Dodać tests execute/undo/redo, object locked, multi-selection, missing reference i serialization.

### 12.7. Eyedropper i Paint Bucket — STYLE-034…036

- [ ] Zdefiniować target mode: fill, stroke albo whole style.
- [ ] Eyedropper ma pobierać semantyczny style z obiektu, nie piksel z UI/chrome.
- [ ] Paint Bucket ma jawnie pokazywać target, preview i wynik dla zamkniętych obszarów.
- [ ] Dodać hit-test/fill-rule policy dla bucket i ostrzeżenie przy braku zamkniętego regionu.
- [ ] Commitować pobranie jako jedną komendę z pełnym Undo/Redo.
- [ ] Dodać keyboard `I`/`G`, tooltip, ARIA, status bar i Escape cancel.
- [ ] Dodać E2E: select target→eyedropper color/style→bucket→undo/redo.

### 12.8. Opacity i blend — STYLE-037…041

- [ ] Utrzymać opacity object w `[0,1]`, osobno od stroke/stop opacity.
- [ ] Dodać Normal, Multiply, Screen, Overlay w Properties z opisem tekstowym.
- [ ] Mapować Normal na `source-over`, pozostałe na Canvas `globalCompositeOperation`.
- [ ] Eksportować SVG `mix-blend-mode` albo jawny compatibility report.
- [ ] Dodać tests layer opacity × object opacity × stroke/stop opacity.

### 12.9. Pliki i DoD

- `packages/shared/src/color.ts`: parser i normalizer.
- `packages/core/src/model/types.ts`, `factory.ts`, `invariants.ts`: style/palette contracts.
- `packages/core/src/commands/document-commands.ts`, `commands/style-commands.ts`: atomic mutations.
- `packages/renderer/src/index.ts`: Canvas fill/stroke/pattern/blend.
- `packages/io/src/schema/document-v1.ts`, `svg/import.ts`, `svg/export.ts`: validation and parity.
- `packages/ui/src/primitives/ColorControl.tsx`, `apps/web/src/features/panels/PropertiesPanel.tsx`, `ToolRail.tsx`, `CanvasViewport.tsx`: UI/tools.
- DoD: `STYLE-001…041` status updated only after domain, UI, serialization, Canvas/SVG, Undo/Redo and tests.

---

## 13. Dokumentacja statusu i zarządzanie wykonaniem

- [ ] Przy każdym ukończonym tasku zaktualizować właściwy `BACKLOG.md` i plik epica.
- [ ] Nie używać opisów „complete”, jeśli pozostaje brakujący adapter, workflow albo test wymagany przez DoD.
- [ ] Każdy większy kontrakt lub boundary change dostać ADR przed implementacją.
- [ ] Każdy epic mieć jeden dump z `Changes Per File`, walidacją i ograniczeniami.
- [ ] Każdy epic mieć osobny progress log z `meta`, `summary`, `implementation`, `validation`, `filesChanged`, `outcome`, `knownLimitations`.
- [ ] Przed zamknięciem epica uruchomić właściwe skrypty z `package.json`: lint, typecheck, unit/integration, E2E, build oraz visual/performance, jeśli dotyczą.
- [ ] Po zakończeniu audytu porównać kod z pełną specyfikacją, nie tylko z ostatnim commitem.

## 14. Definicja ukończenia projektu

Projekt jest zgodny z tym planem, gdy:

- każdy task ma status `done`, `staged` z opisanym powodem albo `blocked` z właścicielem i następnym krokiem;
- wszystkie trwałe mutacje są command-based i odwracalne;
- import/export i persistence są walidowane, atomowe i odzyskiwalne;
- Canvas, SVG i model mają wspólną semantykę albo jawny compatibility report;
- UI spełnia design tokens, keyboard, ARIA, focus i Dark/Light;
- regresje unit, integration, E2E, visual i performance mają dowód adekwatny do taska;
- backlog i pliki epiców odzwierciedlają rzeczywisty kod.
