# EPIC-10: Tekst i typografia — atomowe taski

> Format: jeden subtask = jedno zlecenie dla wykonawcy (Luna/GLM/Deepseek/Gemini).
> Nie łącz kilku TEXT-XXX w jedno zlecenie — każdy ma osobny zakres i pułapki.
> Zasady ogólne z BACKLOG.md/AGENTS.md nadal obowiązują: kontrakt → command → adapter → UI → testy, Undo/Redo dla każdej mutacji.

---

### TEXT-001 — Artistic Text
Dodaj nowy typ obiektu `text` (artistic, jedna linia/free-flow, bez ramki). Zakres: tylko model + tworzenie obiektu przez narzędzie, bez edycji inline (to TEXT-004). Nie mieszaj z Paragraph Text (TEXT-002) — to osobny typ, nie wariant tego samego. Uważaj: pozycja tekstu to punkt zakotwiczenia (anchor), nie bounding box — bounding box liczony jest z metryki fontu. Nie wymyślaj własnego systemu layoutu — użyj Canvas TextMetrics jako źródła prawdy. Gotowe, gdy: można wstawić obiekt tekstowy, ma Undo, renderuje się i zachowuje się jak SceneObject (selection, move, delete).

### TEXT-002 — Paragraph Text w ramce
Dodaj drugi typ tekstu: ramka o stałej szerokości/wysokości z zawijaniem (właściwe zawijanie to TEXT-003, tu tylko model ramki). Zakres: model `TextFrame` z width/height, nie ruszaj Artistic Text. Uważaj: ramka musi być resizable jak zwykły obiekt (uchwyty transform), ale zmiana rozmiaru nie skaluje fontu — tylko przelicza zawijanie. Nie twórz nowego systemu selection dla ramki — użyj istniejącego z SEL-014/015. Gotowe, gdy: można narysować ramkę tekstową przeciągnięciem, ma domyślny tekst placeholder, resize działa bez skalowania fontu.

### TEXT-003 — Automatyczne zawijanie tekstu
Dodaj word-wrap wewnątrz `TextFrame` z TEXT-002. Zakres: tylko algorytm łamania linii, nie dotykaj kolumn (TEXT-020) ani justowania (TEXT-018) — zostaw prosty left-align na start. Uważaj: łamanie musi respektować szerokość faktycznie dostępną (minus padding, jeśli istnieje), nie całą szerokość ramki. Nie implementuj własnego algorytmu Knuth-Plass — greedy line-breaking wystarczy na tym etapie. Gotowe, gdy: długi tekst w wąskiej ramce łamie się na kilka linii bez ucinania słów w połowie (chyba że słowo dłuższe niż ramka).

### TEXT-004 — Edycja tekstu bezpośrednio na canvasie
Dodaj tryb edycji inline po double-click na obiekt tekstowy (oba typy z TEXT-001/002). Zakres: wejście/wyjście z trybu edycji i renderowanie kursora, bez selection fragmentu (to TEXT-005). Uważaj: podczas edycji nie może renderować się przez zwykły pipeline sceny z cache'em (PERF-026/027) — to osobny, zawsze świeży render. Nie blokuj innych skrótów klawiszowych narzędzi póki tryb edycji jest aktywny — Escape musi zamykać edycję. Gotowe, gdy: double-click wchodzi w edycję, pisanie zmienia treść, Escape/klik poza obiektem commituje zmianę jako jedną komendę Undo.

### TEXT-005 — Selection fragmentu tekstu
Dodaj zaznaczanie zakresu znaków (drag, Shift+strzałki, double-click=word, triple-click=paragraph) w trybie edycji z TEXT-004. Zakres: tylko model selection (start/end index), nie UI dla formatowania zaznaczonego tekstu. Uważaj: indeksy selection muszą być liczone w code points, nie w bajtach ani UTF-16 code units — inaczej rozjedzie się z emoji/znakami spoza BMP. Nie twórz nowego systemu triggerów myszy — rozszerz istniejący pointer handling z Select Tool. Gotowe, gdy: da się zaznaczyć dowolny zakres myszą i klawiaturą, zaznaczenie widoczne jako podświetlenie.

### TEXT-006 — Text cursor
Dodaj migający kursor tekstowy (caret) w trybie edycji. Zakres: tylko wizualny caret + pozycjonowanie klawiaturą (strzałki, Home/End), nie zaznaczanie (to TEXT-005, ale współdzielą pozycję). Uważaj: pozycja kursora między znakami różnej szerokości (np. po edycji fontu) musi się przeliczać na nowo, nie zapamiętywać jako stały X. Nie synchronizuj migania z rAF renderera dokumentu — użyj osobnego prostego interwału CSS/JS, żeby nie obciążać głównej pętli. Gotowe, gdy: kursor miga, porusza się klawiszami strzałek poprawnie między liniami.

### TEXT-007 — Wybór font family
Dodaj property `fontFamily` do stylu tekstu + UI dropdown z listą dostępnych fontów. Zakres: tylko zmiana fontu dla zaznaczonego zakresu/obiektu, nie import własnych fontów (TEXT-029/030). Uważaj: zmiana fontu musi przeliczyć zawijanie (TEXT-003) i bounding box, bo różne fonty mają różną szerokość znaków. Nie zakładaj, że font jest zawsze załadowany — sprawdź `document.fonts.check()` przed użyciem, inaczej dostaniesz fallback bez ostrzeżenia. Gotowe, gdy: zmiana fontu w dropdownie aktualizuje render i jest jedną komendą z Undo.

### TEXT-008 — Font weight
Dodaj property `fontWeight` (100-900 lub named: regular/bold itd.) z UI. Zakres: tylko property i renderowanie, zależne od tego czy font ma dany weight (fallback na najbliższy dostępny). Uważaj: nie każdy font ma wszystkie wagi — pokaż w UI tylko realnie dostępne warianty dla wybranego fontFamily, inaczej użytkownik wybierze wagę, która się cicho nie zastosuje. Nie hardkoduj listy wag — pobierz z metadanych fontu, jeśli dostępne. Gotowe, gdy: zmiana wagi widoczna na canvasie, UI nie pokazuje niedostępnych wariantów.

### TEXT-009 — Font style
Dodaj property `fontStyle` (normal/italic/oblique). Zakres: analogicznie do TEXT-008 — sam property + UI toggle. Uważaj: italic i oblique to różne rzeczy technicznie (prawdziwy italic ma osobne glify, oblique to pochylenie normalnego) — nie mieszaj ich w jeden przełącznik bez rozróżnienia, bo eksport SVG/PDF wymaga poprawnego atrybutu. Nie generuj syntetycznego italic przez CSS transform, jeśli font ma prawdziwy wariant italic dostępny. Gotowe, gdy: przełącznik działa, eksport SVG poprawnie zapisuje font-style.

### TEXT-010 — Font size
Dodaj property `fontSize` z UI (input liczbowy + jednostka zgodna z DOC-007). Zakres: tylko zmiana rozmiaru, nie ruszaj line-height (TEXT-011) mimo że są powiązane. Uważaj: fontSize zmienia bounding box i musi triggerować re-wrap w Paragraph Text — nie zostawiaj starego layoutu z nowym rozmiarem czcionki. Nie pozwól na wartości ≤0 lub NaN — waliduj input przed commitem komendy. Gotowe, gdy: zmiana rozmiaru natychmiast widoczna, Undo/Redo działa, zero/ujemne wartości są odrzucane z komunikatem.

### TEXT-011 — Line height
Dodaj property `lineHeight` (wielokrotność fontSize albo wartość absolutna — zdecyduj i udokumentuj wybór jednym zdaniem w kodzie). Zakres: tylko odstęp między liniami w Paragraph Text, nie dotyczy Artistic Text (jedna linia). Uważaj: domyślna wartość powinna być zgodna z metryką fontu (ascent+descent+leading), nie arbitralnym 1.2 — inaczej różne fonty będą wyglądać niespójnie. Nie przeliczaj line-height przy każdym renderze — cache'uj razem z resztą layoutu tekstu. Gotowe, gdy: zmiana odstępu widoczna, nie psuje pozycji kursora/selection.

### TEXT-012 — Kerning
Dodaj obsługę kerningu (par kerning z metryki fontu, nie ręczny per-parę). Zakres: włącz/wyłącz kerning jako opcję stylu, użyj natywnego wsparcia Canvas (`ctx.font` + kerning pairs z OpenType, jeśli dostępne przez przeglądarkę). Uważaj: nie implementuj własnej tabeli kerning par ręcznie — to setki godzin roboty i przeglądarka już to robi przez natywny text rendering. Nie myl kerningu z tracking (TEXT-013) — kerning jest per-para znaków, tracking jest jednolity dla całego tekstu. Gotowe, gdy: toggle włącza/wyłącza kerning, widoczna różnica przy parach jak "AV", "To".

### TEXT-013 — Tracking
Dodaj property `letterSpacing`/tracking (jednolity dodatkowy odstęp między wszystkimi znakami). Zakres: tylko property + wpływ na layout/wrap, jeden numeric input w UI. Uważaj: dodatni tracking zwiększa szerokość tekstu, ujemny może powodować nakładanie się glifów przy bardzo małych wartościach — nie ustawiaj sztywnego limitu bez sprawdzenia w praktyce, ale waliduj skrajne wartości. Nie licz tracking jako część fontSize — to osobny addytywny parametr w renderze. Gotowe, gdy: zmiana widoczna, wpływa poprawnie na zawijanie linii w Paragraph Text.

### TEXT-014 — Baseline shift
Dodaj property `baselineShift` dla zaznaczonego fragmentu tekstu (przesunięcie pionowe względem baseline, np. superscript/subscript). Zakres: tylko przesunięcie liczbowe, nie pełne presety superscript/subscript (możesz je dodać jako skrót UI, ale to nie jest wymagane w tym tasku). Uważaj: baseline shift działa na poziomie run'a tekstu (fragmentu), nie całego obiektu — wymaga struktury danych, która pozwala na różne style w jednym akapicie (rich text runs), nie jednego płaskiego stylu na obiekt. Nie dodawaj tego jako hack na pozycji Y całego obiektu. Gotowe, gdy: zaznaczony fragment można przesunąć względem baseline niezależnie od reszty tekstu.

### TEXT-015 — Wyrównanie do lewej
Dodaj `textAlign: left` jako pierwszą opcję wyrównania w Paragraph Text. Zakres: sam mechanizm align + UI przycisk, traktuj to jako fundament dla TEXT-016/017/018. Uważaj: left-align to również wartość domyślna — upewnij się, że nowy TextFrame startuje z tym ustawieniem jawnie w modelu, nie przez brak wartości (undefined ≠ left, może się różnie zachować przy serializacji). Nie twórz osobnych property dla każdego kierunku — jedno pole `textAlign` z enumem. Gotowe, gdy: przycisk left jest domyślnie aktywny, akapit wyrównuje się do lewej krawędzi ramki.

### TEXT-016 — Wyrównanie do środka
Dodaj `textAlign: center` jako drugą wartość enuma z TEXT-015. Zakres: tylko dodanie wartości i logiki renderu, UI przycisk w tej samej grupie co left. Uważaj: center musi przeliczać się per-linia (po word-wrap), nie dla całego bloku tekstu naraz — inaczej linie różnej długości nie wycentrują się poprawnie. Nie duplikuj kodu align — jedna funkcja renderująca linię z parametrem alignment. Gotowe, gdy: każda linia w ramce centruje się niezależnie od innych linii.

### TEXT-017 — Wyrównanie do prawej
Dodaj `textAlign: right`, analogicznie do TEXT-016. Zakres: trzecia wartość enuma, ta sama funkcja renderująca co left/center. Uważaj: przy RTL (prawo-do-lewa) języków to się komplikuje — jeśli nie obsługujesz RTL w ogóle, zaznacz to jawnie jako known limitation, nie udawaj wsparcia. Nie zmieniaj kierunku pisania tekstu — to tylko wyrównanie bloku, litery nadal LTR. Gotowe, gdy: linie wyrównują się do prawej krawędzi ramki, konsystentnie z left/center.

### TEXT-018 — Justowanie
Dodaj `textAlign: justify` — rozciąganie odstępów między słowami tak, by linia wypełniała całą szerokość (poza ostatnią linią akapitu). Zakres: tylko justify dla pełnych linii, ostatnia linia akapitu zostaje left-aligned. Uważaj: justify wymaga przeliczenia odstępów międzysłownych per-linia dynamicznie — nie da się tego zrobić statycznym CSS-owym `text-align: justify` w Canvas, trzeba ręcznie rozdzielić dodatkową przestrzeń. Nie justuj linii z jednym słowem (nie ma gdzie rozciągnąć) — zostaw jako left. Gotowe, gdy: pełne linie wypełniają szerokość ramki, ostatnia linia akapitu nie jest rozciągana.

### TEXT-019 — Listy
Dodaj obsługę list (bullet/numbered) w Paragraph Text. Zakres: podstawowy marker (kropka lub liczba) + wcięcie tekstu listy, bez zagnieżdżonych list wielopoziomowych (to możesz zostawić jako known limitation). Uważaj: marker listy nie jest częścią edytowalnego tekstu — nie wstawiaj go jako zwykły znak, bo wtedy backspace go usunie niepoprawnie; to osobny wygenerowany element per-akapit. Nie buduj pełnego edytora list jak Word — tylko toggle bullet/numbered per zaznaczony akapit. Gotowe, gdy: da się włączyć listę na zaznaczonych akapitach, marker renderuje się poprawnie i nie jest usuwalny jak zwykły znak.

### TEXT-020 — Kolumny tekstu
Dodaj property `columnCount` dla Paragraph Text (podział ramki na N kolumn z automatycznym przepływem tekstu). Zakres: tylko podział wizualny wewnątrz jednej ramki, nie linked text frames (to bardziej zaawansowany DTP feature, poza zakresem). Uważaj: przepływ tekstu między kolumnami wymaga przeliczenia word-wrap (TEXT-003) osobno dla każdej kolumny, z uwzględnieniem gutter (odstępu między kolumnami). Nie zmieniaj rozmiaru całej ramki przy zmianie liczby kolumn — kolumny dzielą istniejącą szerokość. Gotowe, gdy: tekst przepływa poprawnie między 2+ kolumnami bez ucinania.

### TEXT-021 — Odstępy akapitów
Dodaj property `paragraphSpacing` (dodatkowy odstęp przed/po akapicie, niezależny od line-height). Zakres: tylko wartość liczbowa + wpływ na layout, per akapit lub globalnie dla ramki — zdecyduj jedno podejście i zapisz je w kodzie jednym komentarzem. Uważaj: to musi się sumować z line-height ostatniej linii poprzedniego akapitu, nie zastępować go — inaczej odstępy będą wyglądać nierówno. Nie dodawaj spacing przed pierwszym akapitem w ramce. Gotowe, gdy: widoczny dodatkowy odstęp między akapitami, pierwszy akapit nie ma zbędnego marginesu górnego.

### TEXT-022 — Wcięcia
Dodaj property `indent` (wcięcie pierwszej linii akapitu lub całego akapitu — rozróżnij te dwa warianty jawnie w UI). Zakres: prosty numeric indent, bez wcięć wiszących (hanging indent) na tym etapie. Uważaj: wcięcie wpływa na dostępną szerokość dla word-wrap tej konkretnej linii/akapitu — nie może być czysto wizualnym przesunięciem bez przeliczenia zawijania. Nie myl z paragraphSpacing (TEXT-021) — to przesunięcie poziome, nie pionowy odstęp. Gotowe, gdy: wcięcie widoczne, tekst poprawnie zawija się z uwzględnieniem zmniejszonej szerokości.

### TEXT-023 — Text on Path
Dodaj możliwość "przyklejenia" Artistic Text do istniejącej ścieżki (tekst podąża za krzywą). Zakres: tylko podstawowy przypadek — tekst wzdłuż otwartej lub zamkniętej ścieżki, jeden kierunek, bez offsetu od path. Uważaj: pozycję i rotację każdego znaku trzeba liczyć z parametryzacji krzywej (arc-length, nie t-parameter Béziera — inaczej znaki będą nierówno rozłożone na zakrzywionych fragmentach). Nie renderuj tego jako statyczny obraz — musi zostać responsywne na edycję ścieżki (przesunięcie węzła przesuwa tekst). Gotowe, gdy: tekst podąża za ścieżką, aktualizuje się po edycji węzłów ścieżki, ma Undo.

### TEXT-024 — Convert Text to Outlines
Dodaj komendę zamieniającą obiekt tekstowy na compound path (każda litera jako zamknięta ścieżka/dziura). Zakres: konwersja jest jednorazowa i destrukcyjna (tekst przestaje być edytowalny jako tekst) — musi być jawnie oznaczona jako taka w UI (patrz UX-023, ostrzeżenie przed tą operacją, ma być zintegrowane). Uważaj: musisz wygenerować prawdziwą geometrię glifów (kontury z fontu), nie bounding boxy — użyj biblioteki do ekstrakcji outline z fontu (np. opentype.js), nie zgaduj kształtu liter. Nie usuwaj oryginalnego tekstu z historii — to jedna komenda z pełnym Undo z powrotem do edytowalnego tekstu. Gotowe, gdy: po konwersji litery są realnymi ścieżkami edytowalnymi Node Toolem, Undo przywraca tekst.

### TEXT-025 — Wyszukiwanie tekstu
Dodaj panel/komendę Find — wyszukiwanie stringa we wszystkich obiektach tekstowych dokumentu. Zakres: tylko wyszukiwanie i podświetlanie wyników (z opcją "next/previous"), bez zamiany (to TEXT-026). Uważaj: wyszukiwanie musi przechodzić przez wszystkie artboardy i zagnieżdżone grupy, nie tylko aktywny widok — inaczej użytkownik nie znajdzie tekstu na innym artboardzie bez wiedzy, że tam jest. Nie blokuj UI dla dużych dokumentów — jeśli tekstu jest dużo, wykonaj wyszukiwanie asynchronicznie. Gotowe, gdy: wpisanie frazy podświetla i pozwala nawigować między wszystkimi wystąpieniami w dokumencie.

### TEXT-026 — Zamiana tekstu
Rozszerz TEXT-025 o Replace/Replace All. Zakres: zamiana pojedyncza (z potwierdzeniem lub podglądem) i zbiorcza, każda zamiana to command z Undo. Uważaj: Replace All na dużym dokumencie powinno być JEDNĄ komendą historii (grupowaną), nie osobną komendą per wystąpienie — inaczej Undo będzie wymagało wielokrotnego cofania jednej logicznej operacji. Nie zamieniaj wewnątrz tekstu, który jest częścią symbolu/instancji bez ostrzeżenia o wpływie na wszystkie instancje. Gotowe, gdy: Replace All zmienia wszystkie wystąpienia jedną operacją, jedno Undo cofa całość.

### TEXT-027 — Lista użytych fontów
Dodaj panel pokazujący wszystkie fonty użyte w dokumencie (nazwa, liczba wystąpień). Zakres: tylko odczyt i wyświetlenie, bez akcji zamiany fontu z tego panelu (możesz dodać "select all with this font" jako bonus, ale nie jest wymagane). Uważaj: lista musi się aktualizować reaktywnie przy każdej zmianie fontu w dokumencie, nie tylko przy otwarciu panelu — inaczej pokaże nieaktualne dane. Nie licz tego z osobnego cache'u niezależnego od modelu dokumentu — czytaj bezpośrednio z DocumentModel. Gotowe, gdy: panel pokazuje aktualną, poprawną listę fontów i się odświeża po zmianach.

### TEXT-028 — Alert o brakującym foncie
Dodaj wykrywanie i ostrzeżenie, gdy dokument referencuje font niedostępny w przeglądarce/systemie (istotne szczególnie po imporcie AI/CDR — patrz IO-014/015). Zakres: wykrycie + widoczny alert/badge, bez auto-podmiany fontu (chyba że jawnie potwierdzone przez użytkownika). Uważaj: sprawdzenie dostępności fontu musi się odbywać asynchronicznie (ładowanie fontów webowych trwa) — nie oceniaj braku fontu zanim się w pełni nie załaduje lub nie upłynie timeout. Nie chowaj tego ostrzeżenia głęboko w UI — to bezpośrednio wpływa na wierność wyświetlania, powinno być widoczne od razu przy otwarciu dokumentu. Gotowe, gdy: brakujący font jest wykryty i pokazany użytkownikowi z nazwą fontu i listą obiektów, których dotyczy.

### TEXT-029 — Import fontów webowych
Dodaj możliwość dodania fontu z URL/webfont (np. Google Fonts) do dokumentu. Zakres: tylko ładowanie i rejestracja fontu przez `FontFace` API, dodanie do listy dostępnych fontFamily. Uważaj: musisz obsłużyć błąd ładowania (zły URL, CORS, format nieobsługiwany) z czytelnym komunikatem — cichy fail zostawi użytkownika z fontem, który nie działa bez wyjaśnienia. Nie ładuj fontu synchronicznie blokując UI — użyj `font.load()` z promise i pokaż stan ładowania. Gotowe, gdy: dodany font webowy pojawia się w dropdownie fontFamily i renderuje się poprawnie po załadowaniu.

### TEXT-030 — Import fontów lokalnych
Dodaj możliwość użycia fontów zainstalowanych lokalnie na urządzeniu użytkownika, gdy przeglądarka to wspiera (Local Font Access API). Zakres: tylko odczyt i użycie, za jawną zgodą użytkownika (permission prompt). Uważaj: ta funkcja NIE jest dostępna we wszystkich przeglądarkach — musisz mieć feature detection i czytelny fallback/komunikat, gdy API nie istnieje, zamiast crasha lub cichego braku działania. Nie zakładaj dostępu bez promptu — to wymaga jawnej zgody z powodów prywatności. Gotowe, gdy: w obsługiwanej przeglądarce można wybrać lokalny font po zgodzie, w nieobsługiwanej widać jasny komunikat o braku wsparcia.

### TEXT-031 — Panel znaków specjalnych
Dodaj panel do wstawiania znaków specjalnych (symbole, akcenty, itp.) do edytowanego tekstu. Zakres: siatka/lista znaków z podglądem + wstawienie w miejscu kursora (TEXT-006). Uważaj: wstawiony znak musi respektować aktualny styl (font, rozmiar) w miejscu kursora, nie resetować do domyślnego. Nie buduj własnej bazy znaków Unicode od zera — użyj istniejących zestawów/tablic Unicode blocks jako źródła danych. Gotowe, gdy: kliknięcie znaku wstawia go w pozycji kursora z zachowaniem aktualnego stylu.

### TEXT-032 — Emoji picker
Dodaj picker emoji analogiczny do TEXT-031, ale z wyszukiwaniem po nazwie/kategorii. Zakres: siatka emoji + search + wstawienie w pozycji kursora. Uważaj: emoji renderowane przez przeglądarkę mogą wyglądać inaczej niż w picker (różne fonty systemowe) — testuj rzeczywisty render na canvasie, nie tylko w UI pickera. Nie zapominaj o multi-codepoint emoji (np. flagi, emoji ze skin-tone modifier) — traktuj je jako pojedynczą jednostkę przy wstawianiu i przy selection (TEXT-005) z code points, nie osobnych znaków. Gotowe, gdy: wyszukiwanie działa, wstawiony emoji renderuje się poprawnie jako jedna jednostka w selection.

### TEXT-033 — Variable fonts
Dodaj wsparcie dla variable fonts (osie takie jak weight, width, slant jako continuum, nie stałe stopnie). Zakres: wykrycie, że font jest variable + UI z suwakami dla dostępnych osi. Uważaj: musisz odczytać rzeczywiste dostępne osie i ich zakresy z metadanych fontu (`fvar` table) — nie zakładaj standardowego zakresu 100-900 dla wagi, bo różne fonty mają różne min/max. Nie mieszaj tego z prostym fontWeight z TEXT-008 — variable font axes to osobny, bardziej ogólny mechanizm (`font-variation-settings`). Gotowe, gdy: suwak dla wykrytej osi (np. wght) płynnie zmienia render tekstu w czasie rzeczywistym.

### TEXT-034 — Tekst zmienny dla szablonów
Dodaj mechanizm placeholderów w tekście (np. `{{imię}}`), które można podmieniać zbiorczo przy generowaniu wariantów szablonu. Zakres: definicja placeholderów w tekście + prosty panel do podania wartości i podglądu podmienionego wyniku, bez pełnego batch-generowania wielu plików na raz (to bardziej należy do EXPORT-019 i mogłoby być osobnym task). Uważaj: placeholder musi zachować się poprawnie przy word-wrap (TEXT-003) — długość podmienionej wartości może być inna niż placeholder i wymaga przeliczenia layoutu. Nie parsuj placeholderów regexem na już wyrenderowanym tekście — trzymaj je jako osobny typ danych w modelu tekstu (rich text run z flagą `isPlaceholder`). Gotowe, gdy: podmiana wartości placeholdera aktualizuje wygląd tekstu z poprawnym zawijaniem.

---

## Uwaga do wykonawcy (dowolny model)

Te taski są celowo płytkie — mają wskazać pułapki, nie zastąpić Twojego myślenia. Jeśli natrafisz na sprzeczność z istniejącym kodem (np. inny format przechowywania stylu tekstu niż zakładany tu "rich text runs"), zatrzymaj się i zapytaj zamiast zgadywać architekturę na nowo.

Każdy task realizujesz osobno: kontrakt/model → command z Undo/Redo → adapter renderera → UI z klawiaturą/ARIA → test. Nie łącz kilku TEXT-XXX w jeden commit, chyba że jeden fizycznie wymaga drugiego (np. TEXT-016/017 mogą iść razem, bo to ta sama funkcja renderująca z innym parametrem).
