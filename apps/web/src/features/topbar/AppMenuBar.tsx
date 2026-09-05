import React, { useEffect, useRef, useState } from 'react';
import { Button, IconButton, VectoriaIcon } from '@vectoria/ui';
import type { DockPanel } from '../panels/RightDock.js';
import type { ObjectId } from '@vectoria/core';

import type { UiScale } from '../../hooks/useUiPreferences.js';

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 0.87, 1, 1.5];

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
  onSelectAll?: () => void;
  uiScale?: UiScale;
  onSetUiScale?: (scale: UiScale) => void;
  contrast?: 'normal' | 'high';
  onToggleContrast?: () => void;
  onStartTutorial?: (id: 'shortcuts' | 'first-document' | 'pen' | 'node') => void;
  onToggleChecklist?: () => void;
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
  onSelectAll,
  uiScale,
  onSetUiScale,
  contrast,
  onToggleContrast,
  onStartTutorial,
  onToggleChecklist,
}) => {
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const [customEditing, setCustomEditing] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef(false);

  const handleZoomPointerDown = () => {
    longPressRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      longPressRef.current = true;
      setCustomEditing(true);
    }, 500);
  };

  const handleZoomClick = () => {
    if (longPressRef.current) return;
    const current = zoomPercent / 100;
    const next = ZOOM_PRESETS.find((p) => p > current + 0.005) ?? ZOOM_PRESETS[0]!;
    if (onSetZoom) {
      onSetZoom(next);
    } else {
      onZoom100();
    }
  };
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
        <MenuItem label="Moje projekty (Galeria)..." shortcut="Ctrl+G" onClick={() => run(onOpenGallery)} />
        <MenuItem label="Nowy dokument" shortcut="Ctrl+N" onClick={() => run(onNewDocument)} />
        <MenuItem label="Nowy artboard" onClick={() => run(() => onCreateArtboard?.())} />
        <MenuItem label="Otwórz / Importuj..." onClick={() => run(onImportSvg)} />
        <MenuItem label="Zapisz jako .vct" onClick={() => run(onExportVct)} />
        <MenuItem label="Zapisz kopię jako Adobe Illustrator (.ai)" onClick={() => run(onExportAi)} />
        <MenuItem label="Zapisz kopię jako CorelDRAW (.cdr)" onClick={() => run(onExportCdr)} />
        <MenuItem label="Eksportuj..." shortcut="Ctrl+Shift+E" onClick={() => run(() => (onOpenExportDialog ? onOpenExportDialog() : onExportSvg()))} />
        <MenuItem label="Eksportuj SVG" onClick={() => run(onExportSvg)} />
        <MenuItem label="Eksportuj PNG" onClick={() => run(onExportPng)} />
      </>;
    }
    if (menu === 'Edycja') {
      return <>
        <MenuItem label="Cofnij" shortcut="Cmd+Z" disabled={!canUndo} onClick={() => run(onUndo)} />
        <MenuItem label="Ponów" shortcut="Cmd+Shift+Z" disabled={!canRedo} onClick={() => run(onRedo)} />
        <MenuItem label="Wytnij" shortcut="Cmd+X" disabled={selectedObjectIds.length === 0} onClick={() => run(onCut)} />
        <MenuItem label="Kopiuj" shortcut="Cmd+C" disabled={selectedObjectIds.length === 0} onClick={() => run(onCopy)} />
        <MenuItem label="Wklej" shortcut="Cmd+V" onClick={() => run(onPaste)} />
        <MenuItem label="Wklej na miejscu" shortcut="⇧⌘V" onClick={() => run(() => onPasteInPlace?.())} />
        <MenuItem label="Wklej na wszystkich artboardach" onClick={() => run(() => onPasteAllArtboards?.())} />
        <MenuItem label="Zaznacz wszystko" shortcut="Cmd+A" onClick={() => run(onSelectAll)} />
      </>;
    }
    if (menu === 'Widok') {
      return <>
        <MenuItem label="Dopasuj do obszaru" shortcut="Ctrl+1" onClick={() => run(onFitArtboard)} />
        <MenuItem label="Dopasuj do rysunku" onClick={() => run(onFitDrawing)} />
        <MenuItem label="Dopasuj do zaznaczenia" disabled={selectedObjectIds.length === 0} onClick={() => run(onFitSelection)} />
        <MenuItem label="Zoom 100%" shortcut="Ctrl+0" onClick={() => run(onZoom100)} />
        <MenuItem label={outlineMode ? 'Wyłącz Outline View' : 'Włącz Outline View'} shortcut="Ctrl+Y" onClick={() => run(onToggleOutlineMode)} />
        <MenuItem label="Komentarze i uwagi..." onClick={() => run(onToggleComments)} />
        <MenuItem label={`${showGrid ? 'Ukryj' : 'Pokaż'} siatkę`} onClick={() => run(onToggleGrid)} />
        <MenuItem label={`${snapToGrid ? 'Wyłącz' : 'Włącz'} snap do siatki`} onClick={() => run(onToggleSnap)} />
        <MenuItem label={`Motyw: ${theme === 'dark' ? 'jasny' : 'ciemny'}`} onClick={() => run(onToggleTheme)} />
        <MenuItem label={`Wysoki kontrast: ${contrast === 'high' ? 'Wyłącz' : 'Włącz'}`} onClick={() => run(onToggleContrast)} />
        <MenuItem label={`Skala UI: ${Math.round((uiScale ?? 1) * 100)}%`} onClick={() => {
          const current = uiScale ?? 1;
          const next = current <= 0.85 ? 1 : current === 1 ? 1.15 : current === 1.15 ? 1.3 : 0.85;
          run(() => onSetUiScale?.(next));
        }} />
        <MenuItem label="Paleta poleceń..." shortcut="Cmd+K" onClick={() => run(() => onOpenCommandPalette?.())} />
        <MenuItem label="Zapisz układ jako preset…" onClick={() => run(() => onSaveLayoutPreset?.())} />
      </>;
    }
    if (menu === 'Obiekt') {
      return <>
        <MenuItem label="Group" shortcut="Cmd+G" disabled={selectedObjectIds.length < 2} onClick={() => run(onGroup)} />
        <MenuItem label="Ungroup" shortcut="Cmd+Shift+G" disabled={selectedObjectIds.length === 0} onClick={() => run(onUngroup)} />
        <MenuItem label="Powiel i przekształć" shortcut="Cmd+D" disabled={selectedObjectIds.length === 0} onClick={() => run(onDuplicate)} />
        <MenuItem label="Repeat transform" shortcut="Cmd+Shift+R" disabled={selectedObjectIds.length === 0} onClick={() => run(onRepeatTransform)} />
        <MenuItem label="Przekształcenia..." shortcut="Ctrl+T" disabled={selectedObjectIds.length === 0} onClick={() => run(onOpenTransform)} />
        <MenuItem label="Convert to curves" disabled={selectedObjectIds.length === 0} onClick={() => run(() => onConvertToCurves(selectedObjectIds))} />
        <MenuItem label="Clean Up document" onClick={() => run(onOpenCleanup)} />
      </>;
    }
    if (menu === 'Tekst') {
      return <>
        <MenuItem label="Znajdź i zamień…" shortcut="Ctrl+F" onClick={() => run(() => onOpenFindReplace?.())} />
        <MenuItem label="Użyte czcionki…" onClick={() => run(() => onOpenUsedFonts?.())} />
        <MenuItem label="Importuj font webowy…" onClick={() => run(() => onOpenWebFontImport?.())} />
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
        <MenuItem label="Konfiguracja skrótów..." onClick={() => run(() => onOpenShortcutConfig?.())} />
      </>;
    }
    if (menu === 'Pomoc') {
      return <>
        <MenuItem label="Kroki startowe (Onboarding)" onClick={() => run(onToggleChecklist)} />
        <MenuItem label="Samouczek: Skróty klawiszowe" onClick={() => run(() => onStartTutorial?.('shortcuts'))} />
        <MenuItem label="Samouczek: Pierwszy dokument" onClick={() => run(() => onStartTutorial?.('first-document'))} />
        <MenuItem label="Samouczek: Narzędzie Pióro" onClick={() => run(() => onStartTutorial?.('pen'))} />
        <MenuItem label="Samouczek: Edycja węzłów" onClick={() => run(() => onStartTutorial?.('node'))} />
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
        {customEditing ? (
          <input
            className="zoom-readout zoom-input"
            autoFocus
            defaultValue={`${zoomPercent}%`}
            aria-label="Zoom custom"
            onBlur={() => setCustomEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const parsed = parseFloat(e.currentTarget.value.replace('%', '').replace(',', '.'));
                if (Number.isFinite(parsed) && onSetZoom) {
                  onSetZoom(parsed / 100);
                }
                setCustomEditing(false);
              }
              if (e.key === 'Escape') setCustomEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="zoom-readout"
            title="Klik: cykl zoomu · Przytrzymaj: własna wartość"
            onPointerDown={handleZoomPointerDown}
            onPointerUp={() => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); }}
            onPointerLeave={() => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); }}
            onClick={handleZoomClick}
          >
            {zoomPercent}%
          </button>
        )}
        <Button size="sm" variant="ghost" onClick={onFitArtboard} title="Dopasuj obszar roboczy">Dopasuj</Button>
        <IconButton className="dock-toggle" size="sm" icon={<VectoriaIcon name="sliders" size={15} />} label={rightDockOpen ? 'Ukryj panele' : 'Pokaż panele'} active={rightDockOpen} onClick={onToggleRightDock} />
        <Button data-testid="export-svg-button" size="sm" variant="ghost" onClick={onExportSvg} title="Szybki eksport SVG">SVG</Button>
        <Button data-testid="export-dialog-button" size="sm" variant="primary" icon={<VectoriaIcon name="fileExport" size={14} />} onClick={onOpenExportDialog} title="Eksportuj... (Ctrl+Shift+E)">Eksportuj…</Button>
      </div>
    </div>
  );
};

const MenuItem: React.FC<{ label: string; shortcut?: string; disabled?: boolean; onClick?: () => void }> = ({ label, shortcut, disabled, onClick }) => (
  <button type="button" role="menuitem" className="menu-item" disabled={disabled} onClick={onClick}>
    <span>{label}</span><span className="menu-shortcut">{shortcut ?? ''}</span>
  </button>
);
