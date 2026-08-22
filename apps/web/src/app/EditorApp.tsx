import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { generateId } from '@vectoria/shared';
import type { Vec2 } from '@vectoria/shared';
import type {
  DocumentModel,
  ObjectId,
  Command,
  ObjectStyle,
  SceneObject,
} from '@vectoria/core';
import {
  CommandHistory,
  CreateObjectsCommand,
  TransformObjectsCommand,
  SetRectangleGeometryCommand,
  SetEllipseGeometryCommand,
  SetObjectStyleCommand,
  UpdateArtboardCommand,
  UpdateObjectCommand,
  createDefaultDocument,
  getObjectBounds,
} from '@vectoria/core';
import { Camera } from '@vectoria/editor-engine';
import {
  bootstrapDocument,
  saveDocument,
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

function isMacPlatform(): boolean {
  const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform
    ?? navigator.platform
    ?? '';
  return /mac/i.test(platform);
}

const RecoveryBanner: React.FC<{ message: string; details?: string }> = ({ message, details }) => (
  <div style={{
    backgroundColor: 'var(--color-danger, #541616)',
    color: '#ffc4c4',
    padding: '8px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    borderBottom: '1px solid #732222',
  }}>
    <span>{message}</span>
    {details && <span style={{ opacity: 0.7 }}>{details}</span>}
  </div>
);

export const EditorApp: React.FC = () => {
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>({ status: 'loading' });
  const [doc, setDoc] = useState<DocumentModel | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selectedObjectId, setSelectedObjectId] = useState<ObjectId | null>(null);
  const [rightDockOpen, setRightDockOpen] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [cursorWorld, setCursorWorld] = useState<Vec2 | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('vectoria-theme') === 'light' ? 'light' : 'dark');

  const history = useMemo(() => new CommandHistory(), []);
  const camera = useMemo(() => new Camera(), []);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const isBootstrappedRef = useRef(false);
  const latestDocRef = useRef<DocumentModel | null>(null);
  const clipboardRef = useRef<SceneObject[]>([]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('vectoria-theme', theme);
  }, [theme]);

  useEffect(() => {
    latestDocRef.current = doc;
  }, [doc]);

  useEffect(() => {
    const flush = () => {
      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
      const latest = latestDocRef.current;
      if (latest) {
        void saveDocument(latest);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    // pagehide is the primary mechanism — better bfcache support than beforeunload.
    // visibilitychange covers tab switching / app backgrounding on mobile.
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flush();
    };
  }, []);

  // Initialize and load document from IndexedDB
  useEffect(() => {
    async function init() {
      const state = await bootstrapDocument();
      setBootstrapState(state);
      if (state.status === 'ready' || state.status === 'recovery-error') {
        setDoc(state.document);
      }
      isBootstrappedRef.current = true;
    }
    init();
  }, []);

  // Autosave trigger with 700ms debounce
  const scheduleAutosave = useCallback((currentDoc: DocumentModel) => {
    if (!isBootstrappedRef.current) return;

    setSaveStatus('saving');
    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await saveDocument(currentDoc);
        setSaveStatus('saved');
      } catch (err) {
        console.error('[Vectoria] Save error:', err);
        setSaveStatus('error');
      }
    }, 700);
  }, []);

  // Execute command handler
  const handleExecuteCommand = useCallback(
    (command: Command) => {
      if (!doc) return;
      const newDoc = history.execute(command, doc);
      setDoc(newDoc);
      scheduleAutosave(newDoc);
    },
    [doc, history, scheduleAutosave]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (!doc || !history.canUndo) return;
    const newDoc = history.undo(doc);
    if (newDoc) {
      setDoc(newDoc);
      scheduleAutosave(newDoc);
    }
  }, [doc, history, scheduleAutosave]);

  const handleRedo = useCallback(() => {
    if (!doc || !history.canRedo) return;
    const newDoc = history.redo(doc);
    if (newDoc) {
      setDoc(newDoc);
      scheduleAutosave(newDoc);
    }
  }, [doc, history, scheduleAutosave]);

  // Fit Artboard & 100% Zoom
  const handleFitArtboard = useCallback(() => {
    if (!doc) return;
    const activeArtboard = doc.artboards[doc.activeArtboardId];
    if (!activeArtboard) return;

    // Viewport approximate size
    const width = window.innerWidth - 56 - 280; // ToolRail + RightDock
    const height = window.innerHeight - 72 - 40 - 28; // TopBar + ContextualControlBar + StatusBar

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
    const width = window.innerWidth - 56 - 280;
    const height = window.innerHeight - 72 - 40 - 28;
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
    camera.fitRect({ x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }, { x: Math.max(100, window.innerWidth - 336), y: Math.max(100, window.innerHeight - 140) });
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
    history.clear();
    setDoc(next);
    setSelectedObjectId(null);
    setNewDocumentOpen(false);
    scheduleAutosave(next);
  }, [history, scheduleAutosave]);

  const handleImportSvg = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.svg,image/svg+xml';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then((svg) => {
        const imported = importSvgToDocument(svg, file.name.replace(/\.svg$/i, '') || 'Imported SVG');
        history.clear(); setDoc(imported); setSelectedObjectId(null); scheduleAutosave(imported);
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

  const handleUpdateArtboard = useCallback((width: number, height: number) => {
    if (!doc) return;
    handleExecuteCommand(new UpdateArtboardCommand(doc.activeArtboardId, { width, height }));
  }, [doc, handleExecuteCommand]);

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
        if (selectedObjectId && doc?.objects[selectedObjectId]) clipboardRef.current = [doc.objects[selectedObjectId]!];
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
          setSelectedObjectId(pasted[0]?.id ?? null);
        }
      } else if (cmdKey && e.key.toLowerCase() === 'd') {
        if (doc && selectedObjectId && doc.objects[selectedObjectId]) {
          const object = doc.objects[selectedObjectId]!;
          const duplicate = { ...structuredClone(object), id: generateId(), name: `${object.name} copy`, transform: { ...object.transform, position: { x: object.transform.position.x + 20, y: object.transform.position.y + 20 } } } as SceneObject;
          handleExecuteCommand(new CreateObjectsCommand([duplicate], doc.activeLayerId));
          setSelectedObjectId(duplicate.id);
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
           } else if (e.key.toLowerCase() === 'r') {
             setActiveTool('rectangle');
           } else if (e.key.toLowerCase() === 'e') {
             setActiveTool('ellipse');
           } else if (e.key.toLowerCase() === 'l') {
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
  }, [doc, selectedObjectId, handleExecuteCommand, handleUndo, handleRedo, handleZoom100, handleFitArtboard]);

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
         showGrid={showGrid}
         snapToGrid={snapToGrid}
         onToggleGrid={() => setShowGrid((visible) => !visible)}
         onToggleSnap={() => setSnapToGrid((enabled) => !enabled)}
         theme={theme}
         onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
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
            camera={camera}
            onExecuteCommand={handleExecuteCommand}
            onSelectObject={setSelectedObjectId}
            onCursorMove={setCursorWorld}
            onZoomChange={setZoomPercent}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
          />
        </div>

        <RightDock
          document={doc}
          selectedObjectId={selectedObjectId}
          historyEntries={history.historyEntries}
          onSelectObject={setSelectedObjectId}
          onUpdatePosition={handleUpdatePosition}
          onUpdateDimensions={handleUpdateDimensions}
           onUpdateFill={handleUpdateFill}
           onUpdateObjectStyle={handleUpdateObjectStyle}
           onUpdateRotation={handleUpdateRotation}
           onUpdateArtboard={handleUpdateArtboard}
           onToggleObject={handleToggleObject}
           open={rightDockOpen}
        />
      </div>

      {/* Status Bar */}
      <StatusBar
        toolHint={toolHint}
         activeTool={activeTool === 'select' ? 'Select' : activeTool === 'rectangle' ? 'Rectangle' : activeTool === 'ellipse' ? 'Ellipse' : activeTool === 'line' ? 'Line' : activeTool === 'pen' ? 'Pen' : activeTool === 'hand' ? 'Hand' : 'Zoom'}
        selectedObjectName={selectedObjectId ? doc.objects[selectedObjectId]?.name ?? null : null}
        selectedObjectCount={selectedObjectId ? 1 : 0}
        cursorWorld={cursorWorld}
        zoomPercent={zoomPercent}
        saveStatus={saveStatus}
        objectCount={Object.keys(doc.objects).length}
      />
      {newDocumentOpen && <NewDocumentDialog onClose={() => setNewDocumentOpen(false)} onCreate={handleCreateDocument} />}
    </div>
  );
};
