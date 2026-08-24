# [EPIC-08] Boolean, maski i compositing — specyfikacja wykonawcza

## Cel

Użytkownik łączy i dzieli geometrię, buduje compound paths, clipping/opacity masks oraz edytuje je w bezpiecznym isolate mode. Operacje są deterministyczne, preview-first, command-based i odporne na złożone krzywe.

## Niezmienniki

- Boolean działa na domain geometry, nie na bitmapie canvasu.

- Input jest normalizowany do paths bez mutacji source przed Apply.

- Preview jest transient; ciężkie obliczenia nie blokują inputu i mogą przejść do workera po benchmarkach.

- Każdy Apply tworzy jedną odwracalną command; Cancel zachowuje source objects.

- Wynik zachowuje layer ownership, style policy, visibility/lock i poprawne IDs.

- Invariants blokują NaN, self-invalid paths, dangling mask targets i puste compound references.

- Renderer rozróżnia scene/overlay; mask isolation nie powoduje React rerender przy pointermove.

## Kontrakty

```ts
export interface BooleanPreview { operation: BooleanOperation; inputIds:string[]; result: PathObject[]; warnings:string[]; }
export type BooleanOperation = "unite"|"subtract"|"intersect"|"exclude"|"divide"|"crop";
export interface MaskGroup { id:string; mode:"clip"|"opacity"; maskId:string; contentIds:string[]; }
```

## Backlog wykonawczy

### BOOL-001 — Unite/Weld

- [ ] Zdefiniuj domain operation, input normalization i validation dla Unite/Weld.
- [ ] Dodaj preview/apply/cancel operation session dla Unite/Weld.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Unite/Weld.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Unite/Weld.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Unite/Weld.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Unite/Weld.

### BOOL-002 — Subtract/Trim

- [ ] Zdefiniuj domain operation, input normalization i validation dla Subtract/Trim.
- [ ] Dodaj preview/apply/cancel operation session dla Subtract/Trim.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Subtract/Trim.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Subtract/Trim.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Subtract/Trim.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Subtract/Trim.

### BOOL-003 — Intersect

- [ ] Zdefiniuj domain operation, input normalization i validation dla Intersect.
- [ ] Dodaj preview/apply/cancel operation session dla Intersect.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Intersect.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Intersect.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Intersect.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Intersect.

### BOOL-004 — Exclude

- [ ] Zdefiniuj domain operation, input normalization i validation dla Exclude.
- [ ] Dodaj preview/apply/cancel operation session dla Exclude.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Exclude.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Exclude.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Exclude.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Exclude.

### BOOL-005 — Divide

- [ ] Zdefiniuj domain operation, input normalization i validation dla Divide.
- [ ] Dodaj preview/apply/cancel operation session dla Divide.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Divide.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Divide.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Divide.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Divide.

### BOOL-006 — Crop

- [ ] Zdefiniuj domain operation, input normalization i validation dla Crop.
- [ ] Dodaj preview/apply/cancel operation session dla Crop.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Crop.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Crop.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Crop.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Crop.

### BOOL-007 — Compound Path

- [ ] Zdefiniuj domain operation, input normalization i validation dla Compound Path.
- [ ] Dodaj preview/apply/cancel operation session dla Compound Path.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Compound Path.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Compound Path.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Compound Path.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Compound Path.

### BOOL-008 — Holes

- [ ] Zdefiniuj domain operation, input normalization i validation dla Holes.
- [ ] Dodaj preview/apply/cancel operation session dla Holes.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Holes.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Holes.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Holes.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Holes.

### BOOL-009 — Clipping Mask

- [ ] Zdefiniuj domain operation, input normalization i validation dla Clipping Mask.
- [ ] Dodaj preview/apply/cancel operation session dla Clipping Mask.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Clipping Mask.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Clipping Mask.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Clipping Mask.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Clipping Mask.

### BOOL-010 — Edycja clipping mask

- [ ] Zdefiniuj domain operation, input normalization i validation dla Edycja clipping mask.
- [ ] Dodaj preview/apply/cancel operation session dla Edycja clipping mask.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Edycja clipping mask.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Edycja clipping mask.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Edycja clipping mask.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Edycja clipping mask.

### BOOL-011 — Opacity Mask

- [ ] Zdefiniuj domain operation, input normalization i validation dla Opacity Mask.
- [ ] Dodaj preview/apply/cancel operation session dla Opacity Mask.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Opacity Mask.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Opacity Mask.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Opacity Mask.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Opacity Mask.

### BOOL-012 — Isolate Mode grup

- [ ] Zdefiniuj domain operation, input normalization i validation dla Isolate Mode grup.
- [ ] Dodaj preview/apply/cancel operation session dla Isolate Mode grup.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Isolate Mode grup.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Isolate Mode grup.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Isolate Mode grup.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Isolate Mode grup.

### BOOL-013 — Isolate Mode masek

- [ ] Zdefiniuj domain operation, input normalization i validation dla Isolate Mode masek.
- [ ] Dodaj preview/apply/cancel operation session dla Isolate Mode masek.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Isolate Mode masek.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Isolate Mode masek.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Isolate Mode masek.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Isolate Mode masek.

### BOOL-014 — Expand Appearance

- [ ] Zdefiniuj domain operation, input normalization i validation dla Expand Appearance.
- [ ] Dodaj preview/apply/cancel operation session dla Expand Appearance.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Expand Appearance.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Expand Appearance.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Expand Appearance.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Expand Appearance.

### BOOL-015 — Boolean preview

- [ ] Zdefiniuj domain operation, input normalization i validation dla Boolean preview.
- [ ] Dodaj preview/apply/cancel operation session dla Boolean preview.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Boolean preview.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Boolean preview.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Boolean preview.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Boolean preview.

### BOOL-016 — Boolean regression tests

- [ ] Zdefiniuj domain operation, input normalization i validation dla Boolean regression tests.
- [ ] Dodaj preview/apply/cancel operation session dla Boolean regression tests.
- [ ] Ustal style, fill rule, z-order i ownership policy dla Boolean regression tests.
- [ ] Dodaj command, Undo/Redo, history label i autosave dla Boolean regression tests.
- [ ] Dodaj warning dla lossy/unsupported geometry i recovery path dla Boolean regression tests.
- [ ] Dodaj unit geometry tests oraz Playwright workflow dla Boolean regression tests.

## Reguły implementacyjne

### Boolean

- Unite scala nakładające się zamknięte regiony w jeden compound/result path.
- Subtract/Trim odejmuje target zgodnie z deterministyczną kolejnością selection/key object.
- Intersect zwraca wyłącznie wspólny region; pusty wynik jest preview warningiem.
- Exclude używa symetrycznej różnicy i zachowuje holes przez fill-rule policy.
- Divide tworzy osobne regiony z stabilnymi IDs i jasną policy style inheritance.
- Crop używa top/active crop object i nie usuwa sources przed Apply.

### Compound i maski

- Compound Path przechowuje children/references z jednoznacznym ownership i fill rule.
- Holes wynikają z compound semantics, nie z przypadkowego koloru tła.
- Clipping Mask ma mask object i content set; mask jest top-most w isolate context.
- Opacity Mask ma jawne semantics luminance/alpha, preview i fallback dla unsupported render paths.
- Isolate Mode zmienia editing context, breadcrumb i hit-test scope; Escape wraca bez zmiany dokumentu.
- Expand Appearance materializuje appearance wyłącznie po explicit action, preview i warningu.

## UI i design system

- Boolean actions są w Object menu i context-aware Properties; rzadkie opcje trafiają do popover/menu.

- Preview pokazuje proposed result, source count i warning text+icon; kolor nie jest jedynym sygnałem.

- Mask/isolate context ma widoczny breadcrumb/status oraz action `Exit isolation` dostępny z klawiatury.

- Critical destructive apply ma confirm dialog ≤480 px, focus trap, jasny consequence i named danger action.

- Right Dock Properties/Layers pokazuje compound/mask hierarchy semantycznie; selected state jest subtle.

- Wszystkie controls używają tokenów Dark/Light, aria-label, focus-visible i reduced-motion.

## Test matrix

- [ ] TM-001: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-002: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-003: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-004: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-005: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-006: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-007: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-008: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-009: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-010: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-011: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-012: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-013: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-014: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-015: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-016: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-017: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-018: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-019: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-020: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-021: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-022: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-023: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-024: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-025: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-026: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-027: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-028: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-029: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-030: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-031: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-032: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-033: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-034: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-035: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-036: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-037: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-038: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-039: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-040: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-041: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-042: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-043: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-044: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-045: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-046: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-047: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-048: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-049: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-050: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-051: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-052: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-053: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-054: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-055: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-056: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-057: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-058: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-059: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-060: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-061: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-062: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-063: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-064: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-065: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-066: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-067: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-068: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-069: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-070: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-071: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-072: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-073: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-074: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-075: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-076: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-077: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-078: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-079: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-080: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-081: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-082: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-083: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-084: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-085: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-086: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-087: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-088: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-089: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-090: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-091: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-092: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-093: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-094: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-095: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-096: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-097: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-098: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-099: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-100: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-101: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-102: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-103: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-104: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-105: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-106: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-107: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-108: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-109: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-110: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-111: Zweryfikuj subtract holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-112: Zweryfikuj intersect empty przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-113: Zweryfikuj exclude fill-rule przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-114: Zweryfikuj divide IDs przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-115: Zweryfikuj crop ordering przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-116: Zweryfikuj compound holes przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-117: Zweryfikuj clip isolation przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-118: Zweryfikuj opacity mask przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-119: Zweryfikuj preview cancel przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.
- [ ] TM-120: Zweryfikuj unite curves przy zoomie, Undo/Redo, preview, SVG round-trip i accessibility.

## Pliki

```text
packages/core/src/{geometry/boolean.ts,objects/path.ts,objects/group.ts,commands/boolean.ts,commands/mask.ts}
packages/editor-engine/src/{operations/boolean-session.ts,isolation/isolation-service.ts}
packages/renderer/src/{scene-renderer.ts,overlay-renderer.ts,mask-renderer.ts}
apps/web/src/features/{properties/BooleanProperties.tsx,layers/LayersPanel.tsx}
```

## Definition of Done

- [ ] BOOL-001…016 jest dostarczone albo etapowane z zachowaniem contracts.
- [ ] Preview/cancel nie mutują dokumentu; Apply jest single command i undoable.
- [ ] Compound/mask ownership nie ma dangling references ani błędnych holes.
- [ ] UI spełnia tokeny, keyboard, ARIA i explicit feedback.
- [ ] Geometry/compound/SVG/E2E regressions przechodzą w CI.

## Źródła

- `BACKLOG.md`: BOOL-001…016.
- `VECTORIA_ARCHITECTURE.md`: domain/commands, renderer, workers later i invariants.
- `DESIGN_SYSTEM.md`: Properties, Layers, dialogs, preview feedback, tokens i accessibility.
