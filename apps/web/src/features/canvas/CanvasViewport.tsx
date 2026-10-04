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
import { Camera, DragSession, SelectTool, DirectSelectTool, PenTool, PencilTool, BrushTool, SmoothTool, CornerTool, EraserTool, KnifeTool, ScissorsTool, WidthTool, SnapService, IsolationService, LassoSession, InteractionLifecycleController, InteractionStateStore, calculateObjectSnap, ShapeTool, PolylineTool, EyedropperTool, PaintBucketTool, TextTool, TextEditSession, hitTolerancePx, routeCanvasKeyDown, routeCanvasKeyUp, type CanvasDragState, type CanvasTextEditKeyboardCommand, type GridSettings, type StyleSampleTarget, type InteractionLifecycleReason, shouldIgnoreKeydown, localResizeHandles, cornerRotationHandles, resizeObjectTransform, rotateObjectTransform } from '@vectoria/editor-engine';
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
  onExitTool: () => void;
  onTextEditingChange: (active: boolean) => void;
  showGrid?: boolean;
  snapToGrid?: boolean;
  gridSettings?: GridSettings;
  freehandSettings?: FreehandSettings;
  geometryPreview?: GeometryPreview | null;
  styleSampleTarget?: StyleSampleTarget;
  styleSampleTolerance?: number;
  outlineMode?: boolean;
  soloLayerId?: string | null;
  onDropFiles?: (files: FileList, worldPos: Vec2) => void;
  onDragPreviewChange?: (preview: Record<string, import('@vectoria/core').Transform2D>) => void;
  activeAnnotationId?: string | null;
  onSelectAnnotation?: (id: string) => void;
  onMoveAnnotationPin?: (id: string, newWorldPoint: Vec2) => void;
}

const DRAG_THRESHOLD_PX = 3;
const WIDTH_INTERACTION_ID = 'canvas.width';
const SMOOTH_INTERACTION_ID = 'canvas.smooth';
const TEXT_CREATE_INTERACTION_ID = 'canvas.text-create';
const TEXT_EDIT_INTERACTION_ID = 'canvas.text-edit';

interface ObjectHandleInfo {
  rotationHandle: Vec2;
  resizeHandles: { id: string; point: Vec2 }[];
  pivotWorld: Vec2;
  bounds: import('@vectoria/shared').Rect;
}

function getObjectHandles(
  object: SceneObject,
  camera: Camera,
  doc: DocumentModel
): ObjectHandleInfo {
  const bounds = getObjectBounds({ ...object, transform: createTransform({ x: 0, y: 0 }) }, doc);
  const matrix = getTransformMatrix(object.transform);
  const toScreen = (point: Vec2) => camera.worldToScreen(mat3TransformPoint(matrix, point));
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const pivotWorld = mat3TransformPoint(matrix, center);
  const resizeHandles = localResizeHandles(bounds).map(({ id, point }) => ({ id, point: toScreen(point) }));
  const top = toScreen({ x: center.x, y: bounds.y });
  const screenCenter = camera.worldToScreen(pivotWorld);
  const distance = Math.hypot(top.x - screenCenter.x, top.y - screenCenter.y) || 1;
  const rotationHandle = { x: top.x + (top.x - screenCenter.x) / distance * 20, y: top.y + (top.y - screenCenter.y) / distance * 20 };
  return { rotationHandle, resizeHandles, pivotWorld, bounds };
}

const ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22' fill='none'%3E%3Cpath d='M11 3 A 7 7 0 0 1 18 10 M 18 6 L 18 10 L 14 10' stroke='%23ffffff' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M11 3 A 7 7 0 0 1 18 10 M 18 6 L 18 10 L 14 10' stroke='%23000000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M11 19 A 7 7 0 0 1 4 12 M 4 16 L 4 12 L 8 12' stroke='%23ffffff' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M11 19 A 7 7 0 0 1 4 12 M 4 16 L 4 12 L 8 12' stroke='%23000000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 11 11, crosshair`;

function getResizeCursor(screenPoint: Vec2, centerScreen: Vec2): string {
  let deg = Math.atan2(screenPoint.y - centerScreen.y, screenPoint.x - centerScreen.x) * (180 / Math.PI);
  if (deg < 0) deg += 360;
  deg = deg % 180;
  if (deg >= 22.5 && deg < 67.5) return 'nwse-resize';
  if (deg >= 67.5 && deg < 112.5) return 'ns-resize';
  if (deg >= 112.5 && deg < 157.5) return 'nesw-resize';
  return 'ew-resize';
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

function gradientHandles(object: SceneObject): readonly { id: CanvasDragState['gradientHandle']; point: Vec2 }[] {
  if (object.style.fill.type !== 'linear-gradient' && object.style.fill.type !== 'radial-gradient' && object.style.fill.type !== 'angular-gradient') return [];
  const matrix = getTransformMatrix(object.transform);
  const toWorld = (point: Vec2): Vec2 => mat3TransformPoint(matrix, point);
  const fill = object.style.fill;
  if (fill.type === 'linear-gradient') return [{ id: 'start', point: toWorld(fill.start) }, { id: 'end', point: toWorld(fill.end) }];
  if (fill.type === 'radial-gradient') return [{ id: 'center', point: toWorld(fill.center) }, { id: 'radius', point: toWorld({ x: fill.center.x + fill.radius, y: fill.center.y }) }];
  return [{ id: 'center', point: toWorld(fill.center) }, { id: 'angle', point: toWorld({ x: fill.center.x + 24, y: fill.center.y }) }];
}

function gradientHandleAt(object: SceneObject, camera: Camera, screenPoint: Vec2): CanvasDragState['gradientHandle'] {
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

function updateGradientFill(style: import('@vectoria/core').ObjectStyle, handle: NonNullable<CanvasDragState['gradientHandle']>, transform: import('@vectoria/core').Transform2D, worldPoint: Vec2): import('@vectoria/core').FillStyle | null {
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
  onExitTool,
  onTextEditingChange,
  showGrid = true,
  snapToGrid = false,
  gridSettings = { visible: true, size: 10, subdivisions: 1 },
  freehandSettings = { smoothing: 20, accuracy: 75, width: 4, pressure: true, cap: 'round', join: 'round', eraserRadius: 12 },
  geometryPreview = null,
  styleSampleTarget = 'style',
  styleSampleTolerance = 0,
  outlineMode = false,
  soloLayerId = null,
  onDropFiles,
  onDragPreviewChange,
  activeAnnotationId,
  onSelectAnnotation,
  onMoveAnnotationPin,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const renderLoopRef = useRef<RenderLoop | null>(null);
  const qualityPolicyRef = useRef<RenderQualityPolicy | null>(null);
  if (!qualityPolicyRef.current) qualityPolicyRef.current = new RenderQualityPolicy({ onChange: () => renderLoopRef.current?.invalidate() });
  const renderAllRef = useRef<() => void>(() => undefined);
  const interactionStateRef = useRef<InteractionStateStore | null>(null);
  if (!interactionStateRef.current) interactionStateRef.current = new InteractionStateStore();
  const interactionState = interactionStateRef.current;
  const interactionLifecycleRef = useRef<InteractionLifecycleController | null>(null);
  if (!interactionLifecycleRef.current) interactionLifecycleRef.current = new InteractionLifecycleController();
  const previousActiveToolRef = useRef(activeTool);
  const snapServiceRef = useRef(new SnapService());
  const isolationRef = useRef(new IsolationService());
  const [isolationVersion, setIsolationVersion] = React.useState(0);
  const lastGroupPickRef = useRef<{ id: ObjectId; timestamp: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const dragPreviewRef = React.useRef<Record<string, import('@vectoria/core').Transform2D>>({});
  const stylePreviewRef = React.useRef<Record<string, import('@vectoria/core').ObjectStyle>>({});
  const pathPreviewRef = React.useRef<Record<string, readonly import('@vectoria/core').PathNode[]>>({});

  const [dragPreview, setDragPreview] = React.useState<Record<string, import('@vectoria/core').Transform2D>>({});
  const updateDragPreview = React.useCallback(
    (preview: Record<string, import('@vectoria/core').Transform2D>) => {
      dragPreviewRef.current = preview;
      setDragPreview(preview);
      onDragPreviewChange?.(preview);
    },
    [onDragPreviewChange]
  );
  const [hoverHandleCursor, setHoverHandleCursor] = React.useState<string | null>(null);
  const [stylePreview, setStylePreview] = React.useState<Record<string, import('@vectoria/core').ObjectStyle>>({});
  const updateStylePreview = React.useCallback(
    (preview: Record<string, import('@vectoria/core').ObjectStyle>) => {
      stylePreviewRef.current = preview;
      setStylePreview(preview);
    },
    []
  );
  const [pathPreview, setPathPreview] = React.useState<Record<string, readonly import('@vectoria/core').PathNode[]>>({});
  const updatePathPreview = React.useCallback(
    (preview: Record<string, readonly import('@vectoria/core').PathNode[]>) => {
      pathPreviewRef.current = preview;
      setPathPreview(preview);
    },
    []
  );
  const [cornerPreview, setCornerPreview] = React.useState<import('@vectoria/core').GeometryPreview | null>(null);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [pinDragScreenPos, setPinDragScreenPos] = useState<Vec2 | null>(null);

  // Active pointers for pinch-to-zoom (UX-014)
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);

  // Keyboard Nudge burst accumulator (UX-001)
  const nudgeBurstRef = useRef<{
    initialTransforms: Map<ObjectId, import('@vectoria/core').Transform2D>;
    accumulatedDelta: Vec2;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const commitNudgeBurst = useCallback(() => {
    if (!nudgeBurstRef.current) return;
    const { initialTransforms, accumulatedDelta, timer } = nudgeBurstRef.current;
    if (timer) clearTimeout(timer);
    nudgeBurstRef.current = null;
    updateDragPreview({});

    if (accumulatedDelta.x === 0 && accumulatedDelta.y === 0) return;

    const newTransforms = new Map<ObjectId, import('@vectoria/core').Transform2D>();
    const objectIds: ObjectId[] = [];

    for (const [id, initialTransform] of initialTransforms) {
      objectIds.push(id);
      newTransforms.set(id, {
        ...initialTransform,
        position: {
          x: initialTransform.position.x + accumulatedDelta.x,
          y: initialTransform.position.y + accumulatedDelta.y,
        },
      });
    }

    if (objectIds.length > 0) {
      onExecuteCommand(new TransformObjectsCommand(objectIds, newTransforms));
    }
  }, [onExecuteCommand, updateDragPreview]);

  const queueNudge = useCallback(
    (key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown', shiftKey: boolean) => {
      if (selectedObjectIds.length === 0) return;

      const step = shiftKey ? 10 : 1;
      const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
      const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0;

      if (!nudgeBurstRef.current) {
        const initials = new Map<ObjectId, import('@vectoria/core').Transform2D>();
        for (const id of selectedObjectIds) {
          const obj = doc.objects[id];
          if (obj && !obj.locked) {
            initials.set(id, obj.transform);
          }
        }
        nudgeBurstRef.current = {
          initialTransforms: initials,
          accumulatedDelta: { x: 0, y: 0 },
          timer: null,
        };
      }

      if (nudgeBurstRef.current.timer) {
        clearTimeout(nudgeBurstRef.current.timer);
      }

      nudgeBurstRef.current.accumulatedDelta = {
        x: nudgeBurstRef.current.accumulatedDelta.x + dx,
        y: nudgeBurstRef.current.accumulatedDelta.y + dy,
      };

      const preview: Record<string, import('@vectoria/core').Transform2D> = {};
      for (const [id, initialTransform] of nudgeBurstRef.current.initialTransforms) {
        preview[id] = {
          ...initialTransform,
          position: {
            x: initialTransform.position.x + nudgeBurstRef.current.accumulatedDelta.x,
            y: initialTransform.position.y + nudgeBurstRef.current.accumulatedDelta.y,
          },
        };
      }
      updateDragPreview(preview);
      renderLoopRef.current?.invalidate();

      nudgeBurstRef.current.timer = setTimeout(() => {
        commitNudgeBurst();
      }, 300);
    },
    [selectedObjectIds, doc.objects, updateDragPreview, commitNudgeBurst]
  );
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
  const lastClickRef = useRef<{ point: Vec2; time: number } | null>(null);
  const hoveredObjectIdRef = useRef<string | null>(null);
  const altKeyRef = useRef<boolean>(false);
  const [freehandVersion, setFreehandVersion] = React.useState(0);

  const cancelWidthInteraction = useCallback((reason: InteractionLifecycleReason) => {
    widthToolRef.current?.cancel();
    widthStartScreenRef.current = null;
    if (freehandOperationRef.current === 'width') freehandOperationRef.current = null;
    interactionState.freehandCursor = null;
    qualityPolicyRef.current?.endInteraction();
    if (reason !== 'dispose') {
      setFreehandVersion((version) => version + 1);
      renderLoopRef.current?.invalidate();
    }
  }, []);

  const cancelSmoothInteraction = useCallback((reason: InteractionLifecycleReason) => {
    smoothStartScreenRef.current = null;
    if (freehandOperationRef.current === 'smooth') freehandOperationRef.current = null;
    interactionState.freehandCursor = null;
    pathPreviewRef.current = {};
    qualityPolicyRef.current?.endInteraction();
    if (reason !== 'dispose') {
      setPathPreview({});
      setFreehandVersion((version) => version + 1);
      renderLoopRef.current?.invalidate();
    }
  }, []);

  const cancelTextCreateInteraction = useCallback((reason: InteractionLifecycleReason) => {
    textToolRef.current?.cancel();
    if (interactionState.drag?.type === 'text-create') interactionState.drag = null;
    qualityPolicyRef.current?.endInteraction();
    if (reason !== 'dispose') renderLoopRef.current?.invalidate();
  }, []);

  const cancelTextEditInteraction = useCallback((reason: InteractionLifecycleReason) => {
    textEditSessionRef.current = null;
    onTextEditingChange(false);
    if (reason !== 'dispose') {
      setTextEditVersion((version) => version + 1);
      renderLoopRef.current?.invalidate();
    }
  }, [onTextEditingChange]);

  const beginTextEditSession = useCallback((session: TextEditSession) => {
    interactionLifecycleRef.current?.complete(TEXT_EDIT_INTERACTION_ID);
    textEditSessionRef.current = session;
    onTextEditingChange(true);
    interactionLifecycleRef.current?.register({
      id: TEXT_EDIT_INTERACTION_ID,
      cancel: cancelTextEditInteraction,
    });
    setTextEditVersion((version) => version + 1);
    renderLoopRef.current?.invalidate();
  }, [cancelTextEditInteraction, onTextEditingChange]);

  useEffect(() => () => {
    interactionLifecycleRef.current?.cancelAll('dispose');
    qualityPolicyRef.current?.dispose();
  }, []);

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
      outlineMode,
      soloLayerId,
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
      marquee: interactionState.drag?.type === 'marquee' ? {
        start: interactionState.drag.startWorld,
        end: interactionState.drag.currentWorld,
      } : undefined,
      lasso: interactionState.lasso ? interactionState.lasso.polygon : undefined,
      snap: interactionState.snap?.snapped ? interactionState.snap : undefined,
      objectSnap: interactionState.objectSnap ?? undefined,
      smartDistance: (() => {
        const drag = interactionState.drag;
        if (!drag && altKeyRef.current && selectedIds.size > 0 && hoveredObjectIdRef.current && !selectedIds.has(hoveredObjectIdRef.current)) {
          const hoveredObj = doc.objects[hoveredObjectIdRef.current];
          const selectedId = [...selectedIds][0];
          const selectedObj = selectedId ? doc.objects[selectedId] : undefined;
          if (hoveredObj && selectedObj) {
             const selectionBounds = getObjectBounds(selectedObj, doc);
             const hoverBounds = getObjectBounds(hoveredObj, doc);
             return { point: interactionState.freehandCursor ?? { x: 0, y: 0 }, dx: 0, dy: 0, hover: { selectionBounds, hoverBounds } };
          }
        }
        return undefined;
      })(),
    });

    // Draw active creation drag preview on overlay.
    const drag = interactionState.drag;
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
    const eraserPreview = activeTool === 'eraser' && interactionState.freehandCursor && eraserToolRef.current ? { point: interactionState.freehandCursor, radiusPx: eraserToolRef.current.radiusPx } : undefined;
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
    if (activeTool === 'text' && interactionState.drag?.type === 'text-create') {
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
  }, [doc, camera, selectedIds, dragPreview, stylePreview, pathPreview, geometryPreview, cornerPreview, activeTool, penVersion, polylineVersion, freehandVersion, freehandSettings, showGrid, gridSettings, selection, selectedObjectId, selectedObjectIds, textEditVersion, outlineMode, soloLayerId]);

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
  }, [doc, selectedIds, dragPreview, stylePreview, pathPreview, selection, activeTool, penVersion, polylineVersion, freehandVersion, textEditVersion]);

  // Invalidate render loop on theme changes (UX / Motyw refresh)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => renderLoopRef.current?.invalidate());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

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
    interactionState.snap = result;
    return result.worldPoint;
  };

  const commitTextEdit = useCallback(() => {
    const session = textEditSessionRef.current;
    if (!session) return;
    interactionLifecycleRef.current?.complete(TEXT_EDIT_INTERACTION_ID);
    const object = doc.objects[session.targetObjectId];
    if (object && (object.type === 'text' || object.type === 'text-frame') && session.text !== object.text) {
      onExecuteCommand(new SetTextContentCommand(session.targetObjectId, session.text));
    }
    textEditSessionRef.current = null;
    onTextEditingChange(false);
    setTextEditVersion((version) => version + 1);
  }, [doc, onExecuteCommand, onTextEditingChange]);

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
    interactionState.snap = null;
  };

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    qualityPolicyRef.current?.beginInteraction();
    const screenPos = getPointerScreen(e);
    const worldPos = snapWorldPoint(camera.screenToWorld(screenPos));

    // Track pointer for pinch-to-zoom (UX-014)
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointersRef.current.size === 2) {
      const [a, b] = [...activePointersRef.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const center = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
      pinchRef.current = { dist, center };
      interactionState.drag = null;
      updateDragPreview({});
      return;
    }

    // Stylus eraser tip detection (UX-012)
    const isStylusEraser = e.pointerType === 'pen' && (e.buttons === 32 || (e as unknown as { button?: number }).button === 5);
    const effectiveTool: ActiveTool = isStylusEraser ? 'eraser' : activeTool;

    // Pan via middle button or Space key
    if (e.button === 1 || isSpacePressed || effectiveTool === 'hand') {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      interactionState.drag = {
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
    if (textEditSessionRef.current && effectiveTool !== 'text') {
      const activeSession = textEditSessionRef.current;
      const activeObject = doc.objects[activeSession.targetObjectId];
      const activeInverse = activeObject && (activeObject.type === 'text' || activeObject.type === 'text-frame') ? getInverseTransformMatrix(activeObject.transform) : null;
      const activeLocalPoint = activeInverse ? mat3TransformPoint(activeInverse, worldPos) : null;
      const activeHit = selectTool.pick({ document: doc, selection, screenPoint: screenPos, worldPoint: worldPos, zoom: camera.zoom }).hit;
      if (activeObject && (activeObject.type === 'text' || activeObject.type === 'text-frame') && activeHit?.objectId === activeSession.targetObjectId && activeLocalPoint) {
        const caret = textCaretAt(activeObject, activeLocalPoint);
        activeSession.setSelection(caret, caret);
        interactionState.drag = { type: 'text-select', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId, objectIds: [activeSession.targetObjectId], textAnchor: caret };
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
      interactionState.drag = {
        type: 'text-create',
        startScreen: screenPos,
        startWorld: worldPos,
        currentWorld: worldPos,
        pointerId: e.pointerId,
      };
      interactionLifecycleRef.current?.register({
        id: TEXT_CREATE_INTERACTION_ID,
        cancel: cancelTextCreateInteraction,
      });
      renderLoopRef.current?.invalidate();
      return;
    }

    if (activeTool === 'zoom') {
      camera.zoomAtPoint(1.25, screenPos);
      return;
    }

    if (activeTool === 'node-lasso' && (!selectedObjectId || doc.objects[selectedObjectId]?.type !== 'path')) return;

    if (activeTool === 'lasso' || activeTool === 'node-lasso') {
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      interactionState.drag = { type: activeTool, startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId };
      interactionState.lasso = new LassoSession(worldPos);
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
      interactionState.drag = { type: 'style-sample', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId, styleTool: activeTool };
      renderLoopRef.current?.invalidate();
      return;
    }

    if (effectiveTool === 'pencil' || effectiveTool === 'brush' || effectiveTool === 'eraser' || effectiveTool === 'knife') {
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic or already-captured pointer */ }
      freehandOperationRef.current = effectiveTool;
      if (effectiveTool === 'pencil') pencilToolRef.current?.pointerDown({ screenPoint: screenPos, worldPoint: worldPos, pressure: freehandSettings.pressure ? e.pressure : 1, time: e.timeStamp });
      if (effectiveTool === 'brush') brushToolRef.current?.pointerDown({ screenPoint: screenPos, worldPoint: worldPos, pressure: freehandSettings.pressure ? e.pressure : 1, time: e.timeStamp });
      if (effectiveTool === 'eraser') { eraserToolRef.current!.radiusPx = freehandSettings.eraserRadius; eraserToolRef.current?.pointerDown(worldPos); }
      if (effectiveTool === 'knife') knifeToolRef.current?.pointerDown(worldPos);
      interactionState.freehandCursor = worldPos;
      setFreehandVersion((version) => version + 1);
      renderLoopRef.current?.invalidate();
      return;
    }

    if (effectiveTool === 'scissors') {
      freehandOperationRef.current = 'scissors';
      interactionState.freehandCursor = worldPos;
      setFreehandVersion((version) => version + 1);
      renderLoopRef.current?.invalidate();
      return;
    }

    if (effectiveTool === 'width') {
      const selectedPath = selectedObjectId ? doc.objects[selectedObjectId] : null;
      if (selectedPath?.type === 'path') {
        const nearest = selectNearestPathPoint(selectedPath, worldPos);
        if (nearest) {
          try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
          freehandOperationRef.current = 'width';
          widthStartScreenRef.current = screenPos;
          widthToolRef.current?.pointerDown(selectedPath, nearest.point, nearest.t);
          interactionLifecycleRef.current?.register({
            id: WIDTH_INTERACTION_ID,
            cancel: cancelWidthInteraction,
          });
          setFreehandVersion((version) => version + 1);
        }
      }
      return;
    }

    if (effectiveTool === 'smooth') {
      const selectedPath = selectedObjectId ? doc.objects[selectedObjectId] : null;
      if (selectedPath?.type === 'path') {
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
        freehandOperationRef.current = 'smooth';
        smoothStartScreenRef.current = screenPos;
        updatePathPreview({ [selectedPath.id]: smoothToolRef.current!.previewPath(selectedPath, freehandSettings.smoothing).nodes });
        interactionLifecycleRef.current?.register({
          id: SMOOTH_INTERACTION_ID,
          cancel: cancelSmoothInteraction,
        });
        setFreehandVersion((version) => version + 1);
      }
      return;
    }

    if (effectiveTool === 'corner') {
      const selectedPath = selectedObjectId ? doc.objects[selectedObjectId] : null;
      if (selectedPath?.type === 'path') {
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
        cornerStartScreenRef.current = screenPos;
        setCornerPreview(cornerToolRef.current?.start(doc, selectedPath.id) ?? null);
      }
      return;
    }

    // Pen owns its draft state; pointer capture loss must not cancel completed nodes.
    if (effectiveTool !== 'pen') (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (effectiveTool === 'select' && selectedObjectId && selectedObjectIds.length === 1) {
      const selected = doc.objects[selectedObjectId];
      const handle = selected && !selected.locked ? gradientHandleAt(selected, camera, screenPos) : undefined;
      if (selected && handle) {
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
        interactionState.drag = { type: 'gradient-handle', gradientHandle: handle, startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId, objectIds: [selected.id], initialStyle: selected.style };
        return;
      }
    }

    if (effectiveTool === 'pen') {
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
    } else if (isDragShapeTool(effectiveTool)) {
      const tool = new ShapeTool(effectiveTool);
      shapeToolRef.current = tool;
      tool.pointerDown({ screenPoint: screenPos, worldPoint: worldPos, shiftKey: e.shiftKey, altKey: e.altKey });
      interactionState.drag = {
        type: 'create-shape',
        shape: effectiveTool,
        startScreen: screenPos,
        startWorld: worldPos,
        currentWorld: worldPos,
        pointerId: e.pointerId,
      };
    } else if (effectiveTool === 'polyline') {
      const result = polylineToolRef.current?.pointerDown({ screenPoint: screenPos, worldPoint: worldPos, shiftKey: e.shiftKey, altKey: e.altKey });
      if (result?.type === 'commit') commitPolyline(result.points);
      setPolylineVersion((version) => version + 1);
    } else if (effectiveTool === 'direct-select') {
      const handleHit = directSelect.hitHandle(doc, worldPos, camera.zoom, selectedObjectId ?? undefined, hitTolerancePx(e.pointerType, 8));
      if (handleHit?.part?.endsWith('handle')) {
        const object = doc.objects[handleHit.objectId];
        const side = handleHit.part === 'in-handle' ? 'in' : 'out';
        if (object?.type === 'path') {
          onSelectSelection?.({ objectIds: [object.id], nodeIds: [`${object.id}:${handleHit.nodeIndex}`], mode: 'node' });
          interactionState.drag = {
            type: 'move-handle', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos,
            pointerId: e.pointerId, objectIds: [object.id], nodeIndex: handleHit.nodeIndex, handleSide: side, initialNodes: object.nodes,
          };
        }
        return;
      }
      const nodeHit = directSelect.hitNode(doc, worldPos, camera.zoom, hitTolerancePx(e.pointerType, 8));
      const nextSelection = directSelect.select(selection, nodeHit, e.shiftKey);
      onSelectSelection?.(nextSelection);
      if (nodeHit) {
        const object = doc.objects[nodeHit.objectId];
        if (object?.type === 'path') {
          interactionState.drag = {
            type: 'move-node', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos,
            pointerId: e.pointerId, objectIds: [object.id], nodeIndex: nodeHit.nodeIndex, initialNodes: object.nodes,
          };
        }
      }
    } else if (effectiveTool === 'select') {
      const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
      if (selected) {
        const { rotationHandle, resizeHandles, pivotWorld, bounds } = getObjectHandles(selected, camera, doc);
        if ([rotationHandle, ...cornerRotationHandles(resizeHandles, camera.worldToScreen(pivotWorld))].some((point) => Math.hypot(screenPos.x - point.x, screenPos.y - point.y) <= hitTolerancePx(e.pointerType, 10))) {
          try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* capture failed */ }
          setHoverHandleCursor(ROTATE_CURSOR);
          interactionState.drag = {
            type: 'rotate-object',
            startScreen: screenPos,
            startWorld: worldPos,
            currentWorld: worldPos,
            pointerId: e.pointerId,
            objectIds: [selected.id],
            initialTransforms: { [selected.id]: selected.transform },
            initialTransform: selected.transform,
            pivotWorld,
            initialBounds: bounds,
          };
          return;
        }
        const hitResize = resizeHandles.find(
          (h) => Math.hypot(screenPos.x - h.point.x, screenPos.y - h.point.y) <= hitTolerancePx(e.pointerType, 12)
        );
        if (hitResize) {
          try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* capture failed */ }
          const centerScreen = camera.worldToScreen(pivotWorld);
          setHoverHandleCursor(getResizeCursor(hitResize.point, centerScreen));
          interactionState.drag = {
            type: 'resize-object',
            startScreen: screenPos,
            startWorld: worldPos,
            currentWorld: worldPos,
            pointerId: e.pointerId,
            objectIds: [selected.id],
            initialSize: { width: bounds.width, height: bounds.height },
            initialBounds: bounds,
            handleId: hitResize.id,
            initialTransform: selected.transform,
            pivotWorld,
          };
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
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* capture failed */ }
        onSelectSelection?.(picked.selection);
        const dragIds = picked.selection.objectIds;
        const obj = doc.objects[hit.objectId];
        if (dragIds.length === 0) return;
        interactionState.drag = {
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
        interactionState.dragSession = new DragSession({ objectIds: dragIds, initialTransforms: interactionState.drag.initialTransforms ?? {}, initialBounds: firstBounds, pivotWorld: { x: firstBounds.x + firstBounds.width / 2, y: firstBounds.y + firstBounds.height / 2 }, operation: 'move' }, worldPos);
      } else {
        if (e.altKey) {
          interactionState.drag = { type: 'lasso', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId };
          interactionState.lasso = new LassoSession(worldPos);
        } else {
          interactionState.drag = { type: 'marquee', startScreen: screenPos, startWorld: worldPos, currentWorld: worldPos, pointerId: e.pointerId };
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Pinch-to-zoom handling for 2 active pointers (UX-014)
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (activePointersRef.current.size === 2) {
      const [a, b] = [...activePointersRef.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const center = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && pinchRef.current && pinchRef.current.dist > 0) {
        const factor = dist / pinchRef.current.dist;
        const centerScreen = { x: center.x - rect.left, y: center.y - rect.top };
        camera.zoomAtPoint(factor, centerScreen);
        camera.panBy({ x: center.x - pinchRef.current.center.x, y: center.y - pinchRef.current.center.y });
        renderLoopRef.current?.invalidate();
      }
      pinchRef.current = { dist, center };
      return;
    }

    const screenPos = getPointerScreen(e);
    const rawWorldPos = camera.screenToWorld(screenPos);
    const drag = interactionState.drag;
    const isSnapKeyDown = e.ctrlKey || e.metaKey;
    const worldPos = (snapToGrid || isSnapKeyDown) && !drag ? snapWorldPoint(rawWorldPos) : rawWorldPos;
    onCursorMove(worldPos);

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
    interactionState.freehandCursor = worldPos;

    if (!drag && activeTool === 'select' && selectedObjectId) {
      const selected = doc.objects[selectedObjectId];
      if (selected) {
        const { rotationHandle, resizeHandles, pivotWorld } = getObjectHandles(selected, camera, doc);
        if ([rotationHandle, ...cornerRotationHandles(resizeHandles, camera.worldToScreen(pivotWorld))].some((point) => Math.hypot(screenPos.x - point.x, screenPos.y - point.y) <= hitTolerancePx(e.pointerType, 10))) {
          if (hoverHandleCursor !== ROTATE_CURSOR) setHoverHandleCursor(ROTATE_CURSOR);
        } else {
          const hitResize = resizeHandles.find(
            (h) => Math.hypot(screenPos.x - h.point.x, screenPos.y - h.point.y) <= hitTolerancePx(e.pointerType, 12)
          );
          if (hitResize) {
            const centerScreen = camera.worldToScreen(pivotWorld);
            const cursor = getResizeCursor(hitResize.point, centerScreen);
            if (hoverHandleCursor !== cursor) setHoverHandleCursor(cursor);
          } else if (hoverHandleCursor) {
            setHoverHandleCursor(null);
          }
        }
      } else if (hoverHandleCursor) {
        setHoverHandleCursor(null);
      }
    } else if (!drag && hoverHandleCursor) {
      setHoverHandleCursor(null);
    }

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
        if (fill) updateStylePreview({ [object.id]: { ...drag.initialStyle, fill } });
      }
      drag.currentWorld = worldPos;
      renderLoopRef.current?.invalidate();
      return;
    }

    if (drag?.type === 'text-select' && drag.objectIds?.[0]) {
      const object = doc.objects[drag.objectIds[0]];
      if (object && (object.type === 'text' || object.type === 'text-frame') && drag.textAnchor !== undefined) {
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
          updatePathPreview({ [object.id]: smoothToolRef.current!.previewPath(object, amount).nodes });
        }
      }
      setFreehandVersion((version) => version + 1);
      renderLoopRef.current?.invalidate();
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
      if ((drag.type === 'lasso' || drag.type === 'node-lasso') && interactionState.lasso) {
        interactionState.lasso.update(worldPos);
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
      updatePathPreview({ [objectId]: nodes });
    } else if (drag.type === 'move-object') {
      const screenDist = Math.hypot(screenPos.x - drag.startScreen.x, screenPos.y - drag.startScreen.y);
      if (screenDist < DRAG_THRESHOLD_PX) {
        return;
      }
      drag.currentWorld = rawWorldPos;
      interactionState.dragSession?.update(rawWorldPos);
      if (drag.objectIds && drag.initialTransforms) {
        let deltaWorld = { x: rawWorldPos.x - drag.startWorld.x, y: rawWorldPos.y - drag.startWorld.y };
        
        // Smart object snap only when Ctrl is held (Decyzja 3)
        if (isSnapKeyDown && interactionState.dragSession) {
          const dragRect = {
            x: interactionState.dragSession.transform.initialBounds.x + deltaWorld.x,
            y: interactionState.dragSession.transform.initialBounds.y + deltaWorld.y,
            width: interactionState.dragSession.transform.initialBounds.width,
            height: interactionState.dragSession.transform.initialBounds.height,
          };
          const snap = calculateObjectSnap(dragRect, doc, new Set(drag.objectIds), doc.snap.tolerancePx, camera.zoom);
          if (snap.snappedX || snap.snappedY) {
            interactionState.objectSnap = snap;
            deltaWorld = { x: deltaWorld.x + snap.dx, y: deltaWorld.y + snap.dy };
          } else {
            interactionState.objectSnap = null;
          }
        } else {
          interactionState.objectSnap = null;
        }

        const preview: Record<string, import('@vectoria/core').Transform2D> = {};
        for (const objectId of drag.objectIds) {
          const initial = drag.initialTransforms[objectId];
          if (!initial) continue;
          preview[objectId] = { ...initial, position: { x: initial.position.x + deltaWorld.x, y: initial.position.y + deltaWorld.y } };
        }
        updateDragPreview(preview);
      }
    } else if (drag.type === 'rotate-object' && drag.initialTransform && drag.initialBounds) {
      const bounds = drag.initialBounds;
      const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      const objectId = drag.objectIds?.[0];
      if (objectId) updateDragPreview({ [objectId]: rotateObjectTransform(drag.initialTransform, center, drag.startWorld, rawWorldPos, e.shiftKey) });
      drag.currentWorld = rawWorldPos;
    } else if (drag.type === 'resize-object' && drag.objectIds?.[0] && drag.initialTransform && drag.initialBounds && drag.handleId) {
      drag.currentWorld = rawWorldPos;
      const handle = localResizeHandles(drag.initialBounds).find(({ id }) => id === drag.handleId);
      if (handle) updateDragPreview({ [drag.objectIds[0]]: resizeObjectTransform(drag.initialTransform, drag.initialBounds, handle.id, drag.startWorld, rawWorldPos, e.shiftKey) });
    }
  };

  const finishInteraction = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    const freehandOperation = freehandOperationRef.current;
    if (freehandOperation) {
      const screenPoint = getPointerScreen(e);
      const point = snapWorldPoint(camera.screenToWorld(screenPoint));
      interactionState.freehandCursor = point;
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
        interactionLifecycleRef.current?.complete(WIDTH_INTERACTION_ID);
        const object = selectedObjectId ? doc.objects[selectedObjectId] : null;
        const profile = widthToolRef.current?.pointerUp() ?? [];
        if (object?.type === 'path' && profile.length > 0) onExecuteCommand(new SetPathWidthCommand(object.id, profile));
      } else if (freehandOperation === 'smooth') {
        interactionLifecycleRef.current?.complete(SMOOTH_INTERACTION_ID);
        const object = selectedObjectId ? doc.objects[selectedObjectId] : null;
        const nodes = object?.type === 'path' ? pathPreviewRef.current[object.id] : undefined;
        if (object?.type === 'path' && nodes) onExecuteCommand(new SetPathGeometryCommand(object.id, { nodes }));
        updatePathPreview({});
      }
      eraserToolRef.current?.cancel();
      knifeToolRef.current?.cancel();
      widthToolRef.current?.cancel();
      smoothStartScreenRef.current = null;
      freehandOperationRef.current = null;
      widthStartScreenRef.current = null;
      interactionState.freehandCursor = null;
      updatePathPreview({});
      setFreehandVersion((version) => version + 1);
      qualityPolicyRef.current?.endInteraction();
      return;
    }
    if (!interactionState.drag && activeTool === 'corner') {
      const command = cornerToolRef.current?.apply();
      if (command) onExecuteCommand(command);
      cornerStartScreenRef.current = null;
      setCornerPreview(null);
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* capture may already be released */ }
      qualityPolicyRef.current?.endInteraction();
      return;
    }
    if (!interactionState.drag && activeTool === 'pen') {
      const screenPoint = getPointerScreen(e);
      const result = penToolRef.current?.pointerUp({ screenPoint, worldPoint: snapWorldPoint(camera.screenToWorld(screenPoint)), shiftKey: e.shiftKey, altKey: e.altKey });
      if (result?.type === 'commit') commitPen(result.nodes, result.closed);
      setPenVersion((version) => version + 1);
      qualityPolicyRef.current?.endInteraction();
      return;
    }
    const drag = interactionState.drag;
    if (!drag) {
      qualityPolicyRef.current?.endInteraction();
      return;
    }

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
      interactionState.drag = null;
      renderLoopRef.current?.invalidate();
      qualityPolicyRef.current?.endInteraction();
      return;
    }

    if (drag.type === 'gradient-handle' && drag.objectIds?.[0]) {
      const objectId = drag.objectIds[0];
      const preview = stylePreviewRef.current[objectId];
      if (preview) onExecuteCommand(new SetObjectStyleCommand([objectId], preview));
      updateStylePreview({});
      interactionState.drag = null;
      renderLoopRef.current?.invalidate();
      qualityPolicyRef.current?.endInteraction();
      return;
    }

    if (drag.type === 'marquee' || drag.type === 'lasso' || drag.type === 'node-lasso') {
      const dx = drag.currentWorld.x - drag.startWorld.x;
      const dy = drag.currentWorld.y - drag.startWorld.y;
      if (drag.type !== 'marquee' || Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        let nextSelection = selection;
        if (drag.type === 'marquee') {
          const area = {
            x: Math.min(drag.startWorld.x, drag.currentWorld.x),
            y: Math.min(drag.startWorld.y, drag.currentWorld.y),
            width: Math.abs(dx),
            height: Math.abs(dy),
          };
          nextSelection = selectTool.marquee({ document: doc, selection, area, additive: e.shiftKey, fullyContained: false, zoom: camera.zoom, visibleWorldRect: camera.getVisibleWorldRect({ x: containerRef.current?.clientWidth ?? 0, y: containerRef.current?.clientHeight ?? 0 }) });
        } else if ((drag.type === 'lasso' || drag.type === 'node-lasso') && interactionState.lasso) {
          const polygon = interactionState.lasso.finish();
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
      interactionState.lasso = null;
    } else if (drag.type === 'create-shape') {
      const screenPos = getPointerScreen(e);
      const result = shapeToolRef.current?.pointerUp({
        screenPoint: screenPos,
        worldPoint: camera.screenToWorld(screenPos),
        shiftKey: e.shiftKey,
        altKey: e.altKey,
      });
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
      interactionLifecycleRef.current?.complete(TEXT_CREATE_INTERACTION_ID);
      const result = textToolRef.current!.pointerUp(drag.currentWorld, doc.activeLayerId);
      if (result) {
        onExecuteCommand(result.command);
        onSelectObject(result.objectId);
        const session = new TextEditSession(result.objectId, result.isFrame ? 'Type your text here...' : 'Text');
        session.selectAll();
        beginTextEditSession(session);
      }
    } else if (drag.type === 'move-object') {
      const transforms = new Map(Object.entries(dragPreviewRef.current) as [ObjectId, import('@vectoria/core').Transform2D][]);
      if (transforms.size > 0) {
        const moved = [...transforms.entries()].some(([id, transform]) => {
          const initial = drag.initialTransforms?.[id];
          return initial && (Math.abs(transform.position.x - initial.position.x) > 0.5 || Math.abs(transform.position.y - initial.position.y) > 0.5);
        });
        if (moved) onExecuteCommand(new TransformObjectsCommand([...transforms.keys()], transforms));
      }
      updateDragPreview({});
    } else if ((drag.type === 'move-node' || drag.type === 'move-handle') && drag.objectIds?.[0] && drag.nodeIndex !== undefined) {
      const objectId = drag.objectIds[0];
      const nodes = pathPreviewRef.current[objectId];
      if (nodes) onExecuteCommand(new SetPathGeometryCommand(objectId, { nodes }));
      updatePathPreview({});
    } else if (drag.type === 'rotate-object') {
      const transforms = new Map(Object.entries(dragPreviewRef.current) as [ObjectId, import('@vectoria/core').Transform2D][]);
      if (transforms.size > 0) onExecuteCommand(new TransformObjectsCommand([...transforms.keys()], transforms));
      updateDragPreview({});
      setHoverHandleCursor(null);
    } else if (drag.type === 'resize-object' && drag.objectIds?.[0]) {
      const objectId = drag.objectIds[0];
      const preview = dragPreviewRef.current[objectId];
      if (preview) onExecuteCommand(new TransformObjectsCommand([objectId], new Map([[objectId, preview]])));
      updateDragPreview({});
      setHoverHandleCursor(null);
    }

    if (drag.type === 'move-object') updateDragPreview({});
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* capture may already be released */ }
    interactionState.dragSession = null;
    interactionState.drag = null;
    renderLoopRef.current?.invalidate();
    qualityPolicyRef.current?.endInteraction();
    interactionState.snap = null;
  };

  const cancelInteraction = useCallback((reason: InteractionLifecycleReason) => {
    if (reason === 'pointer-cancel' || reason === 'lost-pointer-capture') {
      interactionLifecycleRef.current?.cancel(WIDTH_INTERACTION_ID, reason);
      interactionLifecycleRef.current?.cancel(SMOOTH_INTERACTION_ID, reason);
      interactionLifecycleRef.current?.cancel(TEXT_CREATE_INTERACTION_ID, reason);
    } else {
      interactionLifecycleRef.current?.cancelAll(reason);
    }

    activePointersRef.current.clear();
    pinchRef.current = null;
    interactionState.snap = null;
    interactionState.objectSnap = null;

    if (freehandOperationRef.current) {
      pencilToolRef.current?.cancel();
      brushToolRef.current?.cancel();
      eraserToolRef.current?.cancel();
      knifeToolRef.current?.cancel();
      widthToolRef.current?.cancel();
      smoothStartScreenRef.current = null;
      freehandOperationRef.current = null;
      widthStartScreenRef.current = null;
      interactionState.freehandCursor = null;
      updatePathPreview({});
      setFreehandVersion((version) => version + 1);
      qualityPolicyRef.current?.endInteraction();
      renderLoopRef.current?.invalidate();
      return;
    }
    const drag = interactionState.drag;
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
      qualityPolicyRef.current?.endInteraction();
      renderLoopRef.current?.invalidate();
      return;
    }

    if (drag.type === 'move-object' || drag.type === 'rotate-object' || drag.type === 'resize-object') {
      updateDragPreview({});
      setHoverHandleCursor(null);
    }
    if (drag.type === 'style-sample') {
      eyedropperToolRef.current?.cancel();
      paintBucketToolRef.current?.cancel();
    }
    if (drag.type === 'gradient-handle') updateStylePreview({});
    if (drag.type === 'move-node' || drag.type === 'move-handle') updatePathPreview({});
    if (drag.type === 'create-shape') {
      if (shapeToolRef.current?.currentState === 'drawing') {
        shapeToolRef.current?.cancel();
        shapeToolRef.current = null;
      }
    }
    if (drag.type === 'marquee' || drag.type === 'lasso' || drag.type === 'node-lasso') interactionState.lasso = null;
    if (drag.type === 'text-create') textToolRef.current?.cancel();
    interactionState.dragSession = null;

    interactionState.drag = null;
    renderLoopRef.current?.invalidate();
    qualityPolicyRef.current?.endInteraction();
  }, [activeTool, updateDragPreview, updatePathPreview, updateStylePreview]);

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
      name: `${brush ? 'Pędzel' : 'Ołówek'} ${Object.keys(doc.objects).length + 1}`,
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
    const toolChanged = previousActiveToolRef.current !== activeTool;
    previousActiveToolRef.current = activeTool;
    if (toolChanged) cancelInteraction('tool-switch');

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
    widthToolRef.current?.cancel();
    freehandOperationRef.current = null;
    interactionState.freehandCursor = null;
    widthStartScreenRef.current = null;
    smoothStartScreenRef.current = null;
    updatePathPreview({});
    setFreehandVersion((version) => version + 1);
  }, [activeTool, cancelInteraction, commitPen]);

  // Canvas-local keyboard effects. Routing policy lives in editor-engine so
  // precedence can be tested without coupling it to this React component.
  useEffect(() => {
    const handleAltTransition = (pressed: boolean, isKeyDown: boolean) => {
      const wasAltKey = altKeyRef.current;
      altKeyRef.current = pressed;
      if (wasAltKey === pressed) return;

      if (
        isKeyDown
        && !interactionState.drag
        && activeTool === 'select'
        && selectedIds.size > 0
        && interactionState.freehandCursor
      ) {
        const screenPos = camera.worldToScreen(interactionState.freehandCursor);
        const pickContext = {
          document: doc,
          selection,
          screenPoint: screenPos,
          worldPoint: interactionState.freehandCursor,
          zoom: camera.zoom,
          additive: false,
          allowedObjectIds: isolationRef.current.context
            ? new Set(isolationRef.current.context.objectIds)
            : undefined,
        };
        const hit = selectTool.pick(pickContext).hit;
        hoveredObjectIdRef.current = hit?.objectId ?? null;
      } else if (!isKeyDown) {
        hoveredObjectIdRef.current = null;
      }

      renderLoopRef.current?.invalidate();
    };

    const handleTextEditAction = (
      e: KeyboardEvent,
      command: CanvasTextEditKeyboardCommand,
    ) => {
      e.preventDefault();

      if (command.type === 'cancel') {
        interactionLifecycleRef.current?.cancel(TEXT_EDIT_INTERACTION_ID, 'escape');
        onExitTool();
        return;
      }

      const session = textEditSessionRef.current;
      if (!session) return;

      switch (command.type) {
        case 'insert-newline':
          session.insertText('\n');
          break;
        case 'delete-backward':
          session.deleteBackward();
          break;
        case 'delete-forward':
          session.deleteForward();
          break;
        case 'move-horizontal':
          session.moveCaret(command.direction, command.extendSelection);
          break;
        case 'move-vertical':
          session.moveCaretVertical(command.direction, command.extendSelection);
          break;
        case 'move-boundary':
          session.moveCaret(command.direction, command.extendSelection);
          break;
        case 'select-all':
          session.selectAll();
          break;
        case 'insert-text':
          session.insertText(command.text);
          break;
      }

      setTextEditVersion((version) => version + 1);
      renderLoopRef.current?.invalidate();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const action = routeCanvasKeyDown(e, {
        activeTool,
        textEditActive: textEditSessionRef.current !== null,
        hasObjectSelection: selectedObjectIds.length > 0,
        hasNodeSelection: selection.nodeIds.length > 0,
        blockedByTextInput: shouldIgnoreKeydown(e.target),
      });
      if (!action) return;

      switch (action.type) {
        case 'text-edit':
          handleTextEditAction(e, action.command);
          return;

        case 'alt-key':
          handleAltTransition(action.pressed, true);
          return;

        case 'space-pan':
          e.preventDefault();
          setIsSpacePressed(action.pressed);
          return;

        case 'pen-delete': {
          e.preventDefault();
          const hasDraft = (penToolRef.current?.preview.nodes.length ?? 0) > 0 || penToolRef.current?.preview.pendingPoint != null;
          if (action.key === 'Backspace') penToolRef.current?.keyDown(action.key);
          else if (!hasDraft && selectedObjectIds.length > 0) {
            onExecuteCommand(new DeleteObjectsCommand(selectedObjectIds));
            onSelectObject(null);
          }
          setPenVersion((version) => version + 1);
          return;
        }

        case 'direct-select-delete-node': {
          e.preventDefault();
          const [nodeId] = selection.nodeIds;
          const separator = nodeId?.lastIndexOf(':') ?? -1;
          if (nodeId && separator > 0) {
            const objectId = nodeId.slice(0, separator);
            const nodeIndex = Number(nodeId.slice(separator + 1));
            if (Number.isInteger(nodeIndex)) {
              onExecuteCommand(new RemovePathNodeCommand(objectId, nodeIndex));
              onSelectSelection?.({
                ...selection,
                nodeIds: selection.nodeIds.filter((id) => id !== nodeId),
              });
            }
          }
          return;
        }

        case 'delete-selection':
          e.preventDefault();
          onExecuteCommand(new DeleteObjectsCommand(selectedObjectIds));
          onSelectObject(null);
          return;

        case 'nudge':
          e.preventDefault();
          queueNudge(action.key, action.shiftKey);
          return;

        case 'pen-key': {
          e.preventDefault();
          const result = penToolRef.current?.keyDown(action.key);
          if (result?.type === 'commit') commitPen(result.nodes, result.closed);
          if (action.key === 'Escape') onExitTool();
          setPenVersion((version) => version + 1);
          return;
        }

        case 'polyline-key': {
          e.preventDefault();
          const result = polylineToolRef.current?.keyDown(action.key);
          if (result?.type === 'commit') commitPolyline(result.points);
          if (action.key === 'Escape') onExitTool();
          setPolylineVersion((version) => version + 1);
          return;
        }

        case 'escape': {
          e.preventDefault();
          if (isolationRef.current.context) {
            isolationRef.current.exit();
            setIsolationVersion((version) => version + 1);
            onSelectObjects?.([]);
            return;
          }
          const hadInteraction = interactionState.drag !== null || freehandOperationRef.current !== null;
          cancelInteraction('escape');
          if (!hadInteraction) onExitTool();
          penToolRef.current?.cancel();
          setPenVersion((version) => version + 1);
          return;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const action = routeCanvasKeyUp(e);
      if (!action) return;

      if (action.type === 'alt-key') {
        handleAltTransition(action.pressed, false);
      } else if (action.type === 'space-pan') {
        setIsSpacePressed(action.pressed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    activeTool,
    camera,
    cancelInteraction,
    commitPen,
    commitPolyline,
    doc,
    onExecuteCommand,
    onExitTool,
    onSelectObject,
    onSelectObjects,
    onSelectSelection,
    queueNudge,
    selectTool,
    selectedIds,
    selectedObjectIds,
    selection,
  ]);

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
      const session = new TextEditSession(obj.id, obj.text);
      const inverse = getInverseTransformMatrix(obj.transform);
      if (inverse) {
        const caret = textCaretAt(obj, mat3TransformPoint(inverse, worldPos));
        if (e.detail >= 3) session.selectParagraphAt(caret);
        else if (e.detail === 2) session.selectWordAt(caret);
      }
      beginTextEditSession(session);
      onSelectObject(obj.id);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="application"
      aria-label="Obszar roboczy — użyj strzałek, aby przesunąć zaznaczenie; Escape anuluje narzędzie"
      aria-roledescription="edytor wektorowy"
      data-testid="canvas-viewport"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onDoubleClick={handleDoubleClick}
      onPointerUp={finishInteraction}
      onPointerCancel={() => cancelInteraction('pointer-cancel')}
      onLostPointerCapture={() => cancelInteraction('lost-pointer-capture')}
      onContextMenu={(e) => e.preventDefault()}
      data-tool={activeTool}
      data-text-editing={textEditSessionRef.current !== null}
      title={activeTool === 'node-lasso' && (!selectedObjectId || doc.objects[selectedObjectId]?.type !== 'path') ? 'Najpierw zaznacz ścieżkę, potem obrysuj jej węzły lassem.' : undefined}
      style={{
        position: 'relative',
        flex: 1,
        height: '100%',
        overflow: 'hidden',
        cursor:
          hoverHandleCursor ??
          (interactionState.drag?.type === 'move-object'
            ? 'move'
            : isSpacePressed || activeTool === 'hand'
            ? 'grab'
            : activeTool === 'eyedropper'
            ? 'copy'
            : activeTool === 'bucket'
            ? 'cell'
            : isDragShapeTool(activeTool) || activeTool === 'polyline' || activeTool === 'pen' || activeTool === 'pencil' || activeTool === 'brush' || activeTool === 'corner' || activeTool === 'eraser' || activeTool === 'knife' || activeTool === 'scissors' || activeTool === 'lasso' || activeTool === 'node-lasso'
            ? 'crosshair'
            : 'default'),
        touchAction: 'none',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const rect = containerRef.current?.getBoundingClientRect();
          const screenX = e.clientX - (rect?.left ?? 0);
          const screenY = e.clientY - (rect?.top ?? 0);
          const worldPos = camera.screenToWorld({ x: screenX, y: screenY });
          onDropFiles?.(e.dataTransfer.files, worldPos);
        }
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
      {/* Canvas Annotations DOM Overlay (EPIC-17 SAAS-012..014) */}
      {doc.annotations && doc.annotations.length > 0 && (
        <div
          data-testid="canvas-annotations-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {doc.annotations.map((ann, index) => {
            const screenPt = camera.worldToScreen(ann.worldPoint);
            const isSelected = ann.id === activeAnnotationId;
            const isDragging = draggingPinId === ann.id;
            const displayX = isDragging && pinDragScreenPos ? pinDragScreenPos.x : screenPt.x;
            const displayY = isDragging && pinDragScreenPos ? pinDragScreenPos.y : screenPt.y;

            return (
              <div
                key={ann.id}
                data-testid={`annotation-pin-${ann.id}`}
                role="button"
                tabIndex={0}
                aria-label={`Komentarz ${index + 1}: ${ann.authorName} (${ann.resolved ? 'Rozwiązany' : 'Otwarty'})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  setDraggingPinId(ann.id);
                  onSelectAnnotation?.(ann.id);
                  if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setPinDragScreenPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }
                }}
                onPointerMove={(e) => {
                  if (draggingPinId !== ann.id || !containerRef.current) return;
                  const rect = containerRef.current.getBoundingClientRect();
                  setPinDragScreenPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                onPointerUp={(e) => {
                  if (draggingPinId !== ann.id) return;
                  try {
                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                  } catch {
                    /* ignore */
                  }
                  if (pinDragScreenPos) {
                    const finalWorld = camera.screenToWorld(pinDragScreenPos);
                    if (Number.isFinite(finalWorld.x) && Number.isFinite(finalWorld.y)) {
                      onMoveAnnotationPin?.(ann.id, finalWorld);
                    }
                  }
                  setDraggingPinId(null);
                  setPinDragScreenPos(null);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnnotation?.(ann.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectAnnotation?.(ann.id);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: `${displayX}px`,
                  top: `${displayY}px`,
                  transform: 'translate(-50%, -100%)',
                  pointerEvents: 'auto',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: isSelected ? 40 : 30,
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: ann.resolved ? '#6b7280' : isSelected ? '#4f46e5' : '#6366f1',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    boxShadow: isSelected ? '0 0 0 3px #ffffff, 0 4px 8px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.25)',
                    border: '1.5px solid rgba(255,255,255,0.6)',
                  }}
                  title={`${ann.authorName}: ${ann.body}`}
                >
                  {ann.resolved ? '✓' : index + 1}
                </div>
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `6px solid ${ann.resolved ? '#6b7280' : isSelected ? '#4f46e5' : '#6366f1'}`,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
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
