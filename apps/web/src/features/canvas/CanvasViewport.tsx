import React, { useRef, useEffect, useCallback } from 'react';
import type { Vec2 } from '@vectoria/shared';
import { generateId } from '@vectoria/shared';
import type {
  DocumentModel,
  ObjectId,
  RectangleObject,
  Command,
} from '@vectoria/core';
import {
  CreateObjectsCommand,
  TransformObjectsCommand,
  DeleteObjectsCommand,
  createTransform,
  defaultObjectStyle,
} from '@vectoria/core';
import { Camera, hitTest } from '@vectoria/editor-engine';
import {
  RenderLoop,
  resizeCanvas,
  renderBackground,
  renderScene,
  renderOverlay,
} from '@vectoria/renderer';
import type { ActiveTool } from '../toolbar/ToolRail.js';

export interface CanvasViewportProps {
  document: DocumentModel;
  activeTool: ActiveTool;
  selectedObjectId: ObjectId | null;
  camera: Camera;
  onExecuteCommand: (cmd: Command) => void;
  onSelectObject: (id: ObjectId | null) => void;
  onCursorMove: (worldPos: Vec2 | null) => void;
  onZoomChange: (zoomPercent: number) => void;
}

interface DragState {
  type: 'pan' | 'create-rect' | 'move-object';
  startScreen: Vec2;
  startWorld: Vec2;
  currentWorld: Vec2;
  pointerId: number;
  initialObjectTransform?: { position: Vec2 };
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const renderLoopRef = useRef<RenderLoop | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [dragPreview, setDragPreview] = React.useState<Record<string, import('@vectoria/core').Transform2D>>({});

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
      renderBackground(bgCtx, camera, activeArtboard, bgCanvas.width, bgCanvas.height);
    }

    renderScene(sceneCtx, camera, doc, sceneCanvas.width, sceneCanvas.height, {
      previewTransforms: dragPreview,
    });
    renderOverlay(overlayCtx, camera, doc, selectedIds, overlayCanvas.width, overlayCanvas.height, {
      previewTransforms: dragPreview
        ? new Map(Object.entries(dragPreview) as [string, import('@vectoria/core').Transform2D][])
        : undefined,
    });

    // Draw active creation drag preview on overlay if creating rect
    const drag = dragStateRef.current;
    if (drag && drag.type === 'create-rect') {
      const dpr = window.devicePixelRatio || 1;
      overlayCtx.save();
      overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      overlayCtx.translate(camera.pan.x, camera.pan.y);
      overlayCtx.scale(camera.zoom, camera.zoom);

      const x = Math.min(drag.startWorld.x, drag.currentWorld.x);
      const y = Math.min(drag.startWorld.y, drag.currentWorld.y);
      const w = Math.abs(drag.currentWorld.x - drag.startWorld.x);
      const h = Math.abs(drag.currentWorld.y - drag.startWorld.y);

      overlayCtx.strokeStyle = 'var(--color-accent)';
      overlayCtx.lineWidth = 1 / camera.zoom;
      overlayCtx.strokeRect(x, y, w, h);

      overlayCtx.fillStyle = 'rgba(92, 174, 255, 0.15)';
      overlayCtx.fillRect(x, y, w, h);

      overlayCtx.restore();
    }
  }, [doc, camera, selectedIds, dragPreview]);

  // Initialize render loop
  useEffect(() => {
    const loop = new RenderLoop(renderAll);
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
  }, [renderAll, onZoomChange]);

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
    const worldPos = camera.screenToWorld(screenPos);

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

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (activeTool === 'rectangle') {
      dragStateRef.current = {
        type: 'create-rect',
        startScreen: screenPos,
        startWorld: worldPos,
        currentWorld: worldPos,
        pointerId: e.pointerId,
      };
    } else if (activeTool === 'select') {
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
    const worldPos = camera.screenToWorld(screenPos);
    onCursorMove(worldPos);

    const drag = dragStateRef.current;
    if (!drag) return;

    if (drag.type === 'pan') {
      const deltaScreen = {
        x: screenPos.x - drag.startScreen.x,
        y: screenPos.y - drag.startScreen.y,
      };
      camera.panBy(deltaScreen);
      drag.startScreen = screenPos;
    } else if (drag.type === 'create-rect') {
      let finalWorld = worldPos;
      if (e.shiftKey) {
        // Force square 1:1 aspect ratio
        const dx = worldPos.x - drag.startWorld.x;
        const dy = worldPos.y - drag.startWorld.y;
        const size = Math.max(Math.abs(dx), Math.abs(dy));
        finalWorld = {
          x: drag.startWorld.x + (dx >= 0 ? size : -size),
          y: drag.startWorld.y + (dy >= 0 ? size : -size),
        };
      }
      drag.currentWorld = finalWorld;
      renderLoopRef.current?.invalidate();
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
    }
  };

  const finishInteraction = (e: React.PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag) return;

    try {
      (e.target as HTMLElement).releasePointerCapture(drag.pointerId);
    } catch {
      // Ignore if capture was already released
    }

    if (drag.type === 'create-rect') {
      const x = Math.min(drag.startWorld.x, drag.currentWorld.x);
      const y = Math.min(drag.startWorld.y, drag.currentWorld.y);
      const width = Math.abs(drag.currentWorld.x - drag.startWorld.x);
      const height = Math.abs(drag.currentWorld.y - drag.startWorld.y);

      // Only create if non-zero size
      if (width >= 2 && height >= 2) {
        const newId = generateId();
        const newRect: RectangleObject = {
          type: 'rectangle',
          id: newId,
          name: `Rectangle ${Object.keys(doc.objects).length + 1}`,
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x, y }),
          style: defaultObjectStyle,
          width,
          height,
          cornerRadius: 0,
        };

        const cmd = new CreateObjectsCommand([newRect], doc.activeLayerId);
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
      } else if (e.key === 'Escape') {
        cancelInteraction();
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
  }, [selectedObjectId, onExecuteCommand, onSelectObject]);

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
            : activeTool === 'rectangle'
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
