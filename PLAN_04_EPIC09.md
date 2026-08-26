# Vectoria — Plan implementacji EPIC-09

> Plik 4 z 5. Wstęp i zasady w `PLAN_01_zasady_i_EPIC04.md`. Synteza w `PLAN_05_synteza.md`.

---

## 6. EPIC-09 — Fill, stroke, kolor i style

EPIC-09 jest domknięty poza appearance stackiem STYLE-033, który pozostaje zależnością EPIC-13. Palety dokumentu są command-based, biblioteka user/saved jest oddzielona w IndexedDB, a gradient handles i style tools działają jako transient engine state.

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
| STYLE-011 Stroke position | DONE | `StrokeStyle.align` `types.ts:98-105`, migration/schema `document-v1.ts:82-90`, UI `PropertiesPanel.tsx:307`, renderer clipping `renderer/index.ts:820`. |
| STYLE-012 Line caps | DONE | `:96`, UI `:250`, renderer `:407,478,541`, SVG `:224` |
| STYLE-013 Line joins | DONE | `:97`, UI `:251`, renderer `:408`, SVG `:224` |
| STYLE-014 Miter limit | DONE | `:98`, UI `:252`, renderer `:409`, SVG `:224` |
| STYLE-015 Dashed stroke | DONE | `:99`, UI `:253`, renderer `:410-412`, SVG `:225-227` |
| STYLE-016 Dash/gap pattern | DONE | ten sam `dashArray` (alternating) |
| STYLE-017 Linear gradient | DONE | `LinearGradientFill` `:62-67`, renderer `:307-320`, SVG `:87-96`, import `:112-118`, UI `:258`, test `:29-38` |
| STYLE-018 Radial gradient | DONE | `:69-74`, renderer `:322-326`, SVG `:98-101`, UI `:259`, test `:34-35` |
| STYLE-019 Angular gradient | DONE | `AngularGradientFill` `:76-81`, renderer `:328-334` (conic fallback), SVG `:103-106`, UI `:260` |
| STYLE-020 Multi-stop + opacity | DONE | `LinearGradientStop` `:55-60`, UI `:246` |
| STYLE-021 Gradient editor + canvas handles | DONE | Stop editor `PropertiesPanel.tsx:246`, overlay `renderer/index.ts:1162`, drag preview/commit `CanvasViewport.tsx:117-152,818-826,1029-1037`. |
| STYLE-022 Pattern fill | DONE | `PatternFill` `:83-89`, renderer `:336-355`, SVG `:108-112`, import `:119-124`, UI `:261` |
| STYLE-023 Document palette | DONE | `ColorPalette` `:120-125`, factory `factory.ts:99`, UI `:245`, `ApplyPaletteColorCommand` `style-commands.ts:95-98` |
| STYLE-024 User palette | DONE | Scope/type `types.ts:134-140`, panel create/rename/duplicate/delete `PalettesPanel.tsx:18-91`, separate IndexedDB `palette-repository.ts:20-45`. |
| STYLE-025 Saved palettes | DONE | Imported palettes normalize to `saved` `palettes/import.ts:38-40`; library restore/save `palette-repository.ts:20-45`. |
| STYLE-026 Import palettes | DONE | Bounded JSON/SVG/GPL/ASE parser `packages/io/src/palettes/import.ts:4-191`, negative tests `palette-import.test.ts:24-40`. |
| STYLE-027 Color swatches | DONE | Palette colors render/apply in `PalettesPanel.tsx:75-77`. |
| STYLE-028 Gradient swatches | DONE | Serializable union/schema and apply path `types.ts:129-132`, `document-v1.ts:191-195`, `PalettesPanel.tsx:87-90`. |
| STYLE-029 Pattern swatches | DONE | Serializable union/schema and apply path `types.ts:129-132`, `document-v1.ts:191-195`, `PalettesPanel.tsx:87-90`. |
| STYLE-030 Global colors | DONE | `UpdateGlobalColorCommand` `style-commands.ts:51-68` |
| STYLE-031 Global color propagation | DONE | `replaceStyleColors` `:5-15` (fill/stroke/stops/pattern) |
| STYLE-032 Object styles | DONE | CRUD commands `style-commands.ts:93-154`, library UI save/apply/update/duplicate/delete `ObjectStylesPanel.tsx:16-62`. |
| STYLE-033 Style appearance (fill/stroke/opacity/effects w stylu) | **MISSING** | brak appearance/stack; pojedynczy `ObjectStyle` tylko. Brak multi-effect. |
| STYLE-034 Eyedropper | DONE | State machine `editor-engine/src/tools/eyedropper-tool.ts:17-53`, host wiring/cancel `CanvasViewport.tsx:574-582,1010-1026,1164-1167`. |
| STYLE-035 Eyedropper color/style | DONE | `ApplyStyleCommand` kopiuje pełny styl `:481`, `style-commands.ts:44-49` |
| STYLE-036 Paint Bucket | DONE | Vector-only state machine with clamped tolerance `paint-bucket-tool.ts:12-50`; host applies fill through one command `CanvasViewport.tsx:1018-1022`. |
| STYLE-037 Object opacity | DONE | `:108`, UI `:255`, renderer `:388,434,502`, SVG `:152,178,189,214` |
| STYLE-038 Normal blend | DONE | `:112`, renderer `source-over` `:273`, UI `:256` |
| STYLE-039 Multiply | DONE | `:112`, renderer `:273`, SVG `blendAttr` `:219-221`, test `:10-17` |
| STYLE-040 Screen | DONE | ta sama ścieżka |
| STYLE-041 Overlay | DONE | ta sama ścieżka |

### 6.2. Domknięte luki

- **STYLE-011**: semantic alignment persisted and rendered with closed-path clipping; open paths remain centered by ADR-010.
- **STYLE-021**: linear, radial and angular handles use transient preview and one pointerup command.
- **STYLE-024/025/027/028/029/032**: panel and separate library persistence are implemented.
- **STYLE-026**: JSON, SVG, GPL and ASE import enforce size/count/structure limits.
- **STYLE-033**: appearance stack remains deferred to EPIC-13.
- **STYLE-034/036**: tools are engine state machines; pointercancel/Escape/lost capture do not mutate document.

### 6.3. Zakres pozostawiony EPIC-13

1. Implement `STYLE-033` appearance stack in EPIC-13 with separate ADR and command model.
2. Add visual baselines for gradient handles and palettes when visual regression infrastructure is enabled.
3. Keep Paint Bucket vector-only; raster flood-fill is explicitly excluded by ADR-010.
