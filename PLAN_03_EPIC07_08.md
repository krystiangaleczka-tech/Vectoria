# Vectoria — Plan implementacji EPIC-07 + EPIC-08

> Plik 3 z 5. Wstęp i zasady w `PLAN_01_zasady_i_EPIC04.md`. Synteza w `PLAN_05_synteza.md`.

---

## 4. EPIC-07 — Edycja geometrii

Większość operacji istnieje z komendami i testami. Clean Up jest częściowy.

### 4.1. Checklist weryfikacji

| Task | Status | Dowód |
|---|---|---|
| EDIT-001 Parametric shape edit | DONE | `SetRectangleGeometryCommand` `:658-719`, `SetEllipseGeometryCommand:723-773`, `SetLineGeometryCommand:777-825`, `SetPathGeometryCommand:829-877`, `UpdatePathNodeCommand:879-902`; test `epic-07-geometry.test.ts:41-54` |
| EDIT-002 Convert to Curves/Expand | DONE | `ConvertToCurvesCommand` `geometry-commands.ts:42-57`, `expandObject` `operations.ts:68-83`, `ConvertObjectToPathCommand` `:1162-1186`; preview `geometry-operation-session.ts:27-30` |
| EDIT-003 Corner Tool | DONE | `CornerTool` `corner-tool.ts:9-45`, `CornerPathCommand` `geometry-commands.ts:59-71`, UI `GeometryProperties.tsx:58-63` |
| EDIT-004 Rounded corners | DONE | `applyCorners` `'rounded'` `operations.ts:126-136`, test `:56-67` |
| EDIT-005 Chamfer corners | DONE | `'chamfer'` `:111-115`, test `:63-64` |
| EDIT-006 Inverted corners | DONE | `'inverted'` `:117-124`, test `:65-66,136-143` |
| EDIT-007 Offset Path inside | DONE | `OffsetPathCommand` `'inside'` `geometry-commands.ts:73-88`, `offsetPath` `operations.ts:145-182`, test `:69-84` |
| EDIT-008 Offset Path outside | DONE | ten sam cmd `'outside'`, test `:71-77` |
| EDIT-009 Outline Stroke | DONE | `OutlineStrokeCommand` `geometry-commands.ts:90-106`, `outlineStroke` `operations.ts:184-214`, `ConvertStrokeToPathCommand` `:1188-1224`, test `:98-109` |
| EDIT-010 Join Paths | DONE | `JoinPathsCommand` `geometry-commands.ts:134-173`, `JoinOpenPathsCommand` `:1081-1136`, UI `PropertiesPanel.tsx:239`, test `:111-121` |
| EDIT-011 Close Path | DONE | `ClosePathCommand` `geometry-commands.ts:108-119`, UI `GeometryProperties.tsx:73`, test `:86-96` |
| EDIT-012 Reverse Path Direction | DONE | `ReversePathDirectionCommand` `:121-132`, `ReversePathCommand` `:967-985`, UI `:74`, test `:91-95` |
| EDIT-013 Clean Up document | **PARTIAL** | `CleanUpCommand` `:180-228` + `scanCleanup` `:216-234`. Emituje tylko `orphan-point` + `duplicate`. `empty-group` i `unused-style` zadeklarowane w typie `:21` ale NIGDY produkowane. Test `:123-134` tylko duplicate. |
| EDIT-014 Empty groups | **MISSING** | `scanCleanup` nie emituje `kind:'empty-group'`; brak logiki detekcji. |
| EDIT-015 Lonely points | DONE | `orphan-point` dla paths < min nodes `:219-222` |
| EDIT-016 Duplicate elements | DONE | `sameGeometry` `:289-297`, scan `:224-231`, test `:123-134` |
| EDIT-017 Unused styles | **MISSING** | `scanCleanup` nie emituje `unused-style`; brak skanu referencji stylów. |
| EDIT-018 Clean Up panel | DONE | `CleanupPanel.tsx:1-33` (list/select/apply/cancel/ARIA), `PropertiesPanel.tsx:135`, `GeometryProperties.tsx:54` |

### 4.2. Pominięte przez model

- **EDIT-013/014/017**: Clean Up nie wykrywa pustych grup ani nieużywanych stylów. Typ `CleanupFinding` deklaruje te rodzaje, ale `scanCleanup` ich nie produkuje.

### 4.3. Plan domknięcia EPIC-07

1. W `scanCleanup` dodać detekcję: puste grupy (`GroupObject.childIds.length === 0`), nieużywane style (`objectStyles` bez referencji w `objects[*].style` — porównanie po `id`/wartości).
2. Dodać testy dla empty-group i unused-style findings.
3. Rozszerzyć `CleanupPanel` o podświetlenie kategorii i zliczenia.
4. Edge cases offset: collinear, self-intersection, zero/huge distance, open path — dodać testy.
5. Edge cases corners: clamp przy closed/open, mixed handles, radius bounds — dodać testy.

---

## 5. EPIC-08 — Boolean, maski i compositing

Boolean + compound + izolacja grupy działają. Maski i Expand Appearance nie są domknięte.

### 5.1. Checklist weryfikacji

| Task | Status | Dowód |
|---|---|---|
| BOOL-001 Unite | DONE | `previewBoolean` `'unite'` `boolean.ts:32-67`, `BooleanCommand` `:7-24`, test `:26-31` |
| BOOL-002 Subtract | DONE | `'subtract'` `:59`, test `:18-24` |
| BOOL-003 Intersect | DONE | `'intersect'` `:60` |
| BOOL-004 Exclude | DONE | `'exclude'` `:61` |
| BOOL-005 Divide | DONE | `'divide'` `:48-53` |
| BOOL-006 Crop | DONE | `'crop'` `:60` |
| BOOL-007 Compound Path | DONE | `CompoundPathCommand` `:26-43`, `compoundChildren`/`fillRule` `types.ts:186-187`, renderer `:531`, test `:33-44` |
| BOOL-008 Holes | **PARTIAL** | `fillRule` `evenodd`/`nonzero` przechowywane; renderer honoruje `:535`. Ale `subtract` produkuje osobne ścieżki, nie pojedynczą z dziurami (`boolean.ts:65-67`). SVG export NIE emituje `fill-rule` (`export.ts:210-217`). |
| BOOL-009 Clipping Mask | **PARTIAL** | `MaskCommand` `:45-59`, `MaskGroup` `types.ts:289-295`, session `boolean-session.ts:10`, schema `io/schema/document-v1.ts:210`. ALE `renderScene` `renderer/index.ts:256-297` nie czyta `doc.maskGroups` — maski NIE renderowane. SVG import/export ignoruje `clipPath`/`mask` (poza artboard clip). |
| BOOL-010 Edit mask content | **PARTIAL** | `IsolationService.enterMask` `isolation-service.ts:16`, breadcrumb `CanvasViewport.tsx:1164`. Brak komendy add/remove content, brak affordance renderera. |
| BOOL-011 Opacity Mask | **PARTIAL** | `MaskCommand` mode `'opacity'` + `opacityMode:'alpha'\|'luminance'` `:50,54`, `types.ts:294`. Brak wsparcia renderera, brak SVG import/export `<mask>`. |
| BOOL-012 Isolate Mode groups | DONE | `enterGroup`/`exit` `:15-21`, hit-test scope `allowedObjectIds` `CanvasViewport.tsx:608,662,1055`, Escape `:1101-1102`, breadcrumb `:1164` |
| BOOL-013 Isolate Mode masks | **PARTIAL** | `enterMask` istnieje, ale brak UI entry; mask nie renderowany więc izolacja bez widocznego targetu. |
| BOOL-014 Expand Appearance | **MISSING** | brak `ExpandAppearance`/`expand-appearance` w całym repo. |
| BOOL-015 Boolean preview | DONE | `previewBoolean` `:32-43`, `BooleanOperationSession` `boolean-session.ts:8`, overlay `renderGeometryPreview` `renderer/index.ts:786-814`, UI `GeometryProperties.tsx:50-51` |
| BOOL-016 Boolean regression tests | **PARTIAL** | `epic-08-boolean.test.ts:1-45` tylko subtract/compound/mask basic. Brak SVG round-trip, brak divide/crop/exclude/intersect testów, brak edge cases. |

### 5.2. Pominięte przez model

- **BOOL-009/010/011**: maski mają model, komendę i schemę, ale NIE są renderowane na canvasie (`renderScene` ignoruje `maskGroups`) i NIE obsługują SVG round-trip (`<clipPath>`, `<mask>`). To największa luka w EPIC-08.
- **BOOL-008**: subtract produkuje osobne ścieżki zamiast compound z dziurami; brak `fill-rule` w eksporcie.
- **BOOL-014**: brak Expand Appearance.
- **BOOL-016**: braki testów dla divide/crop/exclude/intersect, opacity mask, isolation, SVG round-trip.

### 5.3. Plan domknięcia EPIC-08

1. W `renderScene` dodać mask compositing: dla każdego `MaskGroup` renderować content z `clip`/`opacity` według `mode` i `opacityMode`. Użyć offscreen canvas dla izolacji grupy.
2. Dodać komendy `AddMaskContentCommand`/`RemoveMaskContentCommand` i UI edycji w trybie izolacji maski.
3. SVG import: rozpoznać `<clipPath>`, `<mask>`, `clip-path`, `mask` → mapować do `MaskGroup`. SVG export: emitować `<clipPath>`/`<mask>` z `fill-rule`.
4. Zmienić `subtract`/`exclude` aby produkcja compound path z `fillRule` + `compoundChildren` zamiast osobnych ścieżek (lub udokumentować policy).
5. Dodać `ExpandAppearanceCommand` — jawna operacja destrukcyjna z confirmation (rozwija efekty/appearance do geometrii).
6. UI: entry do izolacji maski (double-click na maskę), Properties pokazuje ownership maski, Layers feedback.
7. Testy: geometry bool matrix, SVG round-trip, empty/invalid result warnings, isolation in/out.
