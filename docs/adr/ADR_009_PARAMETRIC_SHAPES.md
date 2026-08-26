# ADR-009: Reprezentacja Kształtów Parametrycznych

## Status
Zatwierdzony

## Kontekst
W ramach rozbudowy Vectoria o kształty parametryczne (wielokąty, gwiazdy, łuki, spirale, dymki komiksowe) musimy zdecydować o sposobie przechowywania tych obiektów w `DocumentModel`.

Mamy dwie podstawowe strategie reprezentacji:
1. **Podejście strukturalne (Spłaszczanie / Flattening):** Każdy wyrysowany przez narzędzie kształt jest natychmiast zamieniany na zamkniętą lub otwartą ścieżkę wektorową (`PathObject`) zawierającą wyliczone węzły (nodes). Tak działa rysowanie odręczne.
2. **Podejście parametryczne (Semantyczne):** Każdy typ kształtu ma własny typ obiektu domenowego (np. `StarObject`, `ArcObject`), który przechowuje cechy charakterystyczne (parametry), na podstawie których geometria jest na bieżąco generowana. Np. liczba wierzchołków dla wielokąta czy promień wewnętrzny i zewnętrzny dla gwiazdy.

## Decyzja
Wybieramy **Podejście parametryczne (Semantyczne)**.
Figury (Arc, Pie, Ring, Star, Spiral, Callout, Polygon, Polyline) będą zdefiniowane jako niezależne typy `SceneObject` i będą trzymały tylko parametry je definiujące. 

## Uzasadnienie
1. **Edytowalność bezstratna**: Utrzymywanie oryginalnych parametrów figury umożliwia zmianę jej unikalnych atrybutów w dowolnym momencie, np. zmianę liczby wierzchołków wielokąta w Properties Panel po narysowaniu.
2. **Uchwyty parametryczne**: Umożliwienie renderowania na kanwie dedykowanych punktów chwytania (parametric overlay handles), które oddziałują bezpośrednio na semantyczne właściwości (np. przeciąganie wierzchołka pociąga zmianę innerRadius). Z path-objectu ciężko jest zgadnąć, czy wierzchołek dotyczy parametrycznej krzywej.
3. **Mniejsze zużycie pamięci / Mniejsza wielkość plików**: Dla kształtów takich jak spirala czy gęsta gwiazda przechowywanie np. 3 zmiennych zamiast 200 węzłów ścieżki jest znacznie lepsze pod względem wag dokumentów SVG oraz `.vct`.
4. **Możliwość precyzyjnego eksportu w SVG**: Część figur (wielokąt, polilinia) możemy bezpośrednio przerzucić do czytelnych natywnych formatów `<polygon>` i `<polyline>`, bez tworzenia wielkich łańcuchów w tagu `<path>`.

## Konsekwencje
- Konieczność implementacji precyzyjnego wyliczania krzywych dla hit-testu i bounds calculations dynamicznie.
- Złożenie renderowania na Canvas 2D wymaga utrzymywania dedykowanych funkcji renderujących w `packages/renderer`.
- Dla manipulacji na pojedynczych wierzchołkach będzie konieczne istnienie opcji konwersji / komendy w stylu `ConvertObjectToPathCommand` (zgodnie z `VECTORIA_ARCHITECTURE.md`), co bezpowrotnie straci dane parametryczne kształtu i nada mu charakter `PathObject`.
- Ogon dymka czy promień gwiazdy wymagają rygorystycznej definicji niezmienników w `invariants.ts`, by uchronić UI przed niebezpiecznymi wejściami.

## Doprecyzowanie: Ring jest okręgiem
`RingObject` przechowuje wyłącznie `outerRadius` i `innerRadius` — bez pary `radiusX/radiusY`. Ring jest więc z definicji okręgiem, a nie elipsą: hit-test (`hitTestRing`) używa odległości euklidesowej `Math.hypot`, renderer i eksport SVG traktują go jako dwa koncentryczne okręgi z `fill-rule="evenodd"`. Wsparcie dla pierścienia eliptycznego wymagałoby rozszerzenia kontraktu domenowego o `radiusX/radiusY` (nowy wpis ADR + migracja `.vct`).
