import React, { useState } from 'react';
import type { DocumentModel, ObjectId, ObjectStyle, DocumentUnit, HistoryEntry } from '@vectoria/core';
import { VectoriaIcon } from '@vectoria/ui';
import { HistoryPanel } from './HistoryPanel.js';
import { LayersPanel } from './LayersPanel.js';
import { PropertiesPanel } from './PropertiesPanel.js';
import { ArtboardsPanel } from './ArtboardsPanel.js';
import type { GridSettings } from '@vectoria/editor-engine';

export type DockPanel = 'properties' | 'layers' | 'artboards' | 'history';

export interface RightDockProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  history: readonly HistoryEntry[];
  historyCursor: number;
  onHistoryJump: (cursor: number) => void;
  onSelectObject: (id: ObjectId | null) => void;
  onUpdatePosition: (id: ObjectId, x: number, y: number) => void;
  onUpdateDimensions: (id: ObjectId, width: number, height: number) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
  onUpdateObjectStyle?: (id: ObjectId, patch: Partial<ObjectStyle>) => void;
  onUpdateRotation?: (id: ObjectId, degrees: number) => void;
  onUpdateArtboard?: (width: number, height: number, background?: { type: 'transparent' } | { type: 'color'; color: string }) => void;
  onUpdateUnit?: (unit: DocumentUnit) => void;
  gridSettings?: GridSettings;
  onUpdateGridSettings?: (settings: GridSettings) => void;
  onToggleObject?: (id: ObjectId, field: 'visible' | 'locked') => void;
  onSelectArtboard?: (id: string) => void;
  onCreateArtboard?: () => void;
  onDuplicateArtboard?: (id: string) => void;
  onDeleteArtboard?: (id: string) => void;
  activePanel?: DockPanel;
  onPanelChange?: (panel: DockPanel) => void;
  open: boolean;
}

const panels: readonly { id: DockPanel; label: string; icon: React.ComponentProps<typeof VectoriaIcon>['name'] }[] = [
  { id: 'properties', label: 'Właściwości', icon: 'sliders' as React.ComponentProps<typeof VectoriaIcon>['name'] },
  { id: 'layers', label: 'Warstwy', icon: 'layers' },
  { id: 'artboards', label: 'Artboardy', icon: 'grid' },
  { id: 'history', label: 'Historia', icon: 'history' },
];

export const RightDock: React.FC<RightDockProps> = ({ document: doc, selectedObjectId, history, historyCursor, onHistoryJump, onSelectObject, onUpdatePosition, onUpdateDimensions, onUpdateFill, onUpdateObjectStyle, onUpdateRotation, onUpdateArtboard, onUpdateUnit, gridSettings, onUpdateGridSettings, onToggleObject, onSelectArtboard, onCreateArtboard, onDuplicateArtboard, onDeleteArtboard, activePanel: requestedPanel, onPanelChange, open }) => {
  const [localActivePanel, setLocalActivePanel] = useState<DockPanel>('properties');
  const activePanel = requestedPanel ?? localActivePanel;
  const activeIndex = panels.findIndex((panel) => panel.id === activePanel);
  const selectPanel = (panel: DockPanel) => {
    setLocalActivePanel(panel);
    onPanelChange?.(panel);
  };

  const moveTab = (direction: number) => {
    const next = (activeIndex + direction + panels.length) % panels.length;
    const nextPanel = panels[next];
    if (nextPanel) selectPanel(nextPanel.id);
  };

  return (
    <aside className={`right-dock ${open ? '' : 'is-closed'}`} data-testid="right-dock">
      <div className="dock-tabs" role="tablist" aria-label="Panele dokumentu">
         {panels.map((panel) => <button key={panel.id} type="button" role="tab" id={`tab-${panel.id}`} className={`dock-tab ${activePanel === panel.id ? 'is-active' : ''}`} aria-selected={activePanel === panel.id} aria-controls={`panel-${panel.id}`} tabIndex={activePanel === panel.id ? 0 : -1} onClick={() => selectPanel(panel.id)} onKeyDown={(event) => { if (event.key === 'ArrowRight') moveTab(1); if (event.key === 'ArrowLeft') moveTab(-1); if (event.key === 'Home') selectPanel('properties'); if (event.key === 'End') selectPanel('history'); }}><VectoriaIcon name={panel.icon} size={15} /><span>{panel.label}</span></button>)}
      </div>
      <div id={`panel-${activePanel}`} role="tabpanel" aria-labelledby={`tab-${activePanel}`} className="dock-panel">
         {activePanel === 'properties' && <PropertiesPanel document={doc} selectedObjectId={selectedObjectId} onUpdatePosition={onUpdatePosition} onUpdateDimensions={onUpdateDimensions} onUpdateFill={onUpdateFill} onUpdateObjectStyle={onUpdateObjectStyle} onUpdateRotation={onUpdateRotation} onUpdateArtboard={onUpdateArtboard} onUpdateUnit={onUpdateUnit} gridSettings={gridSettings} onUpdateGridSettings={onUpdateGridSettings} />}
        {activePanel === 'layers' && <LayersPanel document={doc} selectedObjectId={selectedObjectId} onSelectObject={onSelectObject} onToggleObject={onToggleObject} />}
         {activePanel === 'artboards' && onSelectArtboard && onCreateArtboard && onDuplicateArtboard && onDeleteArtboard && <ArtboardsPanel document={doc} onSelect={onSelectArtboard} onCreate={onCreateArtboard} onDuplicate={onDuplicateArtboard} onDelete={onDeleteArtboard} />}
          {activePanel === 'history' && <HistoryPanel entries={history} cursor={historyCursor} onJump={onHistoryJump} />}
      </div>
    </aside>
  );
};
