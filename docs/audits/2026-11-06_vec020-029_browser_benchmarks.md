# VEC020–VEC029 — Browser benchmark evidence (stacked on PR #37)

Date: 2026-11-06. Base: `task/vec-015-019-fidelity-gates` (PR #37). This change **does not merge** PR #36 or #37.

## Tasks completed in code

| ID | Concrete deliverable |
| --- | --- |
| VEC020 | Isolated Vite/Chromium benchmark route at `/benchmarks/`, no product UI or storage changes |
| VEC021 | B1: 100 rectangles, camera pan/zoom, one-object transient drag preview |
| VEC022 | B2: 10,000 rectangles, pan and zoom with the production 2D renderer |
| VEC023 | B3: 1,000 editable path objects, 100 nodes each (100,000 nodes) |
| VEC024 | B4: 1,000,000 × 1,000,000 logical artboard with viewport-sized backing canvases |
| VEC025 | B5: alternating extreme resize up to 10,000,000 logical units without canvas growth |
| VEC026 | B6: 500 transient drag previews, one `TransformObjectsCommand` at commit, verified Undo/Redo |
| VEC027 | Two warm-up frames excluded; 20 completed RAF samples, p50/p95 distribution and input-to-render latency |
| VEC028 | Per-run browser/device environment metadata and CSS/backing-canvas dimensions |
| VEC029 | Evidence gate refuses missing/invalid/insufficient samples; Playwright assertions and attached JSON diagnostics |

## What is measured and what is not

The browser harness uses the **real Canvas 2D renderer**, camera and command engine, driven by synthetic scenario fixtures. Measurements are from completed `requestAnimationFrame` batches. The latency clock starts when the synthetic interaction invalidates the frame, so it includes RAF scheduling delay plus actual renderer time. It does **not** measure UI pointer-event handler, React reconciliation, remote asset loading, or end-to-end user-perceived latency inside the full editor. Path fixtures use 100 straight-node path definitions, not 100 cubic Bézier segments.

All budgets recorded by the evidence gate are **observations**, not cross-machine CI pass/fail guarantees. Browser p95 frame times above 16.67 ms and input-to-render times at or above 50 ms appear in the report but do not fail arbitrary shared runners. The Playwright suite fails when sample coverage, scenario geometry, viewport-canvas containment or one-command Undo/Redo regress.

## How to run

```sh
pnpm install --frozen-lockfile
pnpm --filter @vectoria/web exec playwright install chromium
pnpm --filter @vectoria/web exec playwright test e2e/vec020-029-browser-benchmarks.spec.ts --project=chromium
```

Run on Node 22. Each B1–B6 test attaches `vectoria-Bn-browser-metrics.json` with environment data, percentile distribution and presence of evidence. Re-run on representative machines to establish calibrated baselines before making numeric p95 a merge blocker.

## Required future work

The browser harness is not a substitute for an integrated editor input/performance regression. Still outstanding: instrument actual pointer interactions in `CanvasViewport`, compare visual outputs to licensed references, measure peak memory and stress cross-browser, and fix the original CI pnpm setup conflict in its own PR (#28).
