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

This dump covers MVP style slice. Radial/angular gradients, patterns, palettes, global colors, eyedropper, paint bucket and additional blend modes remain staged backlog items.

## Next Safe Step

Implement gradient editor and radial gradient contract in a separate command/test slice after confirming renderer and SVG semantics.
