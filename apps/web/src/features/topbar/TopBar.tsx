import React from 'react';
import { AppMenuBar } from './AppMenuBar.js';
import { DocumentTabs } from './DocumentTabs.js';

export interface TopBarProps {
  documentName: string;
  saveStatus: 'saved' | 'saving' | 'error';
  canUndo: boolean;
  canRedo: boolean;
  zoomPercent: number;
  onUndo: () => void;
  onRedo: () => void;
  onFitArtboard: () => void;
  onFitDrawing: () => void;
  onZoom100: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
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
  onZoom100,
  onExportSvg,
  onExportPng,
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
}) => {
  return (
    <header
      data-testid="topbar"
      style={{
        height: '72px',
        minHeight: '72px',
        backgroundColor: 'var(--color-topbar)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
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
        onZoom100={onZoom100}
        onExportSvg={onExportSvg}
        onExportPng={onExportPng}
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
      />
      <DocumentTabs documentName={documentName} dirty={saveStatus !== 'saved'} />
    </header>
  );
};
