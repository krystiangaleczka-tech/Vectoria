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
  onZoom100: () => void;
  onExportSvg: () => void;
  rightDockOpen: boolean;
  onToggleRightDock: () => void;
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
  onZoom100,
  onExportSvg,
  rightDockOpen,
  onToggleRightDock,
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
        onZoom100={onZoom100}
        onExportSvg={onExportSvg}
        rightDockOpen={rightDockOpen}
        onToggleRightDock={onToggleRightDock}
      />
      <DocumentTabs documentName={documentName} dirty={saveStatus !== 'saved'} />
    </header>
  );
};
