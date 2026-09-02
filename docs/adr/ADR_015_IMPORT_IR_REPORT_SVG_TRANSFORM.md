# ADR 015: ImportIR, ImportReport i SVG Transform Strategy

**Data:** 2026-09-02
**Status:** Accepted
**Kontekst:** Wdrożenie importu zewnętrznych formatów wektorowych (Epic-15), w tym bezpieczeństwo, raportowanie niezgodności i mapowanie geometrii.

## Kontekst i problem

Aplikacja Vectoria wczytuje obce pliki, przede wszystkim SVG i PDF. Należy upewnić się, że:
1. Skomplikowane struktury SVG i atrybuty `<transform>` są mapowane w spójny sposób (bez cichej utraty pozycji/skali).
2. Elementy nieobsługiwane (jak filtry, tagi `<script>`, zewnętrzne URL, czy specyficzne dla AI/CDR) są odfiltrowane.
3. Import kończy się wygenerowaniem szczegółowego raportu `ImportReport`, kategoryzując poszczególne elementy (editable, simplified, flattened, unsupported) na podstawie wytycznych z pliku `BACKLOG.md` / `EPIC-15`.
4. Stworzony jest pośredni interfejs (Intermediate Representation - `ImportIR`), dzięki któremu w przyszłości ujednolicimy obróbkę i sanityzację formatów innych niż natywny SVG.

## Decyzja

1. **ImportIR i ImportReport**: Typy `ImportReportEntry` i `ImportReport` będą stworzone jako wspólny, neutralny kontrakt w `packages/core/src/import/import-types.ts`. Każdy format obsługiwany (SVG, PDF, itd.) musi generować taki raport na koniec operacji, dając jasną informację zwrotną co do poprawności i braków.
2. **Sanitizer SVG jako jeden punkt wejścia**: Zdefiniowany w `packages/io/src/svg/sanitizer.ts`, usuwający `<script>`, zewnętrzne zasoby, i atrybuty typu `on*` / `javascript:` przez Regexy przed wysłaniem SVG do `DOMParser`. Obejmie on również limity (rozmiar, elementy, złożoność `d`).
3. **Strategia Transformacji SVG**:
   - Aficzne transformacje SVG (`translate`, `scale`, `rotate`, afiniczne `matrix`) - będą rozkładane i zapisywane jako `Transform2D` w natywnych elementach Vectorii.
   - Transformacje nieafiniczne (np. zniekształcenia krzywe, rzuty) - będą "wypalane" do struktury punktów (materializacja geometrii) i oznaczane wpisem w `flattened`.
4. **IO Natywne VCT**: Serializacja oraz kompresja zaimplementowana w module IO, a format `.vct` będzie replikował działanie natywnego parsingu z istniejącego IndexedDB z uwzględnieniem Zod migrations.

## Konsekwencje

**Pozytywne:**
- Transparentność dla użytkownika - zawsze jasny raport przy brakach wsparcia.
- Wspólny bezpieczny przepływ dla wszystkich plików SVG (menu, drag&drop, schowek).
- Zapobieganie utraty pozycjonowania poprzez rzetelną konwersję `transform`.

**Negatywne/Ryzyka:**
- Koszt operacji wyciągnięcia transformacji na złożonych wielopoziomowych grupach `g`.
- Materializacja geometrii (flattened) oznacza brak możliwości odwrotnego zmodyfikowania samej transformacji w interfejsie po imporcie.
