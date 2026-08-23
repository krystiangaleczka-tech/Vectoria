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
  createDefaultDocument,
  getObjectBounds,
} from '@vectoria/core';
import { Camera, emptySelection, selectionService } from '@vectoria/editor-engine';
import {
  bootstrapDocument,
  saveDocumentSnapshot,
  exportArtboardToSvg,
  downloadSvg,
  rasterizeSvgToPng,
  downloadBlob,
  importSvgToDocument,
  type BootstrapState,
} from '@vectoria/io';

import { TopBar } from '../features/topbar/TopBar.js';
import { ToolRail, type ActiveTool } from '../features/toolbar/ToolRail.js';
import { CanvasViewport } from '../features/canvas/CanvasViewport.js';
import { ContextualControlBar } from '../features/panels/ContextualControlBar.js';
import { RightDock } from '../features/panels/RightDock.js';
import { StatusBar } from '../features/statusbar/StatusBar.js';
import { NewDocumentDialog } from '../features/dialogs/NewDocumentDialog.js';
import type { DockPanel } from '../features/panels/RightDock.js';
import type { PathAction } from '../features/panels/PropertiesPanel.js';

function isMacPlatform(): boolean {
  const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform
    ?? navigator.platform
    ?? '';
  return /mac/i.test(platform);
}

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved-locally' | 'error' | 'offline';

const RecoveryBanner: React.FC<{ message: string; details?: string }> = ({ message, details }) => (
  <div className="recovery-banner" role="alert">
    <span>{message}</span>
    {details && <span style={{ opacity: 0.7 }}>{details}</span>}
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
  const [cursorWorld, setCursorWorld] = useState<Vec2 | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('vectoria-theme') === 'light' ? 'light' : 'dark');

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
      if (state.status === 'ready' || state.status === 'recovery-error') {
        history.clear(state.revision);
        setDoc(state.document);
        latestDocRef.current = state.document;
        latestRevisionRef.current = state.revision;
        savedRevisionRef.current = state.revision;
        setRevision(state.revision);
        setSavedRevision(state.revision);
        setSaveStatus(state.status === 'ready' ? 'saved-locally' : 'error');
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
      const newDoc = history.execute(command, doc);
      if (newDoc !== doc) commitDocument(newDoc);
    },
    [commitDocument, doc, history]
  );

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
    const bounds = Object.values(doc.objects).filter((object) => object.visible).map(getObjectBounds);
    if (bounds.length === 0) return handleFitArtboard();
    const minX = Math.min(...bounds.map((rect) => rect.x));
    const minY = Math.min(...bounds.map((rect) => rect.y));
    const maxX = Math.max(...bounds.map((rect) => rect.x + rect.width));
    const maxY = Math.max(...bounds.map((rect) => rect.y + rect.height));
     camera.fitRect({ x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }, { x: Math.max(100, window.innerWidth - 368), y: Math.max(100, window.innerHeight - 134) });
    setZoomPercent(camera.zoomPercent);
  }, [camera, doc, handleFitArtboard]);

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
      if (object?.type === 'ellipse') handleExecuteCommand(new SetEllipseGeometryCommand(id, { width, height }));
      else if (object?.type === 'rectangle') handleExecuteCommand(new SetRectangleGeometryCommand(id, { width, height }));
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

  const handleToggleObject = useCallback((id: ObjectId, field: 'visible' | 'locked') => {
    const object = doc?.objects[id];
    if (object) handleExecuteCommand(new UpdateObjectCommand(id, { [field]: !object[field] }));
  }, [doc, handleExecuteCommand]);

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
        } else if (!cmdKey && !e.shiftKey && !e.altKey) {
           if (e.key.toLowerCase() === 'v') {
             setActiveTool('select');
            } else if (e.key.toLowerCase() === 'a') {
              setActiveTool('direct-select');
           } else if (e.key.toLowerCase() === 'r') {
             setActiveTool('rectangle');
            } else if (e.key.toLowerCase() === 'l') {
              setActiveTool('ellipse');
            } else if (e.key === '\\') {
              setActiveTool('line');
           } else if (e.key.toLowerCase() === 'p') {
             setActiveTool('pen');
          } else if (e.key.toLowerCase() === 'h') {
            setActiveTool('hand');
          } else if (e.key.toLowerCase() === 'z') {
            setActiveTool('zoom');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, selectedObjectId, selectedObjectIds, handleExecuteCommand, handleUndo, handleRedo, handleZoom100, handleFitArtboard, handleSelectObjects]);

  // Center / Fit artboard on initial load once ready
  useEffect(() => {
    if (doc && bootstrapState.status === 'ready') {
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
        ? 'Drag to move · Click empty to deselect · Delete to remove'
        : 'Click object to select · Space+Drag to pan · Wheel to zoom'
       : activeTool === 'direct-select'
       ? 'Click node to select · Shift+click adds nodes'
       : activeTool === 'rectangle'
      ? 'Drag to draw rectangle · Hold Shift for square'
      : activeTool === 'ellipse'
      ? 'Drag to draw ellipse · Hold Shift for circle'
      : activeTool === 'line'
      ? 'Drag to draw line · Hold Shift for 45°'
      : activeTool === 'pen'
      ? 'Click to add nodes · Enter to finish · Escape to cancel'
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
         onImportSvg={handleImportSvg}
          showGrid={doc.grid.visible}
          snapToGrid={doc.snap.enabled}
          onToggleGrid={() => handleUpdateGridSettings({ ...doc.grid, visible: !doc.grid.visible })}
          onToggleSnap={() => handleUpdateSnap(!doc.snap.enabled)}
           theme={theme}
           onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
           onRetrySave={handleRetrySave}
           onShowPanel={handleShowPanel}
       />

      {bootstrapState.status === 'recovery-error' && (
        <RecoveryBanner 
          message="Nie udało się odczytać poprzedniego dokumentu. Uruchomiono nowy dokument lokalny." 
          details={bootstrapState.error?.toString()} 
        />
      )}

      <ContextualControlBar
        document={doc}
        activeTool={activeTool}
        selectedObjectId={selectedObjectId}
        onUpdatePosition={handleUpdatePosition}
         onUpdateDimensions={handleUpdateDimensions}
         onUpdateLineEndpoint={handleUpdateLineEndpoint}
         onUpdateFill={handleUpdateFill}
      />

      {/* Main Workspace Area */}
      <div className="editor-main-area">
        {/* Left Tool Rail */}
        <ToolRail activeTool={activeTool} onSelectTool={setActiveTool} />

        {/* Center Canvas */}
        <div className="canvas-workspace" data-testid="canvas-workspace">
          <div className="ruler-corner" aria-hidden="true" />
          <div className="ruler ruler-horizontal" aria-hidden="true"><span>0</span><span>100</span><span>200</span><span>300</span><span>400</span><span>500</span></div>
          <div className="ruler ruler-vertical" aria-hidden="true"><span>0</span><span>100</span><span>200</span><span>300</span><span>400</span></div>
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
         />
        </div>

        <RightDock
          document={doc}
          selectedObjectId={selectedObjectId}
          selectedObjectIds={selectedObjectIds}
           history={history.history}
        historyCursor={history.cursor}
           onHistoryJump={handleHistoryJump}
           activePanel={activeDockPanel}
           onPanelChange={setActiveDockPanel}
           onSelectObject={handleSelectObject}
           onSelectObjects={handleSelectObjects}
          onUpdatePosition={handleUpdatePosition}
           onUpdateDimensions={handleUpdateDimensions}
           onUpdateLineEndpoint={handleUpdateLineEndpoint}
           onUpdateCornerRadius={handleUpdateCornerRadius}
            onUpdateFill={handleUpdateFill}
           onUpdateObjectStyle={handleUpdateObjectStyle}
           onUpdateRotation={handleUpdateRotation}
            onUpdateArtboard={handleUpdateArtboard}
            onUpdateUnit={handleUpdateUnit}
             gridSettings={doc.grid}
             onUpdateGridSettings={handleUpdateGridSettings}
            onToggleObject={handleToggleObject}
            onSelectArtboard={handleSelectArtboard}
            onCreateArtboard={handleCreateArtboard}
            onDuplicateArtboard={handleDuplicateArtboard}
            onDeleteArtboard={handleDeleteArtboard}
             selection={selection}
             onUpdatePathNode={handleUpdatePathNode}
             onUpdatePathNodeKind={handleUpdatePathNodeKind}
              onUpdatePathClosed={handleUpdatePathClosed}
              onPathAction={handlePathAction}
              open={rightDockOpen}
        />
      </div>

      {/* Status Bar */}
      <StatusBar
        toolHint={toolHint}
         activeTool={activeTool === 'select' ? 'Select' : activeTool === 'direct-select' ? 'Direct Select' : activeTool === 'rectangle' ? 'Rectangle' : activeTool === 'ellipse' ? 'Ellipse' : activeTool === 'line' ? 'Line' : activeTool === 'pen' ? 'Pen' : activeTool === 'hand' ? 'Hand' : 'Zoom'}
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
    </div>
  );
};
