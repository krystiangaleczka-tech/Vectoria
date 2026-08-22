import React from 'react';
import type { Vec2 } from '@vectoria/shared';

export interface StatusBarProps {
  toolHint: string;
  cursorWorld: Vec2 | null;
  zoomPercent: number;
  saveStatus: 'saved' | 'saving' | 'error';
  objectCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  toolHint,
  cursorWorld,
  zoomPercent,
  saveStatus,
  objectCount,
}) => {
  return (
    <footer
      data-testid="statusbar"
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
        <span>{toolHint}</span>
      </div>

      {/* Right: Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontFamily: 'var(--font-mono)' }}>
        {cursorWorld && (
          <span>
            X: {Math.round(cursorWorld.x)} px · Y: {Math.round(cursorWorld.y)} px
          </span>
        )}
        <span>{objectCount} {objectCount === 1 ? 'object' : 'objects'}</span>
        <span>{zoomPercent}%</span>
        <span
          style={{
            color:
              saveStatus === 'saved'
                ? 'var(--color-success)'
                : saveStatus === 'saving'
                ? 'var(--color-warning)'
                : 'var(--color-danger)',
          }}
        >
          {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Sync error'}
        </span>
      </div>
    </footer>
  );
};
