# [EPIC-17] Współpraca i SaaS — specyfikacja wykonawcza

## Cel

Rozszerzyć stabilny single-user editor o projekty, uprawnienia, komentarze, wersje i współpracę, bez naruszenia local-first edycji, command modelu ani responsywności. Realtime jest ostatnim etapem po stabilizacji single-user core.

## Niezmienniki

- Local DocumentModel i command dispatcher pozostają funkcjonalne offline.

- Backend synchronizuje wersjonowane operacje/snapshoty; UI nie mutuje dokumentu bezpośrednio.

- Role sprawdzane są server-side i client-side wyłącznie dla UX; client nie jest source of authorization.

- Comments są annotation domain, nie geometry scene objects; pinned position jest world-space.

- Conflicts wymagają jawnego modelu i ADR przed realtime implementation.

- Realtime presence/cursors są transient i nie trafiają do historii dokumentu.

## Kontrakty

```ts
export type ProjectRole="viewer"|"commenter"|"editor"|"owner";
export interface Project { id:string; workspaceId:string; name:string; documentId:string; }
export interface CanvasComment { id:string; projectId:string; worldPoint:Vec2; body:string; resolved:boolean; }
```

## Backlog

### SAAS-001

- [ ] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-001.
- [ ] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-001.
- [ ] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-001.
- [ ] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-001.

### SAAS-002

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-002.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-002.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-002.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-002.

### SAAS-003

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-003.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-003.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-003.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-003.

### SAAS-004

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-004.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-004.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-004.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-004.

### SAAS-005

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-005.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-005.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-005.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-005.

### SAAS-006

- [ ] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-006.
- [ ] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-006.
- [ ] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-006.
- [ ] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-006.

### SAAS-007

- [ ] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-007.
- [ ] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-007.
- [ ] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-007.
- [ ] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-007.

### SAAS-008

- [ ] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-008.
- [ ] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-008.
- [ ] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-008.
- [ ] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-008.

### SAAS-009

- [ ] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-009.
- [ ] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-009.
- [ ] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-009.
- [ ] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-009.

### SAAS-010

- [ ] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-010.
- [ ] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-010.
- [ ] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-010.
- [ ] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-010.

### SAAS-011

- [ ] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-011.
- [ ] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-011.
- [ ] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-011.
- [ ] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-011.

### SAAS-012

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-012.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-012.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-012.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-012.

### SAAS-013

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-013.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-013.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-013.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-013.

### SAAS-014

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-014.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-014.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-014.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-014.

### SAAS-015

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-015.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-015.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-015.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-015.

### SAAS-016

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-016.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-016.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-016.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-016.

### SAAS-017

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-017.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-017.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-017.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-017.

### SAAS-018

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-018.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-018.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-018.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-018.

### SAAS-019

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-019.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-019.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-019.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-019.

### SAAS-020

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-020.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-020.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-020.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-020.

### SAAS-021

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-021.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-021.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-021.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-021.

### SAAS-022

- [x] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-022.
- [x] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-022.
- [x] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-022.
- [x] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-022.

### SAAS-023

- [ ] Zdefiniuj backend/domain contract, authorization i audit policy dla SAAS-023.
- [ ] Dodaj UI, keyboard accessibility, error/retry i status feedback dla SAAS-023.
- [ ] Dodaj test role/security/conflict oraz E2E workflow dla SAAS-023.
- [ ] Zachowaj local-first fallback i nie blokuj editor input dla SAAS-023.

## Reguły

- Viewer jest read-only; commenter może komentować; editor mutuje dokument; owner zarządza access i project lifecycle.
- Public preview nie eksponuje edycji, prywatnych comments ani asset links bez explicit policy.
- @mentions mają autocomplete, notification policy i sanitizację tekstu.
- Comment pin ma world coordinate, resolved state, thread metadata i navigation to canvas.
- Version restore tworzy recovery version i audit entry; nie kasuje historii bezpowrotnie.
- Sync indicator ma offline/syncing/synced/error, text+icon, aria-live i retry.
- Team templates/Brand Kit są workspace-scoped, wersjonowane i role-gated.
- Conflict model definiuje operation ordering, stale base revision, merge/reject UX i recovery copy.
- Realtime jest feature-flagged, dopiero po benchmarkach, security review i failure-mode tests.

## UI i accessibility

- Top Bar pokazuje krótki sync state; długie szczegóły są w popover.

- Comments panel i markers są dostępne klawiaturą; marker nie zasłania selection.

- Role/share dialogs mają focus trap, jasną consequence oraz named destructive action.

- Dark/Light, semantic tokens, focus-visible i no-color-only states są obowiązkowe.

## Test matrix

- [ ] TM-001: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-002: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-003: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-004: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-005: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-006: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-007: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-008: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-009: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-010: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-011: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-012: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-013: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-014: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-015: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-016: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-017: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-018: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-019: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-020: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-021: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-022: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-023: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-024: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-025: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-026: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-027: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-028: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-029: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-030: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-031: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-032: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-033: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-034: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-035: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-036: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-037: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-038: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-039: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-040: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-041: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-042: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-043: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-044: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-045: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-046: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-047: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-048: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-049: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-050: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-051: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-052: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-053: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-054: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-055: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-056: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-057: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-058: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-059: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-060: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-061: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-062: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-063: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-064: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-065: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-066: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-067: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-068: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-069: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-070: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-071: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-072: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-073: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-074: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-075: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-076: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-077: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-078: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-079: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-080: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-081: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-082: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-083: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-084: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-085: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-086: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-087: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-088: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-089: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-090: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-091: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-092: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-093: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-094: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-095: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-096: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-097: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-098: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-099: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-100: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-101: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-102: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-103: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-104: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-105: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-106: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-107: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-108: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-109: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-110: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-111: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-112: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-113: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-114: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-115: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-116: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-117: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-118: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-119: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.
- [ ] TM-120: Zweryfikuj role/project/comment/version/sync/conflict/offline/retry i keyboard workflow.

## Definition of Done

- [ ] SAAS-001…023 jest etapowane po stable single-user editor.
- [ ] Authorization, offline fallback, audit i conflict model są testowane.
- [ ] Realtime nie degraduje input/render loop i nie omija command modelu.
- [ ] Security/E2E/accessibility tests przechodzą w CI.

## Źródła

- `BACKLOG.md`: SAAS-001…023.
- `VECTORIA_ARCHITECTURE.md`: command model, local persistence, future cloud sync i input priority.
- `DESIGN_SYSTEM.md`: sync status, comments/panels, dialogs, tokens i accessibility.
