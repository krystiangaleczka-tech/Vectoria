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
