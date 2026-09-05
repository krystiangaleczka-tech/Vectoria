import React from 'react';
import { AppMenuBar } from './AppMenuBar.js';
import { DocumentTabs } from './DocumentTabs.js';
import type { DockPanel } from '../panels/RightDock.js';
import type { ObjectId } from '@vectoria/core';

import type { UiScale } from '../../hooks/useUiPreferences.js';

export interface TopBarProps {
  documentName: string;
  saveStatus: 'idle' | 'dirty' | 'saving' | 'saved-locally' | 'error' | 'offline';
  canUndo: boolean;
  canRedo: boolean;
  zoomPercent: number;
  onUndo: () => void;
  onRedo: () => void;
  onFitArtboard: () => void;
  onFitDrawing: () => void;
  onFitSelection: () => void;
  onZoom100: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportVct: () => void;
  onExportAi?: () => void;
  onExportCdr?: () => void;
  onImportSvg: () => void;
  rightDockOpen: boolean;
  onToggleRightDock: () => void;
  onNewDocument: () => void;
  showGrid: boolean;
  snapToGrid: boolean;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onRetrySave: () => void;
  onShowPanel: (panel: DockPanel) => void;
  selectedObjectIds: readonly ObjectId[];
  onConvertToCurves: (objectIds: readonly ObjectId[]) => void;
  onOpenCleanup: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onRepeatTransform: () => void;
  onOpenFindReplace?: () => void;
  onOpenUsedFonts?: () => void;
  onOpenSpecialCharacters?: () => void;
  onOpenWebFontImport?: () => void;
  outlineMode?: boolean;
  onToggleOutlineMode?: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onPasteInPlace?: () => void;
  onPasteAllArtboards?: () => void;
  onDuplicate: () => void;
  onSetZoom?: (factor: number) => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcutConfig?: () => void;
  onSaveLayoutPreset?: () => void;
  onOpenTransform?: () => void;
  onCreateArtboard?: () => void;
  onOpenExportDialog?: () => void;
  onOpenGallery?: () => void;
  onToggleComments?: () => void;
  commentsCount?: number;
  onSelectAll?: () => void;
  uiScale?: UiScale;
  onSetUiScale?: (scale: UiScale) => void;
  contrast?: 'normal' | 'high';
  onToggleContrast?: () => void;
  onStartTutorial?: (id: 'shortcuts' | 'first-document' | 'pen' | 'node') => void;
  onToggleChecklist?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  documentName,
  saveStatus,
  canUndo,
  canRedo,
  zoomPercent,
  onUndo,
  onRedo,
  onFitArtboard,
  onFitDrawing,
  onFitSelection,
  onZoom100,
  onExportSvg,
  onExportPng,
  onExportVct,
  onExportAi,
  onExportCdr,
  onImportSvg,
  rightDockOpen,
  onToggleRightDock,
  onNewDocument,
  showGrid,
  snapToGrid,
  onToggleGrid,
  onToggleSnap,
  theme,
  onToggleTheme,
  onRetrySave,
  onShowPanel,
  selectedObjectIds,
  onConvertToCurves,
  onOpenCleanup,
  onGroup,
  onUngroup,
  onRepeatTransform,
  onOpenFindReplace,
  onOpenUsedFonts,
  onOpenSpecialCharacters,
  onOpenWebFontImport,
  outlineMode,
  onToggleOutlineMode,
  onCopy,
  onCut,
  onPaste,
  onPasteInPlace,
  onPasteAllArtboards,
  onDuplicate,
  onSetZoom,
  onOpenCommandPalette,
  onOpenShortcutConfig,
  onSaveLayoutPreset,
  onOpenTransform,
  onCreateArtboard,
  onOpenExportDialog,
  onOpenGallery,
  onToggleComments,
  commentsCount,
  onSelectAll,
  uiScale,
  onSetUiScale,
  contrast,
  onToggleContrast,
  onStartTutorial,
  onToggleChecklist,
}) => {
  return (
    <header
      data-testid="topbar"
      style={{
        position: 'relative',
        height: '72px',
        minHeight: '72px',
        backgroundColor: 'var(--color-topbar)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}
    >
      <AppMenuBar
        saveStatus={saveStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        zoomPercent={zoomPercent}
        onUndo={onUndo}
        onRedo={onRedo}
        onFitArtboard={onFitArtboard}
        onFitDrawing={onFitDrawing}
        onFitSelection={onFitSelection}
        onZoom100={onZoom100}
        onExportSvg={onExportSvg}
        onExportPng={onExportPng}
        onExportVct={onExportVct}
        onExportAi={onExportAi}
        onExportCdr={onExportCdr}
        onImportSvg={onImportSvg}
        rightDockOpen={rightDockOpen}
        onToggleRightDock={onToggleRightDock}
        onNewDocument={onNewDocument}
        showGrid={showGrid}
        snapToGrid={snapToGrid}
        onToggleGrid={onToggleGrid}
        onToggleSnap={onToggleSnap}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onRetrySave={onRetrySave}
        onShowPanel={onShowPanel}
        selectedObjectIds={selectedObjectIds}
        onConvertToCurves={onConvertToCurves}
        onOpenCleanup={onOpenCleanup}
        onGroup={onGroup}
        onUngroup={onUngroup}
        onRepeatTransform={onRepeatTransform}
        onOpenFindReplace={onOpenFindReplace}
        onOpenUsedFonts={onOpenUsedFonts}
        onOpenSpecialCharacters={onOpenSpecialCharacters}
        onOpenWebFontImport={onOpenWebFontImport}
        outlineMode={outlineMode}
        onToggleOutlineMode={onToggleOutlineMode}
        onCopy={onCopy}
        onCut={onCut}
        onPaste={onPaste}
        onPasteInPlace={onPasteInPlace}
        onPasteAllArtboards={onPasteAllArtboards}
        onDuplicate={onDuplicate}
        onSetZoom={onSetZoom}
        onOpenCommandPalette={onOpenCommandPalette}
        onOpenShortcutConfig={onOpenShortcutConfig}
        onSaveLayoutPreset={onSaveLayoutPreset}
        onOpenTransform={onOpenTransform}
        onCreateArtboard={onCreateArtboard}
        onOpenExportDialog={onOpenExportDialog}
        onOpenGallery={onOpenGallery}
        onToggleComments={onToggleComments}
        onSelectAll={onSelectAll}
        uiScale={uiScale}
        onSetUiScale={onSetUiScale}
        contrast={contrast}
        onToggleContrast={onToggleContrast}
        onStartTutorial={onStartTutorial}
        onToggleChecklist={onToggleChecklist}
      />
      <DocumentTabs
        documentName={documentName}
        dirty={saveStatus !== 'saved-locally'}
        onOpenGallery={onOpenGallery}
        onToggleComments={onToggleComments}
        commentsCount={commentsCount}
      />
    </header>
  );
};
