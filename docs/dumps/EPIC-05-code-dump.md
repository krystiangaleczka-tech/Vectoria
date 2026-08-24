# EPIC-05 Code Dump

Generated from current working tree.
Scope: implementation files changed by commits b7d4fb1 and 4fc78f6.

## apps/web/e2e/editor.spec.ts

```typescript
import { test, expect } from '@playwright/test';

test.describe('Vectoria MVP Skeleton', () => {
  test('should load the editor and initialize properly', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Vectoria/i);

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    await expect(canvas).toBeVisible();

    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propertiesPanel).toBeVisible();

    const rectangleTool = page.locator('button[title="Rectangle Tool (R)"]');
    await expect(rectangleTool).toBeVisible();
  });

  test('workspace navigation closes menus and layers select document objects', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Plik' }).click();
    await expect(page.getByRole('menuitem', { name: 'Eksportuj SVG' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem', { name: 'Eksportuj SVG' })).toBeHidden();

    await page.getByRole('button', { name: 'Okno' }).click();
    await page.getByRole('menuitem', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Okno' }).click();
    await page.getByRole('menuitem', { name: 'Ukryj dock' }).click();
    await expect(page.getByTestId('right-dock')).toBeHidden();
    await page.getByRole('button', { name: 'Okno' }).click();
    await page.getByRole('menuitem', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toBeVisible();

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;
    await page.mouse.move(cx - 35, cy - 35);
    await page.mouse.down();
    await page.mouse.move(cx + 35, cy + 35, { steps: 5 });
    await page.mouse.up();

    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await expect(page.getByTestId('layers-panel')).toContainText('Rectangle 1');
    await page.getByRole('button', { name: 'Zaznacz Rectangle 1' }).click();
    await page.getByRole('tab', { name: 'Właściwości' }).click();
    await expect(page.getByTestId('properties-panel')).toContainText('Object Properties');
  });

  test('draw rectangle → select → drag → verify position changes → undo → redo', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    await expect(canvas).toBeVisible();

    // Select rectangle tool
    const rectTool = page.locator('button[title="Rectangle Tool (R)"]');
    await rectTool.click();

    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;

    // Draw a rectangle by dragging
    await page.mouse.move(cx - 50, cy - 50);
    await page.mouse.down();
    await page.mouse.move(cx + 50, cy + 50, { steps: 10 });
    await page.mouse.up();

    // Switch to select tool
    const selectTool = page.locator('button[title="Select Tool (V)"]');
    await selectTool.click();

    // Click on the rectangle to select it
    await page.mouse.click(cx, cy);

    // Verify properties panel shows the rectangle with initial position
    const propsPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propsPanel).toContainText('Object Properties');

    const xInput = page.locator('[data-testid="prop-x"] input');
    const yInput = page.locator('[data-testid="prop-y"] input');

    const initialX = await xInput.inputValue();
    const initialY = await yInput.inputValue();

    // Drag the rectangle to move it
    await page.mouse.move(cx, cy);
    await page.mouse.down();

    // Move but don't release yet - verify position hasn't changed (no doc mutation during drag)
    await page.mouse.move(cx + 50, cy + 50, { steps: 5 });

    // Position should still be initial (preview only, not committed)
    const xDuringDrag = await xInput.inputValue();
    const yDuringDrag = await yInput.inputValue();
    expect(xDuringDrag).toBe(initialX);
    expect(yDuringDrag).toBe(initialY);

    // Release mouse to commit the move
    await page.mouse.up();

    // Now position should have changed
    await expect.poll(async () => parseFloat(await xInput.inputValue())).toBeGreaterThan(parseFloat(initialX));
    await expect.poll(async () => parseFloat(await yInput.inputValue())).toBeGreaterThan(parseFloat(initialY));
    const newX = await xInput.inputValue();
    const newY = await yInput.inputValue();

    // Undo the move through toolbar action.
    await page.locator('[data-testid="undo-button"]').click();

    // Verify rectangle is back at original position
    await expect.poll(() => xInput.inputValue()).toBe(initialX);
    await expect.poll(() => yInput.inputValue()).toBe(initialY);

    // Redo the move through toolbar action.
    await page.locator('[data-testid="redo-button"]').click();

    // Verify rectangle moved again
    await expect.poll(() => xInput.inputValue()).toBe(newX);
    await expect.poll(() => yInput.inputValue()).toBe(newY);
  });

  test('pointercancel leaves document and history unchanged', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    await page.getByRole('button', { name: 'Rectangle Tool' }).click();
    await page.mouse.move(center.x - 40, center.y - 40);
    await page.mouse.down();
    await page.mouse.move(center.x + 40, center.y + 40, { steps: 4 });
    await page.mouse.up();
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Create rectangle');
    await page.getByRole('tab', { name: 'Właściwości' }).click();

    await page.getByRole('button', { name: 'Select Tool', exact: true }).click();
    await page.mouse.click(center.x, center.y);
    const xInput = page.getByTestId('prop-x').locator('input');
    const yInput = page.getByTestId('prop-y').locator('input');
    const initialX = await xInput.inputValue();
    const initialY = await yInput.inputValue();

    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 60, center.y + 60, { steps: 4 });
    await canvas.dispatchEvent('pointercancel', { bubbles: true, pointerId: 1 });
    await page.mouse.up();

    expect(await xInput.inputValue()).toBe(initialX);
    expect(await yInput.inputValue()).toBe(initialY);
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel').locator('.history-entry-button')).toHaveCount(2);
  });

  test('history panel exposes current cursor and jumps without direct document mutation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    await page.locator('button[title="Rectangle Tool (R)"]').click();
    await page.mouse.move(canvasBox.x + 240, canvasBox.y + 180);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 300, canvasBox.y + 240, { steps: 4 });
    await page.mouse.up();

    await page.getByRole('tab', { name: 'Historia' }).click();
    const historyPanel = page.getByTestId('history-panel');
    await expect(historyPanel).toContainText('Create rectangle');
    await expect(historyPanel.locator('[aria-current="step"]')).toContainText('Create rectangle');

    await historyPanel.getByRole('button', { name: 'Stan początkowy' }).click();
    await expect(historyPanel.locator('[aria-current="step"]')).toContainText('Stan początkowy');
    await expect(page.getByTestId('statusbar')).toContainText('0 objects');

    await historyPanel.getByRole('button', { name: 'Create rectangle' }).click();
    await expect(historyPanel.locator('[aria-current="step"]')).toContainText('Create rectangle');
  });

  test('SVG export contains correct structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    await expect(canvas).toBeVisible();

    const rectTool = page.locator('button[title="Rectangle Tool (R)"]');
    await rectTool.click();

    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;

    await page.mouse.move(cx - 30, cy - 30);
    await page.mouse.down();
    await page.mouse.move(cx + 30, cy + 30, { steps: 5 });
    await page.mouse.up();

    // Set up download interception
    const downloadPromise = page.waitForEvent('download');

    // Click export SVG button
    const exportBtn = page.locator('[data-testid="export-svg-button"]');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Verify download was triggered and contains correct SVG structure
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.svg$/i);

    // Read the downloaded file content
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];

    await new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    const svgContent = Buffer.concat(chunks).toString('utf-8');

    // Verify SVG structure
    expect(svgContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('viewBox="0 0');
    expect(svgContent).toContain('<rect');
    expect(svgContent).toContain('width="');
    expect(svgContent).toContain('height="');
    expect(svgContent).toContain('transform="matrix(');
  });

  test('autosave: document persists after page reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('[data-testid="canvas-viewport"]');
    await expect(canvas).toBeVisible();

    // Draw a rectangle
    const rectTool = page.locator('button[title="Rectangle Tool (R)"]');
    await rectTool.click();

    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;

    await page.mouse.move(cx - 40, cy - 40);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 40, { steps: 5 });
    await page.mouse.up();

    // Verify object count is 1
    const statusbar = page.locator('[data-testid="statusbar"]');
    await expect(statusbar).toContainText('1 object');

    // Wait for autosave (debounced at 700ms)
    await page.waitForTimeout(1500);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify the editor loaded with the saved document
    await expect(canvas).toBeVisible();

    // Verify object count is still 1 after reload
    await expect(statusbar).toContainText('1 object');

    // Switch to select tool and click where the rectangle was
    const selectTool = page.locator('button[title="Select Tool (V)"]');
    await selectTool.click();
    await page.mouse.click(cx, cy);

    // Verify properties panel shows the rectangle (proves it was saved and restored)
    const propsPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propsPanel).toContainText('Object Properties');

    // Verify X and Y inputs have values (not empty)
    const xInput = page.locator('[data-testid="prop-x"] input');
    const yInput = page.locator('[data-testid="prop-y"] input');

    const xValue = await xInput.inputValue();
    const yValue = await yInput.inputValue();

    expect(xValue).not.toBe('');
    expect(yValue).not.toBe('');
    expect(parseFloat(xValue)).toBeGreaterThan(0);
    expect(parseFloat(yValue)).toBeGreaterThan(0);
  });

  test('Pen Tool creates open cubic path and commits one history entry', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    await page.getByRole('button', { name: 'Pen Tool' }).click();

    const points = [
      { x: box.x + box.width / 2 - 90, y: box.y + box.height / 2 - 40 },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 - 90 },
      { x: box.x + box.width / 2 + 90, y: box.y + box.height / 2 - 20 },
    ];
    await page.mouse.click(points[0]!.x, points[0]!.y);
    await page.mouse.move(points[1]!.x, points[1]!.y);
    await page.mouse.down();
    await page.mouse.move(points[1]!.x + 35, points[1]!.y + 20, { steps: 4 });
    await page.mouse.up();
    await page.mouse.click(points[2]!.x, points[2]!.y);
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('statusbar')).toContainText('1 object');
    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await expect(page.getByTestId('layers-panel')).toContainText('Path 1');
    await page.getByRole('tab', { name: 'Historia' }).click();
    await expect(page.getByTestId('history-panel')).toContainText('Create path');
  });

  test('Direct Select edits cubic handles without mutating during drag', async ({ page }) => {
    page.on('console', (message) => console.log(`[browser:${message.type()}] ${message.text()}`));
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('canvas-viewport');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const points = [
      { x: center.x - 100, y: center.y - 30 },
      { x: center.x, y: center.y - 90 },
      { x: center.x + 100, y: center.y - 20 },
    ];

    await page.getByRole('button', { name: 'Pen Tool' }).click();
    await page.mouse.click(points[0]!.x, points[0]!.y);
    await page.mouse.move(points[1]!.x, points[1]!.y);
    await page.mouse.down();
    await page.mouse.move(points[1]!.x + 35, points[1]!.y + 20, { steps: 4 });
    await page.mouse.up();
    await page.mouse.click(points[2]!.x, points[2]!.y);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('statusbar')).toContainText('1 object');

    await page.getByRole('tab', { name: 'Warstwy' }).click();
    await page.getByRole('button', { name: /Zaznacz Path/ }).click();
    await page.getByRole('tab', { name: 'Właściwości' }).click();
    await page.getByRole('button', { name: 'Direct Select Tool' }).click();
    await page.mouse.click(points[1]!.x, points[1]!.y);
    const outX = page.getByTestId('prop-handle-out-x').locator('input');
    await expect(outX).toBeEnabled();
    const initialX = Number(await outX.inputValue());

    await page.mouse.move(points[1]!.x + 35, points[1]!.y + 20);
    await page.mouse.down();
    await page.mouse.move(points[1]!.x + 65, points[1]!.y + 40, { steps: 4 });
    expect(Number(await outX.inputValue())).toBe(initialX);
    await page.mouse.up();

    await expect.poll(async () => Number(await outX.inputValue())).toBeGreaterThan(initialX);
  });
});
```

## apps/web/src/app/EditorApp.tsx

```tsx
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
```

## apps/web/src/app/editor.css

```css
/* Workspace shell. Domain state stays in EditorApp; these rules only define chrome. */
.app-menu-bar {
  height: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
}

.app-brand { display: flex; align-items: center; gap: 8px; min-width: 116px; font-size: 13px; letter-spacing: -0.01em; }
.app-brand-mark { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: var(--radius-sm); background: var(--color-accent); color: var(--color-text-on-accent); font-weight: 800; }
.menu-navigation { display: flex; align-items: stretch; align-self: stretch; gap: 2px; }
.menu-trigger { height: 100%; padding: 0 8px; border: 0; background: transparent; color: var(--color-text-secondary); font-size: 12px; cursor: pointer; border-radius: var(--radius-sm); }
.menu-trigger:hover, .menu-trigger:focus-visible, .menu-trigger.is-open { color: var(--color-text-primary); background: var(--color-panel-hover); outline: none; }
.menu-trigger-wrap { position: relative; display: flex; align-items: center; }
.menu-popover { position: absolute; top: 38px; left: 0; z-index: 30; min-width: 218px; padding: 5px; border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-panel-raised); box-shadow: var(--shadow-popover); }
.menu-item { display: flex; justify-content: space-between; width: 100%; padding: 8px 9px; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text-secondary); text-align: left; font-size: 12px; cursor: pointer; }
.menu-item:hover:not(:disabled), .menu-item:focus-visible:not(:disabled) { background: var(--color-panel-hover); color: var(--color-text-primary); outline: none; }
.menu-item:disabled { color: var(--color-text-disabled); cursor: not-allowed; }
.menu-shortcut { margin-left: 20px; color: var(--color-text-muted); font-family: var(--font-mono); font-size: 10px; }
.app-global-actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.save-indicator { display: inline-flex; align-items: center; gap: 5px; margin-right: 5px; color: var(--color-text-muted); font-size: 10px; white-space: nowrap; }
.save-saved { color: var(--color-success); }.save-saving { color: var(--color-warning); }.save-error { color: var(--color-danger); }
.action-divider, .tool-group-divider { width: 1px; height: 18px; background: var(--color-border-subtle); }
.action-divider { margin: 0 4px; }
.zoom-readout { min-width: 44px; padding: 4px 6px; border: 0; border-radius: var(--radius-xs); background: transparent; color: var(--color-text-secondary); font: 11px var(--font-mono); cursor: pointer; }
.zoom-readout:hover, .zoom-readout:focus-visible { background: var(--color-panel-hover); color: var(--color-text-primary); outline: none; }

.document-tabs { height: 32px; min-height: 32px; display: flex; align-items: end; gap: 4px; padding: 0 var(--space-3); background: var(--color-app); }
.document-tab { display: inline-flex; align-items: center; gap: 6px; height: 29px; padding: 0 12px; border: 1px solid var(--color-border-subtle); border-bottom-color: var(--color-topbar); border-radius: var(--radius-sm) var(--radius-sm) 0 0; background: var(--color-topbar); color: var(--color-text-primary); font-size: 11px; cursor: pointer; }
.document-dirty { color: var(--color-warning); font-size: 18px; line-height: 0; }
.new-document-button { margin-bottom: 2px; }.document-tabs-spacer { flex: 1; border-bottom: 1px solid var(--color-border-subtle); }

.contextual-control-bar { height: 36px; min-height: 36px; display: flex; align-items: center; gap: 12px; padding: 0 14px; border-bottom: 1px solid var(--color-border-subtle); background: var(--color-panel); color: var(--color-text-secondary); }
.contextual-label { min-width: 92px; color: var(--color-text-primary); font-size: 11px; font-weight: 600; }
.contextual-field-group { display: flex; align-items: center; gap: 6px; }
.contextual-control-bar [data-testid^='contextual-'] { width: 68px; }
.contextual-control-bar [data-testid^='contextual-'] label { display: none; }
.contextual-control-bar [data-testid^='contextual-'] input { height: 24px; }
.contextual-hint { color: var(--color-text-muted); font-size: 11px; }

.editor-main-area { position: relative; display: flex; flex: 1; min-height: 0; overflow: hidden; }
.tool-group { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.tool-group-divider { width: 28px; height: 1px; margin: 4px 0; }
.vectoria-tooltip { display: inline-flex; position: relative; }
.vectoria-tooltip[data-tooltip]::after { content: attr(data-tooltip); position: absolute; left: 48px; top: 50%; z-index: 40; display: none; width: max-content; max-width: 220px; transform: translateY(-50%); padding: 6px 8px; border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); background: var(--color-panel-raised); color: var(--color-text-primary); box-shadow: var(--shadow-popover); font-size: 11px; pointer-events: none; }
.vectoria-tooltip:hover::after, .vectoria-tooltip:focus-within::after { display: block; }

.canvas-workspace { position: relative; flex: 1; min-width: 0; min-height: 0; background: var(--color-workspace); }
.canvas-workspace > [data-testid='canvas-viewport'] { position: absolute; inset: 0; }
.ruler { position: absolute; z-index: 2; display: flex; pointer-events: none; color: var(--color-text-muted); font: 9px var(--font-mono); }
.ruler-horizontal { top: 0; left: 24px; right: 0; height: 22px; align-items: end; justify-content: space-around; padding-bottom: 3px; border-bottom: 1px solid var(--color-border-subtle); background: color-mix(in srgb, var(--color-workspace) 90%, transparent); }
.ruler-vertical { top: 22px; bottom: 0; left: 0; width: 24px; flex-direction: column; align-items: end; justify-content: space-around; padding-right: 3px; border-right: 1px solid var(--color-border-subtle); background: color-mix(in srgb, var(--color-workspace) 90%, transparent); }
.ruler-corner { position: absolute; z-index: 3; top: 0; left: 0; width: 24px; height: 22px; border-right: 1px solid var(--color-border-subtle); border-bottom: 1px solid var(--color-border-subtle); background: var(--color-workspace-deep); pointer-events: none; }

.right-dock { width: 320px; min-width: 240px; max-width: 480px; display: flex; flex-direction: column; border-left: 1px solid var(--color-border-subtle); background: var(--color-panel); }
.right-dock.is-closed { display: none; }
.dock-toggle { display: none; }
.dock-tabs { display: flex; height: 40px; min-height: 40px; border-bottom: 1px solid var(--color-border-subtle); }
.dock-tab { flex: 1; display: inline-flex; justify-content: center; align-items: center; gap: 5px; padding: 0 5px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--color-text-muted); font-size: 10px; cursor: pointer; }
.dock-tab:hover, .dock-tab:focus-visible { color: var(--color-text-primary); background: var(--color-panel-hover); outline: none; }.dock-tab.is-active { border-bottom-color: var(--color-accent); color: var(--color-text-primary); }
.dock-panel { min-height: 0; flex: 1; overflow: hidden; }.dock-panel-content { height: 100%; overflow: auto; padding: 14px; }
.panel-section-heading { display: flex; justify-content: space-between; margin-bottom: 10px; color: var(--color-text-muted); font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }.panel-count { color: var(--color-text-disabled); font-family: var(--font-mono); }
.panel-empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 18px; color: var(--color-text-muted); text-align: center; font-size: 11px; }.panel-empty-state strong { color: var(--color-text-secondary); font-size: 12px; }.panel-empty-state span { line-height: 1.5; }
.layer-row { display: flex; align-items: center; gap: 4px; min-height: 32px; border-radius: var(--radius-sm); }.layer-row.is-selected { background: var(--color-selection-surface); }.layer-row:hover { background: var(--color-panel-hover); }.layer-select-button { min-width: 0; flex: 1; display: flex; align-items: center; gap: 8px; padding: 6px 7px; border: 0; background: transparent; color: var(--color-text-secondary); text-align: left; font-size: 12px; cursor: pointer; }.layer-select-button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.layer-row .vectoria-icon-button { margin-right: 3px; }
.artboard-list { display: flex; flex-direction: column; gap: 3px; margin-bottom: 12px; }.artboard-row { display: flex; align-items: center; gap: 2px; min-height: 32px; border-radius: var(--radius-sm); }.artboard-row.is-selected { background: var(--color-selection-surface); }.artboard-select-button { min-width: 0; flex: 1; display: grid; grid-template-columns: 16px minmax(0, 1fr); align-items: center; column-gap: 7px; padding: 6px; border: 0; background: transparent; color: var(--color-text-secondary); text-align: left; font-size: 11px; cursor: pointer; }.artboard-select-button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.artboard-select-button small { grid-column: 2; color: var(--color-text-muted); font: 9px var(--font-mono); }.artboard-select-button:hover, .artboard-select-button:focus-visible { color: var(--color-text-primary); outline: none; }
.history-list { display: flex; flex-direction: column; gap: 2px; padding: 0; list-style: none; }.history-list li { display: flex; align-items: center; gap: 8px; min-height: 30px; padding: 3px 7px; color: var(--color-text-muted); font-size: 11px; }.history-list li.is-current { color: var(--color-text-primary); background: var(--color-selection-surface); border-radius: var(--radius-sm); }.history-marker { width: 7px; height: 7px; flex: 0 0 auto; border: 1px solid var(--color-border-strong); border-radius: 50%; }.is-current .history-marker { border-color: var(--color-accent); background: var(--color-accent); }.history-entry-button { min-width: 0; flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 0; border: 0; background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; }.history-entry-button:hover, .history-entry-button:focus-visible { color: var(--color-text-primary); outline: none; }.history-entry-button small { margin-left: auto; color: var(--color-text-muted); font-size: 9px; }.history-list > li > small { color: var(--color-accent); font-size: 9px; }.panel-note { margin-top: 18px; color: var(--color-text-disabled); font-size: 10px; line-height: 1.5; }

.status-tool { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.status-selection { padding-left: 10px; border-left: 1px solid var(--color-border-subtle); color: var(--color-text-secondary); }.statusbar { gap: 12px; }
.recovery-banner { display: flex; justify-content: space-between; gap: 16px; padding: 8px 16px; border-bottom: 1px solid var(--color-danger); background: var(--color-danger-subtle); color: var(--color-text-primary); font-size: 13px; }
.recovery-banner span:last-child { color: var(--color-text-secondary); }
.save-retry { margin-left: 8px; padding: 0; border: 0; background: transparent; color: inherit; text-decoration: underline; cursor: pointer; font: inherit; }
.vectoria-button:focus-visible, .vectoria-icon-button:focus-visible, .document-tab:focus-visible, .layer-select-button:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 1px; }
input { user-select: text; -webkit-user-select: text; }
.property-section { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
.property-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.property-actions { display: flex; gap: 6px; }
.path-actions { flex-wrap: wrap; }
.property-lock-message { padding: 8px 10px; border: 1px solid var(--color-warning); border-radius: var(--radius-sm); background: var(--color-warning-subtle); color: var(--color-text-secondary); font-size: 10px; line-height: 1.4; }
.dialog-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; background: rgba(0, 0, 0, .48); }
.new-document-dialog { width: min(600px, calc(100vw - 32px)); max-height: min(760px, calc(100vh - 32px)); overflow: auto; padding: 24px; border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); background: var(--color-panel-raised); box-shadow: var(--shadow-dialog); color: var(--color-text-primary); }
.dialog-header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 22px; }.dialog-eyebrow { margin-bottom: 5px; color: var(--color-accent); font: 10px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }.new-document-dialog h2 { margin-bottom: 6px; font-size: 18px; }.dialog-description { color: var(--color-text-muted); font-size: 11px; line-height: 1.5; }.dialog-close { width: 28px; height: 28px; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text-muted); font-size: 22px; line-height: 1; cursor: pointer; }.dialog-close:hover, .dialog-close:focus-visible { background: var(--color-panel-hover); color: var(--color-text-primary); outline: none; }
.dialog-label { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; color: var(--color-text-muted); font-size: 11px; }
.dialog-label input, .dialog-label select { height: 30px; padding: 0 8px; border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); background: var(--color-input); color: var(--color-text-primary); }
.dialog-field-heading { display: flex; justify-content: space-between; margin: 16px 0 8px; color: var(--color-text-secondary); font-size: 11px; font-weight: 600; }.dialog-field-hint { color: var(--color-text-disabled); font-size: 10px; font-weight: 400; }.dialog-presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 14px; }.dialog-presets button { display: flex; flex-direction: column; gap: 5px; min-height: 48px; padding: 8px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-sm); background: var(--color-input); color: var(--color-text-secondary); text-align: left; font-size: 10px; cursor: pointer; }.dialog-presets button span { color: var(--color-text-muted); font: 9px var(--font-mono); }.dialog-presets button:hover, .dialog-presets button.is-selected { border-color: var(--color-accent); background: var(--color-accent-subtle); color: var(--color-text-primary); }
.dialog-validation { display: flex; align-items: flex-start; gap: 8px; min-height: 30px; margin-top: 16px; padding: 8px 10px; border: 1px solid var(--color-success); border-radius: var(--radius-sm); background: var(--color-success-subtle); color: var(--color-text-secondary); font-size: 10px; line-height: 1.4; }.dialog-validation > span:first-child { color: var(--color-success); font-weight: 700; }.dialog-validation.has-error { border-color: var(--color-danger); background: var(--color-danger-subtle); }.dialog-validation.has-error > span:first-child { color: var(--color-danger); }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.performance-hud { position: absolute; right: 12px; bottom: 12px; z-index: 6; display: flex; flex-direction: column; gap: 3px; padding: 8px 10px; border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--color-workspace-deep) 92%, transparent); color: var(--color-text-muted); font: 10px var(--font-mono); pointer-events: none; }
.performance-hud strong { color: var(--color-accent); font: 10px var(--font-ui); }

@media (max-width: 1199px) {
  .right-dock { width: 248px; min-width: 248px; }.save-indicator:not(.save-error) { display: none; }.app-menu-bar { gap: 10px; }.menu-trigger { padding: 0 6px; }
}
@media (max-width: 900px) {
  .right-dock { position: absolute; top: 0; right: 0; bottom: 0; z-index: 8; width: 280px; min-width: 280px; box-shadow: var(--shadow-popover); }.right-dock.is-closed { display: none; }.dock-toggle { display: inline-flex; }.contextual-label { min-width: 72px; }.menu-navigation { display: none; }.app-brand { min-width: auto; }
}
@media (max-width: 640px) {
  .app-global-actions .vectoria-button:not([data-testid='export-svg-button']), .zoom-readout { display: none; }.contextual-control-bar { gap: 6px; padding: 0 8px; }.contextual-field-group { gap: 3px; }.contextual-control-bar [data-testid^='contextual-'] { width: 54px; }.right-dock { width: min(280px, 88vw); }.status-selection, .ruler { display: none; }
  .dialog-presets { grid-template-columns: repeat(2, 1fr); }
}
```

## apps/web/src/features/canvas/CanvasViewport.tsx

```tsx
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
  getInverseTransformMatrix,
  normalizeShapeDrag,
  isValidShapeGeometry,
  updatePathNodeHandle,
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
  type: 'pan' | 'create-shape' | 'move-object' | 'move-node' | 'move-handle' | 'resize-object' | 'rotate-object' | 'marquee';
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
  handleSide?: 'in' | 'out';
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

    // Pen owns its draft state; pointer capture loss must not cancel completed nodes.
    if (activeTool !== 'pen') (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (activeTool === 'pen') {
      const result = penToolRef.current!.pointerDown(
        { screenPoint: screenPos, worldPoint: worldPos, shiftKey: e.shiftKey, altKey: e.altKey },
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
        penToolRef.current?.pointerMove({ screenPoint: screenPos, worldPoint: worldPos, shiftKey: e.shiftKey, altKey: e.altKey });
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
    if (!drag) {
      if (activeTool === 'pen') {
        penToolRef.current?.cancel();
        setPenVersion((version) => version + 1);
      }
      return;
    }

    if (drag.type === 'move-object') {
      setDragPreview({});
    }
    if (drag.type === 'move-node' || drag.type === 'move-handle') setPathPreview({});
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
```

## apps/web/src/features/panels/PropertiesPanel.tsx

```tsx
import React from 'react';
import type { DocumentModel, ObjectId, ObjectStyle, SceneObject, CornerRadii, PathNode, SelectionState } from '@vectoria/core';
import { normalizeCornerRadii } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { defaultStroke } from '@vectoria/core';
import { NumberInput, ColorControl, Button } from '@vectoria/ui';
import { convertUnit } from '@vectoria/shared';
import type { DocumentUnit } from '@vectoria/core';
import type { GridSettings } from '@vectoria/editor-engine';

export type PathAction =
  | { type: 'stroke-to-path'; objectId: ObjectId }
  | { type: 'reverse'; objectId: ObjectId }
  | { type: 'add-node'; objectId: ObjectId; segmentIndex: number }
  | { type: 'remove-node'; objectId: ObjectId; nodeIndex: number }
  | { type: 'convert-segment'; objectId: ObjectId; segmentIndex: number; to: 'line' | 'curve' }
  | { type: 'split'; objectId: ObjectId; nodeIndex: number }
  | { type: 'merge-nodes'; objectId: ObjectId; firstIndex: number; secondIndex: number }
  | { type: 'connect-handles'; objectId: ObjectId; nodeIndex: number }
  | { type: 'disconnect-handles'; objectId: ObjectId; nodeIndex: number }
  | { type: 'join'; objectIds: readonly [ObjectId, ObjectId] };

export interface PropertiesPanelProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  selectedObjectIds?: readonly ObjectId[];
  onUpdatePosition: (id: ObjectId, x: number, y: number) => void;
  onUpdateDimensions: (id: ObjectId, width: number, height: number) => void;
  onUpdateLineEndpoint?: (id: ObjectId, endPoint: Vec2) => void;
  onUpdateCornerRadius?: (id: ObjectId, radii: CornerRadii) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
  onUpdateObjectStyle?: (id: ObjectId, patch: Partial<ObjectStyle>) => void;
  onUpdateRotation?: (id: ObjectId, degrees: number) => void;
  onUpdateArtboard?: (width: number, height: number, background?: { type: 'transparent' } | { type: 'color'; color: string }) => void;
  onUpdateUnit?: (unit: DocumentUnit) => void;
  gridSettings?: GridSettings;
  onUpdateGridSettings?: (settings: GridSettings) => void;
  selection?: SelectionState;
  onUpdatePathNode?: (id: ObjectId, index: number, patch: Partial<Omit<PathNode, 'id'>>) => void;
  onUpdatePathNodeKind?: (id: ObjectId, index: number, kind: PathNode['kind']) => void;
  onUpdatePathClosed?: (id: ObjectId, closed: boolean) => void;
  onPathAction?: (action: PathAction) => void;
}

const dimensions = (object: SceneObject): { width: number; height: number } | null =>
  object.type === 'rectangle' || object.type === 'ellipse' ? { width: object.width, height: object.height } : null;

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  document: doc,
  selectedObjectId,
  selectedObjectIds = selectedObjectId ? [selectedObjectId] : [],
  onUpdatePosition,
  onUpdateDimensions,
  onUpdateLineEndpoint,
  onUpdateCornerRadius,
  onUpdateFill,
  onUpdateObjectStyle,
  onUpdateRotation,
  onUpdateArtboard,
  onUpdateUnit,
  gridSettings,
  onUpdateGridSettings,
  selection = { objectIds: [], nodeIds: [], mode: 'object' },
  onUpdatePathNode,
  onUpdatePathNodeKind,
  onUpdatePathClosed,
  onPathAction,
}) => {
  const selected = selectedObjectId ? doc.objects[selectedObjectId] : null;
  const artboard = doc.artboards[doc.activeArtboardId];
  const size = selected ? dimensions(selected) : null;
  const radii = selected?.type === 'rectangle' ? normalizeCornerRadii(selected.cornerRadius, selected.width, selected.height) : null;
  const patchStyle = (patch: Partial<ObjectStyle>) => selected && onUpdateObjectStyle?.(selected.id, patch);
  const selectedPathNodeIndex = selected?.type === 'path'
    ? Math.max(0, selected.nodes.findIndex((_, index) => selection.nodeIds.includes(`${selected.id}:${index}`)))
    : -1;
  const selectedPathNode = selected?.type === 'path' ? selected.nodes[selectedPathNodeIndex] : null;
  const selectedPathNodeIndices = selected?.type === 'path'
    ? selection.nodeIds.filter((id) => id.startsWith(`${selected.id}:`)).map((id) => Number(id.slice(selected.id.length + 1))).filter((index) => Number.isInteger(index) && index >= 0 && index < selected.nodes.length)
    : [];

  return (
    <aside className="properties-panel" data-testid="properties-panel">
       <div className="panel-section-heading"><span>{selected ? 'Object Properties' : 'Artboard Properties'}</span>{selectedObjectIds.length > 1 && <span className="panel-count" data-testid="selection-summary">{selectedObjectIds.length} objects</span>}</div>
      <div className="dock-panel-content">
        {selected ? <>
           {selected.locked && <div className="property-lock-message" role="status">Object is locked. Unlock it in Layers to edit.</div>}
           <section className="property-section">
            <div className="panel-section-heading"><span>Transformacja</span></div>
            <div className="property-grid">
              <NumberInput data-testid="prop-x" label="X" disabled={selected.locked} value={convertUnit(selected.transform.position.x, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdatePosition(selected.id, convertUnit(value, doc.unit, 'px'), selected.transform.position.y)} />
              <NumberInput data-testid="prop-y" label="Y" disabled={selected.locked} value={convertUnit(selected.transform.position.y, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdatePosition(selected.id, selected.transform.position.x, convertUnit(value, doc.unit, 'px'))} />
               {size && <>
                 <NumberInput data-testid="prop-w" label="W" disabled={selected.locked} min={0.000001} value={convertUnit(size.width, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateDimensions(selected.id, convertUnit(value, doc.unit, 'px'), size.height)} />
                 <NumberInput data-testid="prop-h" label="H" disabled={selected.locked} min={0.000001} value={convertUnit(size.height, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateDimensions(selected.id, size.width, convertUnit(value, doc.unit, 'px'))} />
               </>}
                {selected.type === 'line' && <>
                 <NumberInput data-testid="prop-end-x" label="End X" disabled={selected.locked} value={convertUnit(selected.endPoint.x, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateLineEndpoint?.(selected.id, { x: convertUnit(value, doc.unit, 'px'), y: selected.endPoint.y })} />
                 <NumberInput data-testid="prop-end-y" label="End Y" disabled={selected.locked} value={convertUnit(selected.endPoint.y, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateLineEndpoint?.(selected.id, { x: selected.endPoint.x, y: convertUnit(value, doc.unit, 'px') })} />
                </>}
                {selected.type === 'path' && selectedPathNode && <>
                  <NumberInput data-testid="prop-node-x" label="Node X" disabled={selected.locked} value={selectedPathNode.point.x} decimals={2} onChange={(value) => onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { point: { ...selectedPathNode.point, x: value } })} />
                  <NumberInput data-testid="prop-node-y" label="Node Y" disabled={selected.locked} value={selectedPathNode.point.y} decimals={2} onChange={(value) => onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { point: { ...selectedPathNode.point, y: value } })} />
                </>}
               {selected.type === 'rectangle' && radii && <>
                 <NumberInput data-testid="prop-radius-tl" label="TL" disabled={selected.locked} min={0} value={convertUnit(radii.topLeft, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateCornerRadius?.(selected.id, { ...radii, topLeft: convertUnit(value, doc.unit, 'px') })} />
                 <NumberInput data-testid="prop-radius-tr" label="TR" disabled={selected.locked} min={0} value={convertUnit(radii.topRight, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateCornerRadius?.(selected.id, { ...radii, topRight: convertUnit(value, doc.unit, 'px') })} />
                 <NumberInput data-testid="prop-radius-br" label="BR" disabled={selected.locked} min={0} value={convertUnit(radii.bottomRight, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateCornerRadius?.(selected.id, { ...radii, bottomRight: convertUnit(value, doc.unit, 'px') })} />
                 <NumberInput data-testid="prop-radius-bl" label="BL" disabled={selected.locked} min={0} value={convertUnit(radii.bottomLeft, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateCornerRadius?.(selected.id, { ...radii, bottomLeft: convertUnit(value, doc.unit, 'px') })} />
               </>}
              <NumberInput data-testid="prop-rotation" label="Rot" disabled={selected.locked} value={selected.transform.rotation * 180 / Math.PI} decimals={1} unit="°" onChange={(value) => onUpdateRotation?.(selected.id, value)} />
            </div>
           </section>
           {selected.type === 'path' && selectedPathNode && <section className="property-section" aria-label="Path node properties">
             <div className="panel-section-heading"><span>Node</span><span className="panel-count">{selectedPathNodeIndex + 1}/{selected.nodes.length}</span></div>
             <label className="dialog-label">Type<select value={selectedPathNode.kind} disabled={selected.locked} onChange={(event) => onUpdatePathNodeKind?.(selected.id, selectedPathNodeIndex, event.target.value as PathNode['kind'])}><option value="corner">Corner</option><option value="cusp">Cusp</option><option value="smooth">Smooth</option><option value="symmetric">Symmetric</option><option value="auto">Auto smooth</option></select></label>
              <div className="property-grid">
                <NumberInput data-testid="prop-handle-in-x" label="In X" disabled={selected.locked || !selectedPathNode.inHandle} value={selectedPathNode.inHandle?.x ?? 0} decimals={2} onChange={(value) => selectedPathNode.inHandle && onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { inHandle: { ...selectedPathNode.inHandle, x: value } })} />
                <NumberInput data-testid="prop-handle-in-y" label="In Y" disabled={selected.locked || !selectedPathNode.inHandle} value={selectedPathNode.inHandle?.y ?? 0} decimals={2} onChange={(value) => selectedPathNode.inHandle && onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { inHandle: { ...selectedPathNode.inHandle, y: value } })} />
                <NumberInput data-testid="prop-handle-out-x" label="Out X" disabled={selected.locked || !selectedPathNode.outHandle} value={selectedPathNode.outHandle?.x ?? 0} decimals={2} onChange={(value) => selectedPathNode.outHandle && onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { outHandle: { ...selectedPathNode.outHandle, x: value } })} />
                <NumberInput data-testid="prop-handle-out-y" label="Out Y" disabled={selected.locked || !selectedPathNode.outHandle} value={selectedPathNode.outHandle?.y ?? 0} decimals={2} onChange={(value) => selectedPathNode.outHandle && onUpdatePathNode?.(selected.id, selectedPathNodeIndex, { outHandle: { ...selectedPathNode.outHandle, y: value } })} />
              </div>
              <label className="dialog-label">Path<select value={selected.closed ? 'closed' : 'open'} disabled={selected.locked} onChange={(event) => onUpdatePathClosed?.(selected.id, event.target.value === 'closed')}><option value="open">Open</option><option value="closed">Closed</option></select></label>
              <div className="property-actions path-actions">
                <Button size="sm" variant="ghost" disabled={selected.locked || selected.nodes.length <= (selected.closed ? 3 : 2)} onClick={() => onPathAction?.({ type: 'remove-node', objectId: selected.id, nodeIndex: selectedPathNodeIndex })}>Remove node</Button>
                <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'reverse', objectId: selected.id })}>Reverse</Button>
                {selectedPathNodeIndex < selected.nodes.length - (selected.closed ? 0 : 1) && <>
                  <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'add-node', objectId: selected.id, segmentIndex: selectedPathNodeIndex })}>Add node</Button>
                  <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'convert-segment', objectId: selected.id, segmentIndex: selectedPathNodeIndex, to: selected.nodes[selectedPathNodeIndex]?.outHandle || selected.nodes[(selectedPathNodeIndex + 1) % selected.nodes.length]?.inHandle ? 'line' : 'curve' })}>{selected.nodes[selectedPathNodeIndex]?.outHandle || selected.nodes[(selectedPathNodeIndex + 1) % selected.nodes.length]?.inHandle ? 'Make line' : 'Make curve'}</Button>
                </>}
                {selectedPathNodeIndex > 0 && selectedPathNodeIndex < selected.nodes.length - 1 && !selected.closed && <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'split', objectId: selected.id, nodeIndex: selectedPathNodeIndex })}>Split path</Button>}
                {selectedPathNodeIndices.length >= 2 && <Button size="sm" variant="ghost" disabled={selected.locked || selected.nodes.length <= (selected.closed ? 3 : 2)} onClick={() => onPathAction?.({ type: 'merge-nodes', objectId: selected.id, firstIndex: selectedPathNodeIndices[0]!, secondIndex: selectedPathNodeIndices[1]! })}>Merge nodes</Button>}
                <Button size="sm" variant="ghost" disabled={selected.locked || (!selectedPathNode.inHandle && !selectedPathNode.outHandle)} onClick={() => onPathAction?.({ type: 'disconnect-handles', objectId: selected.id, nodeIndex: selectedPathNodeIndex })}>Disconnect</Button>
                <Button size="sm" variant="ghost" disabled={selected.locked || (!selectedPathNode.inHandle && !selectedPathNode.outHandle)} onClick={() => onPathAction?.({ type: 'connect-handles', objectId: selected.id, nodeIndex: selectedPathNodeIndex })}>Connect</Button>
                {selectedObjectIds.length === 2 && selectedObjectIds.every((id) => doc.objects[id]?.type === 'path' && !(doc.objects[id] as Extract<SceneObject, { type: 'path' }>).closed) && <Button size="sm" variant="ghost" onClick={() => onPathAction?.({ type: 'join', objectIds: selectedObjectIds as readonly [ObjectId, ObjectId] })}>Join paths</Button>}
              </div>
            </section>}
          <section className="property-section">
            <div className="panel-section-heading"><span>Wygląd</span></div>
             <ColorControl label="Fill" disabled={selected.locked} color={selected.style.fill.type === 'solid' ? selected.style.fill.color : null} onChange={(value) => onUpdateFill(selected.id, value)} />
             <ColorControl label="Stroke" disabled={selected.locked} color={selected.style.stroke?.color ?? null} onChange={(value) => patchStyle({ stroke: value ? { ...(selected.style.stroke ?? defaultStroke), color: value } : null })} />
             <NumberInput data-testid="prop-stroke-width" label="Stroke" value={selected.style.stroke?.width ?? 0} min={0.1} disabled={selected.locked || !selected.style.stroke} decimals={1} onChange={(value) => selected.style.stroke && patchStyle({ stroke: { ...selected.style.stroke, width: value } })} />
             <NumberInput data-testid="prop-opacity" label="Opacity" value={selected.style.opacity} min={0} max={1} step={0.05} disabled={selected.locked} decimals={2} unit="" onChange={(value) => patchStyle({ opacity: value })} />
             <div className="property-actions">
                <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => patchStyle({ fill: { type: 'linear-gradient', start: { x: 0, y: 0 }, end: { x: size?.width ?? 100, y: 0 }, stops: [{ offset: 0, color: '#5caeff', opacity: 1 }, { offset: 1, color: '#8e5cff', opacity: 1 }] } })}>Gradient</Button>
                {selected.style.stroke && <Button size="sm" variant="ghost" disabled={selected.locked} onClick={() => onPathAction?.({ type: 'stroke-to-path', objectId: selected.id })}>Stroke to path</Button>}
             </div>
          </section>
        </> : artboard ? <>
          <section className="property-section">
            <div className="panel-section-heading"><span>Artboard</span></div>
            <div className="property-grid">
              <NumberInput data-testid="artboard-width" label="W" min={0.000001} value={convertUnit(artboard.width, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateArtboard?.(convertUnit(value, doc.unit, 'px'), artboard.height)} />
              <NumberInput data-testid="artboard-height" label="H" min={0.000001} value={convertUnit(artboard.height, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateArtboard?.(artboard.width, convertUnit(value, doc.unit, 'px'))} />
            </div>
            <label className="dialog-label">Jednostka<select value={doc.unit} onChange={(event) => onUpdateUnit?.(event.target.value as DocumentUnit)}><option value="px">px</option><option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option></select></label>
            <label className="dialog-label">Tło<select value={artboard.background.type} onChange={(event) => { const type = event.target.value as 'transparent' | 'color'; onUpdateArtboard?.(artboard.width, artboard.height, type === 'transparent' ? { type } : { type, color: artboard.background.type === 'color' ? artboard.background.color : '#ffffff' }); }}><option value="color">Kolor</option><option value="transparent">Przezroczyste</option></select></label>
            {artboard.background.type === 'color' && <label className="dialog-label">Kolor<input type="color" value={artboard.background.color} onChange={(event) => onUpdateArtboard?.(artboard.width, artboard.height, { type: 'color', color: event.target.value })} /></label>}
            {gridSettings && <div className="property-grid"><NumberInput data-testid="grid-size" label="Grid" min={0.000001} value={convertUnit(gridSettings.size, 'px', doc.unit)} unit={doc.unit} decimals={2} onChange={(value) => onUpdateGridSettings?.({ ...gridSettings, size: convertUnit(value, doc.unit, 'px') })} /><NumberInput data-testid="grid-subdivisions" label="Sub" min={1} value={gridSettings.subdivisions} unit="×" decimals={0} onChange={(value) => onUpdateGridSettings?.({ ...gridSettings, subdivisions: Math.max(1, Math.round(value)) })} /></div>}
            <p className="panel-note">Rozmiar artboardu zmienia model świata. Canvas zawsze pozostaje wielkości viewportu.</p>
          </section>
        </> : null}
      </div>
    </aside>
  );
};
```

## apps/web/src/features/panels/RightDock.tsx

```tsx
import React, { useState } from 'react';
import type { DocumentModel, ObjectId, ObjectStyle, DocumentUnit, HistoryEntry, PathNode, SelectionState } from '@vectoria/core';
import { VectoriaIcon } from '@vectoria/ui';
import { HistoryPanel } from './HistoryPanel.js';
import { LayersPanel } from './LayersPanel.js';
import { PropertiesPanel, type PathAction } from './PropertiesPanel.js';
import { ArtboardsPanel } from './ArtboardsPanel.js';
import type { GridSettings } from '@vectoria/editor-engine';

export type DockPanel = 'properties' | 'layers' | 'artboards' | 'history';

export interface RightDockProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  selectedObjectIds?: readonly ObjectId[];
  history: readonly HistoryEntry[];
  historyCursor: number;
  onHistoryJump: (cursor: number) => void;
  onSelectObject: (id: ObjectId | null, additive?: boolean) => void;
  onSelectObjects?: (ids: readonly ObjectId[], additive?: boolean) => void;
  onUpdatePosition: (id: ObjectId, x: number, y: number) => void;
  onUpdateDimensions: (id: ObjectId, width: number, height: number) => void;
  onUpdateLineEndpoint?: (id: ObjectId, endPoint: { x: number; y: number }) => void;
  onUpdateCornerRadius?: (id: ObjectId, radii: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
  onUpdateObjectStyle?: (id: ObjectId, patch: Partial<ObjectStyle>) => void;
  onUpdateRotation?: (id: ObjectId, degrees: number) => void;
  onUpdateArtboard?: (width: number, height: number, background?: { type: 'transparent' } | { type: 'color'; color: string }) => void;
  onUpdateUnit?: (unit: DocumentUnit) => void;
  gridSettings?: GridSettings;
  onUpdateGridSettings?: (settings: GridSettings) => void;
  selection?: SelectionState;
  onUpdatePathNode?: (id: ObjectId, index: number, patch: Partial<Omit<PathNode, 'id'>>) => void;
  onUpdatePathNodeKind?: (id: ObjectId, index: number, kind: PathNode['kind']) => void;
  onUpdatePathClosed?: (id: ObjectId, closed: boolean) => void;
  onPathAction?: (action: PathAction) => void;
  onToggleObject?: (id: ObjectId, field: 'visible' | 'locked') => void;
  onSelectArtboard?: (id: string) => void;
  onCreateArtboard?: () => void;
  onDuplicateArtboard?: (id: string) => void;
  onDeleteArtboard?: (id: string) => void;
  activePanel?: DockPanel;
  onPanelChange?: (panel: DockPanel) => void;
  open: boolean;
}

const panels: readonly { id: DockPanel; label: string; icon: React.ComponentProps<typeof VectoriaIcon>['name'] }[] = [
  { id: 'properties', label: 'Właściwości', icon: 'sliders' as React.ComponentProps<typeof VectoriaIcon>['name'] },
  { id: 'layers', label: 'Warstwy', icon: 'layers' },
  { id: 'artboards', label: 'Artboardy', icon: 'grid' },
  { id: 'history', label: 'Historia', icon: 'history' },
];

export const RightDock: React.FC<RightDockProps> = ({ document: doc, selectedObjectId, selectedObjectIds = [], history, historyCursor, onHistoryJump, onSelectObject, onSelectObjects, onUpdatePosition, onUpdateDimensions, onUpdateLineEndpoint, onUpdateCornerRadius, onUpdateFill, onUpdateObjectStyle, onUpdateRotation, onUpdateArtboard, onUpdateUnit, gridSettings, onUpdateGridSettings, selection, onUpdatePathNode, onUpdatePathNodeKind, onUpdatePathClosed, onPathAction, onToggleObject, onSelectArtboard, onCreateArtboard, onDuplicateArtboard, onDeleteArtboard, activePanel: requestedPanel, onPanelChange, open }) => {
  const [localActivePanel, setLocalActivePanel] = useState<DockPanel>('properties');
  const activePanel = requestedPanel ?? localActivePanel;
  const activeIndex = panels.findIndex((panel) => panel.id === activePanel);
  const selectPanel = (panel: DockPanel) => {
    setLocalActivePanel(panel);
    onPanelChange?.(panel);
  };

  const moveTab = (direction: number) => {
    const next = (activeIndex + direction + panels.length) % panels.length;
    const nextPanel = panels[next];
    if (nextPanel) selectPanel(nextPanel.id);
  };

  return (
    <aside className={`right-dock ${open ? '' : 'is-closed'}`} data-testid="right-dock">
      <div className="dock-tabs" role="tablist" aria-label="Panele dokumentu">
         {panels.map((panel) => <button key={panel.id} type="button" role="tab" id={`tab-${panel.id}`} className={`dock-tab ${activePanel === panel.id ? 'is-active' : ''}`} aria-selected={activePanel === panel.id} aria-controls={`panel-${panel.id}`} tabIndex={activePanel === panel.id ? 0 : -1} onClick={() => selectPanel(panel.id)} onKeyDown={(event) => { if (event.key === 'ArrowRight') moveTab(1); if (event.key === 'ArrowLeft') moveTab(-1); if (event.key === 'Home') selectPanel('properties'); if (event.key === 'End') selectPanel('history'); }}><VectoriaIcon name={panel.icon} size={15} /><span>{panel.label}</span></button>)}
      </div>
      <div id={`panel-${activePanel}`} role="tabpanel" aria-labelledby={`tab-${activePanel}`} className="dock-panel">
          {activePanel === 'properties' && <PropertiesPanel document={doc} selectedObjectId={selectedObjectId} selectedObjectIds={selectedObjectIds} selection={selection} onUpdatePosition={onUpdatePosition} onUpdateDimensions={onUpdateDimensions} onUpdateLineEndpoint={onUpdateLineEndpoint} onUpdateCornerRadius={onUpdateCornerRadius} onUpdateFill={onUpdateFill} onUpdateObjectStyle={onUpdateObjectStyle} onUpdateRotation={onUpdateRotation} onUpdateArtboard={onUpdateArtboard} onUpdateUnit={onUpdateUnit} gridSettings={gridSettings} onUpdateGridSettings={onUpdateGridSettings} onUpdatePathNode={onUpdatePathNode} onUpdatePathNodeKind={onUpdatePathNodeKind} onUpdatePathClosed={onUpdatePathClosed} onPathAction={onPathAction} />}
         {activePanel === 'layers' && <LayersPanel document={doc} selectedObjectId={selectedObjectId} selectedObjectIds={selectedObjectIds} onSelectObject={onSelectObject} onSelectObjects={onSelectObjects} onToggleObject={onToggleObject} />}
         {activePanel === 'artboards' && onSelectArtboard && onCreateArtboard && onDuplicateArtboard && onDeleteArtboard && <ArtboardsPanel document={doc} onSelect={onSelectArtboard} onCreate={onCreateArtboard} onDuplicate={onDuplicateArtboard} onDelete={onDeleteArtboard} />}
          {activePanel === 'history' && <HistoryPanel entries={history} cursor={historyCursor} onJump={onHistoryJump} />}
      </div>
    </aside>
  );
};
```

## packages/core/src/commands/document-commands.ts

```typescript
import { generateId, type Vec2 } from '@vectoria/shared';
import type { Command } from './command.js';
import type {
  DocumentModel,
  SceneObject,
  ObjectId,
  LayerId,
  ObjectStyle,
  Transform2D,
  PathNode,
  ArtboardId,
  Artboard,
  DocumentUnit,
  Guide,
  GridSettings,
  SnapSettings,
  CornerRadii,
  StrokeStyle,
} from '../model/types.js';
import { isValidTransform } from '../model/transform.js';
import { getObjectBounds } from '../model/bounds.js';
import { normalizeCornerRadii } from '../model/shapes.js';
import { applyNodeKind, createPathNode, getCubicSegment, isValidPathGeometry, reversePathNodes, splitCubic } from '../model/path.js';

// ─── CreateObjectsCommand ─────────────────────────────────────────────────────

export class CreateObjectsCommand implements Command {
  readonly type = 'CreateObjects';
  readonly description: string;

  constructor(
    private readonly objects: readonly SceneObject[],
    private readonly targetLayerId: LayerId,
  ) {
    const count = objects.length;
    this.description = count === 1
      ? `Create ${objects[0]!.type}`
      : `Create ${count} objects`;
  }

  execute(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };
    const layer = newLayers[this.targetLayerId];
    if (!layer || layer.locked) return doc;

    const newObjectIds = [...layer.objectIds];

    for (const obj of this.objects) {
      if (obj.layerId !== this.targetLayerId || newObjects[obj.id] || newObjectIds.includes(obj.id)) return doc;
      if (!isValidTransform(obj.transform)) return doc;
      if (obj.type === 'path' && !isValidPathGeometry(obj.nodes, obj.closed)) return doc;
      newObjects[obj.id] = obj;
      newObjectIds.push(obj.id);
    }

    newLayers[this.targetLayerId] = {
      ...layer,
      objectIds: newObjectIds,
    };

    return {
      ...doc,
      objects: newObjects,
      layers: newLayers,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };
    const layer = newLayers[this.targetLayerId];
    if (!layer) return doc;

    const idsToRemove = new Set(this.objects.map((o) => o.id));

    for (const obj of this.objects) {
      delete newObjects[obj.id];
    }

    newLayers[this.targetLayerId] = {
      ...layer,
      objectIds: layer.objectIds.filter((id) => !idsToRemove.has(id)),
    };

    return {
      ...doc,
      objects: newObjects,
      layers: newLayers,
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── DeleteObjectsCommand ─────────────────────────────────────────────────────

interface DeletedObjectInfo {
  object: SceneObject;
  layerId: LayerId;
  indexInLayer: number;
}

export class DeleteObjectsCommand implements Command {
  readonly type = 'DeleteObjects';
  readonly description: string;
  private deletedInfos: DeletedObjectInfo[] = [];

  constructor(
    private readonly objectIds: readonly ObjectId[],
  ) {
    this.description = objectIds.length === 1
      ? 'Delete object'
      : `Delete ${objectIds.length} objects`;
  }

  execute(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };
    this.deletedInfos = [];

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj) continue;

      const layer = doc.layers[obj.layerId];
      if (!layer) continue;

      const indexInLayer = layer.objectIds.indexOf(objectId);

      this.deletedInfos.push({
        object: obj,
        layerId: obj.layerId,
        indexInLayer,
      });

      delete newObjects[objectId];

      newLayers[obj.layerId] = {
        ...newLayers[obj.layerId]!,
        objectIds: newLayers[obj.layerId]!.objectIds.filter((id) => id !== objectId),
      };
    }

    if (this.deletedInfos.length === 0) return doc;

    return {
      ...doc,
      objects: newObjects,
      layers: newLayers,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };

    // Restore in reverse order to preserve z-order indices
    for (let i = this.deletedInfos.length - 1; i >= 0; i--) {
      const info = this.deletedInfos[i]!;
      newObjects[info.object.id] = info.object;

      const layer = newLayers[info.layerId];
      if (!layer) continue;

      const newObjectIds = [...layer.objectIds];
      // Insert at original index
      newObjectIds.splice(info.indexInLayer, 0, info.object.id);

      newLayers[info.layerId] = {
        ...layer,
        objectIds: newObjectIds,
      };
    }

    return {
      ...doc,
      objects: newObjects,
      layers: newLayers,
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── TransformObjectsCommand ──────────────────────────────────────────────────

export class TransformObjectsCommand implements Command {
  readonly type = 'TransformObjects';
  readonly description = 'Move';
  private previousTransforms: Map<ObjectId, Transform2D> = new Map();

  constructor(
    private readonly objectIds: readonly ObjectId[],
    private readonly newTransforms: ReadonlyMap<ObjectId, Transform2D>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    let changed = false;

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj || obj.locked) continue;

      this.previousTransforms.set(objectId, obj.transform);

      const newTransform = this.newTransforms.get(objectId);
      if (!newTransform || !isValidTransform(newTransform)) continue;

      newObjects[objectId] = { ...obj, transform: newTransform };
      changed = true;
    }

    if (!changed) return doc;

    return {
      ...doc,
      objects: newObjects,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj) continue;

      const prev = this.previousTransforms.get(objectId);
      if (!prev) continue;

      newObjects[objectId] = { ...obj, transform: prev };
    }

    return {
      ...doc,
      objects: newObjects,
      updatedAt: new Date().toISOString(),
    };
  }
}

/** Update one object's transform through the same command contract as a drag. */
export class UpdateObjectTransformCommand extends TransformObjectsCommand {
  constructor(objectId: ObjectId, transform: Transform2D) {
    super([objectId], new Map([[objectId, transform]]));
  }
}

export type ReorderDirection = 'front' | 'back' | 'forward' | 'backward';

/** Reorder selected objects inside their layers without changing ownership. */
export class ReorderObjectsCommand implements Command {
  readonly type = 'ReorderObjects';
  readonly description: string;
  private previous: Readonly<Record<LayerId, readonly ObjectId[]>> | null = null;

  constructor(private readonly objectIds: readonly ObjectId[], private readonly direction: ReorderDirection) {
    this.description = direction === 'front' ? 'Bring to front' : direction === 'back' ? 'Send to back' : direction === 'forward' ? 'Bring forward' : 'Send backward';
  }

  execute(doc: DocumentModel): DocumentModel {
    const selected = new Set(this.objectIds);
    const nextLayers = { ...doc.layers };
    const previous: Record<LayerId, readonly ObjectId[]> = {};
    let changed = false;
    for (const layerId of doc.layerIds) {
      const layer = doc.layers[layerId];
      if (!layer) continue;
      const ids = layer.objectIds.filter((id) => selected.has(id));
      if (ids.length === 0) continue;
      previous[layerId] = layer.objectIds;
      let next = [...layer.objectIds];
      if (this.direction === 'front' || this.direction === 'back') {
        const rest = next.filter((id) => !selected.has(id));
        next = this.direction === 'front' ? [...rest, ...ids] : [...ids, ...rest];
      } else {
        const step = this.direction === 'forward' ? 1 : -1;
        const order = this.direction === 'forward' ? [...next].reverse() : [...next];
        for (const id of order) {
          if (!selected.has(id)) continue;
          const index = next.indexOf(id);
          const target = Math.max(0, Math.min(next.length - 1, index + step));
          if (target === index || selected.has(next[target]!)) continue;
          [next[index], next[target]] = [next[target]!, next[index]!];
        }
      }
      if (next.some((id, index) => id !== layer.objectIds[index])) changed = true;
      nextLayers[layerId] = { ...layer, objectIds: next };
    }
    if (!changed) return doc;
    this.previous = previous;
    return { ...doc, layers: nextLayers, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const layers = { ...doc.layers };
    for (const [layerId, objectIds] of Object.entries(this.previous)) {
      const layer = layers[layerId];
      if (layer) layers[layerId] = { ...layer, objectIds };
    }
    return { ...doc, layers, updatedAt: new Date().toISOString() };
  }
}

/** Duplicate objects with fresh IDs and a deterministic world-space offset. */
export class DuplicateObjectsCommand implements Command {
  readonly type = 'DuplicateObjects';
  readonly description = 'Duplicate objects';
  private createdIds: ObjectId[] = [];

  constructor(private readonly objectIds: readonly ObjectId[], private readonly offset: Vec2 = { x: 20, y: 20 }) {}

  execute(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    const layers = { ...doc.layers };
    this.createdIds = [];
    for (const sourceId of this.objectIds) {
      const source = doc.objects[sourceId];
      const layer = source ? layers[source.layerId] : undefined;
      if (!source || source.locked || !layer || layer.locked) continue;
      const id = generateId();
      this.createdIds.push(id);
      const cloned = structuredClone(source);
      const duplicated = cloned.type === 'path'
        ? { ...cloned, nodes: cloned.nodes.map((node) => ({ ...node, id: generateId() })) }
        : cloned;
      objects[id] = { ...duplicated, id, name: `${source.name} copy`, transform: { ...source.transform, position: { x: source.transform.position.x + this.offset.x, y: source.transform.position.y + this.offset.y } } };
      layers[source.layerId] = { ...layer, objectIds: [...layers[source.layerId]!.objectIds, id] };
    }
    if (this.createdIds.length === 0) return doc;
    return { ...doc, objects, layers, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.createdIds.length === 0) return doc;
    const created = new Set(this.createdIds);
    const objects = { ...doc.objects };
    for (const id of this.createdIds) delete objects[id];
    const layers = Object.fromEntries(Object.entries(doc.layers).map(([id, layer]) => [id, { ...layer, objectIds: layer.objectIds.filter((objectId) => !created.has(objectId)) }])) as DocumentModel['layers'];
    return { ...doc, objects, layers, updatedAt: new Date().toISOString() };
  }
}

export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

/** Align objects to selection bounds or the active artboard. */
export class AlignObjectsCommand implements Command {
  readonly type = 'AlignObjects';
  readonly description = 'Align objects';
  private previous = new Map<ObjectId, Transform2D>();

  constructor(private readonly objectIds: readonly ObjectId[], private readonly alignment: Alignment, private readonly target: 'selection' | 'artboard' = 'selection') {}

  execute(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    const selected = this.objectIds.map((id) => doc.objects[id]).filter((object): object is SceneObject => Boolean(object));
    if (selected.length === 0) return doc;
    const bounds = selected.map(getObjectBounds);
    const artboard = doc.artboards[doc.activeArtboardId];
    const target = this.target === 'artboard' && artboard ? { x: artboard.x, y: artboard.y, width: artboard.width, height: artboard.height } : {
      x: Math.min(...bounds.map((bound) => bound.x)), y: Math.min(...bounds.map((bound) => bound.y)),
      width: Math.max(...bounds.map((bound) => bound.x + bound.width)) - Math.min(...bounds.map((bound) => bound.x)),
      height: Math.max(...bounds.map((bound) => bound.y + bound.height)) - Math.min(...bounds.map((bound) => bound.y)),
    };
    let changed = false;
    selected.forEach((object, index) => {
      if (object.locked) return;
      const bound = bounds[index]!;
      const nextX = this.alignment === 'left' ? target.x : this.alignment === 'right' ? target.x + target.width - bound.width : this.alignment === 'center' ? target.x + (target.width - bound.width) / 2 : bound.x;
      const nextY = this.alignment === 'top' ? target.y : this.alignment === 'bottom' ? target.y + target.height - bound.height : this.alignment === 'middle' ? target.y + (target.height - bound.height) / 2 : bound.y;
      const transform = { ...object.transform, position: { x: object.transform.position.x + nextX - bound.x, y: object.transform.position.y + nextY - bound.y } };
      if (!isValidTransform(transform)) return;
      this.previous.set(object.id, object.transform);
      objects[object.id] = { ...object, transform };
      changed = changed || transform.position.x !== object.transform.position.x || transform.position.y !== object.transform.position.y;
    });
    return changed ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.previous.size === 0) return doc;
    const objects = { ...doc.objects };
    for (const [id, transform] of this.previous) if (objects[id]) objects[id] = { ...objects[id]!, transform };
    return { ...doc, objects, updatedAt: new Date().toISOString() };
  }
}

/** Apply equal spacing between three or more selected object bounds. */
export class DistributeObjectsCommand implements Command {
  readonly type = 'DistributeObjects';
  readonly description = 'Distribute objects';
  private previous = new Map<ObjectId, Transform2D>();

  constructor(private readonly objectIds: readonly ObjectId[], private readonly axis: 'horizontal' | 'vertical') {}

  execute(doc: DocumentModel): DocumentModel {
    const selected = this.objectIds.map((id) => doc.objects[id]).filter((object): object is SceneObject => Boolean(object)).filter((object) => !object.locked).map((object) => ({ object, bounds: getObjectBounds(object) })).sort((a, b) => this.axis === 'horizontal' ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y);
    if (selected.length < 3) return doc;
    const first = selected[0]!.bounds;
    const last = selected[selected.length - 1]!.bounds;
    const total = this.axis === 'horizontal' ? last.x + last.width - first.x : last.y + last.height - first.y;
    const occupied = selected.reduce((sum, item) => sum + (this.axis === 'horizontal' ? item.bounds.width : item.bounds.height), 0);
    const gap = (total - occupied) / (selected.length - 1);
    const objects = { ...doc.objects };
    let cursor = this.axis === 'horizontal' ? first.x : first.y;
    for (const item of selected) {
      const coordinate = this.axis === 'horizontal' ? item.bounds.x : item.bounds.y;
      const delta = cursor - coordinate;
      if (delta !== 0) {
        this.previous.set(item.object.id, item.object.transform);
        objects[item.object.id] = { ...item.object, transform: { ...item.object.transform, position: { x: item.object.transform.position.x + (this.axis === 'horizontal' ? delta : 0), y: item.object.transform.position.y + (this.axis === 'vertical' ? delta : 0) } } };
      }
      cursor += (this.axis === 'horizontal' ? item.bounds.width : item.bounds.height) + gap;
    }
    return this.previous.size > 0 ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }

  undo(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    for (const [id, transform] of this.previous) if (objects[id]) objects[id] = { ...objects[id]!, transform };
    return this.previous.size > 0 ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }
}

/** Flip selected objects around their current local center. */
export class FlipObjectsCommand extends TransformObjectsCommand {
  constructor(objectIds: readonly ObjectId[], axis: 'horizontal' | 'vertical', doc: DocumentModel) {
    super(objectIds, new Map(objectIds.map((id) => {
      const object = doc.objects[id];
      if (!object) return [id, undefined] as const;
      const bounds = getObjectBounds(object);
      return [id, { ...object.transform, scale: { x: axis === 'horizontal' ? -object.transform.scale.x : object.transform.scale.x, y: axis === 'vertical' ? -object.transform.scale.y : object.transform.scale.y }, position: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }, pivot: { x: bounds.width / 2, y: bounds.height / 2 } }] as const;
    }).filter((entry): entry is [ObjectId, Transform2D] => Boolean(entry[1]))));
  }
}

/** Apply last transform delta to current objects. */
export class RepeatTransformCommand extends TransformObjectsCommand {
  constructor(objectIds: readonly ObjectId[], delta: Readonly<Partial<Transform2D>>, doc: DocumentModel) {
    super(objectIds, new Map(objectIds.map((id) => {
      const object = doc.objects[id];
      if (!object) return [id, undefined] as const;
      return [id, { ...object.transform, position: { x: object.transform.position.x + (delta.position?.x ?? 0), y: object.transform.position.y + (delta.position?.y ?? 0) }, rotation: object.transform.rotation + (delta.rotation ?? 0), scale: { x: object.transform.scale.x * (delta.scale?.x ?? 1), y: object.transform.scale.y * (delta.scale?.y ?? 1) } }] as const;
    }).filter((entry): entry is [ObjectId, Transform2D] => Boolean(entry[1]))));
  }
}

// ─── SetObjectStyleCommand ────────────────────────────────────────────────────

export class SetObjectStyleCommand implements Command {
  readonly type = 'SetObjectStyle';
  readonly description: string;
  private previousStyles: Map<ObjectId, ObjectStyle> = new Map();

  constructor(
    private readonly objectIds: readonly ObjectId[],
    private readonly stylePatch: Partial<ObjectStyle>,
  ) {
    if (stylePatch.fill !== undefined) {
      this.description = 'Change fill';
    } else if (stylePatch.stroke !== undefined) {
      this.description = 'Change stroke';
    } else if (stylePatch.opacity !== undefined) {
      this.description = 'Change opacity';
    } else {
      this.description = 'Change style';
    }
  }

  execute(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    let changed = false;

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj || obj.locked) continue;

      this.previousStyles.set(objectId, obj.style);

      newObjects[objectId] = {
        ...obj,
        style: { ...obj.style, ...this.stylePatch },
      };
      changed = true;
    }

    if (!changed) return doc;

    return {
      ...doc,
      objects: newObjects,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj) continue;

      const prev = this.previousStyles.get(objectId);
      if (!prev) continue;

      newObjects[objectId] = { ...obj, style: prev };
    }

    return {
      ...doc,
      objects: newObjects,
      updatedAt: new Date().toISOString(),
    };
  }
}


// ─── SetRectangleGeometryCommand ─────────────────────────────────────────────

export class SetRectangleGeometryCommand implements Command {
  readonly type = 'SetRectangleGeometry';
  readonly description: string;
  private previous: { width: number; height: number; cornerRadius: number | CornerRadii } | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly patch: Readonly<{
      width?: number;
      height?: number;
      cornerRadius?: number | Partial<CornerRadii>;
    }>,
  ) {
    this.description =
      patch.cornerRadius !== undefined && patch.width === undefined && patch.height === undefined
        ? 'Change corner radius'
        : 'Resize';
  }

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'rectangle' || obj.locked) return doc;

    const width = this.patch.width ?? obj.width;
    const height = this.patch.height ?? obj.height;
    const nextRadius = this.patch.cornerRadius ?? obj.cornerRadius;
    const normalizedRadii = normalizeCornerRadii(nextRadius, width, height);
    const cornerRadius = typeof nextRadius === 'number' && typeof obj.cornerRadius === 'number'
      ? normalizedRadii.topLeft
      : normalizedRadii;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return doc;
    }

    this.previous = { width: obj.width, height: obj.height, cornerRadius: obj.cornerRadius };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, width, height, cornerRadius },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'rectangle') return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, ...this.previous },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── SetEllipseGeometryCommand ───────────────────────────────────────────────

export class SetEllipseGeometryCommand implements Command {
  readonly type = 'SetEllipseGeometry';
  readonly description = 'Resize';
  private previous: { width: number; height: number } | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly patch: Readonly<{
      width?: number;
      height?: number;
    }>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'ellipse' || obj.locked) return doc;

    const width = this.patch.width ?? obj.width;
    const height = this.patch.height ?? obj.height;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return doc;
    }

    this.previous = { width: obj.width, height: obj.height };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, width, height },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'ellipse') return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, ...this.previous },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── SetLineGeometryCommand ──────────────────────────────────────────────────

export class SetLineGeometryCommand implements Command {
  readonly type = 'SetLineGeometry';
  readonly description = 'Change line endpoint';
  private previous: { endPoint: Vec2 } | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly patch: Readonly<{
      endPoint?: Vec2;
    }>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'line' || obj.locked) return doc;

    const endPoint = this.patch.endPoint ?? obj.endPoint;

    if (!Number.isFinite(endPoint.x) || !Number.isFinite(endPoint.y)) {
      return doc;
    }

    this.previous = { endPoint: obj.endPoint };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, endPoint },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'line') return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, ...this.previous },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── SetPathGeometryCommand ──────────────────────────────────────────────────

export class SetPathGeometryCommand implements Command {
  readonly type = 'SetPathGeometry';
  readonly description = 'Edit path';
  private previous: { nodes: readonly PathNode[]; closed: boolean } | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly patch: Readonly<{
      nodes?: readonly PathNode[];
      closed?: boolean;
    }>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'path' || obj.locked) return doc;

    const nodes = this.patch.nodes ?? obj.nodes;
    const closed = this.patch.closed ?? obj.closed;

    if (!isValidPathGeometry(nodes, closed)) return doc;

    this.previous = { nodes: obj.nodes, closed: obj.closed };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, nodes, closed },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'path') return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, ...this.previous },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

export class UpdatePathNodeCommand implements Command {
  readonly type = 'UpdatePathNode';
  readonly description = 'Edit path node';
  private previous: PathNode | null = null;

  constructor(private readonly objectId: ObjectId, private readonly nodeIndex: number, private readonly patch: Partial<Omit<PathNode, 'id'>>) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    const node = object?.type === 'path' ? object.nodes[this.nodeIndex] : undefined;
    if (!object || object.type !== 'path' || object.locked || !node) return doc;
    const nextNode = { ...node, ...this.patch };
    const nodes = object.nodes.map((item, index) => index === this.nodeIndex ? nextNode : item);
    if (!isValidPathGeometry(nodes, object.closed)) return doc;
    this.previous = node;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (!this.previous || object?.type !== 'path') return doc;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: object.nodes.map((node, index) => index === this.nodeIndex ? this.previous! : node) } }, updatedAt: new Date().toISOString() };
  }
}

export class SetPathNodeKindCommand extends UpdatePathNodeCommand {
  constructor(objectId: ObjectId, nodeIndex: number, kind: PathNode['kind'], doc: DocumentModel) {
    const object = doc.objects[objectId];
    const node = object?.type === 'path' ? object.nodes[nodeIndex] : undefined;
    super(objectId, nodeIndex, node ? applyNodeKind(node, kind) : { kind });
  }
}

export class AddPathNodeCommand implements Command {
  readonly type = 'AddPathNode';
  readonly description = 'Add path node';
  private previous: readonly PathNode[] | null = null;
  private inserted: PathNode | null = null;

  constructor(private readonly objectId: ObjectId, private readonly segmentIndex: number, private readonly t = 0.5) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || object.locked || !Number.isFinite(this.t) || this.t <= 0 || this.t >= 1) return doc;
    const segment = getCubicSegment(object.nodes, this.segmentIndex, object.closed);
    if (!segment) return doc;
    const split = splitCubic(segment, this.t);
    const nextIndex = this.segmentIndex + 1 < object.nodes.length ? this.segmentIndex + 1 : 0;
    const inserted = this.inserted ?? createPathNode(split.left.end, { inHandle: split.left.control2, outHandle: split.right.control1, kind: 'smooth' });
    this.inserted = inserted;
    let nodes = [...object.nodes];
    const previousIndex = this.segmentIndex;
    nodes = nodes.map((node, index) => index === previousIndex ? { ...node, outHandle: split.left.control1 } : index === nextIndex ? { ...node, inHandle: split.right.control2 } : node);
    if (nextIndex === 0 && object.closed) nodes = [...nodes, inserted];
    else nodes.splice(nextIndex, 0, inserted);
    if (!isValidPathGeometry(nodes, object.closed)) return doc;
    this.previous = object.nodes;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object?.type === 'path' ? { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class RemovePathNodeCommand implements Command {
  readonly type = 'RemovePathNode';
  readonly description = 'Remove path node';
  private previous: readonly PathNode[] | null = null;

  constructor(private readonly objectId: ObjectId, private readonly nodeIndex: number) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || object.locked || !object.nodes[this.nodeIndex]) return doc;
    const nodes = object.nodes.filter((_, index) => index !== this.nodeIndex);
    if (!isValidPathGeometry(nodes, object.closed)) return doc;
    this.previous = object.nodes;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object?.type === 'path' ? { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class ReversePathCommand implements Command {
  readonly type = 'ReversePath';
  readonly description = 'Reverse path direction';
  private previous: readonly PathNode[] | null = null;

  constructor(private readonly objectId: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || object.locked) return doc;
    this.previous = object.nodes;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: reversePathNodes(object.nodes) } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object?.type === 'path' ? { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class ConvertPathSegmentCommand implements Command {
  readonly type = 'ConvertPathSegment';
  readonly description = 'Convert path segment';
  private previous: readonly PathNode[] | null = null;

  constructor(private readonly objectId: ObjectId, private readonly segmentIndex: number, private readonly to: 'line' | 'curve') {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    const segment = object?.type === 'path' ? getCubicSegment(object.nodes, this.segmentIndex, object.closed) : null;
    if (object?.type !== 'path' || object.locked || !segment) return doc;
    const endIndex = this.segmentIndex + 1 < object.nodes.length ? this.segmentIndex + 1 : 0;
    const nodes = object.nodes.map((node, index) => {
      if (this.to === 'line') {
        return index === this.segmentIndex || index === endIndex ? { ...node, inHandle: index === endIndex ? null : node.inHandle, outHandle: index === this.segmentIndex ? null : node.outHandle } : node;
      }
      const first = { x: segment.start.x + (segment.end.x - segment.start.x) / 3, y: segment.start.y + (segment.end.y - segment.start.y) / 3 };
      const second = { x: segment.start.x + 2 * (segment.end.x - segment.start.x) / 3, y: segment.start.y + 2 * (segment.end.y - segment.start.y) / 3 };
      return index === this.segmentIndex ? { ...node, outHandle: node.outHandle ?? first } : index === endIndex ? { ...node, inHandle: node.inHandle ?? second } : node;
    });
    if (!isValidPathGeometry(nodes, object.closed)) return doc;
    this.previous = object.nodes;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object?.type === 'path' ? { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class MergePathNodesCommand implements Command {
  readonly type = 'MergePathNodes';
  readonly description = 'Merge path nodes';
  private previous: readonly PathNode[] | null = null;

  constructor(private readonly objectId: ObjectId, private readonly firstIndex: number, private readonly secondIndex: number) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || object.locked || this.firstIndex === this.secondIndex) return doc;
    const first = object.nodes[this.firstIndex];
    const second = object.nodes[this.secondIndex];
    if (!first || !second) return doc;
    const merged = createPathNode({ x: (first.point.x + second.point.x) / 2, y: (first.point.y + second.point.y) / 2 }, {
      id: first.id, kind: first.kind, inHandle: first.inHandle ?? second.inHandle, outHandle: first.outHandle ?? second.outHandle,
    });
    const nodes = object.nodes.map((node, index) => index === this.firstIndex ? merged : node).filter((_, index) => index !== this.secondIndex);
    if (!isValidPathGeometry(nodes, object.closed)) return doc;
    this.previous = object.nodes;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object?.type === 'path' ? { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class SplitPathCommand implements Command {
  readonly type = 'SplitPath';
  readonly description = 'Split path';
  private created: SceneObject | null = null;
  private previous: SceneObject | null = null;
  private layerIndex = -1;

  constructor(private readonly objectId: ObjectId, private readonly nodeIndex: number) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    const layer = object ? doc.layers[object.layerId] : undefined;
    if (object?.type !== 'path' || object.closed || !layer || this.nodeIndex < 1 || this.nodeIndex >= object.nodes.length - 1) return doc;
    const firstNodes = object.nodes.slice(0, this.nodeIndex + 1);
    const secondNodes = object.nodes.slice(this.nodeIndex);
    if (!isValidPathGeometry(firstNodes, false) || !isValidPathGeometry(secondNodes, false)) return doc;
    const created = { ...object, id: generateId(), name: `${object.name} split`, nodes: secondNodes, closed: false };
    this.previous = object;
    this.created = created;
    this.layerIndex = layer.objectIds.indexOf(object.id);
    const ids = [...layer.objectIds];
    ids.splice(this.layerIndex + 1, 0, created.id);
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: firstNodes }, [created.id]: created }, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds: ids } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous || !this.created) return doc;
    const layer = doc.layers[this.previous.layerId];
    if (!layer) return doc;
    const objects = { ...doc.objects, [this.previous.id]: this.previous };
    delete objects[this.created.id];
    return { ...doc, objects, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds: layer.objectIds.filter((id) => id !== this.created!.id) } }, updatedAt: new Date().toISOString() };
  }
}

export class JoinOpenPathsCommand implements Command {
  readonly type = 'JoinOpenPaths';
  readonly description = 'Join open paths';
  private first: SceneObject | null = null;
  private second: SceneObject | null = null;
  private secondIndex = -1;

  constructor(private readonly firstId: ObjectId, private readonly secondId: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const first = doc.objects[this.firstId];
    const second = doc.objects[this.secondId];
    const layer = first ? doc.layers[first.layerId] : undefined;
    if (first?.type !== 'path' || second?.type !== 'path' || first.closed || second.closed || first.layerId !== second.layerId || !layer || first.id === second.id) return doc;
    this.first = first;
    this.second = second;
    this.secondIndex = layer.objectIds.indexOf(second.id);
    const firstCandidates = [first.nodes, reversePathNodes(first.nodes)];
    const secondCandidates = [second.nodes, reversePathNodes(second.nodes)];
    let best: { first: readonly PathNode[]; second: readonly PathNode[]; distance: number } | null = null;
    for (const firstNodes of firstCandidates) {
      for (const secondNodes of secondCandidates) {
        const firstEnd = firstNodes.at(-1)!.point;
        const secondStart = secondNodes[0]!.point;
        const distance = Math.hypot(firstEnd.x - secondStart.x, firstEnd.y - secondStart.y);
        if (!best || distance < best.distance) best = { first: firstNodes, second: secondNodes, distance };
      }
    }
    if (!best) return doc;
    const sameEnd = best.distance <= 1e-6;
    const usedNodeIds = new Set(best.first.map((node) => node.id).filter((id): id is string => Boolean(id)));
    const secondNodes = best.second.map((node, index) => {
      if (sameEnd && index === 0) return node;
      if (!node.id || !usedNodeIds.has(node.id)) {
        if (node.id) usedNodeIds.add(node.id);
        return node;
      }
      const next = { ...node, id: generateId() };
      usedNodeIds.add(next.id!);
      return next;
    });
    const nodes = sameEnd ? [...best.first, ...secondNodes.slice(1)] : [...best.first, ...secondNodes];
    if (!isValidPathGeometry(nodes, false)) return doc;
    const objects = { ...doc.objects, [first.id]: { ...first, nodes } };
    delete objects[second.id];
    return { ...doc, objects, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds: layer.objectIds.filter((id) => id !== second.id) } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const layer = this.first ? doc.layers[this.first.layerId] : undefined;
    if (!this.first || !this.second || !layer) return doc;
    const objectIds = [...layer.objectIds];
    if (!objectIds.includes(this.second.id)) objectIds.splice(Math.max(0, this.secondIndex), 0, this.second.id);
    return { ...doc, objects: { ...doc.objects, [this.first.id]: this.first, [this.second.id]: this.second }, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds } }, updatedAt: new Date().toISOString() };
  }
}

export class SetPathNodeHandlesCommand extends UpdatePathNodeCommand {
  constructor(objectId: ObjectId, nodeIndex: number, handles: Pick<PathNode, 'inHandle' | 'outHandle'>) {
    super(objectId, nodeIndex, handles);
  }
}

export class DisconnectPathNodeHandlesCommand extends UpdatePathNodeCommand {
  constructor(objectId: ObjectId, nodeIndex: number, side: 'in' | 'out' | 'both' = 'both') {
    super(objectId, nodeIndex, {
      ...(side === 'in' || side === 'both' ? { inHandle: null } : {}),
      ...(side === 'out' || side === 'both' ? { outHandle: null } : {}),
      kind: 'cusp',
    });
  }
}

export class ConnectPathNodeHandlesCommand extends UpdatePathNodeCommand {
  constructor(objectId: ObjectId, nodeIndex: number, doc: DocumentModel) {
    const object = doc.objects[objectId];
    const node = object?.type === 'path' ? object.nodes[nodeIndex] : undefined;
    super(objectId, nodeIndex, node ? applyNodeKind(node, 'smooth') : { kind: 'smooth' });
  }
}

export class ConvertObjectToPathCommand implements Command {
  readonly type = 'ConvertObjectToPath';
  readonly description = 'Convert to curves';
  private previous: SceneObject | null = null;

  constructor(private readonly objectId: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (!object || object.locked || object.type === 'path') return doc;
    const nodes: PathNode[] = object.type === 'rectangle'
      ? [createPathNode({ x: 0, y: 0 }), createPathNode({ x: object.width, y: 0 }), createPathNode({ x: object.width, y: object.height }), createPathNode({ x: 0, y: object.height })]
      : object.type === 'ellipse'
        ? ellipsePathNodes(object.width, object.height)
        : [createPathNode({ x: 0, y: 0 }), createPathNode(object.endPoint)];
    const path: import('../model/types.js').PathObject = { ...object, type: 'path', nodes, closed: object.type !== 'line', style: object.type === 'line' ? { ...object.style, fill: { type: 'none' } } : object.style };
    if (!isValidPathGeometry(path.nodes, path.closed)) return doc;
    this.previous = object;
    return { ...doc, objects: { ...doc.objects, [object.id]: path }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, objects: { ...doc.objects, [this.previous.id]: this.previous }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class ConvertStrokeToPathCommand implements Command {
  readonly type = 'ConvertStrokeToPath';
  readonly description = 'Convert stroke to path';
  private previous: SceneObject | null = null;

  constructor(private readonly objectId: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (!object || object.locked || !object.style.stroke) return doc;
    const centerline = object.type === 'path'
      ? samplePath(object.nodes, object.closed)
      : object.type === 'line'
        ? [{ x: 0, y: 0 }, object.endPoint]
        : object.type === 'rectangle'
          ? [{ x: 0, y: 0 }, { x: object.width, y: 0 }, { x: object.width, y: object.height }, { x: 0, y: object.height }]
          : samplePath(ellipsePathNodes(object.width, object.height), true);
    if (!centerline || centerline.length < 2 || object.style.stroke.width <= 0) return doc;
    const outline = strokeOutline(centerline, object.style.stroke.width / 2, object.style.stroke.lineCap, object.type === 'path' && object.closed);
    if (outline.length < 3) return doc;
    const path: import('../model/types.js').PathObject = {
      ...object,
      type: 'path',
      nodes: outline.map((point) => createPathNode(point)),
      closed: true,
      style: { ...object.style, fill: object.style.fill.type === 'none' ? { type: 'solid', color: object.style.stroke!.color } : object.style.fill, stroke: null },
    };
    if (!isValidPathGeometry(path.nodes, true)) return doc;
    this.previous = object;
    return { ...doc, objects: { ...doc.objects, [object.id]: path }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, objects: { ...doc.objects, [this.previous.id]: this.previous }, updatedAt: new Date().toISOString() } : doc;
  }
}

function samplePath(nodes: readonly PathNode[], closed: boolean): Vec2[] {
  const points: Vec2[] = [];
  const segmentCount = closed ? nodes.length : nodes.length - 1;
  for (let i = 0; i < segmentCount; i += 1) {
    const segment = getCubicSegment(nodes, i, closed);
    if (!segment) continue;
    for (let step = i === 0 ? 0 : 1; step <= 8; step += 1) {
      const t = step / 8;
      const mt = 1 - t;
      points.push({
        x: mt ** 3 * segment.start.x + 3 * mt ** 2 * t * segment.control1.x + 3 * mt * t ** 2 * segment.control2.x + t ** 3 * segment.end.x,
        y: mt ** 3 * segment.start.y + 3 * mt ** 2 * t * segment.control1.y + 3 * mt * t ** 2 * segment.control2.y + t ** 3 * segment.end.y,
      });
    }
  }
  return points;
}

function strokeOutline(points: readonly Vec2[], radius: number, cap: StrokeStyle['lineCap'], closed = false): Vec2[] {
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const previous = points[Math.max(0, i - 1)]!;
    const next = points[Math.min(points.length - 1, i + 1)]!;
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / length * radius, y: dx / length * radius };
    left.push({ x: points[i]!.x + normal.x, y: points[i]!.y + normal.y });
    right.push({ x: points[i]!.x - normal.x, y: points[i]!.y - normal.y });
  }
  if (!closed && cap === 'square') {
    const extend = (point: Vec2, toward: Vec2) => { const length = Math.hypot(toward.x, toward.y) || 1; return { x: point.x + toward.x / length * radius, y: point.y + toward.y / length * radius }; };
    const startDirection = { x: points[0]!.x - points[1]!.x, y: points[0]!.y - points[1]!.y };
    const endDirection = { x: points.at(-1)!.x - points.at(-2)!.x, y: points.at(-1)!.y - points.at(-2)!.y };
    left[0] = extend(left[0]!, startDirection);
    right[0] = extend(right[0]!, startDirection);
    left[left.length - 1] = extend(left.at(-1)!, endDirection);
    right[right.length - 1] = extend(right.at(-1)!, endDirection);
  }
  return [...left, ...right.reverse()];
}

function ellipsePathNodes(width: number, height: number): PathNode[] {
  const rx = width / 2;
  const ry = height / 2;
  const k = 0.5522847498;
  return [
    createPathNode({ x: rx, y: 0 }, { outHandle: { x: rx + k * rx, y: 0 }, inHandle: { x: rx - k * rx, y: 0 }, kind: 'smooth' }),
    createPathNode({ x: width, y: ry }, { outHandle: { x: width, y: ry + k * ry }, inHandle: { x: width, y: ry - k * ry }, kind: 'smooth' }),
    createPathNode({ x: rx, y: height }, { outHandle: { x: rx - k * rx, y: height }, inHandle: { x: rx + k * rx, y: height }, kind: 'smooth' }),
    createPathNode({ x: 0, y: ry }, { outHandle: { x: 0, y: ry - k * ry }, inHandle: { x: 0, y: ry + k * ry }, kind: 'smooth' }),
  ];
}

// ─── Artboard and layer commands ─────────────────────────────────────────────

export class UpdateArtboardCommand implements Command {
  readonly type = 'UpdateArtboard';
  readonly description = 'Change artboard';
  private previous: Partial<Pick<import('../model/types.js').Artboard, 'name' | 'width' | 'height' | 'background' | 'visible' | 'frame'>> | null = null;

  constructor(
    private readonly artboardId: ArtboardId,
    private readonly patch: Partial<Pick<import('../model/types.js').Artboard, 'name' | 'width' | 'height' | 'background' | 'visible' | 'frame'>>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const artboard = doc.artboards[this.artboardId];
    if (!artboard) return doc;
    const width = this.patch.width ?? artboard.width;
    const height = this.patch.height ?? artboard.height;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return doc;
    this.previous = { name: artboard.name, width: artboard.width, height: artboard.height, background: artboard.background, visible: artboard.visible, frame: artboard.frame };
    return { ...doc, artboards: { ...doc.artboards, [this.artboardId]: { ...artboard, ...this.patch, width, height, frame: { x: artboard.x, y: artboard.y, width, height } } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const artboard = doc.artboards[this.artboardId];
    return this.previous && artboard ? { ...doc, artboards: { ...doc.artboards, [this.artboardId]: { ...artboard, ...this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class SetDocumentUnitCommand implements Command {
  readonly type = 'SetDocumentUnit';
  readonly description = 'Change document units';
  private previous: DocumentUnit | null = null;

  constructor(private readonly unit: DocumentUnit) {}

  execute(doc: DocumentModel): DocumentModel {
    if (doc.unit === this.unit) return doc;
    this.previous = doc.unit;
    return { ...doc, unit: this.unit, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, unit: this.previous, updatedAt: new Date().toISOString() } : doc;
  }
}

export class SelectArtboardCommand implements Command {
  readonly type = 'SelectArtboard';
  readonly description = 'Select artboard';
  private previous: ArtboardId | null = null;

  constructor(private readonly artboardId: ArtboardId) {}

  execute(doc: DocumentModel): DocumentModel {
    if (!doc.artboards[this.artboardId] || doc.activeArtboardId === this.artboardId) return doc;
    this.previous = doc.activeArtboardId;
    return { ...doc, activeArtboardId: this.artboardId };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, activeArtboardId: this.previous } : doc;
  }
}

function nextArtboardPosition(doc: DocumentModel): { x: number; y: number } {
  const boards = Object.values(doc.artboards);
  if (boards.length === 0) return { x: 0, y: 0 };
  const right = Math.max(...boards.map((board) => board.x + board.width));
  return { x: right + 80, y: boards[0]?.y ?? 0 };
}

function uniqueArtboardName(doc: DocumentModel, requested: string): string {
  const names = new Set(Object.values(doc.artboards).map((board) => board.name));
  if (!names.has(requested)) return requested;
  let suffix = 2;
  while (names.has(`${requested} ${suffix}`)) suffix += 1;
  return `${requested} ${suffix}`;
}

export class CreateArtboardCommand implements Command {
  readonly type = 'CreateArtboard';
  readonly description = 'Add artboard';
  private created: Artboard | null = null;

  constructor(private readonly options: Partial<Pick<Artboard, 'name' | 'x' | 'y' | 'width' | 'height' | 'background'>> = {}) {}

  execute(doc: DocumentModel): DocumentModel {
    const position = nextArtboardPosition(doc);
    const id = generateId();
    const board: Artboard = {
      id,
      name: uniqueArtboardName(doc, this.options.name?.trim() || `Artboard ${doc.artboardIds.length + 1}`),
      x: this.options.x ?? position.x,
      y: this.options.y ?? position.y,
      width: this.options.width ?? 1920,
      height: this.options.height ?? 1080,
      background: this.options.background ?? { type: 'color', color: '#ffffff' },
      visible: true,
      frame: { x: this.options.x ?? position.x, y: this.options.y ?? position.y, width: this.options.width ?? 1920, height: this.options.height ?? 1080 },
    };
    if (!Number.isFinite(board.x) || !Number.isFinite(board.y) || !Number.isFinite(board.width) || !Number.isFinite(board.height) || board.width <= 0 || board.height <= 0) return doc;
    this.created = board;
    return { ...doc, artboards: { ...doc.artboards, [id]: board }, artboardIds: [...doc.artboardIds, id], activeArtboardId: id, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.created || doc.artboardIds.length <= 1) return doc;
    const artboards = { ...doc.artboards };
    delete artboards[this.created.id];
    const artboardIds = doc.artboardIds.filter((id) => id !== this.created!.id);
    return { ...doc, artboards, artboardIds, activeArtboardId: artboardIds[artboardIds.length - 1]!, updatedAt: new Date().toISOString() };
  }
}

export class DuplicateArtboardCommand implements Command {
  readonly type = 'DuplicateArtboard';
  readonly description = 'Duplicate artboard';
  private duplicateId: ArtboardId | null = null;

  constructor(private readonly sourceId: ArtboardId) {}

  execute(doc: DocumentModel): DocumentModel {
    const source = doc.artboards[this.sourceId];
    if (!source) return doc;
    const id = generateId();
    const position = nextArtboardPosition(doc);
    const duplicate: Artboard = { ...source, id, name: uniqueArtboardName(doc, `${source.name} copy`), x: position.x, y: position.y, frame: { x: position.x, y: position.y, width: source.width, height: source.height } };
    this.duplicateId = id;
    return { ...doc, artboards: { ...doc.artboards, [id]: duplicate }, artboardIds: [...doc.artboardIds, id], activeArtboardId: id, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.duplicateId || doc.artboardIds.length <= 1) return doc;
    const artboards = { ...doc.artboards };
    delete artboards[this.duplicateId];
    const artboardIds = doc.artboardIds.filter((id) => id !== this.duplicateId);
    return { ...doc, artboards, artboardIds, activeArtboardId: artboardIds[artboardIds.length - 1]!, updatedAt: new Date().toISOString() };
  }
}

export class DeleteArtboardCommand implements Command {
  readonly type = 'DeleteArtboard';
  readonly description = 'Delete artboard';
  private deleted: Artboard | null = null;
  private deletedIndex = -1;
  private previousActive: ArtboardId | null = null;

  constructor(private readonly artboardId: ArtboardId) {}

  execute(doc: DocumentModel): DocumentModel {
    if (doc.artboardIds.length <= 1) return doc;
    const board = doc.artboards[this.artboardId];
    if (!board) return doc;
    this.deleted = board;
    this.deletedIndex = doc.artboardIds.indexOf(this.artboardId);
    this.previousActive = doc.activeArtboardId;
    const artboards = { ...doc.artboards };
    delete artboards[this.artboardId];
    const artboardIds = doc.artboardIds.filter((id) => id !== this.artboardId);
    const fallback = artboardIds[Math.min(Math.max(this.deletedIndex, 0), artboardIds.length - 1)]!;
    return { ...doc, artboards, artboardIds, activeArtboardId: doc.activeArtboardId === this.artboardId ? fallback : doc.activeArtboardId, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.deleted || doc.artboards[this.deleted.id]) return doc;
    const ids = [...doc.artboardIds];
    ids.splice(Math.max(0, this.deletedIndex), 0, this.deleted.id);
    return { ...doc, artboards: { ...doc.artboards, [this.deleted.id]: this.deleted }, artboardIds: ids, activeArtboardId: this.previousActive ?? doc.activeArtboardId, updatedAt: new Date().toISOString() };
  }
}

export class AddGuideCommand implements Command {
  readonly type = 'AddGuide';
  readonly description = 'Add guide';
  private guide: Guide;

  constructor(guide: Guide) { this.guide = { ...guide }; }

  execute(doc: DocumentModel): DocumentModel {
    if (!Number.isFinite(this.guide.position) || doc.guides.some((guide) => guide.id === this.guide.id)) return doc;
    return { ...doc, guides: [...doc.guides, this.guide], updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return { ...doc, guides: doc.guides.filter((guide) => guide.id !== this.guide.id), updatedAt: new Date().toISOString() };
  }
}

export class UpdateGuideCommand implements Command {
  readonly type = 'UpdateGuide';
  readonly description = 'Move guide';
  private previous: Guide | null = null;

  constructor(private readonly guideId: string, private readonly patch: Partial<Omit<Guide, 'id'>>) {}

  execute(doc: DocumentModel): DocumentModel {
    const guide = doc.guides.find((candidate) => candidate.id === this.guideId);
    if (!guide) return doc;
    const next = { ...guide, ...this.patch };
    if (!Number.isFinite(next.position)) return doc;
    this.previous = guide;
    return { ...doc, guides: doc.guides.map((candidate) => candidate.id === this.guideId ? next : candidate), updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, guides: doc.guides.map((guide) => guide.id === this.guideId ? this.previous! : guide), updatedAt: new Date().toISOString() } : doc;
  }
}

export class DeleteGuideCommand implements Command {
  readonly type = 'DeleteGuide';
  readonly description = 'Delete guide';
  private deleted: Guide | null = null;

  constructor(private readonly guideId: string) {}

  execute(doc: DocumentModel): DocumentModel {
    const guide = doc.guides.find((candidate) => candidate.id === this.guideId);
    if (!guide || guide.locked) return doc;
    this.deleted = guide;
    return { ...doc, guides: doc.guides.filter((candidate) => candidate.id !== this.guideId), updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.deleted && !doc.guides.some((guide) => guide.id === this.deleted!.id) ? { ...doc, guides: [...doc.guides, this.deleted], updatedAt: new Date().toISOString() } : doc;
  }
}

export class SetGridSettingsCommand implements Command {
  readonly type = 'SetGridSettings';
  readonly description = 'Change grid settings';
  private previous: GridSettings | null = null;

  constructor(private readonly patch: Partial<GridSettings>) {}

  execute(doc: DocumentModel): DocumentModel {
    const next = { ...doc.grid, ...this.patch };
    if (!Number.isFinite(next.size) || next.size <= 0 || !Number.isInteger(next.subdivisions) || next.subdivisions < 1) return doc;
    this.previous = doc.grid;
    return { ...doc, grid: next, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, grid: this.previous, updatedAt: new Date().toISOString() } : doc;
  }
}

export class SetSnapSettingsCommand implements Command {
  readonly type = 'SetSnapSettings';
  readonly description = 'Change snap settings';
  private previous: SnapSettings | null = null;

  constructor(private readonly patch: Partial<SnapSettings>) {}

  execute(doc: DocumentModel): DocumentModel {
    const next = { ...doc.snap, ...this.patch };
    if (!Number.isFinite(next.tolerancePx) || next.tolerancePx < 0) return doc;
    this.previous = doc.snap;
    return { ...doc, snap: next, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, snap: this.previous, updatedAt: new Date().toISOString() } : doc;
  }
}

export class UpdateLayerCommand implements Command {
  readonly type = 'UpdateLayer';
  readonly description = 'Change layer';
  private previous: Partial<Pick<import('../model/types.js').Layer, 'name' | 'visible' | 'locked' | 'opacity'>> | null = null;

  constructor(
    private readonly layerId: LayerId,
    private readonly patch: Partial<Pick<import('../model/types.js').Layer, 'name' | 'visible' | 'locked' | 'opacity'>>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.layerId];
    if (!layer) return doc;
    if (this.patch.opacity !== undefined && (!Number.isFinite(this.patch.opacity) || this.patch.opacity < 0 || this.patch.opacity > 1)) return doc;
    this.previous = { name: layer.name, visible: layer.visible, locked: layer.locked, opacity: layer.opacity };
    return { ...doc, layers: { ...doc.layers, [this.layerId]: { ...layer, ...this.patch } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.layerId];
    return this.previous && layer ? { ...doc, layers: { ...doc.layers, [this.layerId]: { ...layer, ...this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class UpdateObjectCommand implements Command {
  readonly type = 'UpdateObject';
  readonly description = 'Change object';
  private previous: Partial<Pick<SceneObject, 'name' | 'visible' | 'locked'>> | null = null;

  constructor(private readonly objectId: ObjectId, private readonly patch: Partial<Pick<SceneObject, 'name' | 'visible' | 'locked'>>) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (!object) return doc;
    if (object.locked && this.patch.locked !== false) return doc;
    this.previous = { name: object.name, visible: object.visible, locked: object.locked };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...object, ...this.patch } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object ? { ...doc, objects: { ...doc.objects, [this.objectId]: { ...object, ...this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}
```

## packages/core/src/commands/index.ts

```typescript
export type { Command, HistoryEntry } from './command.js';
export { CommandHistory } from './command.js';
export {
  CreateObjectsCommand,
  DeleteObjectsCommand,
  TransformObjectsCommand,
  UpdateObjectTransformCommand,
  ReorderObjectsCommand,
  DuplicateObjectsCommand,
  AlignObjectsCommand,
  DistributeObjectsCommand,
  FlipObjectsCommand,
  RepeatTransformCommand,
  type ReorderDirection,
  type Alignment,
  SetObjectStyleCommand,
  SetRectangleGeometryCommand,
  SetEllipseGeometryCommand,
  SetLineGeometryCommand,
  SetPathGeometryCommand,
  UpdatePathNodeCommand,
  SetPathNodeKindCommand,
  AddPathNodeCommand,
  RemovePathNodeCommand,
  ReversePathCommand,
  ConvertPathSegmentCommand,
  MergePathNodesCommand,
  SplitPathCommand,
  JoinOpenPathsCommand,
  SetPathNodeHandlesCommand,
  DisconnectPathNodeHandlesCommand,
  ConnectPathNodeHandlesCommand,
  ConvertObjectToPathCommand,
  ConvertStrokeToPathCommand,
  UpdateArtboardCommand,
  SetDocumentUnitCommand,
  SelectArtboardCommand,
  CreateArtboardCommand,
  DuplicateArtboardCommand,
  DeleteArtboardCommand,
  AddGuideCommand,
  UpdateGuideCommand,
  DeleteGuideCommand,
  SetGridSettingsCommand,
  SetSnapSettingsCommand,
  UpdateLayerCommand,
  UpdateObjectCommand,
} from './document-commands.js';
```

## packages/core/src/index.ts

```typescript
export * from './model/types.js';
export * from './model/transform.js';
export * from './model/factory.js';
export * from './model/invariants.js';
export * from './model/bounds.js';
export * from './model/shapes.js';
export * from './model/path.js';
export * from './commands/index.js';
export { DOCUMENT_PRESETS, type DocumentPreset } from './model/presets.js';
```

## packages/core/src/model/invariants.ts

```typescript
import type { DocumentModel } from './types.js';

export interface InvariantViolation {
  readonly code: string;
  readonly message: string;
}

/**
 * Validate all domain invariants on a DocumentModel.
 * Returns an empty array if the document is valid.
 */
export function validateInvariants(doc: DocumentModel): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  if (new Set(doc.layerIds).size !== doc.layerIds.length) {
    violations.push({ code: 'DUPLICATE_LAYER_ID', message: 'layerIds contains duplicates.' });
  }
  if (new Set(doc.artboardIds).size !== doc.artboardIds.length) {
    violations.push({ code: 'DUPLICATE_ARTBOARD_ID', message: 'artboardIds contains duplicates.' });
  }

  // ── layerIds consistency ──────────────────────────────────────────────────
  for (const layerId of doc.layerIds) {
    if (!(layerId in doc.layers)) {
      violations.push({
        code: 'MISSING_LAYER',
        message: `layerIds contains '${layerId}' but layers does not have it.`,
      });
    }
  }

  // ── artboardIds consistency ───────────────────────────────────────────────
  for (const artboardId of doc.artboardIds) {
    if (!(artboardId in doc.artboards)) {
      violations.push({
        code: 'MISSING_ARTBOARD',
        message: `artboardIds contains '${artboardId}' but artboards does not have it.`,
      });
    }
  }

  for (const artboardId of doc.artboardIds) {
    const artboard = doc.artboards[artboardId];
    if (!artboard) continue;
    if (!Number.isFinite(artboard.x) || !Number.isFinite(artboard.y)) violations.push({ code: 'INVALID_ARTBOARD_POSITION', message: `Artboard '${artboardId}' position must be finite.` });
    if (!Number.isFinite(artboard.width) || artboard.width <= 0) violations.push({ code: 'INVALID_ARTBOARD_WIDTH', message: `Artboard '${artboardId}' width must be positive and finite.` });
    if (!Number.isFinite(artboard.height) || artboard.height <= 0) violations.push({ code: 'INVALID_ARTBOARD_HEIGHT', message: `Artboard '${artboardId}' height must be positive and finite.` });
    if (artboard.frame && (!Number.isFinite(artboard.frame.x) || !Number.isFinite(artboard.frame.y) || !Number.isFinite(artboard.frame.width) || !Number.isFinite(artboard.frame.height) || artboard.frame.width <= 0 || artboard.frame.height <= 0)) violations.push({ code: 'INVALID_ARTBOARD_FRAME', message: `Artboard '${artboardId}' frame must contain finite positive dimensions.` });
  }

  if (!Number.isFinite(doc.grid.size) || doc.grid.size <= 0 || !Number.isInteger(doc.grid.subdivisions) || doc.grid.subdivisions < 1) violations.push({ code: 'INVALID_GRID', message: 'Grid size must be finite and subdivisions must be a positive integer.' });
  if (!Number.isFinite(doc.snap.tolerancePx) || doc.snap.tolerancePx < 0) violations.push({ code: 'INVALID_SNAP_TOLERANCE', message: 'Snap tolerance must be finite and non-negative.' });
  for (const guide of doc.guides) if (!Number.isFinite(guide.position)) violations.push({ code: 'INVALID_GUIDE_POSITION', message: `Guide '${guide.id}' position must be finite.` });

  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (layer && (!Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1)) violations.push({ code: 'INVALID_LAYER_OPACITY', message: `Layer '${layerId}' opacity must be within [0, 1].` });
  }

  // ── activeLayerId exists ──────────────────────────────────────────────────
  if (!(doc.activeLayerId in doc.layers)) {
    violations.push({
      code: 'INVALID_ACTIVE_LAYER',
      message: `activeLayerId '${doc.activeLayerId}' does not exist in layers.`,
    });
  }

  // ── activeArtboardId exists ───────────────────────────────────────────────
  if (!(doc.activeArtboardId in doc.artboards)) {
    violations.push({
      code: 'INVALID_ACTIVE_ARTBOARD',
      message: `activeArtboardId '${doc.activeArtboardId}' does not exist in artboards.`,
    });
  }

  // ── Object uniqueness across layers ───────────────────────────────────────
  const seenObjectIds = new Set<string>();
  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer) continue;

    for (const objectId of layer.objectIds) {
      if (seenObjectIds.has(objectId)) {
        violations.push({
          code: 'DUPLICATE_OBJECT_IN_LAYERS',
          message: `ObjectId '${objectId}' appears in multiple layers.`,
        });
      }
      seenObjectIds.add(objectId);

      // Object must exist in objects record
      const obj = doc.objects[objectId];
      if (!obj) {
        violations.push({
          code: 'MISSING_OBJECT',
          message: `ObjectId '${objectId}' is in layer '${layerId}' objectIds but not in objects.`,
        });
      } else {
        // object.layerId must match
        if (obj.layerId !== layerId) {
          violations.push({
            code: 'OBJECT_LAYER_MISMATCH',
            message: `Object '${objectId}' has layerId '${obj.layerId}' but is in layer '${layerId}'.`,
          });
        }

        // Geometry dimensions must be positive and finite
        if ('width' in obj) {
          if (!Number.isFinite(obj.width) || obj.width <= 0) {
            violations.push({
              code: 'INVALID_WIDTH',
              message: `Object '${objectId}' has non-positive or non-finite width: ${obj.width}.`,
            });
          }
        }
        if ('height' in obj) {
          const h = (obj as { height: number }).height;
          if (!Number.isFinite(h) || h <= 0) {
            violations.push({
              code: 'INVALID_HEIGHT',
              message: `Object '${objectId}' has non-positive or non-finite height: ${h}.`,
            });
          }
        }

        if ('cornerRadius' in obj) {
          const r = obj.cornerRadius;
          const radii = typeof r === 'number' ? [r] : [r.topLeft, r.topRight, r.bottomRight, r.bottomLeft];
          const maxR = Math.min(obj.width, obj.height) / 2;
          if (radii.some((radius) => !Number.isFinite(radius) || radius < 0 || radius > maxR)) {
            violations.push({ code: 'INVALID_CORNER_RADIUS', message: `Object '${objectId}' has a corner radius outside [0, min(width, height)/2].` });
          }
        }

        if (!Number.isFinite(obj.style.opacity) || obj.style.opacity < 0 || obj.style.opacity > 1) {
          violations.push({ code: 'INVALID_OPACITY', message: `Object '${objectId}' has opacity out of bounds [0, 1] or non-finite.` });
        }

        // ── Stroke validation ──────────────────────────────────────────────
        if (obj.style.stroke) {
          const s = obj.style.stroke;
          if (!Number.isFinite(s.width) || s.width < 0) {
            violations.push({ code: 'INVALID_STROKE_WIDTH', message: `Object '${objectId}' has negative or non-finite stroke width.` });
          }
          if (!Number.isFinite(s.opacity) || s.opacity < 0 || s.opacity > 1) {
            violations.push({ code: 'INVALID_STROKE_OPACITY', message: `Object '${objectId}' stroke opacity out of range or non-finite.` });
          }
          if (!Number.isFinite(s.miterLimit) || s.miterLimit < 1) {
            violations.push({ code: 'INVALID_MITER_LIMIT', message: `Object '${objectId}' miterLimit must be >= 1 and finite.` });
          }
        }

        // ── Gradient validation ─────────────────────────────────────────────
        if (obj.style.fill.type === 'linear-gradient') {
          const { stops, start, end } = obj.style.fill;
          if (stops.length < 2) {
            violations.push({ code: 'INVALID_GRADIENT_STOPS', message: `Object '${objectId}' gradient needs >= 2 stops.` });
          }
          for (const stop of stops) {
            if (!Number.isFinite(stop.offset) || stop.offset < 0 || stop.offset > 1) {
              violations.push({ code: 'INVALID_GRADIENT_OFFSET', message: `Object '${objectId}' gradient offset out of range or non-finite.` });
            }
            if (!Number.isFinite(stop.opacity) || stop.opacity < 0 || stop.opacity > 1) {
              violations.push({ code: 'INVALID_GRADIENT_STOP_OPACITY', message: `Object '${objectId}' gradient stop opacity out of range or non-finite.` });
            }
          }
          if (!Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(end.x) || !Number.isFinite(end.y)) {
            violations.push({ code: 'NON_FINITE_GRADIENT_POINT', message: `Object '${objectId}' gradient has non-finite points.` });
          }
        }

        // ── Type-specific geometry validation ──────────────────────────────
        if (obj.type === 'ellipse' && (obj.width <= 0 || obj.height <= 0)) {
          violations.push({ code: 'INVALID_ELLIPSE_SIZE', message: `Object '${objectId}' has non-positive ellipse dimensions.` });
        }

        if (obj.type === 'line') {
          if (!Number.isFinite(obj.endPoint.x) || !Number.isFinite(obj.endPoint.y)) {
            violations.push({ code: 'NON_FINITE_ENDPOINT', message: `Object '${objectId}' has non-finite endPoint.` });
          }
        }

        if (obj.type === 'path') {
          // Open path needs >= 2 nodes, closed needs >= 3
          const minNodes = obj.closed ? 3 : 2;
          if (obj.nodes.length < minNodes) {
            violations.push({ code: 'INVALID_PATH_NODE_COUNT', message: `Object '${objectId}' path has too few nodes (${obj.nodes.length}, need >= ${minNodes}).` });
          }
          const nodeIds = obj.nodes.map((node) => node.id).filter((id): id is string => Boolean(id));
          if (new Set(nodeIds).size !== nodeIds.length) {
            violations.push({ code: 'DUPLICATE_PATH_NODE_ID', message: `Object '${objectId}' contains duplicate path node IDs.` });
          }
          for (const node of obj.nodes) {
            if (node.id !== undefined && node.id.trim() === '') {
              violations.push({ code: 'INVALID_PATH_NODE_ID', message: `Object '${objectId}' contains an empty path node ID.` });
            }
            if (!Number.isFinite(node.point.x) || !Number.isFinite(node.point.y)) {
              violations.push({ code: 'NON_FINITE_PATH_NODE', message: `Object '${objectId}' has non-finite path node coordinates.` });
              break;
            }
            if (node.inHandle && (!Number.isFinite(node.inHandle.x) || !Number.isFinite(node.inHandle.y))) {
              violations.push({ code: 'NON_FINITE_PATH_NODE', message: `Object '${objectId}' has non-finite path node inHandle.` });
              break;
            }
            if (node.outHandle && (!Number.isFinite(node.outHandle.x) || !Number.isFinite(node.outHandle.y))) {
              violations.push({ code: 'NON_FINITE_PATH_NODE', message: `Object '${objectId}' has non-finite path node outHandle.` });
              break;
            }
          }
        }

        // All numbers must be finite
        const { transform } = obj;
        const numbers = [
          transform.position.x, transform.position.y,
          transform.rotation,
          transform.scale.x, transform.scale.y,
          transform.pivot.x, transform.pivot.y,
        ];
        for (const n of numbers) {
          if (!Number.isFinite(n)) {
            violations.push({
              code: 'NON_FINITE_NUMBER',
              message: `Object '${objectId}' contains a non-finite number in transform.`,
            });
            break;
          }
        }
        if (Math.abs(transform.scale.x) < 1e-6 || Math.abs(transform.scale.y) < 1e-6) {
          violations.push({ code: 'ZERO_SCALE', message: `Object '${objectId}' has a degenerate transform scale.` });
        }
      }
    }
  }

  // ── Check for orphaned objects (in objects record but not in any layer) ──
  for (const objectId of Object.keys(doc.objects)) {
    if (!seenObjectIds.has(objectId)) {
      violations.push({
        code: 'ORPHANED_OBJECT',
        message: `Object '${objectId}' exists in objects but is not in any layer's objectIds.`,
      });
    }
  }

  return violations;
}
```

## packages/core/src/model/path.ts

```typescript
import { generateId, type Vec2 } from '@vectoria/shared';
import type { PathNode } from './types.js';

export interface CubicSegment {
  readonly start: Vec2;
  readonly control1: Vec2;
  readonly control2: Vec2;
  readonly end: Vec2;
}

const finite = (point: Vec2): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);
const finiteOrNull = (point: Vec2 | null): boolean => point === null || finite(point);

export function createPathNode(point: Vec2, options: Partial<Omit<PathNode, 'point' | 'id'>> & { id?: string } = {}): PathNode {
  return { id: options.id ?? generateId(), point, inHandle: options.inHandle ?? null, outHandle: options.outHandle ?? null, kind: options.kind ?? 'corner' };
}

export function isValidPathGeometry(nodes: readonly PathNode[], closed: boolean): boolean {
  if (nodes.length < (closed ? 3 : 2)) return false;
  if (nodes.some((node) => node.id !== undefined && node.id.trim() === '')) return false;
  const ids = nodes.map((node) => node.id).filter((id): id is string => Boolean(id));
  if (new Set(ids).size !== ids.length) return false;
  return nodes.every((node) => (
    finite(node.point)
    && finiteOrNull(node.inHandle)
    && finiteOrNull(node.outHandle)
    && ['corner', 'cusp', 'smooth', 'symmetric', 'auto'].includes(node.kind)
  ));
}

export function getCubicSegment(nodes: readonly PathNode[], index: number, closed = false): CubicSegment | null {
  const nextIndex = index + 1 < nodes.length ? index + 1 : closed && nodes.length > 1 ? 0 : -1;
  const start = nodes[index];
  const end = nextIndex >= 0 ? nodes[nextIndex] : undefined;
  if (!start || !end) return null;
  return { start: start.point, control1: start.outHandle ?? start.point, control2: end.inHandle ?? end.point, end: end.point };
}

export function evaluateCubic(segment: CubicSegment, t: number): Vec2 {
  const u = 1 - t;
  return {
    x: u ** 3 * segment.start.x + 3 * u ** 2 * t * segment.control1.x + 3 * u * t ** 2 * segment.control2.x + t ** 3 * segment.end.x,
    y: u ** 3 * segment.start.y + 3 * u ** 2 * t * segment.control1.y + 3 * u * t ** 2 * segment.control2.y + t ** 3 * segment.end.y,
  };
}

const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export interface SplitCubic {
  readonly left: CubicSegment;
  readonly right: CubicSegment;
}

export function splitCubic(segment: CubicSegment, t = 0.5): SplitCubic {
  const q0 = lerp(segment.start, segment.control1, t);
  const q1 = lerp(segment.control1, segment.control2, t);
  const q2 = lerp(segment.control2, segment.end, t);
  const r0 = lerp(q0, q1, t);
  const r1 = lerp(q1, q2, t);
  const middle = lerp(r0, r1, t);
  return {
    left: { start: segment.start, control1: q0, control2: r0, end: middle },
    right: { start: middle, control1: r1, control2: q2, end: segment.end },
  };
}

export function reversePathNodes(nodes: readonly PathNode[]): PathNode[] {
  return [...nodes].reverse().map((node) => ({
    ...node,
    inHandle: node.outHandle,
    outHandle: node.inHandle,
  }));
}

export function applyNodeKind(node: PathNode, kind: PathNode['kind']): PathNode {
  if (kind === 'corner' || kind === 'cusp' || kind === 'auto') return { ...node, kind };

  const handle = node.outHandle ?? node.inHandle;
  if (!handle) return { ...node, kind };

  const vector = { x: handle.x - node.point.x, y: handle.y - node.point.y };
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) return { ...node, kind };

  const oppositeDirection = { x: node.point.x - vector.x, y: node.point.y - vector.y };
  if (kind === 'symmetric') {
    return node.outHandle
      ? { ...node, kind, inHandle: oppositeDirection, outHandle: handle }
      : { ...node, kind, inHandle: handle, outHandle: oppositeDirection };
  }

  // Smooth handles share a tangent but retain independent handle lengths.
  const incomingLength = node.inHandle
    ? Math.hypot(node.inHandle.x - node.point.x, node.inHandle.y - node.point.y)
    : length;
  const outgoingLength = node.outHandle
    ? Math.hypot(node.outHandle.x - node.point.x, node.outHandle.y - node.point.y)
    : length;
  const incoming = {
    x: node.point.x - (vector.x / length) * incomingLength,
    y: node.point.y - (vector.y / length) * incomingLength,
  };
  const outgoing = {
    x: node.point.x + (vector.x / length) * outgoingLength,
    y: node.point.y + (vector.y / length) * outgoingLength,
  };
  return node.outHandle
    ? { ...node, kind, inHandle: incoming, outHandle: node.outHandle }
    : { ...node, kind, inHandle: node.inHandle, outHandle: outgoing };
}

/** Move one handle while preserving node semantics for smooth/symmetric nodes. */
export function updatePathNodeHandle(node: PathNode, side: 'in' | 'out', handle: Vec2 | null): PathNode {
  if (handle !== null && !finite(handle)) return node;
  const next: PathNode = side === 'in' ? { ...node, inHandle: handle } : { ...node, outHandle: handle };
  if (node.kind !== 'symmetric' || handle === null) return next;

  const vector = { x: handle.x - node.point.x, y: handle.y - node.point.y };
  return side === 'in'
    ? { ...next, outHandle: { x: node.point.x - vector.x, y: node.point.y - vector.y } }
    : { ...next, inHandle: { x: node.point.x - vector.x, y: node.point.y - vector.y } };
}
```

## packages/core/src/model/types.ts

```typescript
import type { Vec2, Unit } from '@vectoria/shared';

// ─── ID Types ─────────────────────────────────────────────────────────────────

export type DocumentId = string;
export type ArtboardId = string;
export type LayerId = string;
export type ObjectId = string;

// ─── Units ────────────────────────────────────────────────────────────────────

export type DocumentUnit = Unit;

export type ArtboardBackground =
  | { readonly type: 'transparent' }
  | { readonly type: 'color'; readonly color: string };

// ─── Schema Version ───────────────────────────────────────────────────────────

export const CURRENT_SCHEMA_VERSION = 1 as const;

// ─── Transform ────────────────────────────────────────────────────────────────

export interface Transform2D {
  /** Position of pivot in world space. */
  readonly position: Vec2;

  /** Rotation in radians. */
  readonly rotation: number;

  /**
   * Scale factors. Negative = flip.
   * abs(scale.x) >= 1e-6, abs(scale.y) >= 1e-6
   */
  readonly scale: Vec2;

  /** Pivot point in local object space. */
  readonly pivot: Vec2;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

export interface SolidFill {
  readonly type: 'solid';
  readonly color: string;
}

export interface NoFill {
  readonly type: 'none';
}

export interface LinearGradientStop {
  readonly offset: number;
  readonly color: string;
  readonly opacity: number;
}

export interface LinearGradientFill {
  readonly type: 'linear-gradient';
  readonly start: Vec2;
  readonly end: Vec2;
  readonly stops: readonly LinearGradientStop[];
}

export type FillStyle = SolidFill | NoFill | LinearGradientFill;

export interface StrokeStyle {
  readonly color: string;
  readonly width: number;
  readonly lineCap: 'butt' | 'round' | 'square';
  readonly lineJoin: 'miter' | 'round' | 'bevel';
  readonly miterLimit: number;
  readonly dashArray: readonly number[];
  readonly opacity: number;
}

export interface ObjectStyle {
  readonly fill: FillStyle;
  readonly stroke: StrokeStyle | null;

  /** Single canonical opacity for the object: 0–1. */
  readonly opacity: number;
}

export interface CornerRadii {
  readonly topLeft: number;
  readonly topRight: number;
  readonly bottomRight: number;
  readonly bottomLeft: number;
}

// ─── Scene Objects ────────────────────────────────────────────────────────────

export interface SceneObjectBase {
  readonly id: ObjectId;
  readonly name: string;
  readonly layerId: LayerId;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly transform: Transform2D;
  readonly style: ObjectStyle;
}

export interface RectangleObject extends SceneObjectBase {
  readonly type: 'rectangle';
  readonly width: number;
  readonly height: number;
  /** Number is accepted for schema-v1 documents; new objects use four radii. */
  readonly cornerRadius: number | CornerRadii;
}

export interface EllipseObject extends SceneObjectBase {
  readonly type: 'ellipse';
  readonly width: number;
  readonly height: number;
}

export interface LineObject extends SceneObjectBase {
  readonly type: 'line';
  readonly endPoint: Vec2;
}

export interface PathNode {
  /** Stable node identity used by node editing and persisted selection. */
  readonly id?: string;
  readonly point: Vec2;
  readonly inHandle: Vec2 | null;
  readonly outHandle: Vec2 | null;
  readonly kind: 'corner' | 'cusp' | 'smooth' | 'symmetric' | 'auto';
}

export interface PathObject extends SceneObjectBase {
  readonly type: 'path';
  readonly nodes: readonly PathNode[];
  readonly closed: boolean;
}

export type SceneObject = RectangleObject | EllipseObject | LineObject | PathObject;

// Selection stays multi-object capable even while the MVP UI exposes one
// active editing context at a time.
export interface SelectionState {
  objectIds: ObjectId[];
  nodeIds: string[];
  readonly mode: 'object' | 'node';
}

// ─── Layer ────────────────────────────────────────────────────────────────────

export interface Layer {
  readonly id: LayerId;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly opacity: number;

  /** Index 0 = bottom-most within this layer. */
  readonly objectIds: readonly ObjectId[];
}

// ─── Artboard ─────────────────────────────────────────────────────────────────

export interface Artboard {
  readonly id: ArtboardId;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly background: ArtboardBackground;
  readonly visible: boolean;
  /** Preferred world-space frame. x/y remain as legacy aliases during schema v1. */
  readonly frame?: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

export interface Guide {
  readonly id: string;
  readonly axis: 'horizontal' | 'vertical';
  readonly position: number;
  readonly visible: boolean;
  readonly locked: boolean;
}

export interface GridSettings {
  readonly visible: boolean;
  readonly size: number;
  readonly subdivisions: number;
}

export type SnapSource = 'grid' | 'guide' | 'node' | 'edge' | 'center' | 'intersection' | 'pixel';

export interface SnapSettings {
  readonly enabled: boolean;
  readonly tolerancePx: number;
  readonly sources: Readonly<Record<SnapSource, boolean>>;
}

// ─── Document Model ───────────────────────────────────────────────────────────

export interface DocumentModel {
  readonly schemaVersion: number;
  readonly id: DocumentId;
  readonly name: string;
  readonly unit: DocumentUnit;

  readonly artboards: Readonly<Record<ArtboardId, Artboard>>;
  readonly artboardIds: readonly ArtboardId[];
  readonly activeArtboardId: ArtboardId;

  readonly layers: Readonly<Record<LayerId, Layer>>;
  readonly layerIds: readonly LayerId[];
  readonly activeLayerId: LayerId;

  readonly objects: Readonly<Record<ObjectId, SceneObject>>;
  readonly guides: readonly Guide[];
  readonly grid: GridSettings;
  readonly snap: SnapSettings;

  readonly createdAt: string;
  readonly updatedAt: string;
}
```

## packages/core/test/path-commands.test.ts

```typescript
import { describe, expect, it } from 'vitest';
import {
  AddPathNodeCommand,
  CommandHistory,
  RemovePathNodeCommand,
  ReversePathCommand,
  SetPathNodeKindCommand,
  SetPathNodeHandlesCommand,
  SetPathGeometryCommand,
  ConvertPathSegmentCommand,
  ConvertStrokeToPathCommand,
  JoinOpenPathsCommand,
  SplitPathCommand,
  MergePathNodesCommand,
  createDefaultDocument,
  createPathNode,
  updatePathNodeHandle,
  createTransform,
  defaultObjectStyle,
  defaultStroke,
  type DocumentModel,
  type PathObject,
} from '../src/index.js';

function documentWithPath(closed = false): DocumentModel {
  const doc = createDefaultDocument({ width: 800, height: 600 });
  const path: PathObject = {
    type: 'path', id: 'path-1', name: 'Path', layerId: doc.activeLayerId, visible: true, locked: false,
    transform: createTransform({ x: 0, y: 0 }), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke }, closed,
    nodes: [createPathNode({ x: 0, y: 0 }, { id: 'n1' }), createPathNode({ x: 200, y: 0 }, { id: 'n2' }), ...(closed ? [createPathNode({ x: 200, y: 200 }, { id: 'n3' })] : [])],
  };
  return { ...doc, objects: { [path.id]: path }, layers: { ...doc.layers, [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds: [path.id] } } };
}

describe('path edit commands', () => {
  it('adds a node by de Casteljau split and undoes it', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    doc = history.execute(new AddPathNodeCommand('path-1', 0), doc);
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes).toHaveLength(3);
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes[1]?.point).toEqual({ x: 100, y: 0 });
    doc = history.undo(doc)!;
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes).toHaveLength(2);
  });

  it('rejects removing a node when it would violate open-path minimum', () => {
    const doc = documentWithPath();
    expect(new RemovePathNodeCommand('path-1', 0).execute(doc)).toBe(doc);
  });

  it('keeps node kind and handle changes reversible', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    doc = history.execute(new SetPathNodeKindCommand('path-1', 0, 'symmetric', doc), doc);
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes[0]?.kind).toBe('symmetric');
    doc = history.undo(doc)!;
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes[0]?.kind).toBe('corner');
  });

  it('mirrors a dragged symmetric handle in local path space', () => {
    const node = createPathNode({ x: 10, y: 10 }, { kind: 'symmetric', outHandle: { x: 20, y: 15 }, inHandle: { x: 0, y: 5 } });
    expect(updatePathNodeHandle(node, 'out', { x: 25, y: 20 }).inHandle).toEqual({ x: -5, y: 0 });
  });

  it('reverses node order and swaps handles as one command', () => {
    const history = new CommandHistory();
    let doc = documentWithPath(true);
    const before = doc.objects['path-1'];
    doc = history.execute(new ReversePathCommand('path-1'), doc);
    expect(doc.objects['path-1']?.type === 'path' && doc.objects['path-1'].nodes[0]?.id).toBe('n3');
    doc = history.undo(doc)!;
    expect(doc.objects['path-1']).toEqual(before);
  });

  it('keeps symmetric handles mirrored when one handle moves', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    const path = doc.objects['path-1'] as PathObject;
    const nodes = [
      { ...path.nodes[0]!, kind: 'symmetric' as const, outHandle: { x: 40, y: 20 }, inHandle: { x: -40, y: -20 } },
      path.nodes[1]!,
    ];
    doc = history.execute(new SetPathGeometryCommand('path-1', { nodes }), doc);
    doc = history.execute(new SetPathNodeHandlesCommand('path-1', 0, { outHandle: { x: 60, y: 30 }, inHandle: { x: -60, y: -30 } }), doc);
    const updated = doc.objects['path-1'] as PathObject;
    expect(updated.nodes[0]!.inHandle).toEqual({ x: -60, y: -30 });
    doc = history.undo(doc)!;
    expect((doc.objects['path-1'] as PathObject).nodes[0]!.outHandle).toEqual({ x: 40, y: 20 });
  });

  it('converts a line segment to curve and back reversibly', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    doc = history.execute(new ConvertPathSegmentCommand('path-1', 0, 'curve'), doc);
    expect((doc.objects['path-1'] as PathObject).nodes[0]!.outHandle).not.toBeNull();
    doc = history.execute(new ConvertPathSegmentCommand('path-1', 0, 'line'), doc);
    expect((doc.objects['path-1'] as PathObject).nodes[0]!.outHandle).toBeNull();
    doc = history.undo(doc)!;
    expect((doc.objects['path-1'] as PathObject).nodes[0]!.outHandle).not.toBeNull();
  });

  it('splits an open path into two paths and joins them back', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    const split = new SplitPathCommand('path-1', 1);
    doc = history.execute(split, { ...doc, objects: { 'path-1': { ...(doc.objects['path-1'] as PathObject), nodes: [...(doc.objects['path-1'] as PathObject).nodes, createPathNode({ x: 200, y: 100 }, { id: 'n3' })] } } });
    const pathIds = doc.layers[doc.activeLayerId]!.objectIds;
    expect(pathIds).toHaveLength(2);
    const secondId = pathIds[1]!;
    doc = history.execute(new JoinOpenPathsCommand('path-1', secondId), doc);
    expect(doc.layers[doc.activeLayerId]!.objectIds).toEqual(['path-1']);
    expect((doc.objects['path-1'] as PathObject).nodes).toHaveLength(3);
  });

  it('merges adjacent nodes while preserving path minimum', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    const path = doc.objects['path-1'] as PathObject;
    const expanded = { ...path, nodes: [...path.nodes, createPathNode({ x: 200, y: 100 }, { id: 'n3' })] };
    doc = history.execute(new SetPathGeometryCommand('path-1', { nodes: expanded.nodes }), doc);
    doc = history.execute(new MergePathNodesCommand('path-1', 1, 2), doc);
    expect((doc.objects['path-1'] as PathObject).nodes).toHaveLength(2);
    doc = history.undo(doc)!;
    expect((doc.objects['path-1'] as PathObject).nodes).toHaveLength(3);
  });

  it('converts stroked open path to a filled closed outline and undoes it', () => {
    const history = new CommandHistory();
    let doc = documentWithPath();
    const before = doc.objects['path-1'];
    doc = history.execute(new ConvertStrokeToPathCommand('path-1'), doc);
    const converted = doc.objects['path-1'] as PathObject;
    expect(converted.type).toBe('path');
    expect(converted.closed).toBe(true);
    expect(converted.nodes.length).toBeGreaterThanOrEqual(3);
    expect(converted.style.stroke).toBeNull();
    expect(converted.style.fill).toEqual({ type: 'solid', color: defaultStroke.color });
    doc = history.undo(doc)!;
    expect(doc.objects['path-1']).toEqual(before);
  });

  it('rejects strokeless objects', () => {
    const doc = documentWithPath();
    const path = doc.objects['path-1'] as PathObject;
    const withoutStroke = { ...doc, objects: { ...doc.objects, [path.id]: { ...path, style: { ...path.style, stroke: null } } } };
    expect(new ConvertStrokeToPathCommand(path.id).execute(withoutStroke)).toBe(withoutStroke);
  });
});
```

## packages/editor-engine/src/index.ts

```typescript
export { Camera, MIN_ZOOM, MAX_ZOOM } from './camera.js';
export { hitTest, hitTestDetailed, hitTestCandidates, type HitTestResult, type HitTestOptions } from './hit-test.js';
export { SelectionService, selectionService, emptySelection } from './selection-service.js';
export { DragSession, type TransformSession, type TransformOperation } from './interaction/drag-session.js';
export { SelectTool, type SelectToolContext } from './tools/select-tool.js';
export { DirectSelectTool, type NodeHit } from './tools/direct-select-tool.js';
export { PenTool, type PenToolState, type PenToolPointerEvent, type PenToolResult, type PenToolPreview } from './tools/pen-tool.js';
export { SceneHitTester } from './hit-testing/scene-hit-tester.js';
export { DEFAULT_GRID_SETTINGS, gridLines, normalizeGridSettings, snapToGrid, type GridSettings } from './grid.js';
export { DEFAULT_SNAP_SETTINGS, SnapService, type Guide, type SnapCandidate, type SnapResult, type SnapSettings, type SnapSource } from './snapping.js';
```

## packages/editor-engine/src/tools/direct-select-tool.ts

```typescript
import type { DocumentModel, SelectionState } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { getObjectBounds } from '@vectoria/core';
import { getTransformMatrix } from '@vectoria/core';
import { mat3TransformPoint } from '@vectoria/shared';

export interface NodeHit {
  readonly objectId: string;
  readonly nodeIndex: number;
  readonly distancePx: number;
  readonly part?: 'node' | 'in-handle' | 'out-handle';
}

/** Node-mode selection policy for path objects. Node IDs use stable object:index keys. */
export class DirectSelectTool {
  readonly id = 'direct-select' as const;
  readonly cursor = 'default';

  /** Find nearest visible, unlocked path node within screen-space tolerance. */
  hitNode(doc: DocumentModel, worldPoint: Vec2, zoom: number, tolerancePx = 8): NodeHit | null {
    let best: NodeHit | null = null;
    for (const object of Object.values(doc.objects)) {
      if (object.type !== 'path' || !object.visible || object.locked) continue;
      const bounds = getObjectBounds(object);
      if (worldPoint.x < bounds.x - tolerancePx / zoom || worldPoint.x > bounds.x + bounds.width + tolerancePx / zoom || worldPoint.y < bounds.y - tolerancePx / zoom || worldPoint.y > bounds.y + bounds.height + tolerancePx / zoom) continue;
      const matrix = getTransformMatrix(object.transform);
      for (let nodeIndex = 0; nodeIndex < object.nodes.length; nodeIndex += 1) {
        const node = object.nodes[nodeIndex]!;
        const point = mat3TransformPoint(matrix, node.point);
        const distancePx = Math.hypot(worldPoint.x - point.x, worldPoint.y - point.y) * zoom;
        if (distancePx <= tolerancePx && (!best || distancePx < best.distancePx)) best = { objectId: object.id, nodeIndex, distancePx, part: 'node' };
      }
    }
    return best;
  }

  /** Find a node handle in screen-space. Nodes take precedence over handles. */
  hitHandle(doc: DocumentModel, worldPoint: Vec2, zoom: number, objectId?: string, tolerancePx = 8): NodeHit | null {
    let best: NodeHit | null = null;
    for (const object of Object.values(doc.objects)) {
      if (object.type !== 'path' || object.id !== (objectId ?? object.id) || !object.visible || object.locked) continue;
      const matrix = getTransformMatrix(object.transform);
      for (let nodeIndex = 0; nodeIndex < object.nodes.length; nodeIndex += 1) {
        const node = object.nodes[nodeIndex]!;
        for (const [part, handle] of [['in-handle', node.inHandle], ['out-handle', node.outHandle] ] as const) {
          if (!handle) continue;
          const point = mat3TransformPoint(matrix, handle);
          const distancePx = Math.hypot(worldPoint.x - point.x, worldPoint.y - point.y) * zoom;
          if (distancePx <= tolerancePx && (!best || distancePx < best.distancePx)) best = { objectId: object.id, nodeIndex, distancePx, part };
        }
      }
    }
    return best;
  }

  /** Produce node-mode selection after click or Shift+click. */
  select(selection: SelectionState, hit: NodeHit | null, additive = false): SelectionState {
    const nodeId = hit ? `${hit.objectId}:${hit.nodeIndex}` : null;
    const nodeIds = nodeId
      ? additive
        ? selection.nodeIds.includes(nodeId) ? selection.nodeIds.filter((id) => id !== nodeId) : [...selection.nodeIds, nodeId]
        : [nodeId]
      : [];
    return { objectIds: hit ? [hit.objectId] : selection.objectIds, nodeIds, mode: 'node' };
  }
}
```

## packages/editor-engine/src/tools/pen-tool.ts

```typescript
import type { PathNode } from '@vectoria/core';
import { createPathNode } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';

export type PenToolState = 'idle' | 'creating-path';

export interface PenToolPointerEvent {
  readonly screenPoint: Vec2;
  readonly worldPoint: Vec2;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
}

export type PenToolResult =
  | { readonly type: 'draft'; readonly nodes: readonly PathNode[] }
  | { readonly type: 'commit'; readonly nodes: readonly PathNode[]; readonly closed: boolean }
  | { readonly type: 'cancel' };

export interface PenToolPreview {
  readonly nodes: readonly PathNode[];
  readonly cursorPoint: Vec2 | null;
  readonly pendingPoint: Vec2 | null;
  readonly pendingHandle: Vec2 | null;
}

/**
 * Owns Pen Tool transitions and transient draft geometry outside React.
 * The editor consumes results only when a path becomes a document command.
 */
export class PenTool {
  readonly id = 'pen' as const;
  readonly cursor = 'crosshair';
  private state: PenToolState = 'idle';
  private nodes: PathNode[] = [];
  private cursorPoint: Vec2 | null = null;
  private pendingPoint: Vec2 | null = null;
  private pendingHandle: Vec2 | null = null;
  private pendingAlt = false;

  get currentState(): PenToolState {
    return this.state;
  }

  get preview(): PenToolPreview {
    return { nodes: this.nodes, cursorPoint: this.cursorPoint, pendingPoint: this.pendingPoint, pendingHandle: this.pendingHandle };
  }

  /** Start a node gesture or close draft when pointer targets its first node. */
  pointerDown(event: PenToolPointerEvent, closeToleranceWorld: number): PenToolResult | null {
    const anchor = this.nodes.at(-1)?.point;
    this.cursorPoint = this.constrain(event.worldPoint, event.shiftKey, anchor);
    if (this.state === 'creating-path' && this.nodes.length >= 3 && this.distance(event.worldPoint, this.nodes[0]!.point) <= closeToleranceWorld) {
      return this.commit(true);
    }
    this.state = 'creating-path';
    this.pendingPoint = this.constrain(event.worldPoint, event.shiftKey, anchor);
    this.pendingHandle = null;
    this.pendingAlt = Boolean(event.altKey);
    return null;
  }

  /** Keep rubber band and current drag handle in transient tool state. */
  pointerMove(event: PenToolPointerEvent): PenToolResult | null {
    const anchor = this.pendingPoint ?? this.nodes.at(-1)?.point;
    this.cursorPoint = this.constrain(event.worldPoint, event.shiftKey, anchor);
    if (!this.pendingPoint) return null;
    const point = this.constrain(event.worldPoint, event.shiftKey, this.pendingPoint);
    if (this.distance(point, this.pendingPoint) > 3) this.pendingHandle = point;
    return { type: 'draft', nodes: this.nodes };
  }

  /** Convert click or drag into one corner or smooth node. */
  pointerUp(event: PenToolPointerEvent): PenToolResult | null {
    if (!this.pendingPoint) return null;
    const point = this.pendingPoint;
    const handle = this.pendingHandle ? this.constrain(event.worldPoint, event.shiftKey, point) : null;
    const dragged = this.pendingHandle !== null;
    this.nodes = [...this.nodes, createPathNode(point, {
      kind: dragged && !event.altKey && !this.pendingAlt ? 'smooth' : dragged ? 'cusp' : 'corner',
      outHandle: dragged ? handle : null,
    })];
    this.pendingPoint = null;
    this.pendingHandle = null;
    this.pendingAlt = false;
    this.cursorPoint = event.worldPoint;
    return { type: 'draft', nodes: this.nodes };
  }

  keyDown(key: string): PenToolResult | null {
    if (key === 'Enter') return this.nodes.length >= 2 ? this.commit(false) : this.cancel();
    if (key === 'Escape') return this.cancel();
    if ((key === 'Backspace' || key === 'Delete') && this.pendingPoint === null && this.nodes.length > 0) {
      this.nodes = this.nodes.slice(0, -1);
      if (this.nodes.length === 0) return this.cancel();
      return { type: 'draft', nodes: this.nodes };
    }
    return null;
  }

  cancel(): PenToolResult {
    this.state = 'idle';
    this.nodes = [];
    this.pendingPoint = null;
    this.pendingHandle = null;
    this.pendingAlt = false;
    this.cursorPoint = null;
    return { type: 'cancel' };
  }

  private commit(closed: boolean): PenToolResult {
    const result: PenToolResult = { type: 'commit', nodes: this.nodes, closed };
    this.state = 'idle';
    this.nodes = [];
    this.pendingPoint = null;
    this.pendingHandle = null;
    this.cursorPoint = null;
    return result;
  }

  private distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private constrain(point: Vec2, shiftKey = false, origin?: Vec2): Vec2 {
    if (!shiftKey || !origin) return point;
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return origin;
    const angle = Math.atan2(dy, dx);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return { x: origin.x + Math.cos(snapped) * distance, y: origin.y + Math.sin(snapped) * distance };
  }
}
```

## packages/editor-engine/test/pen-tool.test.ts

```typescript
import { describe, expect, it } from 'vitest';
import { PenTool } from '../src/index.js';

const event = (x: number, y: number) => ({ screenPoint: { x, y }, worldPoint: { x, y } });

describe('PenTool state machine', () => {
  it('creates corner nodes and commits an open path with Enter', () => {
    const tool = new PenTool();
    tool.pointerDown(event(0, 0), 12);
    tool.pointerUp(event(0, 0));
    tool.pointerDown(event(100, 0), 12);
    const draft = tool.pointerUp(event(100, 0));

    expect(draft?.type).toBe('draft');
    expect(tool.currentState).toBe('creating-path');
    expect(tool.keyDown('Enter')).toMatchObject({ type: 'commit', closed: false });
    expect(tool.currentState).toBe('idle');
  });

  it('creates smooth node with an outgoing handle after drag', () => {
    const tool = new PenTool();
    tool.pointerDown(event(20, 20), 12);
    tool.pointerUp(event(20, 20));
    tool.pointerDown(event(100, 100), 12);
    tool.pointerMove(event(140, 100));
    tool.pointerUp(event(140, 100));

    const node = tool.preview.nodes[1]!;
    expect(node.kind).toBe('smooth');
    expect(node.point).toEqual({ x: 100, y: 100 });
    expect(node.outHandle).toEqual({ x: 140, y: 100 });
  });

  it('closes only when clicking the first node after three nodes', () => {
    const tool = new PenTool();
    for (const point of [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]) {
      tool.pointerDown(event(point.x, point.y), 12);
      tool.pointerUp(event(point.x, point.y));
    }

    expect(tool.pointerDown(event(0, 0), 12)).toMatchObject({ type: 'commit', closed: true });
    expect(tool.currentState).toBe('idle');
  });

  it('cancels transient draft without creating a document object', () => {
    const tool = new PenTool();
    tool.pointerDown(event(0, 0), 12);
    tool.pointerUp(event(0, 0));
    expect(tool.keyDown('Escape')).toEqual({ type: 'cancel' });
    expect(tool.preview.nodes).toHaveLength(0);
  });

  it('constrains the next point to 45-degree increments with Shift', () => {
    const tool = new PenTool();
    tool.pointerDown(event(0, 0), 12);
    tool.pointerUp(event(0, 0));
    tool.pointerDown({ ...event(100, 20), shiftKey: true }, 12);
    tool.pointerUp({ ...event(100, 20), shiftKey: true });

    expect(tool.preview.nodes[1]!.point.y).toBeCloseTo(0);
  });

  it('creates a cusp node when Alt is held during a handle drag', () => {
    const tool = new PenTool();
    tool.pointerDown(event(0, 0), 12);
    tool.pointerUp(event(0, 0));
    tool.pointerDown(event(100, 100), 12);
    tool.pointerMove({ ...event(140, 100), altKey: true });
    tool.pointerUp({ ...event(140, 100), altKey: true });

    expect(tool.preview.nodes[1]!.kind).toBe('cusp');
  });
});
```

## packages/io/src/schema/document-v1.ts

```typescript
import { z } from 'zod';
import type { DocumentModel } from '@vectoria/core';

export const Vec2Schema = z.object({
  x: z.number().refine(Number.isFinite, { message: 'x must be finite' }),
  y: z.number().refine(Number.isFinite, { message: 'y must be finite' }),
});

export const Transform2DSchema = z.object({
  position: Vec2Schema,
  rotation: z.number().refine(Number.isFinite, { message: 'rotation must be finite' }),
  scale: Vec2Schema.refine(
    (s) => Math.abs(s.x) >= 1e-6 && Math.abs(s.y) >= 1e-6,
    { message: 'scale absolute value must be >= 1e-6' }
  ),
  pivot: Vec2Schema,
});

export const SolidFillSchema = z.object({
  type: z.literal('solid'),
  color: z.string(),
});

export const NoFillSchema = z.object({
  type: z.literal('none'),
});

export const LinearGradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: z.string(),
  opacity: z.number().min(0).max(1),
});

export const LinearGradientFillSchema = z.object({
  type: z.literal('linear-gradient'),
  start: Vec2Schema,
  end: Vec2Schema,
  stops: z.array(LinearGradientStopSchema),
});

export const FillStyleSchema = z.discriminatedUnion('type', [
  SolidFillSchema,
  NoFillSchema,
  LinearGradientFillSchema,
]);

export const StrokeStyleSchema = z.object({
  color: z.string(),
  width: z.number().positive(),
  lineCap: z.enum(['butt', 'round', 'square']),
  lineJoin: z.enum(['miter', 'round', 'bevel']),
  miterLimit: z.number().min(1),
  dashArray: z.array(z.number().nonnegative()),
  opacity: z.number().min(0).max(1),
});

export const ObjectStyleSchema = z.object({
  fill: FillStyleSchema,
  stroke: StrokeStyleSchema.nullable(),
  opacity: z.number().min(0).max(1),
});

export const RectangleObjectSchema = z.object({
  type: z.literal('rectangle'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
  cornerRadius: z.union([
    z.number().nonnegative(),
    z.object({
      topLeft: z.number().nonnegative().finite(),
      topRight: z.number().nonnegative().finite(),
      bottomRight: z.number().nonnegative().finite(),
      bottomLeft: z.number().nonnegative().finite(),
    }),
  ]),
});

export const EllipseObjectSchema = z.object({
  type: z.literal('ellipse'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
});

export const LineObjectSchema = z.object({
  type: z.literal('line'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  endPoint: Vec2Schema,
});

export const PathNodeSchema = z.object({
  id: z.string().min(1).optional(),
  point: Vec2Schema,
  inHandle: Vec2Schema.nullable(),
  outHandle: Vec2Schema.nullable(),
  kind: z.enum(['corner', 'cusp', 'smooth', 'symmetric', 'auto']),
});

export const PathObjectSchema = z.object({
  type: z.literal('path'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  nodes: z.array(PathNodeSchema),
  closed: z.boolean(),
});

export const SceneObjectSchema = z.discriminatedUnion('type', [
  RectangleObjectSchema,
  EllipseObjectSchema,
  LineObjectSchema,
  PathObjectSchema,
]);

export const LayerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: z.number().min(0).max(1).default(1),
  objectIds: z.array(z.string().min(1)),
});

export const ArtboardSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  x: z.number().refine(Number.isFinite),
  y: z.number().refine(Number.isFinite),
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
  background: z.union([
    z.object({ type: z.literal('transparent') }),
    z.object({ type: z.literal('color'), color: z.string() }),
    z.string().nullable(), // legacy v1 payloads
  ]).transform((background) => {
    if (background === null || background === 'transparent') return { type: 'transparent' as const };
    if (typeof background === 'string') return { type: 'color' as const, color: background };
    return background;
  }),
  visible: z.boolean().default(true),
  frame: z.object({ x: z.number().finite(), y: z.number().finite(), width: z.number().positive().finite(), height: z.number().positive().finite() }).optional(),
});

export const DocumentV1Schema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string(),
  unit: z.enum(['px', 'mm', 'cm', 'in']),
  artboards: z.record(ArtboardSchema),
  artboardIds: z.array(z.string().min(1)),
  activeArtboardId: z.string().min(1),
  layers: z.record(LayerSchema),
  layerIds: z.array(z.string().min(1)),
  activeLayerId: z.string().min(1),
  objects: z.record(SceneObjectSchema),
  guides: z.array(z.object({ id: z.string().min(1), axis: z.enum(['horizontal', 'vertical']), position: z.number().finite(), visible: z.boolean(), locked: z.boolean() })).default([]),
  grid: z.object({ visible: z.boolean(), size: z.number().positive().finite(), subdivisions: z.number().int().min(1) }).default({ visible: true, size: 10, subdivisions: 1 }),
  snap: z.object({ enabled: z.boolean(), tolerancePx: z.number().nonnegative().finite(), sources: z.record(z.boolean()) }).default({ enabled: false, tolerancePx: 8, sources: { grid: true, guide: true, node: true, edge: true, center: true, intersection: true, pixel: false } }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DocumentV1DTO = z.infer<typeof DocumentV1Schema>;

export const PersistedDocumentSchema = z.object({
  app: z.literal('vectoria'),
  schemaVersion: z.number().int().positive(),
  document: z.unknown(),
  revision: z.number().int().nonnegative(),
  savedAt: z.string(),
});

export interface PersistedDocument {
  readonly app: 'vectoria';
  readonly schemaVersion: number;
  readonly document: DocumentModel;
  readonly revision: number;
  readonly savedAt: string;
}

const DEFAULT_SNAP_SOURCES = { grid: true, guide: true, node: true, edge: true, center: true, intersection: true, pixel: false } as const;

/**
 * Validates and parses raw stored document JSON, migrating if needed.
 */
export function parseAndMigrateDocument(raw: unknown): DocumentModel {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid document payload: expected object');
  }

  const rawRecord = raw as Record<string, unknown>;
  if (rawRecord.app === 'vectoria' && 'document' in rawRecord) {
    return parseAndMigrateDocument(rawRecord.document);
  }
  const schemaVersion = rawRecord['schemaVersion'];

  if (schemaVersion === 1) {
    const parsed = DocumentV1Schema.parse(raw);
    const artboards = Object.fromEntries(Object.entries(parsed.artboards).map(([id, artboard]) => [id, {
      ...artboard,
      frame: artboard.frame ?? { x: artboard.x, y: artboard.y, width: artboard.width, height: artboard.height },
    }]));
    const objects = Object.fromEntries(Object.entries(parsed.objects).map(([id, object]) => [id, object.type === 'path'
      ? { ...object, nodes: object.nodes.map((node, index) => ({ ...node, id: node.id ?? `${object.id}-node-${index + 1}` })) }
      : object]));
    return { ...parsed, objects, artboards, snap: { ...parsed.snap, sources: { ...DEFAULT_SNAP_SOURCES, ...parsed.snap.sources } } } as unknown as DocumentModel;
  }

  throw new Error(`Unsupported schema version: ${String(schemaVersion)}`);
}

/**
 * Serializes DocumentModel to string/JSON.
 */
export function serializeDocument(document: DocumentModel): string {
  return JSON.stringify(document);
}
```

## packages/io/src/svg/export.ts

```typescript
import type { DocumentModel, SceneObject, RectangleObject, EllipseObject, LineObject, PathObject, StrokeStyle, FillStyle, LinearGradientFill } from '@vectoria/core';
import { getTransformMatrix, normalizeCornerRadii } from '@vectoria/core';

export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportArtboardToSvg(doc: DocumentModel, artboardId?: string): string {
  const targetArtboardId = artboardId ?? doc.activeArtboardId;
  const artboard = doc.artboards[targetArtboardId];

  if (!artboard) {
    throw new Error(`Artboard with ID "${targetArtboardId}" not found`);
  }

  const { width, height } = artboard;
  const clipId = `artboard-clip-${escapeXml(targetArtboardId)}`;

  // Collect all gradient fills for <defs>
  const gradientDefs: string[] = [];
  const gradientMap = new Map<LinearGradientFill, string>();
  let gradientCounter = 0;

  const elements: string[] = [];

  // Render objects in global z-order
  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer || !layer.visible) continue;

    for (const objectId of layer.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj || !obj.visible) continue;

      // Register gradient if needed
      if (obj.style.fill.type === 'linear-gradient') {
        const fill = obj.style.fill;
        if (!gradientMap.has(fill)) {
          const gradId = `grad-${gradientCounter++}`;
          gradientMap.set(fill, gradId);
          gradientDefs.push(buildLinearGradientDef(gradId, fill));
        }
      }

      const elementSvg = renderSceneObjectToSvg(obj, gradientMap);
      if (elementSvg) {
        elements.push(elementSvg);
      }
    }
  }

  const defsContent = [
    `    <clipPath id="${clipId}">`,
    `      <rect x="0" y="0" width="${width}" height="${height}" />`,
    `    </clipPath>`,
    ...gradientDefs.map((d) => `    ${d}`),
  ].join('\n');

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
  width="${width}"
  height="${height}"
  overflow="hidden"
>
  <defs>
${defsContent}
  </defs>
  <g clip-path="url(#${clipId})" transform="translate(${-artboard.x} ${-artboard.y})">
${elements.map((el) => `    ${el}`).join('\n')}
  </g>
</svg>`;

  return svgContent;
}

/**
 * Build an SVG <linearGradient> definition element.
 * Coordinates use userSpaceOnUse (object local space via parent transform).
 */
function buildLinearGradientDef(id: string, fill: LinearGradientFill): string {
  const stops = fill.stops
    .map((s) => {
      const opacityAttr = s.opacity < 1 ? ` stop-opacity="${s.opacity}"` : '';
      return `      <stop offset="${s.offset}" stop-color="${escapeXml(s.color)}"${opacityAttr} />`;
    })
    .join('\n');

  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${fill.start.x}" y1="${fill.start.y}" x2="${fill.end.x}" y2="${fill.end.y}">\n${stops}\n    </linearGradient>`;
}

/** Resolve fill to SVG fill attribute value. */
function resolveFillAttr(fill: FillStyle, gradientMap: Map<LinearGradientFill, string>): string {
  if (fill.type === 'solid') return `fill="${escapeXml(fill.color)}"`;
  if (fill.type === 'linear-gradient') {
    const id = gradientMap.get(fill);
    return id ? `fill="url(#${id})"` : 'fill="none"';
  }
  return 'fill="none"';
}

function renderSceneObjectToSvg(
  obj: SceneObject,
  gradientMap: Map<LinearGradientFill, string>,
): string | null {
  switch (obj.type) {
    case 'rectangle':
      return renderRectangleToSvg(obj, gradientMap);
    case 'ellipse':
      return renderEllipseToSvg(obj, gradientMap);
    case 'line':
      return renderLineToSvg(obj, gradientMap);
    case 'path':
      return renderPathToSvg(obj, gradientMap);
    default:
      return null;
  }
}

function renderRectangleToSvg(obj: RectangleObject, gradientMap: Map<LinearGradientFill, string>): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;

  const fillAttr = resolveFillAttr(obj.style.fill, gradientMap);
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';
  const radii = normalizeCornerRadii(obj.cornerRadius, obj.width, obj.height);
  const radiusAttr = radii.topLeft === radii.topRight && radii.topRight === radii.bottomRight && radii.bottomRight === radii.bottomLeft && radii.topLeft > 0
    ? ` rx="${radii.topLeft}" ry="${radii.topLeft}"`
    : '';
  if (radii.topLeft !== radii.topRight || radii.topRight !== radii.bottomRight || radii.bottomRight !== radii.bottomLeft) {
    const d = roundedRectanglePath(obj.width, obj.height, radii);
    return `<path d="${d}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr} />`;
  }

  return `<rect x="0" y="0" width="${obj.width}" height="${obj.height}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr}${radiusAttr} />`;
}

function roundedRectanglePath(width: number, height: number, radii: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }): string {
  const { topLeft, topRight, bottomRight, bottomLeft } = radii;
  return `M ${topLeft} 0 H ${width - topRight} A ${topRight} ${topRight} 0 0 1 ${width} ${topRight} V ${height - bottomRight} A ${bottomRight} ${bottomRight} 0 0 1 ${width - bottomRight} ${height} H ${bottomLeft} A ${bottomLeft} ${bottomLeft} 0 0 1 0 ${height - bottomLeft} V ${topLeft} A ${topLeft} ${topLeft} 0 0 1 ${topLeft} 0 Z`;
}

function renderEllipseToSvg(obj: EllipseObject, gradientMap: Map<LinearGradientFill, string>): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;
  const rx = obj.width / 2;
  const ry = obj.height / 2;

  const fillAttr = resolveFillAttr(obj.style.fill, gradientMap);
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

  return `<ellipse cx="${rx}" cy="${ry}" rx="${rx}" ry="${ry}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr} />`;
}

function renderLineToSvg(obj: LineObject, _gradientMap: Map<LinearGradientFill, string>): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;

  const fillAttr = 'fill="none"';
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

  return `<line x1="0" y1="0" x2="${obj.endPoint.x}" y2="${obj.endPoint.y}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr} />`;
}

function renderPathToSvg(obj: PathObject, gradientMap: Map<LinearGradientFill, string>): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;

  const segments = obj.nodes.map((node, i) => {
    if (i === 0) return `M ${node.point.x} ${node.point.y}`;
    const prev = obj.nodes[i - 1]!;
    const cp1 = prev.outHandle ?? prev.point;
    const cp2 = node.inHandle ?? node.point;
    return `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${node.point.x} ${node.point.y}`;
  });
  if (obj.closed && obj.nodes.length > 1) {
    const last = obj.nodes[obj.nodes.length - 1]!;
    const first = obj.nodes[0]!;
    segments.push(`C ${last.outHandle?.x ?? last.point.x} ${last.outHandle?.y ?? last.point.y}, ${first.inHandle?.x ?? first.point.x} ${first.inHandle?.y ?? first.point.y}, ${first.point.x} ${first.point.y}`);
  }
  const d = segments.join(' ') + (obj.closed ? ' Z' : '');

  const fillAttr = obj.closed ? resolveFillAttr(obj.style.fill, gradientMap) : 'fill="none"';
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

  return `<path d="${d}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr} />`;
}

function buildStrokeAttr(stroke: StrokeStyle): string {
  let attr = ` stroke="${escapeXml(stroke.color)}" stroke-width="${stroke.width}" stroke-linecap="${stroke.lineCap}" stroke-linejoin="${stroke.lineJoin}" stroke-miterlimit="${stroke.miterLimit}"`;
  if (stroke.dashArray.length > 0) {
    attr += ` stroke-dasharray="${stroke.dashArray.join(',')}"`;
  }
  if (stroke.opacity < 1) {
    attr += ` stroke-opacity="${stroke.opacity}"`;
  }
  return attr;
}

/**
 * Initiates browser download of generated SVG content.
 */
export function downloadSvg(svgContent: string, filename = 'export.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

## packages/io/src/svg/import.ts

```typescript
import { createDefaultDocument, createTransform, defaultObjectStyle, defaultStroke, type DocumentModel, type SceneObject, type PathNode } from '@vectoria/core';
import { generateId } from '@vectoria/shared';

const number = (element: Element, name: string, fallback = 0) => {
  const value = Number(element.getAttribute(name));
  return Number.isFinite(value) ? value : fallback;
};

const fill = (element: Element) => {
  const value = element.getAttribute('fill');
  return value === 'none' ? { type: 'none' as const } : { type: 'solid' as const, color: value || '#cccccc' };
};

const stroke = (element: Element) => {
  const color = element.getAttribute('stroke');
  if (!color || color === 'none') return null;
  return { ...defaultStroke, color, width: Math.max(0.01, number(element, 'stroke-width', 1)) };
};

const styleFor = (element: Element) => ({ ...defaultObjectStyle, fill: fill(element), stroke: stroke(element), opacity: Math.max(0, Math.min(1, number(element, 'opacity', 1))) });

export function parsePathData(data: string): PathNode[] {
  const tokens = data.match(/[MLCZHVmlczhv]|[-+]?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const nodes: PathNode[] = [];
  const closes = /z\s*$/i.test(data);
  let index = 0;
  let command = '';
  let current = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  const isCommand = (token: string): boolean => /^[MLCZHVmlczhv]$/.test(token);
  const readNumber = (): number | null => {
    const token = tokens[index];
    if (!token || isCommand(token)) return null;
    index += 1;
    const value = Number(token);
    return Number.isFinite(value) ? value : null;
  };
  const point = (x: number, y: number, relative: boolean): { x: number; y: number } => relative ? { x: current.x + x, y: current.y + y } : { x, y };

  while (index < tokens.length) {
    if (isCommand(tokens[index]!)) command = tokens[index++]!;
    if (!command) { index += 1; continue; }
    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();
    if (upper === 'Z') {
      current = start;
      command = '';
      continue;
    }
    if (upper === 'M' || upper === 'L') {
      const x = readNumber();
      const y = readNumber();
      if (x === null || y === null) { command = ''; continue; }
      const next = point(x, y, relative);
      nodes.push({ point: next, inHandle: null, outHandle: null, kind: 'corner' });
      current = next;
      if (upper === 'M') { start = next; command = relative ? 'l' : 'L'; }
      continue;
    }
    if (upper === 'H' || upper === 'V') {
      const value = readNumber();
      if (value === null) { command = ''; continue; }
      current = upper === 'H'
        ? { x: relative ? current.x + value : value, y: current.y }
        : { x: current.x, y: relative ? current.y + value : value };
      nodes.push({ point: current, inHandle: null, outHandle: null, kind: 'corner' });
      continue;
    }
    if (upper === 'C') {
      const values = Array.from({ length: 6 }, readNumber);
      if (values.some((value): value is null => value === null) || nodes.length === 0) { command = ''; continue; }
      const x1 = values[0]!;
      const y1 = values[1]!;
      const x2 = values[2]!;
      const y2 = values[3]!;
      const x = values[4]!;
      const y = values[5]!;
      const control1 = point(x1, y1, relative);
      const control2 = point(x2, y2, relative);
      const next = point(x, y, relative);
      const previous = nodes[nodes.length - 1]!;
      nodes[nodes.length - 1] = { ...previous, outHandle: control1 };
      if (closes && next.x === start.x && next.y === start.y) {
        nodes[0] = { ...nodes[0]!, inHandle: control2 };
      } else {
        nodes.push({ point: next, inHandle: control2, outHandle: null, kind: 'smooth' });
      }
      current = next;
      continue;
    }
    command = '';
  }
  return nodes;
}

/** Import basic SVG geometry without coupling core to DOM or browser APIs. */
export function importSvgToDocument(svgText: string, name = 'Imported SVG'): DocumentModel {
  if (typeof DOMParser === 'undefined') throw new Error('SVG import requires DOMParser');
  const root = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
  if (!root || root.nodeName.toLowerCase() === 'parsererror') throw new Error('Invalid SVG document');
  const viewBox = (root.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number);
  const width = Number(root.getAttribute('width')) || viewBox[2] || 1920;
  const height = Number(root.getAttribute('height')) || viewBox[3] || 1080;
  const doc = createDefaultDocument({ name, width: Math.max(1, width), height: Math.max(1, height) });
  const layerId = doc.activeLayerId;
  const objects: Record<string, SceneObject> = {};
  const objectIds: string[] = [];
  const elements = Array.from(root.querySelectorAll('rect, ellipse, line, path'));
  for (const element of elements) {
    const id = generateId();
    const base = { id, name: element.getAttribute('id') || `${element.nodeName} ${objectIds.length + 1}`, layerId, visible: true, locked: false, style: styleFor(element) };
    const tag = element.nodeName.toLowerCase();
    let object: SceneObject | null = null;
    if (tag === 'rect') object = { ...base, type: 'rectangle', transform: createTransform({ x: number(element, 'x'), y: number(element, 'y') }), width: Math.max(0.01, number(element, 'width', 1)), height: Math.max(0.01, number(element, 'height', 1)), cornerRadius: Math.max(0, number(element, 'rx')) };
    if (tag === 'ellipse') object = { ...base, type: 'ellipse', transform: createTransform({ x: number(element, 'cx') - number(element, 'rx', 1), y: number(element, 'cy') - number(element, 'ry', 1) }), width: Math.max(0.01, number(element, 'rx', 1) * 2), height: Math.max(0.01, number(element, 'ry', 1) * 2) };
    if (tag === 'line') object = { ...base, type: 'line', transform: createTransform({ x: number(element, 'x1'), y: number(element, 'y1') }), endPoint: { x: number(element, 'x2') - number(element, 'x1'), y: number(element, 'y2') - number(element, 'y1') }, style: { ...styleFor(element), fill: { type: 'none' }, stroke: stroke(element) ?? defaultStroke } };
    if (tag === 'path') { const data = element.getAttribute('d') || ''; const nodes = parsePathData(data).map((node, index) => ({ ...node, id: `${id}-node-${index + 1}` })); if (nodes.length >= 2) object = { ...base, type: 'path', transform: createTransform({ x: 0, y: 0 }), nodes, closed: /z\s*$/i.test(data) }; }
    if (object) {
      objects[id] = object;
      objectIds.push(id);
    }
  }
  return { ...doc, objects, layers: { ...doc.layers, [layerId]: { ...doc.layers[layerId]!, objectIds } }, updatedAt: new Date().toISOString() };
}

export async function rasterizeSvgToPng(svg: string, width: number, height: number): Promise<Blob> {
  if (typeof Image === 'undefined' || typeof document === 'undefined') throw new Error('PNG export requires browser canvas');
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Unable to rasterize SVG')); image.src = url; });
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.ceil(width)); canvas.height = Math.max(1, Math.ceil(height));
    const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas 2D context unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}
```

## packages/io/test/io.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import {
  parseAndMigrateDocument,
  serializeDocument,
  exportArtboardToSvg,
  parsePathData,
  escapeXml,
} from '../src/index.js';
import {
  createDefaultDocument,
  createTransform,
  type RectangleObject,
  type EllipseObject,
  type LineObject,
  type PathObject,
} from '@vectoria/core';

describe('IO - DTO Validation and SVG Export', () => {
  it('parses versioned persisted envelope without changing document payload', () => {
    const doc = createDefaultDocument({ name: 'Envelope' });
    const parsed = parseAndMigrateDocument({
      app: 'vectoria', schemaVersion: 1, document: doc, revision: 7, savedAt: new Date().toISOString(),
    });
    expect(parsed).toEqual(doc);
  });

  it('serializes and parses DocumentV1DTO without loss', () => {
    const doc = createDefaultDocument({ name: 'Test Doc', width: 800, height: 600 });
    const json = serializeDocument(doc);
    const parsed = parseAndMigrateDocument(JSON.parse(json));

    expect(parsed.id).toBe(doc.id);
    expect(parsed.name).toBe('Test Doc');
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.artboardIds).toEqual(doc.artboardIds);
  });

  it('exports valid SVG with artboard viewBox, clipPath, and rectangle geometry', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const rect: RectangleObject = {
      type: 'rectangle',
      id: 'rect-1',
      name: 'Rect 1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 50, y: 100 }),
      style: {
        fill: { type: 'solid', color: '#5caeff' },
        stroke: null,
        opacity: 1,
      },
      width: 200,
      height: 150,
      cornerRadius: 0,
    };

    const docWithRect = {
      ...doc,
      objects: { [rect.id]: rect },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [rect.id],
        },
      },
    };

    const svg = exportArtboardToSvg(docWithRect);

    expect(svg).toContain('viewBox="0 0 1000 800"');
    expect(svg).toContain('clipPath');
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#5caeff"');
    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="150"');
  });

  it('escapes XML entities in SVG output', () => {
    expect(escapeXml('<foo & "bar">')).toBe('&lt;foo &amp; &quot;bar&quot;&gt;');
  });

  it("exports objects relative to a displaced artboard", () => {
    const doc = createDefaultDocument({
      width: 800,
      height: 600,
    });
    const artboard = doc.artboards[doc.activeArtboardId]!;
    const shiftedDoc = {
      ...doc,
      artboards: {
        ...doc.artboards,
        [artboard.id]: {
          ...artboard,
          x: 500,
          y: 300,
        },
      },
    };
    const rect: RectangleObject = {
      type: "rectangle",
      id: "rect-in-shifted-artboard",
      name: "Rect",
      layerId: shiftedDoc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 550, y: 350 }),
      style: {
        fill: { type: 'solid', color: '#5caeff' },
        stroke: null,
        opacity: 1,
      },
      width: 100,
      height: 50,
      cornerRadius: 0,
    };
    const docWithRect = {
      ...shiftedDoc,
      objects: { [rect.id]: rect },
      layers: {
        ...shiftedDoc.layers,
        [shiftedDoc.activeLayerId]: {
          ...shiftedDoc.layers[shiftedDoc.activeLayerId]!,
          objectIds: [rect.id],
        },
      },
    };
    const svg = exportArtboardToSvg(docWithRect);
    expect(svg).toContain('transform="translate(-500 -300)"');
    expect(svg).toContain('viewBox="0 0 800 600"');
  });

  it('exports ellipse to SVG', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const ellipse: EllipseObject = {
      type: 'ellipse',
      id: 'ell-1',
      name: 'Ellipse 1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 200, y: 150 }),
      style: {
        fill: { type: 'solid', color: '#5caeff' },
        stroke: null,
        opacity: 1,
      },
      width: 200,
      height: 160,
    };

    const docWithEllipse = {
      ...doc,
      objects: { [ellipse.id]: ellipse },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [ellipse.id],
        },
      },
    };

    const svg = exportArtboardToSvg(docWithEllipse);
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('cx="100"');
    expect(svg).toContain('cy="80"');
    expect(svg).toContain('rx="100"');
    expect(svg).toContain('ry="80"');
    expect(svg).toContain('fill="#5caeff"');
  });

  it('exports independent rectangle corner radii as a path', () => {
    const doc = createDefaultDocument({ width: 400, height: 300 });
    const rect: RectangleObject = {
      type: 'rectangle', id: 'rounded-rect', name: 'Rounded', layerId: doc.activeLayerId,
      visible: true, locked: false, transform: createTransform({ x: 20, y: 20 }),
      style: { fill: { type: 'solid', color: '#5caeff' }, stroke: null, opacity: 1 },
      width: 120, height: 80, cornerRadius: { topLeft: 20, topRight: 10, bottomRight: 8, bottomLeft: 4 },
    };
    const withRect = { ...doc, objects: { [rect.id]: rect }, layers: { ...doc.layers, [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds: [rect.id] } } };
    const svg = exportArtboardToSvg(withRect);
    expect(svg).toContain('<path d="M 20 0 H 110 A 10 10');
    expect(svg).toContain('fill="#5caeff"');
  });

  it('exports line to SVG', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const line: LineObject = {
      type: 'line',
      id: 'line-1',
      name: 'Line 1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 100, y: 100 }),
      style: {
        fill: { type: 'none' },
        stroke: { color: '#ff0000', width: 2, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
        opacity: 1,
      },
      endPoint: { x: 300, y: 200 },
    };

    const docWithLine = {
      ...doc,
      objects: { [line.id]: line },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [line.id],
        },
      },
    };

    const svg = exportArtboardToSvg(docWithLine);
    expect(svg).toContain('<line');
    expect(svg).toContain('x1="0"');
    expect(svg).toContain('y1="0"');
    expect(svg).toContain('x2="300"');
    expect(svg).toContain('y2="200"');
    expect(svg).toContain('stroke="#ff0000"');
  });

  it('exports path with cubic Bézier to SVG', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const path: PathObject = {
      type: 'path',
      id: 'path-1',
      name: 'Path 1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 100, y: 100 }),
      style: {
        fill: { type: 'solid', color: '#00ff00' },
        stroke: { color: '#000000', width: 1, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
        opacity: 1,
      },
      nodes: [
        { point: { x: 0, y: 0 }, inHandle: null, outHandle: { x: 50, y: 0 }, kind: 'smooth' },
        { point: { x: 100, y: 100 }, inHandle: { x: 50, y: 100 }, outHandle: null, kind: 'smooth' },
        { point: { x: 200, y: 0 }, inHandle: { x: 150, y: 0 }, outHandle: null, kind: 'smooth' },
      ],
      closed: true,
    };

    const docWithPath = {
      ...doc,
      objects: { [path.id]: path },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [path.id],
        },
      },
    };

    const svg = exportArtboardToSvg(docWithPath);
    expect(svg).toContain('<path');
    expect(svg).toContain('d="M 0 0 C 50 0, 50 100, 100 100 C 100 100, 150 0, 200 0 C 200 0, 0 0, 0 0 Z"');
    expect(svg).toContain('fill="#00ff00"');

    const importedNodes = parsePathData('M 0 0 C 50 0, 50 100, 100 100 C 100 100, 150 0, 200 0 C 200 0, 0 0, 0 0 Z');
    expect(importedNodes).toHaveLength(3);
    expect(importedNodes[0]?.outHandle).toEqual({ x: 50, y: 0 });
    expect(importedNodes[0]?.inHandle).toEqual({ x: 0, y: 0 });
  });
});

describe('SVG Export — Gradient', () => {
  it('exports linear-gradient fill as <linearGradient> definition', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const rect = {
      type: 'rectangle' as const,
      id: 'rect-grad-1',
      name: 'Rect Gradient',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 50, y: 50 }),
      style: {
        fill: {
          type: 'linear-gradient' as const,
          start: { x: 0, y: 0 },
          end: { x: 200, y: 100 },
          stops: [
            { offset: 0, color: '#ff0000', opacity: 1 },
            { offset: 1, color: '#0000ff', opacity: 0.5 },
          ],
        },
        stroke: null,
        opacity: 1,
      },
      width: 200,
      height: 100,
      cornerRadius: 0,
    };

    const docWithRect = {
      ...doc,
      objects: { [rect.id]: rect },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [rect.id],
        },
      },
    };

    const svg = exportArtboardToSvg(docWithRect);
    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('stop-color="#ff0000"');
    expect(svg).toContain('stop-color="#0000ff"');
    expect(svg).toContain('stop-opacity="0.5"');
    expect(svg).toContain('fill="url(#grad-');
  });
});
```

## packages/renderer/src/index.ts

```typescript
import type { Camera } from '@vectoria/editor-engine';
import type { Vec2 } from '@vectoria/shared';
import type { DocumentModel, Artboard, RectangleObject, EllipseObject, LineObject, PathObject, ObjectId, Transform2D, LinearGradientFill } from '@vectoria/core';
import { getTransformMatrix, getObjectBounds, rectsIntersect, normalizeCornerRadii } from '@vectoria/core';
import { mat3TransformPoint } from '@vectoria/shared';
export interface GridSettings { visible: boolean; size: number; subdivisions: number }

// ─── Theme color cache (avoids per-frame getComputedStyle calls) ─────────────

const themeColorCache = new Map<string, string>();
let themeCacheGeneration = -1;

function themeColor(varName: string, fallback: string): string {
  // Invalidate cache when the stylesheet generation changes (theme switch).
  const root = document.documentElement;
  const generation = (root as unknown as { __themeGen?: number }).__themeGen ?? 0;
  if (generation !== themeCacheGeneration) {
    themeColorCache.clear();
    themeCacheGeneration = generation;
  }
  let value = themeColorCache.get(varName);
  if (value === undefined) {
    value = getComputedStyle(root).getPropertyValue(varName).trim() || fallback;
    themeColorCache.set(varName, value);
  }
  return value;
}

interface Line { start: Vec2; end: Vec2 }
function getGridLines(rect: { x: number; y: number; width: number; height: number }, settings: GridSettings): { major: Line[]; minor: Line[] } {
  const size = Number.isFinite(settings.size) && settings.size > 0 ? settings.size : 10;
  const subdivisions = Number.isInteger(settings.subdivisions) && settings.subdivisions >= 1 ? settings.subdivisions : 1;
  const spacing = size / subdivisions;
  const major: Line[] = [];
  const minor: Line[] = [];
  for (let x = Math.floor(rect.x / spacing) * spacing; x <= rect.x + rect.width; x += spacing) (Math.abs(x / size - Math.round(x / size)) < 1e-8 ? major : minor).push({ start: { x, y: rect.y }, end: { x, y: rect.y + rect.height } });
  for (let y = Math.floor(rect.y / spacing) * spacing; y <= rect.y + rect.height; y += spacing) (Math.abs(y / size - Math.round(y / size)) < 1e-8 ? major : minor).push({ start: { x: rect.x, y }, end: { x: rect.x + rect.width, y } });
  return { major, minor };
}

// ─── Render Loop ──────────────────────────────────────────────────────────────

export class RenderLoop {
  private rafId: number | null = null;
  private started = false;

  constructor(private readonly renderFn: () => void) {}

  /** Mark the scene as needing a re-render. */
  invalidate(): void {
    if (!this.started || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.renderFn();
    });
  }

  /** Start the render loop. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.invalidate();
  }

  /** Stop the render loop. */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.started = false;
  }
}

// ─── Canvas Setup ─────────────────────────────────────────────────────────────

export interface CanvasLayers {
  background: HTMLCanvasElement;
  scene: HTMLCanvasElement;
  overlay: HTMLCanvasElement;
}

/**
 * Resize a canvas element to match its CSS size at the device pixel ratio.
 * Returns true if the size actually changed.
 */
export function resizeCanvas(canvas: HTMLCanvasElement): boolean {
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = Math.floor(canvas.clientWidth * dpr);
  const displayHeight = Math.floor(canvas.clientHeight * dpr);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    return true;
  }
  return false;
}

// ─── Background Renderer ──────────────────────────────────────────────────────

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  artboard: Artboard,
  canvasWidth: number,
  canvasHeight: number,
  options?: { showGrid?: boolean; grid?: GridSettings },
): void {
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Workspace background
  ctx.fillStyle = themeColor('--color-workspace', '#20201e');
  ctx.fillRect(0, 0, canvasWidth / dpr, canvasHeight / dpr);

  // Presentation-only workspace grid. It is drawn before the artboard and is
  // never part of the document scene or SVG export.
  if (options?.showGrid !== false) {
    const gridColor = themeColor('--color-workspace-grid', 'rgba(255, 255, 255, 0.035)');
    const visible = camera.getVisibleWorldRect({ x: canvasWidth / dpr, y: canvasHeight / dpr });
    const lines = getGridLines(visible, options?.grid ?? { visible: true, size: 10, subdivisions: 1 });
    const drawLines = (groups: Line[], alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const line of groups) {
        const start = camera.worldToScreen(line.start);
        const end = camera.worldToScreen(line.end);
        ctx.moveTo(Math.round(start.x) + 0.5, Math.round(start.y) + 0.5);
        ctx.lineTo(Math.round(end.x) + 0.5, Math.round(end.y) + 0.5);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    if (options?.grid?.visible !== false) {
      drawLines(lines.minor, 0.12);
      drawLines(lines.major, 0.24);
    }
  }

  // Artboard shadow
  const screenPos = camera.worldToScreen({ x: artboard.x, y: artboard.y });
  const screenW = artboard.width * camera.zoom;
  const screenH = artboard.height * camera.zoom;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.32)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  // Artboard fill
  const background = artboard.background;
  if (background.type === 'transparent') {
    const checker = 12;
    const left = Math.max(0, screenPos.x);
    const top = Math.max(0, screenPos.y);
    const right = Math.min(canvasWidth / dpr, screenPos.x + screenW);
    const bottom = Math.min(canvasHeight / dpr, screenPos.y + screenH);
    const checkerLight = themeColor('--color-artboard', '#ffffff');
    const checkerDark = themeColor('--color-workspace-deep', '#d8d8d2');
    if (right > left && bottom > top) {
      ctx.fillStyle = checkerLight;
      ctx.fillRect(left, top, right - left, bottom - top);
    }
    ctx.fillStyle = checkerDark;
    const startX = Math.floor((left - screenPos.x) / checker) * checker;
    const startY = Math.floor((top - screenPos.y) / checker) * checker;
    for (let y = startY; screenPos.y + y < bottom; y += checker) for (let x = startX; screenPos.x + x < right; x += checker) {
      if ((Math.floor(x / checker) + Math.floor(y / checker)) % 2 === 0) ctx.fillRect(Math.max(left, screenPos.x + x), Math.max(top, screenPos.y + y), Math.min(checker, right - screenPos.x - x), Math.min(checker, bottom - screenPos.y - y));
    }
  } else {
    ctx.fillStyle = background.color;
    ctx.fillRect(screenPos.x, screenPos.y, screenW, screenH);
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Artboard border
  ctx.strokeStyle = themeColor('--color-border-subtle', '#33332f');
  ctx.lineWidth = 1;
  ctx.strokeRect(screenPos.x, screenPos.y, screenW, screenH);

  ctx.restore();
}

// ─── Scene Renderer ───────────────────────────────────────────────────────────

export function renderScene(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  doc: DocumentModel,
  canvasWidth: number,
  canvasHeight: number,
  options?: {
    previewTransforms?: Record<string, import('@vectoria/core').Transform2D>;
    showGrid?: boolean;
  }
): void {
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasWidth / dpr, canvasHeight / dpr);

  // Apply camera transform
  ctx.translate(camera.pan.x, camera.pan.y);
  ctx.scale(camera.zoom, camera.zoom);

  // Clip to active artboard
  const artboard = doc.artboards[doc.activeArtboardId];
  if (artboard && artboard.visible !== false) {
    ctx.beginPath();
    ctx.rect(artboard.x, artboard.y, artboard.width, artboard.height);
    ctx.clip();
  }

  const visibleWorldRect = camera.getVisibleWorldRect({
    x: canvasWidth / dpr,
    y: canvasHeight / dpr,
  });

  // Render objects in z-order
  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer?.visible || layer.opacity === 0) continue;

    for (const objectId of layer.objectIds) {
      let obj = doc.objects[objectId];
      if (!obj?.visible) continue;

      if (options?.previewTransforms?.[objectId]) {
        obj = { ...obj, transform: options.previewTransforms[objectId]! };
      }
      if (layer.opacity !== 1) {
        obj = { ...obj, style: { ...obj.style, opacity: obj.style.opacity * layer.opacity } };
      }

      if (!rectsIntersect(getObjectBounds(obj), visibleWorldRect)) continue;

      switch (obj.type) {
        case 'rectangle':
          renderRectangle(ctx, obj as RectangleObject);
          break;
        case 'ellipse':
          renderEllipse(ctx, obj as EllipseObject);
          break;
        case 'line':
          renderLine(ctx, obj as LineObject);
          break;
        case 'path':
          renderPath(ctx, obj as PathObject);
          break;
      }
    }
  }

  ctx.restore();
}


/**
 * Build a Canvas CanvasGradient from a LinearGradientFill.
 * Coordinates are in the object's local space (before transform).
 */
function buildLinearGradient(
  ctx: CanvasRenderingContext2D,
  fill: LinearGradientFill,
): CanvasGradient {
  const grad = ctx.createLinearGradient(fill.start.x, fill.start.y, fill.end.x, fill.end.y);
  for (const stop of fill.stops) {
    // Parse hex color and apply stop opacity via rgba
    const r = parseInt(stop.color.slice(1, 3), 16);
    const g = parseInt(stop.color.slice(3, 5), 16);
    const b = parseInt(stop.color.slice(5, 7), 16);
    grad.addColorStop(stop.offset, `rgba(${r}, ${g}, ${b}, ${stop.opacity})`);
  }
  return grad;
}

/** Resolve fill style to a Canvas fill style (color string or gradient). */
function resolveFill(
  ctx: CanvasRenderingContext2D,
  fill: import('@vectoria/core').FillStyle,
): string | CanvasGradient {
  if (fill.type === 'solid') return fill.color;
  if (fill.type === 'linear-gradient') return buildLinearGradient(ctx, fill);
  return 'transparent'; // 'none'
}

function renderRectangle(
  ctx: CanvasRenderingContext2D,
  obj: RectangleObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;
  const radii = normalizeCornerRadii(obj.cornerRadius, obj.width, obj.height);
  const hasRoundedCorners = radii.topLeft > 0 || radii.topRight > 0 || radii.bottomRight > 0 || radii.bottomLeft > 0;

  // Fill
  if (obj.style.fill.type !== 'none') {
    ctx.fillStyle = resolveFill(ctx, obj.style.fill);
    if (hasRoundedCorners) {
      roundRect(ctx, 0, 0, obj.width, obj.height, radii);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, obj.width, obj.height);
    }
  }

  // Stroke
  if (obj.style.stroke) {
    ctx.strokeStyle = obj.style.stroke.color;
    ctx.lineWidth = obj.style.stroke.width;
    ctx.lineCap = obj.style.stroke.lineCap;
    ctx.lineJoin = obj.style.stroke.lineJoin;
    ctx.miterLimit = obj.style.stroke.miterLimit;
    if (obj.style.stroke.dashArray.length > 0) {
      ctx.setLineDash([...obj.style.stroke.dashArray]);
    }
    ctx.globalAlpha = obj.style.opacity * obj.style.stroke.opacity;

    if (hasRoundedCorners) {
      roundRect(ctx, 0, 0, obj.width, obj.height, radii);
      ctx.stroke();
    } else {
      ctx.strokeRect(0, 0, obj.width, obj.height);
    }
  }

  ctx.restore();
}

function renderEllipse(
  ctx: CanvasRenderingContext2D,
  obj: EllipseObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;

  const rx = obj.width / 2;
  const ry = obj.height / 2;

  // Fill
  if (obj.style.fill.type !== 'none') {
    ctx.fillStyle = resolveFill(ctx, obj.style.fill);
    ctx.beginPath();
    ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stroke
  if (obj.style.stroke) {
    ctx.strokeStyle = obj.style.stroke.color;
    ctx.lineWidth = obj.style.stroke.width;
    ctx.lineCap = obj.style.stroke.lineCap;
    ctx.lineJoin = obj.style.stroke.lineJoin;
    ctx.miterLimit = obj.style.stroke.miterLimit;
    if (obj.style.stroke.dashArray.length > 0) {
      ctx.setLineDash([...obj.style.stroke.dashArray]);
    }
    ctx.globalAlpha = obj.style.opacity * obj.style.stroke.opacity;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function renderLine(
  ctx: CanvasRenderingContext2D,
  obj: LineObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  if (obj.style.stroke) {
    ctx.strokeStyle = obj.style.stroke.color;
    ctx.lineWidth = obj.style.stroke.width;
    ctx.lineCap = obj.style.stroke.lineCap;
    ctx.lineJoin = obj.style.stroke.lineJoin;
    ctx.miterLimit = obj.style.stroke.miterLimit;
    if (obj.style.stroke.dashArray.length > 0) {
      ctx.setLineDash([...obj.style.stroke.dashArray]);
    }
    ctx.globalAlpha = obj.style.opacity * obj.style.stroke.opacity;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(obj.endPoint.x, obj.endPoint.y);
    ctx.stroke();
  }

  ctx.restore();
}

function renderPath(
  ctx: CanvasRenderingContext2D,
  obj: PathObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;

  ctx.beginPath();
  obj.nodes.forEach((node, i) => {
    if (i === 0) {
      ctx.moveTo(node.point.x, node.point.y);
      return;
    }
    const prev = obj.nodes[i - 1]!;
    const cp1 = prev.outHandle ?? prev.point;
    const cp2 = node.inHandle ?? node.point;
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, node.point.x, node.point.y);
  });
  if (obj.closed && obj.nodes.length > 1) {
    const last = obj.nodes[obj.nodes.length - 1]!;
    const first = obj.nodes[0]!;
    ctx.bezierCurveTo(
      last.outHandle?.x ?? last.point.x,
      last.outHandle?.y ?? last.point.y,
      first.inHandle?.x ?? first.point.x,
      first.inHandle?.y ?? first.point.y,
      first.point.x,
      first.point.y,
    );
    ctx.closePath();
  }

  if (obj.style.fill.type !== 'none' && obj.closed) {
    ctx.fillStyle = resolveFill(ctx, obj.style.fill);
    ctx.fill();
  }
  if (obj.style.stroke) {
    ctx.strokeStyle = obj.style.stroke.color;
    ctx.lineWidth = obj.style.stroke.width;
    ctx.lineCap = obj.style.stroke.lineCap;
    ctx.lineJoin = obj.style.stroke.lineJoin;
    ctx.miterLimit = obj.style.stroke.miterLimit;
    if (obj.style.stroke.dashArray.length > 0) {
      ctx.setLineDash([...obj.style.stroke.dashArray]);
    }
    ctx.globalAlpha = obj.style.opacity * obj.style.stroke.opacity;
    ctx.stroke();
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  radii: ReturnType<typeof normalizeCornerRadii>,
): void {
  const { topLeft, topRight, bottomRight, bottomLeft } = radii;
  ctx.beginPath();
  ctx.moveTo(x + topLeft, y);
  ctx.lineTo(x + w - topRight, y);
  ctx.arcTo(x + w, y, x + w, y + topRight, topRight);
  ctx.lineTo(x + w, y + h - bottomRight);
  ctx.arcTo(x + w, y + h, x + w - bottomRight, y + h, bottomRight);
  ctx.lineTo(x + bottomLeft, y + h);
  ctx.arcTo(x, y + h, x, y + h - bottomLeft, bottomLeft);
  ctx.lineTo(x, y + topLeft);
  ctx.arcTo(x, y, x + topLeft, y, topLeft);
  ctx.closePath();
}

// ─── Overlay Renderer ─────────────────────────────────────────────────────────

export function renderOverlay(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  doc: DocumentModel,
  selectedIds: ReadonlySet<string>,
  canvasWidth: number,
  canvasHeight: number,
  options?: {
    previewTransforms?: ReadonlyMap<ObjectId, Transform2D>;
    pathPreviews?: ReadonlyMap<ObjectId, PathObject['nodes']>;
    nodeSelectionIds?: readonly string[];
    marquee?: { start: Vec2; end: Vec2 };
  },
): void {
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasWidth / dpr, canvasHeight / dpr);

  if (options?.marquee) {
    const start = camera.worldToScreen(options.marquee.start);
    const end = camera.worldToScreen(options.marquee.end);
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    ctx.fillStyle = themeColor('--color-selection-fill', 'rgba(92, 174, 255, 0.13)');
    ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.fillRect(x, y, Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    ctx.strokeRect(x + 0.5, y + 0.5, Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    ctx.setLineDash([]);
  }

  if (selectedIds.size === 0) {
    ctx.restore();
    return;
  }

  if (selectedIds.size > 1) {
    const bounds = [...selectedIds].map((id) => doc.objects[id]).filter(Boolean).map((object) => getObjectBounds(object!));
    if (bounds.length > 0) {
      const minX = Math.min(...bounds.map((bound) => bound.x));
      const minY = Math.min(...bounds.map((bound) => bound.y));
      const maxX = Math.max(...bounds.map((bound) => bound.x + bound.width));
      const maxY = Math.max(...bounds.map((bound) => bound.y + bound.height));
      const topLeft = camera.worldToScreen({ x: minX, y: minY });
      const bottomRight = camera.worldToScreen({ x: maxX, y: maxY });
      ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
      ctx.fillStyle = themeColor('--color-selection-fill', 'rgba(92, 174, 255, 0.13)');
      ctx.lineWidth = 1.5;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.strokeRect(topLeft.x + 0.5, topLeft.y + 0.5, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      drawScreenHandles(ctx, camera, [topLeft, { x: bottomRight.x, y: topLeft.y }, bottomRight, { x: topLeft.x, y: bottomRight.y }]);
    }
  }

  if (options?.nodeSelectionIds && options.nodeSelectionIds.length > 0) {
    renderNodeSelection(ctx, camera, doc, options.nodeSelectionIds);
  }

  // Render selection outline for each selected object
  for (const objectId of selectedIds) {
    let obj = doc.objects[objectId];
    if (!obj?.visible) continue;

    // Apply preview transform if available
    if (options?.previewTransforms?.has(objectId)) {
      const previewTransform = options.previewTransforms.get(objectId)!;
      obj = { ...obj, transform: previewTransform };
    }

    switch (obj.type) {
      case 'rectangle':
        renderRectangleSelectionOutline(ctx, camera, obj as RectangleObject);
        break;
      case 'ellipse':
        renderEllipseSelectionOutline(ctx, camera, obj as EllipseObject);
        break;
      case 'line':
        renderLineSelectionOutline(ctx, camera, obj as LineObject);
        break;
      case 'path':
        renderPathSelectionOutline(ctx, camera, options?.pathPreviews?.get(objectId) ? { ...obj, nodes: options.pathPreviews.get(objectId)! } : obj as PathObject);
        break;
    }
  }

  ctx.restore();
}

function renderRectangleSelectionOutline(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  obj: RectangleObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();

  // Apply camera + object transform
  ctx.translate(camera.pan.x, camera.pan.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  // Selection outline in screen space
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1.5 / camera.zoom; // constant screen-space width
  ctx.setLineDash([]);

  ctx.strokeRect(0, 0, obj.width, obj.height);

  // Selection fill
  ctx.fillStyle = themeColor('--color-selection-fill', 'rgba(92, 174, 255, 0.13)');
  ctx.fillRect(0, 0, obj.width, obj.height);
  drawResizeHandles(ctx, camera, [{ x: 0, y: 0 }, { x: obj.width, y: 0 }, { x: obj.width, y: obj.height }, { x: 0, y: obj.height }]);
  drawRotationHandle(ctx, camera, obj.width / 2, 0);

  ctx.restore();
}

function renderEllipseSelectionOutline(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  obj: EllipseObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();

  ctx.translate(camera.pan.x, camera.pan.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  const rx = obj.width / 2;
  const ry = obj.height / 2;

  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1.5 / camera.zoom;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  drawResizeHandles(ctx, camera, [{ x: 0, y: 0 }, { x: obj.width, y: 0 }, { x: obj.width, y: obj.height }, { x: 0, y: obj.height }]);
  drawRotationHandle(ctx, camera, obj.width / 2, 0);

  ctx.restore();
}

function renderLineSelectionOutline(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  obj: LineObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();

  ctx.translate(camera.pan.x, camera.pan.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1.5 / camera.zoom;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(obj.endPoint.x, obj.endPoint.y);
  ctx.stroke();

  ctx.restore();
}

function renderPathSelectionOutline(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  obj: PathObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();

  ctx.translate(camera.pan.x, camera.pan.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1.5 / camera.zoom;
  ctx.setLineDash([]);

  ctx.beginPath();
  obj.nodes.forEach((node, i) => {
    if (i === 0) {
      ctx.moveTo(node.point.x, node.point.y);
      return;
    }
    const prev = obj.nodes[i - 1]!;
    const cp1 = prev.outHandle ?? prev.point;
    const cp2 = node.inHandle ?? node.point;
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, node.point.x, node.point.y);
  });
  if (obj.closed && obj.nodes.length > 1) {
    const last = obj.nodes[obj.nodes.length - 1]!;
    const first = obj.nodes[0]!;
    ctx.bezierCurveTo(
      last.outHandle?.x ?? last.point.x,
      last.outHandle?.y ?? last.point.y,
      first.inHandle?.x ?? first.point.x,
      first.inHandle?.y ?? first.point.y,
      first.point.x,
      first.point.y,
    );
    ctx.closePath();
  }
  ctx.stroke();

  for (const node of obj.nodes) {
    const point = camera.worldToScreen(mat3TransformPoint(matrix, node.point));
    const size = 7;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = themeColor('--color-node', '#ffffff');
    ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
    ctx.lineWidth = 1;
    ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
    ctx.restore();
  }

  // Handles stay in screen space so their 6 px endpoints remain usable at any zoom.
  const handleColor = themeColor('--color-selection', '#5caeff');
  for (const node of obj.nodes) {
    const point = camera.worldToScreen(mat3TransformPoint(matrix, node.point));
    for (const handle of [node.inHandle, node.outHandle].filter((value): value is Vec2 => Boolean(value))) {
      const endpoint = camera.worldToScreen(mat3TransformPoint(matrix, handle));
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.strokeStyle = handleColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(endpoint.x, endpoint.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = themeColor('--color-node', '#ffffff');
      ctx.beginPath();
      ctx.arc(endpoint.x, endpoint.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawResizeHandles(ctx: CanvasRenderingContext2D, camera: Camera, points: readonly { x: number; y: number }[]): void {
  const size = 8 / camera.zoom;
  ctx.fillStyle = themeColor('--color-node', '#ffffff');
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1 / camera.zoom;
  for (const point of points) {
    ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
  }
}

function drawRotationHandle(ctx: CanvasRenderingContext2D, camera: Camera, x: number, y: number): void {
  const offset = 20 / camera.zoom;
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.fillStyle = themeColor('--color-node', '#ffffff');
  ctx.lineWidth = 1 / camera.zoom;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - offset);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - offset, 4 / camera.zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawScreenHandles(ctx: CanvasRenderingContext2D, camera: Camera, points: readonly Vec2[]): void {
  const size = 8;
  ctx.fillStyle = themeColor('--color-node', '#ffffff');
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1;
  for (const point of points) {
    ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
  }
  void camera;
}

function renderNodeSelection(ctx: CanvasRenderingContext2D, camera: Camera, doc: DocumentModel, nodeIds: readonly string[]): void {
  const selected = new Set(nodeIds);
  for (const object of Object.values(doc.objects)) {
    if (object.type !== 'path' || !object.visible) continue;
    const matrix = getTransformMatrix(object.transform);
    for (let index = 0; index < object.nodes.length; index += 1) {
      const node = object.nodes[index]!;
      const point = camera.worldToScreen(mat3TransformPoint(matrix, node.point));
      const selectedNode = selected.has(`${object.id}:${index}`);
      ctx.fillStyle = selectedNode
        ? themeColor('--color-node-selected', '#5caeff')
        : themeColor('--color-node', '#ffffff');
      ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
      ctx.lineWidth = 1;
      ctx.fillRect(point.x - 3.5, point.y - 3.5, 7, 7);
      ctx.strokeRect(point.x - 3.5, point.y - 3.5, 7, 7);
       if (selectedNode) {
         const handles = [node.inHandle, node.outHandle].filter((handle): handle is Vec2 => Boolean(handle));
         for (const handle of handles) {
           const endpoint = camera.worldToScreen(mat3TransformPoint(matrix, handle));
           ctx.globalAlpha = 0.7;
           ctx.beginPath(); ctx.moveTo(point.x, point.y); ctx.lineTo(endpoint.x, endpoint.y); ctx.stroke();
           ctx.globalAlpha = 1;
           ctx.fillStyle = themeColor('--color-node', '#ffffff');
           ctx.beginPath(); ctx.arc(endpoint.x, endpoint.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
         }
       }
    }
  }
}
```
