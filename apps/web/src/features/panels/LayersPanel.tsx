import React, { useState } from 'react';
import type { DocumentModel, LayerId, ObjectId, SceneObject } from '@vectoria/core';
import { IconButton, VectoriaIcon, ConfirmDialog } from '@vectoria/ui';

export interface LayersPanelProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  selectedObjectIds?: readonly ObjectId[];
  activeLayerId?: LayerId;
  soloLayerId?: LayerId | null;
  onSelectObject: (id: ObjectId, additive?: boolean) => void;
  onSelectObjects?: (ids: readonly ObjectId[], additive?: boolean) => void;
  onToggleObject?: (id: ObjectId, field: 'visible' | 'locked') => void;
  onSelectLayer?: (layerId: LayerId) => void;
  onCreateLayer?: (isTemplate?: boolean) => void;
  onDeleteLayer?: (layerId: LayerId) => void;
  onRenameLayer?: (layerId: LayerId, nextName: string) => void;
  onUpdateLayer?: (layerId: LayerId, patch: Partial<import('@vectoria/core').Layer>) => void;
  onReorderLayers?: (layerIds: readonly LayerId[]) => void;
  onMoveObjectsToLayer?: (objectIds: readonly ObjectId[], targetLayerId: LayerId) => void;
  onMoveHierarchyObjects?: (objectIds: readonly ObjectId[], target: import('@vectoria/core').HierarchyDropTarget) => void;
  onToggleSoloLayer?: (layerId: LayerId) => void;
  onSelectAllInLayer?: (layerId: LayerId) => void;
}

const LABEL_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Teal
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
] as const;

type FilterType = 'all' | 'locked' | 'hidden' | 'text' | 'path' | 'group';

const objectIcon: Record<SceneObject['type'], React.ComponentProps<typeof VectoriaIcon>['name']> = {
  rectangle: 'rectangle',
  ellipse: 'ellipse',
  line: 'line',
  path: 'pen',
  group: 'folder',
  polygon: 'polygon',
  star: 'star',
  arc: 'arc',
  pie: 'pie',
  ring: 'ring',
  spiral: 'spiral',
  callout: 'callout',
  polyline: 'polyline',
  text: 'text',
  'text-frame': 'textFrame',
  image: 'image',
  'symbol-instance': 'symbol',
};

export const LayersPanel: React.FC<LayersPanelProps> = ({
  document: doc,
  selectedObjectId,
  selectedObjectIds = [],
  activeLayerId: requestedActiveLayerId,
  soloLayerId,
  onSelectObject,
  onSelectObjects,
  onToggleObject,
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
}) => {
  void onSelectObjects;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [editingLayerId, setEditingLayerId] = useState<LayerId | null>(null);
  const [layerNameDraft, setLayerNameDraft] = useState('');
  const [collapsedLayers, setCollapsedLayers] = useState<Record<LayerId, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<ObjectId, boolean>>({});
  const [draggedLayerId, setDraggedLayerId] = useState<LayerId | null>(null);
  const [draggedObjectId, setDraggedObjectId] = useState<ObjectId | null>(null);
  const [activeColorPickerLayerId, setActiveColorPickerLayerId] = useState<LayerId | null>(null);
  const [layerToDelete, setLayerToDelete] = useState<{ id: LayerId; name: string } | null>(null);

  const activeLayerId = requestedActiveLayerId ?? doc.activeLayerId;

  const toggleLayerCollapse = (layerId: LayerId) => {
    setCollapsedLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const toggleGroupCollapse = (groupId: ObjectId) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const startRename = (layerId: LayerId, currentName: string) => {
    setEditingLayerId(layerId);
    setLayerNameDraft(currentName);
  };

  const commitRename = (layerId: LayerId) => {
    if (editingLayerId === layerId && layerNameDraft.trim()) {
      onRenameLayer?.(layerId, layerNameDraft.trim());
    }
    setEditingLayerId(null);
  };

  // Filter and search predicate
  const matchesSearchAndFilter = (obj: SceneObject): boolean => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = obj.name.toLowerCase().includes(q);
      const textMatch = 'text' in obj && typeof obj.text === 'string' && obj.text.toLowerCase().includes(q);
      if (!nameMatch && !textMatch) return false;
    }

    if (activeFilter === 'locked' && !obj.locked && (!obj.lockedAttributes || obj.lockedAttributes.length === 0)) return false;
    if (activeFilter === 'hidden' && obj.visible) return false;
    if (activeFilter === 'text' && obj.type !== 'text' && obj.type !== 'text-frame') return false;
    if (activeFilter === 'path' && obj.type !== 'path' && obj.type !== 'line' && obj.type !== 'polyline') return false;
    if (activeFilter === 'group' && obj.type !== 'group') return false;

    return true;
  };

  // Render recursive object tree
  const renderObjectTree = (objectId: ObjectId, depth: number, parentLayerId: LayerId, visitedPath: Set<ObjectId> = new Set()): React.ReactNode => {
    if (visitedPath.has(objectId)) return null;

    const object = doc.objects[objectId];
    if (!object) return null;

    const nextVisited = new Set(visitedPath);
    nextVisited.add(objectId);

    const isGroup = object.type === 'group';
    const isCollapsed = collapsedGroups[objectId] ?? false;
    const isSelected = selectedObjectIds.includes(objectId) || selectedObjectId === objectId;
    const matches = matchesSearchAndFilter(object);

    // If searching/filtering and group has matching children, render group
    let hasMatchingChildren = false;
    if (isGroup) {
      const checkMatchingDescendants = (groupId: ObjectId, visited: Set<ObjectId>): boolean => {
        if (visited.has(groupId)) return false;
        const grp = doc.objects[groupId];
        if (!grp || grp.type !== 'group') return false;
        
        const v = new Set(visited);
        v.add(groupId);

        return grp.childIds.some((childId) => {
          const child = doc.objects[childId];
          if (!child) return false;
          if (matchesSearchAndFilter(child)) return true;
          if (child.type === 'group') {
            return checkMatchingDescendants(child.id, v);
          }
          return false;
        });
      };

      hasMatchingChildren = checkMatchingDescendants(object.id, new Set(visitedPath));
    }

    if (!matches && !hasMatchingChildren) {
      return null;
    }

    return (
      <div key={object.id} className="layer-item-wrapper">
        <div
          role="listitem"
          className={`layer-row ${isSelected ? 'is-selected' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            setDraggedObjectId(object.id);
            e.dataTransfer.setData('text/plain', object.id);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedObjectId && draggedObjectId !== object.id) {
              const rect = e.currentTarget.getBoundingClientRect();
              const relativeY = (e.clientY - rect.top) / Math.max(1, rect.height);
              let dropTarget: import('@vectoria/core').HierarchyDropTarget;
              if (isGroup && relativeY > 0.25 && relativeY < 0.75) {
                dropTarget = { type: 'inside', targetId: object.id };
              } else if (relativeY <= 0.5) {
                dropTarget = { type: 'before', targetId: object.id };
              } else {
                dropTarget = { type: 'after', targetId: object.id };
              }

              if (onMoveHierarchyObjects) {
                onMoveHierarchyObjects([draggedObjectId], dropTarget);
              } else {
                onMoveObjectsToLayer?.([draggedObjectId], parentLayerId);
              }
            }
            setDraggedObjectId(null);
          }}
        >
          {isGroup ? (
            <button
              type="button"
              className="layer-collapse-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleGroupCollapse(object.id);
              }}
              aria-label={isCollapsed ? 'Rozwiń grupę' : 'Zwiń grupę'}
            >
              <VectoriaIcon name={isCollapsed ? 'chevronDown' : 'chevronDown'} size={12} className={isCollapsed ? '-rotate-90' : ''} />
            </button>
          ) : (
            <span className="layer-tree-indent" style={{ width: 14 }} />
          )}

          <button
            type="button"
            className="layer-select-button"
            onClick={(event) => onSelectObject(object.id, event.shiftKey)}
            aria-label={`Zaznacz ${object.name}`}
            aria-pressed={isSelected}
          >
            <VectoriaIcon name={objectIcon[object.type] || 'layers'} size={14} />
            <span className="layer-name-label">{object.name}</span>
            {object.lockedAttributes && object.lockedAttributes.length > 0 && (
              <span className="layer-attr-badge" title={`Zablokowane: ${object.lockedAttributes.join(', ')}`}>
                <VectoriaIcon name="lock" size={10} />
              </span>
            )}
          </button>

          <div className="layer-row-actions">
            <IconButton
              size="sm"
              icon={<VectoriaIcon name={object.visible ? 'visible' : 'hidden'} size={13} />}
              label={`${object.name}: widoczność`}
              onClick={() => onToggleObject?.(object.id, 'visible')}
            />
            <IconButton
              size="sm"
              icon={<VectoriaIcon name={object.locked ? 'lock' : 'unlock'} size={13} />}
              label={`${object.name}: blokada`}
              onClick={() => onToggleObject?.(object.id, 'locked')}
            />
          </div>
        </div>

        {isGroup && !isCollapsed && (
          <div className="layer-group-children">
            {object.childIds.map((childId) => renderObjectTree(childId, depth + 1, parentLayerId, nextVisited))}
          </div>
        )}
      </div>
    );
  };

  // Reverse layerIds so top-most layer renders at top of list
  const displayLayerIds = [...doc.layerIds].reverse();

  return (
    <section className="dock-panel-content layers-panel" data-testid="layers-panel" aria-label="Warstwy">
      {/* Panel Top Heading with Search & Create Actions */}
      <div className="panel-section-heading layers-heading">
        <div className="layers-heading-left">
          <span>Warstwy i Obiekty</span>
          <span className="panel-count">{doc.layerIds.length}</span>
        </div>
        <div className="layers-heading-actions">
          <IconButton
            size="sm"
            icon={<VectoriaIcon name="plus" size={14} />}
            label="Nowa warstwa"
            data-testid="create-layer-button"
            onClick={() => onCreateLayer?.(false)}
          />
          <IconButton
            size="sm"
            icon={<VectoriaIcon name="templateLayer" size={14} />}
            label="Nowa warstwa szablonu"
            data-testid="create-template-layer-button"
            onClick={() => onCreateLayer?.(true)}
          />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="layers-filter-bar">
        <div className="layers-search-box">
          <VectoriaIcon name="search" size={13} className="layers-search-icon" />
          <input
            type="search"
            placeholder="Szukaj w warstwach…"
            aria-label="Szukaj w warstwach"
            data-testid="layers-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="layers-filter-select"
          aria-label="Filtruj warstwy"
          data-testid="layers-filter-select"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as FilterType)}
        >
          <option value="all">Wszystko</option>
          <option value="locked">Zablokowane</option>
          <option value="hidden">Ukryte</option>
          <option value="text">Tekst</option>
          <option value="path">Ścieżki</option>
          <option value="group">Grupy</option>
        </select>
      </div>

      {/* Layers List */}
      <div className="layers-tree-container" role="tree" aria-label="Hierarchia warstw">
        {displayLayerIds.map((layerId) => {
          const layer = doc.layers[layerId];
          if (!layer) return null;

          const isLayerActive = layerId === activeLayerId;
          const isCollapsed = collapsedLayers[layerId] ?? false;
          const isSolo = soloLayerId === layerId;
          const isLastLayer = doc.layerIds.length <= 1;

          return (
            <div
              key={layer.id}
              className={`layer-tree-branch ${isLayerActive ? 'is-active-layer' : ''} ${layer.isTemplate ? 'is-template-layer' : ''}`}
              draggable
              onDragStart={(e) => {
                setDraggedLayerId(layer.id);
                e.dataTransfer.setData('text/plain', layer.id);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedLayerId && draggedLayerId !== layer.id) {
                  const currentIds = [...doc.layerIds];
                  const fromIdx = currentIds.indexOf(draggedLayerId);
                  const toIdx = currentIds.indexOf(layer.id);
                  if (fromIdx !== -1 && toIdx !== -1) {
                    currentIds.splice(fromIdx, 1);
                    currentIds.splice(toIdx, 0, draggedLayerId);
                    onReorderLayers?.(currentIds);
                  }
                } else if (draggedObjectId) {
                  if (onMoveHierarchyObjects) {
                    onMoveHierarchyObjects([draggedObjectId], { type: 'layer', targetLayerId: layer.id });
                  } else {
                    onMoveObjectsToLayer?.([draggedObjectId], layer.id);
                  }
                }
                setDraggedLayerId(null);
                setDraggedObjectId(null);
              }}
            >
              {/* Layer Header Row */}
              <div
                className={`layer-header-row ${isLayerActive ? 'is-selected' : ''}`}
                onClick={() => onSelectLayer?.(layer.id)}
                onDoubleClick={() => startRename(layer.id, layer.name)}
              >
                <button
                  type="button"
                  className="layer-collapse-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerCollapse(layer.id);
                  }}
                  aria-label={isCollapsed ? 'Rozwiń warstwę' : 'Zwiń warstwę'}
                >
                  <VectoriaIcon name="chevronDown" size={12} className={isCollapsed ? '-rotate-90' : ''} />
                </button>

                {/* Layer Color Accent Badge / Selector */}
                <div className="layer-color-badge-container">
                  <button
                    type="button"
                    className="layer-color-badge"
                    style={{ backgroundColor: layer.labelColor || '#71717a' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveColorPickerLayerId(activeColorPickerLayerId === layer.id ? null : layer.id);
                    }}
                    title="Kolor etykiety warstwy"
                    aria-label="Wybierz kolor etykiety warstwy"
                  />
                  {activeColorPickerLayerId === layer.id && (
                    <div className="layer-color-popover" onClick={(e) => e.stopPropagation()}>
                      {LABEL_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="layer-color-swatch"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            onUpdateLayer?.(layer.id, { labelColor: color });
                            setActiveColorPickerLayerId(null);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Layer Name / Inline Edit */}
                {editingLayerId === layer.id ? (
                  <input
                    type="text"
                    className="layer-name-input"
                    value={layerNameDraft}
                    autoFocus
                    onChange={(e) => setLayerNameDraft(e.target.value)}
                    onBlur={() => commitRename(layer.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(layer.id);
                      if (e.key === 'Escape') setEditingLayerId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="layer-header-title">
                    <span className="layer-header-name">{layer.name}</span>
                    {layer.isTemplate && <span className="layer-template-tag">SZABLON</span>}
                    <span className="layer-objects-count">({layer.objectIds.length})</span>
                  </div>
                )}

                {/* Layer Action Icons */}
                <div className="layer-header-actions" onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    size="sm"
                    icon={<VectoriaIcon name={isSolo ? 'soloMode' : 'soloMode'} size={13} className={isSolo ? 'text-primary' : 'opacity-60'} />}
                    label={isSolo ? 'Wyjdź z trybu Solo' : 'Włącz tryb Solo dla warstwy'}
                    onClick={() => onToggleSoloLayer?.(layer.id)}
                  />
                  <IconButton
                    size="sm"
                    icon={<VectoriaIcon name={layer.visible ? 'visible' : 'hidden'} size={13} />}
                    label={`${layer.name}: widoczność`}
                    onClick={() => onUpdateLayer?.(layer.id, { visible: !layer.visible })}
                  />
                  <IconButton
                    size="sm"
                    icon={<VectoriaIcon name={layer.locked ? 'lock' : 'unlock'} size={13} />}
                    label={`${layer.name}: blokada`}
                    onClick={() => onUpdateLayer?.(layer.id, { locked: !layer.locked })}
                  />
                  <IconButton
                    size="sm"
                    icon={<VectoriaIcon name="select" size={13} />}
                    label="Zaznacz wszystko w warstwie"
                    onClick={() => onSelectAllInLayer?.(layer.id)}
                  />
                  {!isLastLayer && (
                    <IconButton
                      size="sm"
                      icon={<VectoriaIcon name="trash" size={13} />}
                      label={`Usuń warstwę ${layer.name}`}
                      onClick={() => setLayerToDelete({ id: layer.id, name: layer.name })}
                    />
                  )}
                </div>
              </div>

              {/* Layer Object Children */}
              {!isCollapsed && (
                <div className="layer-children-container" role="list">
                  {layer.objectIds.length === 0 ? (
                    <div className="layer-empty-slot">Pusta warstwa (przeciągnij obiekty)</div>
                  ) : (
                    layer.objectIds.map((objectId) => renderObjectTree(objectId, 1, layer.id))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {layerToDelete && (
        <ConfirmDialog
          title={`Usunąć warstwę „${layerToDelete.name}”?`}
          description="Wszystkie obiekty w tej warstwie zostaną usunięte. Operację można cofnąć za pomocą Cofnij (Undo)."
          confirmLabel="Usuń warstwę"
          destructive
          onConfirm={() => {
            onDeleteLayer?.(layerToDelete.id);
            setLayerToDelete(null);
          }}
          onCancel={() => setLayerToDelete(null)}
          testId="confirm-delete-layer-dialog"
        />
      )}
    </section>
  );
};
