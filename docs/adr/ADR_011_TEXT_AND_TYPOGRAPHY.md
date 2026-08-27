# ADR-011: Model Tekstu, Typografii i Edycji Inline

## Status
Zatwierdzony

## Kontekst
W ramach realizacji EPIC-10 (Tekst i typografia) Vectoria potrzebuje kompletnego, bezstratnego i deterministycznego modelu reprezentacji tekstu wektorowego, składu akapitowego, edycji bezpośrednio na kanwie (inline editing) oraz konwersji do wektorowych konturów (outlines).

Musimy rozstrzygnąć kluczowe kwestie architektoniczne:
1. **Artistic Text vs Paragraph Text**: Czy tekst jest pojedynczym uniwersalnym typem z flagami, czy dwoma osobnymi typami obiektów domenowych?
2. **Indeksowanie i selekcja znaków**: W jakich jednostkach liczone są pozycje kursora i zaznaczenia (bajty, UTF-16 code units czy Unicode code points)?
3. **Pętla renderowania i kursor tekstowy**: Jak realizować miganie kursora tekstowego (caret) bez obciążania pętli rAF i unieważniania pamięci podręcznej sceny?
4. **Rich Text vs Flat Style**: Jak reprezentować zróżnicowane style (np. pogrubienie fragmentu, baseline shift, wariant fontu, placeholdery) wewnątrz jednego akapitu?
5. **Konwersja na kontury (Convert to Outlines)**: W jaki sposób zamieniać obiekty tekstowe na wektory `PathObject` z zachowaniem pełnej historii Undo/Redo.

## Decyzje

### 1. Dwa odrębne typy obiektów domenowych
W unii `SceneObject` definiujemy:
- `TextObject` (`type: 'text'`): Artistic Text — tekst punktowy / swobodny o jednym punkcie zakotwiczenia (anchor), którego wymiary wynikają bezpośrednio z metryk fontu. Wspiera opcjonalny `pathId` (Text on Path).
- `TextFrameObject` (`type: 'text-frame'`): Paragraph Text — tekst w zdefiniowanej ramce o wymiarach `width` i `height`, z automatycznym łamaniem linii (word-wrap), podziałem na kolumny (`columnCount`, `columnGutter`), wcięciami (`indent`), odstępami międzyakapitowymi (`paragraphSpacing`) oraz listami (`listType: 'bullet' | 'numbered'`).

### 2. Indeksowanie w Unicode Code Points
Pozycje kursora (caret), zakresy selekcji oraz podziały fragmentów (`TextRun`) są liczone wyłącznie w **Unicode code points** (z wykorzystaniem `Array.from(string)` lub `Intl.Segmenter`). Gwarantuje to brak rozspójnienia pozycji kursora przy znakach wielobajtowych, akcentach złożonych oraz emoji.

### 3. Izolacja nakładki edycji inline (Interaction Overlay)
Podczas aktywnej edycji tekstowej obiekt renderuje treść w trybie live, a kursor tekstowy (caret) oraz podświetlenie selekcji są rysowane w warstwie nakładki (overlay) lub kontrolowane przez lekki lokalny timer, bez wywoływania mutacji w `DocumentStore` na każde mignięcie kursora. Mutacja dokumentu następuje dopiero przy zatwierdzeniu edycji (blur / Escape / zmiana narzędzia) jako pojedyncza atomowa komenda `SetTextContentCommand`.

### 4. Rich Text Runs
Do reprezentacji lokalnych różnic stylów (baseline shift, lokalna zmiana wielkości/kroju, placeholdery szablonów) obiekty przechowują opcjonalną tablicę `runs: readonly TextRun[]`.

### 5. Deterministyczne Outlines
Komenda `ConvertTextToOutlinesCommand` zastępuje obiekt tekstowy w dokumencie nowym obiektem `PathObject` z wektorowymi konturami liter (`nodes` + `compoundChildren`) i zachowuje pełne `undo()` odtwarzające oryginalny obiekt `text`/`text-frame`.

### 6. Źródło konturów fontu
Core nie generuje przybliżonych figur znaków. `convertTextToOutlines` wymaga
`FontOutlineProvider`, który dostarcza rzeczywiste komendy M/L/C/Q/Z oraz
`unitsPerEm`. Parsowanie binarnych fontów pozostaje w warstwie IO przez
`opentype.js`; brak danych dla używanego fontu kończy się kontrolowanym błędem.

## Konsekwencje
- Renderer Canvas 2D i silnik eksportu SVG implementują dedykowane mapowanie dla obu typów.
- Obliczanie granic `getObjectBounds` dla tekstu wykorzystuje pomiary metryk tekstu (`measureText`).
- Każda modyfikacja właściwości typograficznych przechodzi przez komendy `UpdateTextPropertiesCommand` z pełnym wsparciem Undo/Redo.
- Aplikacja dostarcza bundled Inter jako lokalne źródło outline data; inne fonty wymagają osobnego importu danych fontu.
