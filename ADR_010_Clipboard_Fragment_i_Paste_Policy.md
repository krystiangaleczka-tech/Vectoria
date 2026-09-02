# ADR 010: Clipboard Fragment i Paste Policy

## Kontekst
Kopiowanie i wklejanie obiektów to jedna z podstawowych funkcji edytora. Musimy zapewnić niezawodny mechanizm przenoszenia obiektów zarówno w ramach jednej sesji (in-memory) jak i pomiędzy oknami czy zewnętrznymi aplikacjami (system clipboard). Musimy również obsłużyć konflikt identyfikatorów przy wklejaniu oraz zapewnić jednoznaczną politykę docelową przy operacjach takich jak "wklej w miejscu" czy "wklej na wszystkich obszarach roboczych".

## Decyzja
1. **Clipboard Fragment Contract**: Stan schowka to `ClipboardFragment` zdefiniowany w warstwie `core`. Jest on transientowy i nie podlega persistencji do pliku dokumentu. Zod schema do walidacji JSON schowka systemowego re-używa typów `SceneObjectSchema`.
2. **System Clipboard**: Serializacja do `application/x-vectoria-fragment` (JSON) jako główny nośnik danych wektorowych, wsparty fallbackiem `text/plain` dla importu i eksportu SVG, co pozwala na kompatybilność z innymi aplikacjami.
3. **Regeneracja identyfikatorów**: Każdy obiekt jest głęboko klonowany przed wklejeniem, a jego `objectId` i odpowiednie identyfikatory wezłów ścieżek (`PathNode.id`) są ponownie generowane, by zapobiec kolizjom stanów w selekcjach.
4. **Paste Policy**: Trzy tryby obsługi operacji:
   - `offset`: +20/+20 px przesunięcie globalne od współrzędnych źródła.
   - `in-place`: dokładne odtworzenie współrzędnych ze schowka, wklejenie do aktywnej warstwy.
   - `all-artboards`: powielenie obiektów z ich źródłowymi współrzędnymi globalnymi (bez offsetu) tak, aby pokrywały każdy artboard, wklejone tylko do jednej docelowej aktywnej warstwy. Każde wklejenie generuje jeden wpis do historii `Undo/Redo`.

## Konsekwencje
- Brak konfliktów ID przy kolejnych pastach i undo.
- Bezpieczny odczyt z systemowego schowka, ponieważ dane są w pełni walidowane.
- Niezależność schowka sesji (in-memory) od schowka systemowego w celu szybkiego działania wewnętrznego.
