# ADR 020: Model rozwiązywania konfliktów i strategia współedycji w czasie rzeczywistym (Etap 3 — specyfikacja bramkowa)

**Data:** 2026-09-04  
**Status:** Proposed (Gate Document dla Etapu 3)  
**Kontekst:** Wymagania specyfikacji EPIC-17 (SAAS-022, SAAS-023) dotyczące projektowania modelu konfliktów zmian i współedycji w czasie rzeczywistym (realtime co-editing).

---

## Kontekst i problem

Współedycja grafiki wektorowej w czasie rzeczywistym stwarza ryzyko:
1. Niszczenia historii lokalnej Undo/Redo przy asynchronicznym wstrzykiwaniu zmian od innych użytkowników.
2. Konfliktów topologicznych przy jednoczesnej edycji tych samych krzywych Beziera lub węzłów ścieżek.
3. Degradacji pętli renderowania 60 FPS przez częste przeliczanie transformacji kursora (presence).

Specyfikacja nadrzędna Vectoria (`AGENTS.md`, `VECTORIA_ARCHITECTURE.md`, `EPIC-17_Wspolpraca_i_SaaS.md`) jednoznacznie ustala:
- **Realtime jest ostatnim etapem po pełnym ustabilizowaniu edytora jednoosobowego.**
- **Zadanie SAAS-022 obejmuje projekt modelu konfliktów, a SAAS-023 realizację po ustabilizowaniu.**

---

## Proponowany model architektury konfliktów (SAAS-022)

1. **Warstwa asynchronicznej synchronizacji migawek (Snapshot CAS)**:
   - Każdy zapis lokalny lub chmurowy niesie numer rewizji `revision: number`.
   - Wykrycie konfliktu: serwer odrzuca żądanie zapisu, jeśli podana `baseRevision` jest niższa od aktualnej rewizji na serwerze.
   - Reakcja klienta na konflikt snapshotów:
     - Nigdy nie następuje ciche nadpisanie danych ani utrata pracy użytkownika.
     - Tworzona jest automatycznie gałąź ratunkowa dokumentu (kopia robocza `Nazwa projektu (kopia konfliktowa)`).
     - Użytkownik otrzymuje modalny dialog z opcjami:
       a) „Załaduj wersję z chmury i przenieś moje zmiany do kopii roboczej”,
       b) „Zastąp wersję w chmurze moim stanem bieżącym (wymuszenie nowej rewizji)”.

2. **Poziom współedycji w czasie rzeczywistym (Realtime CRDT w Etapie 3)**:
   - Wdrożenie algorytmu CRDT (np. Yjs / Loro) operującego na poziomie komend edycyjnych i drzewa obiektów sceny, a nie surowych pikseli canvasu.
   - Posiadanie obiektów: w trakcie przeciągania lub edycji ścieżki przez użytkownika A, obiekt otrzymuje miękką blokadę (transient lock), uniemożliwiającą równoczesne zniekształcanie przez użytkownika B.
   - Kursory i obecność (Presence): pozycje kursorów innych użytkowników są przesyłane w osobnym kanale efemerycznym (WebRTC / WebSocket Presence), nie trafiają do historii Undo/Redo i są rysowane w dedykowanej warstwie overlay bez ponownego renderowania całej sceny graficznej.

---

## Konsekwencje

- Etap 1 i 2 skupiają się na niezawodnym modelu snapshotów z detekcją konfliktów rewizji i tworzeniem kopii ratunkowej.
- Silnik komend zachowuje pełną deterministyczność bez narzutu bibliotek CRDT na obecnym etapie rozwoju.
