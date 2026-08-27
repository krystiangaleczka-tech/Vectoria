import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Vec2 } from '@vectoria/shared';
import { generateId } from '@vectoria/shared';
import type {
  DocumentModel,
  ObjectId,
  RectangleObject,
  EllipseObject,
  LineObject,
  PathObject,
  Command,
  SelectionState,
  GeometryPreview,
  BasicShapeTool,
  PolygonObject,
  StarObject,
  ArcObject,
  PieObject,
  RingObject,
  SpiralObject,
  CalloutObject,
  PolylineObject,
  SceneObject,
  TextObject,
  TextFrameObject,
} from '@vectoria/core';
import {
  CreateObjectsCommand,
  CreateFreehandPathCommand,
  TransformObjectsCommand,
  SetRectangleGeometryCommand,
  SetEllipseGeometryCommand,
  SetPathGeometryCommand,
  AddPathNodeCommand,
  RemovePathNodeCommand,
  DeleteObjectsCommand,
  createTransform,
  defaultObjectStyle,
  defaultStroke,
  defaultCornerRadii,
  getTransformMatrix,
  getInverseTransformMatrix,
  updatePathNodeHandle,
  createFreehandPath,
  smoothPolyline,
  evaluateCubic,
  getCubicSegment,
  KnifePathCommand,
  EraserPathCommand,
  ScissorsPathCommand,
  SetPathWidthCommand,
  type FreehandSample,
  erasePath,
  splitPathByPolyline,
  flattenPath,
  nearestPointOnPolyline,
  SetObjectStyleCommand,
  ApplyStyleCommand,
  computeArtisticTextLayout,
  computeTextFrameLayout,
  SetTextContentCommand,
} from '@vectoria/core';
 import { Camera, DragSession, SelectTool, DirectSelectTool, PenTool, PencilTool, BrushTool, SmoothTool, CornerTool, EraserTool, KnifeTool, ScissorsTool, WidthTool, SnapService, IsolationService, LassoSession, calculateObjectSnap, ShapeTool, PolylineTool, EyedropperTool, PaintBucketTool, TextTool, TextEditSession, type GridSettings, type SnapResult, type ObjectSnapResult, type StyleSampleTarget } from '@vectoria/editor-engine';
import { mat3TransformPoint, parseColor } from '@vectoria/shared';
import {
  RenderLoop,
  resizeCanvas,
  renderBackground,
  renderScene,
  renderOverlay,
  renderFreehandOverlay,
  RenderQualityPolicy,
} from '@vectoria/renderer';
import type { ActiveTool } from '../toolbar/ToolRail.js';
import type { FreehandSettings } from '../panels/ContextualControlBar.js';
import { PerformanceHud } from './PerformanceHud.js';
import { getObjectBounds, rectsIntersect } from '@vectoria/core';

export interface CanvasViewportProps {
  document: DocumentModel;
  activeTool: ActiveTool;
  selectedObjectId: ObjectId | null;
  selectedObjectIds?: readonly ObjectId[];
  selection?: SelectionState;
  camera: Camera;
  onExecuteCommand: (cmd: Command) => void;
  onSelectObject: (id: ObjectId | null) => void;
  onSelectObjects?: (ids: readonly ObjectId[], additive?: boolean) => void;
  onSelectSelection?: (selection: SelectionState) => void;
  onCursorMove: (worldPos: Vec2 | null) => void;
  onZoomChange: (zoomPercent: number) => void;
  showGrid?: boolean;
  snapToGrid?: boolean;
  gridSettings?: GridSettings;
  freehandSettings?: FreehandSettings;
  geometryPreview?: GeometryPreview | null;
  styleSampleTarget?: StyleSampleTarget;
  styleSampleTolerance?: number;
}

interface DragState {
   type: 'pan' | 'create-shape' | 'move-object' | 'move-node' | 'move-handle' | 'resize-object' | 'rotate-object' | 'gradient-handle' | 'style-sample' | 'marquee' | 'lasso' | 'node-lasso' | 'text-create' | 'text-select';
  shape?: BasicShapeTool;
  startScreen: Vec2;
  startWorld: Vec2;
  currentWorld: Vec2;
  pointerId: number;
  initialObjectTransform?: { position: Vec2 };
  objectIds?: readonly ObjectId[];
  initialTransforms?: Readonly<Record<string, import('@vectoria/core').Transform2D>>;
  initialSize?: { width: number; height: number };
  pivotWorld?: Vec2;
  initialTransform?: import('@vectoria/core').Transform2D;
  nodeIndex?: number;
  handleSide?: 'in' | 'out';
  initialNodes?: readonly import('@vectoria/core').PathNode[];
  lassoPoints?: Vec2[];
  gradientHandle?: 'start' | 'end' | 'center' | 'radius' | 'angle';
  initialStyle?: import('@vectoria/core').ObjectStyle;
  styleTool?: 'eyedropper' | 'bucket';
  textAnchor?: number;
}

function textCaretAt(object: TextObject | TextFrameObject, localPoint: Vec2): number {
  const layout = object.type === 'text' ? computeArtisticTextLayout(object) : computeTextFrameLayout(object);
  const line = layout.lines.reduce((best, candidate) => Math.abs(candidate.y - localPoint.y) < Math.abs(best.y - localPoint.y) ? candidate : best, layout.lines[0]!);
  for (const glyph of line.glyphs) {
    if (localPoint.x < glyph.x + glyph.width / 2) return glyph.codePointIndex;
  }
  const last = line.glyphs[line.glyphs.length - 1];
  return last ? last.codePointIndex + 1 : 0;
}

function gradientHandles(object: SceneObject): readonly { id: DragState['gradientHandle']; point: Vec2 }[] {
  if (object.style.fill.type !== 'linear-gradient' && object.style.fill.type !== 'radial-gradient' && object.style.fill.type !== 'angular-gradient') return [];
  const matrix = getTransformMatrix(object.transform);
  const toWorld = (point: Vec2): Vec2 => mat3TransformPoint(matrix, point);
  const fill = object.style.fill;
  if (fill.type === 'linear-gradient') return [{ id: 'start', point: toWorld(fill.start) }, { id: 'end', point: toWorld(fill.end) }];
  if (fill.type === 'radial-gradient') return [{ id: 'center', point: toWorld(fill.center) }, { id: 'radius', point: toWorld({ x: fill.center.x + fill.radius, y: fill.center.y }) }];
  return [{ id: 'center', point: toWorld(fill.center) }, { id: 'angle', point: toWorld({ x: fill.center.x + 24, y: fill.center.y }) }];
}

function gradientHandleAt(object: SceneObject, camera: Camera, screenPoint: Vec2): DragState['gradientHandle'] {
  for (const handle of gradientHandles(object)) {
    const screen = camera.worldToScreen(handle.point);
    if (Math.hypot(screen.x - screenPoint.x, screen.y - screenPoint.y) <= 12) return handle.id;
  }
  return undefined;
}

function sampledStyleColor(style: import('@vectoria/core').ObjectStyle, target: 'fill' | 'stroke'): string | null {
  if (target === 'stroke') return style.stroke?.color ?? null;
  return style.fill.type === 'solid' ? style.fill.color : null;
}

function colorDistancePercent(first: string, second: string): number {
  const a = parseColor(first)?.rgb;
  const b = parseColor(second)?.rgb;
  if (!a || !b) return 100;
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2) / Math.sqrt(3 * 255 ** 2) * 100;
}

function updateGradientFill(style: import('@vectoria/core').ObjectStyle, handle: NonNullable<DragState['gradientHandle']>, transform: import('@vectoria/core').Transform2D, worldPoint: Vec2): import('@vectoria/core').FillStyle | null {
  const fill = style.fill;
  if (fill.type !== 'linear-gradient' && fill.type !== 'radial-gradient' && fill.type !== 'angular-gradient') return null;
  const inverse = getInverseTransformMatrix(transform);
  if (!inverse) return null;
  const localPoint = mat3TransformPoint(inverse, worldPoint);
  if (fill.type === 'linear-gradient') {
    if (handle === 'start') return { ...fill, start: localPoint };
    if (handle === 'end') return { ...fill, end: localPoint };
  }
  if (fill.type === 'radial-gradient') {
    if (handle === 'center') return { ...fill, center: localPoint };
    if (handle === 'radius') return { ...fill, radius: Math.max(0.01, Math.hypot(localPoint.x - fill.center.x, localPoint.y - fill.center.y)) };
  }
  if (fill.type === 'angular-gradient') {
    if (handle === 'center') return { ...fill, center: localPoint };
    if (handle === 'angle') return { ...fill, angle: Math.atan2(localPoint.y - fill.center.y, localPoint.x - fill.center.x) };
  }
  return null;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  document: doc,
  activeTool,
  selectedObjectId,
  selectedObjectIds = selectedObjectId ? [selectedObjectId] : [],
  selection = { objectIds: [...selectedObjectIds], nodeIds: [], mode: 'object' },
  camera,
  onExecuteCommand,
  onSelectObject,
  onSelectObjects,
  onSelectSelection,
  onCursorMove,
  onZoomChange,
  showGrid = true,
  snapToGrid = false,
  gridSettings = { visible: true, size: 10, subdivisions: 1 },
  freehandSettings = { smoothing: 20, accuracy: 75, width: 4, pressure: true, cap: 'round', join: 'round', eraserRadius: 12 },
  geometryPreview = null,
  styleSampleTarget = 'style',
  styleSampleTolerance = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const renderLoopRef = useRef<RenderLoop | null>(null);
  const qualityPolicyRef = useRef<RenderQualityPolicy | null>(null);
  if (!qualityPolicyRef.current) qualityPolicyRef.current = new RenderQualityPolicy({ onChange: () => renderLoopRef.current?.invalidate() });
  const renderAllRef = useRef<() => void>(() => undefined);
  const dragStateRef = useRef<DragState | null>(null);
  const snapServiceRef = useRef(new SnapService());
  const snapResultRef = useRef<SnapResult | null>(null);
  const isolationRef = useRef(new IsolationService());
  const [isolationVersion, setIsolationVersion] = React.useState(0);
  const lastGroupPickRef = useRef<{ id: ObjectId; timestamp: number } | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [dragPreview, setDragPreview] = React.useState<Record<string, import('@vectoria/core').Transform2D>>({});
  const [stylePreview, setStylePreview] = React.useState<Record<string, import('@vectoria/core').ObjectStyle>>({});
  const [pathPreview, setPathPreview] = React.useState<Record<string, readonly import('@vectoria/core').PathNode[]>>({});
  const [cornerPreview, setCornerPreview] = React.useState<import('@vectoria/core').GeometryPreview | null>(null);
  const penToolRef = useRef<PenTool | null>(null);
  if (!penToolRef.current) penToolRef.current = new PenTool();
  const [penVersion, setPenVersion] = React.useState(0);
  // Engine-owned state machine for the active drag-created shape; null when no
  // drag tool is engaged. Replaced on every pointerDown.
  const shapeToolRef = useRef<ShapeTool | null>(null);
  const polylineToolRef = useRef<PolylineTool | null>(null);
  if (!polylineToolRef.current) polylineToolRef.current = new PolylineTool();
  const [polylineVersion, setPolylineVersion] = useState(0);
  // Committed node currently hovered with the Pen; enables in-Pen deletion.
  const penHoverNodeRef = useRef<{ objectId: ObjectId; nodeIndex: number } | null>(null);
  const pencilToolRef = useRef<PencilTool | null>(null);
  const brushToolRef = useRef<BrushTool | null>(null);
  const eraserToolRef = useRef<EraserTool | null>(null);
  const knifeToolRef = useRef<KnifeTool | null>(null);
  const scissorsToolRef = useRef<ScissorsTool | null>(null);
  const widthToolRef = useRef<WidthTool | null>(null);
  const smoothToolRef = useRef<SmoothTool | null>(null);
  const cornerToolRef = useRef<CornerTool | null>(null);
  const eyedropperToolRef = useRef<EyedropperTool | null>(null);
  const paintBucketToolRef = useRef<PaintBucketTool | null>(null);
  if (!pencilToolRef.current) pencilToolRef.current = new PencilTool();
  if (!brushToolRef.current) brushToolRef.current = new BrushTool();
  if (!eraserToolRef.current) eraserToolRef.current = new EraserTool();
  if (!knifeToolRef.current) knifeToolRef.current = new KnifeTool();
  if (!scissorsToolRef.current) scissorsToolRef.current = new ScissorsTool();
  if (!widthToolRef.current) widthToolRef.current = new WidthTool();
  if (!smoothToolRef.current) smoothToolRef.current = new SmoothTool();
  if (!eyedropperToolRef.current) eyedropperToolRef.current = new EyedropperTool();
  if (!paintBucketToolRef.current) paintBucketToolRef.current = new PaintBucketTool();
  const textToolRef = useRef<TextTool | null>(null);
  if (!textToolRef.current) textToolRef.current = new TextTool();
  const textEditSessionRef = useRef<TextEditSession | null>(null);
  const [textEditVersion, setTextEditVersion] = useState(0);
  const freehandOperationRef = useRef<'pencil' | 'brush' | 'smooth' | 'eraser' | 'knife' | 'scissors' | 'width' | null>(null);
  const widthStartScreenRef = useRef<Vec2 | null>(null);
  const smoothStartScreenRef = useRef<Vec2 | null>(null);
  const cornerStartScreenRef = useRef<Vec2 | null>(null);
  const lassoSessionRef = useRef<LassoSession | null>(null);
  const freehandCursorRef = useRef<Vec2 | null>(null);
  const lastClickRef = useRef<{ point: Vec2; time: number } | null>(null);
  const hoveredObjectIdRef = useRef<string | null>(null);
  const altKeyRef = useRef<boolean>(false);
  const objectSnapRef = useRef<ObjectSnapResult | null>(null);
  const [freehandVersion, setFreehandVersion] = React.useState(0);

  // Selected IDs as Set for renderer
  const selectedIds = React.useMemo(() => new Set(selectedObjectIds), [selectedObjectIds]);
  const selectTool = React.useMemo(() => new SelectTool(), []);
  const directSelect = React.useMemo(() => new DirectSelectTool(), []);

  // Render function called by RenderLoop
  const renderAll = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    const sceneCanvas = sceneCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!bgCanvas || !sceneCanvas || !overlayCanvas) return;

    const bgCtx = bgCanvas.getContext('2d');
    const sceneCtx = sceneCanvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    if (!bgCtx || !sceneCtx || !overlayCtx) return;

    const activeArtboard = doc.artboards[doc.activeArtboardId];
    if (activeArtboard) {
      renderBackground(bgCtx, camera, activeArtboard, bgCanvas.width, bgCanvas.height, { showGrid, grid: gridSettings, guides: doc.guides });
    }

    renderScene(sceneCtx, camera, doc, sceneCanvas.width, sceneCanvas.height, {
      previewTransforms: dragPreview,
      previewStyles: stylePreview,
      previewTexts: textEditSessionRef.current ? { [textEditSessionRef.current.targetObjectId]: textEditSessionRef.current.text } : undefined,
      quality: qualityPolicyRef.current?.quality,
    });
    renderOverlay(overlayCtx, camera, doc, selectedIds, overlayCanvas.width, overlayCanvas.height, {
      previewTransforms: dragPreview
        ? new Map(Object.entries(dragPreview) as [string, import('@vectoria/core').Transform2D][])
        : undefined,
      nodeSelectionIds: selection.nodeIds,
      pathPreviews: new Map(Object.entries(pathPreview) as [ObjectId, readonly import('@vectoria/core').PathNode[]][]),
      geometryPreview: geometryPreview ?? cornerPreview ?? undefined,
      gradientHandles: selectedObjectIds.length === 1
        ? (() => { const object = doc.objects[selectedObjectIds[0]!]; const fill = stylePreview[object?.id ?? '']?.fill ?? object?.style.fill; return object && fill && (fill.type === 'linear-gradient' || fill.type === 'radial-gradient' || fill.type === 'angular-gradient') ? [{ objectId: object.id, fill, transform: object.transform }] : []; })()
        : [],
      marquee: dragStateRef.current?.type === 'marquee' ? {
        start: dragStateRef.current.startWorld,
        end: dragStateRef.current.currentWorld,
      } : undefined,
      lasso: lassoSessionRef.current ? lassoSessionRef.current.polygon : undefined,
      snap: snapResultRef.current?.snapped ? snapResultRef.current : undefined,
      objectSnap: objectSnapRef.current ?? undefined,
      smartDistance: (() => {
        const drag = dragStateRef.current;
        if (drag?.type === 'move-object') {
          return { point: drag.currentWorld, dx: (objectSnapRef.current?.dx ?? 0) + drag.currentWorld.x - drag.startWorld.x, dy: (objectSnapRef.current?.dy ?? 0) + drag.currentWorld.y - drag.startWorld.y };
        }
        if (!drag && altKeyRef.current && selectedIds.size > 0 && hoveredObjectIdRef.current && !selectedIds.has(hoveredObjectIdRef.current)) {
          const hoveredObj = doc.objects[hoveredObjectIdRef.current];
          const selectedId = [...selectedIds][0];
          const selectedObj = selectedId ? doc.objects[selectedId] : undefined;
          if (hoveredObj && selectedObj) {
             const selectionBounds = getObjectBounds(selectedObj, doc);
             const hoverBounds = getObjectBounds(hoveredObj, doc);
             return { point: freehandCursorRef.current ?? { x: 0, y: 0 }, dx: 0, dy: 0, hover: { selectionBounds, hoverBounds } };
          }
        }
        return undefined;
      })(),
    });

    // Draw active creation drag preview on overlay.
    const drag = dragStateRef.current;
    if (drag && drag.type === 'create-shape') {
      const dpr = window.devicePixelRatio || 1;
      overlayCtx.save();
      overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      overlayCtx.translate(camera.pan.x, camera.pan.y);
      overlayCtx.scale(camera.zoom, camera.zoom);

      const geometry = shapeToolRef.current?.preview ?? null;
      if (geometry) {
        overlayCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
        overlayCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-selection-fill').trim();
        overlayCtx.lineWidth = 1 / camera.zoom;
        if (geometry.type === 'line') {
          overlayCtx.beginPath();
          overlayCtx.moveTo(geometry.start.x, geometry.start.y);
          overlayCtx.lineTo(geometry.end.x, geometry.end.y);
          overlayCtx.stroke();
        } else {
          overlayCtx.fillRect(geometry.x, geometry.y, geometry.width, geometry.height);
          overlayCtx.strokeRect(geometry.x, geometry.y, geometry.width, geometry.height);
        }
      }

      overlayCtx.restore();
    }
    // Polyline draft preview: committed points plus rubber-band segment.
    if (activeTool === 'polyline' && polylineToolRef.current) {
      const draft = polylineToolRef.current.preview.points;
      if (draft.length > 0) {
        const dpr = window.devicePixelRatio || 1;
        overlayCtx.save();
        overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        overlayCtx.translate(camera.pan.x, camera.pan.y);
        overlayCtx.scale(camera.zoom, camera.zoom);
        overlayCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
        overlayCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-node').trim();
        overlayCtx.lineWidth = 1.5 / camera.zoom;
        overlayCtx.beginPath();
        draft.forEach((point, index) => {
          if (index === 0) overlayCtx.moveTo(point.x, point.y);
          else overlayCtx.lineTo(point.x, point.y);
        });
        overlayCtx.stroke();
        for (const point of draft) {
          overlayCtx.beginPath();
          overlayCtx.arc(point.x, point.y, 3 / camera.zoom, 0, Math.PI * 2);
          overlayCtx.fill();
        }
        overlayCtx.restore();
      }
    }
    // Pen rubber-band preview stays on overlay and never mutates DocumentModel.
    const pen = penToolRef.current?.preview;
    if (activeTool === 'pen' && pen && (pen.nodes.length > 0 || pen.pendingPoint || pen.cursorPoint)) {
      const dpr = window.devicePixelRatio || 1;
      overlayCtx.save();
      overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      overlayCtx.translate(camera.pan.x, camera.pan.y);
      overlayCtx.scale(camera.zoom, camera.zoom);
      overlayCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
      overlayCtx.lineWidth = 1.5 / camera.zoom;
      overlayCtx.beginPath();
      pen.nodes.forEach((node, index) => {
        if (index === 0) {
          overlayCtx.moveTo(node.point.x, node.point.y);
          return;
        }
        const previous = pen.nodes[index - 1]!;
        overlayCtx.bezierCurveTo(previous.outHandle?.x ?? previous.point.x, previous.outHandle?.y ?? previous.point.y, node.inHandle?.x ?? node.point.x, node.inHandle?.y ?? node.point.y, node.point.x, node.point.y);
      });
      const rubberBandPoint = pen.cursorPoint ?? pen.pendingPoint;
      const previous = pen.nodes.at(-1);
      if (rubberBandPoint && previous) {
        const endpoint = pen.pendingPoint ?? rubberBandPoint;
        overlayCtx.bezierCurveTo(
          previous.outHandle?.x ?? previous.point.x,
          previous.outHandle?.y ?? previous.point.y,
          pen.pendingPoint ? (pen.pendingInHandle?.x ?? endpoint.x) : endpoint.x,
          pen.pendingPoint ? (pen.pendingInHandle?.y ?? endpoint.y) : endpoint.y,
          endpoint.x,
          endpoint.y,
        );
      }
      overlayCtx.stroke();
      for (const node of pen.nodes) {
        overlayCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-node').trim();
        overlayCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-node-selected').trim();
        overlayCtx.lineWidth = 1 / camera.zoom;
        overlayCtx.fillRect(node.point.x - 3.5 / camera.zoom, node.point.y - 3.5 / camera.zoom, 7 / camera.zoom, 7 / camera.zoom);
        overlayCtx.strokeRect(node.point.x - 3.5 / camera.zoom, node.point.y - 3.5 / camera.zoom, 7 / camera.zoom, 7 / camera.zoom);
        for (const handle of [node.inHandle, node.outHandle].filter((value): value is Vec2 => Boolean(value))) {
          overlayCtx.globalAlpha = 0.7;
          overlayCtx.beginPath();
          overlayCtx.moveTo(node.point.x, node.point.y);
          overlayCtx.lineTo(handle.x, handle.y);
          overlayCtx.stroke();
          overlayCtx.globalAlpha = 1;
          overlayCtx.beginPath();
          overlayCtx.arc(handle.x, handle.y, 3 / camera.zoom, 0, Math.PI * 2);
          overlayCtx.fill();
          overlayCtx.stroke();
        }
      }
      if (pen.pendingPoint && pen.pendingHandle) {
        overlayCtx.globalAlpha = 0.7;
        overlayCtx.beginPath();
        overlayCtx.moveTo(pen.pendingPoint.x, pen.pendingPoint.y);
        overlayCtx.lineTo(pen.pendingHandle.x, pen.pendingHandle.y);
        overlayCtx.stroke();
        overlayCtx.globalAlpha = 1;
        overlayCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-node').trim();
        overlayCtx.beginPath();
        overlayCtx.arc(pen.pendingHandle.x, pen.pendingHandle.y, 3 / camera.zoom, 0, Math.PI * 2);
        overlayCtx.fill();
        overlayCtx.stroke();
      }
      overlayCtx.restore();
    }
    const freehandTool = freehandOperationRef.current;
    const rawSamples = activeTool === 'pencil' ? pencilToolRef.current?.preview : activeTool === 'brush' ? brushToolRef.current?.preview : undefined;
    // Live smoothed curve: the overlay shows the committed smoothing setting
    // applied on every frame, not the raw sample chain.
    const samplePoints = rawSamples
      ? (activeTool === 'pencil' || activeTool === 'brush' ? smoothPolyline(rawSamples.map((sample) => sample.point), freehandSettings.smoothing) : rawSamples.map((sample) => sample.point))
      : undefined;
    const samples = samplePoints?.length ? samplePoints : undefined;
    const eraserPreview = activeTool === 'eraser' && freehandCursorRef.current && eraserToolRef.current ? { point: freehandCursorRef.current, radiusPx: eraserToolRef.current.radiusPx } : undefined;
    const cutPreview = activeTool === 'knife' ? knifeToolRef.current?.preview.points : undefined;
    const widthPreview = activeTool === 'width' && selectedObjectId && doc.objects[selectedObjectId]?.type === 'path'
      ? widthToolRef.current?.preview.map((point) => ({ point: pointOnPath(doc.objects[selectedObjectId] as PathObject, point.t), width: point.width }))
      : undefined;
    if (freehandTool || samples?.length || eraserPreview || cutPreview?.length || widthPreview?.length) {
      renderFreehandOverlay(overlayCtx, camera, overlayCanvas.width, overlayCanvas.height, {
        points: samples,
        strokeWidth: activeTool === 'brush' ? freehandSettings.width : Math.max(1, freehandSettings.width / 2),
        cutLine: cutPreview,
        eraserCursor: eraserPreview,
        widthPoints: widthPreview,
      });
    }

    // Text frame drag creation preview
    if (activeTool === 'text' && dragStateRef.current?.type === 'text-create') {
      const dpr = window.devicePixelRatio || 1;
      const preview = textToolRef.current?.preview;
      if (preview && preview.isFrame) {
        overlayCtx.save();
        overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        overlayCtx.translate(camera.pan.x, camera.pan.y);
        overlayCtx.scale(camera.zoom, camera.zoom);
        overlayCtx.strokeStyle = '#5caeff';
        overlayCtx.lineWidth = 1 / camera.zoom;
        overlayCtx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
        overlayCtx.strokeRect(preview.x, preview.y, preview.width, preview.height);
        overlayCtx.restore();
      }
    }

    // Text editing session overlay (caret + selection highlight)
    const textSession = textEditSessionRef.current;
    if (textSession) {
      const obj = doc.objects[textSession.targetObjectId] as TextObject | TextFrameObject | undefined;
      if (obj) {
        const matrix = getTransformMatrix(obj.transform);
        const dpr = window.devicePixelRatio || 1;
        overlayCtx.save();
        overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        overlayCtx.translate(camera.pan.x, camera.pan.y);
        overlayCtx.scale(camera.zoom, camera.zoom);
        overlayCtx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

        const layout = obj.type === 'text' ? computeArtisticTextLayout(obj) : computeTextFrameLayout(obj);
        const sel = textSession.selection;
        const caretIndex = textSession.caret;

        // Selection highlight
        if (sel && sel[0] !== sel[1]) {
          const selStart = Math.min(sel[0], sel[1]);
          const selEnd = Math.max(sel[0], sel[1]);
          overlayCtx.fillStyle = 'rgba(92, 174, 255, 0.35)';

          for (const line of layout.lines) {
            for (const glyph of line.glyphs) {
              if (glyph.codePointIndex >= selStart && glyph.codePointIndex < selEnd) {
                overlayCtx.fillRect(glyph.x, line.y, glyph.width, line.height);
              }
            }
          }
        }

        // Caret (blinking based on timestamp)
        const blinkVisible = Math.floor(performance.now() / 500) % 2 === 0;
        if (blinkVisible) {
          let caretX = 0;
          let caretY = 0;
          let caretH = obj.fontSize * (obj.lineHeight || 1.2);

          let found = false;
          for (const line of layout.lines) {
            for (const glyph of line.glyphs) {
              if (glyph.codePointIndex === caretIndex) {
                caretX = glyph.x;
                caretY = line.y;
                caretH = line.height;
                found = true;
                break;
              }
            }
            if (found) break;
            if (line.glyphs.length > 0) {
              const lastGlyph = line.glyphs[line.glyphs.length - 1]!;
              if (caretIndex > lastGlyph.codePointIndex) {
                caretX = lastGlyph.x + lastGlyph.width;
                caretY = line.y;
                caretH = line.height;
              }
            }
          }

          overlayCtx.fillStyle = '#5caeff';
          overlayCtx.fillRect(caretX, caretY, 2 / camera.zoom, caretH);
        }

        overlayCtx.restore();
      }
    }

    void penVersion;
    void freehandVersion;
    void textEditVersion;
  }, [doc, camera, selectedIds, dragPreview, stylePreview, pathPreview, geometryPreview, cornerPreview, activeTool, penVersion, polylineVersion, freehandVersion, freehandSettings, showGrid, gridSettings, selection, selectedObjectId, selectedObjectIds, textEditVersion]);

  // Initialize render loop
  useEffect(() => {
    renderAllRef.current = renderAll;
  }, [renderAll]);

  useEffect(() => {
    const loop = new RenderLoop(() => renderAllRef.current());
    renderLoopRef.current = loop;
    loop.start();

    // Attach callback to camera
    const handleCameraChange = () => {
      loop.invalidate();
      onZoomChange(camera.zoomPercent);
    };
    camera.onChanged = handleCameraChange;

    return () => {
      loop.stop();
      qualityPolicyRef.current?.dispose();
      if (camera.onChanged === handleCameraChange) {
        camera.onChanged = null;
      }
    };
  }, [camera, onZoomChange]);

  // Invalidate on doc or selection changes
  useEffect(() => {
    renderLoopRef.current?.invalidate();
  }, [doc, selectedIds, dragPreview, stylePreview, pathPreview, selection, activeTool, penVersion]);

  // Canvas resize handler
  const handleResize = useCallback(() => {
    const bg = bgCanvasRef.current;
    const scene = sceneCanvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (!bg || !scene || !overlay) return;

    const changed = resizeCanvas(bg) || resizeCanvas(scene) || resizeCanvas(overlay);
    if (changed) {
      renderLoopRef.current?.invalidate();
    }
  }, []);

  useEffect(() => {
    handleResize();
    const observer = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Helper to get mouse coordinate in screen space (CSS pixels relative to canvas)
  const getPointerScreen = (e: React.PointerEvent): Vec2 => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: e.clientX, y: e.clientY };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const snapWorldPoint = (point: Vec2): Vec2 => {
    const result = snapServiceRef.current.snapPoint(point, { zoom: camera.zoom, settings: { ...doc.snap, enabled: snapToGrid }, grid: gridSettings, guides: doc.guides });
    snapResultRef.current = result;
    return result.worldPoint;
  };

  const commitTextEdit = useCallback(() => {
    const session = textEditSessionRef.current;
    if (!session) return;
    const object = doc.objects[session.targetObjectId];
    if (object && (object.type === 'text' || object.type === 'text-frame') && session.text !== object.text) {
      onExecuteCommand(new SetTextContentCommand(session.targetObjectId, session.text));
    }
    textEditSessionRef.current = null;
    setTextEditVersion((version) => version + 1);
  }, [doc, onExecuteCommand]);

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPos: Vec2 = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    qualityPolicyRef.current?.beginInteraction();
    camera.zoomAtPoint(factor, screenPos);
    qualityPolicyRef.current?.endInteraction();
    snapResultRef.current = null;
  };

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    qualityPolicyRef.current?.beginInteraction();
    const screenPos = getPointerScreen(e);
    const worldPos = snapWorldPoint(camera.screenToWorld(screenPos));

    // Pan via middle button or Space key
    if (e.button === 1 || isSpacePressed || activeTool === 'hand') {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStateRef.current = {
        type: 'pan',
        startScreen: screenPos,
        startWorld: worldPos,
        currentWorld: worldPos,
        pointerId: e.pointerId,
      };
      return;
    }

    if (e.button !== 0) return; // Left click only from here

    // Close active text edit session if clicking outside
    if (textEditSessionRef.current && activeTool !== 'text') {
      const activeSession = textEditSessionRef.current;
      const activeObject = doc.objects[activeSession.targetObjectId];
      const activeInverse = activeObject && (activeObject.type === 'text' || activeObject.type === 'text-frame') ? getInverseTransformMatrix(activeObject.transform) : null;
      const activeHit = selectTool.pick({ document: doc, selection, screenPoint: screenPos, worldPoint: worldPos, zoom: camera.zoom }).hit;
      if (activeObject && (activeObject.type === 'text' || activeObject.type === 'text-frame') && activeHit?.objectId === activeSession.targetObjectId && activeInverse) {
        const caret = textCaretAt(activeObject, mat3TransformPoint(activeInverse, worldPos));
        activeSession.setSelection(caret, caret);
        dragStateRef.current = { type: 'text-select', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId, objectIds: [activeSession.targetObjectId], textAnchor: caret };
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
        setTextEditVersion((version) => version + 1);
        return;
      }
      commitTextEdit();
    }

    if (activeTool === 'text') {
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      if (textEditSessionRef.current) {
        commitTextEdit();
      }
      textToolRef.current!.pointerDown(worldPos);
      dragStateRef.current = {
        type: 'text-create',
        startScreen: screenPos,
        startWorld: worldPos,
        currentWorld: worldPos,
        pointerId: e.pointerId,
      };
      renderLoopRef.current?.invalidate();
      return;
    }

    if (activeTool === 'zoom') {
      camera.zoomAtPoint(1.25, screenPos);
      return;
    }

    if (activeTool === 'lasso' || activeTool === 'node-lasso') {
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      dragStateRef.current = { type: activeTool, startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId };
      lassoSessionRef.current = new LassoSession(worldPos);
      return;
    }

    if (activeTool === 'eyedropper' || activeTool === 'bucket') {
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      const tool = activeTool === 'eyedropper' ? eyedropperToolRef.current! : paintBucketToolRef.current!;
      if (activeTool === 'eyedropper') tool.sampleTarget = styleSampleTarget;
      else {
        paintBucketToolRef.current!.sampleTarget = styleSampleTarget === 'stroke' ? 'stroke' : 'fill';
        paintBucketToolRef.current!.tolerance = styleSampleTolerance;
      }
      tool.pointerDown({ screenPoint: screenPos, worldPoint: worldPos });
      dragStateRef.current = { type: 'style-sample', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId, styleTool: activeTool };
      renderLoopRef.current?.invalidate();
      return;
    }

    if (activeTool === 'pencil' || activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'knife') {
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic or already-captured pointer */ }
      freehandOperationRef.current = activeTool;
      if (activeTool === 'pencil') pencilToolRef.current?.pointerDown({ screenPoint: screenPos, worldPoint: worldPos, pressure: freehandSettings.pressure ? e.pressure : 1, time: e.timeStamp });
      if (activeTool === 'brush') brushToolRef.current?.pointerDown({ screenPoint: screenPos, worldPoint: worldPos, pressure: freehandSettings.pressure ? e.pressure : 1, time: e.timeStamp });
      if (activeTool === 'eraser') { eraserToolRef.current!.radiusPx = freehandSettings.eraserRadius; eraserToolRef.current?.pointerDown(worldPos); }
      if (activeTool === 'knife') knifeToolRef.current?.pointerDown(worldPos);
      freehandCursorRef.current = worldPos;
      setFreehandVersion((version) => version + 1);
      return;
    }

    if (activeTool === 'scissors') {
      freehandOperationRef.current = 'scissors';
      freehandCursorRef.current = worldPos;
      setFreehandVersion((version) => version + 1);
      return;
    }

    if (activeTool === 'width') {
      const selectedPath = selectedObjectId ? doc.objects[selectedObjectId] : null;
      if (selectedPath?.type === 'path') {
        const nearest = selectNearestPathPoint(selectedPath, worldPos);
        if (nearest) {
          freehandOperationRef.current = 'width';
          widthStartScreenRef.current = screenPos;
          widthToolRef.current?.pointerDown(selectedPath, nearest.point, nearest.t);
          setFreehandVersion((version) => version + 1);
        }
      }
      return;
    }

    if (activeTool === 'smooth') {
      const selectedPath = selectedObjectId ? doc.objects[selectedObjectId] : null;
      if (selectedPath?.type === 'path') {
        freehandOperationRef.current = 'smooth';
        smoothStartScreenRef.current = screenPos;
        setPathPreview({ [selectedPath.id]: smoothToolRef.current!.previewPath(selectedPath, freehandSettings.smoothing).nodes });
        setFreehandVersion((version) => version + 1);
      }
      return;
    }

    if (activeTool === 'corner') {
      const selectedPath = selectedObjectId ? doc.objects[selectedObjectId] : null;
      if (selectedPath?.type === 'path') {
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
        cornerStartScreenRef.current = screenPos;
        setCornerPreview(cornerToolRef.current?.start(doc, selectedPath.id) ?? null);
      }
      return;
    }

    // Pen owns its draft state; pointer capture loss must not cancel completed nodes.
    if (activeTool !== 'pen') (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (activeTool === 'select' && selectedObjectId && selectedObjectIds.length === 1) {
      const selected = doc.objects[selectedObjectId];
      const handle = selected && !selected.locked ? gradientHandleAt(selected, camera, screenPos) : undefined;
      if (selected && handle) {
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
        dragStateRef.current = { type: 'gradient-handle', gradientHandle: handle, startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId, objectIds: [selected.id], initialStyle: selected.style };
        return;
      }
    }

    if (activeTool === 'pen') {
      // In-Pen editing: clicking an existing path segment inserts a node there
      // without leaving the Pen; the draft stays untouched.
      const segmentHit = findPathSegmentAt(doc, worldPos, camera.screenToWorldDistance(6));
      if (segmentHit) {
        onExecuteCommand(new AddPathNodeCommand(segmentHit.objectId, segmentHit.segmentIndex, segmentHit.t));
        onSelectObject(segmentHit.objectId);
        return;
      }
      const result = penToolRef.current!.pointerDown(
        { screenPoint: screenPos, worldPoint: worldPos, shiftKey: e.shiftKey, altKey: e.altKey },
        camera.screenToWorldDistance(12),
      );
      if (result?.type === 'commit') commitPen(result.nodes, result.closed);
      setPenVersion((version) => version + 1);
    } else if (isDragShapeTool(activeTool)) {
      const tool = new ShapeTool(activeTool);
      shapeToolRef.current = tool;
      tool.pointerDown({ screenPoint: screenPos, worldPoint: worldPos, shiftKey: e.shiftKey, altKey: e.altKey });
      dragStateRef.current = {
        type: 'create-shape',
        shape: activeTool,
        startScreen: screenPos,
        startWorld: worldPos,
        currentWorld: worldPos,
        pointerId: e.pointerId,
      };
    } else if (activeTool === 'polyline') {
      const result = polylineToolRef.current?.pointerDown({ screenPoint: screenPos, worldPoint: worldPos, shiftKey: e.shiftKey, altKey: e.altKey });
      if (result?.type === 'commit') commitPolyline(result.points);
      setPolylineVersion((version) => version + 1);
    } else if (activeTool === 'direct-select') {
      const handleHit = directSelect.hitHandle(doc, worldPos, camera.zoom, selectedObjectId ?? undefined);
      if (handleHit?.part?.endsWith('handle')) {
        const object = doc.objects[handleHit.objectId];
        const side = handleHit.part === 'in-handle' ? 'in' : 'out';
        if (object?.type === 'path') {
          onSelectSelection?.({ objectIds: [object.id], nodeIds: [`${object.id}:${handleHit.nodeIndex}`], mode: 'node' });
          dragStateRef.current = {
            type: 'move-handle', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos,
            pointerId: e.pointerId, objectIds: [object.id], nodeIndex: handleHit.nodeIndex, handleSide: side, initialNodes: object.nodes,
          };
        }
        return;
      }
      const nodeHit = directSelect.hitNode(doc, worldPos, camera.zoom);
      const nextSelection = directSelect.select(selection, nodeHit, e.shiftKey);
      onSelectSelection?.(nextSelection);
      if (nodeHit) {
        const object = doc.objects[nodeHit.objectId];
        if (object?.type === 'path') {
          dragStateRef.current = {
            type: 'move-node', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos,
            pointerId: e.pointerId, objectIds: [object.id], nodeIndex: nodeHit.nodeIndex, initialNodes: object.nodes,
          };
        }
      }
    } else if (activeTool === 'select') {
      const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
      const selectedSize = selected && (selected.type === 'rectangle' || selected.type === 'ellipse') ? { width: selected.width, height: selected.height } : null;
      if (selected && selectedSize) {
        const matrix = getTransformMatrix(selected.transform);
        const handle = camera.worldToScreen(mat3TransformPoint(matrix, { x: selectedSize.width, y: selectedSize.height }));
        const pivotWorld = mat3TransformPoint(matrix, { x: selectedSize.width / 2, y: selectedSize.height / 2 });
        const rotationHandle = camera.worldToScreen(mat3TransformPoint(matrix, { x: selectedSize.width / 2, y: -20 / camera.zoom }));
        if (!e.shiftKey && Math.hypot(screenPos.x - rotationHandle.x, screenPos.y - rotationHandle.y) <= 12) {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          dragStateRef.current = { type: 'rotate-object', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId, objectIds: [selected.id], initialTransforms: { [selected.id]: selected.transform }, initialTransform: selected.transform, pivotWorld };
          return;
        }
        if (Math.hypot(screenPos.x - handle.x, screenPos.y - handle.y) <= 12) {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          dragStateRef.current = { type: 'resize-object', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId, initialSize: selectedSize };
          return;
        }
      }

      const isRepeatedClick = lastClickRef.current && Math.hypot(lastClickRef.current.point.x - screenPos.x, lastClickRef.current.point.y - screenPos.y) < 5 && (e.timeStamp - lastClickRef.current.time) < 1000;
      lastClickRef.current = { point: screenPos, time: e.timeStamp };

      const pickContext = { document: doc, selection, screenPoint: screenPos, worldPoint: worldPos, zoom: camera.zoom, additive: e.shiftKey, allowedObjectIds: isolationRef.current.context ? new Set(isolationRef.current.context.objectIds) : undefined };
      const picked = (e.altKey || isRepeatedClick) ? selectTool.cycle(pickContext) : selectTool.pick(pickContext);
      const hit = picked.hit;

      const isDoublePick = hit && lastGroupPickRef.current?.id === hit.objectId && e.timeStamp - lastGroupPickRef.current.timestamp < 400;
      lastGroupPickRef.current = hit ? { id: hit.objectId, timestamp: e.timeStamp } : null;
      if (isDoublePick && hit) {
        const owningMask = Object.values(doc.maskGroups ?? {}).find((group) => group.maskId === hit.objectId);
        if (owningMask) {
          // Double-click on a mask shape enters mask isolation: content becomes
          // the editable scope, Escape leaves through the existing breadcrumb.
          isolationRef.current.enterMask(owningMask);
          setIsolationVersion((version) => version + 1);
          onSelectObjects?.(owningMask.contentIds);
          return;
        }
      }
      if (isDoublePick && hit && doc.objects[hit.objectId]?.type === 'group') {
        const group = doc.objects[hit.objectId];
        if (!group || group.type !== 'group') return;
        isolationRef.current.enterGroup(group.id, group.childIds, group.name);
        setIsolationVersion((version) => version + 1);
        onSelectObjects?.(group.childIds);
        return;
      }

      if (hit) {
        onSelectSelection?.(picked.selection);
        const dragIds = picked.selection.objectIds;
        const obj = doc.objects[hit.objectId];
        if (dragIds.length === 0) return;
        dragStateRef.current = {
          type: 'move-object',
          startScreen: screenPos,
          startWorld: worldPos,
          currentWorld: worldPos,
          pointerId: e.pointerId,
          objectIds: dragIds,
          initialTransforms: Object.fromEntries(dragIds.map((id) => [id, doc.objects[id]?.transform]).filter((entry): entry is [string, import('@vectoria/core').Transform2D] => Boolean(entry[1]))),
          initialObjectTransform: obj ? { position: { ...obj.transform.position } } : undefined,
        };
        const firstBounds = obj ? getObjectBounds(obj) : { x: worldPos.x, y: worldPos.y, width: 0, height: 0 };
        dragSessionRef.current = new DragSession({ objectIds: dragIds, initialTransforms: dragStateRef.current.initialTransforms ?? {}, initialBounds: firstBounds, pivotWorld: { x: firstBounds.x + firstBounds.width / 2, y: firstBounds.y + firstBounds.height / 2 }, operation: 'move' }, worldPos);
      } else {
        if (e.altKey) {
          dragStateRef.current = { type: 'lasso', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId };
          lassoSessionRef.current = new LassoSession(worldPos);
        } else {
          dragStateRef.current = { type: 'marquee', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId };
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const screenPos = getPointerScreen(e);
    const worldPos = snapWorldPoint(camera.screenToWorld(screenPos));
    onCursorMove(worldPos);

    const drag = dragStateRef.current;
    const freehandOperation = freehandOperationRef.current;
    
    const wasAltKey = altKeyRef.current;
    altKeyRef.current = e.altKey;
    if (!drag && e.altKey && activeTool === 'select' && selectedIds.size > 0) {
       const pickContext = { document: doc, selection, screenPoint: screenPos, worldPoint: worldPos, zoom: camera.zoom, additive: false, allowedObjectIds: isolationRef.current.context ? new Set(isolationRef.current.context.objectIds) : undefined };
       const hit = selectTool.pick(pickContext).hit;
       const newHovered = hit?.objectId ?? null;
       if (hoveredObjectIdRef.current !== newHovered) {
         hoveredObjectIdRef.current = newHovered;
         renderLoopRef.current?.invalidate();
       }
    } else if (hoveredObjectIdRef.current !== null || wasAltKey !== e.altKey) {
       hoveredObjectIdRef.current = null;
       renderLoopRef.current?.invalidate();
    }
    freehandCursorRef.current = worldPos;

    if (drag?.type === 'style-sample') {
      if (drag.styleTool === 'eyedropper') eyedropperToolRef.current?.pointerMove({ screenPoint: screenPos, worldPoint: worldPos });
      else paintBucketToolRef.current?.pointerMove({ screenPoint: screenPos, worldPoint: worldPos });
      drag.currentWorld = worldPos;
      renderLoopRef.current?.invalidate();
      return;
    }

    if (drag?.type === 'gradient-handle' && drag.objectIds?.[0] && drag.initialStyle && drag.gradientHandle) {
      const object = doc.objects[drag.objectIds[0]];
      if (object) {
        const fill = updateGradientFill(drag.initialStyle, drag.gradientHandle, object.transform, worldPos);
        if (fill) setStylePreview({ [object.id]: { ...drag.initialStyle, fill } });
      }
      drag.currentWorld = worldPos;
      renderLoopRef.current?.invalidate();
      return;
    }

    if (drag?.type === 'text-select' && drag.objectIds?.[0] && drag.textAnchor !== undefined) {
      const object = doc.objects[drag.objectIds[0]];
      if (object && (object.type === 'text' || object.type === 'text-frame')) {
        const inverse = getInverseTransformMatrix(object.transform);
        if (inverse) {
          const caret = textCaretAt(object, mat3TransformPoint(inverse, worldPos));
          textEditSessionRef.current?.setSelection(drag.textAnchor, caret);
          setTextEditVersion((version) => version + 1);
        }
      }
      return;
    }

    if (freehandOperation && !drag) {
      if (freehandOperation === 'pencil') pencilToolRef.current?.pointerMove({ screenPoint: screenPos, worldPoint: worldPos, pressure: freehandSettings.pressure ? e.pressure : 1, time: e.timeStamp }, camera.screenToWorldDistance(2));
      if (freehandOperation === 'brush') brushToolRef.current?.pointerMove({ screenPoint: screenPos, worldPoint: worldPos, pressure: freehandSettings.pressure ? e.pressure : 1, time: e.timeStamp }, camera.screenToWorldDistance(2));
      if (freehandOperation === 'eraser') eraserToolRef.current?.pointerMove(worldPos);
      if (freehandOperation === 'knife') knifeToolRef.current?.pointerMove(worldPos);
      if (freehandOperation === 'width' && widthStartScreenRef.current) widthToolRef.current?.pointerMove(screenPos.x - widthStartScreenRef.current.x, camera.zoom);
      if (freehandOperation === 'smooth' && smoothStartScreenRef.current && selectedObjectId) {
        const object = doc.objects[selectedObjectId];
        if (object?.type === 'path') {
          const amount = Math.min(100, Math.max(0, freehandSettings.smoothing + (screenPos.x - smoothStartScreenRef.current.x) / 2));
          setPathPreview({ [object.id]: smoothToolRef.current!.previewPath(object, amount).nodes });
        }
      }
      setFreehandVersion((version) => version + 1);
      return;
    }
    if (!drag) {
      if (activeTool === 'pen') {
        penToolRef.current?.pointerMove({ screenPoint: screenPos, worldPoint: worldPos, shiftKey: e.shiftKey, altKey: e.altKey });
        penHoverNodeRef.current = directSelect.hitNode(doc, worldPos, camera.zoom);
        setPenVersion((version) => version + 1);
      }
      if (activeTool === 'corner' && cornerStartScreenRef.current) {
        const radius = Math.hypot(screenPos.x - cornerStartScreenRef.current.x, screenPos.y - cornerStartScreenRef.current.y) / camera.zoom;
        setCornerPreview(cornerToolRef.current?.update(radius) ?? null);
      }
      return;
    }

    if (drag.type === 'pan') {
      const deltaScreen = {
        x: screenPos.x - drag.startScreen.x,
        y: screenPos.y - drag.startScreen.y,
      };
      camera.panBy(deltaScreen);
      drag.startScreen = screenPos;
    } else if (drag.type === 'marquee' || drag.type === 'lasso' || drag.type === 'node-lasso') {
      drag.currentWorld = worldPos;
      if ((drag.type === 'lasso' || drag.type === 'node-lasso') && lassoSessionRef.current) {
        lassoSessionRef.current.update(worldPos);
        setFreehandVersion((v) => v + 1);
      }
      renderLoopRef.current?.invalidate();
    } else if (drag.type === 'create-shape') {
      drag.currentWorld = worldPos;
      shapeToolRef.current?.pointerMove({ screenPoint: screenPos, worldPoint: worldPos, shiftKey: e.shiftKey, altKey: e.altKey });
       renderLoopRef.current?.invalidate();
    } else if (drag.type === 'text-create') {
      drag.currentWorld = worldPos;
      textToolRef.current?.pointerMove(worldPos);
      renderLoopRef.current?.invalidate();
    } else if ((drag.type === 'move-node' || drag.type === 'move-handle') && drag.objectIds?.[0] && drag.initialNodes) {
      const objectId = drag.objectIds[0];
      const object = doc.objects[objectId];
      const inverse = object?.type === 'path' ? getInverseTransformMatrix(object.transform) : null;
      const localPoint = inverse ? mat3TransformPoint(inverse, worldPos) : worldPos;
      const localStart = inverse ? mat3TransformPoint(inverse, drag.startWorld) : drag.startWorld;
      const delta = { x: localPoint.x - localStart.x, y: localPoint.y - localStart.y };
      const nodes = drag.initialNodes.map((node, index) => {
        if (index !== drag.nodeIndex) return node;
        if (drag.type === 'move-handle' && drag.handleSide) return updatePathNodeHandle(node, drag.handleSide, localPoint);
        return {
          ...node,
          point: { x: node.point.x + delta.x, y: node.point.y + delta.y },
          inHandle: node.inHandle ? { x: node.inHandle.x + delta.x, y: node.inHandle.y + delta.y } : null,
          outHandle: node.outHandle ? { x: node.outHandle.x + delta.x, y: node.outHandle.y + delta.y } : null,
        };
      });
      setPathPreview({ [objectId]: nodes });
    } else if (drag.type === 'move-object') {
      drag.currentWorld = worldPos;
      dragSessionRef.current?.update(worldPos);
      if (drag.objectIds && drag.initialTransforms) {
        let deltaWorld = dragSessionRef.current?.delta ?? { x: worldPos.x - drag.startWorld.x, y: worldPos.y - drag.startWorld.y };
        
        // Smart object snap
        if (dragSessionRef.current) {
          const dragRect = { x: dragSessionRef.current.transform.initialBounds.x + deltaWorld.x, y: dragSessionRef.current.transform.initialBounds.y + deltaWorld.y, width: dragSessionRef.current.transform.initialBounds.width, height: dragSessionRef.current.transform.initialBounds.height };
          const snap = calculateObjectSnap(dragRect, doc, new Set(drag.objectIds), doc.snap.tolerancePx, camera.zoom);
          if (snap.snappedX || snap.snappedY) {
            objectSnapRef.current = snap;
            deltaWorld = { x: deltaWorld.x + snap.dx, y: deltaWorld.y + snap.dy };
          } else {
            objectSnapRef.current = null;
          }
        } else {
          objectSnapRef.current = null;
        }

        const preview: Record<string, import('@vectoria/core').Transform2D> = {};
        for (const objectId of drag.objectIds) {
          const initial = drag.initialTransforms[objectId];
          if (!initial) continue;
          preview[objectId] = { ...initial, position: { x: initial.position.x + deltaWorld.x, y: initial.position.y + deltaWorld.y } };
        }
        setDragPreview(preview);
      }
    } else if (drag.type === 'rotate-object' && drag.initialTransform && drag.pivotWorld) {
      const startAngle = Math.atan2(drag.startWorld.y - drag.pivotWorld.y, drag.startWorld.x - drag.pivotWorld.x);
      const currentAngle = Math.atan2(worldPos.y - drag.pivotWorld.y, worldPos.x - drag.pivotWorld.x);
      const object = doc.objects[drag.objectIds?.[0] ?? ''];
      if (object && (object.type === 'rectangle' || object.type === 'ellipse')) {
        setDragPreview({ [object.id]: { ...drag.initialTransform, position: drag.pivotWorld, pivot: { x: object.width / 2, y: object.height / 2 }, rotation: drag.initialTransform.rotation + currentAngle - startAngle } });
        drag.currentWorld = worldPos;
      }
    } else if (drag.type === 'resize-object') {
      drag.currentWorld = worldPos;
    }
  };

  const finishInteraction = (e: React.PointerEvent) => {
    const freehandOperation = freehandOperationRef.current;
    if (freehandOperation) {
      const screenPoint = getPointerScreen(e);
      const point = snapWorldPoint(camera.screenToWorld(screenPoint));
      freehandCursorRef.current = point;
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* capture may already be released */ }
      if (freehandOperation === 'pencil' || freehandOperation === 'brush') {
        const tool = freehandOperation === 'pencil' ? pencilToolRef.current : brushToolRef.current;
        const result = tool?.pointerUp({ screenPoint, worldPoint: point, pressure: freehandSettings.pressure ? e.pressure : 1, time: e.timeStamp });
        if (result?.type === 'commit') commitFreehand(result.samples, freehandOperation === 'brush');
      } else if (freehandOperation === 'eraser' || freehandOperation === 'knife') {
        const tool = freehandOperation === 'eraser' ? eraserToolRef.current : knifeToolRef.current;
        const points = tool?.takePoints() ?? [];
        const hit = selectTool.pick({ document: doc, selection, screenPoint, worldPoint: points[0] ?? point, zoom: camera.zoom }).hit;
        const object = hit ? doc.objects[hit.objectId] : selectedObjectId ? doc.objects[selectedObjectId] : null;
        if (object?.type === 'path' && points.length > 1) {
          const fragments = freehandOperation === 'eraser'
            ? erasePath(object, points, camera.screenToWorldDistance(eraserToolRef.current!.radiusPx))
            : splitPathByPolyline(object, points);
          if (fragments.length > 0 || freehandOperation === 'eraser') onExecuteCommand(freehandOperation === 'eraser' ? new EraserPathCommand(object.id, fragments) : new KnifePathCommand(object.id, fragments));
        }
      } else if (freehandOperation === 'scissors') {
        const hit = selectTool.pick({ document: doc, selection, screenPoint, worldPoint: point, zoom: camera.zoom }).hit;
        const object = hit ? doc.objects[hit.objectId] : selectedObjectId ? doc.objects[selectedObjectId] : null;
        if (object?.type === 'path') {
          const fragments = scissorsToolRef.current!.split(object, point, camera.screenToWorldDistance(10));
          if (fragments.length === 2) onExecuteCommand(new ScissorsPathCommand(object.id, fragments));
        }
      } else if (freehandOperation === 'width') {
        const object = selectedObjectId ? doc.objects[selectedObjectId] : null;
        const profile = widthToolRef.current?.pointerUp() ?? [];
        if (object?.type === 'path' && profile.length > 0) onExecuteCommand(new SetPathWidthCommand(object.id, profile));
      } else if (freehandOperation === 'smooth') {
        const object = selectedObjectId ? doc.objects[selectedObjectId] : null;
        const nodes = object?.type === 'path' ? pathPreview[object.id] : undefined;
        if (object?.type === 'path' && nodes) onExecuteCommand(new SetPathGeometryCommand(object.id, { nodes }));
        setPathPreview({});
      }
      eraserToolRef.current?.cancel();
      knifeToolRef.current?.cancel();
      widthToolRef.current?.cancel();
      smoothStartScreenRef.current = null;
      freehandOperationRef.current = null;
      widthStartScreenRef.current = null;
      freehandCursorRef.current = null;
      setPathPreview({});
      setFreehandVersion((version) => version + 1);
      qualityPolicyRef.current?.endInteraction();
      return;
    }
    if (!dragStateRef.current && activeTool === 'corner') {
      const command = cornerToolRef.current?.apply();
      if (command) onExecuteCommand(command);
      cornerStartScreenRef.current = null;
      setCornerPreview(null);
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* capture may already be released */ }
      return;
    }
    if (!dragStateRef.current && activeTool === 'pen') {
      const screenPoint = getPointerScreen(e);
      const result = penToolRef.current?.pointerUp({ screenPoint, worldPoint: snapWorldPoint(camera.screenToWorld(screenPoint)), shiftKey: e.shiftKey, altKey: e.altKey });
      if (result?.type === 'commit') commitPen(result.nodes, result.closed);
      setPenVersion((version) => version + 1);
      return;
    }
    const drag = dragStateRef.current;
    if (!drag) return;

    try {
      (e.target as HTMLElement).releasePointerCapture(drag.pointerId);
    } catch {
      // Ignore if capture was already released
    }

    if (drag.type === 'style-sample') {
      const screenPoint = getPointerScreen(e);
      const worldPoint = snapWorldPoint(camera.screenToWorld(screenPoint));
      const hit = selectTool.pick({ document: doc, selection, screenPoint, worldPoint, zoom: camera.zoom }).hit;
      const result = drag.styleTool === 'eyedropper'
        ? eyedropperToolRef.current?.pointerUp(hit?.objectId ?? null)
        : paintBucketToolRef.current?.pointerUp(hit?.objectId ?? null);
      const source = hit ? doc.objects[hit.objectId] : undefined;
      if (result?.type === 'commit' && source && selectedObjectIds.length > 0) {
        if (result.target === 'style') onExecuteCommand(new ApplyStyleCommand(selectedObjectIds, source.style));
        else {
          const targetKind = result.target as 'fill' | 'stroke';
          const tolerance = 'tolerance' in result && typeof result.tolerance === 'number' ? result.tolerance : 0;
          const sourceColor = sampledStyleColor(source.style, targetKind);
          const targetIds = selectedObjectIds.filter((id) => {
            const targetObject = doc.objects[id];
            if (!targetObject || targetObject.locked) return false;
            const targetColor = sampledStyleColor(targetObject.style, targetKind);
            return sourceColor === null || targetColor === null || colorDistancePercent(sourceColor, targetColor) <= tolerance;
          });
          if (targetIds.length > 0) onExecuteCommand(targetKind === 'fill' ? new SetObjectStyleCommand(targetIds, { fill: source.style.fill }) : new SetObjectStyleCommand(targetIds, { stroke: source.style.stroke }));
        }
      }
      dragStateRef.current = null;
      renderLoopRef.current?.invalidate();
      qualityPolicyRef.current?.endInteraction();
      return;
    }

    if (drag.type === 'gradient-handle' && drag.objectIds?.[0]) {
      const objectId = drag.objectIds[0];
      const preview = stylePreview[objectId];
      if (preview) onExecuteCommand(new SetObjectStyleCommand([objectId], preview));
      setStylePreview({});
      dragStateRef.current = null;
      renderLoopRef.current?.invalidate();
      qualityPolicyRef.current?.endInteraction();
      return;
    }

    if (drag.type === 'marquee' || drag.type === 'lasso' || drag.type === 'node-lasso') {
      const dx = drag.currentWorld.x - drag.startWorld.x;
      const dy = drag.currentWorld.y - drag.startWorld.y;
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        let nextSelection = selection;
        if (drag.type === 'marquee') {
          const area = {
            x: Math.min(drag.startWorld.x, drag.currentWorld.x),
            y: Math.min(drag.startWorld.y, drag.currentWorld.y),
            width: Math.abs(dx),
            height: Math.abs(dy),
          };
          nextSelection = selectTool.marquee({ document: doc, selection, area, additive: e.shiftKey, fullyContained: false, zoom: camera.zoom, visibleWorldRect: camera.getVisibleWorldRect({ x: containerRef.current?.clientWidth ?? 0, y: containerRef.current?.clientHeight ?? 0 }) });
        } else if ((drag.type === 'lasso' || drag.type === 'node-lasso') && lassoSessionRef.current) {
          const polygon = lassoSessionRef.current.finish();
          if (polygon.length >= 3) {
            nextSelection = drag.type === 'lasso'
              ? selectTool.lasso({ document: doc, selection, polygon, additive: e.shiftKey, zoom: camera.zoom })
              : selectedObjectId ? directSelect.lasso({ document: doc, selection, polygon, objectId: selectedObjectId, additive: e.shiftKey }) : selection;
          }
        }
        if (nextSelection.objectIds !== selection.objectIds || nextSelection.nodeIds !== selection.nodeIds) {
          onSelectSelection?.(nextSelection);
        }
      } else if (!e.shiftKey) {
        onSelectSelection?.(selectTool.clear());
      }
      lassoSessionRef.current = null;
    } else if (drag.type === 'create-shape') {
      const result = shapeToolRef.current?.pointerUp({ screenPoint: drag.currentWorld, worldPoint: drag.currentWorld, shiftKey: e.shiftKey, altKey: e.altKey });
      shapeToolRef.current = null;

       // Only create if non-zero size
       if (result?.type === 'commit') {
         const newId = generateId();
        const object = createObjectFromShape(result.geometry, {
          id: newId,
          name: `${SHAPE_LABELS[result.geometry.type] ?? 'Shape'} ${Object.keys(doc.objects).length + 1}`,
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
        });
         if (object) {
           const cmd = new CreateObjectsCommand([object], doc.activeLayerId);
           onExecuteCommand(cmd);
           onSelectObject(newId);
         }
       }
    } else if (drag.type === 'text-create') {
      const result = textToolRef.current!.pointerUp(drag.currentWorld, doc.activeLayerId);
      if (result) {
        onExecuteCommand(result.command);
        onSelectObject(result.objectId);
        textEditSessionRef.current = new TextEditSession(result.objectId, result.isFrame ? 'Type your text here...' : 'Text');
        setTextEditVersion((v) => v + 1);
      }
    } else if (drag.type === 'move-object') {
      const transforms = new Map(Object.entries(dragPreview) as [ObjectId, import('@vectoria/core').Transform2D][]);
      if (transforms.size > 0) {
        const moved = [...transforms.entries()].some(([id, transform]) => {
          const initial = drag.initialTransforms?.[id];
          return initial && (Math.abs(transform.position.x - initial.position.x) > 0.5 || Math.abs(transform.position.y - initial.position.y) > 0.5);
        });
        if (moved) onExecuteCommand(new TransformObjectsCommand([...transforms.keys()], transforms));
      }
    } else if ((drag.type === 'move-node' || drag.type === 'move-handle') && drag.objectIds?.[0] && drag.nodeIndex !== undefined) {
      const objectId = drag.objectIds[0];
      const nodes = pathPreview[objectId];
      if (nodes) onExecuteCommand(new SetPathGeometryCommand(objectId, { nodes }));
      setPathPreview({});
    } else if (drag.type === 'rotate-object') {
      const transforms = new Map(Object.entries(dragPreview) as [ObjectId, import('@vectoria/core').Transform2D][]);
      if (transforms.size > 0) onExecuteCommand(new TransformObjectsCommand([...transforms.keys()], transforms));
    } else if (drag.type === 'resize-object' && selectedObjectId && drag.initialSize) {
      const object = doc.objects[selectedObjectId];
      if (object?.type === 'rectangle' || object?.type === 'ellipse') {
        let width = Math.max(1, drag.initialSize.width + drag.currentWorld.x - drag.startWorld.x);
        let height = Math.max(1, drag.initialSize.height + drag.currentWorld.y - drag.startWorld.y);
        if (e.shiftKey) {
          const ratio = drag.initialSize.width / drag.initialSize.height;
          if (Math.abs(width - drag.initialSize.width) >= Math.abs(height - drag.initialSize.height) * ratio) height = Math.max(1, width / ratio);
          else width = Math.max(1, height * ratio);
        }
        if (object.type === 'rectangle') onExecuteCommand(new SetRectangleGeometryCommand(selectedObjectId, { width, height }));
        else onExecuteCommand(new SetEllipseGeometryCommand(selectedObjectId, { width, height }));
      }
      setDragPreview({});
    }

    if (drag.type === 'move-object') setDragPreview({});
    dragSessionRef.current = null;
    dragStateRef.current = null;
    renderLoopRef.current?.invalidate();
    qualityPolicyRef.current?.endInteraction();
    snapResultRef.current = null;
  };

  const cancelInteraction = () => {
    if (freehandOperationRef.current) {
      pencilToolRef.current?.cancel();
      brushToolRef.current?.cancel();
      eraserToolRef.current?.cancel();
      knifeToolRef.current?.cancel();
      widthToolRef.current?.cancel();
      smoothStartScreenRef.current = null;
      freehandOperationRef.current = null;
      widthStartScreenRef.current = null;
      freehandCursorRef.current = null;
      setFreehandVersion((version) => version + 1);
      return;
    }
    const drag = dragStateRef.current;
    if (!drag) {
      if (activeTool === 'pen') {
        penToolRef.current?.cancel();
        setPenVersion((version) => version + 1);
      }
      if (activeTool === 'polyline') {
        polylineToolRef.current?.cancel();
        setPolylineVersion((version) => version + 1);
      }
      if (activeTool === 'corner') {
        cornerToolRef.current?.cancel();
        cornerStartScreenRef.current = null;
        setCornerPreview(null);
      }
      return;
    }

    if (drag.type === 'move-object') {
      setDragPreview({});
    }
    if (drag.type === 'style-sample') {
      eyedropperToolRef.current?.cancel();
      paintBucketToolRef.current?.cancel();
    }
    if (drag.type === 'gradient-handle') setStylePreview({});
    if (drag.type === 'move-node' || drag.type === 'move-handle') setPathPreview({});
    if (drag.type === 'create-shape') {
      shapeToolRef.current?.cancel();
      shapeToolRef.current = null;
    }
    dragSessionRef.current = null;

    dragStateRef.current = null;
    renderLoopRef.current?.invalidate();
    qualityPolicyRef.current?.endInteraction();
  };

  const commitPen = useCallback((nodes: readonly import('@vectoria/core').PathNode[], closed: boolean) => {
    if (nodes.length < 2) return;
    const newId = generateId();
    const path: PathObject = {
      type: 'path', id: newId, name: `Path ${Object.keys(doc.objects).length + 1}`, layerId: doc.activeLayerId,
      visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }),
      style: { ...defaultObjectStyle, fill: closed ? defaultObjectStyle.fill : { type: 'none' }, stroke: defaultStroke },
      nodes, closed,
    };
    onExecuteCommand(new CreateObjectsCommand([path], doc.activeLayerId));
    onSelectObject(newId);
    setPenVersion((version) => version + 1);
  }, [doc, onExecuteCommand, onSelectObject]);

  const commitPolyline = useCallback((points: readonly Vec2[]) => {
    if (points.length < 2) return;
    const origin = points[0]!;
    const newId = generateId();
    const polyline: PolylineObject = {
      type: 'polyline', id: newId, name: `Polyline ${Object.keys(doc.objects).length + 1}`, layerId: doc.activeLayerId,
      visible: true, locked: false, transform: createTransform(origin),
      style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke },
      points: points.map((point) => ({ x: point.x - origin.x, y: point.y - origin.y })),
    };
    onExecuteCommand(new CreateObjectsCommand([polyline], doc.activeLayerId));
    onSelectObject(newId);
    setPolylineVersion((version) => version + 1);
  }, [doc, onExecuteCommand, onSelectObject]);

  const commitFreehand = useCallback((samples: readonly FreehandSample[], brush: boolean) => {
    const path = createFreehandPath(samples, {
      layerId: doc.activeLayerId,
      name: `${brush ? 'Brush' : 'Pencil'} ${Object.keys(doc.objects).length + 1}`,
      smoothing: freehandSettings.smoothing,
      width: freehandSettings.width,
      samples: brush ? samples : undefined,
      style: {
        fill: { type: 'none' },
        stroke: { ...defaultStroke, width: freehandSettings.width, lineCap: freehandSettings.cap, lineJoin: freehandSettings.join },
        opacity: 1,
      },
    });
    if (!path) return;
    onExecuteCommand(new CreateFreehandPathCommand(path));
    onSelectObject(path.id);
  }, [doc, freehandSettings, onExecuteCommand, onSelectObject]);

  useEffect(() => {
    if (activeTool !== 'corner') {
      cornerToolRef.current?.cancel();
      cornerStartScreenRef.current = null;
      setCornerPreview(null);
    }
    if (activeTool !== 'polyline') {
      polylineToolRef.current?.cancel();
      setPolylineVersion((version) => version + 1);
    }
    shapeToolRef.current?.cancel();
    shapeToolRef.current = null;
    if (activeTool === 'pen') return;
    const result = penToolRef.current?.keyDown('Escape');
    if (result?.type === 'commit') commitPen(result.nodes, result.closed);
    else if (result?.type === 'cancel') setPenVersion((version) => version + 1);
    pencilToolRef.current?.cancel();
    brushToolRef.current?.cancel();
    eraserToolRef.current?.cancel();
    knifeToolRef.current?.cancel();
    freehandOperationRef.current = null;
    freehandCursorRef.current = null;
    widthStartScreenRef.current = null;
    setPathPreview({});
    setFreehandVersion((version) => version + 1);
  }, [activeTool, commitPen]);

  // Keyboard shortcuts (Space, Delete, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (textEditSessionRef.current) {
        const session = textEditSessionRef.current;
        if (e.key === 'Escape') {
          e.preventDefault();
          commitTextEdit();
          renderLoopRef.current?.invalidate();
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          session.insertText('\n');
          setTextEditVersion((v) => v + 1);
          renderLoopRef.current?.invalidate();
          return;
        }

        if (e.key === 'Backspace') {
          e.preventDefault();
          session.deleteBackward();
          setTextEditVersion((v) => v + 1);
          renderLoopRef.current?.invalidate();
          return;
        }

        if (e.key === 'Delete') {
          e.preventDefault();
          session.deleteForward();
          setTextEditVersion((v) => v + 1);
          renderLoopRef.current?.invalidate();
          return;
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          session.moveCaret('left', e.shiftKey);
          setTextEditVersion((v) => v + 1);
          renderLoopRef.current?.invalidate();
          return;
        }

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          session.moveCaret('right', e.shiftKey);
          setTextEditVersion((v) => v + 1);
          renderLoopRef.current?.invalidate();
          return;
        }

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          session.moveCaretVertical(e.key === 'ArrowUp' ? 'up' : 'down', e.shiftKey);
          setTextEditVersion((v) => v + 1);
          renderLoopRef.current?.invalidate();
          return;
        }

        if (e.key === 'Home') {
          e.preventDefault();
          session.moveCaret('home', e.shiftKey);
          setTextEditVersion((v) => v + 1);
          renderLoopRef.current?.invalidate();
          return;
        }

        if (e.key === 'End') {
          e.preventDefault();
          session.moveCaret('end', e.shiftKey);
          setTextEditVersion((v) => v + 1);
          renderLoopRef.current?.invalidate();
          return;
        }

        if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          session.selectAll();
          setTextEditVersion((v) => v + 1);
          renderLoopRef.current?.invalidate();
          return;
        }

        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          session.insertText(e.key);
          setTextEditVersion((v) => v + 1);
          renderLoopRef.current?.invalidate();
          return;
        }

        return;
      }

      if (e.key === 'Alt') {
        const wasAltKey = altKeyRef.current;
        altKeyRef.current = e.altKey;
        if (wasAltKey !== e.altKey && !dragStateRef.current && activeTool === 'select' && selectedIds.size > 0 && freehandCursorRef.current) {
          const screenPos = camera.worldToScreen(freehandCursorRef.current);
          const pickContext = { document: doc, selection, screenPoint: screenPos, worldPoint: freehandCursorRef.current, zoom: camera.zoom, additive: false, allowedObjectIds: isolationRef.current.context ? new Set(isolationRef.current.context.objectIds) : undefined };
          const hit = selectTool.pick(pickContext).hit;
          hoveredObjectIdRef.current = hit?.objectId ?? null;
          renderLoopRef.current?.invalidate();
        }
      }

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      } else if (activeTool === 'pen' && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        const hovered = penHoverNodeRef.current;
        if (hovered) {
          // In-Pen node removal: hovered committed node goes through its command.
          onExecuteCommand(new RemovePathNodeCommand(hovered.objectId, hovered.nodeIndex));
          penHoverNodeRef.current = null;
        } else {
          penToolRef.current?.keyDown(e.key);
        }
        setPenVersion((version) => version + 1);
      } else if (activeTool === 'direct-select' && (e.key === 'Delete' || e.key === 'Backspace') && selection.nodeIds.length > 0) {
        e.preventDefault();
        const [nodeId] = selection.nodeIds;
        const separator = nodeId?.lastIndexOf(':') ?? -1;
        if (nodeId && separator > 0) {
          const objectId = nodeId.slice(0, separator);
          const nodeIndex = Number(nodeId.slice(separator + 1));
          if (Number.isInteger(nodeIndex)) {
            onExecuteCommand(new RemovePathNodeCommand(objectId, nodeIndex));
            onSelectSelection?.({ ...selection, nodeIds: selection.nodeIds.filter((id) => id !== nodeId) });
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectIds.length > 0) {
          e.preventDefault();
          onExecuteCommand(new DeleteObjectsCommand(selectedObjectIds));
          onSelectObject(null);
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedObjectIds.length === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const delta = e.key === 'ArrowUp' ? { x: 0, y: -step } : e.key === 'ArrowDown' ? { x: 0, y: step } : e.key === 'ArrowLeft' ? { x: -step, y: 0 } : { x: step, y: 0 };
        const transforms = new Map(selectedObjectIds.map((id) => {
          const object = doc.objects[id];
          return [id, object ? { ...object.transform, position: { x: object.transform.position.x + delta.x, y: object.transform.position.y + delta.y } } : null] as const;
        }).filter((entry): entry is [ObjectId, import('@vectoria/core').Transform2D] => Boolean(entry[1])));
        onExecuteCommand(new TransformObjectsCommand([...transforms.keys()], transforms));
      } else if ((e.key === 'Enter' || e.key === 'Escape') && activeTool === 'pen') {
        const result = penToolRef.current?.keyDown(e.key);
        if (result?.type === 'commit') commitPen(result.nodes, result.closed);
        setPenVersion((version) => version + 1);
      } else if (activeTool === 'polyline' && ['Enter', 'Escape', 'Backspace', 'Delete'].includes(e.key)) {
        e.preventDefault();
        const result = polylineToolRef.current?.keyDown(e.key);
        if (result?.type === 'commit') commitPolyline(result.points);
        setPolylineVersion((version) => version + 1);
      } else if (e.key === 'Escape') {
        if (isolationRef.current.context) {
          isolationRef.current.exit();
          setIsolationVersion((version) => version + 1);
          onSelectObjects?.([]);
          return;
        }
        cancelInteraction();
        penToolRef.current?.cancel();
        setPenVersion((version) => version + 1);
        onSelectObject(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        const wasAltKey = altKeyRef.current;
        altKeyRef.current = e.altKey;
        if (wasAltKey !== e.altKey) {
          hoveredObjectIdRef.current = null;
          renderLoopRef.current?.invalidate();
        }
      }

      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedObjectId, selectedObjectIds, doc, onExecuteCommand, onSelectObject, activeTool, commitPen, commitPolyline, commitTextEdit]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = camera.screenToWorld(screenPos);
    const hit = selectTool.pick({
      document: doc,
      selection,
      screenPoint: screenPos,
      worldPoint: worldPos,
      zoom: camera.zoom,
      additive: false,
    }).hit;

    if (hit && (doc.objects[hit.objectId]?.type === 'text' || doc.objects[hit.objectId]?.type === 'text-frame')) {
      const obj = doc.objects[hit.objectId] as TextObject | TextFrameObject;
      textEditSessionRef.current = new TextEditSession(obj.id, obj.text);
      const inverse = getInverseTransformMatrix(obj.transform);
      if (inverse) {
        const caret = textCaretAt(obj, mat3TransformPoint(inverse, worldPos));
        if (e.detail >= 3) textEditSessionRef.current.selectParagraphAt(caret);
        else if (e.detail === 2) textEditSessionRef.current.selectWordAt(caret);
      }
      setTextEditVersion((v) => v + 1);
      onSelectObject(obj.id);
      renderLoopRef.current?.invalidate();
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="canvas-viewport"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onDoubleClick={handleDoubleClick}
      onPointerUp={finishInteraction}
      onPointerCancel={cancelInteraction}
      onLostPointerCapture={cancelInteraction}
      onContextMenu={(e) => e.preventDefault()}
      data-tool={activeTool}
      style={{
        position: 'relative',
        flex: 1,
        height: '100%',
        overflow: 'hidden',
         cursor:
           isSpacePressed || activeTool === 'hand'
             ? 'grab'
             : activeTool === 'eyedropper'
             ? 'copy'
             : activeTool === 'bucket'
             ? 'cell'
             : isDragShapeTool(activeTool) || activeTool === 'polyline' || activeTool === 'pen' || activeTool === 'pencil' || activeTool === 'brush' || activeTool === 'corner' || activeTool === 'eraser' || activeTool === 'knife' || activeTool === 'scissors' || activeTool === 'lasso' || activeTool === 'node-lasso'
             ? 'crosshair'
             : 'default',
        touchAction: 'none',
      }}
    >
      {isolationRef.current.context && <div className="isolation-breadcrumb" role="status" aria-live="polite">Isolate: {isolationRef.current.context.label} · Escape to exit</div>}
      <span hidden>{isolationVersion}</span>
      <canvas
        ref={bgCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      {(import.meta as { env?: { DEV?: boolean } }).env?.DEV && new URLSearchParams(window.location.search).has('dev-hud') && (() => {
        const visibleWorldRect = camera.getVisibleWorldRect({ x: containerRef.current?.clientWidth ?? 0, y: containerRef.current?.clientHeight ?? 0 });
        const objects = Object.values(doc.objects);
         return <PerformanceHud objectCount={objects.length} visibleObjectCount={objects.filter((object) => rectsIntersect(getObjectBounds(object, doc), visibleWorldRect)).length} nodeCount={objects.reduce((count, object) => count + (object.type === 'path' ? object.nodes.length : 0), 0)} />;
      })()}
      <canvas
        ref={sceneCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

function selectNearestPathPoint(path: PathObject, worldPoint: Vec2): { point: Vec2; t: number } | null {
  const points = flattenPath(path);
  const inverse = getInverseTransformMatrix(path.transform);
  const localPoint = inverse ? mat3TransformPoint(inverse, worldPoint) : worldPoint;
  const nearest = nearestPointOnPolyline(localPoint, points);
  return nearest ? { point: nearest.point, t: nearest.index / Math.max(1, points.length - 2) } : null;
}

/** Tools whose objects are created by a single press-drag-release gesture. */
const DRAG_SHAPE_TOOLS: readonly BasicShapeTool[] = ['rectangle', 'ellipse', 'line', 'polygon', 'star', 'arc', 'pie', 'ring', 'spiral', 'callout'];

/**
 * Locate the closest committed path segment under a world point. Sampling is
 * done in the object's local space so rotated paths behave correctly.
 */
function findPathSegmentAt(
  doc: DocumentModel,
  worldPoint: Vec2,
  toleranceWorld: number,
): { objectId: ObjectId; segmentIndex: number; t: number } | null {
  const SEGMENT_SAMPLES = 16;
  let best: { objectId: ObjectId; segmentIndex: number; t: number; distance: number } | null = null;

  for (let li = doc.layerIds.length - 1; li >= 0; li -= 1) {
    const layer = doc.layers[doc.layerIds[li]!];
    if (!layer?.visible || layer.locked) continue;
    for (let oi = layer.objectIds.length - 1; oi >= 0; oi -= 1) {
      const object = doc.objects[layer.objectIds[oi]!];
      if (!object || object.type !== 'path' || !object.visible || object.locked) continue;
      const inverse = getInverseTransformMatrix(object.transform);
      if (!inverse) continue;
      const localPoint = mat3TransformPoint(inverse, worldPoint);
      const segments = object.closed ? object.nodes.length : object.nodes.length - 1;
      for (let s = 0; s < segments; s += 1) {
        const segment = getCubicSegment(object.nodes, s, object.closed);
        if (!segment) continue;
        for (let i = 0; i < SEGMENT_SAMPLES; i += 1) {
          const start = evaluateCubic(segment, i / SEGMENT_SAMPLES);
          const end = evaluateCubic(segment, (i + 1) / SEGMENT_SAMPLES);
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const lengthSq = dx * dx + dy * dy;
          const raw = lengthSq === 0 ? 0 : ((localPoint.x - start.x) * dx + (localPoint.y - start.y) * dy) / lengthSq;
          const clamped = Math.max(0, Math.min(1, raw));
          const closest = { x: start.x + dx * clamped, y: start.y + dy * clamped };
          const distance = Math.hypot(localPoint.x - closest.x, localPoint.y - closest.y);
          const t = (i + clamped) / SEGMENT_SAMPLES;
          if (!best || distance < best.distance) best = { objectId: object.id, segmentIndex: s, t: Math.min(0.95, Math.max(0.05, t)), distance };
        }
      }
    }
  }
  return best && best.distance <= toleranceWorld ? { objectId: best.objectId, segmentIndex: best.segmentIndex, t: best.t } : null;
}

function isDragShapeTool(tool: ActiveTool): tool is BasicShapeTool {
  return (DRAG_SHAPE_TOOLS as readonly string[]).includes(tool);
}

const SHAPE_LABELS: Record<string, string> = {
  rectangle: 'Rectangle', ellipse: 'Ellipse', line: 'Line',
  polygon: 'Polygon', star: 'Star', arc: 'Arc', pie: 'Pie',
  ring: 'Ring', spiral: 'Spiral', callout: 'Callout', polyline: 'Polyline',
};

type CreatedShapeObject =
  | RectangleObject | EllipseObject | LineObject
  | PolygonObject | StarObject | ArcObject | PieObject | RingObject
  | SpiralObject | CalloutObject | PolylineObject;

interface CommonObjectFields {
  id: ObjectId;
  name: string;
  layerId: ObjectId;
  visible: boolean;
  locked: boolean;
}

/**
 * Map a normalized drag geometry onto a concrete scene object with sensible
 * per-type defaults (radii inscribed into the drag box, parametric ratios).
 * Returns null only for geometries that cannot produce a valid object.
 */
function createObjectFromShape(geometry: import('@vectoria/core').ShapeGeometry, common: CommonObjectFields): CreatedShapeObject | null {
  switch (geometry.type) {
    case 'rectangle':
      return { ...common, type: 'rectangle', transform: createTransform({ x: geometry.x, y: geometry.y }), style: defaultObjectStyle, width: geometry.width, height: geometry.height, cornerRadius: defaultCornerRadii };
    case 'ellipse':
      return { ...common, type: 'ellipse', transform: createTransform({ x: geometry.x, y: geometry.y }), style: defaultObjectStyle, width: geometry.width, height: geometry.height };
    case 'line':
      return { ...common, type: 'line', transform: createTransform(geometry.start), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke }, endPoint: { x: geometry.end.x - geometry.start.x, y: geometry.end.y - geometry.start.y } };
    case 'polygon': {
      const center = createTransform({ x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 });
      return { ...common, type: 'polygon', transform: center, style: defaultObjectStyle, sides: 6, radius: Math.max(geometry.width, geometry.height) / 2 };
    }
    case 'star': {
      const outer = Math.max(geometry.width, geometry.height) / 2;
      const center = createTransform({ x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 });
      return { ...common, type: 'star', transform: center, style: defaultObjectStyle, points: 5, outerRadius: outer, innerRadius: outer * 0.5 };
    }
    case 'arc': {
      const center = createTransform({ x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 });
      return { ...common, type: 'arc', transform: center, style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke }, radiusX: geometry.width / 2, radiusY: geometry.height / 2, startAngle: 0, endAngle: Math.PI * 1.5, closed: false };
    }
    case 'pie': {
      const center = createTransform({ x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 });
      return { ...common, type: 'pie', transform: center, style: defaultObjectStyle, radiusX: geometry.width / 2, radiusY: geometry.height / 2, startAngle: 0, endAngle: Math.PI * 1.5 };
    }
    case 'ring': {
      const outer = Math.max(geometry.width, geometry.height) / 2;
      const center = createTransform({ x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 });
      return { ...common, type: 'ring', transform: center, style: defaultObjectStyle, outerRadius: outer, innerRadius: outer * 0.5 };
    }
    case 'spiral': {
      const finalRadius = Math.max(geometry.width, geometry.height) / 2;
      const turns = 3;
      const center = createTransform({ x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 });
      return { ...common, type: 'spiral', transform: center, style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke }, turns, decay: finalRadius / turns, direction: 'cw' };
    }
    case 'callout':
      return { ...common, type: 'callout', transform: createTransform({ x: geometry.x, y: geometry.y }), style: defaultObjectStyle, width: geometry.width, height: geometry.height, cornerRadius: Math.min(geometry.width, geometry.height) * 0.12, tailTip: { x: geometry.width * 0.35, y: geometry.height * 1.35 }, tailBaseWidth: geometry.width * 0.15 };
    default:
      return null;
  }
}

function pointOnPath(path: PathObject, t: number): Vec2 {
  const points = flattenPath(path);
  const point = points[Math.round(Math.min(1, Math.max(0, t)) * Math.max(0, points.length - 1))] ?? points[0] ?? { x: 0, y: 0 };
  return mat3TransformPoint(getTransformMatrix(path.transform), point);
}
