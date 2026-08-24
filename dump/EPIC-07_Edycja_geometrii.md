# EPIC-07 Edycja geometrii

## Meta

- Task: `EPIC-07_Edycja_geometrii.md`
- Date: 2026-08-24
- Scope: geometry operations, command history, preview sessions, cleanup review and UI integration
- Repository state: worktree contained pre-existing EPIC-05/06-related changes; they were not reverted or modified outside touched integration files.

## State Before

- Existing core had basic shape/path commands and renderer overlay support for selection/path previews.
- EPIC-07 geometry contracts, operation sessions, cleanup service and cleanup panel were missing.
- Tool Rail did not expose Corner Tool.

## State After

- Added immutable geometry operations for expand, corners, offset, outline stroke and cleanup scan.
- Added undoable commands for convert, corners, offset, outline, close, reverse, join and cleanup.
- Added engine operation session with preview/apply/cancel and Corner Tool state.
- Added renderer geometry preview overlay with labels, bounds and token-based feedback.
- Added Geometry Properties actions, Cleanup review panel, Object menu actions and destructive Convert confirmation with focus trap.
- Added Corner Tool to Tool Rail with `Q` shortcut and custom icon.
- Added core, engine and Playwright coverage.

## Implementation

- `packages/core/src/geometry/operations.ts`
- `packages/core/src/commands/geometry-commands.ts`
- `packages/editor-engine/src/operations/geometry-operation-session.ts`
- `packages/editor-engine/src/tools/corner-tool.ts`
- `packages/renderer/src/index.ts`
- `apps/web/src/features/properties/GeometryProperties.tsx`
- `apps/web/src/features/cleanup/CleanupPanel.tsx`
- `apps/web/src/features/panels/PropertiesPanel.tsx`
- `apps/web/src/features/panels/RightDock.tsx`
- `apps/web/src/features/canvas/CanvasViewport.tsx`
- `apps/web/src/features/topbar/AppMenuBar.tsx`
- `apps/web/src/features/topbar/TopBar.tsx`
- `apps/web/src/features/toolbar/ToolRail.tsx`
- `apps/web/src/app/EditorApp.tsx`
- `apps/web/src/app/editor.css`
- `packages/ui/src/icons/VectoriaIcon.tsx`
- `packages/core/src/index.ts`
- `packages/core/src/commands/index.ts`
- `packages/core/test/epic-07-geometry.test.ts`
- `packages/editor-engine/test/geometry-operation-session.test.ts`
- `apps/web/e2e/editor.spec.ts`

## Changes Per File

| File | Before | After | Purpose |
|---|---|---|---|
| `packages/core/src/geometry/operations.ts` | No EPIC-07 geometry contracts or pure operations. | Added `GeometryPreview`, cleanup contracts, expand, corner, offset, outline and cleanup scan functions with finite-value guards. | Keep geometry logic renderer/UI independent. |
| `packages/core/src/commands/geometry-commands.ts` | No command implementations for EPIC-07 operations. | Added atomic undoable commands for curves, corners, offset, outline, close, reverse, join and cleanup. | Route document mutations through command history. |
| `packages/core/src/index.ts` | Geometry operation API was not exported. | Exported geometry operations and contracts. | Make domain API available to engine and UI. |
| `packages/core/src/commands/index.ts` | Geometry commands were not exported. | Exported all new EPIC-07 commands. | Expose command dispatcher inputs. |
| `packages/core/test/epic-07-geometry.test.ts` | No EPIC-07 geometry tests. | Added tests for expand, corner modes/clamp, offset safety, outline, close/reverse, join, cleanup and invalid previews. | Protect invariants and execute/undo behavior. |
| `packages/editor-engine/src/operations/geometry-operation-session.ts` | No transient geometry operation lifecycle. | Added preview/apply/cancel session for expand, corners, offset, outline and cleanup. | Prevent preview mutations and group Apply into one command. |
| `packages/editor-engine/src/tools/corner-tool.ts` | No Corner Tool state machine. | Added start/update/preview/apply/cancel tool state. | Support screen-driven transient corner editing. |
| `packages/editor-engine/src/index.ts` | New engine APIs were unavailable to consumers. | Exported geometry session and Corner Tool. | Connect engine package boundary. |
| `packages/editor-engine/test/geometry-operation-session.test.ts` | No session tests. | Added transient preview and cancel tests. | Verify document remains unchanged before Apply. |
| `packages/renderer/src/index.ts` | Overlay rendered selection and path previews only. | Added geometry preview rendering with proposed geometry, bounds, label and token-based warning/accent feedback. | Distinguish transient proposals from document scene. |
| `apps/web/src/features/properties/GeometryProperties.tsx` | No geometry operation controls. | Added Convert, Corner Tool modes/radius, Offset controls, Close, Reverse, Outline and Cleanup actions. | Provide context-aware Object/Edit controls. |
| `apps/web/src/features/cleanup/CleanupPanel.tsx` | No cleanup review UI. | Added keyboard-accessible finding list, selection, Apply selected and Cancel. | Keep cleanup audit-first and reversible. |
| `apps/web/src/features/panels/PropertiesPanel.tsx` | Properties had no EPIC-07 operation section. | Mounted Geometry Properties and preview callbacks. | Integrate geometry actions into existing dock. |
| `apps/web/src/features/panels/RightDock.tsx` | Dock had no Cleanup tab. | Added Cleanup tab and cleanup/session callback wiring. | Host cleanup review in Right Dock. |
| `apps/web/src/features/canvas/CanvasViewport.tsx` | Canvas accepted no geometry preview. | Added preview prop and Corner Tool pointer lifecycle on overlay. | Keep pointer interaction transient until commit. |
| `apps/web/src/features/topbar/AppMenuBar.tsx` | Object menu had no geometry actions. | Added Convert to curves and Clean Up document menu items. | Expose actions through Object menu. |
| `apps/web/src/features/topbar/TopBar.tsx` | Top Bar did not pass geometry actions. | Forwarded selected IDs and geometry callbacks to menu bar. | Preserve UI layering. |
| `apps/web/src/features/toolbar/ToolRail.tsx` | Corner Tool was absent from Tool Rail. | Added Corner Tool with `Q` shortcut and accessible label. | Meet Design System tool-rail requirement. |
| `packages/ui/src/icons/VectoriaIcon.tsx` | No Corner Tool icon. | Added custom `corner` icon. | Provide non-color tool identification. |
| `apps/web/src/app/EditorApp.tsx` | App had no geometry session, cleanup state or destructive confirmation. | Added session lifecycle, cleanup scan/apply, preview state, confirm dialog with focus trap and command dispatch. | Coordinate domain, engine, renderer and autosave. |
| `apps/web/src/app/editor.css` | No geometry preview, cleanup or confirm-dialog styles. | Added token-based styles for operation cards, preview status, findings and confirm dialog. | Apply Design System density, status and accessibility rules. |
| `apps/web/e2e/editor.spec.ts` | No EPIC-07 browser workflow. | Added Convert to curves preview/confirm/history workflow. | Verify end-to-end destructive conversion. |
| `AGENTS.md` | DUMP-ONLY required changed-file listing but did not define per-file details. | Required `Changes Per File` records with exact path, before state, after change and rationale; requires explicit pre-existing markers. | Prevent future dumps from containing path-only summaries. |

## Pre-existing Worktree Files

These files were already modified or untracked before EPIC-07 implementation and were not changed as part of this epic. They remain listed so dump file inventory is explicit.

| File | State before session | Change in this session | Reason |
|---|---|---|---|
| `apps/web/src/features/panels/ContextualControlBar.tsx` | Already contained freehand controls. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/core/src/model/invariants.ts` | Already contained freehand/path invariant changes. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/core/src/model/types.ts` | Already contained width-profile/domain changes. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/core/src/commands/freehand-commands.ts` | Already untracked freehand command implementation. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/core/src/model/freehand.ts` | Already untracked freehand geometry implementation. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/core/test/freehand.test.ts` | Already untracked freehand tests. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/editor-engine/src/tools/brush-tool.ts` | Already untracked freehand tool. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/editor-engine/src/tools/eraser-tool.ts` | Already untracked freehand tool. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/editor-engine/src/tools/freehand-tools.ts` | Already untracked freehand tool collection. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/editor-engine/src/tools/knife-tool.ts` | Already untracked freehand tool. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/editor-engine/src/tools/pencil-tool.ts` | Already untracked freehand tool. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/editor-engine/src/tools/scissors-tool.ts` | Already untracked freehand tool. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/editor-engine/src/tools/smooth-tool.ts` | Already untracked freehand tool. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/editor-engine/src/tools/width-tool.ts` | Already untracked freehand tool. | No EPIC-07 change. | Preserve pre-existing work. |
| `packages/editor-engine/test/freehand-tools.test.ts` | Already untracked freehand tests. | No EPIC-07 change. | Preserve pre-existing work. |
| `pen-tool.md` | Already untracked Pen Tool notes. | No EPIC-07 change. | Preserve pre-existing work. |

## Validation

- `pnpm lint`: passed
- `pnpm typecheck`: passed
- `pnpm test`: 20 files, 143 tests passed
- `pnpm build`: passed
- `pnpm test:e2e`: 11 tests passed
- `git diff --check`: passed

## Limitations

- Current `DocumentModel` has no group tree, so empty-group cleanup is staged.
- Current `DocumentModel` has no style library/reference table, so unused-style cleanup is staged.
- Outline Stroke uses simplified sampled geometry; full dash/miter/cap/join fidelity remains staged.
- Offset and corner algorithms use bounded deterministic polygon/path approximations, not a full boolean geometry kernel.

## Next Safe Step

Add explicit group/style-library domain contracts before implementing empty-group and unused-style cleanup. Then add fixtures for dash, miter, concave offset and self-intersecting paths.
