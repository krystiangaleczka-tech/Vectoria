# [EPIC-13] Efekty i appearance — specyfikacja wykonawcza

## Cel

Użytkownik buduje appearance obiektu jako uporządkowany, edytowalny stack fill, stroke, opacity i efektów. Preview jest płynny, zmiany są command-based, a SVG/Canvas mają zdefiniowaną politykę zgodności i fallbacków.

## Etapy

- MVP: FX-001…010 — drop shadow, blur, opacity, rounded corners, stroke alignment/dash, basic SVG filters oraz Appearance Panel.
- Później: FX-011…014 — inner shadow, glow, rozszerzone blend modes i pattern fill.

## Niezmienniki

- Appearance jest domain model, nie renderer-specific listą Canvas API calls.

- Preview drag/slider jest transient; Apply/pointerup tworzy jedną command.

- Kolejność appearance layers jest stabilna, serializowalna i undoable.

- Efekty nie mogą zmienić bazowej geometrii bez jawnej Expand Appearance operation.

- Bounds dla culling uwzględniają projected effects z bezpiecznym margin policy.

- Ciężkie filtry mają quality policy interactive/final i mogą przejść do workera po benchmarkach.

- Unsupported SVG effect ma explicit export warning, nigdy ciche zniknięcie.

## Kontrakty

```ts
export interface AppearanceLayer { id:string; type:"fill"|"stroke"|"opacity"|"effect"; enabled:boolean; params:Record<string,unknown>; }
export interface AppearanceStack { layers:AppearanceLayer[]; }
export interface EffectPreview { objectId:string; proposed:AppearanceStack; warnings:string[]; }
```

## Backlog

### FX-001

- [ ] Zdefiniuj params, validation i serializację dla FX-001.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-001.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-001.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-001.

### FX-002

- [ ] Zdefiniuj params, validation i serializację dla FX-002.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-002.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-002.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-002.

### FX-003

- [ ] Zdefiniuj params, validation i serializację dla FX-003.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-003.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-003.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-003.

### FX-004

- [ ] Zdefiniuj params, validation i serializację dla FX-004.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-004.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-004.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-004.

### FX-005

- [ ] Zdefiniuj params, validation i serializację dla FX-005.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-005.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-005.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-005.

### FX-006

- [ ] Zdefiniuj params, validation i serializację dla FX-006.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-006.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-006.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-006.

### FX-007

- [ ] Zdefiniuj params, validation i serializację dla FX-007.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-007.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-007.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-007.

### FX-008

- [ ] Zdefiniuj params, validation i serializację dla FX-008.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-008.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-008.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-008.

### FX-009

- [ ] Zdefiniuj params, validation i serializację dla FX-009.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-009.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-009.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-009.

### FX-010

- [ ] Zdefiniuj params, validation i serializację dla FX-010.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-010.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-010.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-010.

### FX-011

- [ ] Zdefiniuj params, validation i serializację dla FX-011.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-011.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-011.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-011.

### FX-012

- [ ] Zdefiniuj params, validation i serializację dla FX-012.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-012.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-012.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-012.

### FX-013

- [ ] Zdefiniuj params, validation i serializację dla FX-013.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-013.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-013.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-013.

### FX-014

- [ ] Zdefiniuj params, validation i serializację dla FX-014.
- [ ] Dodaj Appearance Preview, Apply/Cancel i command dla FX-014.
- [ ] Dodaj UI controls, keyboard flow, ARIA i warning/fallback dla FX-014.
- [ ] Dodaj Canvas/SVG render policy i regression tests dla FX-014.

## Szczegółowe reguły

- Drop shadow: offset X/Y, blur, spread, color/opacity, visible bounds margin oraz non-destructive preview.
- Blur: radius finite ≥0, interactive quality policy i warning dla memory-heavy output.
- Opacity jest appearance layer oraz object property policy; nie dubluj niejednoznacznie alpha.
- Rounded corners jako effect jest niezależne od parametric shape radius i może wymagać Expand.
- Stroke alignment: center/inside/outside z jasnym fallback dla open paths.
- Dashed stroke dziedziczy StrokeStyle, ma validation dashArray i preview.
- SVG filters są allowlisted, sanitized i raportują unsupported features.
- Appearance Panel pokazuje ordered layers, enabled toggle, drag reorder insertion line, summary i action add/remove.
- Reorder zmienia tylko appearance stack; base object/style references pozostają stabilne.

## UI i accessibility

- Right Dock Appearance Panel używa panel header 32 px i tokenowego scrollu.

- Rows są keyboard sortable; each layer ma enabled, label, summary i more action.

- Effect errors/warnings używają text+icon oraz semantic token, nie samego koloru.

- NumberInput ma tabular values, Enter commit, Escape revert i accessible error message.

- Dark/Light, focus-visible, reduced-motion i brak CSS transitions dla canvas preview są obowiązkowe.

## Test matrix

- [ ] TM-001: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-002: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-003: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-004: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-005: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-006: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-007: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-008: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-009: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-010: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-011: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-012: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-013: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-014: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-015: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-016: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-017: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-018: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-019: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-020: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-021: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-022: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-023: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-024: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-025: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-026: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-027: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-028: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-029: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-030: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-031: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-032: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-033: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-034: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-035: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-036: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-037: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-038: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-039: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-040: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-041: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-042: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-043: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-044: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-045: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-046: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-047: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-048: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-049: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-050: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-051: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-052: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-053: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-054: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-055: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-056: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-057: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-058: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-059: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-060: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-061: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-062: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-063: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-064: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-065: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-066: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-067: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-068: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-069: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-070: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-071: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-072: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-073: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-074: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-075: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-076: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-077: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-078: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-079: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-080: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-081: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-082: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-083: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-084: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-085: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-086: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-087: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-088: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-089: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-090: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-091: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-092: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-093: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-094: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-095: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-096: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-097: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-098: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-099: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-100: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-101: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-102: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-103: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-104: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-105: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-106: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-107: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-108: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-109: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-110: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-111: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-112: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-113: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-114: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-115: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-116: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-117: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-118: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-119: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.
- [ ] TM-120: Zweryfikuj effect stack, preview/cancel, reorder, Undo, Canvas/SVG parity i accessibility.

## Definition of Done

- [ ] FX-001…010 działa jako MVP; późniejsze FX są odizolowane przez contracts.
- [ ] Appearance jest serializowalne, command-based i renderer-independent.
- [ ] Preview nie degraduje render loop; fallback/export warnings są jawne.
- [ ] UI i testy spełniają tokeny, keyboard, ARIA oraz CI regression.

## Źródła

- `BACKLOG.md`: FX-001…014.
- `VECTORIA_ARCHITECTURE.md`: style/commands/renderer quality/IO boundaries.
- `DESIGN_SYSTEM.md`: Appearance Panel, controls, tokens, feedback i accessibility.
<!-- Kontrolna linia FX 295. -->
<!-- Kontrolna linia FX 296. -->
<!-- Kontrolna linia FX 297. -->
<!-- Kontrolna linia FX 298. -->
<!-- Kontrolna linia FX 299. -->
<!-- Kontrolna linia FX 300. -->
<!-- Kontrolna linia FX 301. -->
<!-- Kontrolna linia FX 302. -->
<!-- Kontrolna linia FX 303. -->
<!-- Kontrolna linia FX 304. -->
<!-- Kontrolna linia FX 305. -->
<!-- Kontrolna linia FX 306. -->
<!-- Kontrolna linia FX 307. -->
<!-- Kontrolna linia FX 308. -->
<!-- Kontrolna linia FX 309. -->
<!-- Kontrolna linia FX 310. -->
<!-- Kontrolna linia FX 311. -->
<!-- Kontrolna linia FX 312. -->
<!-- Kontrolna linia FX 313. -->
<!-- Kontrolna linia FX 314. -->
<!-- Kontrolna linia FX 315. -->
<!-- Kontrolna linia FX 316. -->
<!-- Kontrolna linia FX 317. -->
<!-- Kontrolna linia FX 318. -->
<!-- Kontrolna linia FX 319. -->
<!-- Kontrolna linia FX 320. -->
