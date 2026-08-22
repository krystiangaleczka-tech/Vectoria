import React, { useState } from 'react';
import type { Command, DocumentModel, ObjectId, ObjectStyle } from '@vectoria/core';
import { VectoriaIcon } from '@vectoria/ui';
import { HistoryPanel } from './HistoryPanel.js';
import { LayersPanel } from './LayersPanel.js';
import { PropertiesPanel } from './PropertiesPanel.js';

export type DockPanel = 'properties' | 'layers' | 'history';

export interface RightDockProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  historyEntries: readonly Command[];
  onSelectObject: (id: ObjectId | null) => void;
  onUpdatePosition: (id: ObjectId, x: number, y: number) => void;
  onUpdateDimensions: (id: ObjectId, width: number, height: number) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
  onUpdateObjectStyle?: (id: ObjectId, patch: Partial<ObjectStyle>) => void;
  onUpdateRotation?: (id: ObjectId, degrees: number) => void;
  onUpdateArtboard?: (width: number, height: number) => void;
  onToggleObject?: (id: ObjectId, field: 'visible' | 'locked') => void;
  open: boolean;
}

const panels: readonly { id: DockPanel; label: string; icon: React.ComponentProps<typeof VectoriaIcon>['name'] }[] = [
  { id: 'properties', label: 'Właściwości', icon: 'sliders' as React.ComponentProps<typeof VectoriaIcon>['name'] },
  { id: 'layers', label: 'Warstwy', icon: 'layers' },
  { id: 'history', label: 'Historia', icon: 'history' },
];

export const RightDock: React.FC<RightDockProps> = ({ document: doc, selectedObjectId, historyEntries, onSelectObject, onUpdatePosition, onUpdateDimensions, onUpdateFill, onUpdateObjectStyle, onUpdateRotation, onUpdateArtboard, onToggleObject, open }) => {
  const [activePanel, setActivePanel] = useState<DockPanel>('properties');
  const activeIndex = panels.findIndex((panel) => panel.id === activePanel);

  const moveTab = (direction: number) => {
    const next = (activeIndex + direction + panels.length) % panels.length;
    const nextPanel = panels[next];
    if (nextPanel) setActivePanel(nextPanel.id);
  };

  return (
    <aside className={`right-dock ${open ? '' : 'is-closed'}`} data-testid="right-dock">
      <div className="dock-tabs" role="tablist" aria-label="Panele dokumentu">
        {panels.map((panel) => <button key={panel.id} type="button" role="tab" id={`tab-${panel.id}`} className={`dock-tab ${activePanel === panel.id ? 'is-active' : ''}`} aria-selected={activePanel === panel.id} aria-controls={`panel-${panel.id}`} tabIndex={activePanel === panel.id ? 0 : -1} onClick={() => setActivePanel(panel.id)} onKeyDown={(event) => { if (event.key === 'ArrowRight') moveTab(1); if (event.key === 'ArrowLeft') moveTab(-1); if (event.key === 'Home') setActivePanel('properties'); if (event.key === 'End') setActivePanel('history'); }}><VectoriaIcon name={panel.icon} size={15} /><span>{panel.label}</span></button>)}
      </div>
      <div id={`panel-${activePanel}`} role="tabpanel" aria-labelledby={`tab-${activePanel}`} className="dock-panel">
        {activePanel === 'properties' && <PropertiesPanel document={doc} selectedObjectId={selectedObjectId} onUpdatePosition={onUpdatePosition} onUpdateDimensions={onUpdateDimensions} onUpdateFill={onUpdateFill} onUpdateObjectStyle={onUpdateObjectStyle} onUpdateRotation={onUpdateRotation} onUpdateArtboard={onUpdateArtboard} />}
        {activePanel === 'layers' && <LayersPanel document={doc} selectedObjectId={selectedObjectId} onSelectObject={onSelectObject} onToggleObject={onToggleObject} />}
        {activePanel === 'history' && <HistoryPanel entries={historyEntries} />}
      </div>
    </aside>
  );
};
