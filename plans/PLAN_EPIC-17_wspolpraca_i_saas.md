# PLAN: EPIC-17 Współpraca i SaaS

> Data: 2026-09-03
> Źródła: `BACKLOG.md:585-607` (SAAS-001..023), `epics/EPIC-17_Wspolpraca_i_SaaS.md`, audyt kodu 2026-09-03.
> Zasada nadrzędna: local-first nie zostaje złamany; backend nigdy nie jest source of authorization; realtime ostatni.

---

## 1. Rezultat użytkownika i granica scope

**Użytkownik dostanie (Etap 1 — local-first, bez backendu):**
galerię projektów z folderami i tagami, wyszukiwarkę dokumentów, komentarze przypięte do pozycji na canvasie (resolve, @user w treści, eksport), rozbudowaną historię wersji, wskaźnik synchronizacji (offline-aware), handoff przez `.vct`, szablony zespołowe i współdzielony brand kit na poziomie workspace (lokalnie, z eksportem/importem).

**Etap 2 — backend (wymaga decyzji użytkownika o dostawcy + ADR):**
konto, workspace/projekty w chmurze, link do projektu, role viewer/commenter/editor/owner z egzekucją server-side, publiczny read-only preview.

**Etap 3 — realtime (SAAS-023):**
wyłącznie po Etapie 2 i ADR-015. Spec wymaga: „współedycję realtime dopiero po ustabilizowaniu single-user editora".

**Wchodzi:** SAAS-002,003,004,005,012,013,014,015,016,017,018,019,020,021 (Etap 1); SAAS-001,006,007,008,009,010,011 (Etap 2, zablokowane decyzją); SAAS-022 (projekt modelu — ADR-015, bez implementacji runtime); SAAS-023 (poza planem — gate).
**Nie wchodzi:** implementacja realtime co-editingu, wybór dostawcy backendu bez zgody użytkownika.

## 2. Status audytu vs kod

| Task | Status | Dowód |
|---|---|---|
| SAAS-001 konto | MISSING | zero auth/deps backendowych (lockfile: brak supabase/firebase/yjs); jedyny fetch: `EditorApp.tsx:1152` (font) |
| SAAS-002 workspace/projekty | MISSING | jeden stały klucz `current_document` (`document-store.ts:7`); `DocumentTabs.tsx:9-13` renderuje 1 tab |
| SAAS-003 foldery | MISSING | — |
| SAAS-004 tagi | MISSING | precedens scopingu: `ColorPalette.scope` (`user/saved/document`) |
| SAAS-005 wyszukiwarka | MISSING | brak query na repozytorium; wzorce UI: `LayersPanel.tsx:112`, `AssetsPanel.tsx:56-74` |
| SAAS-006 link projektu | MISSING | — |
| SAAS-007..010 role | MISSING | brak kodu ról; kontrakt typów tylko w spec `EPIC-17:24` |
| SAAS-011 read-only preview | MISSING | brak readOnly gate w `EditorContext` (`command-registry.ts:3-16`) |
| SAAS-012..014 komentarze | MISSING | grep comment/annotation w core = 0 |
| SAAS-015 historia wersji | FOUNDATION | `DocumentVersion` (`document-repository.ts:3-7`), `saveDocumentVersion` (`document-store.ts:145-158`), cap 20 (`indexeddb-repository.ts:8,117-145`), UI `HistoryPanel.tsx:41-48` |
| SAAS-016 restore wersji | FOUNDATION | `handleRestoreVersion` → `ReplaceDocumentCommand` (`EditorApp.tsx:448-457`, `document-commands.ts:351`), undo działa |
| SAAS-017 sync indicator | FOUNDATION | `SaveStatus` maszyna + 700ms debounce + kolejka (`EditorApp.tsx:181,312-344,391-401`), `StatusBar.tsx:68-79`; `'offline'` zdefiniowane, nigdy nie ustawione |
| SAAS-018 eksport komentarzy | MISSING | — |
| SAAS-019 handoff | MISSING (fundament: `.vct` `vct-file.ts:12-49`) | — |
| SAAS-020 szablony zespołowe | MISSING (fundament: template layer `layer-commands.ts:23-50`, presety `presets.ts:3-23`) | — |
| SAAS-021 współdzielony brand kit | FOUNDATION (lokalny, per-dokument) | `types.ts:579-589`, `brand-commands.ts:7-35`, `document-v1.ts:434-447`, UI `AssetsPanel.tsx:160-235` |
| SAAS-022 model konfliktów | MISSING | LWW snapshot + last-known-good (`document-store.ts:107-123`); revision guard tylko local (`EditorApp.tsx:322-326`) |
| SAAS-023 realtime | MISSING | brak CRDT/WS deps; wzorzec transportu: `worker-client.ts:8-25` |

## 3. Zmiany kontraktu domenowego — ADR WYMAGANE

Spec (`EPIC-17:15-17`) + AGENTS §7.3: zmiana `DocumentModel` i backend = ADR przed implementacją.

| ADR | Zakres | Blokuje |
|---|---|---|
| **ADR-017** Annotations domain | `DocumentModel.annotations: readonly CanvasAnnotation[]` (nie SceneObject); typy, invariants, schema v1 (pole opcjonalne = backward-compatible), komendy | SAAS-012..014, 018 |
| **ADR-018** Workspace storage | Multi-document: per-document klucze IndexedDB, store `workspace` (projects/folders/tags), wstrzykiwanie `DocumentRepository` zamiast singletona `document-store.ts:10` | SAAS-002..005, 020, 021 |
| **ADR-019** Backend + role | Dostawca (decyzja użytkownika), auth, sync snapshotów (envelope `PersistedDocument`), role server-side (RLS/RPC), negatywne testy autoryzacji `Actor → backend authority` | SAAS-001, 006..011, 019 (Etap 2) |
| **ADR-020** Konflikt model + realtime | CAS na `revision`, strategia last-writer/merge, transport, presence transient | SAAS-022 projekt, SAAS-023 implementacja |

Etap 1 w tym planie wymaga **ADR-017 i ADR-018**. ADR-019/020 = dokumenty bramkowe Etapu 2/3 (szkice treści w sekcji 12).

## 4. Komendy / Undo-Redo

Nowe komendy (core, `execute`/`undo`, immutability — wzorzec: `brand-commands.ts:7-35`):

```
AddAnnotationCommand(annotation)          → dopisuje do doc.annotations
UpdateAnnotationCommand(id, patch)        → body/resolved/worldPoint
DeleteAnnotationCommand(id)
MoveAnnotationPinCommand(id, worldPoint)  → dedykowana (drag na canvasie)
```

Restore wersji: istniejąca `ReplaceDocumentCommand` (już undoable). Mutacja dokumentu = wyłącznie przez komendy; komentarz jest annotations domain — drag pina w `pointermove` = preview, `pointerup` = jedna komenda (reguła §4 AGENTS).

## 5. Pliki per warstwa

### packages/core
| Plik | Op. | Zmiana |
|---|---|---|
| `src/model/types.ts` | MODIFY | `CanvasAnnotation` (`{id, projectId?, worldPoint, body, authorName, resolved, mentions, createdAt, updatedAt}`), `DocumentModel.annotations?: readonly CanvasAnnotation[]` |
| `src/model/invariants.ts` | MODIFY | annotations: unikalne ID, skończone `worldPoint`, body ≤ 4000 znaków, mentions ⊆ body |
| `src/commands/comment-commands.ts` | NEW | 4 komendy z sekcji 4 |
| `src/commands/index.ts` | MODIFY | eksport |
| `src/index.ts` | MODIFY | eksport typów |
| `test/annotations.test.ts` | NEW | komendy execute/undo, immutability, invariants |

### packages/io
| Plik | Op. | Zmiana |
|---|---|---|
| `src/schema/document-v1.ts` | MODIFY | `AnnotationSchema` (Zod, pole opcjonalne dokumentu; limit 500 annotation/doc) |
| `src/storage/workspace-repository.ts` | NEW | store `workspace`: `WorkspaceMeta`, `ProjectRecord {id,name,folderId,tags,documentId,updatedAt}`, foldery, tagi; walidacja Zod; bounded 256 projektów |
| `src/storage/document-repository.ts` | MODIFY | `listDocuments?()`, `deleteDocument?(id)` |
| `src/storage/indexeddb-repository.ts` | MODIFY | DB v4: nowy store `workspace`; per-document klucze (`snapshot.document.id` fallback już jest `:43`) |
| `src/storage/workspace-export.ts` | NEW | eksport/import workspace bundle (.vct + meta JSON) dla SAAS-019/020/021 |
| `test/workspace-repository.test.ts` | NEW | fake-indexeddb lub abstrakcja; round-trip, limit, corrupted reset |

### packages/editor-engine
| Plik | Op. | Zmiana |
|---|---|---|
| `src/commands/command-registry.ts` | MODIFY | `EditorContext` + `readOnly: boolean` (SAAS-011 groundwork) |
| `test/readonly-gate.test.ts` | NEW | execute blokowany przy readOnly |

### apps/web
| Plik | Op. | Zmiana |
|---|---|---|
| `src/features/workspace/ProjectGallery.tsx` | NEW | start page/galeria: projekty, foldery, tagi, search, nowy projekt |
| `src/features/workspace/useWorkspace.ts` | NEW | hook nad workspace-repository |
| `src/features/comments/CommentsPanel.tsx` | NEW | lista, resolve, @user autocomplete z listy współpracowników (Etap 1: z komentarzy) |
| `src/features/comments/useComments.ts` | NEW | hook: CRUD przez komendy |
| `src/features/canvas/CanvasViewport.tsx` | MODIFY | DOM-overlay pinów komentarzy (world→screen przez camera, klik = otwórz w panelu, drag pina = komenda) |
| `src/app/EditorApp.tsx` | MODIFY | readOnly gate w `handleExecuteCommand`; ekran wyboru projektu przed edytorem; `SaveStatus.offline` wg `navigator.onLine` |
| `src/features/statusbar/StatusBar.tsx` | MODIFY | wskaźnik sync: `offline` + `unsynced` count (revision vs savedRevision — groundwork istnieje `EditorApp.tsx:1879`) |
| `src/features/panels/HistoryPanel.tsx` | MODIFY | opis wersji, autor, restore z potwierdzeniem (UX-022 synergia) |
| `src/features/panels/AssetsPanel.tsx` | MODIFY | brand kit: eksport/import `.brandkit` (JSON+Zod) — współdzielenie w Etapie 1 = plik, w Etapie 2 = workspace |
| `e2e/workspace.spec.ts` | NEW | workflow: projekt→folder→tag→search→otwórz→komentarz→resolve→eksport |

### Dokumenty
`ADR_017_ANNOTATIONS_DOMAIN_AND_CANVAS_PINS.md`, `ADR_018_WORKSPACE_MULTI_PROJECT_STORAGE.md`, `ADR_019_BACKEND_SYNC_ENVELOPE_AND_ROLES.md`, `ADR_020_CONFLICT_RESOLUTION_AND_REALTIME_STRATEGY.md` (NEW), `BACKLOG.md` (statusy).

## 6. Invariants (jawna lista)

1. `annotations` nigdy nie trafia do `doc.objects`/layers/hit-testu dokumentu (annotation domain, spec `:15`).
2. Piny w world-space; konwersja world↔screen wyłącznie przez `Camera` (brak duplikacji transformacji).
3. Annotation body ≤ 4000 znaków; ≤ 500 annotation/dokument; unikalne ID; `mentions` wyprowadzone z body, nie niezależne.
4. Drag pina: `pointermove` = preview, `pointerup` = 1 komenda (1 wpis historii).
5. `readOnly=true` blokuje `execute` mutujących komend w dispatcherze; camera/pan/zoom dozwolone.
6. Workspace store: bounded 256 projektów, Zod na granicy, corrupted → reset metadanych bez utraty dokumentów.
7. `SaveStatus.offline` wyłącznie z `navigator.onLine === false`; brak fejkowego „sync".
8. Autoryzacja: w Etapie 1 brak backendu — role jako lokalne metadane UI, nigdy security gate (AGENTS §6).
9. Każda komenda annotation: `execute → expected`, `undo → exact previous`, input niemutowany.

## 7. Error / cancel / recovery

- Galeria: błąd odczytu store → pusta lista + retry, nie crash bootstrapa.
- Eksport workspace bundle: przerwanie (cancel dialog) → zero zapisów.
- Import bundle: walidacja Zod; błąd → komunikat, aktywny dokument nietknięty (wzorzec importu).
- Komentarz: drag poza viewport → pin zostaje na ostatniej legalnej pozycji world (clamp do skończonych wartości).
- Delete projektu → ConfirmDialog (UX-022), restore wersji → potwierdzenie.
- Offline: autosave dalej local; sync indicator `offline`; kolejka save nie rośnie bez backendu (Etap 1: brak kolejki zdalnej).

## 8. Zależności międzyepiczne / międzywarstwowe

- **UX-021** (potwierdzenie usunięcia projektu) zależy od SAAS-002 — plan EPIC-18 otrzymuje notę zależności.
- SAAS-018 (eksport komentarzy) zależy od ADR-012.
- SAAS-020/021 workspace scope zależy od ADR-013.
- SAAS-011 read-only wymaga `readOnly` w `EditorContext` — zmiana kontraktu engine (w planie, bez ADR — rozszerzenie opcjonalnego pola kontekstu, nie modelu dokumentu).
- Renderer nie jest modyfikowany — pin to DOM overlay w `CanvasViewport` (spójne z izolacją renderer od UI).

## 9. Ryzyko regresji

| Zmiana | Dotyka | Mitigacja |
|---|---|---|
| Wstrzykiwanie repo (usunięcie singletona) | cały bootstrap (`document-store.ts:10` funnelling) | domyślny parametr = IndexedDB impl; wszystkie istniejące testy io przechodzą bez zmian; e2e autosave/restore zielone |
| DB v4 migracja | EPIC-12 crash recovery, autosave | IndexedDB onupgradeneeded addytywny; test migracji v3→v4 na istniejących danych |
| `annotations?` w schema | round-trip `.vct` (IO-001..005 DONE) | pole opcjonalne + test round-trip z annotations i bez |
| `readOnly` w EditorContext | CommandPalette enabled flow | default `false`; wszystkie istniejące wywołania bez zmian |

## 10. Decyzje do rozstrzygnięcia PRZED implementacją (Etap 1)

1. **Dostawca backendu Etapu 2** — otwarte; Etap 1 jest backend-agnostic (repository seam wg ADR-013).
2. Komentarze w `DocumentModel` vs osobny store — **decyzja: w modelu** (undo/redo, round-trip `.vct`, spójność z dokumentem; ADR-012).
3. Autor komentarza w Etapie 1 — **lokalna nazwa z localStorage** (`vectoria-display-name`), bez konta.
4. @user — **parsowanie z body** (`@słowo`), bez backendowej bazy userów w Etapie 1.
5. Eksport komentarzy — **JSON + Markdown** (PDF zostawiony EPIC-16 EXPORT-012/013).
6. Piny — **DOM overlay**, nie renderer canvas (klikalność, focus ring, dostępność).
7. Galeria jako osobny ekran vs dialog — **ekran startowy** nad `EditorApp` (route-less, stan `workspaceState`).

Jeżeli którykolwiek punkt koliduje z wizją — stop przed implementacją.

## 11. Macierz testów

**Unit (core):** 4 komendy annotation (execute/undo/execute-undo-execute/immutability), invariants (duplikat ID, NaN point, body > 4000, mentions), readOnly gate.
**Unit (io):** AnnotationSchema round-trip, workspace-repository CRUD + limits + corrupted reset, DB v3→v4 migracja, workspace export/import.
**E2E (Playwright):** utwórz projekt→folder→tag→wyszukaj→otwórz; dodaj komentarz na canvasie→przeciągnij pin→undo→resolve→eksport JSON; restore wersji z potwierdzeniem; offline indicator (`context.setOffline(true)`); readOnly preview (Etap 1: symulacja flagą).
**Visual:** brak infra (odnotowane); piny i galeria wymagają manualnego checku dark/light.
**Perf:** drag pina i pan przy 200 annotation — bez rAF przekroczeń (budget §8: pan 100 obiektów 60 FPS).

## 12. Quality gates

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @vectoria/web test:e2e && pnpm build
```

Bramka dodatkowa Etapu 1: ręczna weryfikacja dark/light + mały viewport (DESIGN_SYSTEM).

## 13. Szkice ADR bramkowych (Etap 2/3 — bez implementacji)

**ADR-014 (backend+role):** wybór dostawcy; envelope `PersistedDocument` jako jednostka sync; `Actor → backend authority → negative test` (RLS policy per rola, test: viewer nie zapisze); token w HttpOnly cookie; UI role-check wyłącznie UX.
**ADR-015 (konflikt+realtime):** CAS `If-Match: revision`; konflikt →fork-kopia + dialog (zero cichej utraty); realtime = CRDT na poziomie operacji komend (nie SceneObject), presence transient, poza historią; worker/transport seam wg `worker-client.ts:8-25`.

## 14. Kolejność realizacji Etapu 1

1. ADR-012 + ADR-013 (dokumenty, akceptacja użytkownika)
2. Core: typy + invariants + komendy + testy
3. IO: schema + workspace-repository + migracja v4 + testy
4. Engine: readOnly gate + testy
5. Web: galeria → komentarze → sync indicator → HistoryPanel → brand kit export → handoff
6. E2E + BACKLOG

## 15. Comment rules

JSDoc na publicznych: komendy annotation, `workspace-repository` (CRUD + limity), readOnly gate w dispatcherze, `useWorkspace`. Bez komentarzy krokowych.
