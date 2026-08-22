import React, { useEffect, useState } from 'react';

export interface PerformanceHudProps { objectCount: number; visibleObjectCount: number; nodeCount: number; }

export const PerformanceHud: React.FC<PerformanceHudProps> = ({ objectCount, visibleObjectCount, nodeCount }) => {
  const [samples, setSamples] = useState<number[]>([]);
  useEffect(() => {
    let frame = 0; let previous = performance.now(); let lastReport = previous; const durations: number[] = [];
    const tick = (now: number) => {
      durations.push(now - previous); if (durations.length > 120) durations.shift(); previous = now;
      if (now - lastReport > 500) { setSamples([...durations]); lastReport = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  const average = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)]! : 0;
  return <aside className="performance-hud" aria-label="Performance HUD">
    <strong>DEV · Performance</strong><span>FPS {average ? Math.round(1000 / average) : '—'}</span><span>avg {average.toFixed(1)} ms · p95 {p95.toFixed(1)} ms</span><span>objects {visibleObjectCount}/{objectCount} · nodes {nodeCount}</span>
  </aside>;
};
