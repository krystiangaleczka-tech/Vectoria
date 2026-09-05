import React, { useMemo } from 'react';
import type { DocumentModel } from '@vectoria/core';
import { SetDocumentUnitCommand, UpdateArtboardCommand } from '@vectoria/core';

export interface DocumentPropertiesProps {
  document: DocumentModel;
  onExecuteCommand: (command: import('@vectoria/core').Command) => void;
}

export const DocumentProperties: React.FC<DocumentPropertiesProps> = ({ document, onExecuteCommand }) => {
  const artboardId = document.activeArtboardId || Object.keys(document.artboards)[0];
  const artboard = artboardId ? document.artboards[artboardId] : undefined;

  const stats = useMemo(() => {
    let objectCount = 0;
    const layerCount = document.layerIds.length;
    for (const layerId of document.layerIds) {
      objectCount += document.layers[layerId]?.objectIds.length || 0;
    }
    return { objectCount, layerCount };
  }, [document]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '0 4px' }}>
      <div>
        <div className="panel-section-heading"><span>Document</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block', fontWeight: 500 }}>Name</label>
            <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{document.name}</div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block', fontWeight: 500 }}>Unit</label>
            <select
              value={document.unit}
              onChange={(e) => onExecuteCommand(new SetDocumentUnitCommand(e.target.value as import('@vectoria/core').DocumentUnit))}
              style={{
                width: '100%',
                height: '28px',
                padding: '0 8px',
                backgroundColor: 'var(--color-input)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontFamily: 'var(--font-ui)',
              }}
            >
              <option value="px">px</option>
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </div>
        </div>
      </div>

      {artboard && (
        <div>
          <div className="panel-section-heading"><span>Artboard</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block', fontWeight: 500 }}>Width</label>
                <input
                  type="number"
                  value={artboard.width}
                  onChange={(e) => onExecuteCommand(new UpdateArtboardCommand(artboard.id, { width: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    height: '28px',
                    padding: '0 8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-ui)',
                    fontVariantNumeric: 'tabular-nums',
                    background: 'var(--color-input)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block', fontWeight: 500 }}>Height</label>
                <input
                  type="number"
                  value={artboard.height}
                  onChange={(e) => onExecuteCommand(new UpdateArtboardCommand(artboard.id, { height: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    height: '28px',
                    padding: '0 8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-ui)',
                    fontVariantNumeric: 'tabular-nums',
                    background: 'var(--color-input)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block', fontWeight: 500 }}>Background</label>
              <input
                type="color"
                value={artboard.background.type === 'color' ? artboard.background.color : '#ffffff'}
                onChange={(e) => onExecuteCommand(new UpdateArtboardCommand(artboard.id, { background: { type: 'color', color: e.target.value } }))}
                style={{
                  width: '100%',
                  height: '28px',
                  padding: '2px',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-input)',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="panel-section-heading"><span>Stats</span></div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Layers</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--color-text-primary)' }}>{stats.layerCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Objects</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--color-text-primary)' }}>{stats.objectCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
