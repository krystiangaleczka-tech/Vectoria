import React from 'react';
import type { DocumentModel, ObjectId, RectangleObject } from '@vectoria/core';
import { NumberInput, ColorControl } from '@vectoria/ui';

export interface PropertiesPanelProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  onUpdatePosition: (id: ObjectId, x: number, y: number) => void;
  onUpdateDimensions: (id: ObjectId, width: number, height: number) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  document,
  selectedObjectId,
  onUpdatePosition,
  onUpdateDimensions,
  onUpdateFill,
}) => {
  const selectedObject = selectedObjectId ? document.objects[selectedObjectId] : null;
  const activeArtboard = document.artboards[document.activeArtboardId];

  return (
    <aside
      style={{
        width: '280px',
        minWidth: '280px',
        backgroundColor: 'var(--color-panel)',
        borderLeft: '1px solid var(--color-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 5,
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderBottom: '1px solid var(--color-border-subtle)',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {selectedObject ? 'Object Properties' : 'Artboard Properties'}
      </div>

      {/* Content */}
      <div
        style={{
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
        }}
      >
        {selectedObject && selectedObject.type === 'rectangle' ? (
          <>
            {/* Transform Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Transform
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <NumberInput
                  label="X"
                  value={selectedObject.transform.position.x}
                  onChange={(newX) =>
                    onUpdatePosition(selectedObject.id, newX, selectedObject.transform.position.y)
                  }
                />
                <NumberInput
                  label="Y"
                  value={selectedObject.transform.position.y}
                  onChange={(newY) =>
                    onUpdatePosition(selectedObject.id, selectedObject.transform.position.x, newY)
                  }
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <NumberInput
                  label="W"
                  value={(selectedObject as RectangleObject).width}
                  min={1}
                  onChange={(newW) =>
                    onUpdateDimensions(selectedObject.id, newW, (selectedObject as RectangleObject).height)
                  }
                />
                <NumberInput
                  label="H"
                  value={(selectedObject as RectangleObject).height}
                  min={1}
                  onChange={(newH) =>
                    onUpdateDimensions(selectedObject.id, (selectedObject as RectangleObject).width, newH)
                  }
                />
              </div>
            </div>

            {/* Appearance Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Appearance
              </span>
              <ColorControl
                label="Fill"
                color={
                  selectedObject.style.fill.type === 'solid'
                    ? selectedObject.style.fill.color
                    : null
                }
                onChange={(color) => onUpdateFill(selectedObject.id, color)}
              />
            </div>
          </>
        ) : activeArtboard ? (
          <>
            {/* Artboard Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Artboard
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <NumberInput
                  label="W"
                  value={activeArtboard.width}
                  disabled
                  onChange={() => {}}
                />
                <NumberInput
                  label="H"
                  value={activeArtboard.height}
                  disabled
                  onChange={() => {}}
                />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Select an object to inspect and edit its properties.
              </div>
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
};
