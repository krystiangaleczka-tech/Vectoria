# [EPIC-07] Edycja geometrii — bardzo szczegółowa specyfikacja wykonawcza

## Cel

Użytkownik edytuje geometrię bez utraty parametrów, świadomie wykonuje destrukcyjne konwersje oraz otrzymuje odwracalny, przeglądalny wynik operacji cleanup. Każda modyfikacja zachowuje invariants dokumentu i działa przez command dispatcher.

## Architektura

- Parametric shapes pozostają parametric, dopóki użytkownik jawnie nie wybierze Convert to Curves/Expand.

- Preview corner/offset/outline/cleanup jest transient i renderowany na overlay/preview, nie jako mutacja dokumentu.

- Każdy Apply tworzy pojedynczą command; Cancel/Escape pozostawia dokładnie oryginalny document.

- Geometry jest world-space; hit tolerances, handles i preview interaction są screen-space.

- `core` nie zależy od React/Canvas; Editor Engine uruchamia operation sessions; renderer jedynie rysuje.

- Kosztowne offset/outline/duplicate detection pracują na ograniczonym candidate set i mogą przejść do workerów po benchmarkach.

- Walidacja blokuje NaN/Infinity, scale 0, broken layer references, invalid paths i duplicate IDs.

## Kontrakty

```ts
export interface GeometryPreview { operation: string; originals: string[]; proposed: SceneObject[]; warnings: string[]; }
export interface CleanupFinding { id:string; kind:"empty-group"|"orphan-point"|"duplicate"|"unused-style"; targetIds:string[]; severity:"info"|"warning"; }
export interface CleanupPlan { findings: CleanupFinding[]; selectedFindingIds:string[]; }
```

## Backlog wykonawczy

### EDIT-001 — Parametryczna edycja shape bez destrukcyjnej konwersji

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Parametryczna edycja shape bez destrukcyjnej konwersji.
- [ ] Dodaj operation session z preview/apply/cancel dla: Parametryczna edycja shape bez destrukcyjnej konwersji.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Parametryczna edycja shape bez destrukcyjnej konwersji.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Parametryczna edycja shape bez destrukcyjnej konwersji.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Parametryczna edycja shape bez destrukcyjnej konwersji.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Parametryczna edycja shape bez destrukcyjnej konwersji.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Parametryczna edycja shape bez destrukcyjnej konwersji.

### EDIT-002 — Convert to Curves / Expand

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Convert to Curves / Expand.
- [ ] Dodaj operation session z preview/apply/cancel dla: Convert to Curves / Expand.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Convert to Curves / Expand.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Convert to Curves / Expand.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Convert to Curves / Expand.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Convert to Curves / Expand.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Convert to Curves / Expand.

### EDIT-003 — Corner Tool

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Corner Tool.
- [ ] Dodaj operation session z preview/apply/cancel dla: Corner Tool.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Corner Tool.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Corner Tool.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Corner Tool.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Corner Tool.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Corner Tool.

### EDIT-004 — Rounded corners

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Rounded corners.
- [ ] Dodaj operation session z preview/apply/cancel dla: Rounded corners.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Rounded corners.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Rounded corners.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Rounded corners.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Rounded corners.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Rounded corners.

### EDIT-005 — Chamfer corners

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Chamfer corners.
- [ ] Dodaj operation session z preview/apply/cancel dla: Chamfer corners.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Chamfer corners.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Chamfer corners.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Chamfer corners.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Chamfer corners.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Chamfer corners.

### EDIT-006 — Inverted corners

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Inverted corners.
- [ ] Dodaj operation session z preview/apply/cancel dla: Inverted corners.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Inverted corners.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Inverted corners.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Inverted corners.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Inverted corners.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Inverted corners.

### EDIT-007 — Offset Path do środka

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Offset Path do środka.
- [ ] Dodaj operation session z preview/apply/cancel dla: Offset Path do środka.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Offset Path do środka.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Offset Path do środka.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Offset Path do środka.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Offset Path do środka.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Offset Path do środka.

### EDIT-008 — Offset Path na zewnątrz

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Offset Path na zewnątrz.
- [ ] Dodaj operation session z preview/apply/cancel dla: Offset Path na zewnątrz.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Offset Path na zewnątrz.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Offset Path na zewnątrz.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Offset Path na zewnątrz.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Offset Path na zewnątrz.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Offset Path na zewnątrz.

### EDIT-009 — Outline Stroke

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Outline Stroke.
- [ ] Dodaj operation session z preview/apply/cancel dla: Outline Stroke.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Outline Stroke.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Outline Stroke.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Outline Stroke.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Outline Stroke.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Outline Stroke.

### EDIT-010 — Join Paths

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Join Paths.
- [ ] Dodaj operation session z preview/apply/cancel dla: Join Paths.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Join Paths.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Join Paths.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Join Paths.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Join Paths.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Join Paths.

### EDIT-011 — Close Path

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Close Path.
- [ ] Dodaj operation session z preview/apply/cancel dla: Close Path.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Close Path.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Close Path.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Close Path.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Close Path.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Close Path.

### EDIT-012 — Reverse Path Direction

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Reverse Path Direction.
- [ ] Dodaj operation session z preview/apply/cancel dla: Reverse Path Direction.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Reverse Path Direction.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Reverse Path Direction.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Reverse Path Direction.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Reverse Path Direction.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Reverse Path Direction.

### EDIT-013 — Clean Up document

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Clean Up document.
- [ ] Dodaj operation session z preview/apply/cancel dla: Clean Up document.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Clean Up document.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Clean Up document.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Clean Up document.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Clean Up document.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Clean Up document.

### EDIT-014 — Puste grupy

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Puste grupy.
- [ ] Dodaj operation session z preview/apply/cancel dla: Puste grupy.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Puste grupy.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Puste grupy.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Puste grupy.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Puste grupy.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Puste grupy.

### EDIT-015 — Samotne punkty

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Samotne punkty.
- [ ] Dodaj operation session z preview/apply/cancel dla: Samotne punkty.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Samotne punkty.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Samotne punkty.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Samotne punkty.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Samotne punkty.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Samotne punkty.

### EDIT-016 — Zduplikowane elementy

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Zduplikowane elementy.
- [ ] Dodaj operation session z preview/apply/cancel dla: Zduplikowane elementy.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Zduplikowane elementy.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Zduplikowane elementy.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Zduplikowane elementy.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Zduplikowane elementy.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Zduplikowane elementy.

### EDIT-017 — Nieużywane style

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Nieużywane style.
- [ ] Dodaj operation session z preview/apply/cancel dla: Nieużywane style.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Nieużywane style.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Nieużywane style.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Nieużywane style.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Nieużywane style.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Nieużywane style.

### EDIT-018 — Panel wyników Clean Up

- [ ] Zdefiniuj domain contract, validation i odwracalną command dla: Panel wyników Clean Up.
- [ ] Dodaj operation session z preview/apply/cancel dla: Panel wyników Clean Up.
- [ ] Zachowaj style, transform, visibility, lock, z-order i ownership podczas: Panel wyników Clean Up.
- [ ] Zintegruj selection, hit-test, screen/world transform oraz feedback dla: Panel wyników Clean Up.
- [ ] Wyświetl jawne warningi dla nieodwracalnych lub potencjalnie lossy wyników: Panel wyników Clean Up.
- [ ] Dodaj history label, Undo/Redo i autosave po commicie: Panel wyników Clean Up.
- [ ] Dodaj Vitest geometry/edge cases oraz Playwright workflow: Panel wyników Clean Up.

## Szczegółowe reguły geometrii

### Parametric edit i Expand

- `EDIT-001` aktualizuje semantic fields shape (radii, sides, angles, width points) bez zamiany na path.
- `EDIT-002` wymaga explicit confirm, pokazuje preview i wynik type conversion; source semantic parameters nie są pozornie edytowalne po konwersji.
- Convert to Curves zachowuje visual geometry w tolerancji testów, style oraz transform.

### Corner i Offset

- Corner Tool wybiera corner nodes i pokazuje parametric handle; radius jest clamped do sąsiednich segmentów.
- Rounded, chamfer i inverted są różnymi corner modes; nie generują self-intersection bez warning/guard.
- Offset inside/outside zachowuje direction policy i pokazuje preview; zbyt duży offset, self-intersection lub pusty wynik daje czytelny error/recovery.
- Outline Stroke materializuje geometrię zgodną z width, cap, join, miterLimit i dash policy.

### Path operations

- Join Paths łączy tylko kompatybilne endpoints, wybiera deterministyczną direction i zachowuje style według jawnej policy.
- Close Path łączy pierwszą i ostatnią node, nie dubluje node i waliduje minimum trzy nodes dla closed shape.
- Reverse Path Direction odwraca nodes i handles, zachowując identyczny render oraz poprawną orientację marker/gradient policy.

### Clean Up

- Scan nie mutuje dokumentu; tworzy CleanupPlan z findings, target IDs, reason i proposed fix.
- Empty group: group bez dzieci; orphan point: path niespełniający minimum nodes; duplicate: geometry/style/transform match w zadanej tolerancji.
- Unused style wykrywa referencje semantycznie, nie usuwa style używanego przez hidden/locked object.
- Panel umożliwia select finding, preview, apply selected oraz cancel; Apply tworzy jedną albo jasno zgrupowaną command.

## UI i design system

- Corner/Offset/Expand actions są dostępne przez menu Object/Edit i context-aware Properties, nie przez ukrytą osobną stronę.

- Tool Rail Corner Tool ma autorską ikonę, 20 px render, 40×40 hit target, tooltip i aria-label.

- Preview geometry odróżnia się od original bez komunikowania różnicy wyłącznie kolorem; używa outline, pattern/label i tokenów.

- Properties NumberInput ma mono/tabular values, suffix unit, Enter commit, Escape revert, arrow nudge i text+icon+border errors.

- Cleanup Panel jest w Right Dock lub modalnym review flow; list rows są keyboard accessible, selected state subtle, warnings mają text+icon.

- Critical destructive confirm ma ≤480 px, focus trap, jasne consequence i named danger action.

- Dark/Light, focus-visible, reduced-motion, token-only colors i brak CSS transition dla canvas drag są obowiązkowe.

## Test matrix

- [ ] TM-001: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-002: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-003: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-004: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-005: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-006: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-007: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-008: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-009: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-010: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-011: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-012: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-013: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-014: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-015: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-016: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-017: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-018: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-019: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-020: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-021: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-022: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-023: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-024: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-025: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-026: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-027: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-028: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-029: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-030: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-031: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-032: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-033: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-034: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-035: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-036: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-037: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-038: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-039: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-040: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-041: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-042: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-043: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-044: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-045: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-046: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-047: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-048: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-049: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-050: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-051: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-052: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-053: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-054: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-055: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-056: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-057: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-058: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-059: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-060: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-061: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-062: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-063: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-064: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-065: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-066: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-067: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-068: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-069: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-070: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-071: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-072: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-073: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-074: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-075: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-076: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-077: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-078: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-079: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-080: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-081: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-082: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-083: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-084: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-085: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-086: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-087: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-088: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-089: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-090: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-091: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-092: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-093: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-094: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-095: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-096: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-097: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-098: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-099: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-100: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-101: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-102: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-103: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-104: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-105: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-106: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-107: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-108: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-109: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-110: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-111: Zweryfikuj expand fidelity dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-112: Zweryfikuj corner clamp dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-113: Zweryfikuj offset self-intersection dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-114: Zweryfikuj outline stroke dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-115: Zweryfikuj join endpoints dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-116: Zweryfikuj close path dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-117: Zweryfikuj reverse handles dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-118: Zweryfikuj cleanup finding dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-119: Zweryfikuj cleanup apply/cancel dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.
- [ ] TM-120: Zweryfikuj parametric edit dla zoomu, Undo/Redo, preview, validation oraz Dark/Light UI.

## Pliki

```text
packages/core/src/{geometry/bezier.ts,geometry/bounds.ts,geometry/offset.ts,commands/update-object.ts,commands/delete-object.ts}
packages/editor-engine/src/{tools/corner-tool.ts,operations/geometry-operation-session.ts,cleanup/cleanup-service.ts}
packages/renderer/src/{scene-renderer.ts,overlay-renderer.ts}
apps/web/src/features/{properties/GeometryProperties.tsx,cleanup/CleanupPanel.tsx}
```

## Definition of Done

- [ ] EDIT-001…018 jest dostarczone lub jasno etapowane z zachowaniem contracts.
- [ ] Preview/cancel nie mutują dokumentu; Apply jest command-based i undoable.
- [ ] Cleanup jest audit-first: scan, review, selected apply, recovery/Undo.
- [ ] UI spełnia tokeny, keyboard, focus, ARIA i explicit feedback.
- [ ] Geometry/unit/E2E/visual regression tests przechodzą w CI.

## Źródła

- `BACKLOG.md`: EDIT-001…018.
- `VECTORIA_ARCHITECTURE.md`: document domain, geometry, commands, renderer i workers later.
- `DESIGN_SYSTEM.md`: Properties, panels, dialogs, tokens i accessibility.
