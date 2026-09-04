# ADR 018: Magazyn Workspace i architektura wielu projektów w IndexedDB

**Data:** 2026-09-04  
**Status:** Accepted  
**Kontekst:** Wdrożenie galerii projektów, folderów, tagów, wyszukiwarki i szablonów (EPIC-17 SAAS-002..005, SAAS-019..021) z zachowaniem zasady local-first.

---

## Kontekst i problem

W dotychczasowej architekturze magazynu IndexedDB edytor operował na pojedynczym stałym dokumencie (`current_document`). Brakowało:
1. Możliwości tworzenia, przechowywania i przełączania się pomiędzy wieloma niezależnymi projektami.
2. Struktury folderów i tagów do kategoryzacji prac.
3. Wyszukiwarki dokumentów według nazwy i etykiet.
4. Możliwości definiowania projektów jako szablonów workspace.
5. Bezpiecznej migracji bazy danych bez ryzyka utraty istniejącego dokumentu aktywnego użytkownika.
6. Izolacji repozytorium (usunięcie sztywnego singletona w module `document-store.ts` w celu umożliwienia łatwego testowania i wstrzykiwania zależności).

---

## Decyzja

1. **Podniesienie wersji bazy danych do `DB_VERSION = 4` (`packages/io/src/storage/indexeddb-repository.ts`)**:
   - W procedurze `onupgradeneeded` utworzono nowy ObjectStore:
     ```ts
     if (!request.result.objectStoreNames.contains('workspace')) {
       request.result.createObjectStore('workspace');
     }
     ```
   - Sklep `documents` i `palettes` pozostają nienaruszone, co zapewnia stuprocentowe bezpieczeństwo istniejących danych użytkownika i testów e2e.
   - Wprowadzono metody `listDocuments?()` i `deleteDocument?(documentId: string)` w kontrakcie `DocumentRepository`.

2. **Dedykowany moduł `WorkspaceRepository` (`packages/io/src/storage/workspace-repository.ts`)**:
   - Zdefiniowano schematy i typy Zod:
     - `ProjectRecord`: `{ id: string; name: string; folderId?: string; tags: readonly string[]; documentId: string; createdAt: string; updatedAt: string; isTemplate?: boolean }`
     - `FolderRecord`: `{ id: string; name: string; color?: string; createdAt: string }`
     - `TagRecord`: `{ id: string; name: string; color: string }`
     - `WorkspaceMeta`: `{ activeProjectId?: string; folders: readonly FolderRecord[]; tags: readonly TagRecord[]; projects: readonly ProjectRecord[] }`
   - Ograniczenia i limity:
     - Maksymalnie 256 projektów w lokalnym workspace (`WORKSPACE_LIMITS.maxProjects = 256`).
     - Maksymalnie 64 foldery i 64 tagi.
     - Długość nazwy projektu: 1–120 znaków.
   - Odporność na uszkodzenia: uszkodzone dane metadanych workspace'u (np. błędny JSON w IndexedDB) podlegają kontrolowanemu resetowi do stanu domyślnego, nie powodując usunięcia samych dokumentów z bazy.

3. **Wstrzykiwanie repozytorium i backward compatibility (`packages/io/src/storage/document-store.ts`)**:
   - Zezwolono na przekazanie instancji `DocumentRepository` jako opcjonalnego parametru lub użycie domyślnej implementacji opartej o `IndexedDBDocumentRepository`.
   - Istniejące testy i wywołania bez parametrów zachowują identyczne zachowanie.

4. **Eksport i Handoff (`packages/io/src/storage/workspace-export.ts`)**:
   - Umożliwiono eksport całego Brand Kitu (`.brandkit` jako walidowany JSON) oraz eksport komentarzy do formatów Markdown i JSON.
   - Umożliwiono eksport i import projektów jako spakowane pliki `.vct` ze wszystkimi metadanymi dokumentu.

---

## Konsekwencje

- **Zalety**:
  - Pełne wsparcie dla multi-project workflow bez wymogu backendu chmurowego.
  - Szybkie wyszukiwanie i filtrowanie w pamięci na zweryfikowanych strukturach metadanych.
  - Czysta separacja pomiędzy metadanymi organizacyjnymi (projekty, foldery) a domeną dokumentu graficznego.
- **Kompromisy**:
  - Limit 256 projektów lokalnych chroni przed wyczerpaniem pamięci IndexedDB w przeglądarce; w przyszłym Etapie 2 chmura obsłuży nielimitowane projekty.
