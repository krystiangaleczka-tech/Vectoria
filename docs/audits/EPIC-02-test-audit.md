# EPIC-02 Test Audit

Date: 2026-08-23

## Final Status

`HIST-001...007` and `HIST-009`: implemented, with coverage split between unit, browser E2E and manual QA claims.

`HIST-008`: partial. Reload after a completed local autosave is covered. Crash/closed-tab recovery, persistence failure, retry, corrupted snapshots and future schemas are not covered by the executed browser suite. Runtime history is not restored during bootstrap; this is not required by Issue #5 recovery contract.

`HIST-010...012`: deferred. No manual version API, version list, preview or restore implementation exists.

`HIST-013`: deferred. No `SyncProvider` contract or cloud sync state implementation exists.

## Evidence

### Unit and Integration

Command:

```text
pnpm test
```

Result in current checkout: `16 test files, 119/119 passed`.

Covered areas include command execute/undo/redo, history cursor and branch truncation, document envelope parsing, serialization and invariants. This aggregate result also includes tests from later epics and must not be presented as EPIC-02-only coverage.

### Browser E2E

Command:

```text
pnpm test:e2e
```

Result after adding cancellation regression coverage and fixing Pen Tool pointer capture: `9 tests, 9 passed` in Chromium.

Passing EPIC-02-relevant scenarios cover history navigation, command undo/redo controls, document persistence after reload and pointer cancellation without document/history mutation. Pen Tool and Direct Select workflows also pass.

The suite does not cover keyboard-only undo/redo, Escape and lost-capture cancellation for every drag type, autosave debounce/coalescing/stale-write behavior, persistence failure and retry, malformed/future snapshots, manual versions or sync contract states.

### Static Findings

- `apps/web/src/app/EditorApp.tsx` clears in-memory command history during bootstrap and does not persist history entries.
- `packages/io/src/storage/document-repository.ts` exposes only `save` and `load`; no version or sync methods exist.
- `packages/io/src/storage/document-store.ts` validates envelopes, migrations and invariants, then falls back to a new in-memory document on recovery error.
- `apps/web/src/features/canvas/CanvasViewport.tsx` now clears both node and handle previews on cancel or lost pointer capture.

## Reference

Issue #5: [EPIC-02 Historia i zapisywanie](https://github.com/krystiangaleczka-tech/Vectoria/issues/5)
