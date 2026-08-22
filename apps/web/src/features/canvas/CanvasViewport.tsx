import React, { useRef, useEffect, useCallback } from 'react';
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
} from '@vectoria/core';
import {
  CreateObjectsCommand,
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
  normalizeShapeDrag,
  isValidShapeGeometry,
} from '@vectoria/core';
import { Camera, DragSession, SelectTool, DirectSelectTool, PenTool, snapToGrid as snapPointToGrid, type GridSettings } from '@vectoria/editor-engine';
import { mat3TransformPoint } from '@vectoria/shared';
import {
  RenderLoop,
  resizeCanvas,
  renderBackground,
  renderScene,
  renderOverlay,
} from '@vectoria/renderer';
import type { ActiveTool } from '../toolbar/ToolRail.js';
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
}

interface DragState {
  type: 'pan' | 'create-shape' | 'move-object' | 'move-node' | 'resize-object' | 'rotate-object' | 'marquee';
  shape?: 'rectangle' | 'ellipse' | 'line';
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
  initialNodes?: readonly import('@vectoria/core').PathNode[];
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
  onSelectSelection,
  onCursorMove,
  onZoomChange,
  showGrid = true,
  snapToGrid = false,
  gridSettings = { visible: true, size: 10, subdivisions: 1 },
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const renderLoopRef = useRef<RenderLoop | null>(null);
  const renderAllRef = useRef<() => void>(() => undefined);
  const dragStateRef = useRef<DragState | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [dragPreview, setDragPreview] = React.useState<Record<string, import('@vectoria/core').Transform2D>>({});
  const [pathPreview, setPathPreview] = React.useState<Record<string, readonly import('@vectoria/core').PathNode[]>>({});
  const penToolRef = useRef<PenTool | null>(null);
  if (!penToolRef.current) penToolRef.current = new PenTool();
  const [penVersion, setPenVersion] = React.useState(0);

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
      renderBackground(bgCtx, camera, activeArtboard, bgCanvas.width, bgCanvas.height, { showGrid, grid: gridSettings });
    }

    renderScene(sceneCtx, camera, doc, sceneCanvas.width, sceneCanvas.height, {
      previewTransforms: dragPreview,
    });
    renderOverlay(overlayCtx, camera, doc, selectedIds, overlayCanvas.width, overlayCanvas.height, {
      previewTransforms: dragPreview
        ? new Map(Object.entries(dragPreview) as [string, import('@vectoria/core').Transform2D][])
        : undefined,
      nodeSelectionIds: selection.nodeIds,
      pathPreviews: new Map(Object.entries(pathPreview) as [ObjectId, readonly import('@vectoria/core').PathNode[]][]),
      marquee: dragStateRef.current?.type === 'marquee' ? {
        start: dragStateRef.current.startWorld,
        end: dragStateRef.current.currentWorld,
      } : undefined,
    });

    // Draw active creation drag preview on overlay.
    const drag = dragStateRef.current;
    if (drag && drag.type === 'create-shape') {
      const dpr = window.devicePixelRatio || 1;
      overlayCtx.save();
      overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      overlayCtx.translate(camera.pan.x, camera.pan.y);
      overlayCtx.scale(camera.zoom, camera.zoom);

      const geometry = drag.shape
        ? normalizeShapeDrag(drag.shape, drag.startWorld, drag.currentWorld)
        : null;
      if (geometry) {
        overlayCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
        overlayCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-selection-fill').trim();
        overlayCtx.lineWidth = 1 / camera.zoom;
        if (geometry.type === 'line') {
          overlayCtx.beginPath();
          overlayCtx.moveTo(geometry.start.x, geometry.start.y);
          overlayCtx.lineTo(geometry.end.x, geometry.end.y);
          overlayCtx.stroke();
        } else if (geometry.type === 'ellipse') {
          overlayCtx.beginPath();
          overlayCtx.ellipse(geometry.x + geometry.width / 2, geometry.y + geometry.height / 2, geometry.width / 2, geometry.height / 2, 0, 0, Math.PI * 2);
          overlayCtx.fill();
          overlayCtx.stroke();
        } else {
          overlayCtx.fillRect(geometry.x, geometry.y, geometry.width, geometry.height);
          overlayCtx.strokeRect(geometry.x, geometry.y, geometry.width, geometry.height);
        }
      }

      overlayCtx.restore();
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
      if (rubberBandPoint && pen.nodes.length > 0) overlayCtx.lineTo(rubberBandPoint.x, rubberBandPoint.y);
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
    void penVersion;
  }, [doc, camera, selectedIds, dragPreview, pathPreview, activeTool, penVersion, showGrid, gridSettings, selection]);

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
      if (camera.onChanged === handleCameraChange) {
        camera.onChanged = null;
      }
    };
  }, [camera, onZoomChange]);

  // Invalidate on doc or selection changes
  useEffect(() => {
    renderLoopRef.current?.invalidate();
  }, [doc, selectedIds, dragPreview, pathPreview, selection, activeTool, penVersion]);

  useEffect(() => {
    if (activeTool !== 'pen') penToolRef.current?.cancel();
  }, [activeTool]);

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

  const snapWorldPoint = (point: Vec2): Vec2 => snapToGrid ? snapPointToGrid(point, gridSettings) : point;

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
    camera.zoomAtPoint(factor, screenPos);
  };

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent) => {
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

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (activeTool === 'pen') {
      const result = penToolRef.current!.pointerDown(
        { screenPoint: screenPos, worldPoint: worldPos },
        camera.screenToWorldDistance(12),
      );
      if (result?.type === 'commit') commitPen(result.nodes, result.closed);
      setPenVersion((version) => version + 1);
    } else if (activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line') {
      dragStateRef.current = {
        type: 'create-shape',
        shape: activeTool,
        startScreen: screenPos,
        startWorld: worldPos,
        currentWorld: worldPos,
        pointerId: e.pointerId,
      };
    } else if (activeTool === 'direct-select') {
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
      const picked = selectTool.pick({ document: doc, selection, screenPoint: screenPos, worldPoint: worldPos, zoom: camera.zoom });
      const hit = picked.hit;

      if (hit) {
        const nextSelection = e.shiftKey ? selectTool.pick({ document: doc, selection, screenPoint: screenPos, worldPoint: worldPos, zoom: camera.zoom, additive: true }).selection : picked.selection;
        onSelectSelection?.(nextSelection);
        const dragIds = nextSelection.objectIds;
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
        // Empty drag becomes marquee; click clears selection on release.
        dragStateRef.current = {
          type: 'marquee',
          startScreen: screenPos,
          startWorld: worldPos,
          currentWorld: worldPos,
          pointerId: e.pointerId,
        };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const screenPos = getPointerScreen(e);
    const worldPos = snapWorldPoint(camera.screenToWorld(screenPos));
    onCursorMove(worldPos);

    const drag = dragStateRef.current;
    if (!drag) {
      if (activeTool === 'pen') {
        penToolRef.current?.pointerMove({ screenPoint: screenPos, worldPoint: worldPos });
        setPenVersion((version) => version + 1);
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
    } else if (drag.type === 'marquee') {
      drag.currentWorld = worldPos;
      renderLoopRef.current?.invalidate();
    } else if (drag.type === 'create-shape') {
      const geometry = drag.shape ? normalizeShapeDrag(drag.shape, drag.startWorld, worldPos, { shift: e.shiftKey }) : null;
      if (geometry) drag.currentWorld = geometry.type === 'line' ? geometry.end : { x: geometry.x + (worldPos.x >= drag.startWorld.x ? geometry.width : 0), y: geometry.y + (worldPos.y >= drag.startWorld.y ? geometry.height : 0) };
       renderLoopRef.current?.invalidate();
    } else if (drag.type === 'move-node' && drag.objectIds?.[0] && drag.initialNodes) {
      const objectId = drag.objectIds[0];
      const delta = { x: worldPos.x - drag.startWorld.x, y: worldPos.y - drag.startWorld.y };
      const nodes = drag.initialNodes.map((node, index) => index === drag.nodeIndex ? {
        ...node,
        point: { x: node.point.x + delta.x, y: node.point.y + delta.y },
        inHandle: node.inHandle ? { x: node.inHandle.x + delta.x, y: node.inHandle.y + delta.y } : null,
        outHandle: node.outHandle ? { x: node.outHandle.x + delta.x, y: node.outHandle.y + delta.y } : null,
      } : node);
      setPathPreview({ [objectId]: nodes });
    } else if (drag.type === 'move-object') {
      drag.currentWorld = worldPos;
      dragSessionRef.current?.update(worldPos);
      if (drag.objectIds && drag.initialTransforms) {
        const deltaWorld = dragSessionRef.current?.delta ?? { x: worldPos.x - drag.startWorld.x, y: worldPos.y - drag.startWorld.y };
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
    if (!dragStateRef.current && activeTool === 'pen') {
      const screenPoint = getPointerScreen(e);
      const result = penToolRef.current?.pointerUp({ screenPoint, worldPoint: snapWorldPoint(camera.screenToWorld(screenPoint)) });
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

    if (drag.type === 'marquee') {
      const area = {
        x: Math.min(drag.startWorld.x, drag.currentWorld.x),
        y: Math.min(drag.startWorld.y, drag.currentWorld.y),
        width: Math.abs(drag.currentWorld.x - drag.startWorld.x),
        height: Math.abs(drag.currentWorld.y - drag.startWorld.y),
      };
      const moved = area.width > 2 || area.height > 2;
      if (moved) {
        const nextSelection = selectTool.marquee({ document: doc, selection, area, additive: e.shiftKey, fullyContained: false, zoom: camera.zoom, visibleWorldRect: camera.getVisibleWorldRect({ x: containerRef.current?.clientWidth ?? 0, y: containerRef.current?.clientHeight ?? 0 }) });
        onSelectSelection?.(nextSelection);
      } else if (!e.shiftKey) {
        onSelectObject(null);
      }
    } else if (drag.type === 'create-shape') {
      const geometry = drag.shape ? normalizeShapeDrag(drag.shape, drag.startWorld, drag.currentWorld) : null;

       // Only create if non-zero size
       if (geometry && isValidShapeGeometry(geometry)) {
         const newId = generateId();
        const common = {
          id: newId,
          name: `${drag.shape === 'ellipse' ? 'Ellipse' : drag.shape === 'line' ? 'Line' : 'Rectangle'} ${Object.keys(doc.objects).length + 1}`,
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
        };
         const object: RectangleObject | EllipseObject | LineObject = geometry.type === 'ellipse'
           ? { ...common, type: 'ellipse', transform: createTransform({ x: geometry.x, y: geometry.y }), style: defaultObjectStyle, width: geometry.width, height: geometry.height }
           : geometry.type === 'line'
           ? { ...common, type: 'line', transform: createTransform(geometry.start), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke }, endPoint: { x: geometry.end.x - geometry.start.x, y: geometry.end.y - geometry.start.y } }
           : { ...common, type: 'rectangle', transform: createTransform({ x: geometry.x, y: geometry.y }), style: defaultObjectStyle, width: geometry.width, height: geometry.height, cornerRadius: defaultCornerRadii };

        const cmd = new CreateObjectsCommand([object], doc.activeLayerId);
        onExecuteCommand(cmd);
        onSelectObject(newId);
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
    } else if (drag.type === 'move-node' && drag.objectIds?.[0] && drag.nodeIndex !== undefined) {
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
        const width = Math.max(1, drag.initialSize.width + drag.currentWorld.x - drag.startWorld.x);
        const height = Math.max(1, drag.initialSize.height + drag.currentWorld.y - drag.startWorld.y);
        if (object.type === 'rectangle') onExecuteCommand(new SetRectangleGeometryCommand(selectedObjectId, { width, height }));
        else onExecuteCommand(new SetEllipseGeometryCommand(selectedObjectId, { width, height }));
      }
      setDragPreview({});
    }

    if (drag.type === 'move-object') setDragPreview({});
    dragSessionRef.current = null;
    dragStateRef.current = null;
    renderLoopRef.current?.invalidate();
  };

  const cancelInteraction = () => {
    const drag = dragStateRef.current;
    if (!drag) return;

    if (drag.type === 'move-object') {
      setDragPreview({});
    }
    if (drag.type === 'move-node') setPathPreview({});
    dragSessionRef.current = null;

    dragStateRef.current = null;
    renderLoopRef.current?.invalidate();
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
      } else if (e.key === 'Escape') {
        cancelInteraction();
        penToolRef.current?.cancel();
        setPenVersion((version) => version + 1);
        onSelectObject(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
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
  }, [selectedObjectId, selectedObjectIds, doc, onExecuteCommand, onSelectObject, activeTool, commitPen]);

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
             : activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line' || activeTool === 'pen'
             ? 'crosshair'
            : 'default',
        touchAction: 'none',
      }}
    >
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
        return <PerformanceHud objectCount={objects.length} visibleObjectCount={objects.filter((object) => rectsIntersect(getObjectBounds(object), visibleWorldRect)).length} nodeCount={objects.reduce((count, object) => count + (object.type === 'path' ? object.nodes.length : 0), 0)} />;
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
