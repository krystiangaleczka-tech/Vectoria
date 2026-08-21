# Mini Backlog — Skeleton MVP (Vertical Slice)

> Dokładnie — robimy teraz Vertical Slice / Skeleton MVP: minimalny kawałek z każdego epika, który już wygląda i działa jak Vectoria, zamiast perfekcyjnie kończyć jeden moduł po drugim. W ten sposób bardzo szybko dostaniesz edytor, w którym można utworzyć dokument, narysować prosty wektor, zaznaczyć go, przesunąć, nadać styl, zapisać SVG i wyeksportować PNG — przy zachowaniu fundamentu pod płynność i duże artboardy.

## Zasada zakresu

Na tym etapie nie robimy pełnych wersji narzędzi. Każda kategoria dostaje tylko jedną działającą ścieżkę użytkownika:
**Nowy dokument → narysuj prostokąt lub ścieżkę → zaznacz → przesuń → zmień kolor → zapisz/otwórz SVG → eksportuj PNG.**

To ma być baza, do której systematycznie dokładamy kolejne narzędzia, bez przepisywania silnika.

---

## Sprint: Skeleton MVP

### 1. Fundament techniczny
- [ ] **MVP-001** Utworzyć projekt aplikacji, layout edytora i routing do jednego ekranu `/editor`
- [ ] **MVP-002** Zdefiniować minimalny model dokumentu: `id`, `name`, `width`, `height`, `unit`, `artboards`, `layers`, `objects`
- [ ] **MVP-003** Zdefiniować minimalny model obiektu: `id`, `type`, `x`, `y`, `width`, `height`, `rotation`, `fill`, `stroke`
- [ ] **MVP-004** Dodać jedną domyślną warstwę i jeden domyślny artboard
- [ ] **MVP-005** Dodać kamerę: `panX`, `panY`, `zoom`
- [ ] **MVP-006** Rozdzielić stan dokumentu od tymczasowego stanu interakcji, np. kursora, zaznaczenia i drag
- [ ] **MVP-007** Zbudować prosty command system pod przyszłe Undo/Redo, nawet jeśli początkowo obsłuży tylko przesunięcie i zmianę fill

### 2. Płótno i wydajność
- [ ] **MVP-008** Utworzyć renderer canvas-first lub hybrydowy SVG/canvas, ale z jedną abstrakcją renderera
- [ ] **MVP-009** Renderować canvas wyłącznie w wymiarze viewportu, nigdy w wymiarze całego artboardu
- [ ] **MVP-010** Dodać pętlę renderu przez `requestAnimationFrame`
- [ ] **MVP-011** Dodać pan: `Space + drag` oraz środkowy przycisk myszy
- [ ] **MVP-012** Dodać zoom kółkiem myszy względem pozycji kursora
- [ ] **MVP-013** Dodać Fit artboard, Fit drawing i zoom 100%
- [ ] **MVP-014** Renderować tylko aktualnie widoczny fragment sceny
- [ ] **MVP-015** Dodać prosty wskaźnik FPS w trybie developerskim
- [ ] **MVP-016** Ustawić zasadę: zmiana rozmiaru artboardu zmienia model i obrys, ale nigdy nie tworzy canvasa w rozmiarze dokumentu

> *To od początku zabezpiecza Vectorię przed sytuacją, w której ogromny artboard zamraża przeglądarkę; robocza przestrzeń może być później rozszerzana stopniowo co 10%, bez blokowania interfejsu.*

### 3. Dokument i artboard
- [ ] **MVP-017** Dodać modal „New document”
- [ ] **MVP-018** Obsłużyć własną szerokość, wysokość i jednostkę px
- [ ] **MVP-019** Dodać presety: Custom, A4 i 1920×1080
- [ ] **MVP-020** Wyświetlać artboard z prostym kolorem tła
- [ ] **MVP-021** Dodać zmianę szerokości i wysokości aktualnego artboardu
- [ ] **MVP-022** Dodać podstawową siatkę z przełącznikiem widoczności
- [ ] **MVP-023** Dodać snap do siatki jako jedyny snap na start

### 4. Interfejs edytora
- [ ] **MVP-024** Zbudować lewy toolbar
- [ ] **MVP-025** Zbudować górny pasek z nazwą dokumentu, zoomem i akcjami Undo/Redo
- [ ] **MVP-026** Zbudować prawy panel Properties
- [ ] **MVP-027** Zbudować minimalny panel Layers
- [ ] **MVP-028** Dodać statusbar: pozycja kursora, zoom, jednostka
- [ ] **MVP-029** Dodać podstawowy jasny i ciemny motyw
- [ ] **MVP-030** Dodać tooltipy z nazwami narzędzi i skrótami

### 5. Zaznaczanie i warstwy
- [ ] **MVP-031** Zaimplementować Select Tool
- [ ] **MVP-032** Zaznaczać pojedynczy obiekt kliknięciem
- [ ] **MVP-033** Pokazywać bounding box i uchwyty zaznaczonego obiektu
- [ ] **MVP-034** Przesuwać zaznaczony obiekt drag-and-drop
- [ ] **MVP-035** Skalować zaznaczony obiekt przez narożne uchwyty
- [ ] **MVP-036** Usuwać zaznaczony obiekt klawiszem Delete
- [ ] **MVP-037** Dodać Ctrl/Cmd + C, Ctrl/Cmd + V i Ctrl/Cmd + D
- [ ] **MVP-038** Wyświetlać obiekty na jednej warstwie w panelu Layers
- [ ] **MVP-039** Dodać widoczność i blokadę warstwy
- [ ] **MVP-040** Dodać zmianę nazwy warstwy

### 6. Pierwsze rysowanie
- [ ] **MVP-041** Zaimplementować Rectangle Tool
- [ ] **MVP-042** Rysować prostokąt przez drag
- [ ] **MVP-043** Obsłużyć Shift dla proporcji 1:1, czyli kwadratu
- [ ] **MVP-044** Zaimplementować Ellipse Tool
- [ ] **MVP-045** Rysować elipsę i koło z Shift
- [ ] **MVP-046** Zaimplementować Line Tool
- [ ] **MVP-047** Dodać jeden parametr radius dla narożników prostokąta
- [ ] **MVP-048** Dodać minimum Pen Tool: klik = linia, drag = segment cubic Béziera
- [ ] **MVP-049** Umożliwić zamykanie ścieżki kliknięciem pierwszego punktu
- [ ] **MVP-050** Umożliwić zakończenie ścieżki przez Enter lub Escape

> *Pen Tool w Skeleton MVP ma służyć jako dowód, że rdzeń Vectorii obsługuje krzywe; rozbudowane typy węzłów, rozłączone uchwyty, scissors i pełna state machine wejdą w kolejnym etapie.*

### 7. Style i właściwości
- [ ] **MVP-051** Dodać fill w formie jednego koloru
- [ ] **MVP-052** Dodać wybór koloru przez HEX i prosty picker
- [ ] **MVP-053** Dodać no fill
- [ ] **MVP-054** Dodać stroke: kolor i szerokość
- [ ] **MVP-055** Dodać opacity obiektu
- [ ] **MVP-056** Pokazywać i edytować X, Y, Width, Height zaznaczonego obiektu
- [ ] **MVP-057** Dodać blokadę proporcji w panelu Properties
- [ ] **MVP-058** Dodać podstawowy gradient liniowy jako pierwszy zaawansowany fill

### 8. Historia, zapis i pliki
- [ ] **MVP-059** Dodać Undo dla utworzenia, przesunięcia, usunięcia i zmiany stylu
- [ ] **MVP-060** Dodać Redo
- [ ] **MVP-061** Zapisywać aktualny dokument lokalnie w IndexedDB
- [ ] **MVP-062** Przywracać ostatni dokument po odświeżeniu strony
- [ ] **MVP-063** Dodać eksport aktualnej sceny do SVG
- [ ] **MVP-064** Dodać import prostego SVG
- [ ] **MVP-065** Dodać eksport PNG aktualnego artboardu
- [ ] **MVP-066** Dodać eksport zaznaczenia do SVG lub PNG

> *SVG oraz PNG powinny wejść na samym początku, ponieważ dzięki nim użytkownik natychmiast może wykorzystać wynik pracy poza aplikacją; PDF, AI i CDR zostawiamy na później.*

---

## Definition of Done

Skeleton MVP jest gotowy dopiero, gdy użytkownik może bez tutoriala:
1. Otworzyć Vectorię i stworzyć dokument.
2. Płynnie przesuwać oraz przybliżać widok.
3. Narysować prostokąt, koło, linię i prostą ścieżkę Béziera.
4. Zaznaczyć obiekt, przesunąć go, przeskalować i usunąć.
5. Ustawić fill, stroke, opacity i podstawowy gradient.
6. Zmienić rozmiar artboardu bez zamrożenia UI.
7. Odświeżyć stronę i odzyskać dokument.
8. Wyeksportować projekt do SVG oraz PNG.

---

## Celowo poza zakresem

Nie buduj teraz:
- R-tree, Web Workery, OffscreenCanvas, cache tekstur i wielopoziomowego renderera.
- Pełnego Node Tool, wszystkich typów węzłów, smooth/simplify, brush, knife i eraser.
- Boolean operations, clipping masks, compound paths oraz effects.
- Tekstu, fontów, obrazów, trace image i asset library.
- Wielu artboardów, zaawansowanych warstw oraz collaboration.
- PDF/EPS/AI/CDR importu, AI features, SaaS i kont użytkowników.

> *To są następne paczki funkcji, nie fundament pierwszej działającej aplikacji. Jednak od razu zostawiamy w modelu dokumentu miejsce na warstwy, typy obiektów, style i artboardy, aby późniejsze rozszerzenia nie wymagały kasowania prototypu.*

---

## Kolejność wykonania

| Faza | Taski | Efekt |
| :--- | :--- | :--- |
| **A: Silnik** | `MVP-001–016` | Płynne puste płótno z kamerą i bezpiecznym resize |
| **B: Dokument + UI** | `MVP-017–030` | Edytor zaczyna wyglądać jak aplikacja |
| **C: Obiekty** | `MVP-031–050` | Można rysować, wybierać i przesuwać wektory |
| **D: Style** | `MVP-051–058` | Można faktycznie tworzyć prostą grafikę |
| **E: Pliki** | `MVP-059–066` | Można zachować, otworzyć i wyeksportować pracę |

Najpierw dowieź fazę A i B, potem C; nie przeskakuj do tekstu, Booleanów ani AI przed SVG import/export, bo dopiero wtedy będziesz mieć kompletny, mały cykl pracy użytkownika.
