# [EPIC-10] Tekst i typografia — specyfikacja wykonawcza

## Cel

Tekst jest obiektem domenowym, edytowalnym na canvasie, serializowalnym i eksportowalnym bez blokowania render loop. Wszystkie zmiany typografii są command-based, undoable i dostępne z Properties oraz klawiatury.

## Zasady architektury

- Text model nie zależy od DOM; DOM contenteditable jest wyłącznie warstwą edycji/interakcji.

- Text layout i font loading nie mogą powodować renderów AppShell przy każdej zmianie caret/selection.

- Artistic i Paragraph Text mają różne contracts, ale wspólne style i serialization.

- Convert Text to Outlines jest jawne, preview-first i ostrzega o utracie edytowalności.

- Brakujący font ma explicit warning/recovery; nie udawaj identycznego renderu.

- Font import jest capability-based i nie obchodzi browser security model.

- Tekst, selection i caret są screen/world mapped przez camera transform.

## Kontrakty

```ts
export interface TextStyle { fontFamily:string; fontWeight:number|string; fontStyle:string; fontSize:number; lineHeight:number; letterSpacing:number; baselineShift:number; }
export interface TextObject extends BaseObject { type:"text"; content:string; mode:"artistic"|"paragraph"; frame?:Rect; textStyle:TextStyle; }
```

## Backlog

### TEXT-001

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-001.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-001.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-001.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-001.

### TEXT-002

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-002.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-002.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-002.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-002.

### TEXT-003

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-003.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-003.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-003.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-003.

### TEXT-004

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-004.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-004.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-004.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-004.

### TEXT-005

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-005.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-005.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-005.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-005.

### TEXT-006

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-006.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-006.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-006.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-006.

### TEXT-007

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-007.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-007.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-007.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-007.

### TEXT-008

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-008.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-008.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-008.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-008.

### TEXT-009

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-009.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-009.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-009.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-009.

### TEXT-010

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-010.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-010.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-010.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-010.

### TEXT-011

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-011.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-011.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-011.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-011.

### TEXT-012

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-012.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-012.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-012.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-012.

### TEXT-013

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-013.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-013.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-013.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-013.

### TEXT-014

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-014.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-014.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-014.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-014.

### TEXT-015

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-015.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-015.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-015.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-015.

### TEXT-016

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-016.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-016.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-016.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-016.

### TEXT-017

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-017.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-017.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-017.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-017.

### TEXT-018

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-018.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-018.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-018.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-018.

### TEXT-019

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-019.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-019.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-019.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-019.

### TEXT-020

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-020.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-020.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-020.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-020.

### TEXT-021

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-021.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-021.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-021.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-021.

### TEXT-022

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-022.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-022.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-022.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-022.

### TEXT-023

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-023.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-023.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-023.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-023.

### TEXT-024

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-024.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-024.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-024.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-024.

### TEXT-025

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-025.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-025.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-025.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-025.

### TEXT-026

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-026.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-026.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-026.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-026.

### TEXT-027

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-027.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-027.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-027.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-027.

### TEXT-028

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-028.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-028.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-028.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-028.

### TEXT-029

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-029.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-029.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-029.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-029.

### TEXT-030

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-030.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-030.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-030.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-030.

### TEXT-031

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-031.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-031.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-031.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-031.

### TEXT-032

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-032.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-032.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-032.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-032.

### TEXT-033

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-033.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-033.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-033.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-033.

### TEXT-034

- [ ] Zdefiniuj wymaganie domenowe, walidację, command i serializację dla TEXT-034.
- [ ] Dodaj canvas/DOM editing workflow oraz preview dla TEXT-034.
- [ ] Dodaj Properties UI, keyboard navigation, ARIA i error feedback dla TEXT-034.
- [ ] Dodaj Undo/Redo, SVG export/import policy oraz testy dla TEXT-034.

## Obszary implementacji

- Artistic Text: click to create insertion point; Paragraph Text: drag text frame i auto-wrap.
- Direct editing: caret, selection range, IME composition, Escape/Enter semantics oraz focus restoration.
- Typography: family, weight, style, size, line height, kerning, tracking, baseline shift i alignment.
- Layout: wrapping, columns, paragraphs, lists, indents i paragraph spacing jako text model, nie przypadkowy DOM CSS.
- Text on Path: baseline mapping, start offset, reverse path direction i preview.
- Find/Replace: scope dokumentu, result list, keyboard action i command batch policy.
- Font inventory: used fonts, missing-font warning, web/local import permission flow, variable axes.
- Special chars/emoji: searchable picker, insertion at caret, Unicode-safe selection.
- Variable text templates: placeholders są jawne, previewable i nie uruchamiają kodu.

## UI i accessibility

- Type Tool ma autorską ikonę `type`, hit target 40×40, tooltip i accessible name.

- Properties ma sekcje Text, Character i Paragraph z tabular NumberInput values.

- Text editing ma widoczny caret/selection bez komunikowania każdej pozycji screen readerowi.

- Missing font używa warning icon + text + recovery action; kolor nie jest jedynym sygnałem.

- Dialog outline confirmation ma focus trap i named danger action.

- Dark/Light, focus-visible, keyboard i reduced-motion są obowiązkowe.

## Test matrix

- [ ] TM-001: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-002: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-003: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-004: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-005: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-006: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-007: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-008: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-009: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-010: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-011: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-012: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-013: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-014: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-015: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-016: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-017: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-018: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-019: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-020: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-021: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-022: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-023: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-024: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-025: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-026: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-027: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-028: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-029: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-030: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-031: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-032: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-033: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-034: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-035: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-036: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-037: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-038: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-039: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-040: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-041: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-042: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-043: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-044: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-045: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-046: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-047: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-048: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-049: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-050: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-051: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-052: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-053: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-054: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-055: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-056: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-057: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-058: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-059: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-060: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-061: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-062: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-063: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-064: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-065: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-066: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-067: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-068: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-069: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-070: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-071: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-072: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-073: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-074: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-075: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-076: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-077: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-078: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-079: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-080: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-081: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-082: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-083: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-084: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-085: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-086: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-087: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-088: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-089: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-090: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-091: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-092: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-093: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-094: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-095: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-096: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-097: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-098: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-099: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-100: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-101: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-102: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-103: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-104: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-105: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-106: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-107: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-108: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-109: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-110: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-111: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-112: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-113: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-114: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-115: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-116: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-117: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-118: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-119: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.
- [ ] TM-120: Zweryfikuj text editing/layout/font/Undo/SVG przy zoomie, keyboard, IME i Dark/Light.

## Definition of Done

- [ ] TEXT-001…034 jest dostarczone albo etapowane z zachowaniem contracts.
- [ ] Text remains editable, command-based, serializable and renderer-independent.
- [ ] Missing fonts, outlines i imports mają explicit feedback.
- [ ] Unit/E2E/SVG/visual regression tests przechodzą w CI.

## Źródła

- `BACKLOG.md`: TEXT-001…034.
- `VECTORIA_ARCHITECTURE.md`: domain/commands/renderer/IO boundaries.
- `DESIGN_SYSTEM.md`: Type tool, Properties, dialogs, tokens i accessibility.
