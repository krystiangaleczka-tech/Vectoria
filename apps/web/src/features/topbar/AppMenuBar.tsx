import React, { useEffect, useRef, useState } from 'react';
import { Button, IconButton, VectoriaIcon } from '@vectoria/ui';

interface AppMenuBarProps {
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

type MenuName = 'Plik' | 'Edycja' | 'Obiekt' | 'Tekst' | 'Widok' | 'Pomoc';

export const AppMenuBar: React.FC<AppMenuBarProps> = ({
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
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menus: MenuName[] = ['Plik', 'Edycja', 'Obiekt', 'Tekst', 'Widok', 'Pomoc'];

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
        <MenuItem label="Zoom 100%" shortcut="Ctrl+0" onClick={() => run(onZoom100)} />
        <MenuItem label={`${showGrid ? 'Ukryj' : 'Pokaż'} siatkę`} onClick={() => run(onToggleGrid)} />
        <MenuItem label={`${snapToGrid ? 'Wyłącz' : 'Włącz'} snap do siatki`} onClick={() => run(onToggleSnap)} />
        <MenuItem label={`Motyw: ${theme === 'dark' ? 'jasny' : 'ciemny'}`} onClick={() => run(onToggleTheme)} />
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
        <span className={`save-indicator save-${saveStatus}`} role="status">
          <span aria-hidden="true">●</span> {saveStatus === 'saved' ? 'Zapisano lokalnie' : saveStatus === 'saving' ? 'Zapisywanie…' : 'Błąd zapisu'}
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
