# ADR-008: AI i CDR jako formaty pierwszej klasy

- **Status:** Accepted
- **Data:** 2026-08-21
- **Decydent:** Vectoria

## Kontekst

Vectoria ma konkurować w obszarze profesjonalnej grafiki wektorowej i ma być użyteczna przede wszystkim dla osób, które otrzymują pliki z Adobe Illustrator oraz CorelDRAW.

Standardowa kolejność dla wielu prostych edytorów webowych to: najpierw SVG, potem PNG/JPG, a dopiero później formaty `.ai` i `.cdr`. Taki kierunek upraszcza implementację, ale nie daje Vectorii najważniejszej przewagi: otwierania plików, które użytkownicy realnie dostają od grafików, drukarni, klientów i zespołów pracujących w Illustratorze/Corelu.

AI i CDR są formatami proprietarnymi, a ich kompletna zgodność jest trudna. W szczególności:

- nowoczesny AI może zawierać PDF-compatible representation, ale nie każdy plik ma ją zapisaną;
- AI może zawierać dane specyficzne dla Illustratora, których neutralny importer nie odtworzy w pełni;
- CDR jest natywnym formatem CorelDRAW i wymaga odrębnego, kontrolowanego parsera albo procesu konwersji;
- efekty, tekst, fonty, transparency, mesh, PowerClip, macros oraz live effects mogą nie mieć bezpośredniego odpowiednika w modelu Vectorii.

Jednocześnie zrobienie bezpośredniego importu „do DOM SVG” nie jest wystarczające: Vectoria musi pozwolić edytować obiekty w swoim modelu dokumentu, utrzymać płynność oraz uczciwie raportować straty zgodności.

## Decyzja

1. **AI i CDR są formatami wejściowymi P0.**
   Pierwsza publiczna wartość Vectorii ma obejmować otwieranie tych plików, a nie tylko tworzenie nowego SVG od zera.

2. **Wszystkie formaty zewnętrzne są importowane do natywnego `DocumentModel`.**
   Nie używamy AI/CDR jako źródła prawdy w otwartym projekcie. Importer mapuje dane do geometrii, stylów, warstw i assetów Vectorii.

3. **AI P0 zaczyna od PDF-compatible AI.**
   Pliki z wykrywalną warstwą PDF są obsługiwane przez adapter PDF/AI. AI bez PDF-compatible data nie otrzymuje fałszywej obietnicy pełnego otwarcia; aplikacja pokazuje instrukcję zapisania pliku z opcją kompatybilności PDF.

4. **CDR P0 używa adaptera za abstrakcyjnym interfejsem.**
   Implementacja może używać lokalnego parsera, WASM, workera albo bezpiecznej usługi konwersji. Wybór nie może przeciekać do UI i modelu domenowego.

5. **Wspólny `ImportIR` jest obowiązkowy.**
   Adapter AI i CDR produkują neutralną reprezentację importową, następnie walidowaną i mapowaną na `DocumentModel`.

6. **Import jest transakcyjny, asynchroniczny i anulowalny.**
   Błąd importu nigdy nie niszczy bieżącego dokumentu. Kosztowna konwersja nie może blokować głównego wątku UI.

7. **Każdy import ma Compatibility Report.**
   Obiekty są klasyfikowane jako `editable`, `editable-with-warning`, `flattened` albo `unsupported`. Elementy nieobsługiwane nie mogą znikać po cichu.

8. **P0 eksportuje do `.vct`, SVG, PDF i PNG, nie do natywnych AI/CDR.**
   Eksport AI/CDR wymaga osobnego ADR, pełnego test corpus i udowodnionej kompatybilności. Nie będziemy produkować plików o rozszerzeniu `.ai` lub `.cdr`, jeśli nie zachowują wymaganej jakości i edytowalności.

## Alternatywy rozważone

### A. SVG-first, AI/CDR później

**Odrzucone.**

Plusy:

- Najprostsze MVP
- Szybki eksport/import otwartego formatu
- Mniej ryzyka technologicznego

Minusy:

- Nie realizuje głównego wyróżnika Vectorii
- Nie rozwiązuje problemu użytkownika z plikami klientów/drukarni
- Może pozycjonować produkt jako kolejny podstawowy SVG editor

### B. Pełny własny parser AI i CDR od pierwszego dnia

**Odrzucone.**

Plusy:

- Maksymalna kontrola
- Brak zależności od zewnętrznej konwersji

Minusy:

- Bardzo wysoki koszt i ryzyko
- Zbyt długi czas do pierwszego działającego produktu
- Ryzyko błędów zgodności, bezpieczeństwa oraz problemów licencyjnych

### C. Import tylko do raster preview

**Odrzucone jako główny workflow.**

Plusy:

- Szybki widok pliku
- Łatwy fallback dla złożonych efektów

Minusy:

- Nie daje wartości edycji wektorowej
- Użytkownik nie może poprawić logo, ikon lub krzywych
- Jest sprzeczne z pozycjonowaniem Vectorii

### D. Warstwowy import z poziomami zgodności

**Wybrane.**

Plusy:

- Użytkownik otrzymuje wynik nawet dla częściowo nieobsługiwanego pliku
- Wspierane elementy pozostają edytowalne
- Produkt nie ukrywa utraty danych
- Zakres może być rozszerzany iteracyjnie

Minusy:

- Trzeba zbudować Compatibility Report
- Wymaga utrzymania test corpus i visual regression
- Użytkownik może oczekiwać wyższej kompatybilności niż P0

## Konsekwencje

### Pozytywne

- Vectoria od początku posiada czytelne pozycjonowanie: narzędzie do otwierania i pracy z AI/CDR, nie tylko generator SVG.
- Wspólny ImportIR redukuje duplikację między adapterami formatów.
- Model dokumentu pozostaje niezależny od formatów firm trzecich.
- Raport zgodności buduje zaufanie, bo użytkownik wie, co zostało zachowane.
- Transakcyjny import chroni pracę użytkownika.

### Negatywne

- Pierwszy etap projektu jest trudniejszy niż typowy SVG editor.
- CDR może wymagać backendu konwersji, infrastruktury i jasnej polityki prywatności.
- Niektóre pliki będą wymagać fallbacku lub nie zostaną otwarte.
- Trzeba utrzymywać reprezentatywne pliki testowe i badać różne wersje formatów.

### Ryzyka i mitygacje

| Ryzyko | Mitygacja |
|---|---|
| AI bez PDF-compatible stream | Czytelny komunikat i instrukcja ponownego zapisu z Illustrator |
| Niska wierność CDR | Obowiązkowy spike, test corpus i adapter wymienialny za interfejsem |
| Zawieszenie UI przy imporcie | Worker/backend sandbox, cancel, timeout i progres |
| Utrata efektów/tekstu | Compatibility Report, fallback i source attachment |
| Niebezpieczny plik | Limity zasobów, sanitizacja, brak wykonywania macro/script |
| Problem licencyjny biblioteki | Ocena licencji przed wyborem adaptera i zapis wyniku w osobnym ADR |

## Kryteria sukcesu

Decyzja będzie uznana za trafną, jeżeli wersja P0 spełni wszystkie warunki:

1. Użytkownik importuje PDF-compatible AI z podstawowymi paths/shapes/fill/stroke bez crasha.
2. Użytkownik importuje reprezentatywny CDR z basic shapes/curves/fill/outline przez wybrany adapter.
3. Wspierane obiekty po imporcie są edytowalne w Vectorii.
4. Aplikacja pokazuje raport o uproszczeniach i brakach.
5. Import nie blokuje interakcji z UI.
6. Wynik można wyeksportować do SVG/PDF/PNG.
7. Test corpus i regresje wizualne wykrywają pogorszenie zgodności.

## Follow-up

- Utworzyć `FORMAT_STRATEGY_AI_CDR.md`.
- Utworzyć `AI_CDR_IMPORT_BACKLOG.md`.
- Przygotować corpus plików AI/CDR.
- Przeprowadzić spike adapterów CDR i zapisać decyzję w ADR-009.
- Utworzyć `AI_CDR_COMPATIBILITY_MATRIX.md` po pierwszych wynikach testów.
- Doprecyzować politykę lokalnego vs serwerowego przetwarzania plików przed publiczną betą.
