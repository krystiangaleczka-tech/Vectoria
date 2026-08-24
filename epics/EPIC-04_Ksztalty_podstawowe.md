# [EPIC-04] Kształty podstawowe — specyfikacja wykonawcza

## Cel

Użytkownik tworzy, edytuje, zaznacza, styluje, zapisuje i eksportuje podstawowe kształty bez utraty płynności. Kształty są obiektami domenowymi w logical world space, a narzędzia są state machines w Editor Engine. Canvas jest viewportem, nigdy bitmapą rozmiaru artboardu.

Skeleton MVP dostarcza Rectangle, Ellipse i Line z preview drag, Shift constraint, stylem domyślnym, selection i command commit. Pełne `SHAPE-001…021` należy do 0.1, przy czym skomplikowane parametric shapes muszą zachować wspólny kontrakt geometry/render/hit-test/export.

## Niezmienniki

- `pointerdown` rozpoczyna transient draft, `pointermove` aktualizuje overlay/preview, `pointerup` tworzy dokładnie jedną `CreateObjectCommand`.
- Escape/pointercancel usuwa draft bez command i bez autosave.
- Każdy obiekt ma finite geometry, unique ID, visibility, lock, opacity, transform i ObjectStyle.
- Wszystkie geometryczne dane są world units; Shift constraints, snap i hit tolerances działają ergonomicznie w screen px.
- Renderer i SVG exporter interpretują ten sam domain model; React komponenty nie zawierają geometrii.
- Shapes poza `visibleWorldRect` nie są renderowane ani dokładnie hit-testowane.

## Kontrakty

```ts
export interface ShapeDraft {
  tool: ToolId;
  startWorld: Vec2;
  currentWorld: Vec2;
  modifiers: { shift: boolean; alt: boolean; meta: boolean };
}

export interface RectangleObject extends BaseObject {
  type: 'rectangle'; width: number; height: number;
  cornerRadius: { topLeft:number; topRight:number; bottomRight:number; bottomLeft:number };
}
export interface EllipseObject extends BaseObject {
  type: 'ellipse'; radiusX:number; radiusY:number;
}
export interface LineObject extends BaseObject {
  type: 'line'; start:Vec2; end:Vec2;
}
```

Parametric shapes przechowują parametry semantyczne (np. sides, innerRadius, startAngle, endAngle, arcMode), nie tylko spłaszczony path. Konwersja do path jest jawna i odwracalna commandem, jeśli będzie potrzebna później.

## Szczegółowy backlog

### Rectangle i Ellipse

- [ ] **SHAPE-001** Rectangle Tool (`R`): drag od startWorld do currentWorld, normalizacja dragów we wszystkich kierunkach, preview oraz CreateObjectCommand.
- [ ] **SHAPE-002** Shift tworzy Square: `abs(width) === abs(height)` z zachowaniem ćwiartki drag.
- [ ] **SHAPE-003** Niezależny radius TL/TR/BR/BL; każdy radius finite, ≥0 i ograniczony geometrycznie do połowy odpowiedniej krawędzi.
- [ ] **SHAPE-004** Rounded Rectangle: parametryczny rectangle, canvas handles i Properties; radius 0 daje zwykły rectangle.
- [ ] **SHAPE-005** Ellipse Tool (`L`): drag tworzy poprawne `radiusX/radiusY`, preview, hit-test fill/stroke oraz renderer/export.
- [ ] **SHAPE-006** Shift tworzy Circle (`radiusX === radiusY`).
- [ ] **SHAPE-007** Arc: start/end angle, direction, open path, stroke/fill policy i parametric handle.
- [ ] **SHAPE-008** Pie: zamknięty sektor z centrum, start/end angle oraz fill.
- [ ] **SHAPE-009** Ring/Donut: outer/inner radius, invariant `0 <= inner < outer`, niezależny fill/stroke i hit-test obszaru pierścienia.

### Linie i figury wielokątne

- [ ] **SHAPE-010** Line Tool (`\\`): start/end, Shift constraint 0/45/90°, stroke defaults, zero-length cancellation.
- [ ] **SHAPE-011** Polyline: click dodaje vertices, Enter commit, Escape cancel, double-click kończy; minimum dwa punkty.
- [ ] **SHAPE-012** Arrowheads: start/end type, size i orientacja z tangentem linii; eksport SVG używa markerów lub geometrycznej ekspansji zgodnie z jednym adapterowym kontraktem.
- [ ] **SHAPE-013** Polygon: center, radius, sides >=3, parametric sides handle.
- [ ] **SHAPE-014** Star: points >=3, outer/inner radius, rotation; invariant innerRadius < outerRadius.
- [ ] **SHAPE-015** Spiral: turns, decay/spacing i direction z limitami zapobiegającymi ekstremalnej liczbie segmentów.
- [ ] **SHAPE-016** Triangle: parametrized polygon sides=3.
- [ ] **SHAPE-017** Diamond: parametrized four-point rhombus, nie osobny niekompatybilny geometry type.
- [ ] **SHAPE-018** Callout/Speech Bubble: body bounds i tail anchor/direction, tail nie może generować self-intersection bez jawnej obsługi.

### Parametry i edycja

- [ ] **SHAPE-019** Parametric handles są overlayem screen-space, hit targetem minimum 14 px dla touch, update preview podczas drag i pojedynczym UpdateObjectCommand na pointerup.
- [ ] **SHAPE-020** Star points/sides w Properties i handle; waliduj integer range oraz nie gub style/transform.
- [ ] **SHAPE-021** Arc angle: number inputs oraz handles; normalizuj kąty, obsłuż wrap-around i pełne 360°.

## Tool state machines

```text
Idle → pointerDown(empty) → Creating
Creating → pointerMove → update draft/overlay
Creating → pointerUp(valid geometry) → CreateObjectCommand → Selecting created object → Idle
Creating → Escape/pointerCancel/invalid geometry → discard draft → Idle
```

Każdy tool korzysta z `SnapService` i dostaje screen/world point. Created object dostaje aktualny default fill/stroke/opacity, trafia do active layer, jest zaznaczany po commicie oraz przechodzi standardowy Undo/Redo/autosave workflow.

## Renderer, hit-test i eksport

- Background/scene/overlay pozostają rozdzielone; preview i parametric handles nie redrawują całej sceny.
- Bounds są dostępne dla culling i selection; precyzyjny hit-test rozróżnia fill/stroke/bounds z tolerancją screen px.
- Canvas renderer ma wspólne primitive routines dla rectangle, ellipse, line i path-like shapes; renderer nie mutuje modelu.
- SVG export mapuje prostokąt, ellipse, line i wspierane parametric shapes do poprawnych elementów SVG lub jednoznacznie udokumentowanych paths; import nie może łamać invariantów.

## UI i design system

- Tool Rail: Rectangle `R`, Ellipse `L`, Line `\\`, Shape group; icon 20 px, hit target 40×40, active `--color-selection-surface-strong`, tooltip ze skrótem i aria-label.
- Properties: Shape/Geometry, Transform, Appearance; NumberInput ma right-aligned mono/tabular values, suffix unit, Enter commit, Escape revert, arrow nudge i error text+icon+border.
- Canvas selection: blue 1.5 px box, white/blue handles 8 px, touch target 14 px. Parametric handles używają własnego rozpoznawalnego symbolu bez mieszania z node/snap.
- Wszystkie kolory pochodzą z tokenów; no hard-coded hex. Dark/Light, keyboard, focus-visible, reduced-motion są obowiązkowe.

## Pliki

```text
packages/core/src/objects/{rectangle.ts,ellipse.ts,line.ts,polygon.ts,star.ts,arc.ts,spiral.ts,callout.ts}
packages/core/src/{geometry/bounds.ts,geometry/hit-test.ts,commands/create-object.ts,commands/update-object.ts}
packages/editor-engine/src/tools/{rectangle-tool.ts,ellipse-tool.ts,line-tool.ts,polyline-tool.ts,shape-tool.ts}
packages/renderer/src/{scene-renderer.ts,overlay-renderer.ts}
apps/web/src/features/{toolbar/toolDefinitions.ts,properties/ShapeProperties.tsx}
```

## Testy

### Vitest

- Normalizacja dragów, Shift constraints, finite geometry i zero-size cancellation.
- Bounds/hit-test fill/stroke dla rectangle/ellipse/line; params arc/pie/ring/polygon/star/spiral/callout.
- Corner radius clamp, polygon/star sides, ring radii, angle wrap, arrowhead tangent.
- Command execute/undo oraz brak command dla cancelled draft.
- SVG serialization dla wspieranych shapes i geometry regressions.

### Playwright

- Create każdej figury przez Tool Rail/shortcut; preview, Escape cancel, selection po commit.
- Properties i parametric handles; keyboard-only NumberInput.
- Grid snap i Shift constraints przy różnych zoom/DPR.
- Screenshot regression Dark/Light, 1280×720, 1440×900, 1920×1080 i DPR 1/2.

## Definition of Done

- [ ] `SHAPE-001…021` są dostarczone lub jawnie etapowane bez blokowania Rectangle/Ellipse/Line vertical slice.
- [ ] Shapes są domain-first, command-based, undoable, serializowalne i renderowane tylko przez adapter.
- [ ] Drag i parametric edit nie degradują render loop ani nie powodują React rerenderów paneli.
- [ ] UI spełnia tokens, accessibility, autorską ikonografię i canvas language.
- [ ] Geometry, SVG i E2E tests przechodzą w CI.

## Źródła

- `BACKLOG.md`: SHAPE-001…021, zakres 0.1.
- `VECTORIA_ARCHITECTURE.md`: objects, tool state machines, commands, renderer, hit-test i viewport.
- `DESIGN_SYSTEM.md`: Tool Rail, Properties/NumberInput, selection/handles, tokens i accessibility.
