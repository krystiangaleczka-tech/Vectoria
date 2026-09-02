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
    <div style={{ padding: '0 12px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px 0' }}>Document</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>Name</label>
            <div style={{ fontSize: '12px' }}>{document.name}</div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>Unit</label>
            <select
              value={document.unit}
              onChange={(e) => onExecuteCommand(new SetDocumentUnitCommand(e.target.value as import('@vectoria/core').DocumentUnit))}
              style={{
                width: '100%',
                padding: '4px 8px',
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '4px',
                fontSize: '12px'
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
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px 0' }}>Artboard</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>Width</label>
                <input
                  type="number"
                  value={artboard.width}
                  onChange={(e) => onExecuteCommand(new UpdateArtboardCommand(artboard.id, { width: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '4px', fontSize: '12px', background: 'var(--color-bg-base)', color: 'white', border: '1px solid var(--color-border-subtle)', borderRadius: '4px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>Height</label>
                <input
                  type="number"
                  value={artboard.height}
                  onChange={(e) => onExecuteCommand(new UpdateArtboardCommand(artboard.id, { height: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '4px', fontSize: '12px', background: 'var(--color-bg-base)', color: 'white', border: '1px solid var(--color-border-subtle)', borderRadius: '4px' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'block' }}>Background</label>
              <input
                type="color"
                value={artboard.background.type === 'color' ? artboard.background.color : '#ffffff'}
                onChange={(e) => onExecuteCommand(new UpdateArtboardCommand(artboard.id, { background: { type: 'color', color: e.target.value } }))}
                style={{ width: '100%', height: '24px', padding: 0, border: 'none', background: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 12px 0' }}>Stats</h3>
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Layers</span>
            <span>{stats.layerCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Objects</span>
            <span>{stats.objectCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
