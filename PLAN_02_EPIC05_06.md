# Vectoria — Plan implementacji EPIC-05 + EPIC-06

> Plik 2 z 5. Wstęp i zasady w `PLAN_01_zasady_i_EPIC04.md`. Synteza w `PLAN_05_synteza.md`.

---

## 2. EPIC-05 — Pen Tool i ścieżki

Najpełniej wdrożony epic. `BACKLOG.md:246-276` zaznacza wszystkie `[x]` — w większości zgodne z kodem.

### 2.1. Checklist weryfikacji

| Task | Status | Dowód |
|---|---|---|
| PATH-001 Pen state machine | DONE | `pen-tool.ts:31-156` (`idle`/`creating-path`), `CanvasViewport.tsx:141,543,839-843`, test `pen-tool.test.ts:6-75` |
| PATH-002 Corner (click) | DONE | `pen-tool.ts:96-100` (`kind:'corner'` bez drag) |
| PATH-003 Bezier (click+drag) | DONE | `pen-tool.ts:72-107` (mirrored in-handle, `smooth`) |
| PATH-004 Straight segment | DONE | `path.ts:31-37` (`getCubicSegment` controls=endpoints) |
| PATH-005 Cubic segment | DONE | `path.ts:31-45` |
| PATH-006 Open path | DONE | `commit(false)` Enter/Escape `pen-tool.ts:110-111` |
| PATH-007 Close via first node | DONE | `pen-tool.ts:60-62`, test `:58-67` |
| PATH-008 Rubber band | DONE | `pen-tool.ts:46-54,72-83`, overlay `CanvasViewport.tsx:266-329` |
| PATH-009 Add node on segment | DONE | `AddPathNodeCommand` de Casteljau `document-commands.ts:912-943` |
| PATH-010 Remove node | DONE | `RemovePathNodeCommand` + guard `:945-965` |
| PATH-011 Move node | DONE | `UpdatePathNodeCommand` `:879-902`, `SetPathGeometryCommand:829-877` |
| PATH-012 Merge nodes | DONE | `MergePathNodesCommand` `:1018-1044` |
| PATH-013 Split path | DONE | `SplitPathCommand` `:1046-1079` |
| PATH-014 Join open endpoints | DONE | `JoinOpenPathsCommand` (best-direction pairing) `:1081-1136` |
| PATH-015 Line→curve | DONE | `ConvertPathSegmentCommand` to:`curve` `:987-1016` |
| PATH-016 Curve→line | DONE | to:`line`, clears handles `:1000-1001` |
| PATH-017 Cusp | DONE | `kind:'cusp'` `path.ts:27`, Alt-drag `pen-tool.ts:67,92,97` |
| PATH-018 Smooth | DONE | `applyNodeKind` smooth `path.ts:75-110`, `SetPathNodeKindCommand:904-910` |
| PATH-019 Symmetric | DONE | `applyNodeKind` symmetric `path.ts:86-90`, `updatePathNodeHandle` mirrors `:122-126` |
| PATH-020 Auto-smooth | **PARTIAL** | `kind:'auto'` w unii `path.ts:27`, UI option `PropertiesPanel.tsx:220`, ale `applyNodeKind` dla `'auto'` tylko ustawia kind, NIE przelicza uchwytów z sąsiadów (`path.ts:76` no-op). Brak silnika auto-recalculation. |
| PATH-021 Edit in-handle | DONE | `updatePathNodeHandle(node,'in',…)` `path.ts:113-137`, `SetPathNodeHandlesCommand:1138-1142` |
| PATH-022 Edit out-handle | DONE | j.w. dla `'out'` |
| PATH-023 Disconnect handles | DONE | `DisconnectPathNodeHandlesCommand` `:1144-1152` |
| PATH-024 Connect handles | DONE | `ConnectPathNodeHandlesCommand` `:1154-1160` |
| PATH-025 Pen add/remove bez switcha | **PARTIAL** | Delete/Backspace usuwa ostatni draft node `pen-tool.ts:112-116`; ale dodanie węzła na istniejący zatwierdzony segment z poziomu Pena NIE zaimplementowane (wymaga `AddPathNodeCommand` przez Node Tool). Usuwanie tylko ostatniego in-flight noda. |
| PATH-026 Reverse path | DONE | `ReversePathCommand` + `reversePathNodes` `:967-985`, `path.ts:67-73` |
| PATH-027 Shape→curves | DONE | `ConvertObjectToPathCommand` (rect/ellipse/line→path, ellipse k-bezier) `:1162-1280` |
| PATH-028 Stroke→path | DONE | `ConvertStrokeToPathCommand` via `strokeOutline` `:1188-1267` |
| PATH-029 Handle/tangent preview | DONE | `pendingHandle`/`pendingInHandle` `pen-tool.ts:46-53`, overlay `CanvasViewport.tsx:317-328` |
| PATH-030 Modifiers | DONE | Shift=45° `:146-155`, Alt=cusp `:67,92`, testy `:77-96` |
| PATH-031 Geometry/edge tests | DONE | `path-commands.test.ts` (10 cases), `pen-tool.test.ts` (8 cases) |

### 2.2. Pominięte przez model

- **PATH-020 auto-smooth**: `kind:'auto'` jest tylko etykietą — brak auto-obliczania uchwytów z tangenty sąsiadów (`path.ts:76` no-op).
- **PATH-025**: dodawanie węzła na zatwierdzonym segmencie z poziomu Pena oraz usuwanie dowolnego (nie tylko ostatniego draft) węzła bez przełączania na Node Tool.

### 2.3. Plan domknięcia EPIC-05

1. Zaimplementować `applyAutoSmooth(node, neighbors)` w `path.ts`: tangenta średniona z sąsiadujących segmentów, długość adaptacyjna. Podmiana no-op gałęzi `path.ts:76`.
2. W `PenTool.pointerDown` dodać ścieżkę: jeśli klik w istniejący segment aktualnie edytowanej ścieżki → `AddPathNodeCommand` (bez opuszczania Pena). Usuwanie: Delete przy najechaniu na istniejący węzeł → `RemovePathNodeCommand` (z invariant guard).
3. Dodać testy jednostkowe dla auto-smooth (continuity, długość, kolizja z cusp) oraz E2E dla add/remove in-Pen.
4. Zsynchronizować `BACKLOG.md` (już `[x]` — pozostawić, ale oznaczyć PARTIAL w pliku epica).

---

## 3. EPIC-06 — Rysowanie swobodne i cięcie

Silnik i komendy zaimplementowane głębiej niż `BACKLOG.md:280-296` (wszystkie `[ ]`) sugeruje. Luki to UX/preview, nie engine.

### 3.1. Checklist weryfikacji

| Task | Status | Dowód |
|---|---|---|
| DRAW-001 Pencil Tool | DONE | `PencilTool` `freehand-tools.ts:90-92`, `CreateFreehandPathCommand` `freehand-commands.ts:16-49`, `CanvasViewport.tsx:489,787-790,1000-1016`, test `:14-21` |
| DRAW-002 Pencil smoothing | DONE | `freehandSamplesToPathNodes(samples,smoothing)` `freehand.ts:90-112`, `smoothPolyline` `:44-60`, UI `ContextualControlBar.tsx:70`. Uwaga: smoothing liczy się przy commicie, live preview = raw samples. |
| DRAW-003 Brush Tool | DONE | `BrushTool` `freehand-tools.ts:94-96`, pressure+widthProfile, `CanvasViewport.tsx:490,790`, test `:23-30` |
| DRAW-004 Brush stroke width | DONE | `widthProfileFromSamples`/`pressureToWidth` `freehand.ts:115-145`, `widthProfile` na PathObject, UI `ContextualControlBar.tsx:71` |
| DRAW-005 Stylus pressure | DONE | `FreehandSample.pressure`, `clampPressure` `:185-187`, `pressureToWidth` `:115-119`, toggle `:73`, forwarding `:489-490,676-677,789`, test `:23-30` |
| DRAW-006 Brush caps/joins | DONE | `StrokeStyle.lineCap`/`lineJoin` `types.ts:96-97`, UI `:74-75`, honor w `strokeOutline` `:1207,1257` |
| DRAW-007 Smooth Tool | DONE | `SmoothTool.previewPath` `:103-117`, `SmoothPathCommand` `:78-84`, drag `CanvasViewport.tsx:524,684,813-817`, test `:98-107` |
| DRAW-008 Live smooth | **PARTIAL** | Smoothing liczone przy commicie (`pointerUp` `:61`); `pointermove` renderuje raw samples `CanvasViewport.tsx:340`. Brak live smoothed-curve preview w trakcie rysowania. |
| DRAW-009 Smooth existing path | DONE | `SmoothPathCommand`/`smoothPathNodes` `:78-84,198-201`, wired `:519-524,813`, test `:98-107` |
| DRAW-010 Simplify Path | DONE | `SimplifyPathCommand`/`simplifyPathNodes` `:87-93,203-206`, RDP `simplifyPolyline` `:63-87`, `PropertiesPanel.tsx:215`, test `:103` |
| DRAW-011 Accuracy slider | **PARTIAL** | Komenda przyjmuje `accuracy` `freehand-commands.ts:88`, ale UI to przycisk z hardkodowanym `accuracy=75` `PropertiesPanel.tsx:215`. Brak suwaka, brak licznika węzłów/błędu. |
| DRAW-012 Preview simplify/smooth | **PARTIAL** | Smooth ma live preview (`SmoothTool.previewPath`). Simplify = brak podglądu, przycisk apply-once. `GeometryPreview` (`GeometryProperties.tsx:37-43`) nie obsługuje simplify. |
| DRAW-013 Eraser Tool | DONE | `EraserTool` `:133-138`, `erasePath` `:223-241`, `EraserPathCommand` `:184-188`, `CanvasViewport.tsx:491,678,791-800`, test `:32-43` |
| DRAW-014 Knife Tool | DONE | `KnifeTool` `:140-143`, `splitPathByPolyline` `:199-220`, `KnifePathCommand` `:178-182`, `:492,679,791-800`, test `:61-66` |
| DRAW-015 Scissors Tool | DONE | `ScissorsTool` `:145-148`, `splitPathAtPoint` `:189-196`, `ScissorsPathCommand` `:190-194`, `:498-507,802-808`, test `:61-66` |
| DRAW-016 Width Tool | DONE | `WidthTool` (t∈[0,1], clamp ≥0.1) `:150-183`, `SetPathWidthCommand` `:96-135`, `normalizeWidthProfile`/`widthAtT` `:122-157`, `:505-517,680,809-812`, test `:32-43` |
| DRAW-017 Local stroke width | DONE | `WidthPoint` drag → preview, `pointerup` → `SetPathWidthCommand`, `widthProfile` persisted, test `:98-107` |

### 3.2. Pominięte przez model

- **DRAW-008**: brak live smoothed-curve preview podczas rysowania Pencil/Brush (raw samples na preview).
- **DRAW-011**: accuracy hardkodowane, brak suwaka i feedbacku node-count/error.
- **DRAW-012**: brak preview dla Simplify (Smooth ma).
- Notatka architektoniczna: wszystkie `*-tool.ts` (`brush-tool.ts`, `eraser-tool.ts` itd.) to jednolinijkowe re-eksporty z `freehand-tools.ts`. Realna logika w jednym pliku 195 linii — rozważyć podział, ale to refactor, nie blokada.

### 3.3. Plan domknięcia EPIC-06

1. W `PencilTool`/`BrushTool` `pointermove` dodatkowo wyliczać smoothed path na bieżąco (throttle, min-distance) i renderować smoothed curve w overlay zamiast raw samples.
2. Dodać `SimplifySettings` w `ContextualControlBar`/`GeometryProperties`: suwak `accuracy` (0–100), live licznik `currentNodes → estimatedNodes`, estimowany error.
3. Rozszerzyć `GeometryPreview` o simplify (przed/po, Apply/Cancel).
4. Odhaczyć `DRAW-001…017` w `BACKLOG.md` po testach.
