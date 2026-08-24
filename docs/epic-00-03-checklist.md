# EPIC-00–03 Implementation Checklist

Source: `IMPLEMENTATION_PLAN.md`, `BACKLOG.md`, `VECTORIA_ARCHITECTURE.md`.

## EPIC-00: Architecture and performance

- [ ] CORE-001–010: serializable document, artboard, object, layer, style, asset, schema, migration, logical coordinates, separated state.
- [x] PERF-001–007: camera, world/screen transforms, viewport-only canvas, rotated visible rect, culling and hit-test culling.
- [ ] PERF-008–010: fit selection/drawing, pinch-to-zoom and touch pan gestures.
- [x] PERF-011, PERF-015–017, PERF-019: RAF coalescing, transient drag state, single commit and autosave debounce.
- [ ] PERF-012–014, PERF-018, PERF-020: measured frame budget, p95/input metrics, preview throttling and multi-object recalculation limits.
- [ ] PERF-021–030: background/grid/scene/overlay layers, DOM separation, cache policy, low-detail rendering.
- [ ] PERF-031–037: interactive/settling/final quality policy and manual performance mode.
- [ ] PERF-038–046: benchmark-gated spatial index, candidate hit-test, node index, batch updates, screen-space tolerance.
- [ ] PERF-047–057: worker boundary, cancellation and progress for heavy operations after benchmark evidence.
- [ ] PERF-058–065: safe huge-artboard metadata resize and non-blocking progressive derived work.
- [ ] PERF-066–081: HUD metrics, benchmark fixtures, geometry/SVG regression and CI performance gate.

## EPIC-01: Document and workspace

- [ ] DOC-001–008: New Document presets, custom dimensions, units and validation.
- [ ] DOC-009–016: artboard commands, multi-artboard panel, rename, orientation, visibility, background and safe last-artboard deletion.
- [ ] DOC-017–020: camera-dependent rulers, guides, drag/move/lock/hide/delete and smart guides.
- [ ] DOC-021–029: grid/guide/node/edge/center/intersection/pixel snap, tolerance controls and accessible snap indicator.

## EPIC-02: History and persistence

- [x] HIST-001–007, HIST-009: commands, undo/redo, grouped drag, history panel, jump, IndexedDB autosave and status.
- [ ] HIST-008: last-known-good snapshot, crash marker, recovery restore/discard and corrupt-payload fallback.
- [ ] HIST-010–012: named versions, bounded repository, list metadata, atomic restore with undo.
- [ ] HIST-013: deferred until authenticated backend/RLS exists.

## EPIC-03: Selection and transforms

- [ ] SEL-001–005, SEL-007, SEL-010–016, SEL-021–022, SEL-030–031: existing selection, marquee, node, transform, keyboard and visibility/lock workflows verified by regression tests.
- [ ] SEL-006: deterministic overlap cycling with keyboard hint/status.
- [x] SEL-008: object lasso selection algebra with polygon containment.
- [ ] SEL-009: node lasso state machine and screen-space pointer workflow.
- [ ] SEL-004, SEL-032–034: group hierarchy, group/ungroup commands and isolate mode.
- [x] SEL-017, SEL-018, SEL-019: skew command, flip command and persisted pivot transform state.
- [ ] SEL-020: aspect-lock behavior including negative scale.
- [ ] SEL-023–026: align/distribute to artboard, selection and key object with empty/single-selection validation.
- [ ] SEL-027–029: front/back and one-step z-order commands plus UI.
- [ ] SEL-035–038: duplicate offset, repeat transform and smart-distance overlay.

## Evidence required before marking complete

- [x] Baseline typecheck and unit test run recorded.
- [x] Unit tests for camera transforms, lasso/cycling, skew, z-order and align/distribute.
- [ ] Unit tests for full invariants, groups and aspect-lock edge cases.
- [ ] Integration test proving camera/interaction changes do not mutate document before commit.
- [ ] Playwright workflows for document creation, artboard workflow, recovery, selection and transforms.
- [ ] Visual/performance evidence for canvas, selection overlay and huge artboard.
