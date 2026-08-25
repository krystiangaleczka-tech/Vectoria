# Vectoria — Plan implementacji EPIC-04…09 — Synteza i plan domknięcia

> Plik 5 z 5. Wstęp i zasady w `PLAN_01_zasady_i_EPIC04.md`. Epiki: `PLAN_01` (EPIC-04), `PLAN_02` (EPIC-05+06), `PLAN_03` (EPIC-07+08), `PLAN_04` (EPIC-09).

---

## 7. Podsumowanie pominięć — synteza

| Epic | DONE | PARTIAL | MISSING | Razem |
|---|---|---|---|---|
| EPIC-04 | 7 | 0 | 16 | 23 |
| EPIC-05 | 29 | 2 | 0 | 31 |
| EPIC-06 | 14 | 3 | 0 | 17 |
| EPIC-07 | 15 | 1 | 2 | 18 |
| EPIC-08 | 7 | 7 | 2 | 16 |
| EPIC-09 | 26 | 9 | 6 | 41 |
| **Suma** | **98** | **22** | **26** | 146 |

Największe luki:
1. **EPIC-04**: 16 brakujących kształtów parametrycznych (Arc/Pie/Ring/Polyline/Polygon/Star/Spiral/Triangle/Diamond/Callout/Arrowheads + handles + presets). Największy blok pracy.
2. **EPIC-08**: mask rendering + SVG round-trip (`<clipPath>`/`<mask>`) — model istnieje, ale niewizualizowany.
3. **EPIC-09**: UI palet/swatches/object-styles + canvas gradient handles + eyedropper/paint-bucket jako engine tools.

Problemy przekrojowe (naruszenia architektury z `AGENTS.md`):
- **Narzędzia jako inline w React**: Rectangle/Ellipse/Line (`CanvasViewport.tsx`), Eyedropper, Paint Bucket — nie są state machines w `packages/editor-engine/src/tools/`. Naruszenie §4.
- **SVG round-trip mask/compound**: brak `fill-rule` w eksporcie, brak `clipPath`/`mask` w import.
- **`BACKLOG.md` niezgodny z kodem**: DRAW-001…017 wszystkie `[ ]` mimo 14 DONE; SHAPE-007…023 niezahaczone mimo że MISSING (poprawne); PATH-020/025 zaznaczone `[x]` mimo PARTIAL.

---

## 8. Osobny plan implementacji pominiętych elementów

Kolejność wg priorytetów `ROADMAP.md` §2 (silnik wydajności → kamera/render → zaznaczanie → Pen/Node → model/historia → SVG I/O → kolor/warstwy → Boolean → tekst) i zależności:

### Faza 1 — Naprawa naruszeń architektury (prerekwizyt)

- [ ] Przenieść Rectangle/Ellipse/Line z `CanvasViewport.tsx` do `RectangleTool`/`EllipseTool`/`LineTool` w `packages/editor-engine/src/tools/` jako state machines. `CanvasViewport` tylko wywołuje engine.
- [ ] Przenieść Eyedropper/Paint Bucket do `eyedropper-tool.ts`/`paint-bucket-tool.ts` jako state machines (STYLE-034/036).
- [ ] Zsynchronizować `BACKLOG.md` statusy z rzeczywistym kodem.

### Faza 2 — EPIC-04 parametryczne kształty

Kolejność zależności: typy → geometria → tool → renderer → SVG → UI → testy.

- [ ] Dodać typy: `PolygonObject`, `StarObject`, `ArcObject`, `PieObject`, `RingObject`, `SpiralObject`, `CalloutObject`. Triangle/Diamond jako Polygon (sides=3) / Polygon 4-point rhombus.
- [ ] Dodać geometrię: `packages/core/src/geometry/{polygon,star,arc,spiral,callout}.ts` z bounds/hit-test/invariants.
- [ ] Dodać `PolylineTool` (state machine: click vertices, Enter/dbl-click commit, Escape cancel, min 2).
- [ ] Dodać `ShapeTool` ujednolicony contract (preview/commit/Escape/Shift/min geometry).
- [ ] Dodać model arrowhead w `StrokeStyle` (`markerStart`/`markerEnd`) + adapter SVG `<marker>`.
- [ ] Dodać parametric overlay handles (min 14 px, własny symbol).
- [ ] Rozszerzyć SVG import (`polyline`, `polygon`, `circle`) i export.
- [ ] UI: ToolRail Shape group, Properties per-type, preset library (SHAPE-022/023).
- [ ] Testy: unit + E2E + visual (Dark/Light, DPR 1/2).

### Faza 3 — EPIC-05 domknięcie

- [ ] `applyAutoSmooth` w `path.ts` (PATH-020).
- [ ] Pen add/remove na zatwierdzonym segmencie (PATH-025).
- [ ] Testy auto-smooth i in-Pen add/remove.

### Faza 4 — EPIC-06 domknięcie UX

- [ ] Live smoothed-curve preview w Pencil/Brush `pointermove` (DRAW-008).
- [ ] Suwak accuracy + licznik węzłów (DRAW-011).
- [ ] Preview simplify (DRAW-012) przez `GeometryPreview`.

### Faza 5 — EPIC-07 domknięcie Clean Up

- [ ] Detekcja empty-group w `scanCleanup` (EDIT-014).
- [ ] Detekcja unused-style w `scanCleanup` (EDIT-017).
- [ ] Testy + rozszerzony `CleanupPanel`.

### Faza 6 — EPIC-08 maski i compositing (krytyczne)

- [ ] Mask rendering w `renderScene` (BOOL-009).
- [ ] `AddMaskContentCommand`/`RemoveMaskContentCommand` + UI izolacji (BOOL-010/013).
- [ ] Opacity mask rendering + SVG `<mask>` import/export (BOOL-011).
- [ ] Compound `fillRule` w SVG export + subtract→compound (BOOL-008).
- [ ] `ExpandAppearanceCommand` (BOOL-014).
- [ ] Pełna testowa matrix bool (BOOL-016).

### Faza 7 — EPIC-09 palety/swatches/style

- [ ] ADR stroke position (STYLE-011).
- [ ] Canvas gradient handles (STYLE-021).
- [ ] Panel Palettes/Swatches (STYLE-024/025/027/028/029).
- [ ] Import palet ASE/JSON/SVG/GPL (STYLE-026).
- [ ] Object Style library UI (STYLE-032).
- [ ] Eyedropper/Paint Bucket jako engine tools (z Fazy 1).

---

## 9. Reguły wykonania (z `AGENTS.md`, `VECTORIA_ARCHITECTURE.md`, `comment_rules.md`)

- Każda mutacja dokumentu = `Command` z `execute`/`undo`, deterministyczna, bez częściowej mutacji.
- `pointerup` tworzy jedną komendę dla całego dragu; Undo cofa cały drag.
- Import jest atomowy; błąd/cancel importu nie niszczy aktywnego dokumentu.
- Canvas = viewport × DPR, nigdy rozmiar artboardu.
- React nie mutuje `DocumentModel`; narzędzia to state machines w `editor-engine`, nie logika w komponencie.
- Granice importów: `editor-engine` → `core`+`shared`; `renderer` → `core`+read-only engine+`shared`; `io` → `core`+`shared`; `core` nie importuje UI/renderer/IO.
- Każdy input (SVG, plik, JSON, IndexedDB) nieufny: walidacja Zod na granicy, limity, sanityzacja.
- UI używa tokenów z `DESIGN_SYSTEM.md`; brak hardkodowanego hex; keyboard, ARIA, focus-visible, Dark/Light, stany empty/selected/locked/disabled/loading/error.
- JSDoc nad publiczną metodą/getterem >3 linie opisujące CO i DLACZEGO, nie JAK.
- Nie dodawać kodu/komentarzy/refaktorów, o które nikt nie prosił.
- Quality gates z prawdziwego `package.json`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm exec playwright test`. Nie zgadywać skryptów.
- Każda zmiana granic architektury/pakietów wymaga ADR przed implementacją.
- Każdy task domykać dopiero po pełnym workflow input→zapis/eksport+Undo/Redo+testy.

---

## 10. Definition of Done planu

Plan jest zrealizowany, gdy:
- wszystkie taski MISSING/PARTIAL z `PLAN_01`–`PLAN_04` mają status DONE z dowodem file:line;
- narzędzia Rectangle/Ellipse/Line/Eyedropper/PaintBucket są state machines w engine;
- maski są renderowane i round-trip w SVG;
- `BACKLOG.md` i pliki epiców odzwierciedlają rzeczywisty kod;
- `pnpm lint && pnpm typecheck && pnpm test && pnpm exec playwright test` zielone;
- ADR dla stroke position i granic mask adaptera zapisane.
