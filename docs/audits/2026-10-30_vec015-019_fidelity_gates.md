# VEC015–VEC019 — Import fidelity and performance quality gates

> Based on the synthetic VEC014 corpus. This is a stacked implementation: VEC014 must land before these changes can target the default branch.

## Scope, in order

| Task | Deliverable | What the gate proves | What it does not prove |
| --- | --- | --- | --- |
| VEC015 | Compatibility-case matrix built from observed imports | Each synthetic fixture/feature combination has an explicit outcome, code evidence and provenance | Vendor version compatibility or independently verified feature support |
| VEC016 | Real importer → SVG export → SVG importer regression for PDF/AI/EPS/CDR | Editable vector content survives a basic format-to-SVG round-trip without becoming empty | Pixel-perfect visual matching, color science, complex filters, external asset fidelity |
| VEC017 | Report-event fidelity summary with negative/unknown handling | Editable vs degraded import events are measurable, rejected cases stay visible | Percentage of all source document objects preserved |
| VEC018 | Repeatable import timing distributions with warm-up and p50/p95 | Small real synthetic imports complete and their observed timing distribution is valid | Cross-machine performance budget, peak memory or large-file throughput |
| VEC019 | Completed frame/input latency collection and p50/p95 budgets | Diagnostics measure rendered input batches rather than time since the last input; budget checks p95 latency | Browser/hardware-specific FPS guarantee without a browser benchmark |

## VEC016 regression found and fixed

The PDF vector/text round-trip exposed malformed SVG in four text export branches: `renderTextToSvg` (single-line, multi-line, text-on-path) and `renderTextFrameToSvg`. When letter-spacing was zero, the generated `fill` attribute was adjacent to the preceding attribute with no whitespace, violating XML syntax. The SVG exporter now emits the required separator. Dedicated XML parser and real PDF→SVG→SVG import regressions cover the failure.

Validation of the tested code SHA `174d6ca322756dc1ba6b5577a9502f76152d8731`: GitHub Actions [run 40973970760](https://github.com/krystiangaleczka-tech/Vectoria/actions/runs/40973970760) passed lint, typecheck, 619 tests (4 skipped), and production build. The temporary branch-specific workflow was removed after this run.

## Acceptance test commands

Run on Node 22, pnpm version from packageManager:

~~~sh
pnpm --filter @vectoria/io exec vitest run test/format-corpus.test.ts test/compatibility-matrix.test.ts test/format-corpus-roundtrip.test.ts test/fidelity-evidence.test.ts test/import-timings.test.ts
pnpm --filter @vectoria/renderer exec vitest run test/performance.test.ts test/render-loop.test.ts
pnpm lint
pnpm typecheck
pnpm test
pnpm build
~~~

A green run must be recorded against the exact tested commit, not inferred from the existence of tests. The repository's baseline CI has a known pnpm/action-setup version conflict (separate PR #28).

## Interpreting the data

- The matrix is case-level evidence from generated input. A row containing "clipping" **does not** mean clipping was faithfully supported. Such rows can be partial or unsupported.
- VEC017 ratios use **report events** as the denominator, not source objects. For a rejected empty report the ratio is unknown (null), not 100%.
- The VEC016 test is **structural regression**. A full screenshot/pixel-diff system with licensed reference renderings is still required before claiming visual fidelity.
- VEC018 timings depend on CPU, Node, warm-up and input size. No universal threshold is asserted in CI; record hardware and p50/p95 when benchmarking manually.
- VEC019 uses the existing frame (16.67 ms p95) and input (50 ms p95) budgets only when samples are actually observed. An empty sample series is not proof of product responsiveness.

## Remaining release blockers

1. Legally sourced, version-tagged vendor fixtures and externally reviewed expectations.
2. Browser pixel comparisons of imported pages against reference renders across browsers, zoom, fonts and color workflows.
3. Measured source-object editability (requires trusted source-object inventory), peak memory, large-file workloads and import cancellation.
4. Browser benchmark runner for B1–B6 with recorded p50/p95 and actual input instrumentation coverage.
5. Final full CI/staging execution and release review. Do not mark compatibility or performance as production-complete based on synthetic tests alone.
