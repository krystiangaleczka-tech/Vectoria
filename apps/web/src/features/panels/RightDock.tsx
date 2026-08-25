import React, { useState } from 'react';
import type { DocumentModel, ObjectId, ObjectStyle, DocumentUnit, HistoryEntry, PathNode, SelectionState, GeometryPreview, CleanupPlan } from '@vectoria/core';
import type { DocumentVersion } from '@vectoria/io';
import { VectoriaIcon } from '@vectoria/ui';
import { HistoryPanel } from './HistoryPanel.js';
import { LayersPanel } from './LayersPanel.js';
import { PropertiesPanel, type PathAction } from './PropertiesPanel.js';
import { ArtboardsPanel } from './ArtboardsPanel.js';
import type { GridSettings } from '@vectoria/editor-engine';
import { CleanupPanel } from '../cleanup/CleanupPanel.js';
import type { GeometryAction } from '../properties/GeometryProperties.js';

export type DockPanel = 'properties' | 'layers' | 'artboards' | 'history' | 'cleanup';

export interface RightDockProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  selectedObjectIds?: readonly ObjectId[];
  history: readonly HistoryEntry[];
  historyCursor: number;
  onHistoryJump: (cursor: number) => void;
  versions?: readonly DocumentVersion[];
  onSaveVersion?: (name: string) => void;
  onRestoreVersion?: (version: DocumentVersion) => void;
  onSelectObject: (id: ObjectId | null, additive?: boolean) => void;
  onSelectObjects?: (ids: readonly ObjectId[], additive?: boolean) => void;
  onUpdatePosition: (id: ObjectId, x: number, y: number) => void;
  onUpdateDimensions: (id: ObjectId, width: number, height: number) => void;
  onUpdateGroupTransform?: (ids: readonly ObjectId[], scaleX: number, scaleY: number, pivotWorld: { x: number; y: number }) => void;
  onUpdateLineEndpoint?: (id: ObjectId, endPoint: { x: number; y: number }) => void;
  onUpdateCornerRadius?: (id: ObjectId, radii: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
  onUpdateObjectStyle?: (id: ObjectId, patch: Partial<ObjectStyle>) => void;
  onUpdateRotation?: (id: ObjectId, degrees: number) => void;
  onUpdatePivot?: (id: ObjectId, pivot: { x: number; y: number }) => void;
  onUpdateSkew?: (id: ObjectId, axis: 'x' | 'y', degrees: number) => void;
  onAlign?: (alignment: import('@vectoria/core').Alignment, target: 'selection' | 'artboard' | 'key') => void;
  onDistribute?: (axis: 'horizontal' | 'vertical') => void;
  onReorder?: (direction: import('@vectoria/core').ReorderDirection) => void;
  onUpdateArtboard?: (width: number, height: number, background?: { type: 'transparent' } | { type: 'color'; color: string }) => void;
  onUpdateUnit?: (unit: DocumentUnit) => void;
  gridSettings?: GridSettings;
  onUpdateGridSettings?: (settings: GridSettings) => void;
  selection?: SelectionState;
  onUpdatePathNode?: (id: ObjectId, index: number, patch: Partial<Omit<PathNode, 'id'>>) => void;
  onUpdatePathNodeKind?: (id: ObjectId, index: number, kind: PathNode['kind']) => void;
  onUpdatePathClosed?: (id: ObjectId, closed: boolean) => void;
  onPathAction?: (action: PathAction) => void;
  geometryPreview?: GeometryPreview | null;
  onGeometryAction?: (action: GeometryAction) => void;
  onApplyGeometryPreview?: () => void;
  onCancelGeometryPreview?: () => void;
  onOpenCleanup?: () => void;
  cleanupPlan?: CleanupPlan;
  onCleanupSelectionChange?: (findingIds: readonly string[]) => void;
  onApplyCleanup?: () => void;
  onCancelCleanup?: () => void;
  onToggleObject?: (id: ObjectId, field: 'visible' | 'locked') => void;
  onSelectArtboard?: (id: string) => void;
  onCreateArtboard?: () => void;
  onDuplicateArtboard?: (id: string) => void;
  onDeleteArtboard?: (id: string) => void;
  onRenameArtboard?: (id: string, name: string) => void;
  onOrientArtboard?: (id: string, orientation: 'portrait' | 'landscape') => void;
  onToggleArtboardVisibility?: (id: string, visible: boolean) => void;
  activePanel?: DockPanel;
  onPanelChange?: (panel: DockPanel) => void;
  open: boolean;
  isDirty?: boolean;
}

const panels: readonly { id: DockPanel; label: string; icon: React.ComponentProps<typeof VectoriaIcon>['name'] }[] = [
  { id: 'properties', label: 'Właściwości', icon: 'sliders' as React.ComponentProps<typeof VectoriaIcon>['name'] },
  { id: 'layers', label: 'Warstwy', icon: 'layers' },
  { id: 'artboards', label: 'Artboardy', icon: 'grid' },
  { id: 'history', label: 'Historia', icon: 'history' },
  { id: 'cleanup', label: 'Clean Up', icon: 'check' as React.ComponentProps<typeof VectoriaIcon>['name'] },
];

 export const RightDock: React.FC<RightDockProps> = ({ document: doc, selectedObjectId, selectedObjectIds = [], history, historyCursor, onHistoryJump, versions, onSaveVersion, onRestoreVersion, onSelectObject, onSelectObjects, onUpdatePosition, onUpdateDimensions, onUpdateGroupTransform, onUpdateLineEndpoint, onUpdateCornerRadius, onUpdateFill, onUpdateObjectStyle, onUpdateRotation, onUpdatePivot, onUpdateSkew, onAlign, onDistribute, onReorder, onUpdateArtboard, onUpdateUnit, gridSettings, onUpdateGridSettings, selection, onUpdatePathNode, onUpdatePathNodeKind, onUpdatePathClosed, onPathAction, geometryPreview, onGeometryAction, onApplyGeometryPreview, onCancelGeometryPreview, onOpenCleanup, cleanupPlan, onCleanupSelectionChange, onApplyCleanup, onCancelCleanup, onToggleObject, onSelectArtboard, onCreateArtboard, onDuplicateArtboard, onDeleteArtboard, onRenameArtboard, onOrientArtboard, onToggleArtboardVisibility, activePanel: requestedPanel, onPanelChange, open, isDirty }) => {
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
          {activePanel === 'properties' && <PropertiesPanel document={doc} selectedObjectId={selectedObjectId} selectedObjectIds={selectedObjectIds} selection={selection} onUpdatePosition={onUpdatePosition} onUpdateDimensions={onUpdateDimensions} onUpdateGroupTransform={onUpdateGroupTransform} onUpdateLineEndpoint={onUpdateLineEndpoint} onUpdateCornerRadius={onUpdateCornerRadius} onUpdateFill={onUpdateFill} onUpdateObjectStyle={onUpdateObjectStyle} onUpdateRotation={onUpdateRotation} onUpdatePivot={onUpdatePivot} onUpdateSkew={onUpdateSkew} onAlign={onAlign} onDistribute={onDistribute} onReorder={onReorder} onUpdateArtboard={onUpdateArtboard} onUpdateUnit={onUpdateUnit} gridSettings={gridSettings} onUpdateGridSettings={onUpdateGridSettings} onUpdatePathNode={onUpdatePathNode} onUpdatePathNodeKind={onUpdatePathNodeKind} onUpdatePathClosed={onUpdatePathClosed} onPathAction={onPathAction} geometryPreview={geometryPreview} onGeometryAction={onGeometryAction} onApplyGeometryPreview={onApplyGeometryPreview} onCancelGeometryPreview={onCancelGeometryPreview} onOpenCleanup={onOpenCleanup} />}
         {activePanel === 'layers' && <LayersPanel document={doc} selectedObjectId={selectedObjectId} selectedObjectIds={selectedObjectIds} onSelectObject={onSelectObject} onSelectObjects={onSelectObjects} onToggleObject={onToggleObject} />}
            {activePanel === 'artboards' && onSelectArtboard && onCreateArtboard && onDuplicateArtboard && onDeleteArtboard && onRenameArtboard && onOrientArtboard && <ArtboardsPanel document={doc} onSelect={onSelectArtboard} onCreate={onCreateArtboard} onDuplicate={onDuplicateArtboard} onDelete={onDeleteArtboard} onRename={onRenameArtboard} onOrientation={onOrientArtboard} onVisibilityToggle={onToggleArtboardVisibility} />}
            {activePanel === 'history' && <HistoryPanel entries={history} cursor={historyCursor} onJump={onHistoryJump} versions={versions} onSaveVersion={onSaveVersion} onRestoreVersion={onRestoreVersion} isDirty={isDirty} />}
           {activePanel === 'cleanup' && cleanupPlan && <CleanupPanel plan={cleanupPlan} onChangeSelection={onCleanupSelectionChange ?? (() => undefined)} onApply={onApplyCleanup ?? (() => undefined)} onCancel={onCancelCleanup ?? (() => undefined)} />}
      </div>
    </aside>
  );
};
