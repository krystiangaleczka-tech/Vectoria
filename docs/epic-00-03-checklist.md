# EPIC-00–03 Implementation Checklist

Source: `IMPLEMENTATION_PLAN.md`, `BACKLOG.md`, `VECTORIA_ARCHITECTURE.md`.

## EPIC-00: Architecture and performance

- [ ] CORE-001–010: serializable document, artboard, object, layer, style, asset, schema, migration, logical coordinates, separated state. Assets and full state-store separation remain open.
- [x] PERF-001–007: camera, world/screen transforms, viewport-only canvas, rotated visible rect, culling and hit-test culling.
- [x] PERF-008: fit selection/drawing and 100% zoom.
- [ ] PERF-009–010: pinch-to-zoom and touch pan gestures.
- [x] PERF-011, PERF-015–017, PERF-019: RAF coalescing, transient drag state, single commit and autosave debounce.
- [ ] PERF-012–014, PERF-018, PERF-020: measured frame budget, p95/input metrics, preview throttling and multi-object recalculation limits.
- [x] PERF-021–025, PERF-029–030: background/grid/scene/overlay layers, DOM separation and low-detail rendering.
- [x] PERF-031, PERF-034–036: interactive/settling/final quality policy.
- [ ] PERF-026–028, PERF-032–033, PERF-037: cache invalidation, effect suppression/DPR policy and manual performance mode.
- [ ] PERF-038–046: benchmark-gated spatial index, candidate hit-test, node index, batch updates, screen-space tolerance.
- [ ] PERF-047–057: worker boundary, cancellation and progress for heavy operations after benchmark evidence.
- [x] PERF-058–060, PERF-065: safe huge-artboard metadata resize, viewport-only derived grid and finite extreme values.
- [ ] PERF-061–064: asynchronous/progressive derived work and resize status UI.
- [x] PERF-066–070, PERF-079–080: developer HUD metrics and geometry/SVG regression coverage.
- [ ] PERF-071–078, PERF-081: hit-test/cache metrics, executable large-document benchmarks and CI performance gate.

## EPIC-01: Document and workspace

- [x] DOC-001–008: New Document presets, custom dimensions, units and validation.
- [x] DOC-009–016: artboard commands, multi-artboard panel, rename, orientation, visibility, background and safe last-artboard deletion.
- [ ] DOC-017–020: camera-dependent rulers, guides, drag/move/lock/hide/delete and smart guides. Rendering exists; drag/keyboard guide workflow remains open.
- [x] DOC-021–022, DOC-028–029: grid/guide snap, tolerance controls and accessible snap indicator.
- [ ] DOC-023–027: node/edge/center/intersection/pixel snap sources in full tool workflow.

## EPIC-02: History and persistence

- [x] HIST-001–007, HIST-009: commands, undo/redo, grouped drag, history panel, jump, IndexedDB autosave and status.
- [x] HIST-008: last-known-good snapshot, crash marker, recovery restore/discard and corrupt-payload fallback.
- [x] HIST-010–012: named versions, bounded repository, list metadata, atomic restore with undo.
- [ ] HIST-013: deferred until authenticated backend/RLS exists.

## EPIC-03: Selection and transforms

- [ ] SEL-001–005, SEL-007, SEL-010–016, SEL-021–022, SEL-030–031: existing selection, marquee, node, transform, keyboard and visibility/lock workflows verified by regression tests.
- [x] SEL-006: deterministic overlap cycling with keyboard hint/status.
- [x] SEL-008: object lasso selection algebra with polygon containment.
- [x] SEL-009: node lasso state machine and screen-space pointer workflow.
- [x] SEL-004, SEL-032–033: group hierarchy and group/ungroup commands.
- [ ] SEL-034: double-click group entry and isolate-mode UI with Escape exit. Canvas entry exists, but dedicated E2E evidence remains.
- [x] SEL-017, SEL-018, SEL-019: skew command, flip command and persisted pivot transform state.
- [x] SEL-020: aspect-lock behavior including negative scale.
- [x] SEL-023–024, SEL-026: align/distribute to artboard/selection with empty/single-selection validation.
- [x] SEL-025: align to key object.
- [x] SEL-027–029: front/back and one-step z-order commands plus UI.
- [x] SEL-035–036: duplicate offset and duplicate shortcut.
- [ ] SEL-037–038: repeat transform UI/state and smart-distance overlay.

## Evidence required before marking complete

- [x] Baseline typecheck and unit test run recorded.
- [x] Unit tests for camera transforms, lasso/cycling, skew, z-order and align/distribute.
- [ ] Unit tests for full invariants, groups and aspect-lock edge cases.
- [ ] Integration test proving camera/interaction changes do not mutate document before commit.
- [x] Playwright workflows for document creation, artboard metadata, named version, grouping, selection and transforms.
- [ ] Playwright recovery-choice, lasso, isolate and align/z-order workflows.
- [ ] Visual/performance evidence for canvas, selection overlay and huge artboard.
