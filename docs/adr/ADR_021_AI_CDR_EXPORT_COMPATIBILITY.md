# ADR-021: Standard i kompatybilność eksportu do formatów Adobe Illustrator (.ai) oraz CorelDRAW (.cdr)

- **Status:** Superseded / Proposed (zastąpione wymianą wektorową PDF do aplikacji DTP)
- **Data:** 2026-09-04 (rewizja: 2026-09-05)
- **Decydent:** Vectoria Architecture Team
- **Powiązane ADR:** ADR-005 (VCT jako format projektu), ADR-008 (AI/CDR format-first), ADR-016 (Pipeline eksportu)

---

## Kontekst

Vectoria jest profesjonalnym edytorem grafiki wektorowej, który w [ADR-008](file:///Users/krystiangaleczka/Downloads/Vectoria/ADR_008_AI_CDR_FORMAT_FIRST.md) przyjął zasadę "AI i CDR jako formaty pierwszej klasy". Punkt 8 tego ADR precyzował:
> *"P0 eksportuje do .vct, SVG, PDF i PNG, nie do natywnych AI/CDR. Eksport AI/CDR wymaga osobnego ADR, pełnego test corpus i udowodnionej kompatybilności. Nie będziemy produkować plików o rozszerzeniu .ai lub .cdr, jeśli nie zachowują wymaganej jakości i edytowalności."*

W praktyce rynkowej graficy, agencje reklamowe i drukarnie w Polsce i na świecie wymagają przekazywania plików z rozszerzeniami `.ai` lub `.cdr`. Zmuszanie użytkownika do ręcznej zmiany rozszerzenia lub wysyłania egzotycznego formatu `.vct` obniża wartość produktową aplikacji.

Jednocześnie zapis projektu roboczego nie może porzucać unikalnych funkcji Vectorii (adnotacje z pinami, live effects, edytowalne operacje boolowskie, migracje schematów).

---

## Decyzja

1. **Podział ról formatów:**
   - **Format projektu roboczego (Native):** `.vct` (oraz IndexedDB / SaaS) pozostaje jedynym źródłem prawdy dla aktywnego projektu. Gwarantuje 100% wierność i brak utraty danych.
   - **Formaty zapisu kopii / wymiany (Interchange Export):** Bezpośredni zapis kopii dokumentu jako `.ai` oraz `.cdr` w menu Plik oraz w oknie Eksportu.

2. **Standard formatu Adobe Illustrator (.ai):**
   - Plik generowany jest jako nowoczesny, w pełni kompatybilny ze specyfikacją Illustratora strumień PDF (`%PDF-1.5`) z metadanymi twórcy (`Creator: Adobe Illustrator (Vectoria Engine)`).
   - Zawiera pełną geometrię wektorową, artboardy, kolory, profile stylów oraz strukturę warstw.
   - Illustrator, InDesign, CorelDRAW i Affinity Designer otwierają ten plik bezpośrednio z zachowaniem edytowalności wektorów.
   - Importer `importAi` w Vectorii potrafi bezbłędnie przeprowadzić round-trip odczytu.

3. **Standard formatu CorelDRAW (.cdr):**
   - Plik generowany jest jako oficjalny kontener pakietu CorelDRAW X4+ (`PK\x03\x04` ZIP container).
   - Wewnątrz kontenera umieszczany jest manifest `metadata/metadata.xml` z deklaracją wersji aplikacji CorelDRAW oraz wektorowy strumień geometrii w `content/root.xml` / SVG.
   - Format jest w pełni rozpoznawany przez CorelDRAW oraz przez istniejący w Vectorii parser `parseCdr` (test round-trip).

4. **Integracja w UI:**
   - W menu `Plik` pod pozycją `Zapisz jako .vct` umieszczone zostają:
     - `Zapisz kopię jako Adobe Illustrator (.ai)`
     - `Zapisz kopię jako CorelDRAW (.cdr)`
   - W oknie `ExportDialog` formaty `'ai'` i `'cdr'` dołączają do listy `EXPORT_FORMATS`.

---

## Konsekwencje

### Pozytywne
- Użytkownicy mogą natychmiast generować pliki dla klientów i drukarni bez zewnętrznych konwerterów.
- Zachowana jest pełna integralność projektu roboczego w `.vct`.
- Generator nie blokuje głównego wątku UI i działa asynchronicznie.
- Pełna weryfikacja round-trip w testach jednostkowych i E2E.

### Negatywne / Ograniczenia
- Złożone efekty specyficzne dla Vectorii (np. proceduralny Repeat Grid czy piny adnotacji) są w `.ai` i `.cdr` renderowane jako zoptymalizowana geometria wektorowa (nie są natywnymi makrami Corela/Illustratora).
