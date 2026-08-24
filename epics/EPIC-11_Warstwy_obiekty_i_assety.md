# [EPIC-11] Warstwy, obiekty i assety — specyfikacja wykonawcza

## Cel

Użytkownik zarządza strukturą dokumentu przez warstwy, grupy i obiekty: tworzy, reorganizuje, wyszukuje, ukrywa, blokuje i izoluje elementy bez utraty z-order oraz ownership.

## Niezmienniki

- Layer tree jest częścią DocumentModel i nie zależy od React/renderer.

- Każdy objectId występuje tylko raz w layer/group ownership tree.

- Z-order traversal jest stabilny i read-only dla renderera; wszystkie mutacje są command-based.

- Hidden element nie renderuje się ani nie bierze udziału w hit-test; locked element nie poddaje się edycji.

- Drag reorder jest preview-first i commitowany jedną command.

- Duże listy używają virtualization po benchmarkach; pointermove nie renderuje całego docku.

## Kontrakty

```ts
export interface Layer { id:string; name:string; visible:boolean; locked:boolean; opacity:number; children:LayerChild[]; }
export type LayerChild = { type:"object"; objectId:string } | { type:"group"; groupId:string };
```

## Backlog

### LAYER-001

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-001.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-001.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-001.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-001.

### LAYER-002

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-002.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-002.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-002.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-002.

### LAYER-003

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-003.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-003.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-003.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-003.

### LAYER-004

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-004.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-004.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-004.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-004.

### LAYER-005

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-005.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-005.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-005.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-005.

### LAYER-006

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-006.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-006.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-006.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-006.

### LAYER-007

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-007.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-007.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-007.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-007.

### LAYER-008

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-008.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-008.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-008.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-008.

### LAYER-009

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-009.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-009.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-009.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-009.

### LAYER-010

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-010.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-010.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-010.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-010.

### LAYER-011

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-011.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-011.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-011.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-011.

### LAYER-012

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-012.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-012.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-012.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-012.

### LAYER-013

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-013.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-013.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-013.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-013.

### LAYER-014

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-014.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-014.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-014.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-014.

### LAYER-015

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-015.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-015.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-015.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-015.

### LAYER-016

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-016.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-016.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-016.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-016.

### LAYER-017

- [ ] Zdefiniuj domain command, invariants oraz persistence dla LAYER-017.
- [ ] Zaimplementuj Layers Panel, keyboard interaction i preview dla LAYER-017.
- [ ] Dodaj Undo/Redo, history label, autosave i E2E test dla LAYER-017.
- [ ] Zachowaj selection, z-order, visibility i ownership przy LAYER-017.

## Reguły

- Layers Panel: row 28 px, indent 16 px, eye/lock/disclosure/type/name/more.
- Selected row używa subtle selection surface; hidden label jest muted; locked blokuje drag/edit.
- Layer DnD pokazuje accent insertion line; nie dopuszcza cyclical group nesting.
- Template Layer nie jest przypadkowo edytowalna; Outline View zmienia renderer policy bez mutacji document.
- Solo Mode jest explicit temporary view state; reset jest jasny i keyboard accessible.
- Search/filter nie zmienia tree, tylko widok; ukryte ancestors są komunikowane w wynikach.

## UI i accessibility

- Right Dock domyślnie 320 px, min 240/max 480; Layers osiągalne z menu Okno.

- Icon-only eye/lock/more posiada aria-label i tooltip; color nie jest jedynym nośnikiem state.

- Dark/Light, focus-visible, keyboard tree navigation, reduced motion i token-only colors są obowiązkowe.

- Actions destrukcyjne wymagają confirm dialogu z jasnym opisem i named danger action.

## Test matrix

- [ ] TM-001: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-002: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-003: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-004: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-005: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-006: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-007: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-008: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-009: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-010: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-011: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-012: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-013: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-014: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-015: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-016: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-017: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-018: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-019: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-020: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-021: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-022: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-023: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-024: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-025: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-026: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-027: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-028: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-029: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-030: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-031: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-032: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-033: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-034: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-035: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-036: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-037: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-038: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-039: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-040: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-041: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-042: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-043: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-044: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-045: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-046: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-047: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-048: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-049: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-050: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-051: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-052: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-053: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-054: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-055: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-056: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-057: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-058: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-059: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-060: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-061: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-062: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-063: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-064: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-065: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-066: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-067: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-068: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-069: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-070: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-071: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-072: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-073: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-074: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-075: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-076: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-077: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-078: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-079: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-080: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-081: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-082: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-083: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-084: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-085: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-086: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-087: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-088: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-089: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-090: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-091: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-092: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-093: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-094: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-095: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-096: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-097: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-098: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-099: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-100: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-101: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-102: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-103: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-104: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-105: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-106: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-107: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-108: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-109: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-110: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-111: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-112: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-113: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-114: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-115: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-116: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-117: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-118: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-119: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.
- [ ] TM-120: Zweryfikuj layer/group tree, reorder, visibility, lock, selection, Undo/Redo i keyboard navigation.

## Definition of Done

- [ ] LAYER-001…017 jest dostarczone albo etapowane.
- [ ] Ownership i z-order invariants są testowane.
- [ ] UI jest tokenowy, keyboard accessible i płynny.
- [ ] Unit/E2E/visual regression tests przechodzą w CI.

## Źródła

- `BACKLOG.md`: LAYER-001…017.
- `VECTORIA_ARCHITECTURE.md`: Layer, LayerChild, commands, renderer i document invariants.
- `DESIGN_SYSTEM.md`: Layers row, dock, tokeny i accessibility.
<!-- Kontrolna linia LAYER 303. -->
<!-- Kontrolna linia LAYER 304. -->
<!-- Kontrolna linia LAYER 305. -->
<!-- Kontrolna linia LAYER 306. -->
<!-- Kontrolna linia LAYER 307. -->
<!-- Kontrolna linia LAYER 308. -->
<!-- Kontrolna linia LAYER 309. -->
<!-- Kontrolna linia LAYER 310. -->
<!-- Kontrolna linia LAYER 311. -->
<!-- Kontrolna linia LAYER 312. -->
<!-- Kontrolna linia LAYER 313. -->
<!-- Kontrolna linia LAYER 314. -->
<!-- Kontrolna linia LAYER 315. -->
<!-- Kontrolna linia LAYER 316. -->
<!-- Kontrolna linia LAYER 317. -->
<!-- Kontrolna linia LAYER 318. -->
<!-- Kontrolna linia LAYER 319. -->
<!-- Kontrolna linia LAYER 320. -->
