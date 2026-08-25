# Vectoria — Plan implementacji EPIC-09

> Plik 4 z 5. Wstęp i zasady w `PLAN_01_zasady_i_EPIC04.md`. Synteza w `PLAN_05_synteza.md`.

---

## 6. EPIC-09 — Fill, stroke, kolor i style

Najobszerniej zaimplementowany w warstwie domeny. Luki to głównie UI palet/swatches i mask rendering (zależność od EPIC-08).

### 6.1. Checklist weryfikacji

| Task | Status | Dowód |
|---|---|---|
| STYLE-001 Solid fill | DONE | `SolidFill` `types.ts:46-49`, `SetObjectStyleCommand` `:568-653`, UI `:244` |
| STYLE-002 No fill | DONE | `NoFill` `:51-53`, `ColorControl` null toggle `:131-147` |
| STYLE-003 Color Picker | DONE | `ColorControl.tsx:92-105` (native `<input type=color>` + hex) |
| STYLE-004 RGB | DONE | `parseColor` `color.ts:32-42` |
| STYLE-005 HEX | DONE | `:24-30`, `rgbToHex:18-20` |
| STYLE-006 HSL | DONE | `:44-55` |
| STYLE-007 CMYK | DONE | `:57-65` |
| STYLE-008 Out-of-gamut | DONE | `ParsedColor.outOfGamut` `:11`, UI `:150` |
| STYLE-009 Stroke color | DONE | `StrokeStyle.color` `:94`, UI `:247` |
| STYLE-010 Stroke width | DONE | `:95`, UI `:248` |
| STYLE-011 Stroke position | **MISSING** | `StrokeStyle` `:93-101` nie ma pola `position`/`align` (center only). Brak UI. |
| STYLE-012 Line caps | DONE | `:96`, UI `:250`, renderer `:407,478,541`, SVG `:224` |
| STYLE-013 Line joins | DONE | `:97`, UI `:251`, renderer `:408`, SVG `:224` |
| STYLE-014 Miter limit | DONE | `:98`, UI `:252`, renderer `:409`, SVG `:224` |
| STYLE-015 Dashed stroke | DONE | `:99`, UI `:253`, renderer `:410-412`, SVG `:225-227` |
| STYLE-016 Dash/gap pattern | DONE | ten sam `dashArray` (alternating) |
| STYLE-017 Linear gradient | DONE | `LinearGradientFill` `:62-67`, renderer `:307-320`, SVG `:87-96`, import `:112-118`, UI `:258`, test `:29-38` |
| STYLE-018 Radial gradient | DONE | `:69-74`, renderer `:322-326`, SVG `:98-101`, UI `:259`, test `:34-35` |
| STYLE-019 Angular gradient | DONE | `AngularGradientFill` `:76-81`, renderer `:328-334` (conic fallback), SVG `:103-106`, UI `:260` |
| STYLE-020 Multi-stop + opacity | DONE | `LinearGradientStop` `:55-60`, UI `:246` |
| STYLE-021 Gradient editor + canvas handles | **PARTIAL** | Edytor stops/offset/alpha `:246`. Brak canvas drag handles dla start/end/center — overlay nie renderuje gradient handles (grep negatywny w `renderer/index.ts`). |
| STYLE-022 Pattern fill | DONE | `PatternFill` `:83-89`, renderer `:336-355`, SVG `:108-112`, import `:119-124`, UI `:261` |
| STYLE-023 Document palette | DONE | `ColorPalette` `:120-125`, factory `factory.ts:99`, UI `:245`, `ApplyPaletteColorCommand` `style-commands.ts:95-98` |
| STYLE-024 User palette | **PARTIAL** | `scope:'document'\|'user'\|'saved'` `:124`, `UpsertPaletteCommand` `:70-77`. Brak UI, brak warstwy persistencji odróżniającej user od document. |
| STYLE-025 Saved palettes | **PARTIAL** | `UpsertPaletteCommand` istnieje, schema persists `:210`. Brak UI list/save/create. |
| STYLE-026 Import palettes | **MISSING** | brak importu ASE/JSON/SVG/GPL w `packages/io`. |
| STYLE-027 Color swatches | **PARTIAL** | Swatches w `:245`. Brak panelu/swatch library, brak create/delete. |
| STYLE-028 Gradient swatches | **MISSING** | brak UI/typu zapisanego gradientu. |
| STYLE-029 Pattern swatches | **MISSING** | brak UI/typu zapisanego patternu. |
| STYLE-030 Global colors | DONE | `UpdateGlobalColorCommand` `style-commands.ts:51-68` |
| STYLE-031 Global color propagation | DONE | `replaceStyleColors` `:5-15` (fill/stroke/stops/pattern) |
| STYLE-032 Object styles | **PARTIAL** | `SavedObjectStyle` `:127-131`, `SaveObjectStyleCommand` `:79-86`, `ApplySavedObjectStyleCommand` `:88-93`, factory `objectStyles:[]`. Brak UI list/save/apply. |
| STYLE-033 Style appearance (fill/stroke/opacity/effects w stylu) | **MISSING** | brak appearance/stack; pojedynczy `ObjectStyle` tylko. Brak multi-effect. |
| STYLE-034 Eyedropper | **PARTIAL** | ToolRail entry `ToolRail.tsx:18`, inline handler `CanvasViewport.tsx:476-484`. NIE state machine w `packages/editor-engine/src/tools` (brak `eyedropper-tool.ts`). |
| STYLE-035 Eyedropper color/style | DONE | `ApplyStyleCommand` kopiuje pełny styl `:481`, `style-commands.ts:44-49` |
| STYLE-036 Paint Bucket | **PARTIAL** | ToolRail `:18`, inline handler apply fill only `:481` (`SetObjectStyleCommand` fill patch). Brak engine toola, brak flood-fill, brak tolerancji. |
| STYLE-037 Object opacity | DONE | `:108`, UI `:255`, renderer `:388,434,502`, SVG `:152,178,189,214` |
| STYLE-038 Normal blend | DONE | `:112`, renderer `source-over` `:273`, UI `:256` |
| STYLE-039 Multiply | DONE | `:112`, renderer `:273`, SVG `blendAttr` `:219-221`, test `:10-17` |
| STYLE-040 Screen | DONE | ta sama ścieżka |
| STYLE-041 Overlay | DONE | ta sama ścieżka |

### 6.2. Pominięte przez model

- **STYLE-011**: brak pozycji stroke (`center` only). Trzeba decyzji: dodać `align: 'center'|'inside'|'outside'` z ADR lub jawne ograniczenie modelu.
- **STYLE-021**: brak canvas handles dla gradientów (start/end/center/radius).
- **STYLE-024/025/027/028/029/032**: warstwa komend istnieje, ale UI palet/swatches/object-styles nie istnieje.
- **STYLE-026**: brak importu palet (ASE/JSON/SVG/GPL).
- **STYLE-033**: brak appearance stack (zależne od EPIC-13).
- **STYLE-034/036**: Eyedropper i Paint Bucket to inline handlery w `CanvasViewport`, NIE state-machine toola w engine — naruszenie `AGENTS.md` §4. Paint Bucket brak flood-fill i tolerancji.

### 6.3. Plan domknięcia EPIC-09

1. ADR dla stroke position (align) przed zmianą modelu.
2. Dodać `eyedropper-tool.ts` i `paint-bucket-tool.ts` w `packages/editor-engine/src/tools/` jako state machines (target mode fill/stroke/whole, preview, flood-fill z tolerancją, jedena komenda commit). Usunąć inline handlery z `CanvasViewport`.
3. Dodać canvas gradient handles w overlay (start/end/center/radius/angle) z transient preview i commit po `pointerup`.
4. Zbudować panel Palettes/Swatches: list saved/user/document palettes, create/rename/delete/duplicate, swatches (solid/gradient/pattern) z Apply jako `SetObjectStyleCommand`/`ApplySavedObjectStyleCommand`.
5. Dodać import palet: parser ASE/JSON/SVG/GPL w `packages/io` z limitami i walidacją (`AGENTS.md` §6).
6. Object Style library UI (list/save/apply/update/delete/duplicate) + override policy (pokaż, które wartości pochodzą ze stylu/global color).
7. Testy: execute/undo/redo, locked object, multi-selection, missing reference, serialization, corrupted palette, duplicate IDs, empty palettes.
