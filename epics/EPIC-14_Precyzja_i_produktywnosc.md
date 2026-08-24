# [EPIC-14] Precyzja i produktywność — specyfikacja wykonawcza

## Cel

Użytkownik pracuje szybciej dzięki kontekstowym inspectorom, bezpiecznym polom matematycznym, spójnemu clipboardowi, Select Same, Find/Replace, Command Palette i konfigurowalnym skrótom.

## Niezmienniki

- Properties mapuje UI intents na engine commands; nie mutuje DocumentModel bezpośrednio.

- NumberInput parsuje wyrażenia centralnie i atomowo; invalid input nie częściowo zmienia dokumentu.

- Clipboard serializuje bezpieczny VCT/SVG fragment, nie React/canvas/transient state.

- Paste tworzy nowe IDs i zachowuje ownership/layer/z-order policy.

- Select Same i Find/Replace wykonują query na modelu, a Apply jest command-based.

- Command Palette jest command-first, najpierw deterministyczne actions, później optional AI.

- Skróty respektują focus w text/input i nie przechwytują standardowego typing.

## Kontrakty

```ts
export interface EditorCommand { id:string; title:string; shortcut?:string; enabled(ctx:EditorContext):boolean; execute(ctx:EditorContext):void; }
export interface ClipboardFragment { schemaVersion:number; objects:SceneObject[]; styles:unknown[]; sourceArtboard?:Rect; }
```

## Backlog

### PROD-001

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-001.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-001.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-001.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-001.

### PROD-002

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-002.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-002.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-002.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-002.

### PROD-003

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-003.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-003.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-003.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-003.

### PROD-004

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-004.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-004.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-004.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-004.

### PROD-005

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-005.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-005.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-005.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-005.

### PROD-006

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-006.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-006.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-006.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-006.

### PROD-007

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-007.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-007.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-007.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-007.

### PROD-008

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-008.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-008.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-008.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-008.

### PROD-009

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-009.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-009.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-009.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-009.

### PROD-010

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-010.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-010.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-010.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-010.

### PROD-011

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-011.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-011.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-011.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-011.

### PROD-012

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-012.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-012.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-012.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-012.

### PROD-013

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-013.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-013.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-013.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-013.

### PROD-014

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-014.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-014.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-014.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-014.

### PROD-015

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-015.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-015.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-015.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-015.

### PROD-016

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-016.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-016.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-016.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-016.

### PROD-017

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-017.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-017.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-017.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-017.

### PROD-018

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-018.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-018.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-018.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-018.

### PROD-019

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-019.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-019.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-019.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-019.

### PROD-020

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-020.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-020.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-020.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-020.

### PROD-021

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-021.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-021.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-021.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-021.

### PROD-022

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-022.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-022.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-022.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-022.

### PROD-023

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-023.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-023.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-023.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-023.

### PROD-024

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-024.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-024.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-024.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-024.

### PROD-025

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-025.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-025.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-025.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-025.

### PROD-026

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-026.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-026.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-026.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-026.

### PROD-027

- [ ] Zdefiniuj command, validation, keyboard policy i persistence dla PROD-027.
- [ ] Dodaj Properties/Menu/Palette workflow, accessible labels i feedback dla PROD-027.
- [ ] Zapewnij Undo/Redo, history label, autosave oraz unit/E2E test dla PROD-027.
- [ ] Zachowaj selection, styles, layer ownership i z-order dla PROD-027.

## Reguły

- Properties jest kontekstowe: document, artboard, object, text, fill, stroke; sekcje mogą być collapsed z summary.
- Math expressions: `100/3`, `20+4`, `%` tylko z określoną bazą; Enter commit, Escape revert.
- Units switch jest szybki, nie powoduje world geometry drift.
- Copy/paste zachowuje style; paste in place używa source world transform; paste all artboards ma wyraźną target policy.
- Duplicate and Transform tworzy repeatable transform command.
- Select Same porównuje normalizowane fill/stroke/font/size/opacity/type z tolerancją liczbową.
- Find/Replace Object/Style pokazuje result preview i selected apply; bez cichej masowej mutacji.
- Command Palette Ctrl/Cmd+K ma searchable commands, keyboard navigation, disabled reason i shortcut badges.
- Shortcut config wykrywa conflicts, ma reset default oraz storage local-first.
- UI presets zapisują układ dock/panels, nie wpływają na DocumentModel.

## UI i accessibility

- Right Dock Properties jest default tab; labels krótkie, values mono/tabular, focus order logiczny.

- Command Palette width 640 px, focus trap, search input i Escape close.

- Tooltip pokazuje label oraz shortcut; icon-only buttons zawsze mają aria-label.

- Status/Toast używa text+icon, semantic tokens i kontrolowanego aria-live.

- Dark/Light, focus-visible, reduced motion, no hard-coded feature colors są obowiązkowe.

## Test matrix

- [ ] TM-001: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-002: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-003: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-004: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-005: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-006: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-007: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-008: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-009: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-010: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-011: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-012: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-013: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-014: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-015: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-016: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-017: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-018: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-019: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-020: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-021: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-022: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-023: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-024: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-025: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-026: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-027: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-028: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-029: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-030: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-031: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-032: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-033: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-034: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-035: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-036: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-037: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-038: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-039: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-040: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-041: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-042: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-043: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-044: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-045: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-046: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-047: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-048: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-049: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-050: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-051: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-052: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-053: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-054: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-055: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-056: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-057: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-058: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-059: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-060: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-061: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-062: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-063: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-064: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-065: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-066: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-067: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-068: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-069: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-070: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-071: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-072: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-073: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-074: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-075: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-076: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-077: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-078: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-079: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-080: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-081: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-082: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-083: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-084: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-085: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-086: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-087: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-088: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-089: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-090: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-091: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-092: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-093: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-094: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-095: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-096: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-097: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-098: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-099: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-100: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-101: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-102: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-103: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-104: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-105: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-106: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-107: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-108: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-109: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-110: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-111: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-112: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-113: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-114: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-115: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-116: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-117: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-118: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-119: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.
- [ ] TM-120: Zweryfikuj inspector/math/clipboard/select-same/find-replace/palette/shortcut przy keyboard i Undo.

## Definition of Done

- [ ] PROD-001…027 jest dostarczone albo etapowane zgodnie z 0.1/0.2.
- [ ] Wszystkie mutacje są command-based, undoable i accessible.
- [ ] Clipboard/shortcuts/properties nie naruszają input focus ani invariants.
- [ ] Unit/E2E/visual regression tests przechodzą w CI.

## Źródła

- `BACKLOG.md`: PROD-001…027.
- `VECTORIA_ARCHITECTURE.md`: UI/engine/commands/state boundaries.
- `DESIGN_SYSTEM.md`: Properties, NumberInput, Command Palette, menus, tokens i accessibility.
