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
  PathNode,
  Command,
} from '@vectoria/core';
import {
  CreateObjectsCommand,
  TransformObjectsCommand,
  SetRectangleGeometryCommand,
  SetEllipseGeometryCommand,
  DeleteObjectsCommand,
  createTransform,
  defaultObjectStyle,
  defaultStroke,
} from '@vectoria/core';
import { Camera, hitTest, snapToGrid as snapPointToGrid, type GridSettings } from '@vectoria/editor-engine';
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
  camera: Camera;
  onExecuteCommand: (cmd: Command) => void;
  onSelectObject: (id: ObjectId | null) => void;
  onCursorMove: (worldPos: Vec2 | null) => void;
  onZoomChange: (zoomPercent: number) => void;
  showGrid?: boolean;
  snapToGrid?: boolean;
  gridSettings?: GridSettings;
}

interface DragState {
  type: 'pan' | 'create-shape' | 'move-object' | 'resize-object';
  shape?: 'rectangle' | 'ellipse' | 'line';
  startScreen: Vec2;
  startWorld: Vec2;
  currentWorld: Vec2;
  pointerId: number;
  initialObjectTransform?: { position: Vec2 };
  initialSize?: { width: number; height: number };
}

interface PenState {
  nodes: PathNode[];
  pendingPoint: Vec2 | null;
  pendingStart: Vec2 | null;
  pendingDragged: boolean;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  document: doc,
  activeTool,
  selectedObjectId,
  camera,
  onExecuteCommand,
  onSelectObject,
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
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [dragPreview, setDragPreview] = React.useState<Record<string, import('@vectoria/core').Transform2D>>({});
  const penStateRef = useRef<PenState>({ nodes: [], pendingPoint: null, pendingStart: null, pendingDragged: false });
  const [penVersion, setPenVersion] = React.useState(0);

  // Selected IDs as Set for renderer
  const selectedIds = React.useMemo(
    () => new Set(selectedObjectId ? [selectedObjectId] : []),
    [selectedObjectId]
  );

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
    });

    // Draw active creation drag preview on overlay.
    const drag = dragStateRef.current;
    if (drag && drag.type === 'create-shape') {
      const dpr = window.devicePixelRatio || 1;
      overlayCtx.save();
      overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      overlayCtx.translate(camera.pan.x, camera.pan.y);
      overlayCtx.scale(camera.zoom, camera.zoom);

      const x = Math.min(drag.startWorld.x, drag.currentWorld.x);
      const y = Math.min(drag.startWorld.y, drag.currentWorld.y);
      const w = Math.abs(drag.currentWorld.x - drag.startWorld.x);
      const h = Math.abs(drag.currentWorld.y - drag.startWorld.y);

       overlayCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
      overlayCtx.lineWidth = 1 / camera.zoom;
      overlayCtx.strokeRect(x, y, w, h);

       overlayCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-selection-fill').trim();
       if (drag.shape !== 'line') {
         if (drag.shape === 'ellipse') {
           overlayCtx.beginPath();
           overlayCtx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
           overlayCtx.fill();
         } else overlayCtx.fillRect(x, y, w, h);
       }
       if (drag.shape === 'ellipse') {
         overlayCtx.beginPath();
         overlayCtx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
         overlayCtx.stroke();
       } else if (drag.shape === 'line') {
         overlayCtx.beginPath();
         overlayCtx.moveTo(drag.startWorld.x, drag.startWorld.y);
         overlayCtx.lineTo(drag.currentWorld.x, drag.currentWorld.y);
         overlayCtx.stroke();
       }

      overlayCtx.restore();
    }
    // Pen rubber-band preview stays on overlay and never mutates DocumentModel.
    const pen = penStateRef.current;
    if (activeTool === 'pen' && (pen.nodes.length > 0 || pen.pendingPoint)) {
      const dpr = window.devicePixelRatio || 1;
      overlayCtx.save();
      overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      overlayCtx.translate(camera.pan.x, camera.pan.y);
      overlayCtx.scale(camera.zoom, camera.zoom);
      overlayCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
      overlayCtx.lineWidth = 1.5 / camera.zoom;
      overlayCtx.beginPath();
      pen.nodes.forEach((node, index) => index === 0 ? overlayCtx.moveTo(node.point.x, node.point.y) : overlayCtx.lineTo(node.point.x, node.point.y));
      if (pen.pendingPoint && pen.nodes.length > 0) overlayCtx.lineTo(pen.pendingPoint.x, pen.pendingPoint.y);
      overlayCtx.stroke();
      for (const node of pen.nodes) {
        overlayCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-node').trim();
        overlayCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-node-selected').trim();
        overlayCtx.lineWidth = 1 / camera.zoom;
        overlayCtx.beginPath();
        overlayCtx.arc(node.point.x, node.point.y, 4 / camera.zoom, 0, Math.PI * 2);
        overlayCtx.fill();
        overlayCtx.stroke();
      }
      overlayCtx.restore();
    }
    void penVersion;
  }, [doc, camera, selectedIds, dragPreview, activeTool, penVersion, showGrid, gridSettings]);

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
  }, [doc, selectedIds, dragPreview]);

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
      const pen = penStateRef.current;
      if (pen.nodes.length >= 3 && Math.hypot(worldPos.x - pen.nodes[0]!.point.x, worldPos.y - pen.nodes[0]!.point.y) <= camera.screenToWorldDistance(12)) {
        finishPen(true);
        return;
      }
      pen.pendingPoint = worldPos;
      pen.pendingStart = worldPos;
      pen.pendingDragged = false;
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
    } else if (activeTool === 'select') {
      const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
      const selectedSize = selected && (selected.type === 'rectangle' || selected.type === 'ellipse') ? { width: selected.width, height: selected.height } : null;
      if (selected && selectedSize) {
        const handle = camera.worldToScreen({ x: selected.transform.position.x + selectedSize.width, y: selected.transform.position.y + selectedSize.height });
        if (Math.hypot(screenPos.x - handle.x, screenPos.y - handle.y) <= 12) {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          dragStateRef.current = { type: 'resize-object', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId, initialSize: selectedSize };
          return;
        }
      }
      const hitId = hitTest(doc, worldPos);

      if (hitId) {
        onSelectObject(hitId);
        const obj = doc.objects[hitId];
        dragStateRef.current = {
          type: 'move-object',
          startScreen: screenPos,
          startWorld: worldPos,
          currentWorld: worldPos,
          pointerId: e.pointerId,
          initialObjectTransform: obj ? { position: { ...obj.transform.position } } : undefined,
        };
      } else {
        // Deselect if clicked empty area
        onSelectObject(null);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const screenPos = getPointerScreen(e);
    const worldPos = snapWorldPoint(camera.screenToWorld(screenPos));
    onCursorMove(worldPos);

    const drag = dragStateRef.current;
    if (!drag) {
      if (activeTool === 'pen' && penStateRef.current.pendingPoint) {
        const pen = penStateRef.current;
        const start = pen.pendingStart ?? pen.pendingPoint!;
        pen.pendingPoint = worldPos;
        pen.pendingDragged = Math.hypot(worldPos.x - start.x, worldPos.y - start.y) > 3;
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
    } else if (drag.type === 'create-shape') {
      let finalWorld = worldPos;
      if (e.shiftKey && drag.shape !== 'line') {
        // Force square 1:1 aspect ratio
        const dx = worldPos.x - drag.startWorld.x;
        const dy = worldPos.y - drag.startWorld.y;
        const size = Math.max(Math.abs(dx), Math.abs(dy));
        finalWorld = {
          x: drag.startWorld.x + (dx >= 0 ? size : -size),
          y: drag.startWorld.y + (dy >= 0 ? size : -size),
        };
      }
      if (drag.shape === 'line' && e.shiftKey) {
        const dx = worldPos.x - drag.startWorld.x;
        const dy = worldPos.y - drag.startWorld.y;
        const length = Math.hypot(dx, dy);
        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        finalWorld = { x: drag.startWorld.x + Math.cos(angle) * length, y: drag.startWorld.y + Math.sin(angle) * length };
      }
      drag.currentWorld = finalWorld;
      renderLoopRef.current?.invalidate();
    } else if (activeTool === 'pen') {
      const pen = penStateRef.current;
      if (pen.pendingPoint && pen.pendingStart) {
        const distance = Math.hypot(worldPos.x - pen.pendingStart.x, worldPos.y - pen.pendingStart.y);
        const node: PathNode = {
          point: pen.pendingPoint,
          inHandle: distance > 3 ? { x: worldPos.x, y: worldPos.y } : null,
          outHandle: distance > 3 ? { x: pen.pendingStart.x - (worldPos.x - pen.pendingStart.x), y: pen.pendingStart.y - (worldPos.y - pen.pendingStart.y) } : null,
          kind: distance > 3 ? 'smooth' : 'corner',
        };
        pen.nodes = [...pen.nodes, node];
        pen.pendingPoint = null;
        pen.pendingStart = null;
        pen.pendingDragged = false;
        setPenVersion((version) => version + 1);
      }
    } else if (drag.type === 'move-object') {
      drag.currentWorld = worldPos;
      if (selectedObjectId && drag.initialObjectTransform) {
        const deltaWorld = {
          x: worldPos.x - drag.startWorld.x,
          y: worldPos.y - drag.startWorld.y,
        };
        const obj = doc.objects[selectedObjectId];
        if (obj) {
          setDragPreview({
            [selectedObjectId]: {
              ...obj.transform,
              position: {
                x: drag.initialObjectTransform.position.x + deltaWorld.x,
                y: drag.initialObjectTransform.position.y + deltaWorld.y,
              },
            },
          });
        }
      }
    } else if (drag.type === 'resize-object') {
      drag.currentWorld = worldPos;
    }
  };

  const finishInteraction = (e: React.PointerEvent) => {
    if (!dragStateRef.current && activeTool === 'pen') {
      const pen = penStateRef.current;
      if (pen.pendingPoint) {
        const point = pen.pendingDragged && pen.pendingStart ? pen.pendingStart : pen.pendingPoint;
        const handleDistance = pen.pendingDragged && pen.pendingStart ? Math.hypot(pen.pendingPoint.x - pen.pendingStart.x, pen.pendingPoint.y - pen.pendingStart.y) : 0;
        pen.nodes = [...pen.nodes, { point, inHandle: handleDistance > 3 ? pen.pendingPoint : null, outHandle: null, kind: handleDistance > 3 ? 'smooth' : 'corner' }];
        pen.pendingPoint = null;
        pen.pendingStart = null;
        setPenVersion((version) => version + 1);
      }
      return;
    }
    const drag = dragStateRef.current;
    if (!drag) return;

    try {
      (e.target as HTMLElement).releasePointerCapture(drag.pointerId);
    } catch {
      // Ignore if capture was already released
    }

    if (drag.type === 'create-shape') {
      const x = Math.min(drag.startWorld.x, drag.currentWorld.x);
      const y = Math.min(drag.startWorld.y, drag.currentWorld.y);
      const width = Math.abs(drag.currentWorld.x - drag.startWorld.x);
      const height = Math.abs(drag.currentWorld.y - drag.startWorld.y);

      // Only create if non-zero size
      if (drag.shape === 'line' ? Math.hypot(width, height) >= 2 : width >= 2 && height >= 2) {
        const newId = generateId();
        const common = {
          id: newId,
          name: `${drag.shape === 'ellipse' ? 'Ellipse' : drag.shape === 'line' ? 'Line' : 'Rectangle'} ${Object.keys(doc.objects).length + 1}`,
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
        };
        const object: RectangleObject | EllipseObject | LineObject = drag.shape === 'ellipse'
          ? { ...common, type: 'ellipse', transform: createTransform({ x, y }), style: defaultObjectStyle, width, height }
          : drag.shape === 'line'
          ? { ...common, type: 'line', transform: createTransform(drag.startWorld), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke }, endPoint: { x: drag.currentWorld.x - drag.startWorld.x, y: drag.currentWorld.y - drag.startWorld.y } }
          : { ...common, type: 'rectangle', transform: createTransform({ x, y }), style: defaultObjectStyle, width, height, cornerRadius: 0 };

        const cmd = new CreateObjectsCommand([object], doc.activeLayerId);
        onExecuteCommand(cmd);
        onSelectObject(newId);
      }
    } else if (drag.type === 'move-object') {
      if (selectedObjectId && drag.initialObjectTransform) {
        const obj = doc.objects[selectedObjectId];
        const preview = dragPreview[selectedObjectId];
        
        if (obj && preview) {
          const deltaX = Math.abs(preview.position.x - drag.initialObjectTransform.position.x);
          const deltaY = Math.abs(preview.position.y - drag.initialObjectTransform.position.y);

          if (deltaX > 0.5 || deltaY > 0.5) {
            const newTransforms = new Map([
              [selectedObjectId, preview],
            ]);
            const cmd = new TransformObjectsCommand([selectedObjectId], newTransforms);
            onExecuteCommand(cmd);
          }
        }
      }
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

    dragStateRef.current = null;
    renderLoopRef.current?.invalidate();
  };

  const cancelInteraction = () => {
    const drag = dragStateRef.current;
    if (!drag) return;

    if (drag.type === 'move-object' && selectedObjectId) {
      setDragPreview({});
    }

    dragStateRef.current = null;
    renderLoopRef.current?.invalidate();
  };

  const finishPen = useCallback((closed = false) => {
    const pen = penStateRef.current;
    if (pen.nodes.length < 2) {
      pen.nodes = [];
      pen.pendingPoint = null;
      setPenVersion((version) => version + 1);
      return;
    }
    const newId = generateId();
    const path: PathObject = {
      type: 'path', id: newId, name: `Path ${Object.keys(doc.objects).length + 1}`, layerId: doc.activeLayerId,
      visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }),
      style: { ...defaultObjectStyle, fill: closed ? defaultObjectStyle.fill : { type: 'none' }, stroke: defaultStroke },
      nodes: pen.nodes, closed,
    };
    onExecuteCommand(new CreateObjectsCommand([path], doc.activeLayerId));
    onSelectObject(newId);
    pen.nodes = [];
    pen.pendingPoint = null;
    pen.pendingStart = null;
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
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          e.preventDefault();
          const cmd = new DeleteObjectsCommand([selectedObjectId]);
          onExecuteCommand(cmd);
          onSelectObject(null);
        }
      } else if (e.key === 'Enter' && activeTool === 'pen') {
        finishPen(false);
      } else if (e.key === 'Escape') {
        cancelInteraction();
        penStateRef.current = { nodes: [], pendingPoint: null, pendingStart: null, pendingDragged: false };
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
  }, [selectedObjectId, onExecuteCommand, onSelectObject, activeTool, finishPen]);

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
