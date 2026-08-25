# Vectoria — Plan implementacji EPIC-04…09 — Zasady + EPIC-04

> Status: plan wykonawczy z audytem kodu
>
> Basis: `ROADMAP.md`, `BACKLOG.md`, `epics/EPIC-04…09`, `VECTORIA_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `AGENTS.md`, `comment_rules.md`.
>
> Audyt wykonano przez bezpośredni przegląd kodu w `packages/core`, `packages/editor-engine`, `packages/renderer`, `packages/io`, `packages/ui`, `packages/shared` oraz `apps/web`. Każdy task ma status zweryfikowany wobec rzeczywistego kodu, a nie wobec opisów w `BACKLOG.md` (które w wielu miejscach nie są zsynchronizowane z kodem).
>
> Plik 1 z 5. Pozostałe: `PLAN_02_EPIC05_06.md`, `PLAN_03_EPIC07_08.md`, `PLAN_04_EPIC09.md`, `PLAN_05_synteza.md`.

---

## 0. Zasady weryfikacji

Status każdego taska:

- **DONE** — kontrakt domenowy + komenda/Undo + renderer/IO + UI + testy istnieją w kodzie.
- **PARTIAL** — warstwa domenowa lub komenda istnieje, ale brakuje renderera, UI, testu lub pełnej semantyki; workflow użytkownika nie jest domknięte.
- **MISSING** — brak kodu lub tylko typ placeholder bez logiki.

Reguła (z `AGENTS.md` §7 i §11): task nie jest ukończony, dopóki nie działa pełny workflow od inputu do zapisu/eksportu z Undo/Redo. Sam model lub sam przycisk to **PARTIAL/MISSING**, nie DONE.

---

## 1. EPIC-04 — Kształty podstawowe

`SceneObject` union (`packages/core/src/model/types.ts:200`) = `rectangle | ellipse | line | path | group`. Tylko ta piątka istnieje.

### 1.1. Checklist weryfikacji

| Task | Status | Dowód (file:line) |
|---|---|---|
| SHAPE-001 Rectangle Tool | DONE | `types.ts:152`, `shapes.ts:45` (`normalizeShapeDrag`), `renderer/index.ts:380` (`renderRectangle`), `svg/import.ts:131`, `svg/export.ts:146`, `document-commands.ts:658` (`SetRectangleGeometryCommand`) |
| SHAPE-002 Square (Shift) | DONE | `shapes.ts:59-67` — `Math.max(|dx|,|dy|)` z zachowaniem ćwiartki |
| SHAPE-003 Per-corner radius | DONE | `CornerRadii` `types.ts:133`, `normalizeCornerRadii` `shapes.ts:24`, UI `PropertiesPanel.tsx:154-159`, export `export.ts:157-168` |
| SHAPE-004 Rounded Rectangle | DONE | `cornerRadius: number\|CornerRadii` `types.ts:157`, `roundRect` `renderer/index.ts:570-588`, export `export.ts:153-162` |
| SHAPE-005 Ellipse Tool | DONE | `types.ts:160`, `renderer/index.ts:426`, `import.ts:132`, `export.ts:170`, `document-commands.ts:723` |
| SHAPE-006 Circle (Shift) | DONE | `shapes.ts:59-67` (ścieżka wspólna z rectangle dla `ellipse`) |
| SHAPE-007 Arc | **MISSING** | brak typu `ArcObject`, brak toola, brak renderera/SVG |
| SHAPE-008 Pie | **MISSING** | brak typu/sektora |
| SHAPE-009 Ring/Donut | **MISSING** | brak typu, brak invariantu `0<=inner<outer` |
| SHAPE-010 Line Tool | DONE | `types.ts:166`, `constrainLine` `shapes.ts:86-93`, `renderer/index.ts:466`, `import.ts:133`, `export.ts:183`, `document-commands.ts:777` |
| SHAPE-011 Polyline Tool | **MISSING** | brak `polyline-tool.ts`; `PolylineTool` w `freehand-tools.ts:124` to klasa bazowa dla Eraser/Knife, nie tool użytkownika; SVG import nie obsługuje `<polyline>` (`import.ts:125` tylko rect/ellipse/line/path) |
| SHAPE-012 Arrowheads | **MISSING** | `StrokeStyle` `types.ts:93-101` nie ma pól markerów; SVG export bez `<marker>` |
| SHAPE-013 Polygon | **MISSING** | brak `PolygonObject`, brak toola |
| SHAPE-014 Star | **MISSING** | brak `StarObject`, brak toola |
| SHAPE-015 Spiral | **MISSING** | brak `SpiralObject`, brak toola, brak limitu turns |
| SHAPE-016 Triangle | **MISSING** | brak typu (mógłby być polygon sides=3) |
| SHAPE-017 Diamond | **MISSING** | brak typu |
| SHAPE-018 Callout/Speech Bubble | **MISSING** | brak typu, brak walidacji tail |
| SHAPE-019 Parametric handles | **MISSING** | brak overlay handles dla parametrów (radius/sides/angle); edycja tylko przez NumberInput |
| SHAPE-020 Star points UI | **MISSING** | zależne od SHAPE-014 |
| SHAPE-021 Arc angle UI | **MISSING** | zależne od SHAPE-007 |
| SHAPE-022 Custom shape presets | **MISSING** | `presets.ts:13-23` ma tylko `DOCUMENT_PRESETS` |
| SHAPE-023 Preset library UI | **MISSING** | brak biblioteki kształtów |

### 1.2. Pominięte przez model (do domknięcia)

- **Brak narzędzi jako state machines w engine**: rysowanie rectangle/ellipse/line jest inline w `apps/web/src/features/canvas/CanvasViewport.tsx:550,718,883,896-900`, a nie w `packages/editor-engine/src/tools/`. `editor-engine/src/index.ts` nie eksportuje `RectangleTool`/`EllipseTool`/`LineTool`. To narusza `AGENTS.md` §4 ("narzędzia są state machines, nigdy logiką w komponencie React") i `VECTORIA_ARCHITECTURE.md` §8.
- **16 z 23 tasków MISSING**: Arc, Pie, Ring, Polyline, Arrowheads, Polygon, Star, Spiral, Triangle, Diamond, Callout, parametric handles, preset UI ×3.
- **SVG import ograniczony**: `import.ts:125` obsługuje tylko `rect, ellipse, line, path`. Brak `<polyline>`, `<polygon>`, `<circle>` (jako ellipse), markerów.

### 1.3. Plan domknięcia EPIC-04

1. Ujednolicić `ShapeTool` contract w `packages/editor-engine/src/tools/` (preview, commit, Escape, Shift, minimum geometry, style defaults). Przenieść logikę drag z `CanvasViewport.tsx` do `RectangleTool`/`EllipseTool`/`LineTool` jako state machines.
2. Dodać parametryczne typy obiektów w `types.ts`: `PolygonObject`, `StarObject`, `ArcObject`, `PieObject`, `RingObject`, `SpiralObject`, `TriangleObject` (jako polygon sides=3), `DiamondObject` (jako polygon), `CalloutObject`. Każdy przechowuje parametry semantyczne, nie spłaszczony path.
3. Dodać `PolylineTool` jako osobną state machine (click vertices, Enter/double-click commit, Escape cancel, min 2 punkty) + typ `PolylineObject` (lub reużycie `PathObject` z flagą).
4. Dodać model arrowhead w `StrokeStyle`: `markerStart`/`markerEnd` z `type|size|orientation`; adapter SVG `<marker>` i geometry expansion (jeden kontrakt).
5. Dodać geometry helpers: `packages/core/src/geometry/polygon.ts`, `star.ts`, `arc.ts`, `spiral.ts`, `callout.ts` z bounds/hit-test/invariants.
6. Dodać parametric overlay handles w `renderer` (min 14 px hit target, własny symbol bez mieszania z node/snap).
7. Rozszerzyć SVG import (`polyline`, `polygon`, `circle`) i export (parametryczne → SVG natywne lub path z documented policy).
8. UI: ToolRail (grupa Shape z iconami), Properties (parametry per type), preset library.
9. Testy: unit (geometria, invariants, clamp, wrap-around), E2E (create/edit/cancel/export), visual (Dark/Light, DPR 1/2).
