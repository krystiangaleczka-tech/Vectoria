import React from 'react';
import type { Vec2 } from '@vectoria/shared';
import { convertUnit, type Unit } from '@vectoria/shared';

export interface StatusBarProps {
  toolHint: string;
  activeTool: string;
  selectedObjectName: string | null;
  selectedObjectCount: number;
  cursorWorld: Vec2 | null;
  zoomPercent: number;
  saveStatus: 'idle' | 'dirty' | 'saving' | 'saved-locally' | 'error' | 'offline';
  revision: number;
  savedRevision: number;
  objectCount: number;
  unit?: Unit;
  snapEnabled?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  toolHint,
  activeTool,
  selectedObjectName,
  selectedObjectCount,
  cursorWorld,
  zoomPercent,
  saveStatus,
  revision,
  savedRevision,
  objectCount,
  unit = 'px',
  snapEnabled = false,
}) => {
  return (
    <footer
      data-testid="statusbar"
      className="statusbar"
      style={{
        height: '26px',
        minHeight: '26px',
        backgroundColor: 'var(--color-app)',
        borderTop: '1px solid var(--color-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '11px',
        color: 'var(--color-text-muted)',
        zIndex: 10,
      }}
    >
      {/* Left: Tool hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="status-tool"><strong>{activeTool}</strong> · {toolHint}</span>
        {selectedObjectName && <span className="status-selection">{selectedObjectName} · {selectedObjectCount} zazn.</span>}
      </div>

      {/* Right: Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontFamily: 'var(--font-mono)' }}>
        {cursorWorld && (
          <span>
            X: {convertUnit(cursorWorld.x, 'px', unit).toFixed(1)} {unit} · Y: {convertUnit(cursorWorld.y, 'px', unit).toFixed(1)} {unit}
          </span>
        )}
        <span>{objectCount} {objectCount === 1 ? 'object' : 'objects'}</span>
        <span>{zoomPercent}%</span>
        <span>Snap: {snapEnabled ? 'Grid' : 'Off'}</span>
        <span
          style={{
            color:
          saveStatus === 'saved-locally'
                ? 'var(--color-success)'
                : saveStatus === 'saving'
                ? 'var(--color-warning)'
                : 'var(--color-danger)',
          }}
        >
          {saveStatus === 'saved-locally' ? 'Saved locally' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'offline' ? 'Offline' : saveStatus === 'error' ? 'Sync error' : `Unsaved · ${revision - savedRevision}`}
        </span>
      </div>
    </footer>
  );
};
