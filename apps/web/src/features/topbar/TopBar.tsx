import React from 'react';
import { Button, IconButton, VectoriaIcon } from '@vectoria/ui';

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
}) => {
  return (
    <header
      style={{
        height: '40px',
        minHeight: '40px',
        backgroundColor: 'var(--color-topbar)',
        borderBottom: '1px solid var(--color-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        zIndex: 10,
      }}
    >
      {/* Left: Brand & Document Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: 'var(--color-accent)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
              color: '#ffffff',
            }}
          >
            V
          </div>
          <span style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '-0.01em' }}>
            Vectoria
          </span>
        </div>

        <div
          style={{
            height: '14px',
            width: '1px',
            backgroundColor: 'var(--color-border-default)',
            margin: '0 4px',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {documentName}
          </span>
          <span
            style={{
              fontSize: '11px',
              color:
                saveStatus === 'saved'
                  ? 'var(--color-success)'
                  : saveStatus === 'saving'
                  ? 'var(--color-warning)'
                  : 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ● {saveStatus === 'saved' ? 'Saved locally' : saveStatus === 'saving' ? 'Saving…' : 'Sync error'}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Undo / Redo */}
        <IconButton
          icon={<VectoriaIcon name="undo" size={16} />}
          label="Undo"
          shortcut="Cmd+Z"
          size="sm"
          disabled={!canUndo}
          onClick={onUndo}
        />
        <IconButton
          icon={<VectoriaIcon name="redo" size={16} />}
          label="Redo"
          shortcut="Cmd+Shift+Z"
          size="sm"
          disabled={!canRedo}
          onClick={onRedo}
        />

        <div
          style={{
            height: '14px',
            width: '1px',
            backgroundColor: 'var(--color-border-subtle)',
            margin: '0 4px',
          }}
        />

        {/* Zoom controls */}
        <button
          type="button"
          onClick={onZoom100}
          title="Zoom 100% (Cmd+0)"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs)',
            cursor: 'pointer',
          }}
        >
          {zoomPercent}%
        </button>

        <Button size="sm" variant="ghost" onClick={onFitArtboard} title="Fit Artboard to Viewport">
          Fit
        </Button>

        <div
          style={{
            height: '14px',
            width: '1px',
            backgroundColor: 'var(--color-border-subtle)',
            margin: '0 4px',
          }}
        />

        {/* Export SVG */}
        <Button
          size="sm"
          variant="primary"
          icon={<VectoriaIcon name="fileExport" size={14} />}
          onClick={onExportSvg}
        >
          Export SVG
        </Button>
      </div>
    </header>
  );
};
