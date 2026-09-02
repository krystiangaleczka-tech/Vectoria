import React, { useState } from 'react';
import type { DocumentModel, ObjectId, ObjectStyle, DocumentUnit, HistoryEntry, PathNode, SelectionState, GeometryPreview, CleanupPlan } from '@vectoria/core';
import type { DocumentVersion } from '@vectoria/io';
import { VectoriaIcon } from '@vectoria/ui';
import { HistoryPanel } from './HistoryPanel.js';
import { LayersPanel } from './LayersPanel.js';
import { PropertiesPanel, type PathAction } from './PropertiesPanel.js';
import { ArtboardsPanel } from './ArtboardsPanel.js';
import { AppearancePanel } from './AppearancePanel.js';
import type { GridSettings } from '@vectoria/editor-engine';
import { CleanupPanel } from '../cleanup/CleanupPanel.js';
import { PalettesPanel } from './PalettesPanel.js';
import { ObjectStylesPanel } from './ObjectStylesPanel.js';
import type { GeometryAction } from '../properties/GeometryProperties.js';
import { LinksPanel } from './LinksPanel.js';

import { AssetsPanel } from './AssetsPanel.js';

export type DockPanel = 'properties' | 'appearance' | 'layers' | 'assets' | 'links' | 'artboards' | 'history' | 'palettes' | 'object-styles' | 'cleanup';

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
  onUpdateParametric?: (id: ObjectId, patch: import('./PropertiesPanel.js').ParametricPatch) => void;
  onUpdateArrowheads?: (id: ObjectId, markerStart: { type: 'arrow' | 'triangle' | 'circle' | 'square'; size: number } | null, markerEnd: { type: 'arrow' | 'triangle' | 'circle' | 'square'; size: number } | null) => void;
  onUpdateLineEndpoint?: (id: ObjectId, endPoint: { x: number; y: number }) => void;
  onUpdateCornerRadius?: (id: ObjectId, radii: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }) => void;
  onUpdateFill: (id: ObjectId, color: string | null) => void;
  onUpdateObjectStyle?: (id: ObjectId, patch: Partial<ObjectStyle>) => void;
  onAddEffect?: (effect: import('@vectoria/core').LiveEffect) => void;
  onUpdateEffect?: (effectId: string, patch: Partial<import('@vectoria/core').LiveEffect>) => void;
  onRemoveEffect?: (effectId: string) => void;
  onReorderEffect?: (fromIndex: number, toIndex: number) => void;
  onToggleEffect?: (effectId: string, visible: boolean) => void;
  onExpandEffects?: () => void;
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
  onExecuteCommand?: (command: import('@vectoria/core').Command) => void;
  onUpdateTypography?: (id: ObjectId, patch: Partial<import('@vectoria/core').TextFrameObject>) => void;
  onConvertToOutlines?: (id: ObjectId) => void;
  onSetTextOnPath?: (id: ObjectId, pathId?: ObjectId) => void;
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
  activeLayerId?: string;
  soloLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
  onCreateLayer?: (isTemplate?: boolean) => void;
  onDeleteLayer?: (layerId: string) => void;
  onRenameLayer?: (layerId: string, nextName: string) => void;
  onUpdateLayer?: (layerId: string, patch: Partial<import('@vectoria/core').Layer>) => void;
  onReorderLayers?: (layerIds: readonly string[]) => void;
  onMoveObjectsToLayer?: (objectIds: readonly string[], targetLayerId: string) => void;
  onMoveHierarchyObjects?: (objectIds: readonly string[], target: import('@vectoria/core').HierarchyDropTarget) => void;
  onToggleSoloLayer?: (layerId: string) => void;
  onSelectAllInLayer?: (layerId: string) => void;
  activePanel?: DockPanel;
  onPanelChange?: (panel: DockPanel) => void;
  open: boolean;
  isDirty?: boolean;
  libraryPalettes?: readonly import('@vectoria/core').ColorPalette[];
  onLibraryPalettesChange?: (palettes: readonly import('@vectoria/core').ColorPalette[]) => void;
  onApplyPaletteFill?: (fill: import('@vectoria/core').FillStyle) => void;
  onUpsertDocumentPalette?: (palette: import('@vectoria/core').ColorPalette) => void;
  onDeleteDocumentPalette?: (id: string) => void;
  onSaveObjectStyle?: (style: import('@vectoria/core').SavedObjectStyle) => void;
  onApplyObjectStyle?: (style: import('@vectoria/core').ObjectStyle) => void;
  onDeleteObjectStyle?: (id: string) => void;
  onUpdateImageProperties?: (id: ObjectId, patch: Partial<import('@vectoria/core').ImageObject>) => void;
  onCropImage?: (id: ObjectId, crop: import('@vectoria/core').ImageCrop | undefined) => void;
  onOpenTraceImage?: (image: import('@vectoria/core').ImageObject) => void;
  onDetachSymbolInstance?: (id: ObjectId) => void;
  onInsertSymbol?: (symbolId: string) => void;
  onCreateSymbolFromSelection?: () => void;
  onInsertStockSvg?: (svgData: string, name: string) => void;
  onApplyBrandFont?: (fontFamily: string) => void;
  onAddBrandLogo?: (file: File) => void;
  onEmbedImage?: (objectId: string) => void;
  onRelinkImage?: (objectId: string, file: File) => void;
}

const panels: readonly { id: DockPanel; label: string; icon: React.ComponentProps<typeof VectoriaIcon>['name'] }[] = [
  { id: 'properties', label: 'Właściwości', icon: 'sliders' as React.ComponentProps<typeof VectoriaIcon>['name'] },
  { id: 'layers', label: 'Warstwy', icon: 'layers' },
  { id: 'assets', label: 'Zasoby', icon: 'folder' },
  { id: 'links', label: 'Linki', icon: 'link' },
  { id: 'artboards', label: 'Artboardy', icon: 'grid' },
  { id: 'history', label: 'Historia', icon: 'history' },
  { id: 'palettes', label: 'Palety', icon: 'grid' },
  { id: 'object-styles', label: 'Style', icon: 'sliders' as React.ComponentProps<typeof VectoriaIcon>['name'] },
  { id: 'cleanup', label: 'Clean Up', icon: 'check' as React.ComponentProps<typeof VectoriaIcon>['name'] },
];

export const RightDock: React.FC<RightDockProps> = ({
  document: doc,
  selectedObjectId,
  selectedObjectIds = [],
  history,
  historyCursor,
  onHistoryJump,
  versions,
  onSaveVersion,
  onRestoreVersion,
  onSelectObject,
  onSelectObjects,
  onUpdatePosition,
  onUpdateDimensions,
  onUpdateGroupTransform,
  onUpdateParametric,
  onUpdateArrowheads,
  onUpdateTypography,
  onConvertToOutlines,
  onSetTextOnPath,
  onUpdateLineEndpoint,
  onUpdateCornerRadius,
  onUpdateFill,
  onUpdateObjectStyle,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  onReorderEffect,
  onToggleEffect,
  onExpandEffects,
  onUpdateRotation,
  onUpdatePivot,
  onUpdateSkew,
  onAlign,
  onDistribute,
  onReorder,
  onUpdateArtboard,
  onUpdateUnit,
  gridSettings,
  onUpdateGridSettings,
  selection,
  onUpdatePathNode,
  onUpdatePathNodeKind,
  onUpdatePathClosed,
  onPathAction,
  onExecuteCommand,
  geometryPreview,
  onGeometryAction,
  onApplyGeometryPreview,
  onCancelGeometryPreview,
  onOpenCleanup,
  cleanupPlan,
  onCleanupSelectionChange,
  onApplyCleanup,
  onCancelCleanup,
  onToggleObject,
  onSelectArtboard,
  onCreateArtboard,
  onDuplicateArtboard,
  onDeleteArtboard,
  onRenameArtboard,
  onOrientArtboard,
  onToggleArtboardVisibility,
  activeLayerId,
  soloLayerId,
  onSelectLayer,
  onCreateLayer,
  onDeleteLayer,
  onRenameLayer,
  onUpdateLayer,
  onReorderLayers,
  onMoveObjectsToLayer,
  onMoveHierarchyObjects,
  onToggleSoloLayer,
  onSelectAllInLayer,
  activePanel: requestedPanel,
  onPanelChange,
  open,
  isDirty,
  libraryPalettes = [],
  onLibraryPalettesChange,
  onApplyPaletteFill,
  onUpsertDocumentPalette,
  onDeleteDocumentPalette,
  onSaveObjectStyle,
  onApplyObjectStyle,
  onDeleteObjectStyle,
  onUpdateImageProperties,
  onCropImage,
  onOpenTraceImage,
  onDetachSymbolInstance,
  onInsertSymbol,
  onCreateSymbolFromSelection,
  onInsertStockSvg,
  onApplyBrandFont,
  onAddBrandLogo,
  onEmbedImage,
  onRelinkImage,
}) => {
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
        {panels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            role="tab"
            id={`tab-${panel.id}`}
            className={`dock-tab ${activePanel === panel.id ? 'is-active' : ''}`}
            aria-selected={activePanel === panel.id}
            aria-controls={`panel-${panel.id}`}
            tabIndex={activePanel === panel.id ? 0 : -1}
            onClick={() => selectPanel(panel.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') moveTab(1);
              if (event.key === 'ArrowLeft') moveTab(-1);
              if (event.key === 'Home') selectPanel('properties');
              if (event.key === 'End') selectPanel('history');
            }}
          >
            <VectoriaIcon name={panel.icon} size={15} />
            <span>{panel.label}</span>
          </button>
        ))}
      </div>
      <div id={`panel-${activePanel}`} role="tabpanel" aria-labelledby={`tab-${activePanel}`} className="dock-panel">
        {activePanel === 'properties' && (
          <PropertiesPanel
            document={doc}
            selectedObjectId={selectedObjectId}
            selectedObjectIds={selectedObjectIds}
            selection={selection}
            onUpdatePosition={onUpdatePosition}
            onUpdateDimensions={onUpdateDimensions}
            onUpdateGroupTransform={onUpdateGroupTransform}
            onUpdateParametric={onUpdateParametric}
            onUpdateArrowheads={onUpdateArrowheads}
            onUpdateTypography={onUpdateTypography}
            onConvertToOutlines={onConvertToOutlines}
            onSetTextOnPath={onSetTextOnPath}
            onUpdateLineEndpoint={onUpdateLineEndpoint}
            onUpdateCornerRadius={onUpdateCornerRadius}
            onExecuteCommand={onExecuteCommand}
            onUpdateFill={onUpdateFill}
            onUpdateObjectStyle={onUpdateObjectStyle}
            onUpdateRotation={onUpdateRotation}
            onUpdatePivot={onUpdatePivot}
            onUpdateSkew={onUpdateSkew}
            onAlign={onAlign}
            onDistribute={onDistribute}
            onReorder={onReorder}
            onUpdateArtboard={onUpdateArtboard}
            onUpdateUnit={onUpdateUnit}
            gridSettings={gridSettings}
            onUpdateGridSettings={onUpdateGridSettings}
            onUpdatePathNode={onUpdatePathNode}
            onUpdatePathNodeKind={onUpdatePathNodeKind}
            onUpdatePathClosed={onUpdatePathClosed}
            onPathAction={onPathAction}
            geometryPreview={geometryPreview}
            onGeometryAction={onGeometryAction}
            onApplyGeometryPreview={onApplyGeometryPreview}
            onCancelGeometryPreview={onCancelGeometryPreview}
            onOpenCleanup={onOpenCleanup}
            onUpdateImageProperties={onUpdateImageProperties}
            onCropImage={onCropImage}
            onOpenTraceImage={onOpenTraceImage}
            onDetachSymbolInstance={onDetachSymbolInstance}
          />
        )}
        {activePanel === 'appearance' && (
          <AppearancePanel
            document={doc}
            selectedObjectId={selectedObjectId}
            selectedObjectIds={selectedObjectIds}
            onPatchStyle={(patch) => selectedObjectId !== null && onUpdateObjectStyle?.(selectedObjectId, patch)}
            onAddEffect={onAddEffect ?? (() => {})}
            onUpdateEffect={onUpdateEffect ?? (() => {})}
            onRemoveEffect={onRemoveEffect ?? (() => {})}
            onReorderEffect={onReorderEffect ?? (() => {})}
            onToggleEffect={onToggleEffect ?? (() => {})}
            onExpandEffects={onExpandEffects ?? (() => {})}
          />
        )}
        {activePanel === 'layers' && (
          <LayersPanel
            document={doc}
            selectedObjectId={selectedObjectId}
            selectedObjectIds={selectedObjectIds}
            activeLayerId={activeLayerId}
            soloLayerId={soloLayerId}
            onSelectObject={onSelectObject}
            onSelectObjects={onSelectObjects}
            onToggleObject={onToggleObject}
            onSelectLayer={onSelectLayer}
            onCreateLayer={onCreateLayer}
            onDeleteLayer={onDeleteLayer}
            onRenameLayer={onRenameLayer}
            onUpdateLayer={onUpdateLayer}
            onReorderLayers={onReorderLayers}
            onMoveObjectsToLayer={onMoveObjectsToLayer}
            onMoveHierarchyObjects={onMoveHierarchyObjects}
            onToggleSoloLayer={onToggleSoloLayer}
            onSelectAllInLayer={onSelectAllInLayer}
          />
        )}
        {activePanel === 'assets' && (
          <AssetsPanel
            document={doc}
            onApplyObjectStyle={onApplyObjectStyle}
            onApplyPaletteColor={(color) => onApplyPaletteFill?.({ type: 'solid', color })}
            onInsertSymbol={onInsertSymbol}
            onCreateSymbolFromSelection={onCreateSymbolFromSelection}
            onInsertStockSvg={onInsertStockSvg}
            onApplyBrandFont={onApplyBrandFont}
            onAddBrandLogo={onAddBrandLogo}
          />
        )}
        {activePanel === 'links' && (
          <LinksPanel
            doc={doc}
            onSelectObject={(id) => onSelectObject(id)}
            onEmbedImage={(id) => onEmbedImage?.(id)}
            onRelinkImage={(id, file) => onRelinkImage?.(id, file)}
          />
        )}
        {activePanel === 'artboards' && onSelectArtboard && onCreateArtboard && onDuplicateArtboard && onDeleteArtboard && onRenameArtboard && onOrientArtboard && (
          <ArtboardsPanel
            document={doc}
            onSelect={onSelectArtboard}
            onCreate={onCreateArtboard}
            onDuplicate={onDuplicateArtboard}
            onDelete={onDeleteArtboard}
            onRename={onRenameArtboard}
            onOrientation={onOrientArtboard}
            onVisibilityToggle={onToggleArtboardVisibility}
          />
        )}
        {activePanel === 'history' && (
          <HistoryPanel
            entries={history}
            cursor={historyCursor}
            onJump={onHistoryJump}
            versions={versions}
            onSaveVersion={onSaveVersion}
            onRestoreVersion={onRestoreVersion}
            isDirty={isDirty}
          />
        )}
        {activePanel === 'palettes' && onLibraryPalettesChange && onApplyPaletteFill && onUpsertDocumentPalette && onDeleteDocumentPalette && (
          <PalettesPanel
            documentPalettes={doc.palettes ?? []}
            libraryPalettes={libraryPalettes}
            hasSelection={selectedObjectIds.length > 0}
            onApplyFill={onApplyPaletteFill}
            onUpsertDocumentPalette={onUpsertDocumentPalette}
            onDeleteDocumentPalette={onDeleteDocumentPalette}
            onLibraryChange={onLibraryPalettesChange}
          />
        )}
        {activePanel === 'object-styles' && onSaveObjectStyle && onApplyObjectStyle && onDeleteObjectStyle && (
          <ObjectStylesPanel
            styles={doc.objectStyles ?? []}
            selectedStyle={selectedObjectId ? doc.objects[selectedObjectId]?.style ?? null : null}
            hasSelection={selectedObjectIds.length > 0}
            onSave={onSaveObjectStyle}
            onApply={onApplyObjectStyle}
            onDelete={onDeleteObjectStyle}
          />
        )}
        {activePanel === 'cleanup' && cleanupPlan && (
          <CleanupPanel
            plan={cleanupPlan}
            onChangeSelection={onCleanupSelectionChange ?? (() => undefined)}
            onApply={onApplyCleanup ?? (() => undefined)}
            onCancel={onCancelCleanup ?? (() => undefined)}
          />
        )}
      </div>
    </aside>
  );
};
