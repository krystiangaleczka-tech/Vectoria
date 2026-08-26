# ADR-010: Style library and stroke alignment

## Status

Accepted

## Context

EPIC-09 needs persistent palettes, reusable swatches, object styles and explicit
stroke alignment. Document palettes belong to the `.vct` document. User and
saved palettes belong to a separate local IndexedDB library so they can be
reused without changing the active document.

Canvas 2D and SVG do not expose a portable stroke-alignment property. Vectoria
therefore stores the semantic value and renders `center` natively. Closed
shapes use clipping for `inside` and `outside`; open paths retain centered
stroke semantics until outline expansion is requested.

## Decision

- `StrokeStyle.align` is `'center' | 'inside' | 'outside'`, defaulting to
  `'center'` for migrated schema-v1 data.
- `PaletteSwatch` is a discriminated union for solid, gradient and pattern
  values. Swatches are serializable and never contain executable data.
- `document` palettes persist in `DocumentModel` and native `.vct` snapshots.
- `user` and `saved` palettes persist in a separate local IndexedDB record.
- Imported palettes are normalized to `saved` scope before persistence.
- Object styles contain the current `ObjectStyle` fields only. Appearance stacks
  remain EPIC-13 scope.
- Eyedropper and Paint Bucket use vector-object semantics. Paint Bucket's
  tolerance compares the sampled solid fill color; it does not rasterize the
  viewport.

## Consequences

- Schema readers must apply `align: 'center'` when the field is absent.
- SVG export preserves alignment in a `data-vectoria-stroke-align` attribute;
  native viewers still receive centered geometry for open paths.
- User-library persistence failures never modify the active document.
- Full appearance ordering and live effects require a future ADR for EPIC-13.
