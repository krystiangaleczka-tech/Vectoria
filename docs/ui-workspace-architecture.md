# Workspace UI architecture

Workspace shell owns layout and presentation state only. `EditorApp` remains source of truth for document, selection, camera, command execution, autosave and SVG export.

| Area | Responsibility | Domain boundary |
| --- | --- | --- |
| `AppMenuBar` / `DocumentTabs` | Navigation, global actions, save state and single-document tab presentation | Calls callbacks from `EditorApp`; never mutates document |
| `ContextualControlBar` | Compact controls for selected rectangle or active tool hint | Uses same geometry/style callbacks as `PropertiesPanel` |
| `ToolRail` | Tool configuration, active/disabled states and shortcuts | Updates `activeTool` only; disabled tools are honest “Wkrótce” affordances |
| `CanvasViewport` | Pan/zoom, hit testing, drag preview and pointer events | Commits mutations through `Command` instances on pointer-up |
| `RightDock` | Session-local panel selection and accessible tab semantics | Hosts presentation panels without duplicating selection or document state |
| `PropertiesPanel` | Existing geometry and fill editors | Executes commands through `EditorApp` callbacks |
| `LayersPanel` | Read-only document projection with selection callback | Visibility is disabled until domain command exists |
| `HistoryPanel` | Read-only projection of `CommandHistory` | Undo/redo remains only safe navigation mechanism |
| `StatusBar` | Concise projection of tool, selection, cursor, zoom and save state | Does not own state |

Canvas grid and rulers are presentation-only. They do not enter `DocumentModel` or SVG export.
