import React, { useEffect, useRef, useState } from 'react';
import { Button, IconButton, VectoriaIcon } from '@vectoria/ui';
import type { DockPanel } from '../panels/RightDock.js';
import type { ObjectId } from '@vectoria/core';

interface AppMenuBarProps {
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
  outlineMode?: boolean;
  onToggleOutlineMode?: () => void;
}

type MenuName = 'Plik' | 'Edycja' | 'Obiekt' | 'Tekst' | 'Widok' | 'Okno' | 'Pomoc';

export const AppMenuBar: React.FC<AppMenuBarProps> = ({
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
  outlineMode,
  onToggleOutlineMode,
}) => {
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menus: MenuName[] = ['Plik', 'Edycja', 'Obiekt', 'Tekst', 'Widok', 'Okno', 'Pomoc'];

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const run = (action: (() => void) | undefined) => {
    action?.();
    setOpenMenu(null);
  };

  const renderItems = (menu: MenuName) => {
    if (menu === 'Plik') {
      return <>
        <MenuItem label="Nowy dokument" shortcut="Ctrl+N" onClick={() => run(onNewDocument)} />
        <MenuItem label="Importuj SVG" onClick={() => run(onImportSvg)} />
        <MenuItem label="Eksportuj SVG" shortcut="Ctrl+Shift+E" onClick={() => run(onExportSvg)} />
        <MenuItem label="Eksportuj PNG" onClick={() => run(onExportPng)} />
      </>;
    }
    if (menu === 'Edycja') {
      return <>
        <MenuItem label="Cofnij" shortcut="Ctrl+Z" disabled={!canUndo} onClick={() => run(onUndo)} />
        <MenuItem label="Ponów" shortcut="Ctrl+Shift+Z" disabled={!canRedo} onClick={() => run(onRedo)} />
        <MenuItem label="Zaznacz wszystko" disabled />
      </>;
    }
    if (menu === 'Widok') {
      return <>
        <MenuItem label="Dopasuj do obszaru" shortcut="Ctrl+1" onClick={() => run(onFitArtboard)} />
        <MenuItem label="Dopasuj do rysunku" onClick={() => run(onFitDrawing)} />
        <MenuItem label="Dopasuj do zaznaczenia" disabled={selectedObjectIds.length === 0} onClick={() => run(onFitSelection)} />
        <MenuItem label="Zoom 100%" shortcut="Ctrl+0" onClick={() => run(onZoom100)} />
        <MenuItem label={outlineMode ? 'Wyłącz Outline View' : 'Włącz Outline View'} shortcut="Ctrl+Y" onClick={() => run(onToggleOutlineMode)} />
        <MenuItem label={`${showGrid ? 'Ukryj' : 'Pokaż'} siatkę`} onClick={() => run(onToggleGrid)} />
        <MenuItem label={`${snapToGrid ? 'Wyłącz' : 'Włącz'} snap do siatki`} onClick={() => run(onToggleSnap)} />
        <MenuItem label={`Motyw: ${theme === 'dark' ? 'jasny' : 'ciemny'}`} onClick={() => run(onToggleTheme)} />
      </>;
    }
    if (menu === 'Obiekt') {
      return <>
        <MenuItem label="Group" shortcut="Cmd+G" disabled={selectedObjectIds.length < 2} onClick={() => run(onGroup)} />
        <MenuItem label="Ungroup" shortcut="Cmd+Shift+G" disabled={selectedObjectIds.length === 0} onClick={() => run(onUngroup)} />
        <MenuItem label="Repeat transform" shortcut="Cmd+Shift+R" disabled={selectedObjectIds.length === 0} onClick={() => run(onRepeatTransform)} />
        <MenuItem label="Convert to curves" disabled={selectedObjectIds.length === 0} onClick={() => run(() => onConvertToCurves(selectedObjectIds))} />
        <MenuItem label="Clean Up document" onClick={() => run(onOpenCleanup)} />
      </>;
    }
    if (menu === 'Tekst') {
      return <>
        <MenuItem label="Znajdź i zamień…" shortcut="Ctrl+F" onClick={() => run(() => onOpenFindReplace?.())} />
        <MenuItem label="Użyte czcionki…" onClick={() => run(() => onOpenUsedFonts?.())} />
        <MenuItem label="Wstaw znak specjalny…" onClick={() => run(() => onOpenSpecialCharacters?.())} />
        <MenuItem label="Zamień tekst na krzywe" disabled={selectedObjectIds.length === 0} onClick={() => run(() => onConvertToCurves(selectedObjectIds))} />
      </>;
    }
    if (menu === 'Okno') {
      return <>
        <MenuItem label="Właściwości" onClick={() => run(() => onShowPanel('properties'))} />
        <MenuItem label="Warstwy" onClick={() => run(() => onShowPanel('layers'))} />
        <MenuItem label="Zasoby" onClick={() => run(() => onShowPanel('assets'))} />
        <MenuItem label="Historia" onClick={() => run(() => onShowPanel('history'))} />
        <MenuItem label={rightDockOpen ? 'Ukryj dock' : 'Pokaż dock'} onClick={() => run(onToggleRightDock)} />
      </>;
    }
    return <MenuItem label="Wkrótce" disabled />;
  };

  return (
    <div className="app-menu-bar" ref={menuRef} data-testid="app-menu-bar">
      <div className="app-brand" aria-label="Vectoria">
        <span className="app-brand-mark">V</span>
        <strong>Vectoria</strong>
      </div>
      <nav className="menu-navigation" aria-label="Główne menu">
        {menus.map((menu) => (
          <div className="menu-trigger-wrap" key={menu}>
            <button
              type="button"
              className={`menu-trigger ${openMenu === menu ? 'is-open' : ''}`}
              aria-haspopup="menu"
              aria-expanded={openMenu === menu}
              onClick={() => setOpenMenu(openMenu === menu ? null : menu)}
            >
              {menu}
            </button>
            {openMenu === menu && <div className="menu-popover" role="menu">{renderItems(menu)}</div>}
          </div>
        ))}
      </nav>
      <div className="app-global-actions">
        <span className={`save-indicator save-${saveStatus}`} role="status" aria-live="polite">
          <span aria-hidden="true">{saveStatus === 'saved-locally' ? '✓' : saveStatus === 'error' ? '!' : '●'}</span> {saveStatus === 'saved-locally' ? 'Zapisano lokalnie' : saveStatus === 'saving' ? 'Zapisywanie…' : saveStatus === 'offline' ? 'Offline' : saveStatus === 'error' ? 'Błąd zapisu' : 'Niezapisane zmiany'}
          {saveStatus === 'error' && <button type="button" className="save-retry" onClick={onRetrySave}>Spróbuj ponownie</button>}
        </span>
        <span className="action-divider" aria-hidden="true" />
        <IconButton data-testid="undo-button" icon={<VectoriaIcon name="undo" size={16} />} label="Cofnij" shortcut="Cmd+Z" size="sm" disabled={!canUndo} onClick={onUndo} />
        <IconButton data-testid="redo-button" icon={<VectoriaIcon name="redo" size={16} />} label="Ponów" shortcut="Cmd+Shift+Z" size="sm" disabled={!canRedo} onClick={onRedo} />
        <button type="button" className="zoom-readout" onClick={onZoom100} title="Zoom 100% (Cmd+0)">{zoomPercent}%</button>
        <Button size="sm" variant="ghost" onClick={onFitArtboard} title="Dopasuj obszar roboczy">Dopasuj</Button>
        <IconButton className="dock-toggle" size="sm" icon={<VectoriaIcon name="sliders" size={15} />} label={rightDockOpen ? 'Ukryj panele' : 'Pokaż panele'} active={rightDockOpen} onClick={onToggleRightDock} />
        <Button data-testid="export-svg-button" size="sm" variant="primary" icon={<VectoriaIcon name="fileExport" size={14} />} onClick={onExportSvg}>Eksportuj</Button>
      </div>
    </div>
  );
};

const MenuItem: React.FC<{ label: string; shortcut?: string; disabled?: boolean; onClick?: () => void }> = ({ label, shortcut, disabled, onClick }) => (
  <button type="button" role="menuitem" className="menu-item" disabled={disabled} onClick={onClick}>
    <span>{label}</span><span className="menu-shortcut">{shortcut ?? ''}</span>
  </button>
);
