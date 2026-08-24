# [EPIC-15] Import, format i zapis — specyfikacja wykonawcza

## Cel

Vectoria używa `.vct` jako wersjonowanego formatu projektu, SVG jako priorytetowego formatu wymiany i bezpiecznie importuje grafiki/clipboard bez utraty responsywności ani zaufania do niezwartych danych.

## Niezmienniki

- VCT jest envelope `{app,schemaVersion,document}` walidowany Zod i migrowany przed load.

- SVG jest adapterem import/export, nigdy jedynym source of truth DocumentModel.

- Importer sanitizuje scripts, event handlers, unsafe URLs i nieobsługiwane feature warnings.

- Import/export nie blokuje inputu; ciężkie operacje są job/worker candidates.

- Każdy commit importu jest command/history boundary; Cancel nie modyfikuje bieżącego dokumentu.

- AI/CDR best-effort zawsze ujawnia editable/simplified/flattened/unsupported status.

## Kontrakty

```ts
export interface VctEnvelope { app:"vectoria"; schemaVersion:number; document:DocumentModel; }
export interface ImportReport { editable:number; simplified:number; flattened:number; unsupported:number; entries:ImportReportEntry[]; }
```

## Backlog

### IO-001

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-001.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-001.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-001.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-001.

### IO-002

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-002.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-002.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-002.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-002.

### IO-003

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-003.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-003.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-003.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-003.

### IO-004

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-004.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-004.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-004.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-004.

### IO-005

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-005.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-005.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-005.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-005.

### IO-006

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-006.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-006.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-006.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-006.

### IO-007

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-007.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-007.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-007.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-007.

### IO-008

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-008.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-008.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-008.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-008.

### IO-009

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-009.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-009.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-009.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-009.

### IO-010

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-010.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-010.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-010.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-010.

### IO-011

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-011.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-011.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-011.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-011.

### IO-012

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-012.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-012.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-012.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-012.

### IO-013

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-013.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-013.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-013.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-013.

### IO-014

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-014.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-014.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-014.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-014.

### IO-015

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-015.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-015.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-015.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-015.

### IO-016

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-016.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-016.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-016.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-016.

### IO-017

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-017.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-017.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-017.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-017.

### IO-018

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-018.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-018.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-018.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-018.

### IO-019

- [ ] Zdefiniuj format, validation, security policy i error contract dla IO-019.
- [ ] Dodaj async progress/cancel/recovery UI oraz command integration dla IO-019.
- [ ] Zapewnij serialization, migration, tests i compatibility report dla IO-019.
- [ ] Zachowaj DocumentModel invariants oraz explicit feedback dla IO-019.

## Reguły implementacyjne

- VCT zawiera dokument, artboardy, layers, styles oraz embedded/linked asset metadata; schema version jest obowiązkowy.
- SVG import mapuje rect/circle/ellipse/line/polyline/polygon/path/g/fill/stroke; unsupported filter/mask/font jest raportowany.
- SVG export editable tworzy viewBox z artboardu i zachowuje wspierane style/gradienty.
- PNG/JPG/WebP import przechodzi przez asset pipeline; PDF zachowuje vectors gdzie to możliwe.
- EPS P2, AI/CDR best-effort są oddzielone capability/provider contracts i nigdy nie obiecują pełnej kompatybilności.
- Clipboard SVG korzysta z tego samego sanitizer/importer co file import.
- Import report ma categories editable/simplified/flattened/unsupported i nie zastępuje aktualnego dokumentu przed Continue.

## UI i accessibility

- Import Dialog 640–800 px ma drop zone, file name, progress stage, Cancel oraz recovery action.

- Compatibility Report pokazuje counts, filter tabs i warning row z layer/object gdy dostępne.

- Status/progress używa aria-live, text+icon i semantic tokens; toast nie zastępuje krytycznego error UI.

- Top Bar import/export actions mają accessible labels, tooltipy i keyboard flow.

- Dark/Light, focus trap, focus-visible i reduced motion są obowiązkowe.

## Test matrix

- [ ] TM-001: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-002: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-003: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-004: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-005: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-006: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-007: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-008: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-009: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-010: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-011: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-012: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-013: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-014: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-015: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-016: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-017: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-018: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-019: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-020: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-021: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-022: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-023: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-024: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-025: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-026: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-027: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-028: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-029: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-030: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-031: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-032: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-033: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-034: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-035: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-036: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-037: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-038: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-039: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-040: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-041: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-042: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-043: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-044: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-045: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-046: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-047: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-048: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-049: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-050: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-051: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-052: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-053: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-054: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-055: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-056: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-057: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-058: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-059: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-060: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-061: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-062: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-063: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-064: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-065: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-066: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-067: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-068: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-069: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-070: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-071: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-072: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-073: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-074: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-075: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-076: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-077: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-078: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-079: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-080: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-081: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-082: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-083: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-084: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-085: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-086: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-087: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-088: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-089: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-090: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-091: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-092: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-093: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-094: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-095: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-096: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-097: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-098: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-099: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-100: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-101: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-102: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-103: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-104: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-105: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-106: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-107: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-108: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-109: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-110: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-111: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-112: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-113: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-114: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-115: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-116: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-117: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-118: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-119: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.
- [ ] TM-120: Zweryfikuj VCT/SVG/import/sanitization/migration/cancel/report przy corruption, large file i keyboard.

## Definition of Done

- [ ] IO-001…019 są dostarczone albo etapowane zgodnie z 0.1/P2.
- [ ] VCT/SVG adapters są walidowane, migrowalne i nie łamią invariants.
- [ ] Nieufny SVG jest sanitizowany, a ograniczenia formatu są jawne.
- [ ] Import UI, progress, cancel i reports spełniają accessibility oraz CI tests.

## Źródła

- `BACKLOG.md`: IO-001…019.
- `VECTORIA_ARCHITECTURE.md`: VCT, SVG adapters, IndexedDB, import/export and security boundaries.
- `DESIGN_SYSTEM.md`: Import Dialog, Compatibility Report, feedback i accessibility.
<!-- Kontrolna linia IO 320. -->
