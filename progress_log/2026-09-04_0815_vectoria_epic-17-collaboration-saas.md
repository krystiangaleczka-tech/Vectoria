# Progress Log: 2026-09-04_0815_vectoria_epic-17-collaboration-saas
Date: 2026-09-04 08:15

## Meta
- **Area**: Workspace Multi-Project, IndexedDB Storage, Canvas Annotations, Version Restore Safety, Offline Indicator, Brand Kit Sharing, Architecture Decision Records (ADR)
- **Task**: EPIC-17: Współpraca i SaaS (Etap 1: Local-first)

## Summary
Zrealizowano Etap 1 (Local-first) epiku **EPIC-17: Współpraca i SaaS** w pełnej zgodności z architekturą edytora i design systemem. Wdrożono wieloprojektowy magazyn przestrzeni roboczej (workspace) w IndexedDB z folderami, tagami, wyszukiwarką i szablonami zespołowymi (`ProjectGallery`), domenowy system uwag/adnotacji przypiętych do współrzędnych świata na canvasie z nakładką DOM i przeciąganiem pinezek (`CanvasViewport`, `CommentsPanel`, wzmianki `@user`, status `resolved`, eksport do JSON i Markdown), bezpieczne okno modalne potwierdzenia przywracania wersji z historii (`HistoryPanel`), wskaźnik stanu offline w pasku stanu reagujący na zdarzenia sieciowe (`StatusBar`) oraz eksport/import zestawu marki (`.brandkit`). Opracowano 4 formalne rekordy decyzji architektonicznych: ADR-017, ADR-018, ADR-019 (bramka Etapu 2 pod backend) oraz ADR-020 (bramka Etapu 3 pod model konfliktów/realtime).

## Problem
- Vectoria była ograniczona do pracy na jednym dokumencie z pojedynczym stałym kluczem IndexedDB (`current_document`).
- Brak adnotacji i komentarzy na canvasie do pracy asynchronicznej.
- Przywracanie wersji projektu odbywało się natychmiastowo bez okna potwierdzenia, co niosło ryzyko przypadkowej utraty pracy.
- Brak wskaźnika pracy w trybie offline i synchronizacji z IndexedDB w pasku stanu.
- Brak możliwości eksportu i importu zestawu marki (Brand Kit) jako pliku.
- Brak formalnych specyfikacji architektonicznych dla domeny uwag, przestrzeni roboczej, autoryzacji serwerowej i rozstrzygania konfliktów.

## Implementation
1. **Architektura & ADR**:
   - `ADR-017`: Adnotacje w `DocumentModel.annotations` poza grafem obiektów sceny, Undo/Redo, DOM overlay.
   - `ADR-018`: Magazyn workspace w IndexedDB (`workspace` store), foldery, tagi, szablony.
   - `ADR-019`: Koperta synchronizacji `PersistedDocument` i role autoryzacji serwerowej (Etap 2 Gate).
   - `ADR-020`: Model konfliktów oparty na `revision` i CAS (Etap 3 Gate / SAAS-022).
2. **`packages/core`**:
   - Typ `CanvasAnnotation`, niezmienniki w `invariants.ts`.
   - Komendy: `AddAnnotationCommand`, `UpdateAnnotationCommand`, `DeleteAnnotationCommand`, `MoveAnnotationPinCommand`.
   - Testy jednostkowe w `test/annotations.test.ts`.
3. **`packages/io`**:
   - `DocumentV1Schema` rozszerzony o `CanvasAnnotationSchema`.
   - `IndexedDBWorkspaceRepository` oraz `MemoryWorkspaceRepository` (store `workspace`, wersja bazy 4).
   - `workspace-export.ts`: Eksport uwag do JSON/Markdown oraz Brand Kit do `.brandkit`.
   - Wstrzykiwanie repozytorium w `document-store.ts`.
   - Testy jednostkowe w `test/workspace-repository.test.ts` i `test/workspace-export.test.ts`.
4. **`packages/editor-engine`**:
   - Flaga `readOnly` w `EditorContext` i `isMutating` w `EditorCommand`.
   - Test w `test/readonly-gate.test.ts`.
5. **`apps/web`**:
   - Komponent `ProjectGallery.tsx` i hook `useWorkspace.ts`.
   - Komponent `CommentsPanel.tsx`, hook `useComments.ts` i interaktywne pinezki w `CanvasViewport.tsx`.
   - Modal potwierdzenia przywracania wersji w `HistoryPanel.tsx`.
   - Wskaźnik `Offline (IndexedDB)` w `StatusBar.tsx`.
   - Eksport/import Brand Kit w `AssetsPanel.tsx` i `RightDock.tsx`.
   - Pasek zakładek i menu: `DocumentTabs.tsx`, `TopBar.tsx`, `AppMenuBar.tsx`.
   - Koordynacja stanu w `EditorApp.tsx`.
   - Nowy plik testów Playwright: `e2e/workspace-collaboration.spec.ts`.
6. **Dokumentacja**:
   - Zaktualizowano `BACKLOG.md` (odhaczono zadania SAAS-002..005, SAAS-012..022), `epics/EPIC-17_Wspolpraca_i_SaaS.md` oraz `plans/PLAN_EPIC-17_wspolpraca_i_saas.md`.

## Validation
- `pnpm typecheck`: 0 błędów we wszystkich pakietach.
- `pnpm lint`: 0 błędów, 0 ostrzeżeń.
- `pnpm test`: 77 plików testowych, 410 testów jednostkowych zaliczonych (100%).
- `pnpm exec playwright test`: 29/29 testów E2E zaliczonych (25 regresji + 4 nowe).
- `pnpm build`: Czysty build produkcyjny Vite PWA w 2.04s.

## Files Changed
- `docs/adr/ADR_017_ANNOTATIONS_DOMAIN_AND_CANVAS_PINS.md`
- `docs/adr/ADR_018_WORKSPACE_MULTI_PROJECT_STORAGE.md`
- `docs/adr/ADR_019_BACKEND_SYNC_ENVELOPE_AND_ROLES.md`
- `docs/adr/ADR_020_CONFLICT_RESOLUTION_AND_REALTIME_STRATEGY.md`
- `packages/core/src/model/types.ts`
- `packages/core/src/model/invariants.ts`
- `packages/core/src/commands/comment-commands.ts`
- `packages/core/src/commands/index.ts`
- `packages/core/test/annotations.test.ts`
- `packages/io/src/schema/document-v1.ts`
- `packages/io/src/storage/document-repository.ts`
- `packages/io/src/storage/indexeddb-repository.ts`
- `packages/io/src/storage/workspace-repository.ts`
- `packages/io/src/storage/workspace-export.ts`
- `packages/io/src/storage/document-store.ts`
- `packages/io/src/index.ts`
- `packages/io/test/workspace-repository.test.ts`
- `packages/io/test/workspace-export.test.ts`
- `packages/editor-engine/src/commands/command-registry.ts`
- `packages/editor-engine/test/readonly-gate.test.ts`
- `apps/web/src/features/workspace/useWorkspace.ts`
- `apps/web/src/features/workspace/ProjectGallery.tsx`
- `apps/web/src/features/comments/useComments.ts`
- `apps/web/src/features/comments/CommentsPanel.tsx`
- `apps/web/src/features/canvas/CanvasViewport.tsx`
- `apps/web/src/features/panels/HistoryPanel.tsx`
- `apps/web/src/features/panels/AssetsPanel.tsx`
- `apps/web/src/features/panels/RightDock.tsx`
- `apps/web/src/features/statusbar/StatusBar.tsx`
- `apps/web/src/features/topbar/DocumentTabs.tsx`
- `apps/web/src/features/topbar/TopBar.tsx`
- `apps/web/src/features/topbar/AppMenuBar.tsx`
- `apps/web/src/app/EditorApp.tsx`
- `apps/web/e2e/workspace-collaboration.spec.ts`
- `BACKLOG.md`
- `epics/EPIC-17_Wspolpraca_i_SaaS.md`
- `plans/PLAN_EPIC-17_wspolpraca_i_saas.md`

## Outcome & Known Limitations
- Wszystkie wymagania Etapu 1 (Local-first) zostały zrealizowane bez naruszenia lokalnej integralności danych, determinizmu Undo/Redo ani płynności edytora.
- Zadania Etapu 2 (konta w chmurze, linki, autoryzacja serwerowa) oraz Etapu 3 (realtime co-editing) są opisane i zablokowane bramkowo w ADR-019 i ADR-020, zgodnie z zasadą stabilizacji rdzenia przed wdrożeniem współedycji na żywo.
