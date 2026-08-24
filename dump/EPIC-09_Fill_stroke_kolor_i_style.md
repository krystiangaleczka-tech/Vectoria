# EPIC-09 Fill, stroke, kolor i style dump

## Metadata

- Task: EPIC-09
- Date: 2026-08-24
- Branch: master
- Scope: MVP slice of fill, stroke, color normalization and blend modes

## State Before

Core supported solid/none fill, linear gradients, basic stroke rendering and style commands. ColorControl exposed native color input only. Blend mode was absent from the document style contract and Canvas/SVG output.

## State After

Style colors use one shared parser and canonical HEX output. Style changes validate input and remain command-based with Undo/Redo. Properties exposes HEX editing, stroke cap/join/miter/dash controls, opacity and blend mode. Canvas and SVG render supported blend modes. Legacy persisted styles receive `normal` blend mode during migration.

## Implementation

- Added shared HEX/RGB/HSL/CMYK parser, normalization and gamut reporting.
- Added optional `BlendMode` to `ObjectStyle` with Normal, Multiply, Screen and Overlay.
- Added style validation and canonicalization in `SetObjectStyleCommand`.
- Added blend mode handling to Canvas renderer and SVG exporter.
- Added persisted schema default and migration fallback.
- Expanded Appearance controls and ColorControl validation feedback.
- Added core and shared unit coverage.

## Validation

- `pnpm typecheck`: passed
- `pnpm lint`: passed
- `pnpm test`: passed, 151 tests
- `pnpm test:e2e`: passed, 11 tests
- `pnpm build`: passed
- `git diff --check`: passed

## Changes Per File

| File | State before | Change after | Purpose |
|---|---|---|---|
| `packages/shared/src/color.ts` | No shared color parser | Added HEX/RGB/HSL/CMYK parsing, normalization and gamut reporting | Central color semantics |
| `packages/shared/src/index.ts` | Shared exports excluded color utilities | Exports color utilities | Makes parser available to domain/UI |
| `packages/core/src/model/types.ts` | ObjectStyle had no blend mode | Added BlendMode and optional ObjectStyle field | Serializable style contract |
| `packages/core/src/model/factory.ts` | Default style had no blend mode | Defaults blend mode to normal | New document invariant |
| `packages/core/src/model/invariants.ts` | Blend mode was not validated | Validates supported modes | Protects document integrity |
| `packages/core/src/commands/document-commands.ts` | Style patch accepted unnormalized colors | Normalizes solid, gradient stop and stroke colors; rejects invalid opacity/colors; labels blend changes | Command-based safe style mutation |
| `packages/io/src/schema/document-v1.ts` | Persisted style schema had no blend mode | Adds schema default and legacy migration fallback | Round-trip and recovery compatibility |
| `packages/io/src/svg/export.ts` | SVG ignored blend mode | Emits `mix-blend-mode` for non-normal modes | SVG render parity |
| `packages/renderer/src/index.ts` | Canvas always used source-over | Maps document blend mode to Canvas compositing | Canvas render parity |
| `packages/ui/src/primitives/ColorControl.tsx` | Native picker only | Added HEX input, parse errors and gamut warning | Accessible explicit color workflow |
| `apps/web/src/features/panels/PropertiesPanel.tsx` | Appearance exposed fill, stroke color/width and opacity | Added cap, join, miter, dash/gap and blend controls | Complete MVP Appearance section |
| `packages/shared/test/color.test.ts` | No color utility tests | Added parser, conversion and invalid-input tests | Regression coverage |
| `packages/core/test/epic-09-style.test.ts` | No dedicated EPIC-09 style tests | Added normalization, blend and undo/redo tests | Domain regression coverage |

## Limitations

This implementation now covers radial/angular gradients, pattern fills, document palette swatches, global-color propagation command, object-style commands, gradient stop editor, eyedropper and paint bucket. User palette file import, saved-palette management UI and advanced pattern asset sources remain staged subfeatures.

## Next Safe Step

Add dedicated user/saved palette management and import UX, then add visual regression fixtures for angular gradient fidelity across Canvas and SVG.

## Addendum

- Added radial, angular and pattern fill contracts with validation, persistence and SVG export/import support.
- Added Canvas radial/conic/pattern rendering with safe fallbacks for browsers without conic gradients.
- Added `ApplyStyleCommand`, `ApplySavedObjectStyleCommand`, `SaveObjectStyleCommand`, `UpsertPaletteCommand`, `UpdateGlobalColorCommand` and `ApplyPaletteColorCommand`.
- Added Eyedropper and Paint Bucket tools with keyboard shortcuts `I` and `G`.
- Added document palette swatches and editable gradient stops in Appearance.
- Final validation after addendum: typecheck, lint, 153 unit tests, 11 E2E tests and build passed.

## Final Changes Per File

- `apps/web/src/app/EditorApp.tsx`: added `I` and `G` shortcuts for style tools.
- `apps/web/src/app/editor.css`: added palette swatch and gradient editor tokens/layout.
- `apps/web/src/features/canvas/CanvasViewport.tsx`: applied eyedropper and paint bucket commands on canvas hits.
- `apps/web/src/features/panels/PropertiesPanel.tsx`: added palette swatches, gradient stop editor and advanced fill/stroke controls.
- `apps/web/src/features/toolbar/ToolRail.tsx`: added Eyedropper and Paint Bucket tools.
- `packages/core/src/commands/index.ts`: exported style command APIs.
- `packages/core/src/commands/style-commands.ts`: added style paste, palette, global-color and saved-style commands.
- `packages/core/src/model/factory.ts`: added default document palette and style collections.
- `packages/core/src/model/invariants.ts`: validated advanced gradients, patterns and blend modes.
- `packages/core/src/model/types.ts`: added radial/angular/pattern fills, palettes, saved styles and blend mode.
- `packages/core/test/epic-09-style.test.ts`: covered advanced fills, normalization and undo/redo.
- `packages/io/src/schema/document-v1.ts`: added schemas and migration defaults for advanced styles and palettes.
- `packages/io/src/svg/export.ts`: exported radial/angular/pattern definitions and blend modes.
- `packages/io/src/svg/import.ts`: imported radial gradients and patterns from SVG definitions.
- `packages/io/test/io.test.ts`: covered radial and pattern SVG export.
- `packages/renderer/src/index.ts`: rendered radial/conic/pattern fills and Canvas blend modes.
- `packages/ui/src/icons/VectoriaIcon.tsx`: added eyedropper and bucket icons.
