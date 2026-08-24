# [EPIC-12] Obrazy i zasoby zewnętrzne — specyfikacja wykonawcza

## Cel

Użytkownik importuje, osadza, linkuje, kadruje i styluje obrazy oraz zarządza symbolami, bibliotekami SVG i Brand Kit bez utraty płynności, bezpieczeństwa lub referencji assetów.

## Niezmienniki

- Image/asset model nie zależy od React ani Canvas API.

- Import jest walidowany, asynchroniczny i nie blokuje inputu.

- Embed przechowuje bytes/metadane; link przechowuje URI, status i fingerprint bez dostępu poza polityką browsera.

- Każda trwała operacja assetu jest command-based i undoable.

- Missing linked asset nie niszczy dokumentu; renderer pokazuje explicit placeholder/error.

- Crop/filters/trace mają preview-first workflow; ciężkie trace jest worker candidate.

- Symbol definition i instances mają stabilne IDs oraz nie tworzą cyclical references.

## Kontrakty

```ts
export interface ImageAsset { id:string; source:"embedded"|"linked"; mimeType:string; uri?:string; bytes?:string; width:number; height:number; status:"ready"|"missing"|"error"; }
export interface ImageObject extends BaseObject { type:"image"; assetId:string; crop?:Rect; adjustments?: ImageAdjustments; }
```

## Backlog

### ASSET-001

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-001.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-001.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-001.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-001.

### ASSET-002

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-002.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-002.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-002.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-002.

### ASSET-003

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-003.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-003.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-003.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-003.

### ASSET-004

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-004.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-004.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-004.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-004.

### ASSET-005

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-005.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-005.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-005.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-005.

### ASSET-006

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-006.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-006.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-006.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-006.

### ASSET-007

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-007.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-007.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-007.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-007.

### ASSET-008

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-008.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-008.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-008.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-008.

### ASSET-009

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-009.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-009.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-009.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-009.

### ASSET-010

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-010.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-010.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-010.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-010.

### ASSET-011

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-011.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-011.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-011.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-011.

### ASSET-012

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-012.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-012.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-012.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-012.

### ASSET-013

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-013.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-013.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-013.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-013.

### ASSET-014

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-014.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-014.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-014.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-014.

### ASSET-015

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-015.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-015.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-015.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-015.

### ASSET-016

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-016.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-016.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-016.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-016.

### ASSET-017

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-017.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-017.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-017.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-017.

### ASSET-018

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-018.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-018.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-018.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-018.

### ASSET-019

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-019.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-019.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-019.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-019.

### ASSET-020

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-020.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-020.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-020.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-020.

### ASSET-021

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-021.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-021.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-021.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-021.

### ASSET-022

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-022.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-022.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-022.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-022.

### ASSET-023

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-023.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-023.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-023.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-023.

### ASSET-024

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-024.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-024.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-024.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-024.

### ASSET-025

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-025.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-025.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-025.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-025.

### ASSET-026

- [ ] Zdefiniuj domain contract, validation, command i serialization dla ASSET-026.
- [ ] Dodaj async import/link/preview workflow oraz error handling dla ASSET-026.
- [ ] Zapewnij Properties UI, keyboard/ARIA i explicit feedback dla ASSET-026.
- [ ] Dodaj Undo/Redo, autosave oraz unit/E2E test dla ASSET-026.

## Reguły

- PNG/JPG/WebP/SVG/PDF drag-and-drop waliduje MIME, wielkość, parser i bezpieczne URI; SVG jest sanitizowany.
- Import place workflow pokazuje preview, progress, cancel i commit tylko po successful validation.
- Crop jest non-destructive: frame/crop transform zamiast modyfikacji original asset bytes.
- Opacity/brightness/contrast/saturation/grayscale są appearance params z preview i command apply.
- Links panel pokazuje URI, status, last check i action relink/embed; missing asset ma warning icon+text.
- Trace black-and-white/simple logo jest worker candidate, prezentuje progress, preview, threshold i Cancel.
- Symbol instances aktualizują się po zmianie definition przez dependency graph; unlink/override ma jawną policy.
- SVG libraries i Brand Kit są local-first assets z licensing/provenance metadata.

## UI i accessibility

- Assets tab jest w Right Dock; import ma drop zone, file picker, progress, cancel i plain-language errors.

- Image Properties ma Source, Crop, Adjustments, Opacity oraz Links sections.

- Preview/crop overlay działa w screen space; nie zasłania selection i ma keyboard alternative w Properties.

- Status missing/relink uses warning/error token plus text/icon; no color-only state.

- Dark/Light, focus-visible, aria-live for progress, reduced motion i token-only colors są obowiązkowe.

## Test matrix

- [ ] TM-001: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-002: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-003: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-004: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-005: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-006: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-007: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-008: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-009: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-010: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-011: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-012: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-013: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-014: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-015: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-016: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-017: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-018: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-019: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-020: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-021: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-022: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-023: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-024: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-025: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-026: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-027: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-028: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-029: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-030: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-031: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-032: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-033: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-034: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-035: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-036: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-037: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-038: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-039: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-040: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-041: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-042: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-043: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-044: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-045: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-046: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-047: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-048: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-049: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-050: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-051: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-052: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-053: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-054: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-055: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-056: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-057: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-058: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-059: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-060: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-061: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-062: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-063: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-064: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-065: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-066: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-067: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-068: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-069: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-070: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-071: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-072: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-073: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-074: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-075: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-076: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-077: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-078: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-079: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-080: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-081: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-082: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-083: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-084: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-085: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-086: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-087: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-088: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-089: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-090: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-091: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-092: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-093: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-094: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-095: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-096: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-097: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-098: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-099: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-100: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-101: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-102: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-103: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-104: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-105: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-106: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-107: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-108: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-109: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-110: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-111: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-112: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-113: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-114: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-115: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-116: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-117: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-118: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-119: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.
- [ ] TM-120: Zweryfikuj import/embed/link/crop/filter/trace/symbol przy Undo, autosave, error i Dark/Light.

## Definition of Done

- [ ] ASSET-001…026 są dostarczone lub etapowane zgodnie z 0.2/0.3+.
- [ ] Import/link/recovery są bezpieczne, command-based i nie blokują inputu.
- [ ] Asset references, symbols i Brand Kit nie mają dangling/cyclical relations.
- [ ] Unit/E2E/import/visual tests przechodzą w CI.

## Źródła

- `BACKLOG.md`: ASSET-001…026.
- `VECTORIA_ARCHITECTURE.md`: IO, ImageObject, persistence, commands i workers later.
- `DESIGN_SYSTEM.md`: Assets Dock, import feedback, Properties, tokens i accessibility.
