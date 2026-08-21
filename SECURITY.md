# Vectoria — Security Policy and Secure File Handling

> Status: obowiązująca polityka bezpieczeństwa
>
> Zakres: aplikacja webowa Vectoria, import/export `.ai`, `.cdr`, SVG, PDF, PNG oraz natywny format `.vct`.

---

## 1. Cel

Vectoria otwiera pliki pochodzące od użytkowników, klientów, drukarni i innych programów graficznych. Każdy taki plik jest **nieufnym wejściem**.

Najważniejsze cele bezpieczeństwa:

1. Nie wykonywać kodu osadzonego w importowanym pliku.
2. Nie dopuścić, aby uszkodzony lub celowo złośliwy plik zawiesił UI, zużył całą pamięć albo uszkodził dokument.
3. Nie ujawniać plików użytkowników, jeżeli konwersja wymaga backendu.
4. Nie importować obcych linków, assetów czy fontów bez wiedzy użytkownika.
5. Zachować prywatność pracy lokalnej i jasno komunikować moment, w którym plik opuszcza urządzenie.

## 2. Model zagrożeń

| Zagrożenie | Przykład | Skutek | Obrona |
|---|---|---|---|
| Złośliwy SVG | `<script>`, `onload`, `foreignObject`, external URL | XSS, wyciek danych | sanitizacja, allowlist elementów/atrybutów |
| Parser DoS | plik z milionami nodes lub głębokim zagnieżdżeniem | freeze, memory exhaustion | limity zasobów, worker/sandbox, cancel |
| Zip/PDF bomb | mały plik dekompresuje się do GB | crash, koszt backendu | limity rozpakowania i RAM |
| Złośliwy CDR/AI | exploit parsera lub nieobsługiwany binary | RCE w usłudze, crash | izolowany sandbox, aktualizacje, brak parsera w UI |
| External asset | obraz/font ładowany z obcej domeny | tracking, SSRF, wyciek IP | blokada zewnętrznych zasobów domyślnie |
| Macro/script | VBA lub metadata z kodem | wykonanie kodu | nigdy nie wykonywać, nie importować jako aktywnej treści |
| Formula/path abuse | NaN, Infinity, ekstremalne coordinates | błąd renderu, freeze | walidacja liczb i bounds |
| Supply chain | złośliwa zależność npm | przejęcie aplikacji | lockfile, Dependabot, SCA, minimalne zależności |
| Błąd autoryzacji | publiczny link umożliwia zapis | utrata/wyciek projektu | role, server-side authorization, audit log |

## 3. Zasady bezwzględne

- Nie wykonuj JavaScriptu, makr, VBA, shell commands ani kodu osadzonego w importowanym pliku.
- Nie renderuj nieufnego SVG bez sanitizacji.
- Nie ufaj rozszerzeniu pliku; waliduj magic bytes i strukturę.
- Nie parsuj potencjalnie ciężkiego AI/CDR na głównym wątku UI.
- Nie modyfikuj otwartego dokumentu podczas importu; import jest transakcyjny.
- Nie pobieraj automatycznie obrazów, fontów, CSS ani linkowanych assetów z internetu.
- Nie loguj pełnej zawartości dokumentu użytkownika do konsoli, systemu telemetrycznego ani error trackerów.
- Nie przechowuj danych użytkownika na backendzie dłużej niż wynika to z jawnej polityki retencji.
- Nie dodawaj parsera/konwertera AI/CDR bez przeglądu licencji, aktualności i testów bezpieczeństwa.

## 4. Bezpieczny import formatów

### 4.1. Ogólny pipeline

```text
File selected
  → validate extension + MIME hint + magic bytes
  → enforce byte-size limit
  → inspect in isolated context
  → enforce parse deadline / cancellation
  → parse or convert to ImportIR
  → validate schema, limits and numeric values
  → sanitize assets/fallback SVG/PDF data
  → map to temporary DocumentModel
  → validate document invariants
  → show Compatibility Report
  → explicit user commit
```

Import nie może:

- nadpisać aktywnego dokumentu przed udanym commitem;
- wykonywać kodu z pliku;
- automatycznie łączyć się z URL-em zapisanym w pliku;
- generować niekontrolowanej liczby obiektów;
- blokować możliwości anulowania po przekroczeniu rozsądnego progu czasu.

### 4.2. Limity P0

Wartości są konfiguracją środowiska i muszą być testowane. Początkowe bezpieczne limity:

| Zasób | Limit domyślny | Zachowanie po przekroczeniu |
|---|---:|---|
| Rozmiar upload/importu | 100 MB | Odrzuć przed parsowaniem |
| Liczba obiektów | 100 000 | Ostrzeżenie/odrzuć zależnie od planu |
| Liczba segmentów path | 1 000 000 | Odrzuć lub wymagaj uproszczenia |
| Głębokość zagnieżdżenia | 100 | Odrzuć jako niebezpieczny plik |
| Długość tekstu/metadanych | 5 MB | Odrzuć/pomiń pole |
| Czas lokalnego importu | 30 s bez postępu | Zaproponuj anulowanie |
| Czas serwerowej konwersji | 60 s | Przerwij job i usuń plik tymczasowy |
| Eksport PNG | limit wymiaru/pikseli konfigurowalny | Wyświetl wybór niższej skali |

Nie są to limity wieczne. Po benchmarkach można je zmieniać, ale każda zmiana wymaga testu DoS i aktualizacji dokumentacji.

### 4.3. SVG

SVG jest formatem XML i może zawierać aktywną lub zewnętrzną treść. P0 importuje tylko allowlist wspieranych elementów i atrybutów.

**Allowlist elementów P0:**

```text
svg, g, path, rect, circle, ellipse, line, polyline, polygon,
defs, linearGradient, stop, clipPath, image
```

**Zawsze usuń/odrzuć:**

```text
script, foreignObject, iframe, object, embed, audio, video,
animate, animateMotion, set, use z nieufnym href,
wszystkie on* event handlers,
javascript: URLs,
data: URLs poza kontrolowanym dozwolonym obrazem,
external CSS imports i external entity declarations.
```

Dodatkowe reguły:

- nie używaj `innerHTML` do wstrzykiwania importowanego SVG;
- nie renderuj SVG z `<img>` jako substytutu sanitizacji;
- normalizuj style i odrzucaj nieobsługiwane CSS;
- blokuj URL-e sieciowe w `href`, `xlink:href`, `url(...)` i filtrach;
- weryfikuj geometryczne liczby przed mapowaniem do modelu.

### 4.4. AI

- Wspieraj P0 przede wszystkim dla plików PDF-compatible.
- AI bez warstwy kompatybilnej PDF ma zakończyć się kontrolowanym komunikatem.
- Nie wykonuj skryptów, linków i danych aktywnych zawartych w źródle.
- Parser działa w workerze albo izolowanym procesie.
- Tekst, fonty i efekty bez bezpiecznej reprezentacji są warning/fallback, nie ukrytą próbą wykonania lub pobrania danych.

### 4.5. CDR

- CDR traktuj jako binarny format wysokiego ryzyka parserowego.
- Nie parsuj CDR wewnątrz komponentu UI.
- Jeśli używany jest backend, uruchamiaj konwersję w efemerycznym sandboxie bez dostępu do sieci, filesystemu hosta, sekretów i innych uploadów.
- Ogranicz CPU, RAM, czas wykonania, liczbę procesów i rozmiar outputu.
- Po jobie usuń plik tymczasowy, output tymczasowy i logi zawierające dane pliku zgodnie z polityką retencji.
- Makra/VBA/skrypty są ignorowane i nigdy nie są wykonywane.

### 4.6. PDF

- PDF parser działa poza głównym wątkiem.
- Blokuj JavaScript, launch actions, embedded files i external URIs.
- Ogranicz liczbę stron, obiektów, fontów i obrazów.
- Nie otwieraj PDF w iframe jako zaufanej treści bez izolacji.

## 5. Bezpieczeństwo backendu konwersji

Ten rozdział obowiązuje tylko wtedy, gdy import CDR/AI używa usługi serwerowej.

### 5.1. Architektura

```text
Browser
  → authenticated upload endpoint
  → object storage with private key
  → conversion queue
  → ephemeral sandbox worker (network disabled)
  → ImportIR / normalized assets
  → signed short-lived result URL or direct response
  → deletion policy
```

### 5.2. Wymagania sandboxa

- Brak publicznego dostępu do storage.
- Brak dostępu do metadanych cloud instance.
- Brak sekretów aplikacji w kontenerze konwertera.
- Sieć wyłączona domyślnie.
- Read-only base filesystem.
- Osobny temporary directory dla każdego joba.
- CPU, memory i wall-clock timeout.
- Maksymalna liczba jobów na użytkownika/IP.
- Automatyczne usuwanie plików tymczasowych po jobie.
- Structured logs bez surowej zawartości dokumentu.

### 5.3. Prywatność

Przed uploadem Vectoria musi wyświetlić jasne informacje:

- że dany typ pliku wymaga konwersji w chmurze;
- że plik zostanie wysłany do infrastruktury Vectorii;
- jaki jest cel przetwarzania;
- jak długo plik jest przechowywany;
- czy użytkownik ma opcję lokalnej konwersji lub rezygnacji.

## 6. Autoryzacja i przyszła współpraca

Dopóki aplikacja jest local-first, dokumenty są lokalne. Po wprowadzeniu kont, projektów i współpracy:

- autoryzacja jest sprawdzana po stronie serwera dla każdego odczytu/zapisu;
- UI nie jest źródłem prawdy dla roli użytkownika;
- role: owner, editor, commenter, viewer;
- publiczny link jest read-only domyślnie i ma możliwość wygasania;
- dokumenty mają niezgadywalne identyfikatory;
- zmiany uprawnień są logowane;
- eksport nie może omijać ograniczeń dostępu;
- pliki współdzielone nie są indeksowane publicznie bez świadomej publikacji właściciela.

## 7. Dane, telemetryka i logi

### Dozwolone dane telemetryczne

- wersja aplikacji;
- rodzaj operacji: import AI/CDR, eksport SVG/PNG;
- czas operacji;
- wynik: success/cancel/failure;
- znormalizowany kod błędu;
- liczba obiektów, jeśli nie identyfikuje treści;
- zużycie pamięci lub frame time w agregacji.

### Dane zakazane w telemetryce/logach

- zawartość pathów i tekstu użytkownika;
- nazwy klientów/plików bez zgody;
- obrazy, fonty, całe SVG/PDF/CDR/AI;
- access tokens, cookies, hasła, API keys;
- dokładne dane osobowe zawarte w projekcie.

## 8. Zależności i supply chain

- Używaj lockfile (`pnpm-lock.yaml` lub odpowiednik).
- Włącz automatyczne alerty CVE i regularne aktualizacje zależności.
- Preferuj małe, aktywnie utrzymywane biblioteki z jasną licencją.
- Nowa biblioteka parsera/importera wymaga review: licencja, maintainer activity, CVE history, bundle size, worker compatibility.
- Nie wykonuj `postinstall` z niezweryfikowanych zależności bez kontroli.
- Sekrety trzymamy wyłącznie w secret managerze/zmiennych deploymentu, nigdy w repozytorium ani plikach klienta.

## 9. Bezpieczny development

- Nie wrzucaj prawdziwych plików klientów do test fixtures.
- Używaj anonimizowanych/minimalnych reprodukcji błędów.
- Nie udostępniaj w PR-ach kluczy, linków do prywatnego storage ani danych logowania.
- Przed merge uruchamiaj secret scanning.
- Każdy bug bezpieczeństwa w importerze otrzymuje test regresyjny.
- Zmiana limitu importu albo sanitizera wymaga code review i testu negatywnego.

## 10. Proces zgłaszania podatności

Do czasu uruchomienia publicznego programu disclosure:

1. Udostępnij adres e-mail security@ lub prywatny kanał zgłoszeń.
2. Poproś o opis, minimalny reproducer, wpływ i kroki odtworzenia.
3. Nie proś zgłaszającego o publikowanie exploita.
4. Potwierdź odbiór zgłoszenia w rozsądnym czasie.
5. Nadaj klasę ważności: P0/P1/P2/P3.
6. Napraw problem, dodaj regresję i przygotuj release note bez ujawniania wrażliwych detali przed poprawką.

### Klasyfikacja

| Priorytet | Przykład | Reakcja |
|---|---|---|
| P0 | RCE, XSS, publiczny wyciek dokumentów | natychmiastowy hotfix i ograniczenie funkcji |
| P1 | parser crash/DoS możliwy z uploadu | szybki fix, limity/feature flag jeśli trzeba |
| P2 | obejście limitu lub częściowy wyciek metadata | naprawa w najbliższym release |
| P3 | problem bez realnego wpływu na dane | zaplanowana naprawa |

## 11. Security Definition of Done

Funkcja importu/eksportu jest gotowa tylko, gdy:

- [ ] Waliduje dane wejściowe.
- [ ] Ma limity rozmiaru, czasu i złożoności.
- [ ] Ma kontrolowane błędy użytkownika.
- [ ] Nie blokuje głównego UI.
- [ ] Nie wykonuje kodu ani zewnętrznych linków z pliku.
- [ ] Nie modyfikuje bieżącego dokumentu przed udanym commitem.
- [ ] Ma testy dla danych poprawnych, uszkodzonych i złośliwych.
- [ ] Nie wysyła treści pliku do telemetryki.
- [ ] Ma opis retencji, jeśli używa backendu.
- [ ] Zależności zostały sprawdzone pod kątem licencji i znanych luk.
