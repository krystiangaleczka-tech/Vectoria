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
} from '@vectoria/core';
import {
  CreateObjectsCommand,
  CreateFreehandPathCommand,
  TransformObjectsCommand,
  SetRectangleGeometryCommand,
  SetEllipseGeometryCommand,
  SetPathGeometryCommand,
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
} from '@vectoria/core';
import { Camera, DragSession, SelectTool, DirectSelectTool, PenTool, PencilTool, BrushTool, SmoothTool, CornerTool, EraserTool, KnifeTool, ScissorsTool, WidthTool, SnapService, IsolationService, LassoSession, calculateObjectSnap, ShapeTool, PolylineTool, type GridSettings, type SnapResult, type ObjectSnapResult } from '@vectoria/editor-engine';
import { mat3TransformPoint } from '@vectoria/shared';
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
}

interface DragState {
  type: 'pan' | 'create-shape' | 'move-object' | 'move-node' | 'move-handle' | 'resize-object' | 'rotate-object' | 'marquee' | 'lasso' | 'node-lasso';
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
  const pencilToolRef = useRef<PencilTool | null>(null);
  const brushToolRef = useRef<BrushTool | null>(null);
  const eraserToolRef = useRef<EraserTool | null>(null);
  const knifeToolRef = useRef<KnifeTool | null>(null);
  const scissorsToolRef = useRef<ScissorsTool | null>(null);
  const widthToolRef = useRef<WidthTool | null>(null);
  const smoothToolRef = useRef<SmoothTool | null>(null);
  const cornerToolRef = useRef<CornerTool | null>(null);
  if (!pencilToolRef.current) pencilToolRef.current = new PencilTool();
  if (!brushToolRef.current) brushToolRef.current = new BrushTool();
  if (!eraserToolRef.current) eraserToolRef.current = new EraserTool();
  if (!knifeToolRef.current) knifeToolRef.current = new KnifeTool();
  if (!scissorsToolRef.current) scissorsToolRef.current = new ScissorsTool();
  if (!widthToolRef.current) widthToolRef.current = new WidthTool();
  if (!smoothToolRef.current) smoothToolRef.current = new SmoothTool();
  if (!cornerToolRef.current) cornerToolRef.current = new CornerTool();
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
      quality: qualityPolicyRef.current?.quality,
    });
    renderOverlay(overlayCtx, camera, doc, selectedIds, overlayCanvas.width, overlayCanvas.height, {
      previewTransforms: dragPreview
        ? new Map(Object.entries(dragPreview) as [string, import('@vectoria/core').Transform2D][])
        : undefined,
      nodeSelectionIds: selection.nodeIds,
      pathPreviews: new Map(Object.entries(pathPreview) as [ObjectId, readonly import('@vectoria/core').PathNode[]][]),
      geometryPreview: geometryPreview ?? cornerPreview ?? undefined,
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
    const samples = activeTool === 'pencil' ? pencilToolRef.current?.preview : activeTool === 'brush' ? brushToolRef.current?.preview : undefined;
    const eraserPreview = activeTool === 'eraser' && freehandCursorRef.current && eraserToolRef.current ? { point: freehandCursorRef.current, radiusPx: eraserToolRef.current.radiusPx } : undefined;
    const cutPreview = activeTool === 'knife' ? knifeToolRef.current?.preview.points : undefined;
    const widthPreview = activeTool === 'width' && selectedObjectId && doc.objects[selectedObjectId]?.type === 'path'
      ? widthToolRef.current?.preview.map((point) => ({ point: pointOnPath(doc.objects[selectedObjectId] as PathObject, point.t), width: point.width }))
      : undefined;
    if (freehandTool || samples?.length || eraserPreview || cutPreview?.length || widthPreview?.length) {
      renderFreehandOverlay(overlayCtx, camera, overlayCanvas.width, overlayCanvas.height, {
        points: samples?.map((sample) => sample.point),
        strokeWidth: activeTool === 'brush' ? freehandSettings.width : Math.max(1, freehandSettings.width / 2),
        cutLine: cutPreview,
        eraserCursor: eraserPreview,
        widthPoints: widthPreview,
      });
    }
    void penVersion;
    void freehandVersion;
  }, [doc, camera, selectedIds, dragPreview, pathPreview, geometryPreview, cornerPreview, activeTool, penVersion, polylineVersion, freehandVersion, freehandSettings, showGrid, gridSettings, selection, selectedObjectId]);

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
  }, [doc, selectedIds, dragPreview, pathPreview, selection, activeTool, penVersion]);

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
      const hit = selectTool.pick({ document: doc, selection, screenPoint: screenPos, worldPoint: worldPos, zoom: camera.zoom }).hit;
      const source = hit ? doc.objects[hit.objectId] : undefined;
      if (source && selectedObjectIds?.length) {
        const ids = selectedObjectIds;
        onExecuteCommand(activeTool === 'eyedropper' ? new ApplyStyleCommand(ids, source.style) : new SetObjectStyleCommand(ids, { fill: source.style.fill }));
      }
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

    if (activeTool === 'pen') {
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
        penToolRef.current?.keyDown(e.key);
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
  }, [selectedObjectId, selectedObjectIds, doc, onExecuteCommand, onSelectObject, activeTool, commitPen, commitPolyline]);

  return (
    <div
      ref={containerRef}
      data-testid="canvas-viewport"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
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
