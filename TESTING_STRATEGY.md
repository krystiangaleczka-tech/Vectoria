# Vectoria — Testing Strategy

> Wersja: 1.1.0
>
> Cel: chronić geometrię, import AI/CDR, bezpieczeństwo dokumentów, workspace layouts i płynność interfejsu. Test jest częścią Definition of Done, a nie końcową czynnością przed release.

---

## 1. Cele jakościowe

1. **Geometry correctness** — pathy, Bézier, bounds, transformacje i hit-testing są deterministyczne.
2. **Document safety** — błąd importu, crash, anulowanie lub zły layout nie niszczą pracy użytkownika.
3. **Import fidelity** — wspierane elementy AI/CDR są edytowalne; uproszczenia są raportowane.
4. **Workflow correctness** — import → edit → undo → save → export działa jako całość.
5. **Performance** — pan, zoom, drag i resize pozostają responsywne.
6. **Workspace reliability** — presety, ukrywanie paneli, resize docków i późniejsze docking/floating layouts są stabilne.

## 2. Piramida testów

```text
                   Manual exploratory / real user files
                         AI/CDR fidelity review
                                  ▲
                         E2E browser workflows
                                  ▲
                Visual regression + performance scenarios
                                  ▲
                    Integration: engine/render/io/layout
                                  ▲
                Unit: core geometry/commands/sanitizers
```

Najwięcej testów musi być szybkie: unit/integration. E2E, screenshots i ręczne testy są obowiązkowe dla canvasu, renderu oraz prawdziwych plików AI/CDR.

## 3. Tooling

| Obszar | Narzędzie | Cel |
|---|---|---|
| Unit / integration | Vitest | core, commands, engine, importer, layout |
| Browser E2E | Playwright | workflow użytkownika i canvas input |
| Visual regression | Playwright screenshots | stabilność renderu i UI |
| Performance | Playwright + Performance API | p95 frame time, input latency, import time |
| Fuzz/property tests | fast-check / generators | paths, ImportIR, workspace JSON |
| Coverage | Vitest coverage | krytyczne moduły, nie vanity metric |
| CI | GitHub Actions | quality gates przed merge |

## 4. Unit tests

### 4.1. Core model i geometria

- [ ] tworzenie Document, Artboard, Layer i podstawowych obiektów
- [ ] unikalne ID
- [ ] document invariants
- [ ] serializacja/deserializacja `.vct`
- [ ] jednostki i konwersje wartości
- [ ] `Vec2`, `Rect`, matrix multiply/inverse
- [ ] world-to-screen i screen-to-world
- [ ] bounds dla rectangle, ellipse, line, path
- [ ] cubic Bézier point/tangent/bounds
- [ ] translate, scale, rotate, skew
- [ ] blokada `NaN`, `Infinity`, zero scale, invalid artboard dimensions
- [ ] fill/stroke/opacity/gradient stop validation

### 4.2. Commands i history

Każda komenda musi mieć test:

```text
execute → expected document
undo → exact previous state
execute → undo → execute → deterministic state
```

Minimalne komendy:

- [ ] CreateObject
- [ ] DeleteObjects
- [ ] UpdateObjectTransform
- [ ] UpdateObjectStyle
- [ ] ResizeArtboard
- [ ] ImportDocument
- [ ] Workspace preference update

Dodatkowo:

- [ ] komenda nie mutuje inputu
- [ ] invalid object reference daje kontrolowany error
- [ ] drag merge daje jeden wpis historii
- [ ] undo importu przywraca dokument przed importem

### 4.3. Tools i editor engine

- [ ] Select: select/deselect/move/delete
- [ ] Rectangle/Ellipse/Line: poprawna geometria drag
- [ ] Pen: click corner, drag handle, Enter commit, Escape cancel, close path
- [ ] Camera: pan, zoom pod kursorem, fit artboard/drawing
- [ ] Grid snap
- [ ] layer/object visible/locked behavior
- [ ] hit-test basic shapes
- [ ] tool shortcuts
- [ ] Undo/Redo po tool operation

### 4.4. Workspace layout

- [ ] `Vectoria Default` jest walidowany i renderowalny
- [ ] Illustrator-like/Corel-like/Minimal są poprawnymi presetami
- [ ] show/hide panel aktualizuje tylko workspace state
- [ ] width docka ma min/max clamp
- [ ] corrupted workspace JSON przywraca default
- [ ] unknown `PanelId` jest odrzucany
- [ ] workspace nie może zawierać HTML/function/component reference
- [ ] reset workspace nie zmienia DocumentModel
- [ ] keyboard profile jest niezależny od layout preset
- [ ] dock tree, gdy powstanie, zachowuje invariants split/tab group

## 5. Integration tests

### Document → engine → renderer

- [ ] tool dispatchuje właściwą command
- [ ] DocumentStore zwiększa revision
- [ ] revision invaliduje renderer
- [ ] renderer dostaje właściwy visibleWorldRect
- [ ] overlay ma prawidłowy selection bounds po camera transform
- [ ] resize artboard zmienia metadata, nie wymiar canvasu
- [ ] camera change nie modyfikuje geometrii dokumentu

### Import → IR → document

- [ ] adapter zwraca ImportIR
- [ ] ImportIR validator odrzuca zły schema
- [ ] mapper tworzy artboards/layers/objects
- [ ] warnings i unsupported trafiają do Compatibility Report
- [ ] import failure nie zmienia bieżącego dokumentu
- [ ] import jest jednym wpisem Undo/Redo
- [ ] source metadata zostaje zapisane

### UI → workspace

- [ ] wybór workspace preset zmienia layout
- [ ] panel resize nie zmienia document canvas dimensions
- [ ] hide/show panel nie resetuje selection
- [ ] layout jest persystowany i odtwarzany
- [ ] broken persisted layout resetuje się bez crasha

### Export

- [ ] SVG export rectangle/path ma poprawną geometrię
- [ ] fill/stroke/opacity są zachowane
- [ ] PNG export ma właściwy output dimension
- [ ] export selection ma poprawne bounds
- [ ] export nie używa viewport canvas jako źródła wymiaru dokumentu

## 6. AI/CDR test corpus

```text
packages/test-fixtures/
├── ai/
│   ├── basic-shapes-pdf-compatible.ai
│   ├── cubic-bezier-pdf-compatible.ai
│   ├── groups-layers.ai
│   ├── fill-stroke-dash.ai
│   ├── gradients.ai
│   ├── text-font-missing.ai
│   ├── clipping-mask.ai
│   ├── effects-mesh-3d.ai
│   ├── no-pdf-compatible.ai
│   └── malformed.ai
├── cdr/
│   ├── basic-shapes.cdr
│   ├── curves.cdr
│   ├── layers-groups.cdr
│   ├── fills-outlines.cdr
│   ├── text-images.cdr
│   ├── powerclip-effects.cdr
│   ├── legacy-version.cdr
│   ├── current-version.cdr
│   └── malformed.cdr
├── expected/
│   ├── import-reports/
│   ├── documents/
│   └── screenshots/
└── README.md
```

### Reguły corpus

- Fixture ma opis źródła, wersji, licencji i oczekiwanej kompatybilności.
- Nie commituj plików klientów bez zgody oraz anonimizacji.
- Każdy realny bug importu, jeśli legalne, otrzymuje minimalny fixture regresyjny.
- Fixture ma expected Compatibility Report i screenshot baseline.
- Uszkodzone i ogromne pliki są częścią corpus.

### Metryki per fixture

```text
format + detected version
input bytes
import duration
object count
editable / simplified / flattened / unsupported count
first render duration
peak memory
visual regression result
```

## 7. Visual regression

### Zasady

- Stały viewport: 1440×900.
- Kontrolowany DPR: 1 i osobno 2.
- Deterministyczne fonty albo wyłączony niestabilny text baseline.
- Screenshot po final render, nie w trakcie interaction render.
- Ustalona pixel tolerance; nie zwiększaj jej, aby ukryć regresję.

### Required screenshots

- [ ] Dark Premium default workspace
- [ ] Light workspace
- [ ] Illustrator-like preset
- [ ] Corel-like preset
- [ ] Minimal preset
- [ ] AI basic shapes import
- [ ] AI cubic Bézier import
- [ ] CDR basic shapes/curves import
- [ ] selection + node overlay
- [ ] very large logical artboard
- [ ] Compatibility Report warning/flattened/unsupported
- [ ] import error state

## 8. E2E workflows

### E2E-01: AI happy path

1. Import PDF-compatible AI.
2. Obserwuj progress.
3. Otwórz Compatibility Report.
4. Kontynuuj edycję.
5. Zaznacz i przesuń wspierany obiekt.
6. Undo i Redo.
7. Eksportuj SVG.
8. Zweryfikuj output.

### E2E-02: AI incompatible path

1. Wybierz AI bez PDF-compatible representation.
2. Sprawdź `AI_NO_PDF_COMPATIBILITY` UI.
3. Sprawdź, że aktywny dokument nie zmienił się.

### E2E-03: CDR happy path

1. Import reference CDR.
2. Progres/cancel jest dostępny.
3. Compatibility Report pokazuje wynik.
4. Wspierany obiekt jest edytowalny.
5. Eksport PNG kończy się sukcesem.

### E2E-04: Workspace

1. Uruchom Vectoria Default.
2. Przełącz na Illustrator-like.
3. Ukryj/otwórz Layers.
4. Zmień width right docka.
5. Odśwież stronę.
6. Sprawdź persistence.
7. Reset workspace.
8. Sprawdź, że document i selection nie zostały utracone.

### E2E-05: Extreme artboard resize

1. Utwórz dokument.
2. Ustaw ekstremalny logiczny artboard.
3. Wykonaj pan/zoom/select.
4. Sprawdź responsywność i rozmiar viewport canvas.

### E2E-06: Crash recovery

1. Importuj/edytuj dokument.
2. Poczekaj na autosave.
3. Odśwież kartę.
4. Odtwórz ostatni committed document.

## 9. Performance tests

### Budżety

| Scenario | Target |
|---|---:|
| Pan/zoom 100 basic objects | 60 FPS na urządzeniu referencyjnym |
| Drag jednego obiektu | p95 frame time ≤ 16.67 ms |
| Input → visual response | < 50 ms |
| Resize huge artboard | bez freeze UI |
| Workspace panel resize | nie blokuje canvas |
| Autosave | brak zauważalnego lag |
| Import AI/CDR | progres/anulowanie, brak blokady active document |

### Benchmark suite

```text
PERF-01: 100 rectangles pan/zoom
PERF-02: 1,000 rectangles pan/zoom
PERF-03: 100 paths × 50 cubic segments
PERF-04: logical artboard 1,000,000 × 1,000,000 units
PERF-05: extreme resize artboard
PERF-06: right dock resize + panel switching
PERF-07: import AI 1,000 supported objects
PERF-08: import CDR fixture
PERF-09: PNG export 4K
```

R-tree, worker pool, OffscreenCanvas, WebGL i texture cache wprowadzamy dopiero, kiedy benchmark pokazuje przekroczenie budżetu.

## 10. Fuzzing i resilience

- losowe poprawne cubic paths;
- ekstremalne camera zoom/pan;
- bardzo małe i bardzo duże liczby;
- malformed ImportIR;
- corrupted WorkspaceLayout/DockTree;
- missing object/layer references;
- malformed SVG/AI/CDR/PDF;
- cancel import w różnych fazach;
- Undo/Redo po anulowanym Pen Tool i przerwanym drag.

Crash, nieodwracalna utrata dokumentu, NaN w rendererze, infinite loop lub permanent UI freeze to błąd P0.

## 11. CI quality gates

### Każdy PR

- [ ] typecheck
- [ ] lint
- [ ] unit tests
- [ ] integration tests
- [ ] secret scan
- [ ] dependency audit
- [ ] brak niezatwierdzonych snapshot changes

### Zmiana core/renderer/importer/workspace

- [ ] visual regression
- [ ] benchmark w zakresie dotkniętym zmianą
- [ ] Undo/Redo test dla nowej mutacji
- [ ] import failure/state recovery test, jeśli dotyczy
- [ ] layout validation/reset test, jeśli dotyczy
- [ ] ADR, jeśli zmieniono granice architektury

### Release candidate

- [ ] wszystkie E2E workflows
- [ ] AI/CDR corpus
- [ ] no critical performance regression
- [ ] release checklist

## 12. Definition of Done

Feature jest Done, gdy:

1. Ma kryterium akceptacji użytkownika.
2. Ma unit test czystej logiki.
3. Ma integration test dla engine/document/render/IO, jeśli dotyczy.
4. Ma E2E update, jeśli zmienia workflow.
5. Ma fixture + visual test, jeśli dotyczy importu/renderu.
6. Ma Undo/Redo test, jeśli mutuje dokument.
7. Nie przekracza performance budgetu.
8. Ma bezpieczne error/cancel state.
9. Ma accessibility coverage dla UI.
10. Ma aktualizację ADR/dokumentacji, jeśli zmienia architekturę.
