# Backlog — Vectoria

Poniżej jest kompletny backlog dla **Vectoria** — rozbity na epiki i implementowalne taski. Vectoria jest pełnym rozwijanym projektem, nie aplikacją ograniczoną do MVP. Priorytety **P0/P1/P2** opisują kolejność i ryzyko, nie redukują zakresu epiców. „MVP” oznacza kamień milowy fundamentu; zadania epiców realizujemy względem pełnej specyfikacji, chyba że ograniczenie zostanie jawnie zapisane. Wydajność, stałe FPS i odporność na ogromne wymiary dokumentu są wymaganiem P0 dla całego silnika.

## EPIC-00: Architektura i wydajność

### Model dokumentu — P0

- [ ] **CORE-001** Zaprojektować serializowalny model `Document`
- [ ] **CORE-002** Dodać model `Artboard` z rozmiarem, jednostkami, tłem, orientacją i nazwą
- [ ] **CORE-003** Dodać model obiektów: shape, path, text, image, group, compound path, mask
- [ ] **CORE-004** Dodać model warstw, grup i zagnieżdżonych struktur
- [ ] **CORE-005** Dodać model stylów: fill, stroke, opacity, blend mode, efekty
- [ ] **CORE-006** Dodać model assetów: symbole, komponenty, obrazy, fonty i brand kit
- [ ] **CORE-007** Dodać wersjonowanie schematu natywnego pliku `.vct`
- [ ] **CORE-008** Dodać migracje starszych wersji dokumentu `.vct`
- [ ] **CORE-009** Przechowywać wszystkie współrzędne w logicznej przestrzeni świata, niezależnie od zoomu
- [ ] **CORE-010** Rozdzielić dokument, stan edytora oraz tymczasowy stan interakcji

### Kamera i viewport — P0

- [ ] **PERF-001** Zaimplementować kamerę: `panX`, `panY`, `zoom`, `rotation`
- [ ] **PERF-002** Zaimplementować transformację world-to-screen
- [ ] **PERF-003** Zaimplementować transformację screen-to-world
- [ ] **PERF-004** Renderować canvas wyłącznie w wymiarze aktualnego viewportu, nigdy w pełnym wymiarze dokumentu
- [ ] **PERF-005** Wyliczać widoczny prostokąt dokumentu na podstawie kamery
- [ ] **PERF-006** Wykonać viewport culling — nie renderować obiektów poza widocznym obszarem
- [ ] **PERF-007** Nie wykonywać hit-testingu dla elementów poza viewportem
- [ ] **PERF-008** Dodać `fit artboard`, `fit selection`, `fit drawing` i `100% zoom`
- [ ] **PERF-009** Obsłużyć płynny zoom kółkiem, touchpadem i pinch-to-zoom
- [ ] **PERF-010** Obsłużyć pan przez `Space + drag`, middle mouse oraz touch gesture

### Stałe FPS — P0

- [ ] **PERF-011** Zbudować pętlę renderowania opartą o `requestAnimationFrame`
- [ ] **PERF-012** Ustalić budżet 16,67 ms na klatkę dla 60 FPS
- [ ] **PERF-013** Mierzyć p95 frame time, nie tylko średnie FPS
- [ ] **PERF-014** Priorytetyzować input użytkownika nad operacje w tle
- [ ] **PERF-015** Nie wykonywać pełnego renderu React/UI przy każdym `pointermove`
- [ ] **PERF-016** Aktualizować stan drag/węzłów lokalnie na czas przeciągania
- [ ] **PERF-017** Commitować operację do historii dokumentu po `pointerup`
- [ ] **PERF-018** Dodać throttling dla kosztownych podglądów
- [ ] **PERF-019** Dodać debounce dla autosave, miniatur i finalnego renderu
- [ ] **PERF-020** Ograniczyć liczbę rekalkulacji podczas przeciągania wielu obiektów

### Render warstwowy — P0

- [ ] **PERF-021** Utworzyć warstwę tła i artboardów
- [ ] **PERF-022** Utworzyć warstwę siatki, linijek i prowadnic
- [ ] **PERF-023** Utworzyć warstwę sceny z obiektami dokumentu
- [ ] **PERF-024** Utworzyć warstwę overlay: selection, node handles, lasso, podgląd Pen Tool
- [ ] **PERF-025** Rozdzielić UI DOM od renderera dokumentu
- [ ] **PERF-026** Cache’ować nieruchome, złożone grupy
- [ ] **PERF-027** Cache’ować maski, filtry i kosztowne efekty
- [ ] **PERF-028** Inwalidować cache wyłącznie dla obiektu, grupy lub stylu, który się zmienił
- [ ] **PERF-029** Dodać renderowanie uproszczone dla małych obiektów przy oddalonym zoomie
- [ ] **PERF-030** Pominąć detale mniejsze niż 1–2 px ekranu

### Jakość adaptacyjna — P0

- [ ] **PERF-031** Dodać tryb `interactive` dla drag, pan i zoom
- [ ] **PERF-032** W trybie interactive ukrywać blur, shadow, maski i ciężkie filtry
- [ ] **PERF-033** W trybie interactive obniżać wewnętrzny DPR renderera
- [ ] **PERF-034** Dodać tryb `settling` uruchamiany około 100–150 ms po zatrzymaniu ruchu
- [ ] **PERF-035** Dodać tryb `final` dla nieruchomego widoku
- [ ] **PERF-036** W trybie final przywracać pełną jakość gradientów, filtrów i antyaliasingu
- [ ] **PERF-037** Dodać przełącznik ręcznego trybu Performance dla słabszych urządzeń

### Indeks przestrzenny i hit-testing — P0

- [ ] **PERF-038** Zaimplementować indeks przestrzenny R-tree dla bounding boxów
- [ ] **PERF-040** Wykonywać dokładny hit-test tylko dla kandydatów zwróconych przez indeks
- [ ] **PERF-039** Indeksować obiekty, grupy oraz ich hierarchiczne bounding boxy
- [ ] **PERF-041** Dodać hit-test fill
- [ ] **PERF-042** Dodać hit-test stroke
- [ ] **PERF-043** Dodać hit-test segmentów Béziera
- [ ] **PERF-044** Dodać osobny indeks węzłów dla aktualnie edytowanej ścieżki
- [ ] **PERF-045** Aktualizować indeks zbiorczo po zakończeniu drag lub na końcu klatki
- [ ] **PERF-046** Dodać tolerancję hit-testu zależną od zoomu ekranu

### Workers i zadania tła — P0/P1

- [ ] **PERF-047** Utworzyć infrastrukturę Web Workerów
- [ ] **PERF-048** Przenieść parsowanie SVG do workera
- [ ] **PERF-049** Przenieść import PDF do workera
- [ ] **PERF-050** Przenieść eksport dużych PNG/PDF do workera
- [ ] **PERF-051** Przenieść trace image do workera
- [ ] **PERF-052** Przenieść simplify/smooth path do workera
- [ ] **PERF-053** Przenieść Boolean operations do workera
- [ ] **PERF-054** Przenieść serializację i autosave do workera
- [ ] **PERF-055** Dodać anulowanie długiej operacji
- [ ] **PERF-056** Dodać progres dla importu, eksportu i przeliczeń
- [ ] **PERF-057** Rozważyć `OffscreenCanvas` dla renderowania poza głównym wątkiem

### Skalowanie dokumentu — P0

- [ ] **PERF-058** Zmiana szerokości/wysokości artboardu ma natychmiast aktualizować tylko metadane i obrys
- [ ] **PERF-059** Nie alokować bitmapy odpowiadającej fizycznemu rozmiarowi dokumentu
- [ ] **PERF-060** Przeliczać siatkę i tło tylko dla widocznego fragmentu
- [ ] **PERF-061** Przeliczać clip bounds, miniatury i podglądy asynchronicznie
- [ ] **PERF-062** Zaimplementować automatyczne, stopniowe rozszerzanie roboczego zakresu artboardu co 10% aż do wartości docelowej
- [ ] **PERF-063** Wyświetlać nieblokujący status optymalizacji/podglądu po resize
- [ ] **PERF-064** Umożliwić edycję dokumentu podczas przeliczania resize
- [ ] **PERF-065** Obsłużyć bezpiecznie ekstremalnie duże wartości współrzędnych i rozmiarów

Wymóg stopniowego rozszerzania artboardu o 10% wynika bezpośrednio z potrzeby uniknięcia zamrożenia aplikacji przy skokowej zmianie bardzo dużych wymiarów dokumentu. 

### Diagnostyka i testy — P0

- [ ] **PERF-066** Dodać developerski Performance HUD
- [ ] **PERF-067** Pokazywać FPS, średni frame time i p95 frame time
- [ ] **PERF-068** Pokazywać liczbę wszystkich i widocznych obiektów
- [ ] **PERF-069** Pokazywać liczbę węzłów oraz segmentów Béziera
- [ ] **PERF-070** Pokazywać czas input-to-render
- [ ] **PERF-071** Pokazywać liczbę kandydatów hit-testu
- [ ] **PERF-072** Pokazywać cache hit ratio i użycie pamięci
- [ ] **PERF-073** Stworzyć benchmark: 10 000 prostych obiektów
- [ ] **PERF-074** Stworzyć benchmark: 1 000 ścieżek po 100 węzłów
- [ ] **PERF-075** Stworzyć benchmark: 100 warstw i głębokie grupy
- [ ] **PERF-076** Stworzyć benchmark: ogromny artboard logiczny
- [ ] **PERF-077** Stworzyć benchmark: drag 500 obiektów
- [ ] **PERF-078** Stworzyć benchmark: ciężki import SVG
- [ ] **PERF-079** Dodać testy regresji geometrii Béziera
- [ ] **PERF-080** Dodać testy regresji SVG import/export
- [ ] **PERF-081** Zablokować merge w CI przy przekroczeniu ustalonego limitu p95 frame time

## EPIC-01: Dokument i obszar roboczy

- [ ] **DOC-001** Utworzyć dialog „New document”
- [ ] **DOC-002** Dodać preset ekranowy
- [ ] **DOC-003** Dodać presety social media
- [ ] **DOC-004** Dodać presety A4 i A3
- [ ] **DOC-005** Dodać preset wizytówki
- [ ] **DOC-006** Dodać własny rozmiar dokumentu
- [ ] **DOC-007** Obsłużyć jednostki px, mm, cm i in
- [ ] **DOC-008** Dodać zmianę jednostek dla dokumentu
- [ ] **DOC-009** Dodać artboard do dokumentu
- [ ] **DOC-010** Duplikować artboard
- [ ] **DOC-011** Usuwać artboard
- [ ] **DOC-012** Zmieniać nazwę artboardu
- [ ] **DOC-013** Zmieniać orientację artboardu
- [ ] **DOC-014** Ustawiać tło artboardu
- [ ] **DOC-015** Obsłużyć wiele artboardów w jednym pliku
- [ ] **DOC-016** Dodać panel zarządzania artboardami
- [ ] **DOC-017** Dodać linijki
- [ ] **DOC-018** Dodać siatkę
- [ ] **DOC-019** Dodać prowadnice poziome i pionowe
- [ ] **DOC-020** Dodać inteligentne prowadnice
- [ ] **DOC-021** Dodać przyciąganie do siatki
- [ ] **DOC-022** Dodać przyciąganie do prowadnic
- [ ] **DOC-023** Dodać przyciąganie do węzłów
- [ ] **DOC-024** Dodać przyciąganie do krawędzi
- [ ] **DOC-025** Dodać przyciąganie do środków
- [ ] **DOC-026** Dodać przyciąganie do przecięć
- [ ] **DOC-027** Dodać przyciąganie do pikseli
- [ ] **DOC-028** Dodać konfigurację snap i tolerancji snap
- [ ] **DOC-029** Dodać wskaźnik elementu, do którego nastąpiło przyciągnięcie

## EPIC-02: Historia i zapisywanie

- [x] **HIST-001** Zaimplementować command pattern dla operacji dokumentu
- [x] **HIST-002** Dodać Undo
- [x] **HIST-003** Dodać Redo
- [x] **HIST-004** Grupować serię zmian drag jako pojedynczy wpis historii
- [x] **HIST-005** Dodać panel historii
- [x] **HIST-006** Umożliwić powrót do wybranego kroku historii
- [x] **HIST-007** Dodać autosave lokalny w IndexedDB
- [ ] **HIST-008** Dodać odzyskiwanie dokumentu po crashu lub zamknięciu karty
- [x] **HIST-009** Dodać status autosave
- [ ] **HIST-010** Dodać ręczne zapisywanie wersji dokumentu
- [ ] **HIST-011** Dodać listę wersji dokumentu
- [ ] **HIST-012** Dodać przywracanie starszej wersji
- [ ] **HIST-013** Dodać opcjonalną synchronizację z chmurą

## EPIC-03: Zaznaczanie i transformacje

> Implementacja Issue #6 dostarcza Skeleton MVP: selection state wieloelementowy, Select/Direct Select, top-most hit-test z cullingiem i tolerancją screen-space, Shift+click, marquee touching policy, move/resize/rotate, Delete, nudge, Transform Properties oraz visibility/lock feedback. Lasso, grupy, pivot/skew/flip UI, align/distribute, z-order UI, repeat transform i smart distance pozostają jawnie w zakresie 0.1.

- [ ] **SEL-001** Zaimplementować Select/Pick Tool
- [ ] **SEL-002** Zaznaczać pojedynczy obiekt
- [ ] **SEL-003** Zaznaczać wiele obiektów z `Shift`
- [ ] **SEL-004** Zaznaczać grupę
- [ ] **SEL-005** Wybierać obiekty leżące pod kursorem
- [ ] **SEL-006** Dodać cycling przez nakładające się obiekty
- [ ] **SEL-007** Zaznaczać przez prostokąt marquee
- [ ] **SEL-008** Zaimplementować Lasso dla obiektów
- [ ] **SEL-009** Zaimplementować Lasso dla węzłów
- [ ] **SEL-010** Zaimplementować Direct Select/Node Tool
- [ ] **SEL-011** Zaznaczać pojedyncze węzły
- [ ] **SEL-012** Zaznaczać wiele węzłów
- [ ] **SEL-013** Zaznaczać segment ścieżki
- [ ] **SEL-014** Przesuwać obiekt
- [ ] **SEL-015** Skalować obiekt
- [ ] **SEL-016** Obracać obiekt
- [ ] **SEL-017** Pochylać obiekt
- [ ] **SEL-018** Odbijać obiekt poziomo i pionowo
- [ ] **SEL-019** Obsłużyć pivot/transform origin
- [ ] **SEL-020** Dodać blokadę proporcji
- [ ] **SEL-021** Dodać precyzyjne przesuwanie strzałkami
- [ ] **SEL-022** Dodać panel Transform: X, Y, W, H, rotation, pivot
- [ ] **SEL-023** Dodać Align do artboardu
- [ ] **SEL-024** Dodać Align do zaznaczenia
- [ ] **SEL-025** Dodać Align do kluczowego obiektu
- [ ] **SEL-026** Dodać Distribute z równymi odstępami
- [ ] **SEL-027** Dodać bring to front
- [ ] **SEL-028** Dodać send to back
- [ ] **SEL-029** Dodać move one step forward/backward
- [ ] **SEL-030** Dodać ukrywanie obiektów
- [ ] **SEL-031** Dodać blokowanie obiektów
- [ ] **SEL-032** Dodać grupowanie
- [ ] **SEL-033** Dodać rozgrupowanie
- [ ] **SEL-034** Dodać wejście do grupy przez double-click
- [ ] **SEL-035** Dodać duplikowanie skrótem
- [ ] **SEL-036** Dodać duplikowanie z przesunięciem
- [ ] **SEL-037** Dodać repeat transform
- [ ] **SEL-038** Dodać smart distance podczas przesuwania

## EPIC-04: Kształty podstawowe

- [x] **SHAPE-001** Zaimplementować Rectangle Tool
- [x] **SHAPE-002** Zaimplementować Square z constraintem proporcji
- [x] **SHAPE-003** Obsłużyć niezależny radius każdego narożnika
- [x] **SHAPE-004** Zaimplementować Rounded Rectangle
- [x] **SHAPE-005** Zaimplementować Ellipse Tool
- [x] **SHAPE-006** Zaimplementować Circle z constraintem proporcji
- [ ] **SHAPE-007** Zaimplementować Arc
- [ ] **SHAPE-008** Zaimplementować Pie
- [ ] **SHAPE-009** Zaimplementować Ring/Donut
- [x] **SHAPE-010** Zaimplementować Line Tool
- [ ] **SHAPE-011** Zaimplementować Polyline Tool
- [ ] **SHAPE-012** Dodać strzałki i konfigurację grotów
- [ ] **SHAPE-013** Zaimplementować Polygon Tool
- [ ] **SHAPE-014** Zaimplementować Star Tool
- [ ] **SHAPE-015** Zaimplementować Spiral Tool
- [ ] **SHAPE-016** Zaimplementować Triangle
- [ ] **SHAPE-017** Zaimplementować Diamond
- [ ] **SHAPE-018** Zaimplementować Callout/Speech Bubble
- [ ] **SHAPE-019** Dodać parametryczne uchwyty na canvasie
- [ ] **SHAPE-020** Dodać zmianę liczby ramion gwiazdy
- [ ] **SHAPE-021** Dodać zmianę kąta łuku
- [ ] **SHAPE-022** Dodać własne presety kształtów
- [ ] **SHAPE-023** Dodać bibliotekę presetów UI, etykiet i ikon mapy

## EPIC-05: Pen Tool i ścieżki

- [x] **PATH-001** Zaimplementować Pen Tool jako osobną state machine
- [x] **PATH-002** Tworzyć punkt narożny przez kliknięcie
- [x] **PATH-003** Tworzyć punkt Béziera przez kliknięcie i przeciągnięcie
- [x] **PATH-004** Rysować segment prosty
- [x] **PATH-005** Rysować segment cubic Bézier
- [x] **PATH-006** Tworzyć ścieżkę otwartą
- [x] **PATH-007** Zamykać ścieżkę kliknięciem punktu początkowego
- [x] **PATH-008** Pokazywać rubber band przed dodaniem kolejnego segmentu
- [x] **PATH-009** Dodawać węzeł na istniejącym segmencie
- [x] **PATH-010** Usuwać węzeł
- [x] **PATH-011** Przesuwać węzeł
- [x] **PATH-012** Scalać węzły
- [x] **PATH-013** Rozcinać ścieżkę
- [x] **PATH-014** Łączyć końcówki otwartych ścieżek
- [x] **PATH-015** Zamieniać segment prosty na krzywą
- [x] **PATH-016** Zamieniać segment krzywy na prosty
- [x] **PATH-017** Obsłużyć typ węzła cusp
- [x] **PATH-018** Obsłużyć typ węzła smooth
- [x] **PATH-019** Obsłużyć typ węzła symmetrical
- [x] **PATH-020** Obsłużyć typ węzła auto-smooth
- [x] **PATH-021** Edytować uchwyt wejściowy
- [x] **PATH-022** Edytować uchwyt wyjściowy
- [x] **PATH-023** Rozłączać uchwyty węzła
- [x] **PATH-024** Łączyć uchwyty węzła
- [x] **PATH-025** Dodawać i usuwać punkty z Pen Tool bez przełączania narzędzia
- [x] **PATH-026** Odwracać kierunek ścieżki
- [x] **PATH-027** Zamieniać shape na curves
- [x] **PATH-028** Zamieniać stroke na path
- [x] **PATH-029** Dodać precyzyjny podgląd uchwytów i tangent lines
- [x] **PATH-030** Dodać skróty modyfikatorów dla Pen Tool
- [x] **PATH-031** Dodać testy geometrii, continuity i edge cases Pen Tool

## EPIC-06: Rysowanie swobodne i cięcie

- [x] **DRAW-001** Zaimplementować Pencil Tool
- [x] **DRAW-002** Dodać poziom wygładzania Pencil Tool
- [x] **DRAW-003** Zaimplementować Brush Tool
- [x] **DRAW-004** Dodać szerokość brush stroke
- [x] **DRAW-005** Dodać pressure input dla stylusa
- [x] **DRAW-006** Dodać style końcówki pędzla
- [x] **DRAW-007** Zaimplementować Smooth Tool
- [x] **DRAW-008** Umożliwić smooth na żywo przy rysowaniu
- [x] **DRAW-009** Umożliwić smooth dla istniejącej ścieżki
- [x] **DRAW-010** Zaimplementować Simplify Path
- [x] **DRAW-011** Dodać suwak dokładność ↔ liczba węzłów
- [x] **DRAW-012** Dodać podgląd przed zatwierdzeniem simplify/smooth
- [x] **DRAW-013** Zaimplementować Eraser Tool
- [x] **DRAW-014** Zaimplementować Knife Tool
- [x] **DRAW-015** Zaimplementować Scissors Tool
- [x] **DRAW-016** Zaimplementować Width Tool
- [x] **DRAW-017** Zmieniać lokalną szerokość stroke na ścieżce

## EPIC-07: Edycja geometrii

- [x] **EDIT-001** Edytować parametry shape bez destrukcyjnej konwersji
- [x] **EDIT-002** Dodać Convert to Curves/Expand
- [x] **EDIT-003** Zaimplementować Corner Tool
- [x] **EDIT-004** Dodać rounded corners
- [x] **EDIT-005** Dodać chamfer corners
- [x] **EDIT-006** Dodać inverted corners
- [x] **EDIT-007** Zaimplementować Offset Path do środka
- [x] **EDIT-008** Zaimplementować Offset Path na zewnątrz
- [x] **EDIT-009** Zaimplementować Outline Stroke
- [x] **EDIT-010** Zaimplementować Join Paths
- [x] **EDIT-011** Zaimplementować Close Path
- [x] **EDIT-012** Zaimplementować Reverse Path Direction
- [x] **EDIT-013** Zaimplementować Clean Up document
- [x] **EDIT-014** Wykrywać puste grupy
- [x] **EDIT-015** Wykrywać samotne punkty
- [x] **EDIT-016** Wykrywać zduplikowane elementy
- [x] **EDIT-017** Wykrywać nieużywane style
- [x] **EDIT-018** Dodać panel wyników Clean Up z możliwością zatwierdzenia zmian

## EPIC-08: Boolean, maski i compositing

- [x] **BOOL-001** Zaimplementować Unite/Weld
- [x] **BOOL-002** Zaimplementować Subtract/Trim
- [x] **BOOL-003** Zaimplementować Intersect
- [x] **BOOL-004** Zaimplementować Exclude
- [x] **BOOL-005** Zaimplementować Divide
- [x] **BOOL-006** Zaimplementować Crop
- [x] **BOOL-007** Zaimplementować Compound Path
- [x] **BOOL-008** Obsłużyć dziury w compound path
- [x] **BOOL-009** Zaimplementować Clipping Mask
- [x] **BOOL-010** Edytować zawartość clipping mask
- [x] **BOOL-011** Zaimplementować Opacity Mask
- [x] **BOOL-012** Zaimplementować Isolate Mode dla grup
- [x] **BOOL-013** Zaimplementować Isolate Mode dla masek
- [x] **BOOL-014** Zaimplementować Expand Appearance
- [x] **BOOL-015** Dodać preview Boolean przed zatwierdzeniem dla ciężkich obiektów
- [x] **BOOL-016** Dodać testy poprawności Boolean dla krzywych i compound paths

## EPIC-09: Fill, stroke, kolor i style

- [x] **STYLE-001** Dodać jednolity fill
- [x] **STYLE-002** Dodać brak fill
- [x] **STYLE-003** Zaimplementować Color Picker
- [x] **STYLE-004** Obsłużyć RGB
- [x] **STYLE-005** Obsłużyć HEX
- [x] **STYLE-006** Obsłużyć HSL
- [x] **STYLE-007** Obsłużyć CMYK
- [x] **STYLE-008** Dodać ostrzeżenie out-of-gamut dla przygotowania druku
- [x] **STYLE-009** Dodać kolor stroke
- [x] **STYLE-010** Dodać grubość stroke
- [x] **STYLE-011** Dodać pozycję stroke
- [x] **STYLE-012** Dodać line caps
- [x] **STYLE-013** Dodać line joins
- [x] **STYLE-014** Dodać miter limit
- [x] **STYLE-015** Dodać dashed stroke
- [x] **STYLE-016** Dodać własny wzór dash/gap
- [x] **STYLE-017** Zaimplementować gradient liniowy
- [x] **STYLE-018** Zaimplementować gradient radialny
- [x] **STYLE-019** Zaimplementować gradient kątowy
- [x] **STYLE-020** Dodać wiele stopów gradientu
- [x] **STYLE-021** Dodać opacity stopów gradientu
- [x] **STYLE-022** Edytować gradient uchwytami na canvasie
- [x] **STYLE-023** Dodać paletę dokumentu
- [x] **STYLE-024** Dodać globalną paletę użytkownika
- [x] **STYLE-025** Dodać zapisane palety
- [x] **STYLE-026** Dodać import palet
- [x] **STYLE-027** Dodać swatches kolorów
- [x] **STYLE-028** Dodać swatches gradientów
- [x] **STYLE-029** Dodać swatches patternów
- [x] **STYLE-030** Dodać global colors
- [x] **STYLE-031** Aktualizować wszystkie użycia global color po zmianie
- [x] **STYLE-032** Dodać object styles
- [ ] **STYLE-033** Zapisywać fill, stroke, opacity i efekty w stylu
- [x] **STYLE-034** Zaimplementować Eyedropper
- [x] **STYLE-035** Pobierać wyłącznie kolor lub cały styl
- [x] **STYLE-036** Zaimplementować Paint Bucket/Style Paste
- [x] **STYLE-037** Dodać opacity obiektu
- [x] **STYLE-038** Dodać Normal blend mode
- [x] **STYLE-039** Dodać Multiply blend mode
- [x] **STYLE-040** Dodać Screen blend mode
- [x] **STYLE-041** Dodać Overlay blend mode

## EPIC-10: Tekst i typografia

- [ ] **TEXT-001** Zaimplementować Artistic Text
- [ ] **TEXT-002** Zaimplementować Paragraph Text w ramce
- [ ] **TEXT-003** Dodać automatyczne zawijanie tekstu
- [ ] **TEXT-004** Dodać edycję tekstu bezpośrednio na canvasie
- [ ] **TEXT-005** Dodać selection fragmentu tekstu
- [ ] **TEXT-006** Dodać text cursor
- [ ] **TEXT-007** Dodać wybór font family
- [ ] **TEXT-008** Dodać font weight
- [ ] **TEXT-009** Dodać font style
- [ ] **TEXT-010** Dodać font size
- [ ] **TEXT-011** Dodać line height
- [ ] **TEXT-012** Dodać kerning
- [ ] **TEXT-013** Dodać tracking
- [ ] **TEXT-014** Dodać baseline shift
- [ ] **TEXT-015** Dodać wyrównanie do lewej
- [ ] **TEXT-016** Dodać wyrównanie do środka
- [ ] **TEXT-017** Dodać wyrównanie do prawej
- [ ] **TEXT-018** Dodać justowanie
- [ ] **TEXT-019** Dodać listy
- [ ] **TEXT-020** Dodać kolumny tekstu
- [ ] **TEXT-021** Dodać odstępy akapitów
- [ ] **TEXT-022** Dodać wcięcia
- [ ] **TEXT-023** Zaimplementować Text on Path
- [ ] **TEXT-024** Zaimplementować Convert Text to Outlines
- [ ] **TEXT-025** Dodać wyszukiwanie tekstu
- [ ] **TEXT-026** Dodać zamianę tekstu
- [ ] **TEXT-027** Dodać listę użytych fontów
- [ ] **TEXT-028** Dodać alert o brakującym foncie
- [ ] **TEXT-029** Dodać import fontów webowych
- [ ] **TEXT-030** Dodać import fontów lokalnych, gdy przeglądarka na to pozwala
- [ ] **TEXT-031** Dodać panel znaków specjalnych
- [ ] **TEXT-032** Dodać emoji picker
- [ ] **TEXT-033** Obsłużyć variable fonts
- [ ] **TEXT-034** Dodać tekst zmienny dla szablonów

## EPIC-11: Warstwy, obiekty i assety

- [ ] **LAYER-001** Dodać panel Layers
- [ ] **LAYER-002** Tworzyć warstwy
- [ ] **LAYER-003** Usuwać warstwy
- [ ] **LAYER-004** Zmieniać nazwę warstwy
- [ ] **LAYER-005** Dodać kolor etykiety warstwy
- [ ] **LAYER-006** Obsłużyć grupy i podgrupy bez sztucznego limitu głębokości
- [ ] **LAYER-007** Dodać drag-and-drop porządku warstw
- [ ] **LAYER-008** Dodać widoczność warstwy
- [ ] **LAYER-009** Dodać blokadę warstwy
- [ ] **LAYER-010** Dodać blokadę wybranych atrybutów obiektu
- [ ] **LAYER-011** Zaznaczać wszystkie elementy warstwy
- [ ] **LAYER-012** Przenosić obiekty między warstwami
- [ ] **LAYER-013** Dodać Template Layer
- [ ] **LAYER-014** Dodać Outline View
- [ ] **LAYER-015** Dodać Solo Mode
- [ ] **LAYER-016** Dodać wyszukiwarkę w warstwach
- [ ] **LAYER-017** Dodać filtrowanie warstw
- [ ] **LAYER-018** Zbudować panel Assets
- [ ] **LAYER-019** Przechowywać symbole w Assets
- [ ] **LAYER-020** Przechowywać komponenty w Assets
- [ ] **LAYER-021** Przechowywać style i brand assets w Assets

## EPIC-12: Obrazy i zasoby zewnętrzne

- [ ] **ASSET-001** Dodać drag-and-drop PNG
- [ ] **ASSET-002** Dodać drag-and-drop JPG
- [ ] **ASSET-003** Dodać drag-and-drop WebP
- [ ] **ASSET-004** Dodać drag-and-drop SVG
- [ ] **ASSET-005** Dodać drag-and-drop PDF
- [ ] **ASSET-006** Dodać osadzanie obrazu w pliku
- [ ] **ASSET-007** Dodać linkowanie obrazu do zasobu zewnętrznego
- [ ] **ASSET-008** Dodać panel linków
- [ ] **ASSET-009** Wykrywać brakujące zasoby zewnętrzne
- [ ] **ASSET-010** Zaimplementować kadrowanie obrazu w ramce
- [ ] **ASSET-011** Dodać opacity obrazu
- [ ] **ASSET-012** Dodać brightness obrazu
- [ ] **ASSET-013** Dodać contrast obrazu
- [ ] **ASSET-014** Dodać saturation obrazu
- [ ] **ASSET-015** Dodać grayscale obrazu
- [ ] **ASSET-016** Zaimplementować trace image czarno-biały
- [ ] **ASSET-017** Zaimplementować trace image dla prostych logo
- [ ] **ASSET-018** Dodać Symbol/Component
- [ ] **ASSET-019** Dodać wiele instancji jednego symbolu
- [ ] **ASSET-020** Aktualizować instancje po zmianie definicji symbolu
- [ ] **ASSET-021** Dodać bibliotekę prostych ikon SVG
- [ ] **ASSET-022** Dodać bibliotekę stockowych elementów SVG
- [ ] **ASSET-023** Dodać Brand Kit: logo
- [ ] **ASSET-024** Dodać Brand Kit: kolory
- [ ] **ASSET-025** Dodać Brand Kit: fonty
- [ ] **ASSET-026** Dodać Brand Kit: komponenty

## EPIC-13: Efekty i appearance

### MVP

- [ ] **FX-001** Dodać drop shadow
- [ ] **FX-002** Dodać blur
- [ ] **FX-003** Dodać opacity w Appearance panel
- [ ] **FX-004** Dodać rounded corners jako efekt
- [ ] **FX-005** Dodać stroke alignment
- [ ] **FX-006** Dodać dashed stroke do Appearance panel
- [ ] **FX-007** Dodać podstawowe filtry SVG
- [ ] **FX-008** Zbudować Appearance Panel
- [ ] **FX-009** Pokazywać fill, stroke, opacity i efekty obiektu
- [ ] **FX-010** Umożliwić zmianę kolejności appearance layers

### Później

- [ ] **FX-011** Dodać inner shadow
- [ ] **FX-012** Dodać glow
- [ ] **FX-013** Dodać rozszerzone blend modes
- [ ] **FX-014** Dodać pattern fill
- [ ] **FX-015** Dodać texture fill
- [ ] **FX-016** Dodać brushes kaligraficzne
- [ ] **FX-017** Dodać brushes artystyczne
- [ ] **FX-018** Dodać pattern brushes
- [ ] **FX-019** Dodać distort
- [ ] **FX-020** Dodać envelope distortion
- [ ] **FX-021** Dodać mesh
- [ ] **FX-022** Dodać perspective
- [ ] **FX-023** Dodać podstawowe 3D
- [ ] **FX-024** Dodać radial repeat
- [ ] **FX-025** Dodać mirror repeat
- [ ] **FX-026** Dodać grid repeat
- [ ] **FX-027** Dodać live effects
- [ ] **FX-028** Umożliwić wyłączenie live effect
- [ ] **FX-029** Umożliwić expand live effect

## EPIC-14: Precyzja i produktywność

- [ ] **PROD-001** Zbudować kontekstowy panel Properties
- [ ] **PROD-002** Dodać Inspector dokumentu
- [ ] **PROD-003** Dodać Inspector obiektu
- [ ] **PROD-004** Dodać Inspector tekstu
- [ ] **PROD-005** Dodać Inspector fill
- [ ] **PROD-006** Dodać Inspector stroke
- [ ] **PROD-007** Obsłużyć wyrażenia matematyczne w polach liczbowych
- [ ] **PROD-008** Obsłużyć wartość procentową w polach liczbowych
- [ ] **PROD-009** Dodać szybkie przełączanie jednostek
- [ ] **PROD-010** Dodać copy
- [ ] **PROD-011** Dodać paste z zachowaniem stylu
- [ ] **PROD-012** Dodać paste z zachowaniem pozycji
- [ ] **PROD-013** Dodać paste in place
- [ ] **PROD-014** Dodać paste on all artboards
- [ ] **PROD-015** Dodać duplicate and transform
- [ ] **PROD-016** Dodać Select Same: fill
- [ ] **PROD-017** Dodać Select Same: stroke
- [ ] **PROD-018** Dodać Select Same: font
- [ ] **PROD-019** Dodać Select Same: rozmiar
- [ ] **PROD-020** Dodać Select Same: opacity
- [ ] **PROD-021** Dodać Select Same: typ obiektu
- [ ] **PROD-022** Dodać Find and Replace Object
- [ ] **PROD-023** Dodać Find and Replace Style
- [ ] **PROD-024** Zaimplementować Command Palette
- [ ] **PROD-025** Dodać domyślne skróty: V, A, P, T, R, L, Space
- [ ] **PROD-026** Dodać konfigurację skrótów klawiszowych
- [ ] **PROD-027** Dodać własne presety interfejsu

## EPIC-15: Import, format i zapis

- [ ] **IO-001** Zdefiniować natywny format `.vct`
- [ ] **IO-002** Zapisywać SVG i metadane w `.vct`
- [ ] **IO-003** Zapisywać artboardy w `.vct`
- [ ] **IO-004** Zapisywać warstwy i style w `.vct`
- [ ] **IO-005** Zapisywać osadzone/linkowane assety w `.vct`
- [ ] **IO-006** Dodać zapis dokumentu jako SVG
- [ ] **IO-007** Dodać SVG import jako priorytetowy format
- [ ] **IO-008** Zachowywać edytowalność SVG tam, gdzie to możliwe
- [ ] **IO-009** Dodać PNG import
- [ ] **IO-010** Dodać JPG import
- [ ] **IO-011** Dodać WebP import
- [ ] **IO-012** Dodać PDF import z zachowaniem wektorów tam, gdzie możliwe
- [ ] **IO-013** Dodać EPS import jako P2
- [ ] **IO-014** Dodać AI import jako best-effort
- [ ] **IO-015** Dodać CDR import jako best-effort
- [ ] **IO-016** Jasno oznaczać ograniczenia AI/CDR importu
- [ ] **IO-017** Dodać wklejanie SVG ze schowka
- [ ] **IO-018** Dodać bezpieczne parsowanie nieufnego SVG
- [ ] **IO-019** Dodać walidację i sanityzację importowanego SVG

## EPIC-16: Eksport

- [ ] **EXPORT-001** Dodać SVG editable export
- [ ] **EXPORT-002** Dodać SVG optimized export
- [ ] **EXPORT-003** Dodać PNG export 1x
- [ ] **EXPORT-004** Dodać PNG export 2x
- [ ] **EXPORT-005** Dodać PNG export 3x
- [ ] **EXPORT-006** Dodać PNG export z własną rozdzielczością
- [ ] **EXPORT-007** Dodać JPG export
- [ ] **EXPORT-008** Dodać WebP export
- [ ] **EXPORT-009** Dodać ustawienie jakości JPG/WebP
- [ ] **EXPORT-010** Dodać ustawienie tła eksportu
- [ ] **EXPORT-011** Dodać transparent background
- [ ] **EXPORT-012** Dodać PDF export pojedynczego artboardu
- [ ] **EXPORT-013** Dodać PDF export wszystkich artboardów
- [ ] **EXPORT-014** Dodać spady i crop marks dla PDF jako P1
- [ ] **EXPORT-015** Dodać eksport zaznaczenia
- [ ] **EXPORT-016** Dodać eksport obszaru
- [ ] **EXPORT-017** Dodać eksport artboardu
- [ ] **EXPORT-018** Zaimplementować Export for Screens
- [ ] **EXPORT-019** Obsłużyć seryjny eksport wielu ikon i formatów
- [ ] **EXPORT-020** Dodać batch naming na podstawie nazwy artboardu
- [ ] **EXPORT-021** Dodać batch naming na podstawie nazwy warstwy
- [ ] **EXPORT-022** Pokazywać podgląd docelowego rozmiaru pliku
- [ ] **EXPORT-023** Dodać kolejkę eksportów
- [ ] **EXPORT-024** Dodać progres i anulowanie eksportu

## EPIC-17: Współpraca i SaaS

- [ ] **SAAS-001** Dodać konto użytkownika
- [ ] **SAAS-002** Dodać workspace/projekty
- [ ] **SAAS-003** Dodać foldery
- [ ] **SAAS-004** Dodać tagi
- [ ] **SAAS-005** Dodać wyszukiwarkę dokumentów
- [ ] **SAAS-006** Dodać link do projektu
- [ ] **SAAS-007** Dodać rolę viewer
- [ ] **SAAS-008** Dodać rolę commenter
- [ ] **SAAS-009** Dodać rolę editor
- [ ] **SAAS-010** Dodać rolę owner
- [ ] **SAAS-011** Dodać publiczny read-only preview
- [ ] **SAAS-012** Dodać komentarze przypięte do pozycji na canvasie
- [ ] **SAAS-013** Dodać oznaczenia `@user`
- [ ] **SAAS-014** Dodać status resolved dla komentarza
- [ ] **SAAS-015** Dodać historię wersji projektu
- [ ] **SAAS-016** Dodać przywracanie wersji projektu
- [ ] **SAAS-017** Dodać wskaźnik synchronizacji
- [ ] **SAAS-018** Dodać eksport komentarzy
- [ ] **SAAS-019** Dodać handoff dokumentu
- [ ] **SAAS-020** Dodać szablony zespołowe
- [ ] **SAAS-021** Dodać współdzielony brand kit
- [ ] **SAAS-022** Zaprojektować model konfliktów zmian
- [ ] **SAAS-023** Zaimplementować współedycję realtime dopiero po ustabilizowaniu single-user editora


## EPIC-18: UX i dostępność

- [ ] **UX-001** Zapewnić pełną obsługę klawiatury
- [ ] **UX-002** Zaprojektować focus management
- [ ] **UX-003** Dodać widoczne focus ringi
- [ ] **UX-004** Dodać tooltipy z nazwą narzędzia
- [ ] **UX-005** Pokazywać skrót klawiszowy w tooltipie
- [ ] **UX-006** Dodać poprawne etykiety ARIA
- [ ] **UX-007** Dodać jasny motyw
- [ ] **UX-008** Dodać ciemny motyw
- [ ] **UX-009** Dodać skalowanie UI
- [ ] **UX-010** Dodać tryb wysokiego kontrastu
- [ ] **UX-011** Obsłużyć touch input
- [ ] **UX-012** Obsłużyć stylus i Apple Pencil
- [ ] **UX-013** Powiększyć hitboxy dla touch/pen
- [ ] **UX-014** Obsłużyć pinch-to-zoom
- [ ] **UX-015** Dodać kontekstowy toolbar
- [ ] **UX-016** Zbudować onboarding nowego użytkownika
- [ ] **UX-017** Dodać tutorial pierwszego dokumentu
- [ ] **UX-018** Dodać tutorial skrótów
- [ ] **UX-019** Dodać tutorial Pen Tool
- [ ] **UX-020** Dodać tutorial Node Tool
- [ ] **UX-021** Dodać potwierdzenie usunięcia projektu
- [ ] **UX-022** Dodać potwierdzenie operacji destrukcyjnych
- [ ] **UX-023** Ostrzegać przed konwersją tekstu na krzywe

## EPIC-19: AI-POSTPONE

- [ ] **AI-001** Zaprojektować warstwę providerów AI niezależną od jednego API
- [ ] **AI-002** Dodać generowanie prostych ikon SVG z promptu
- [ ] **AI-003** Dodać walidację i sanityzację SVG generowanego przez AI
- [ ] **AI-004** Dodać „zamień szkic w czysty wektor”
- [ ] **AI-005** Dodać automatyczne usuwanie zbędnych węzłów
- [ ] **AI-006** Dodać automatyczne wygładzanie ścieżki
- [ ] **AI-007** Dodać tekstowe polecenia edytora
- [ ] **AI-008** Dodać komendę wyrównywania i rozstawiania obiektów
- [ ] **AI-009** Dodać generowanie palety z obrazu
- [ ] **AI-010** Dodać generowanie palety z brandu
- [ ] **AI-011** Dodać automatyczne nazwy warstw
- [ ] **AI-012** Dodać automatyczne porządkowanie struktury SVG
- [ ] **AI-013** Dodać eksperymentalne OCR/import tekstu z obrazu
- [ ] **AI-014** Zapewnić, że podstawowy edytor działa w pełni bez AI
- [ ] **AI-015** Dodać preview i potwierdzenie zmian proponowanych przez AI
- [ ] **AI-016** Dodać Undo dla każdej operacji AI

## Zakres wersji 0.1

Wersja 0.1 ma umożliwiać realne otworzenie SVG, poprawienie go, narysowanie prostego logo/ikony i eksport bez utraty płynności. W tym etapie najważniejsze są: dokument, kamera, Select, Node, Pen, kształty, warstwy, fill/stroke, Undo/Redo, snap, align oraz SVG/PNG I/O. 

- [ ] Zrealizować `CORE-001–010`
- [ ] Zrealizować `PERF-001–081`
- [ ] Zrealizować `DOC-001–029`
- [ ] Zrealizować `HIST-001–009`
- [ ] Zrealizować `SEL-001–037`
- [ ] Zrealizować `SHAPE-001–021`
- [ ] Zrealizować `PATH-001–031`
- [ ] Zrealizować `STYLE-001–022`
- [ ] Zrealizować `LAYER-001–017`
- [ ] Zrealizować `PROD-001–026`
- [ ] Zrealizować `IO-001–012` oraz `IO-017–019`
- [ ] Zrealizować `EXPORT-001–011` oraz `EXPORT-015–017`
- [ ] Zrealizować `UX-001–015`

## Zakres wersji 0.2

- [ ] Zrealizować `DRAW-001–017`
- [ ] Zrealizować `EDIT-001–018`
- [ ] Zrealizować `BOOL-001–016`
- [ ] Zrealizować `TEXT-001–032`
- [ ] Zrealizować `STYLE-023–041`
- [ ] Zrealizować `ASSET-001–015`
- [ ] Zrealizować `FX-001–010`
- [ ] Zrealizować pełny Export for Screens i PDF export
- [ ] Zrealizować wiele artboardów oraz rozwinięte zarządzanie assetami

## Zakres wersji 0.3+

- [ ] Zrealizować trace image, symbole, komponenty i Brand Kit
- [ ] Zrealizować współdzielenie, komentarze, wersjonowanie chmurowe i publiczny preview
- [ ] Zrealizować funkcje AI wspierające istniejący workflow
- [ ] Zrealizować realtime collaboration
- [ ] Zrealizować EPS/AI/CDR best-effort import
- [ ] Zrealizować rozbudowane efekty, brush system, mesh, perspective i podstawowe 3D

Najważniejsza kolejność implementacji pozostaje niezmienna: **silnik wydajności → kamera/render → zaznaczanie → Pen/Node → model dokumentu i historia → SVG I/O → kolor/warstwy → Boolean → tekst**. Dzięki temu Vectoria nie stanie się tylko listą narzędzi, ale pozostanie płynnym edytorem nawet przy dużych dokumentach i częstych zmianach ich wymiarów.
