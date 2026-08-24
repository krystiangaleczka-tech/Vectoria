# [EPIC-16] Eksport — specyfikacja wykonawcza

## Cel

Użytkownik eksportuje artboard, selection lub obszar jako SVG, PNG, JPG, WebP i PDF z przewidywalnymi wymiarami, tłem, jakością, progress/cancel oraz bez blokowania editor input.

## Niezmienniki

- Eksport korzysta z immutable snapshot DocumentModel, nie z widocznego editor canvasu.

- Canvas editor nie jest wykorzystywany jako target high-resolution exportu.

- Eksport jest async job z status/progress/result/error/cancel; ciężkie zadania są worker candidates.

- Każdy format ma walidowany options contract i limit pamięci/wymiaru.

- Artboard/selection/area target jest explicit, world-space i niezależny od viewport zoom.

- Błąd eksportu nie zmienia dokumentu ani dirty state.

## Kontrakty

```ts
export interface ExportRequest { format:"svg"|"png"|"jpg"|"webp"|"pdf"; target:"artboard"|"selection"|"area"; scale?:number; background?:string|"transparent"; quality?:number; }
export interface ExportJob { id:string; status:"queued"|"running"|"done"|"error"|"cancelled"; progress?:number; }
```

## Backlog

### EXPORT-001

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-001.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-001.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-001.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-001.

### EXPORT-002

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-002.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-002.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-002.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-002.

### EXPORT-003

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-003.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-003.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-003.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-003.

### EXPORT-004

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-004.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-004.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-004.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-004.

### EXPORT-005

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-005.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-005.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-005.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-005.

### EXPORT-006

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-006.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-006.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-006.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-006.

### EXPORT-007

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-007.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-007.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-007.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-007.

### EXPORT-008

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-008.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-008.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-008.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-008.

### EXPORT-009

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-009.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-009.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-009.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-009.

### EXPORT-010

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-010.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-010.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-010.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-010.

### EXPORT-011

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-011.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-011.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-011.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-011.

### EXPORT-012

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-012.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-012.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-012.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-012.

### EXPORT-013

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-013.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-013.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-013.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-013.

### EXPORT-014

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-014.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-014.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-014.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-014.

### EXPORT-015

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-015.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-015.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-015.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-015.

### EXPORT-016

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-016.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-016.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-016.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-016.

### EXPORT-017

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-017.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-017.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-017.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-017.

### EXPORT-018

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-018.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-018.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-018.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-018.

### EXPORT-019

- [ ] Zdefiniuj options, validation, job status i output policy dla EXPORT-019.
- [ ] Dodaj Export Dialog/Menu, preview, progress, cancel i error UI dla EXPORT-019.
- [ ] Dodaj regression tests dimensions/color/output dla EXPORT-019.
- [ ] Zachowaj target geometry, safe memory limit i async input priority dla EXPORT-019.

## Reguły

- SVG editable zachowuje struktury/IDs gdy możliwe; optimized ma oddzielną, udokumentowaną optymalizację.
- PNG 1x/2x/3x/custom używa temporary export canvas, nie editor canvas.
- JPG/WebP quality jest numeric input z preview/estimated output; transparent target wymaga jasnej background policy.
- PDF single/all artboards, bleed/crop marks P1 oraz compatibility warnings mają osobny layout pipeline.
- Selection export używa selection bounds; area export używa explicit world rect; artboard export używa active/selected artboard.
- Export for Screens batchuje targets/formats/naming i ma partial failure report.

## UI i accessibility

- Export Dialog 560–720 px ma target, format, scale/quality/background options, primary Export i Cancel.

- Progress jest widoczny jako stage + determinate/indeterminate indicator, aria-live i cancel action.

- Success toast `Export ready`; error ma text, code i recovery action, nie tylko toast.

- Top Bar Export ma accessible label i tooltip; controls używają tokens Dark/Light, focus-visible i keyboard.

## Test matrix

- [ ] TM-001: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-002: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-003: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-004: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-005: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-006: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-007: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-008: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-009: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-010: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-011: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-012: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-013: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-014: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-015: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-016: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-017: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-018: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-019: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-020: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-021: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-022: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-023: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-024: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-025: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-026: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-027: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-028: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-029: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-030: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-031: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-032: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-033: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-034: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-035: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-036: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-037: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-038: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-039: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-040: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-041: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-042: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-043: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-044: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-045: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-046: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-047: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-048: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-049: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-050: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-051: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-052: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-053: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-054: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-055: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-056: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-057: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-058: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-059: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-060: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-061: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-062: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-063: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-064: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-065: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-066: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-067: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-068: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-069: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-070: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-071: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-072: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-073: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-074: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-075: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-076: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-077: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-078: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-079: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-080: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-081: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-082: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-083: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-084: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-085: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-086: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-087: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-088: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-089: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-090: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-091: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-092: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-093: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-094: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-095: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-096: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-097: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-098: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-099: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-100: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-101: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-102: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-103: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-104: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-105: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-106: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-107: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-108: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-109: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-110: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-111: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-112: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-113: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-114: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-115: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-116: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-117: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-118: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-119: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.
- [ ] TM-120: Zweryfikuj target/format/scale/background/quality/cancel/memory/error przy SVG PNG JPG WebP PDF.

## Definition of Done

- [ ] EXPORT-001…019 jest dostarczone albo etapowane.
- [ ] Eksport jest async, memory-safe i nie blokuje inputu.
- [ ] UI ma progress/cancel/error/success i accessibility coverage.
- [ ] Output regression/E2E tests przechodzą w CI.

## Źródła

- `BACKLOG.md`: EXPORT-001…019.
- `VECTORIA_ARCHITECTURE.md`: SVG/PNG IO, jobs, renderer independence i memory limits.
- `DESIGN_SYSTEM.md`: Export Dialog, progress, toast/error UX i accessibility.
<!-- Kontrolna linia EXPORT 317. -->
<!-- Kontrolna linia EXPORT 318. -->
<!-- Kontrolna linia EXPORT 319. -->
<!-- Kontrolna linia EXPORT 320. -->
