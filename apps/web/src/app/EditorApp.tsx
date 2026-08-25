import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { generateId } from '@vectoria/shared';
import type { Vec2 } from '@vectoria/shared';
import type {
  DocumentModel,
  ObjectId,
  Command,
  ObjectStyle,
  SceneObject,
  SelectionState,
  GeometryPreview,
  CleanupPlan,
} from '@vectoria/core';
import {
  CommandHistory,
  CreateObjectsCommand,
  TransformObjectsCommand,
  SetRectangleGeometryCommand,
  SetEllipseGeometryCommand,
  SetLineGeometryCommand,
  type CornerRadii,
  SetObjectStyleCommand,
  UpdateArtboardCommand,
  SetDocumentUnitCommand,
  SetGridSettingsCommand,
  SetSnapSettingsCommand,
  CreateArtboardCommand,
  DuplicateArtboardCommand,
  DeleteArtboardCommand,
  GroupObjectsCommand,
  UngroupObjectsCommand,
  ReplaceDocumentCommand,
  RenameArtboardCommand,
  SetArtboardOrientationCommand,
  AlignObjectsCommand,
  DistributeObjectsCommand,
  ReorderObjectsCommand,
  RepeatTransformCommand,
  SkewObjectsCommand,
  SelectArtboardCommand,
  UpdateObjectCommand,
  UpdatePathNodeCommand,
  SetPathNodeKindCommand,
  SetPathGeometryCommand,
  AddPathNodeCommand,
  RemovePathNodeCommand,
  ReversePathCommand,
  ConvertPathSegmentCommand,
  SplitPathCommand,
  MergePathNodesCommand,
  JoinOpenPathsCommand,
  ConnectPathNodeHandlesCommand,
  DisconnectPathNodeHandlesCommand,
  ConvertStrokeToPathCommand,
  ClosePathCommand,
  ReversePathDirectionCommand,
  scanCleanup,
  SmoothPathCommand,
  SimplifyPathCommand,
  createDefaultDocument,
  getObjectBounds,
  AddGuideCommand,
} from '@vectoria/core';
import { Camera, emptySelection, selectionService, GeometryOperationSession, BooleanOperationSession } from '@vectoria/editor-engine';
import {
  bootstrapDocument,
  saveDocumentSnapshot,
  exportArtboardToSvg,
  downloadSvg,
  rasterizeSvgToPng,
  downloadBlob,
  importSvgToDocument,
  saveDocumentVersion,
  listDocumentVersions,
  markSessionOpen,
  markSessionClosed,
  type BootstrapState,
} from '@vectoria/io';

import { TopBar } from '../features/topbar/TopBar.js';
import { ToolRail, type ActiveTool } from '../features/toolbar/ToolRail.js';
import { CanvasViewport } from '../features/canvas/CanvasViewport.js';
import { CanvasRulers } from '../features/canvas/CanvasRulers.js';
import { ContextualControlBar, type FreehandSettings } from '../features/panels/ContextualControlBar.js';
import { RightDock } from '../features/panels/RightDock.js';
import { StatusBar } from '../features/statusbar/StatusBar.js';
import { NewDocumentDialog } from '../features/dialogs/NewDocumentDialog.js';
import type { DockPanel } from '../features/panels/RightDock.js';
import type { PathAction } from '../features/panels/PropertiesPanel.js';
import type { GeometryAction } from '../features/properties/GeometryProperties.js';
import { Button } from '@vectoria/ui';

function isMacPlatform(): boolean {
  const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform
    ?? navigator.platform
    ?? '';
  return /mac/i.test(platform);
}

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved-locally' | 'error' | 'offline';

const RecoveryBanner: React.FC<{ message: string; details?: string; onRestore?: () => void; onDiscard?: () => void }> = ({ message, details, onRestore, onDiscard }) => (
  <div className="recovery-banner" role="alert">
    <span>{message}</span>
    {details && <span style={{ opacity: 0.7 }}>{details}</span>}
    {onRestore && onDiscard && <span className="recovery-actions"><button type="button" onClick={onRestore}>Przywróć</button><button type="button" onClick={onDiscard}>Odrzuć</button></span>}
  </div>
);

export const EditorApp: React.FC = () => {
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>({ status: 'loading' });
  const [doc, setDoc] = useState<DocumentModel | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selection, setSelection] = useState<SelectionState>(emptySelection);
  const selectedObjectIds = selection.objectIds;
  const selectedObjectId = selectedObjectIds[0] ?? null;
  const [rightDockOpen, setRightDockOpen] = useState(true);
  const [activeDockPanel, setActiveDockPanel] = useState<DockPanel>('properties');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const [documentVersions, setDocumentVersions] = useState<readonly import('@vectoria/io').DocumentVersion[]>([]);
  const lastTransformRef = useRef<Partial<import('@vectoria/core').Transform2D>>({});
  const [cursorWorld, setCursorWorld] = useState<Vec2 | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('vectoria-theme') === 'light' ? 'light' : 'dark');
  const [freehandSettings, setFreehandSettings] = useState<FreehandSettings>({ smoothing: 20, accuracy: 75, width: 4, pressure: true, cap: 'round', join: 'round', eraserRadius: 12 });
  const [geometryPreview, setGeometryPreview] = useState<GeometryPreview | null>(null);
  const [cleanupSelectedFindingIds, setCleanupSelectedFindingIds] = useState<readonly string[]>([]);
  const [destructiveGeometryConfirmOpen, setDestructiveGeometryConfirmOpen] = useState(false);

  const history = useMemo(() => new CommandHistory(), []);
  const camera = useMemo(() => new Camera(), []);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const isBootstrappedRef = useRef(false);
  const latestDocRef = useRef<DocumentModel | null>(null);
  const latestRevisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const saveQueueRef = useRef<{ pending: { document: DocumentModel; revision: number } | null; inFlight: boolean }>({ pending: null, inFlight: false });
  const processSaveQueueRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const clipboardRef = useRef<SceneObject[]>([]);
  const geometrySessionRef = useRef<{ apply: () => Command | null; cancel: () => void } | null>(null);
  const geometryConfirmDialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    markSessionOpen();
    const closeSession = () => markSessionClosed();
    window.addEventListener('pagehide', closeSession);
    return () => { window.removeEventListener('pagehide', closeSession); markSessionClosed(); };
  }, []);

  const handleSelectObject = useCallback((id: ObjectId | null, additive = false) => {
    setSelection((current) => selectionService.selectObject(current, id, additive));
  }, []);

  const handleSelectObjects = useCallback((ids: readonly ObjectId[], additive = false) => {
    setSelection((current) => selectionService.selectObjects(current, ids, additive));
  }, []);

  const handleSelectSelection = useCallback((next: SelectionState) => {
    setSelection(next);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    (document.documentElement as unknown as { __themeGen?: number }).__themeGen =
      ((document.documentElement as unknown as { __themeGen?: number }).__themeGen ?? 0) + 1;
    localStorage.setItem('vectoria-theme', theme);
  }, [theme]);

  useEffect(() => {
    latestDocRef.current = doc;
  }, [doc]);

  const processSaveQueue = useCallback(async () => {
    const queue = saveQueueRef.current;
    if (queue.inFlight) return;
    queue.inFlight = true;
    try {
      while (queue.pending) {
        const request = queue.pending;
        queue.pending = null;
        try {
          await saveDocumentSnapshot(request.document, request.revision);
          if (latestRevisionRef.current === request.revision) {
            savedRevisionRef.current = request.revision;
            setSavedRevision(request.revision);
            setSaveStatus('saved-locally');
          }
        } catch (error) {
          console.error('[Vectoria] Save error:', error);
          setSaveStatus('error');
          break;
        }
      }
    } finally {
      queue.inFlight = false;
      if (queue.pending) void processSaveQueueRef.current();
    }
  }, []);
  processSaveQueueRef.current = processSaveQueue;

  const enqueueAutosave = useCallback((document: DocumentModel, nextRevision: number) => {
    saveQueueRef.current.pending = { document, revision: nextRevision };
    setSaveStatus('saving');
    void processSaveQueue();
  }, [processSaveQueue]);

  const flushAutosave = useCallback(() => {
    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const latest = latestDocRef.current;
    if (latest && latestRevisionRef.current !== savedRevisionRef.current) {
      enqueueAutosave(latest, latestRevisionRef.current);
    }
  }, [enqueueAutosave]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushAutosave();
    };
    window.addEventListener('pagehide', flushAutosave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushAutosave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushAutosave();
    };
  }, [flushAutosave]);

  // Initialize and load document from IndexedDB
  useEffect(() => {
    async function init() {
      const state = await bootstrapDocument();
      setBootstrapState(state);
      if (state.status === 'ready' || state.status === 'recovery-error' || state.status === 'recovery-available') {
        history.clear(state.revision);
        setDoc(state.document);
        latestDocRef.current = state.document;
        latestRevisionRef.current = state.revision;
        savedRevisionRef.current = state.revision;
        setRevision(state.revision);
        setSavedRevision(state.revision);
        setSaveStatus(state.status === 'ready' || state.status === 'recovery-available' ? 'saved-locally' : 'error');
        void listDocumentVersions().then(setDocumentVersions).catch(() => undefined);
      }
      isBootstrappedRef.current = true;
    }
    init();
  }, []);

  // Autosave trigger with 700ms debounce
  const scheduleAutosave = useCallback((currentDoc: DocumentModel, nextRevision: number) => {
    if (!isBootstrappedRef.current) return;

    setSaveStatus('saving');
    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(() => enqueueAutosave(currentDoc, nextRevision), 700);
  }, [enqueueAutosave]);

  const commitDocument = useCallback((nextDoc: DocumentModel) => {
    const nextRevision = latestRevisionRef.current + 1;
    latestDocRef.current = nextDoc;
    latestRevisionRef.current = nextRevision;
    setDoc(nextDoc);
    setRevision(nextRevision);
    scheduleAutosave(nextDoc, nextRevision);
  }, [scheduleAutosave]);

  // Execute command handler
  const handleExecuteCommand = useCallback(
    (command: Command) => {
      if (!doc) return;
      
      // Save transform delta for Repeat Transform
      if (command instanceof TransformObjectsCommand && !(command instanceof RepeatTransformCommand)) {
        const firstId = command.objectIds[0];
        if (firstId) {
          const oldTransform = doc.objects[firstId]?.transform;
          const newTransform = command.newTransforms.get(firstId);
          if (oldTransform && newTransform) {
             const dx = newTransform.position.x - oldTransform.position.x;
             const dy = newTransform.position.y - oldTransform.position.y;
             const dr = newTransform.rotation - oldTransform.rotation;
             const sx = newTransform.scale.x / (oldTransform.scale.x || 1);
             const sy = newTransform.scale.y / (oldTransform.scale.y || 1);
             type TransformDelta = { position?: { x: number; y: number }; rotation?: number; scale?: { x: number; y: number } };
             const patch: TransformDelta = {};
             if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) patch.position = { x: dx, y: dy };
             if (Math.abs(dr) > 1e-6) patch.rotation = dr;
             if (Math.abs(sx - 1) > 1e-6 || Math.abs(sy - 1) > 1e-6) patch.scale = { x: sx, y: sy };
             
             if (Object.keys(patch).length > 0) {
               lastTransformRef.current = patch;
             }
          }
        }
      }

      const newDoc = history.execute(command, doc);
      if (newDoc !== doc) commitDocument(newDoc);
    },
    [commitDocument, doc, history]
  );

  const handleSaveVersion = useCallback((name: string) => {
    if (!doc) return;
    void saveDocumentVersion(doc, name, latestRevisionRef.current).then((version) => setDocumentVersions((current) => [version, ...current.filter((item) => item.id !== version.id)].slice(0, 20))).catch((error) => console.error('[Vectoria] Version save error:', error));
  }, [doc]);

  const handleRestoreVersion = useCallback((version: import('@vectoria/io').DocumentVersion) => {
    if (!doc) return;
    handleExecuteCommand(new ReplaceDocumentCommand(version.document.document));
    setSelection(emptySelection());
  }, [doc, handleExecuteCommand]);

  const handleRestoreRecovery = useCallback(() => {
    if (bootstrapState.status !== 'recovery-available') return;
    const nextRevision = latestRevisionRef.current + 1;
    history.clear(nextRevision);
    latestRevisionRef.current = nextRevision;
    latestDocRef.current = bootstrapState.document;
    setDoc(bootstrapState.document);
    setRevision(nextRevision);
    setSaveStatus('dirty');
    scheduleAutosave(bootstrapState.document, nextRevision);
    setBootstrapState({ status: 'ready', document: bootstrapState.document, revision: nextRevision });
  }, [bootstrapState, history, scheduleAutosave]);

  const handleDiscardRecovery = useCallback(() => {
    if (bootstrapState.status !== 'recovery-available') return;
    const nextRevision = latestRevisionRef.current + 1;
    history.clear(nextRevision);
    latestRevisionRef.current = nextRevision;
    latestDocRef.current = bootstrapState.recoveryDocument;
    setDoc(bootstrapState.recoveryDocument);
    setRevision(nextRevision);
    setSaveStatus('dirty');
    scheduleAutosave(bootstrapState.recoveryDocument, nextRevision);
    setBootstrapState({ status: 'ready', document: bootstrapState.recoveryDocument, revision: nextRevision });
  }, [bootstrapState, history, scheduleAutosave]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (!doc || !history.canUndo) return;
    const newDoc = history.undo(doc);
    if (newDoc) {
      commitDocument(newDoc);
    }
  }, [commitDocument, doc, history]);

  const handleRedo = useCallback(() => {
    if (!doc || !history.canRedo) return;
    const newDoc = history.redo(doc);
    if (newDoc) {
      commitDocument(newDoc);
    }
  }, [commitDocument, doc, history]);

  const handleHistoryJump = useCallback((targetCursor: number) => {
    if (!doc || targetCursor === history.cursor) return;
    const nextDoc = history.jumpTo(targetCursor, doc);
    if (nextDoc !== doc) commitDocument(nextDoc);
  }, [commitDocument, doc, history]);

  const handleRetrySave = useCallback(() => {
    const latest = latestDocRef.current;
    if (latest) enqueueAutosave(latest, latestRevisionRef.current);
  }, [enqueueAutosave]);

  const handleShowPanel = useCallback((panel: DockPanel) => {
    setActiveDockPanel(panel);
    setRightDockOpen(true);
  }, []);

  const cleanupPlan = useMemo<CleanupPlan>(() => {
    if (!doc) return { findings: [], selectedFindingIds: [] };
    const scanned = scanCleanup(doc);
    return { ...scanned, selectedFindingIds: scanned.findings.filter((finding) => cleanupSelectedFindingIds.includes(finding.id)).map((finding) => finding.id) };
  }, [cleanupSelectedFindingIds, doc]);

  const handleOpenCleanup = useCallback(() => {
    if (!doc) return;
    const scanned = scanCleanup(doc);
    setCleanupSelectedFindingIds(scanned.findings.map((finding) => finding.id));
    handleShowPanel('cleanup');
  }, [doc, handleShowPanel]);

  // Fit Artboard & 100% Zoom
  const handleFitArtboard = useCallback(() => {
    if (!doc) return;
    const activeArtboard = doc.artboards[doc.activeArtboardId];
    if (!activeArtboard) return;

    // Viewport approximate size
     const width = window.innerWidth - 48 - 320; // ToolRail + RightDock
     const height = window.innerHeight - 72 - 36 - 26; // TopBar + ContextualControlBar + StatusBar

    camera.fitRect(
      {
        x: activeArtboard.x,
        y: activeArtboard.y,
        width: activeArtboard.width,
        height: activeArtboard.height,
      },
      { x: Math.max(100, width), y: Math.max(100, height) }
    );
    setZoomPercent(camera.zoomPercent);
  }, [doc, camera]);

  const handleZoom100 = useCallback(() => {
    const width = window.innerWidth - 48 - 320;
    const height = window.innerHeight - 72 - 36 - 26;
    camera.zoomTo100({ x: Math.max(100, width), y: Math.max(100, height) });
    setZoomPercent(camera.zoomPercent);
  }, [camera]);

  const handleFitDrawing = useCallback(() => {
    if (!doc) return;
     const bounds = Object.values(doc.objects).filter((object) => object.visible).map((object) => getObjectBounds(object, doc));
    if (bounds.length === 0) return handleFitArtboard();
    const minX = Math.min(...bounds.map((rect) => rect.x));
    const minY = Math.min(...bounds.map((rect) => rect.y));
    const maxX = Math.max(...bounds.map((rect) => rect.x + rect.width));
    const maxY = Math.max(...bounds.map((rect) => rect.y + rect.height));
     camera.fitRect({ x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }, { x: Math.max(100, window.innerWidth - 368), y: Math.max(100, window.innerHeight - 134) });
    setZoomPercent(camera.zoomPercent);
  }, [camera, doc, handleFitArtboard]);

  const handleFitSelection = useCallback(() => {
    if (!doc || selectedObjectIds.length === 0) return;
    const bounds = selectedObjectIds.map((id) => doc.objects[id]).filter((object): object is SceneObject => Boolean(object)).map((object) => getObjectBounds(object, doc));
    if (bounds.length === 0) return;
    const minX = Math.min(...bounds.map((bound) => bound.x));
    const minY = Math.min(...bounds.map((bound) => bound.y));
    const maxX = Math.max(...bounds.map((bound) => bound.x + bound.width));
    const maxY = Math.max(...bounds.map((bound) => bound.y + bound.height));
    camera.fitRect({ x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }, { x: Math.max(100, window.innerWidth - 368), y: Math.max(100, window.innerHeight - 134) });
    setZoomPercent(camera.zoomPercent);
  }, [camera, doc, selectedObjectIds]);

  // Export SVG
  const handleExportSvg = useCallback(() => {
    if (!doc) return;
    try {
      const svg = exportArtboardToSvg(doc);
      downloadSvg(svg, `${doc.name.toLowerCase().replace(/\s+/g, '-')}.svg`);
    } catch (err) {
      console.error('[Vectoria] Export SVG error:', err);
    }
  }, [doc]);

  const handleExportPng = useCallback(async () => {
    if (!doc) return;
    const artboard = doc.artboards[doc.activeArtboardId];
    if (!artboard) return;
    try {
      const blob = await rasterizeSvgToPng(exportArtboardToSvg(doc), artboard.width, artboard.height);
      downloadBlob(blob, `${doc.name.toLowerCase().replace(/\s+/g, '-')}.png`);
    } catch (err) { console.error('[Vectoria] PNG export error:', err); }
  }, [doc]);

  const handleCreateDocument = useCallback((options: Parameters<typeof createDefaultDocument>[0]) => {
    const next = createDefaultDocument(options);
    latestRevisionRef.current += 1;
    history.clear(latestRevisionRef.current);
    setDoc(next);
    latestDocRef.current = next;
    setRevision(latestRevisionRef.current);
    setSelection(emptySelection());
    setNewDocumentOpen(false);
    scheduleAutosave(next, latestRevisionRef.current);
    window.setTimeout(() => {
      const activeArtboard = next.artboards[next.activeArtboardId];
      if (activeArtboard) {
         camera.fitRect(activeArtboard, { x: Math.max(100, window.innerWidth - 368), y: Math.max(100, window.innerHeight - 134) });
        setZoomPercent(camera.zoomPercent);
      }
    }, 0);
  }, [camera, history, scheduleAutosave]);

  const handleImportSvg = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.svg,image/svg+xml';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then((svg) => {
        const imported = importSvgToDocument(svg, file.name.replace(/\.svg$/i, '') || 'Imported SVG');
         latestRevisionRef.current += 1; history.clear(latestRevisionRef.current); latestDocRef.current = imported; setRevision(latestRevisionRef.current); setDoc(imported); setSelection(emptySelection()); scheduleAutosave(imported, latestRevisionRef.current);
      }).catch((error) => console.error('[Vectoria] SVG import error:', error));
    };
    input.click();
  }, [history, scheduleAutosave]);

  // Property panel mutation handlers (commands)
  const handleUpdatePosition = useCallback(
    (id: ObjectId, x: number, y: number) => {
      if (!doc) return;
      const obj = doc.objects[id];
      if (!obj) return;


      const newTransforms = new Map([
        [
          id,
          {
            ...obj.transform,
            position: { x, y },
          },
        ],
      ]);
      handleExecuteCommand(new TransformObjectsCommand([id], newTransforms));
    },
    [doc, handleExecuteCommand]
  );

  const handleUpdateDimensions = useCallback(
    (id: ObjectId, width: number, height: number) => {
      const object = doc?.objects[id];
      if (!object) return;
      const absWidth = Math.abs(width);
      const absHeight = Math.abs(height);
      // Handle negative values as scale flip
      const currentScaleX = object.transform.scale.x;
      const currentScaleY = object.transform.scale.y;
      const newScaleX = width < 0 ? -Math.abs(currentScaleX) : Math.abs(currentScaleX);
      const newScaleY = height < 0 ? -Math.abs(currentScaleY) : Math.abs(currentScaleY);
      if (object.type === 'ellipse') handleExecuteCommand(new SetEllipseGeometryCommand(id, { width: absWidth, height: absHeight }));
      else if (object.type === 'rectangle') handleExecuteCommand(new SetRectangleGeometryCommand(id, { width: absWidth, height: absHeight }));
      if (newScaleX !== currentScaleX || newScaleY !== currentScaleY) {
        handleExecuteCommand(new TransformObjectsCommand([id], new Map([[id, { ...object.transform, scale: { x: newScaleX, y: newScaleY } }]])));
      }
    },
    [doc, handleExecuteCommand]
  );

  /** Scale/rotate all selected objects as a group around a shared pivot (world coords). */
  const handleUpdateGroupTransform = useCallback(
    (ids: readonly ObjectId[], scaleX: number, scaleY: number, pivotWorld: Vec2) => {
      if (!doc) return;
      const transforms = new Map<ObjectId, import('@vectoria/core').Transform2D>();
      for (const id of ids) {
        const obj = doc.objects[id];
        if (!obj) continue;
        const bounds = getObjectBounds(obj, doc);
        const objCx = bounds.x + bounds.width / 2;
        const objCy = bounds.y + bounds.height / 2;
        const newCx = pivotWorld.x + (objCx - pivotWorld.x) * scaleX;
        const newCy = pivotWorld.y + (objCy - pivotWorld.y) * scaleY;
        transforms.set(id, {
          ...obj.transform,
          position: { x: obj.transform.position.x + (newCx - objCx), y: obj.transform.position.y + (newCy - objCy) },
          scale: { x: obj.transform.scale.x * scaleX, y: obj.transform.scale.y * scaleY },
        });
      }
      handleExecuteCommand(new TransformObjectsCommand([...ids], transforms));
    },
    [doc, handleExecuteCommand]
  );

  const handleUpdateLineEndpoint = useCallback((id: ObjectId, endPoint: Vec2) => {
    handleExecuteCommand(new SetLineGeometryCommand(id, { endPoint }));
  }, [handleExecuteCommand]);

  const handleUpdateCornerRadius = useCallback((id: ObjectId, radii: CornerRadii) => {
    handleExecuteCommand(new SetRectangleGeometryCommand(id, { cornerRadius: radii }));
  }, [handleExecuteCommand]);

  const handleUpdateFill = useCallback(
    (id: ObjectId, color: string | null) => {
      const fillStyle = color ? { type: 'solid' as const, color } : { type: 'none' as const };
      handleExecuteCommand(new SetObjectStyleCommand([id], { fill: fillStyle }));
    },
    [handleExecuteCommand]
  );

  const handleUpdateObjectStyle = useCallback((id: ObjectId, patch: Partial<ObjectStyle>) => {
    handleExecuteCommand(new SetObjectStyleCommand([id], patch));
  }, [handleExecuteCommand]);

  const handleUpdateRotation = useCallback((id: ObjectId, degrees: number) => {
    if (!doc || !Number.isFinite(degrees)) return;
    const object = doc.objects[id];
    if (!object) return;
    handleExecuteCommand(new TransformObjectsCommand([id], new Map([[id, { ...object.transform, rotation: degrees * Math.PI / 180 }]])));
  }, [doc, handleExecuteCommand]);

  const handleRepeatTransform = useCallback(() => {
    if (!doc || selectedObjectIds.length === 0 || Object.keys(lastTransformRef.current).length === 0) return;
    handleExecuteCommand(new RepeatTransformCommand(selectedObjectIds, lastTransformRef.current, doc));
  }, [doc, handleExecuteCommand, selectedObjectIds]);

  const handleUpdatePivot = useCallback((id: ObjectId, pivot: Vec2) => {
    const object = doc?.objects[id];
    if (!object) return;
    handleExecuteCommand(new TransformObjectsCommand([id], new Map([[id, { ...object.transform, pivot }]])));
  }, [doc, handleExecuteCommand]);

  const handleUpdateSkew = useCallback((id: ObjectId, axis: 'x' | 'y', degrees: number) => {
    if (!doc) return;
    handleExecuteCommand(new SkewObjectsCommand([id], axis === 'x' ? 'horizontal' : 'vertical', degrees * Math.PI / 180, doc));
  }, [doc, handleExecuteCommand]);

  const handleAlign = useCallback((alignment: import('@vectoria/core').Alignment, target: 'selection' | 'artboard' | 'key') => {
    if (selectedObjectIds.length === 0) return;
    handleExecuteCommand(new AlignObjectsCommand(selectedObjectIds, alignment, target, selectedObjectIds.at(-1)));
  }, [handleExecuteCommand, selectedObjectIds]);

  const handleDistribute = useCallback((axis: 'horizontal' | 'vertical') => {
    if (selectedObjectIds.length < 3) return;
    handleExecuteCommand(new DistributeObjectsCommand(selectedObjectIds, axis));
  }, [handleExecuteCommand, selectedObjectIds]);

  const handleReorder = useCallback((direction: import('@vectoria/core').ReorderDirection) => {
    if (selectedObjectIds.length === 0) return;
    handleExecuteCommand(new ReorderObjectsCommand(selectedObjectIds, direction));
  }, [handleExecuteCommand, selectedObjectIds]);

  const handleUpdateArtboard = useCallback((width: number, height: number, background?: import('@vectoria/core').Artboard['background']) => {
    if (!doc) return;
    handleExecuteCommand(new UpdateArtboardCommand(doc.activeArtboardId, { width, height, ...(background ? { background } : {}) }));
  }, [doc, handleExecuteCommand]);

  const handleUpdateUnit = useCallback((unit: DocumentModel['unit']) => {
    handleExecuteCommand(new SetDocumentUnitCommand(unit));
  }, [handleExecuteCommand]);

  const handleUpdateGridSettings = useCallback((settings: DocumentModel['grid']) => {
    handleExecuteCommand(new SetGridSettingsCommand(settings));
  }, [handleExecuteCommand]);

  const handleUpdateSnap = useCallback((enabled: boolean) => {
    handleExecuteCommand(new SetSnapSettingsCommand({ enabled }));
  }, [handleExecuteCommand]);

  const handleUpdatePathNode = useCallback((id: ObjectId, index: number, patch: Partial<Omit<import('@vectoria/core').PathNode, 'id'>>) => {
    handleExecuteCommand(new UpdatePathNodeCommand(id, index, patch));
  }, [handleExecuteCommand]);

  const handleUpdatePathNodeKind = useCallback((id: ObjectId, index: number, kind: import('@vectoria/core').PathNode['kind']) => {
    if (!doc) return;
    handleExecuteCommand(new SetPathNodeKindCommand(id, index, kind, doc));
  }, [doc, handleExecuteCommand]);

  const handleUpdatePathClosed = useCallback((id: ObjectId, closed: boolean) => {
    handleExecuteCommand(new SetPathGeometryCommand(id, { closed }));
  }, [handleExecuteCommand]);

  const handlePathAction = useCallback((action: PathAction) => {
    switch (action.type) {
      case 'stroke-to-path':
        handleExecuteCommand(new ConvertStrokeToPathCommand(action.objectId));
        break;
      case 'smooth':
        if (doc) handleExecuteCommand(new SmoothPathCommand(action.objectId, action.amount, doc));
        break;
      case 'simplify':
        if (doc) handleExecuteCommand(new SimplifyPathCommand(action.objectId, action.accuracy, doc));
        break;
      case 'reverse':
        handleExecuteCommand(new ReversePathCommand(action.objectId));
        break;
      case 'add-node':
        handleExecuteCommand(new AddPathNodeCommand(action.objectId, action.segmentIndex));
        break;
      case 'remove-node':
        handleExecuteCommand(new RemovePathNodeCommand(action.objectId, action.nodeIndex));
        setSelection(emptySelection());
        break;
      case 'convert-segment':
        handleExecuteCommand(new ConvertPathSegmentCommand(action.objectId, action.segmentIndex, action.to));
        break;
      case 'split':
        handleExecuteCommand(new SplitPathCommand(action.objectId, action.nodeIndex));
        setSelection(emptySelection());
        break;
      case 'merge-nodes':
        handleExecuteCommand(new MergePathNodesCommand(action.objectId, action.firstIndex, action.secondIndex));
        setSelection(emptySelection());
        break;
      case 'connect-handles':
        if (doc) handleExecuteCommand(new ConnectPathNodeHandlesCommand(action.objectId, action.nodeIndex, doc));
        break;
      case 'disconnect-handles':
        handleExecuteCommand(new DisconnectPathNodeHandlesCommand(action.objectId, action.nodeIndex));
        break;
      case 'join':
        handleExecuteCommand(new JoinOpenPathsCommand(action.objectIds[0], action.objectIds[1]));
        setSelection(emptySelection());
        break;
    }
  }, [doc, handleExecuteCommand]);

  const handleGeometryAction = useCallback((action: GeometryAction) => {
    if (!doc) return;
    if (action.type === 'close') {
      handleExecuteCommand(new ClosePathCommand(action.objectId));
      return;
    }
    if (action.type === 'reverse') {
      handleExecuteCommand(new ReversePathDirectionCommand(action.objectId));
      return;
    }
    if (action.type === 'boolean' || action.type === 'compound') {
      const session = new BooleanOperationSession(doc, action.objectIds);
      const booleanPreview = action.type === 'compound' ? session.previewCompound() : session.previewBoolean(action.operation);
      geometrySessionRef.current = session;
      setGeometryPreview({ operation: booleanPreview.operation, originals: booleanPreview.inputIds, proposed: booleanPreview.result, warnings: booleanPreview.warnings });
      return;
    }
    const session = new GeometryOperationSession(doc, action.type === 'expand' ? action.objectIds : [action.objectId]);
    const preview = action.type === 'expand'
      ? session.previewExpand()
      : action.type === 'corners'
        ? session.previewCorners(action.objectId, { mode: action.mode, radius: action.radius })
        : action.type === 'offset'
          ? session.previewOffset(action.objectId, { direction: action.direction, distance: action.distance })
          : session.previewOutline(action.objectId);
    geometrySessionRef.current = session;
    setGeometryPreview(preview);
    if (action.type === 'expand') setDestructiveGeometryConfirmOpen(true);
  }, [doc, handleExecuteCommand]);

  const handleApplyGeometryPreview = useCallback((allowDestructive = false) => {
    if (destructiveGeometryConfirmOpen && !allowDestructive) return;
    const command = geometrySessionRef.current?.apply();
    if (command) handleExecuteCommand(command);
    setGeometryPreview(null);
    setDestructiveGeometryConfirmOpen(false);
  }, [destructiveGeometryConfirmOpen, handleExecuteCommand]);

  const handleCancelGeometryPreview = useCallback(() => {
    geometrySessionRef.current?.cancel();
    setGeometryPreview(null);
    setDestructiveGeometryConfirmOpen(false);
  }, []);

  useEffect(() => {
    if (!destructiveGeometryConfirmOpen) return;
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancelGeometryPreview();
        return;
      }
      if (event.key !== 'Tab') return;
      const buttons = geometryConfirmDialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
      if (!buttons || buttons.length === 0) return;
      const first = buttons[0]!;
      const last = buttons[buttons.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleDialogKeyDown);
    return () => window.removeEventListener('keydown', handleDialogKeyDown);
  }, [destructiveGeometryConfirmOpen, handleCancelGeometryPreview]);

  const handleApplyCleanup = useCallback(() => {
    if (!doc || cleanupPlan.selectedFindingIds.length === 0) return;
    const selectedIds = cleanupPlan.findings.filter((finding) => cleanupPlan.selectedFindingIds.includes(finding.id)).flatMap((finding) => finding.targetIds);
    const session = new GeometryOperationSession(doc, selectedIds);
    session.previewCleanup(cleanupPlan);
    const command = session.apply();
    if (command) handleExecuteCommand(command);
    setCleanupSelectedFindingIds([]);
  }, [cleanupPlan, doc, handleExecuteCommand]);

  const handleCancelCleanup = useCallback(() => {
    setCleanupSelectedFindingIds([]);
    handleShowPanel('properties');
  }, [handleShowPanel]);

  const handleSelectArtboard = useCallback((id: string) => {
    handleExecuteCommand(new SelectArtboardCommand(id));
    setSelection(emptySelection());
  }, [handleExecuteCommand]);

  const handleCreateArtboard = useCallback(() => {
    handleExecuteCommand(new CreateArtboardCommand());
    setSelection(emptySelection());
  }, [handleExecuteCommand]);

  const handleDuplicateArtboard = useCallback((id: string) => {
    handleExecuteCommand(new DuplicateArtboardCommand(id));
    setSelection(emptySelection());
  }, [handleExecuteCommand]);

  const handleDeleteArtboard = useCallback((id: string) => {
    handleExecuteCommand(new DeleteArtboardCommand(id));
    setSelection(emptySelection());
  }, [handleExecuteCommand]);

  const handleRenameArtboard = useCallback((id: string, name: string) => {
    if (name.trim()) handleExecuteCommand(new RenameArtboardCommand(id, name));
  }, [handleExecuteCommand]);

  const handleOrientArtboard = useCallback((id: string, orientation: 'portrait' | 'landscape') => {
    if (doc) handleExecuteCommand(new SetArtboardOrientationCommand(id, orientation, doc));
  }, [doc, handleExecuteCommand]);

  const handleToggleArtboardVisibility = useCallback((id: string, visible: boolean) => {
    if (doc) handleExecuteCommand(new UpdateArtboardCommand(id, { visible }));
  }, [doc, handleExecuteCommand]);

  const handleGroup = useCallback(() => {
    if (selectedObjectIds.length < 2) return;
    handleExecuteCommand(new GroupObjectsCommand(selectedObjectIds));
    setSelection(emptySelection());
  }, [handleExecuteCommand, selectedObjectIds]);

  const handleUngroup = useCallback(() => {
    const groups = selectedObjectIds.filter((id) => doc?.objects[id]?.type === 'group');
    if (groups.length === 0) return;
    handleExecuteCommand(new UngroupObjectsCommand(groups));
    setSelection(emptySelection());
  }, [doc, handleExecuteCommand, selectedObjectIds]);

  const handleToggleObject = useCallback((id: ObjectId, field: 'visible' | 'locked') => {
    const object = doc?.objects[id];
    if (object) handleExecuteCommand(new UpdateObjectCommand(id, { [field]: !object[field] }));
  }, [doc, handleExecuteCommand]);

  const handleAddGuide = useCallback((axis: 'horizontal' | 'vertical', position: number) => {
    handleExecuteCommand(new AddGuideCommand({ id: generateId(), axis, position, visible: true, locked: false }));
  }, [handleExecuteCommand]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const isMac = isMacPlatform();
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key.toLowerCase() === 'c') {
        if (doc) clipboardRef.current = selectedObjectIds.map((id) => doc.objects[id]).filter((object): object is SceneObject => Boolean(object));
      } else if (cmdKey && e.key.toLowerCase() === 'v') {
        if (doc && clipboardRef.current.length > 0) {
          const pasted = clipboardRef.current.map((object) => ({
            ...structuredClone(object),
            id: generateId(),
            name: `${object.name} copy`,
            layerId: doc.activeLayerId,
            transform: { ...object.transform, position: { x: object.transform.position.x + 20, y: object.transform.position.y + 20 } },
          } as SceneObject));
          handleExecuteCommand(new CreateObjectsCommand(pasted, doc.activeLayerId));
          handleSelectObjects(pasted.map((object) => object.id));
        }
      } else if (cmdKey && e.key.toLowerCase() === 'd') {
        if (doc && selectedObjectIds.length > 0) {
          const duplicates = selectedObjectIds.map((id) => doc.objects[id]).filter((object): object is SceneObject => Boolean(object)).map((object) => ({ ...structuredClone(object), id: generateId(), name: `${object.name} copy`, layerId: doc.activeLayerId, transform: { ...object.transform, position: { x: object.transform.position.x + 20, y: object.transform.position.y + 20 } } } as SceneObject));
          handleExecuteCommand(new CreateObjectsCommand(duplicates, doc.activeLayerId));
          handleSelectObjects(duplicates.map((object) => object.id));
        }
      } else if (cmdKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) handleUngroup();
        else handleGroup();
      } else if (cmdKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRepeatTransform();
      } else if (cmdKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (cmdKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (cmdKey && e.key === '0') {
        e.preventDefault();
        handleZoom100();
      } else if (cmdKey && e.key === '1') {
        e.preventDefault();
        handleFitArtboard();
        } else if (!cmdKey && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e') {
          setActiveTool('eraser');
        } else if (!cmdKey && !e.shiftKey && !e.altKey) {
           if (e.key.toLowerCase() === 'v') {
             setActiveTool('select');
            } else if (e.key.toLowerCase() === 'a') {
              setActiveTool('direct-select');
            } else if (e.key.toLowerCase() === 'o') {
              setActiveTool(e.shiftKey ? 'node-lasso' : 'lasso');
           } else if (e.key.toLowerCase() === 'r') {
             setActiveTool('rectangle');
            } else if (e.key.toLowerCase() === 'l') {
              setActiveTool('ellipse');
            } else if (e.key === '\\') {
              setActiveTool('line');
          } else if (e.key.toLowerCase() === 'p') {
              setActiveTool('pen');
           } else if (e.key.toLowerCase() === 'n') {
             setActiveTool('pencil');
           } else if (e.key.toLowerCase() === 'b') {
             setActiveTool('brush');
            } else if (e.key.toLowerCase() === 's') {
              setActiveTool('smooth');
            } else if (e.key.toLowerCase() === 'q') {
              setActiveTool('corner');
            } else if (e.key.toLowerCase() === 'k') {
             setActiveTool('knife');
           } else if (e.key.toLowerCase() === 'c') {
             setActiveTool('scissors');
           } else if (e.key.toLowerCase() === 'w') {
               setActiveTool('width');
            } else if (e.key.toLowerCase() === 'i') {
              setActiveTool('eyedropper');
            } else if (e.key.toLowerCase() === 'g') {
              setActiveTool('bucket');
           } else if (e.key.toLowerCase() === 'h') {
            setActiveTool('hand');
          } else if (e.key.toLowerCase() === 'z') {
            setActiveTool('zoom');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, selectedObjectId, selectedObjectIds, handleExecuteCommand, handleUndo, handleRedo, handleZoom100, handleFitArtboard, handleSelectObjects, handleGroup, handleUngroup, handleRepeatTransform]);

  // Center / Fit artboard on initial load once ready
  useEffect(() => {
    if (doc && (bootstrapState.status === 'ready' || bootstrapState.status === 'recovery-available' || bootstrapState.status === 'recovery-error')) {
      // Delay slightly to let viewport mount
      const timer = setTimeout(() => {
        handleFitArtboard();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [bootstrapState.status, doc, handleFitArtboard]);

  if (bootstrapState.status === 'loading' || !doc) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-app)',
          color: 'var(--color-text-secondary)',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            border: '2px solid var(--color-border-subtle)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: '13px' }}>Loading Vectoria…</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const toolHint =
    activeTool === 'select'
      ? selectedObjectId
         ? 'Drag to move · Alt+click cycles overlap · Delete to remove'
         : 'Click object to select · Alt+click cycles overlap · Space+Drag to pan'
       : activeTool === 'direct-select'
       ? 'Click node to select · Shift+click adds nodes'
       : activeTool === 'lasso'
       ? 'Draw around objects to select · Shift adds to selection'
       : activeTool === 'node-lasso'
       ? 'Draw around nodes to select · Shift adds to selection'
       : activeTool === 'rectangle'
      ? 'Drag to draw rectangle · Hold Shift for square'
      : activeTool === 'ellipse'
      ? 'Drag to draw ellipse · Hold Shift for circle'
      : activeTool === 'line'
      ? 'Drag to draw line · Hold Shift for 45°'
       : activeTool === 'pen'
       ? 'Click to add nodes · Enter/Escape to finish'
       : activeTool === 'pencil'
       ? 'Drag to draw a freehand path · Escape cancels'
       : activeTool === 'brush'
       ? 'Drag to paint a pressure-sensitive stroke · Escape cancels'
        : activeTool === 'smooth'
        ? 'Select a path, then apply Smooth in Properties'
        : activeTool === 'corner'
        ? 'Select a closed path, then drag to round, chamfer or invert corners'
        : activeTool === 'eraser'
       ? 'Drag across a path to erase · Escape cancels'
       : activeTool === 'knife'
       ? 'Drag a cut line across a path'
       : activeTool === 'scissors'
       ? 'Click a path segment to split it'
       : activeTool === 'width'
       ? 'Select a brush path to edit local width'
       : activeTool === 'zoom'
      ? 'Click to zoom in · Wheel to zoom at cursor'
      : 'Drag to pan view';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--color-app)',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar */}
      <TopBar
        documentName={doc.name}
        saveStatus={saveStatus}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        zoomPercent={zoomPercent}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFitArtboard={handleFitArtboard}
        onZoom100={handleZoom100}
        onExportSvg={handleExportSvg}
        rightDockOpen={rightDockOpen}
         onToggleRightDock={() => setRightDockOpen((open) => !open)}
         onNewDocument={() => setNewDocumentOpen(true)}
         onExportPng={handleExportPng}
          onFitDrawing={handleFitDrawing}
          onFitSelection={handleFitSelection}
         onImportSvg={handleImportSvg}
          showGrid={doc.grid.visible}
          snapToGrid={doc.snap.enabled}
          onToggleGrid={() => handleUpdateGridSettings({ ...doc.grid, visible: !doc.grid.visible })}
          onToggleSnap={() => handleUpdateSnap(!doc.snap.enabled)}
           theme={theme}
           onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
           onRetrySave={handleRetrySave}
         onShowPanel={handleShowPanel}
         selectedObjectIds={selectedObjectIds}
         onConvertToCurves={(objectIds) => handleGeometryAction({ type: 'expand', objectIds })}
          onOpenCleanup={handleOpenCleanup}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
          onRepeatTransform={handleRepeatTransform}
        />

      {bootstrapState.status === 'recovery-error' && (
        <RecoveryBanner 
          message="Nie udało się odczytać poprzedniego dokumentu. Uruchomiono nowy dokument lokalny." 
          details={bootstrapState.error?.toString()} 
        />
      )}
      {bootstrapState.status === 'recovery-available' && (
        <RecoveryBanner message="Wykryto dokument po niezamkniętej sesji." details="Wybierz, czy zachować ostatni autosave, czy przywrócić ostatnią poprawną wersję." onRestore={handleRestoreRecovery} onDiscard={handleDiscardRecovery} />
      )}

      <ContextualControlBar
        document={doc}
        activeTool={activeTool}
        selectedObjectId={selectedObjectId}
        onUpdatePosition={handleUpdatePosition}
         onUpdateDimensions={handleUpdateDimensions}
          onUpdateLineEndpoint={handleUpdateLineEndpoint}
          onUpdateFill={handleUpdateFill}
          freehandSettings={freehandSettings}
          onFreehandSettingsChange={setFreehandSettings}
      />

      {/* Main Workspace Area */}
      <div className="editor-main-area">
        {/* Left Tool Rail */}
        <ToolRail activeTool={activeTool} onSelectTool={setActiveTool} />

        {/* Center Canvas */}
        <div className="canvas-workspace" data-testid="canvas-workspace">
          <CanvasRulers camera={camera} unit={doc?.unit ?? 'px'} onAddGuide={handleAddGuide} />
         <CanvasViewport
            document={doc}
            activeTool={activeTool}
            selectedObjectId={selectedObjectId}
            selectedObjectIds={selectedObjectIds}
            selection={selection}
            camera={camera}
            onExecuteCommand={handleExecuteCommand}
            onSelectObject={handleSelectObject}
            onSelectObjects={handleSelectObjects}
            onSelectSelection={handleSelectSelection}
            onCursorMove={setCursorWorld}
            onZoomChange={setZoomPercent}
             showGrid={doc.grid.visible}
            snapToGrid={doc.snap.enabled}
             gridSettings={doc.grid}
             freehandSettings={freehandSettings}
             geometryPreview={geometryPreview}
           />
        </div>

        <RightDock
          document={doc}
          selectedObjectId={selectedObjectId}
          selectedObjectIds={selectedObjectIds}
          history={history.history}
          historyCursor={history.cursor}
          onHistoryJump={handleHistoryJump}
          versions={documentVersions}
          onSaveVersion={handleSaveVersion}
          onRestoreVersion={handleRestoreVersion}
          onSelectObject={handleSelectObject}
          onSelectObjects={handleSelectObjects}
          onUpdatePosition={handleUpdatePosition}
          onUpdateDimensions={handleUpdateDimensions}
          onUpdateGroupTransform={handleUpdateGroupTransform}
          onUpdateLineEndpoint={handleUpdateLineEndpoint}
          onUpdateCornerRadius={handleUpdateCornerRadius}
          onUpdateFill={handleUpdateFill}
          onUpdateObjectStyle={handleUpdateObjectStyle}
          onUpdateRotation={handleUpdateRotation}
          onUpdatePivot={handleUpdatePivot}
          onUpdateSkew={handleUpdateSkew}
          onAlign={handleAlign}
          onDistribute={handleDistribute}
          onReorder={handleReorder}
          onUpdateArtboard={handleUpdateArtboard}
          onUpdateUnit={handleUpdateUnit}
          gridSettings={doc.grid}
          onUpdateGridSettings={handleUpdateGridSettings}
          selection={selection}
          onUpdatePathNode={handleUpdatePathNode}
          onUpdatePathNodeKind={handleUpdatePathNodeKind}
          onUpdatePathClosed={handleUpdatePathClosed}
          onPathAction={handlePathAction}
          geometryPreview={geometryPreview}
          onGeometryAction={handleGeometryAction}
          onApplyGeometryPreview={handleApplyGeometryPreview}
          onCancelGeometryPreview={handleCancelGeometryPreview}
          onOpenCleanup={handleOpenCleanup}
          cleanupPlan={cleanupPlan}
          onCleanupSelectionChange={setCleanupSelectedFindingIds}
          onApplyCleanup={handleApplyCleanup}
          onCancelCleanup={handleCancelCleanup}
          onToggleObject={handleToggleObject}
          onSelectArtboard={handleSelectArtboard}
          onCreateArtboard={handleCreateArtboard}
          onDuplicateArtboard={handleDuplicateArtboard}
          onDeleteArtboard={handleDeleteArtboard}
          onRenameArtboard={handleRenameArtboard}
          onOrientArtboard={handleOrientArtboard}
          onToggleArtboardVisibility={handleToggleArtboardVisibility}
          activePanel={activeDockPanel}
          onPanelChange={setActiveDockPanel}
          open={rightDockOpen}
          isDirty={revision !== savedRevision}
         />
      </div>

      {/* Status Bar */}
      <StatusBar
        toolHint={toolHint}
         activeTool={activeTool === 'select' ? 'Select' : activeTool === 'direct-select' ? 'Direct Select' : activeTool === 'lasso' ? 'Lasso' : activeTool === 'node-lasso' ? 'Node Lasso' : activeTool === 'rectangle' ? 'Rectangle' : activeTool === 'ellipse' ? 'Ellipse' : activeTool === 'line' ? 'Line' : activeTool === 'pen' ? 'Pen' : activeTool === 'pencil' ? 'Pencil' : activeTool === 'brush' ? 'Brush' : activeTool === 'smooth' ? 'Smooth' : activeTool === 'corner' ? 'Corner' : activeTool === 'eraser' ? 'Eraser' : activeTool === 'knife' ? 'Knife' : activeTool === 'scissors' ? 'Scissors' : activeTool === 'width' ? 'Width' : activeTool === 'hand' ? 'Hand' : 'Zoom'}
        selectedObjectName={selectedObjectId ? doc.objects[selectedObjectId]?.name ?? null : null}
        selectedObjectCount={selectedObjectIds.length}
        cursorWorld={cursorWorld}
        zoomPercent={zoomPercent}
        saveStatus={saveStatus}
         revision={revision}
         savedRevision={savedRevision}
        objectCount={Object.keys(doc.objects).length}
         unit={doc.unit}
         snapEnabled={doc.snap.enabled}
       />
       {newDocumentOpen && <NewDocumentDialog onClose={() => setNewDocumentOpen(false)} onCreate={handleCreateDocument} />}
       {destructiveGeometryConfirmOpen && geometryPreview && <div className="dialog-backdrop" role="presentation"><section ref={geometryConfirmDialogRef} className="geometry-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="geometry-confirm-title"><div className="dialog-eyebrow">Destructive geometry edit</div><h2 id="geometry-confirm-title">Convert to curves?</h2><p className="dialog-description">Selected parametric objects will become paths. Visual geometry, style and transform stay unchanged, but shape parameters will no longer be editable.</p><div className="geometry-confirm-summary" role="status">{geometryPreview.proposed.length} object(s) ready. Undo remains available.</div><div className="dialog-actions"><Button size="sm" variant="ghost" onClick={handleCancelGeometryPreview}>Cancel</Button><Button size="sm" variant="danger" autoFocus onClick={() => handleApplyGeometryPreview(true)}>Convert to curves</Button></div></section></div>}
    </div>
  );
};
