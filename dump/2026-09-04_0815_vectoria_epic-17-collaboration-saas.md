# Dump: 2026-09-04_0815_vectoria_epic-17-collaboration-saas
Date: 2026-09-04 08:15

## Metadata
- **Task**: EPIC-17: Współpraca i SaaS (Etap 1: Local-first)
- **Branch**: master
- **Status**: Complete & Verified (Quality gates green)

## Problem
1. Vectoria była ograniczona do pojedynczego aktywnego dokumentu pod sztywnym kluczem IndexedDB (`current_document`), brakowało wieloprojektowej przestrzeni roboczej (workspace), folderów, tagów, szablonów zespołowych i wyszukiwarki dokumentów.
2. Brak adnotacji/komentarzy przypiętych do współrzędnych świata na canvasie, brak oznaczania wzmianek `@user`, brak statusu `resolved` oraz możliwości eksportu dyskusji do JSON i Markdown.
3. Brak modalnego potwierdzenia przy przywracaniu nazwanej wersji dokumentu z historii, co stwarzało ryzyko przypadkowego nadpisania niezapisanych zmian.
4. Brak wskaźnika stanu synchronizacji i trybu offline w pasku stanu (aplikacja nie reagowała na zdarzenia sieciowe `online`/`offline`).
5. Brak mechanizmu wymiany zestawu marki (Brand Kit) na poziomie workspace poprzez pliki `.brandkit`.
6. Brak formalnych decyzji architektonicznych (ADR) definiujących model adnotacji, magazyn przestrzeni roboczej, kopertę synchronizacji backendowej z rolami oraz model wykrywania i rozstrzygania konfliktów (LWW/CAS).

## Implementation Details

1. **Architektura i ADR (`docs/adr/ADR_017...020`)**:
   - `ADR-017`: Adnotacje w `DocumentModel.annotations: readonly CanvasAnnotation[]` (poza grafem obiektów sceny), pełne Undo/Redo oraz renderowanie interaktywnych pinezek w nakładce DOM w `CanvasViewport.tsx`.
   - `ADR-018`: Wielodokumentowy magazyn przestrzeni roboczej w IndexedDB (`workspace` store), foldery, tagi, szablony i wyszukiwarka; wstrzykiwanie repozytorium do `document-store.ts`.
   - `ADR-019`: Dokument bramkowy Etapu 2 (koperta synchronizacji `PersistedDocument`, autoryzacja serwerowa, role viewer/commenter/editor/owner).
   - `ADR-020`: Dokument bramkowy Etapu 3 / SAAS-022 (model wykrywania konfliktów w oparciu o CAS na `revision`, reguła LWW i transiente kursory presence).

2. **Warstwa domenowa (`packages/core`)**:
   - `src/model/types.ts`: Dodano interfejs `CanvasAnnotation` oraz pole `DocumentModel.annotations?: readonly CanvasAnnotation[]`.
   - `src/model/invariants.ts`: Walidacja invariantów adnotacji (unikalność ID, skończone współrzędne, limit 500 adnotacji, limity znaków tekstu i autora).
   - `src/commands/comment-commands.ts`: `AddAnnotationCommand`, `UpdateAnnotationCommand`, `DeleteAnnotationCommand`, `MoveAnnotationPinCommand`.
   - `test/annotations.test.ts`: 5 testów jednostkowych weryfikujących komendy, niezmienność, invarianty i Undo/Redo.

3. **Warstwa wejścia/wyjścia (`packages/io`)**:
   - `src/schema/document-v1.ts`: `CanvasAnnotationSchema` dodany do `DocumentV1Schema` (backward-compatible).
   - `src/storage/indexeddb-repository.ts`: Podbicie bazy do `DB_VERSION = 4` z dodaniem object store `workspace`; metody `listDocuments()` i `deleteDocument()`.
   - `src/storage/workspace-repository.ts`: `IndexedDBWorkspaceRepository` oraz `MemoryWorkspaceRepository` z walidacją schematów Zod dla projektów, folderów, tagów i szablonów.
   - `src/storage/document-store.ts`: Dodano `setDocumentRepository()` oraz `getDocumentRepository()`.
   - `src/storage/workspace-export.ts`: Eksport uwag do JSON i Markdown, eksport/import Brand Kit do `.brandkit`.
   - `test/workspace-repository.test.ts` & `test/workspace-export.test.ts`: 9 testów jednostkowych.

4. **Silnik edytora (`packages/editor-engine`)**:
   - `src/commands/command-registry.ts`: Dodano flagę `readOnly` w `EditorContext` oraz `isMutating` w `EditorCommand`.
   - `test/readonly-gate.test.ts`: Test bramki read-only.

5. **Interfejs użytkownika (`apps/web`)**:
   - `ProjectGallery.tsx` & `useWorkspace.ts`: Galeria projektów, wyszukiwanie na żywo, filtrowanie folderami/tagami/szablonami, modal usuwania.
   - `CommentsPanel.tsx` & `useComments.ts`: Panel boczny uwag z ekstrahowaniem `@user`, filtrem (Wszystkie, Otwarte, Rozwiązane), podpisem i eksportem.
   - `CanvasViewport.tsx`: DOM overlay rendering pinezek uwag ze współrzędnymi świata i przeciąganiem (drag-to-move).
   - `HistoryPanel.tsx`: Modalne potwierdzenie przywracania wersji (`version-restore-modal`).
   - `StatusBar.tsx`: Wskaźnik `Offline (IndexedDB)` z liczbą oczekujących rewizji.
   - `AssetsPanel.tsx` & `RightDock.tsx`: Eksport i import zestawu marki `.brandkit` powiązane z `UpdateBrandKitCommand`.
   - `TopBar.tsx`, `DocumentTabs.tsx`, `AppMenuBar.tsx`: Przyciski "📁 Projekty", "+ Nowy projekt", "💬 Komentarze" z licznikiem uwag.
   - `EditorApp.tsx`: Centralna koordynacja stanu galerii, komentarzy, nasłuchiwania `online`/`offline`, ładowania projektów.

6. **Testy E2E (`apps/web/e2e`)**:
   - `workspace-collaboration.spec.ts`: 4 testy Playwright pokrywające SAAS-002..005, SAAS-012..014, SAAS-015..016, SAAS-017, SAAS-018.

## Validation
- `pnpm lint`: 0 błędów, 0 ostrzeżeń we wszystkich pakietach.
- `pnpm typecheck`: 0 błędów (7/7 pakietów).
- `pnpm test`: 77 plików testowych, 410 testów zaliczonych (100%).
- `pnpm exec playwright test`: 29/29 testów E2E zaliczonych (25 regresji + 4 nowe).
- `pnpm build`: Czysty build produkcyjny Vite PWA w 2.04s.

## Changes Per File

### `docs/adr/ADR_017_ANNOTATIONS_DOMAIN_AND_CANVAS_PINS.md`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Formalny rekord decyzji architektonicznej dla domeny adnotacji na canvasie.
- **Uzasadnienie**: Wymóg AGENTS.md §10 przed modyfikacją kontraktów domenowych `DocumentModel`.

### `docs/adr/ADR_018_WORKSPACE_MULTI_PROJECT_STORAGE.md`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Formalny rekord decyzji architektonicznej dla magazynu wieloprojektowego w IndexedDB.
- **Uzasadnienie**: Wymóg AGENTS.md §10 przed rozbudową warstwy magazynowej IO.

### `docs/adr/ADR_019_BACKEND_SYNC_ENVELOPE_AND_ROLES.md`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Dokument bramkowy Etapu 2 specyfikujący kopertę synchronizacji backendowej i uprawnienia ról.
- **Uzasadnienie**: Przygotowanie fundamentu pod chmurę bez naruszania local-first.

### `docs/adr/ADR_020_CONFLICT_RESOLUTION_AND_REALTIME_STRATEGY.md`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Dokument bramkowy Etapu 3 / SAAS-022 definiujący model wykrywania i rozstrzygania konfliktów.
- **Uzasadnienie**: Realizacja zadania SAAS-022.

### `packages/core/src/model/types.ts`
- **Stan przed**: Brak typu `CanvasAnnotation` i pola `annotations` w `DocumentModel`.
- **Stan po**: Dodano definicję `CanvasAnnotation` oraz opcjonalne pole `DocumentModel.annotations`.
- **Uzasadnienie**: Integracja uwag z modelem dokumentu dla celów Undo/Redo i zapisu w `.vct`.

### `packages/core/src/model/invariants.ts`
- **Stan przed**: Brak walidacji niezmienników dla pola `annotations`.
- **Stan po**: Dodano sprawdzenie unikalności ID, skończoności punktów, limitu 500 wpisów i długości tekstów.
- **Uzasadnienie**: Gwarancja spójności dokumentu i ochrona przed nieprawidłowymi danymi wejściowymi.

### `packages/core/src/commands/comment-commands.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Zaimplementowano komendy `AddAnnotationCommand`, `UpdateAnnotationCommand`, `DeleteAnnotationCommand`, `MoveAnnotationPinCommand`.
- **Uzasadnienie**: Wszystkie mutacje uwag przechodzą przez deterministyczne komendy Undo/Redo.

### `packages/core/src/commands/index.ts` & `packages/core/src/index.ts`
- **Stan przed**: Brak eksportu komend adnotacji.
- **Stan po**: Wyeksportowano komendy uwag.
- **Uzasadnienie**: Udostępnienie komend dla silnika i aplikacji webowej.

### `packages/core/test/annotations.test.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: 5 testów jednostkowych dla adnotacji i komend.
- **Uzasadnienie**: Weryfikacja regresyjna i reguły jakości.

### `packages/io/src/schema/document-v1.ts`
- **Stan przed**: `DocumentV1Schema` nie uwzględniał pola `annotations`.
- **Stan po**: Dodano schemat `CanvasAnnotationSchema` z limitem 500 elementów do `DocumentV1Schema`.
- **Uzasadnienie**: Bezpieczna serializacja i walidacja Zod na granicy IO.

### `packages/io/src/storage/document-repository.ts`
- **Stan przed**: Interfejs `DocumentRepository` zawierał tylko metody zapisu i odczytu pojedynczego dokumentu.
- **Stan po**: Dodano opcjonalne sygnatury `listDocuments?()` i `deleteDocument?()`.
- **Uzasadnienie**: Umożliwienie listowania i usuwania wielu dokumentów w magazynie.

### `packages/io/src/storage/indexeddb-repository.ts`
- **Stan przed**: `DB_VERSION = 3`, stores: `documents`, `palettes`.
- **Stan po**: `DB_VERSION = 4`, dodano store `workspace`, zaimplementowano `listDocuments()` i `deleteDocument()`.
- **Uzasadnienie**: Obsługa wielodokumentowości w IndexedDB.

### `packages/io/src/storage/workspace-repository.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Zaimplementowano `IndexedDBWorkspaceRepository` oraz `MemoryWorkspaceRepository`.
- **Uzasadnienie**: Magazyn projektów, folderów, tagów, wyszukiwarki i szablonów.

### `packages/io/src/storage/workspace-export.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Funkcje eksportu uwag do JSON/Markdown oraz Brand Kit do `.brandkit`.
- **Uzasadnienie**: Realizacja zadań SAAS-018 i SAAS-021.

### `packages/io/src/storage/document-store.ts`
- **Stan przed**: Sztywne przypisanie `activeRepository = new IndexedDBDocumentRepository(CURRENT_DOC_KEY)`.
- **Stan po**: Dodano `setDocumentRepository()` oraz `getDocumentRepository()`.
- **Uzasadnienie**: Możliwość wstrzykiwania repozytoriów dla testów i obsługi wielu projektów.

### `packages/io/src/index.ts`
- **Stan przed**: Brak eksportu modułów workspace.
- **Stan po**: Wyeksportowano `workspace-repository.js` i `workspace-export.js`.
- **Uzasadnienie**: Publiczne API pakietu IO.

### `packages/io/test/workspace-repository.test.ts` & `workspace-export.test.ts`
- **Stan przed**: Pliki nie istniały.
- **Stan po**: 9 testów jednostkowych magazynu i eksportu workspace.
- **Uzasadnienie**: Zapewnienie poprawności logiki magazynowej i serializacji.

### `packages/editor-engine/src/commands/command-registry.ts`
- **Stan przed**: Brak flagi `readOnly` i `isMutating`.
- **Stan po**: Dodano obsługę blokady komend mutujących w trybie podglądu.
- **Uzasadnienie**: Przygotowanie bramki podglądu (SAAS-011).

### `packages/editor-engine/test/readonly-gate.test.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: Test jednostkowy weryfikujący blokadę mutacji w trybie readOnly.
- **Uzasadnienie**: Dowód testowy bramki readOnly.

### `apps/web/src/features/workspace/useWorkspace.ts` & `ProjectGallery.tsx`
- **Stan przed**: Pliki nie istniały.
- **Stan po**: Hook zarządzania przestrzenią roboczą oraz pełny komponent widoku galerii projektów.
- **Uzasadnienie**: Realizacja zadań SAAS-002..005 oraz SAAS-020.

### `apps/web/src/features/comments/useComments.ts` & `CommentsPanel.tsx`
- **Stan przed**: Pliki nie istniały.
- **Stan po**: Hook dyspozycji komend adnotacji oraz panel boczny komentarzy.
- **Uzasadnienie**: Realizacja zadań SAAS-012..014 oraz SAAS-018.

### `apps/web/src/features/canvas/CanvasViewport.tsx`
- **Stan przed**: Canvas renderował wyłącznie obiekty sceny bez pinezek uwag.
- **Stan po**: Dodano nakładkę DOM dla pinezek adnotacji w przestrzeni świata z obsługą przeciągania.
- **Uzasadnienie**: Realizacja wizualizacji uwag zgodnie z ADR-017.

### `apps/web/src/features/panels/HistoryPanel.tsx`
- **Stan przed**: Przycisk "Przywróć" od razu wykonywał przywrócenie wersji.
- **Stan po**: Dodano modalne okno dialogowe potwierdzenia przed przywróceniem wersji (`version-restore-modal`).
- **Uzasadnienie**: Realizacja zadania SAAS-016 z zabezpieczeniem przed utratą danych.

### `apps/web/src/features/panels/AssetsPanel.tsx` & `RightDock.tsx`
- **Stan przed**: Brak eksportu i importu zestawu marki z pliku.
- **Stan po**: Dodano przyciski eksportu i importu `.brandkit` i przekazano callback `onImportBrandKit`.
- **Uzasadnienie**: Realizacja zadania SAAS-021.

### `apps/web/src/features/statusbar/StatusBar.tsx`
- **Stan przed**: Stan `'offline'` nie był w pełni podłączony do zdarzeń sieciowych.
- **Stan po**: Wskaźnik `Offline (IndexedDB)` z liczbą oczekujących rewizji i atrybutem `role="status"`.
- **Uzasadnienie**: Realizacja zadania SAAS-017.

### `apps/web/src/features/topbar/DocumentTabs.tsx`, `TopBar.tsx`, `AppMenuBar.tsx`
- **Stan przed**: Pasek zakładek miał tylko bieżący dokument; menu nie miało opcji galerii i uwag.
- **Stan po**: Dodano przyciski "📁 Projekty", "+ Nowy projekt", "💬 Komentarze" z licznikiem oraz pozycje w menu Plik/Widok.
- **Uzasadnienie**: Intuicyjna nawigacja po projektach i komentarzach.

### `apps/web/src/app/EditorApp.tsx`
- **Stan przed**: Edytor obsługiwał wyłącznie pojedynczy dokument bez galerii, uwag i detekcji offline.
- **Stan po**: Pełna integracja galerii projektów, panelu uwag, nasłuchu online/offline, importu Brand Kit i komend w palecie.
- **Uzasadnienie**: Koordynacja komponentów i stanu aplikacji webowej.

### `apps/web/e2e/workspace-collaboration.spec.ts`
- **Stan przed**: Plik nie istniał.
- **Stan po**: 4 testy E2E weryfikujące galerię, adnotacje, historię wersji i wskaźnik offline.
- **Uzasadnienie**: Weryfikacja end-to-end zgodna z `TESTING_STRATEGY.md`.

### `BACKLOG.md` & `epics/EPIC-17_Wspolpraca_i_SaaS.md` & `plans/PLAN_EPIC-17_wspolpraca_i_saas.md`
- **Stan przed**: Zadania SAAS-002..005, 012..022 były oznaczone jako nieukończone.
- **Stan po**: Zaktualizowano statusy ukończonych zadań Etapu 1.
- **Uzasadnienie**: Aktualizacja stanu postępu projektu.
