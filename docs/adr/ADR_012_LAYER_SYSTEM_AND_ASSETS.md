# ADR-012: Layer Hierarchy System, Attribute Locking, and Asset Management

## Status
Accepted

## Context
EPIC-11 (`LAYER-001` through `LAYER-021`) requires a full-featured layer and asset management system for Vectoria:
1. **Layer Hierarchy**: Layers act as top-level z-index containers, holding arbitrary nested groups and objects without artificial recursion depth limits, with protection against circular parent-child references.
2. **Layer Metadata**: Layers require cosmetic labeling colors (`labelColor`), template mode (`isTemplate` - locked, dimmed, excluded from standard exports), inline renaming, visibility, locking, and reordering.
3. **Granular Attribute Locking**: In addition to whole-layer locking, objects require per-attribute locking (`position`, `size`, `rotation`, `style`, `content`).
4. **Alternative View Modes**: Ephemeral non-destructive view modes:
   - **Outline View**: Canvas wireframe render mode without fills or drop shadows (`Ctrl+Y`).
   - **Solo Mode**: Ephemeral isolated view for a single layer or object without mutating document persistence or polluting Undo history.
5. **Assets Panel**: Centralized workspace panel organizing reusable document resources (Symbols, Components, Object Styles, Color Palettes).

## Decisions

### 1. Layer Domain Model
Extend `Layer` in `packages/core/src/model/types.ts`:
```ts
export interface Layer {
  readonly id: LayerId;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly opacity: number;
  readonly objectIds: readonly ObjectId[];
  readonly labelColor?: string;
  readonly isTemplate?: boolean;
}
```
- `labelColor`: A curated 8-color organizational accent palette (`#ef4444`, `#f97316`, `#eab308`, `#22c55e`, `#06b6d4`, `#3b82f6`, `#a855f7`, `#ec4899`).
- `isTemplate`: Flags the layer as a non-printing/non-exporting background reference layer, rendered at 50% opacity by default.

### 2. Object Attribute Locking
Extend `SceneObjectBase` in `packages/core/src/model/types.ts`:
```ts
export type LockedAttribute = 'position' | 'size' | 'rotation' | 'style' | 'content';

export interface SceneObjectBase {
  // ...
  readonly lockedAttributes?: readonly LockedAttribute[];
}
```
- A command attempting to modify a locked attribute must check both `layer.locked` and `obj.lockedAttributes?.includes(attr)`.

### 3. Layer Commands and Invariants
- `CreateLayerCommand(name?: string, index?: number, isTemplate?: boolean)`: Creates a new layer at a specified index in `doc.layerIds`.
- `DeleteLayerCommand(layerId: LayerId)`: Removes the layer and all its contained objects. **Invariant**: Rejects deletion if `doc.layerIds.length <= 1`.
- `RenameLayerCommand(layerId: LayerId, name: string)`: Commits name changes after trim validation.
- `UpdateLayerPropertiesCommand(layerId: LayerId, patch: Partial<Layer>)`: Updates `visible`, `locked`, `opacity`, `labelColor`, `isTemplate`.
- `ReorderLayersCommand(layerIds: readonly LayerId[])`: Reorders layers in `doc.layerIds`.
- `MoveObjectsToLayerCommand(objectIds: readonly ObjectId[], targetLayerId: LayerId, targetIndex?: number)`: Moves objects between layers while maintaining world-space position.
- `LockObjectAttributesCommand(objectIds: readonly ObjectId[], attributes: readonly LockedAttribute[])`: Sets attribute locking.

### 4. Ephemeral View Modes
- `outlineMode` and `soloLayerId` are transient UI/renderer states passed to `renderScene` and `CanvasViewport`. They are not persisted to `.vct` and do not generate Undo history commands.

### 5. Assets Panel Architecture
- `AssetsPanel` lives in `RightDock` and reads directly from `doc.objectStyles`, `doc.palettes`, and document symbols.

## Consequences
- Clean separation between document persistence and ephemeral view states.
- 100% backward compatibility for `.vct` schema v1 through optional fields.
- Full Undo/Redo coverage for all layer structure changes.
