# Vectoria Performance Scenarios

Required scenarios from EPIC-00:

- B1: 100 basic objects with pan, zoom and single-object drag.
- B2: 10,000 basic objects with pan and zoom.
- B3: 1,000 paths with 100 nodes each.
- B4: 1,000,000 × 1,000,000 logical artboard.
- B5: extreme artboard resize without viewport-canvas growth.
- B6: 500-object drag with one command commit.

Renderer diagnostics expose `RenderMetrics.snapshot()` and
`evaluatePerformanceBudget()`. Record p95 frame time and input-to-render in a
browser benchmark runner before introducing spatial indexes or workers.


## VEC018–VEC019 measurement policy

- Import timings: use a separate warm-up, label fixture and input bytes, report sample count, p50, p95 and environment. The synthetic corpus is a small-input smoke set, not a substitute for production-size samples.
- Renderer: 'RenderMetrics.snapshot()' reports p50/p95 frame and completed input-to-render timings with a bounded 120-sample window. 'evaluatePerformanceBudget()' checks p95 values where latency samples exist.
- Run B1–B6 in a real browser with explicit DPR/zoom/hardware and recorded input instrumentation. Passing pure unit tests does not mean B1–B6 have passed.
- Do not apply hard timing assertions to shared CI runners without calibrated hardware-specific baselines.

## VEC020–VEC029: browser renderer harness

- Open `http://localhost:5173/benchmarks/` while `pnpm dev` is running, or use `pnpm --filter @vectoria/web exec playwright test e2e/vec020-029-browser-benchmarks.spec.ts --project=chromium`.
- The harness drives the real renderer, camera and drag command with deterministic, synthetic B1–B6 fixtures. It warms up 2 frames then records 20 completed RAF frames per scenario.
- Each Playwright B1–B6 test attaches structured JSON: frame p50/p95, input-to-render p50/p95, device metadata, logical object/node counts, viewport/backing canvas dimensions, and assertions.
- The evidence gate explicitly marks missing or undersampled runs as `insufficient`. It reports numeric budgets but **does not** treat them as hardware-independent CI requirements.
- This is a renderer microbenchmark, **not** an end-to-end measurement of the full editor's pointer-to-paint performance.

Details and limitations: `docs/audits/2026-11-06_vec020-029_browser_benchmarks.md`.
