import {
  CommandHistory,
  TransformObjectsCommand,
  createDefaultDocument,
  createTransform,
  defaultObjectStyle,
  defaultStroke,
  type DocumentModel,
  type PathObject,
  type RectangleObject,
  type SceneObject,
  type Transform2D,
} from '@vectoria/core';
import { Camera } from '@vectoria/editor-engine';
import {
  RenderMetrics,
  renderBackground,
  renderScene,
  resizeCanvas,
  type RenderMetricsSnapshot,
} from '@vectoria/renderer';
import { assessEvidence, summarizeTimingSamples, type EvidenceGate, type TimingDistribution } from './metrics.js';

export type ScenarioId = 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6';
export const SCENARIO_IDS: readonly ScenarioId[] = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
const WARMUP_FRAMES = 2;
const OBSERVED_FRAMES = 20;

export interface BrowserBenchmarkResult {
  readonly id: ScenarioId;
  readonly objectCount: number;
  readonly nodeCount: number;
  readonly expectedFrames: number;
  readonly metrics: RenderMetricsSnapshot;
  readonly frameDurations: TimingDistribution;
  readonly evidence: EvidenceGate;
  readonly canvas: {
    readonly cssWidth: number;
    readonly cssHeight: number;
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
    readonly dimensionsStable: boolean;
    readonly maxCanvasPixels: number;
  };
  readonly environment: {
    readonly userAgent: string;
    readonly hardwareConcurrency: number | null;
    readonly deviceMemoryGiB: number | null;
  };
  readonly assertions: {
    readonly panChanged: boolean;
    readonly zoomChanged: boolean;
    readonly historyEntries: number;
    readonly movedObjects: number;
    readonly undoRedoVerified: boolean;
  };
}

interface Fixture {
  doc: DocumentModel;
  readonly objectIds: readonly string[];
  readonly nodeCount: number;
}

function rectangles(doc: DocumentModel, count: number, columns: number, spacing: number): RectangleObject[] {
  return Array.from({ length: count }, (_, index) => ({
    type: 'rectangle',
    id: `bench-rect-${index}`,
    name: `Benchmark rectangle ${index}`,
    layerId: doc.activeLayerId,
    visible: true,
    locked: false,
    transform: createTransform({ x: 20 + (index % columns) * spacing, y: 20 + Math.floor(index / columns) * spacing }),
    style: defaultObjectStyle,
    width: Math.max(5, spacing - 8),
    height: Math.max(5, spacing - 8),
    cornerRadius: 0,
  }));
}

function paths(doc: DocumentModel): PathObject[] {
  return Array.from({ length: 1_000 }, (_, index) => {
    const x = 20 + (index % 40) * 36;
    const y = 20 + Math.floor(index / 40) * 36;
    return {
      type: 'path',
      id: `bench-path-${index}`,
      name: `Benchmark path ${index}`,
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x, y }),
      style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: { ...defaultStroke, width: 1 } },
      nodes: Array.from({ length: 100 }, (_, node) => ({
        point: { x: (node % 10) * 2, y: Math.floor(node / 10) * 2 },
        inHandle: null,
        outHandle: null,
        kind: 'corner' as const,
      })),
      closed: false,
    };
  });
}

function makeFixture(id: ScenarioId): Fixture {
  const huge = id === 'B4';
  const doc = createDefaultDocument({ width: huge ? 1_000_000 : 1920, height: huge ? 1_000_000 : 1080 });
  const objects: SceneObject[] = id === 'B1'
    ? rectangles(doc, 100, 10, 65)
    : id === 'B2'
      ? rectangles(doc, 10_000, 100, 35)
      : id === 'B3'
        ? paths(doc)
        : id === 'B6'
          ? rectangles(doc, 500, 25, 32)
          : [];
  const objectIds = objects.map((object) => object.id);
  const objectsById: Record<string, SceneObject> = {};
  for (const object of objects) objectsById[object.id] = object;
  // Bulk fixture setup is outside interactive editing. All B6 edits below use Commands.
  const next: DocumentModel = {
    ...doc,
    objects: objectsById,
    layers: {
      ...doc.layers,
      [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds },
    },
  };
  return {
    doc: next,
    objectIds,
    nodeCount: id === 'B3' ? 100_000 : 0,
  };
}

function updateArtboard(doc: DocumentModel, size: number): DocumentModel {
  const id = doc.activeArtboardId;
  const previous = doc.artboards[id]!;
  return {
    ...doc,
    artboards: {
      ...doc.artboards,
      [id]: {
        ...previous,
        width: size,
        height: size,
        frame: { x: previous.x, y: previous.y, width: size, height: size },
      },
    },
  };
}

const background = document.querySelector<HTMLCanvasElement>('#benchmark-background');
const scene = document.querySelector<HTMLCanvasElement>('#benchmark-scene');
const status = document.querySelector<HTMLElement>('#benchmark-status');
if (!background || !scene || !status) throw new Error('Benchmark canvas and status elements are required');
const backgroundCanvas = background;
const sceneCanvas = scene;
const statusElement = status;
const backgroundContext = backgroundCanvas.getContext('2d');
const sceneContext = sceneCanvas.getContext('2d');
if (!backgroundContext || !sceneContext) throw new Error('2D context unavailable');
const bg = backgroundContext;
const ctx = sceneContext;
resizeCanvas(backgroundCanvas);
resizeCanvas(sceneCanvas);

async function run(id: ScenarioId): Promise<BrowserBenchmarkResult> {
  if (!SCENARIO_IDS.includes(id)) throw new Error(`Unknown benchmark: ${id}`);
  statusElement.textContent = `Running ${id}`;
  const fixture = makeFixture(id);
  let doc = fixture.doc;
  const camera = new Camera();
  const metrics = new RenderMetrics();
  const frameDurations: number[] = [];
  const viewport = { x: sceneCanvas.clientWidth, y: sceneCanvas.clientHeight };
  const startingPan = camera.pan;
  const startingZoom = camera.zoom;
  const dpr = window.devicePixelRatio || 1;
  const expectedWidth = Math.floor(sceneCanvas.clientWidth * dpr);
  const expectedHeight = Math.floor(sceneCanvas.clientHeight * dpr);
  let dimensionsStable = true;
  let maxCanvasPixels = 0;
  let previewTransforms: Record<string, Transform2D> | undefined;
  let historyEntries = 0;
  let movedObjects = 0;
  let undoRedoVerified = false;

  const draw = () => {
    const artboard = doc.artboards[doc.activeArtboardId]!;
    renderBackground(bg, camera, artboard, backgroundCanvas.width, backgroundCanvas.height, { showGrid: false });
    renderScene(ctx, camera, doc, sceneCanvas.width, sceneCanvas.height, { previewTransforms, quality: 'interactive' });
    const canvases = [backgroundCanvas, sceneCanvas];
    for (const canvas of canvases) {
      dimensionsStable &&= canvas.width === expectedWidth && canvas.height === expectedHeight;
      maxCanvasPixels = Math.max(maxCanvasPixels, canvas.width * canvas.height);
    }
  };

  try {
    for (let frame = 0; frame < WARMUP_FRAMES + OBSERVED_FRAMES; frame += 1) {
      const sampled = frame >= WARMUP_FRAMES;
      if (id === 'B1' || id === 'B2' || id === 'B4') {
        camera.panBy({ x: 2, y: 1 });
        if (frame % 4 === 0) camera.zoomAtPoint(1.01, { x: viewport.x / 2, y: viewport.y / 2 });
      }
      if (id === 'B3') camera.panBy({ x: 1, y: 0 });
      if (id === 'B5') doc = updateArtboard(doc, frame % 2 === 0 ? 1_000_000 : 10_000_000);
      if (id === 'B1' || id === 'B6') {
        const ids = id === 'B1' ? fixture.objectIds.slice(0, 1) : fixture.objectIds;
        previewTransforms = Object.fromEntries(ids.map((objectId) => {
          const transform = doc.objects[objectId]!.transform;
          return [objectId, { ...transform, position: { x: transform.position.x + frame * 2, y: transform.position.y + frame } }];
        }));
      }
      if (id === 'B5') {
        resizeCanvas(backgroundCanvas);
        resizeCanvas(sceneCanvas);
      }
      await new Promise<void>((resolve, reject) => {
        const inputTime = performance.now();
        if (sampled) metrics.markInput(inputTime);
        requestAnimationFrame(() => {
          try {
            const renderStart = performance.now();
            draw();
            const completedAt = performance.now();
            if (sampled) {
              const duration = completedAt - renderStart;
              frameDurations.push(duration);
              metrics.recordFrame(duration, completedAt);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    if (id === 'B6') {
      // 500 transient previews, exactly one document transaction at pointer-up.
      const transforms = new Map<string, Transform2D>(fixture.objectIds.map((objectId) => {
        const current = doc.objects[objectId]!.transform;
        return [objectId, { ...current, position: { x: current.position.x + 40, y: current.position.y + 20 } }];
      }));
      const history = new CommandHistory();
      const initial = doc;
      const committed = history.execute(new TransformObjectsCommand(fixture.objectIds, transforms), doc);
      historyEntries = history.history.length;
      movedObjects = fixture.objectIds.filter((objectId) =>
        committed.objects[objectId]?.transform.position.x === initial.objects[objectId]!.transform.position.x + 40,
      ).length;
      const undone = history.undo(committed);
      const redone = undone ? history.redo(undone) : null;
      undoRedoVerified = undone !== null && redone !== null
        && fixture.objectIds.every((objectId) =>
          undone.objects[objectId]!.transform.position.x === initial.objects[objectId]!.transform.position.x
          && redone.objects[objectId]!.transform.position.x === committed.objects[objectId]!.transform.position.x);
      doc = committed;
    }

    const snapshot = metrics.snapshot();
    const distribution = summarizeTimingSamples(frameDurations);
    if (!distribution) throw new Error('No recorded frame durations');
    const evidence = assessEvidence(snapshot.renderCount, snapshot.inputSampleCount, snapshot.p95FrameTimeMs, snapshot.p95InputToRenderMs);
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const result: BrowserBenchmarkResult = {
      id,
      objectCount: fixture.objectIds.length,
      nodeCount: fixture.nodeCount,
      expectedFrames: OBSERVED_FRAMES,
      metrics: snapshot,
      frameDurations: distribution,
      evidence,
      canvas: {
        cssWidth: sceneCanvas.clientWidth,
        cssHeight: sceneCanvas.clientHeight,
        width: sceneCanvas.width,
        height: sceneCanvas.height,
        dpr,
        dimensionsStable,
        maxCanvasPixels,
      },
      environment: {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency || null,
        deviceMemoryGiB: typeof memory === 'number' ? memory : null,
      },
      assertions: {
        panChanged: camera.pan.x !== startingPan.x || camera.pan.y !== startingPan.y,
        zoomChanged: camera.zoom !== startingZoom,
        historyEntries,
        movedObjects,
        undoRedoVerified,
      },
    };
    statusElement.textContent = `Ready (last: ${id})`;
    return result;
  } catch (error) {
    statusElement.textContent = `Error in ${id}`;
    throw error;
  }
}

declare global {
  interface Window {
    vectoriaBenchmark?: {
      readonly scenarios: readonly ScenarioId[];
      readonly run: (id: ScenarioId) => Promise<BrowserBenchmarkResult>;
      readonly summarizeTimingSamples: typeof summarizeTimingSamples;
      readonly assessEvidence: typeof assessEvidence;
    };
  }
}
window.vectoriaBenchmark = {
  scenarios: SCENARIO_IDS,
  run,
  summarizeTimingSamples,
  assessEvidence,
};
statusElement.textContent = 'Ready';
