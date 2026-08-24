# [EPIC-06] Rysowanie swobodne i cięcie — specyfikacja wykonawcza

## Cel

Użytkownik rysuje swobodne ścieżki, wygładza i upraszcza istniejącą geometrię oraz dokonuje destrukcyjnych cięć w sposób przewidywalny, odwracalny i płynny. Wszystkie operacje zachowują `DocumentModel` invariants, korzystają z command dispatcher oraz nie blokują inputu.

## Granice

- Freehand sampling jest transient; commit tworzy jedną command z finalną ścieżką.
- Smooth, simplify, eraser, knife, scissors i width używają preview przed trwałą modyfikacją.
- Kosztowne operacje pracują na ograniczonym candidate set; worker jest późniejszym rozszerzeniem po benchmarkach.
- Geometry działa w world space; brush size, eraser radius i hit tolerances są ergonomiczne w screen px.

## Niezmienniki

- React nie wykonuje geometrii ani render loop; tools są state machines w `editor-engine`.

- Canvas pozostaje viewportem; nie twórz bitmapy w rozmiarze artworku.

- Każda trwała operacja patha ma odwracalną command i zrozumiały label historii.

- `pointermove` aktualizuje draft/overlay; tylko pointerup lub jawny Apply commitują zmianę.

- Path nie zawiera NaN/Infinity, duplicate IDs ani nieprawidłowej liczby nodes.

- Hit-test, snap i selection korzystają ze wspólnych serwisów, nie lokalnych implementacji toola.

- Overlay pokazuje preview, cut line, eraser cursor i width points bez redraw całej sceny.

## Kontrakty

```ts
export interface FreehandSample { point: Vec2; pressure?: number; time: number; }
export interface FreehandDraft { samples: FreehandSample[]; smoothing: number; width: number; }
export interface PathPreview { originalId: string; proposed: PathObject; operation: string; }
export interface WidthPoint { t: number; width: number; }
```

## Szczegółowy backlog

### DRAW-001 — Pencil Tool

- [ ] Zdefiniuj domain API, input model i command dla funkcji Pencil Tool.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Pencil Tool.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Pencil Tool.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Pencil Tool.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Pencil Tool.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Pencil Tool.

### DRAW-002 — Wygładzanie Pencil

- [ ] Zdefiniuj domain API, input model i command dla funkcji Wygładzanie Pencil.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Wygładzanie Pencil.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Wygładzanie Pencil.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Wygładzanie Pencil.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Wygładzanie Pencil.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Wygładzanie Pencil.

### DRAW-003 — Brush Tool

- [ ] Zdefiniuj domain API, input model i command dla funkcji Brush Tool.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Brush Tool.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Brush Tool.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Brush Tool.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Brush Tool.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Brush Tool.

### DRAW-004 — Szerokość brush stroke

- [ ] Zdefiniuj domain API, input model i command dla funkcji Szerokość brush stroke.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Szerokość brush stroke.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Szerokość brush stroke.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Szerokość brush stroke.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Szerokość brush stroke.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Szerokość brush stroke.

### DRAW-005 — Pressure stylusa

- [ ] Zdefiniuj domain API, input model i command dla funkcji Pressure stylusa.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Pressure stylusa.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Pressure stylusa.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Pressure stylusa.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Pressure stylusa.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Pressure stylusa.

### DRAW-006 — Końcówka pędzla

- [ ] Zdefiniuj domain API, input model i command dla funkcji Końcówka pędzla.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Końcówka pędzla.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Końcówka pędzla.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Końcówka pędzla.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Końcówka pędzla.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Końcówka pędzla.

### DRAW-007 — Smooth Tool

- [ ] Zdefiniuj domain API, input model i command dla funkcji Smooth Tool.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Smooth Tool.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Smooth Tool.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Smooth Tool.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Smooth Tool.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Smooth Tool.

### DRAW-008 — Smooth live

- [ ] Zdefiniuj domain API, input model i command dla funkcji Smooth live.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Smooth live.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Smooth live.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Smooth live.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Smooth live.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Smooth live.

### DRAW-009 — Smooth existing path

- [ ] Zdefiniuj domain API, input model i command dla funkcji Smooth existing path.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Smooth existing path.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Smooth existing path.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Smooth existing path.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Smooth existing path.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Smooth existing path.

### DRAW-010 — Simplify Path

- [ ] Zdefiniuj domain API, input model i command dla funkcji Simplify Path.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Simplify Path.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Simplify Path.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Simplify Path.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Simplify Path.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Simplify Path.

### DRAW-011 — Accuracy ↔ node count

- [ ] Zdefiniuj domain API, input model i command dla funkcji Accuracy ↔ node count.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Accuracy ↔ node count.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Accuracy ↔ node count.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Accuracy ↔ node count.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Accuracy ↔ node count.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Accuracy ↔ node count.

### DRAW-012 — Preview simplify/smooth

- [ ] Zdefiniuj domain API, input model i command dla funkcji Preview simplify/smooth.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Preview simplify/smooth.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Preview simplify/smooth.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Preview simplify/smooth.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Preview simplify/smooth.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Preview simplify/smooth.

### DRAW-013 — Eraser Tool

- [ ] Zdefiniuj domain API, input model i command dla funkcji Eraser Tool.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Eraser Tool.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Eraser Tool.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Eraser Tool.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Eraser Tool.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Eraser Tool.

### DRAW-014 — Knife Tool

- [ ] Zdefiniuj domain API, input model i command dla funkcji Knife Tool.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Knife Tool.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Knife Tool.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Knife Tool.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Knife Tool.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Knife Tool.

### DRAW-015 — Scissors Tool

- [ ] Zdefiniuj domain API, input model i command dla funkcji Scissors Tool.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Scissors Tool.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Scissors Tool.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Scissors Tool.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Scissors Tool.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Scissors Tool.

### DRAW-016 — Width Tool

- [ ] Zdefiniuj domain API, input model i command dla funkcji Width Tool.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Width Tool.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Width Tool.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Width Tool.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Width Tool.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Width Tool.

### DRAW-017 — Local stroke width

- [ ] Zdefiniuj domain API, input model i command dla funkcji Local stroke width.
- [ ] Zaimplementuj osobną state machine narzędzia lub operation session dla Local stroke width.
- [ ] Przechowuj preview jako transient overlay; nie mutuj dokumentu podczas pointermove.
- [ ] Zintegruj screen/world transform, viewport culling, selection i SnapService dla Local stroke width.
- [ ] Waliduj wynik geometrii oraz zachowaj style, visibility, lock, opacity i layer ownership.
- [ ] Zapewnij Undo/Redo jako pojedynczą logiczną operację dla Local stroke width.
- [ ] Dodaj Properties/control z walidacją, Enter commit, Escape revert i keyboard accessibility dla Local stroke width.
- [ ] Dodaj unit tests geometrii oraz Playwright workflow dla Local stroke width.

## Behawior narzędzi

### Pencil i Brush

- Pencil zbiera próbki pointera, filtruje duplikaty i minimalny dystans w world units zależny od zoomu.
- Smoothing jest parametrem 0–100 z jednoznaczną polityką resamplingu oraz limitem nodes.
- Brush przechowuje centerline + width/pressure model; renderer może renderować stroke bez materializacji outline w MVP.
- Pointer pressure mapuje się przez bezpieczną krzywą pressure→width; mouse używa stałego pressure=1.
- Cap style: butt, round, square; join: miter, round, bevel; UI i SVG używają tego samego modelu StrokeStyle.

### Smooth i Simplify

- Smooth existing path pokazuje proposed path i node delta przed Apply.
- Simplify ma suwak accuracy↔node-count oraz wskazuje przed/po: nodes, estimated error i visual preview.
- Preserve corners / locked nodes / endpoints jest jawną polityką; algorytm nie usuwa endpointu open patha.
- Cancel przywraca dokładnie original path; Apply tworzy jedną UpdateObjectCommand.

### Eraser, Knife, Scissors

- Eraser cursor pokazuje promień w screen px; przecięcie generuje odpowiednie fragmenty pathów.
- Knife używa narysowanej cut polyline i dzieli tylko geometrycznie trafione obiekty/pathy.
- Scissors działa przez precyzyjny segment hit-test; click tworzy split node i dwa open paths.
- Destrukcyjne operacje zachowują style oraz tworzą czytelny label historii; gdy wynik jest pusty, usuń obiekt jedną command.

### Width Tool

- Width Tool tworzy width points parametryzowane przez t∈[0,1].
- Drag width point aktualizuje local width preview; pointerup commituję pojedynczą command.
- Width nie może być ujemna ani nie może unieważnić stroke; Properties zapewnia wejście numeryczne.

## UI i design system

- Tool Rail: Pencil `N`, Brush `B`, Eraser `Shift+E`, Scissors `C`; każda ikona 20 px, target 40×40, tooltip i aria-label.

- Active tool używa `--color-selection-surface-strong`; hover `--color-panel-hover`.

- Preview stroke i cut indicators są czytelne na jasnym/ciemnym artworku i nie używają samego koloru jako statusu.

- Properties ma sekcje Drawing, Smoothing, Stroke, Width oraz Preview; NumberInput używa mono/tabular values.

- Danger/destructive cut wymaga jawnego labela; error ma tekst, ikonę i recovery action.

- Dark/Light, keyboard, visible focus ring i `prefers-reduced-motion` są obowiązkowe.

## Test matrix

- [ ] TM-001: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-002: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-003: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-004: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-005: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-006: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-007: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-008: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-009: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-010: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-011: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-012: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-013: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-014: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-015: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-016: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-017: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-018: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-019: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-020: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-021: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-022: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-023: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-024: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-025: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-026: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-027: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-028: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-029: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-030: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-031: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-032: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-033: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-034: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-035: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-036: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-037: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-038: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-039: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-040: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-041: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-042: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-043: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-044: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-045: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-046: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-047: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-048: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-049: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-050: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-051: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-052: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-053: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-054: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-055: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-056: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-057: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-058: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-059: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-060: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-061: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-062: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-063: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-064: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-065: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-066: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-067: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-068: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-069: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-070: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-071: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-072: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-073: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-074: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-075: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-076: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-077: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-078: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-079: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-080: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-081: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-082: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-083: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-084: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-085: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-086: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-087: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-088: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-089: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-090: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-091: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-092: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-093: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-094: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-095: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-096: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-097: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-098: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-099: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-100: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-101: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-102: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-103: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-104: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-105: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-106: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-107: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-108: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-109: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-110: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-111: Sprawdź pressure przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-112: Sprawdź smoothing przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-113: Sprawdź simplify przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-114: Sprawdź eraser cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-115: Sprawdź knife cut przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-116: Sprawdź scissors split przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-117: Sprawdź width point przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-118: Sprawdź Undo/Redo przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-119: Sprawdź SVG regression przy zoomie, DPR, snapie, keyboard, cancel oraz command history.
- [ ] TM-120: Sprawdź sampling przy zoomie, DPR, snapie, keyboard, cancel oraz command history.

## Pliki

```text
packages/core/src/{objects/path.ts,geometry/bezier.ts,geometry/bounds.ts,commands/update-object.ts}
packages/editor-engine/src/tools/{pencil-tool.ts,brush-tool.ts,smooth-tool.ts,eraser-tool.ts,knife-tool.ts,scissors-tool.ts,width-tool.ts}
packages/renderer/src/{scene-renderer.ts,overlay-renderer.ts}
apps/web/src/features/{toolbar/toolDefinitions.ts,properties/PathProperties.tsx}
```

## Definition of Done

- [ ] DRAW-001…017 są zaimplementowane albo etapowane bez naruszenia contracts.
- [ ] Wszystkie operacje są command-based, undoable i nie zapisują transient preview.
- [ ] Renderer i overlay pozostają płynne podczas freehand input.
- [ ] UI używa tokenów, własnej ikonografii i accessibility rules.
- [ ] Geometry, SVG, regression i E2E tests przechodzą w CI.

## Źródła

- `BACKLOG.md`: DRAW-001…017.
- `VECTORIA_ARCHITECTURE.md`: path domain, tools, commands, renderer, interaction state i workers later.
- `DESIGN_SYSTEM.md`: Tool Rail, NumberInput, canvas language, tokens i accessibility.
