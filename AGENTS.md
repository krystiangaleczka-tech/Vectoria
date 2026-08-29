# AGENTS.md — Vectoria

> Wersja: 2.0.0 — 2026-08-25
> Nadrzędna instrukcja dla agentów AI pracujących w Vectoria.

---

## 0. Cel i priorytety

**Najpierw sprawdź rzeczywistość repozytorium, potem pisz kod.** Nie zgaduj struktury, wersji paczek, API, browser API ani formatów plików.

Vectoria to pełny, długoterminowo rozwijany webowy/PWA edytor grafiki wektorowej. Zakres projektu wynika z epiców, backlogu i roadmapy; nie ograniczaj implementacji do historycznego etapu fundamentu.

Nie rozszerzaj bieżącego zakresu bez jawnego taska. Funkcje z backlogu mają być wdrażane według pełnych specyfikacji epiców, z etapowaniem zapisanym w dokumentacji, jeśli jest konieczne.

### Obowiązkowe dokumenty referencyjne

Poniższe dokumenty są **obowiązkowymi źródłami prawdy**. Każdy agent MUSI je respektować:

| Dokument | Obowiązek | Co reguluje |
|---|---|---|
| `VECTORIA_ARCHITECTURE.md` | **Bezwzględny** — każda zmiana kodu musi być zgodna z architekturą | Warstwy, granice pakietów, reguły importu, invariants, kamera, renderer, commands |
| `DESIGN_SYSTEM.md` | **Bezwzględny** — każdy element UI musi używać zdefiniowanych tokenów | Kolory, typografia, spacing, promienie, cienie, komponenty, layout, dark/light |
| `BACKLOG.md` | **Referencyjny** — zakres funkcji i priorytetyzacja tasków | Epiki, taski, priorytety P0/P1/P2, definicje scope |
| `TESTING_STRATEGY.md` | **Referencyjny** — standardy testowania | Rodzaje testów, budżety, fixtures, baselines |
| `ROADMAP.md` | **Referencyjny** — kolejność wdrożeń | Etapy, milestones, zależności między epicami |

**Nie wolno** pisać kodu UI bez sprawdzenia tokenów w `DESIGN_SYSTEM.md`.
**Nie wolno** zmieniać granic pakietów bez sprawdzenia `VECTORIA_ARCHITECTURE.md`.
**Nie wolno** implementować funkcji spoza `BACKLOG.md` bez jawnej zgody użytkownika.

Przy konflikcie stosuj kolejność:

1. bezpieczeństwo, integralność dokumentu i brak utraty pracy użytkownika;
2. aktualny kod i testy;
3. ADR/dokumentacja architektury;
4. ten plik;
5. opis bieżącego taska.

Jeżeli konflikt zmienia decyzję produktową lub architektoniczną, zatrzymaj się i zgłoś go. Nie rozstrzygaj po cichu.

---

## 1. Start sesji

Przed pracą:

1. Otwórz `README.md`, root `package.json`, lockfile, `pnpm-workspace.yaml`, `tsconfig.base.json` oraz rzeczywistą strukturę repo.
2. Przeczytaj dokumenty powiązane z taskiem: `VECTORIA_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `TESTING_STRATEGY.md`, `SECURITY.md`, `ROADMAP.md`, `BACKLOG.md`, `RELEASE_CHECKLIST.md` i właściwe ADR.
3. Sprawdź kod, testy i fixtures wokół taska; szukaj symboli, nie tylko nazw plików.
4. Przeczytaj aktywny task/issue i najnowszy dump/progress log, jeśli istnieją.
5. Zapisz dla siebie maksymalnie pięć faktów: stan zadania, wzorzec kodu, granice pakietów, testy i ryzyka.
6. Nie edytuj plików bez wyraźnego polecenia albo zaakceptowanego planu.

Przed użyciem zewnętrznej paczki lub Web API:

- odczytaj faktyczną wersję z manifestu/lockfile;
- sprawdź dokumentację tej wersji lub istniejące użycie;
- zweryfikuj typy, pusty input, `null`/`undefined`, anulowanie, wyjątki, limity pamięci i wsparcie przeglądarek;
- nie dodawaj dependency „na zapas”.

---

## 1b. Pułapki implementacyjne — reguły z historii błędów

### Browser API vs środowisko testowe (Node.js)

Kod w `packages/io/` i `packages/core/` jest uruchamiany zarówno w przeglądarce (prod) jak i w Node.js (testy Vitest bez jsdom). Obowiązują następujące zasady:

- **`FileReader` nie istnieje w Node.js.** Zawsze najpierw sprawdzaj `typeof FileReader !== 'undefined'`. Lepszym primary path jest `file.text()` / `file.arrayBuffer()` — dostępne natywnie w Node od v20 i w przeglądarkach.
- **`Buffer` (Node.js global) nie istnieje w przeglądarce.** Nie używaj `Buffer.from(...).toString('base64')` w kodzie przeglądarkowym. Zamiennik: pętla po `Uint8Array` + `btoa()`, dostępna wszędzie.
- **`Image`, `DOMParser`, `HTMLElement` nie istnieją w Node.js bez jsdom.** Jeśli test wymaga tych API, dodaj na górze pliku testowego `// @vitest-environment jsdom`. Sprawdź, czy środowisko jest dostępne w `packages/*/package.json` (zależność `jsdom`).
- **Timeouty w testach:** Dekodowanie obrazów (`img.onload`) w jsdom często nie wywołuje `onload` dla fałszywych danych. Zawsze dodaj fallback timeout lub obsłuż `onerror` z `resolve({ width: 400, height: 300 })` zamiast `reject`.

### Regex na atrybuty HTML/SVG — kompletność

Regex przechwytujące atrybuty HTML/SVG **muszą obsługiwać wszystkie trzy formy wartości**:

```
atrybut="wartość"   → "[^"]*"
atrybut='wartość'   → '[^']*'
atrybut=wartość     → [^\s>]*    ← najczęściej pomijany błąd
```

Wzorzec zbiorczy: `(?:"[^"]*"|'[^']*'|[^\s>]*)`. Nie używaj `["'][^"']*["']` — to nie złapie cudzysłowów mieszanych ani wartości bez cudzysłowów.

### Strategia wyszukiwania — `mgrep` vs `ripgrep`

Niepotrzebne otwieranie całych plików i wielokrotne pudłujące grepa to główny powód przepalania tokenów. Stosuj prostą regułę:

| Sytuacja | Narzędzie | Dlaczego |
|---|---|---|
| Znam konkretną **nazwę funkcji, zmiennej, pliku lub symbolu** | **`ripgrep` (`rg` / `grep_search`)** | Zwraca 2–5 linii z dokładnym dopasowaniem. Koszt: ~30–50 tokenów. |
| **Nie znam nazwy**, ale wiem co szukam koncepcyjnie (np. „gdzie przetwarzamy import SVG?", „co odpowiada za walidację pliku?") | **`mgrep`** (semantyczny AI) | Zwraca fragmenty kodu zbliżone znaczeniowo, bez potrzeby skanowania całego repo. Oszczędza tysiące tokenów kontekstu. |

**Priorytet decyzji:**
1. Jeśli znasz dokładną nazwę — użyj `ripgrep`. Nie używaj `mgrep` dla nazw które są oczywiste.
2. Jeśli nie wiesz, czego szukać — uruchom `mgrep "<pytanie w języku naturalnym>"` **zanim** zaczniesz otwierać pliki.
3. Nigdy nie otwieraj całego pliku na ślepo (bez grep/mgrep), żeby znaleźć właściwe miejsce.

---
## 2. Triggery operacyjne

Trigger działa **wyłącznie**, kiedy cała wiadomość użytkownika to dokładnie jedno słowo: `dump`, `p`, `f`, `t` lub `builduj` — bez spacji, interpunkcji i dodatkowego tekstu. `p dzięki` oraz `zrób dump` są zwykłymi wiadomościami.

| Trigger | Działanie |
|---|---|
| `dump` | Wykonaj wyłącznie workflow DUMP-ONLY i zatrzymaj się |
| `p` | Wykonaj workflow PODSUMOWANIE: walidacja, dump, progress log, task/issue, commit i push |
| `f` | Uruchom dev server web/PWA prawdziwym skryptem z `package.json`, zwykle `pnpm dev`; podaj stan i krótką checklistę manualną |
| `t` | Wykonaj typecheck, adekwatne testy, build i preview/inspection, jeśli repo go wspiera; to nie jest release |
| `builduj` | Wykonaj workflow build/release: wersjonowanie, lint, typecheck, testy, PWA build i `RELEASE_CHECKLIST.md`; nie deployuj bez osobnej zgody |
| `/dump`, `/p`, `/f`, `/t`, `/builduj` | Slash-commandowy odpowiednik; jeżeli istnieje `.agents/skills/<nazwa>/SKILL.md`, wczytaj go najpierw |
| `wizualizacja` / `mockup` | Tryb eksploracji wizualnej: HTML/makieta/opis UI, ale bez produkcyjnego kodu bez osobnego polecenia |

### DUMP-ONLY

Po triggerze `dump`:

1. Wygeneruj **dokładnie jeden** plik dumpa.
2. Dump zawiera: metadane, aktywny task/issue, stan przed/po, implementację, walidację, ograniczenia i następny bezpieczny krok.
3. Dump musi zawierać sekcję `Changes Per File` albo `Zmiany per plik`. Dla każdego zmienionego pliku wpisz osobny rekord: dokładna ścieżka, stan przed, konkretna zmiana po, cel/uzasadnienie. Sama lista ścieżek nie spełnia wymagania.
4. Nazwa dumpa = nazwa bazowa aktywnego taska/issue. Jeżeli projekt nie ma formalnych task files, użyj `YYYY-MM-DD_HHmm_vectoria_<slug-tasku>.md`.
5. Użyj istniejącego `dump/`; jeśli go nie ma, użyj `docs/dumps/`. Nie twórz dwóch lokalizacji.
6. Sprawdź, czy sekcja `Changes Per File` obejmuje wszystkie zmienione pliki; pre-existing changes oznacz jawnie jako zastane przed sesją.
7. Nie twórz progress logu, nie aktualizuj taska/issue, nie commituj, nie pushuj, nie zmieniaj innych plików. Stop.

### Workflow `p` — PODSUMOWANIE

Wykonuj krok po kroku:

1. Otwórz aktywny task/issue; sprawdź status, datę i Definition of Done.
2. Uruchom właściwe quality gates z prawdziwego `package.json`: lint, typecheck, unit/integration; Playwright, visual regression, benchmark i build tylko jeśli dotyczą zmiany.
3. Regresję napraw w tym samym passie albo przerwij i zgłoś blokadę.
4. Wygeneruj jeden dump.
5. Dodaj jeden progress log w `progress_log/` albo `docs/progress/`: `meta`, `summary`, `problem`, `implementation`, `validation`, `filesChanged`, `outcome`, `knownLimitations`.
6. Zaktualizuj aktywny task/issue.
7. Sprawdź diff oraz brak sekretów, artefaktów builda i zmian poza zakresem.
8. Dodaj wyłącznie pliki taska, dump/log i zaakceptowane pliki implementacji.
9. Commit: `<task-or-issue>: <opis maks. 72 znaki>`; bez identyfikatora: `vectoria: <opis>`.
10. Push na aktualną gałąź. Nie deklaruj sukcesu, jeśli push się nie udał.

Nie uruchamiaj `p` samoczynnie po ukończeniu taska — tylko po triggerze użytkownika.

---

## 3. Granice architektury

### Stack i granice architektury

- React + TypeScript + Vite + PWA.
- React UI, CSS Modules/Tailwind i Radix/shadcn tam, gdzie zwiększa to dostępność.
- Canvas 2D za adapterem renderera.
- UI store z selektywnymi subskrypcjami: Zustand albo `useSyncExternalStore`.
- Niezależny `DocumentStore` i dispatcher commandów.
- IO: SVG, PNG, natywny `.vct`, IndexedDB przez adapter.
- Walidacja granic wejścia przez Zod.
- Vitest + Playwright.

| Warstwa | Odpowiada za | Nie może robić |
|---|---|---|
| `apps/web` / UI | layout, dialogs, panele, formularze, ARIA, skróty | geometrię, bezpośrednią mutację dokumentu, render loop |
| `packages/editor-engine` | tool state machines, camera, pointer/keyboard, selection, snap, history | zależeć od Reacta |
| `packages/core` | document domain, geometria, style, invariants, commands | importować UI, renderer, IO lub engine |
| `packages/renderer` | canvas, culling, transformacje, scene/overlay, rAF | mutować `DocumentModel` |
| `packages/io` | import/export, sanitizer, serializacja, IndexedDB | importować React lub renderer |
| `packages/shared` | IDs, Result, units, logger, eventy | zawierać logikę produktu konkretnej warstwy |

Reguły importu:

- `apps/web` może importować pakiety.
- `editor-engine` importuje wyłącznie `core` i `shared`.
- `renderer` importuje wyłącznie `core`, read-only kontrakty engine i `shared`.
- `io` importuje wyłącznie `core` i `shared`.
- React nigdy nie mutuje `DocumentModel` bezpośrednio.
- Każda trwała modyfikacja dokumentu przechodzi przez engine i `Command`.

Nie zmieniaj renderera, globalnego store ani granic pakietów bez ADR i planu migracji.

---

## 4. Domena, kamera i renderer

### Dokument nie jest canvasem

- Canvas ma rozmiar viewportu CSS × `devicePixelRatio`, nie rozmiar artboardu.
- Artboard i obiekty istnieją w logicznych współrzędnych świata.
- Resize artboardu modyfikuje `Artboard.frame` przez komendę, nigdy nie alokuje gigantycznego canvasa.
- Eksport PNG używa osobnego, ograniczonego temp canvasa, nie viewport canvasa.

Przykład: resize artboardu `13 × 29 cm → 1350 × 4500 cm` ma zmienić metadane i obrys w viewportcie, bez freeze UI i bez bitmapy rozmiaru dokumentu.

### Invariants dokumentu

- Wszystkie ID są unikalne.
- Referencja warstwy wskazuje istniejący obiekt; obiekt nie występuje w dwóch miejscach drzewa warstw.
- Artboard ma dodatnie width/height.
- Zakazane są `NaN`, `Infinity` i zero scale.
- `opacity` jest w zakresie `[0, 1]`.
- Otwarty path ma minimum dwa nodes; zamknięty minimum trzy.
- Importer i każda komenda zwracają poprawny dokument albo kontrolowany błąd; nie zostawiają częściowej mutacji.

### Commands i Undo/Redo

Każda modyfikacja dokumentu jest komendą z deterministycznym `execute` i `undo`. Command nie mutuje inputu.

- `pointermove` zapisuje tylko preview/tymczasowy interaction state.
- `pointerup` tworzy jedną komendę dla całego dragu.
- Undo jednego dragu cofa cały drag.
- Import jest atomowy i tworzy jeden wpis Undo/Redo.
- Escape, cancel, błąd importu albo zapis IndexedDB nie mogą zniszczyć dokumentu w pamięci.

### Kamera i input

- Utrzymuj `world → object transform → camera → screen` oraz inverse `screen → world`.
- Zoom kółkiem jest względem kursora.
- Tool dostaje `screenPoint` oraz `worldPoint`.
- Hit-test i handles używają tolerancji w ekranowych px; w world space zależą od zoomu.
- Narzędzia są state machines, nigdy logiką w komponencie React.
- Podstawowe narzędzia: Select (`V`), Rectangle (`R`), Ellipse (`L`), Line, Pen (`P`), Pan (`Space`/middle mouse); kolejne narzędzia wynikają z backlogu.
- Pen: click = corner, drag = smooth handle, klik first node = close, Enter = commit, Escape = cancel.

### Render loop

- Canvas layers: background, scene, overlay.
- Overlay nie powoduje redraw całej scene.
- Event aktualizuje lekki stan i wywołuje `invalidate()`.
- Render loop gwarantuje maksymalnie jeden render na `requestAnimationFrame`.
- Pan/zoom/drag: `interactive`; po bezczynności: `final`.
- Używaj viewport culling od początku.
- R-tree, worker pool, OffscreenCanvas, cache i WebGL wyłącznie po benchmarku pokazującym przekroczenie budżetu.

---

## 5. UI, stan i accessibility

React obsługuje UI, nie gorącą pętlę sceny. Nie rerenderuj całego `EditorPage` na każdym pointer move, panie, zoomie lub drag delta.

| Stan | Właściciel |
|---|---|
| Document, revision, dirty | `DocumentStore` |
| Tool, camera, selection, grid, snap | `EditorStore` |
| Cursor, lasso, pen draft, drag preview | lokalny `InteractionState` poza panelem React |
| Theme, menu, dialog, workspace layout | UI store / React |

- Property panel jest kontekstowy: brak selection → document/artboard; shape → geometry/style; aktywny tool → defaults.
- Workspace layout/presety/persistence nie mogą zmienić `DocumentModel`, selection ani wymiarów canvasa.
- Layout JSON jest walidowanymi danymi — nie HTML-em, funkcją ani referencją komponentu. Uszkodzony layout resetuje się bez crasha.
- Używaj `DESIGN_SYSTEM.md`; nie hardcoduj reużywalnych tokenów koloru, spacingu, typografii, shadow, radius lub z-index.
- Każdy toolbar button ma accessible name, tooltip i shortcut, jeśli istnieje.
- Focus order, widoczny focus ring i keyboard navigation są obowiązkowe.
- Canvas ma opisową etykietę ARIA oraz odpowiednik pointer action w panelu Properties.
- Sprawdzaj dark/light oraz stany empty, selected, locked, disabled, loading, error i mały viewport.

---

## 6. Import, export i security

### Każdy input jest nieufny

SVG, plik, metadata, workspace JSON i IndexedDB payload są danymi nieufnymi.

1. Ogranicz rozmiar pliku, liczbę elementów, path complexity, nesting i memory use.
2. Waliduj schema na granicy wejścia.
3. Sanitizuj/odrzucaj scripts, event handlers, `foreignObject`, niebezpieczne URL-e, zewnętrzne zasoby i nieobsługiwane konstrukcje.
4. Nigdy nie wstrzykuj surowego SVG przez `innerHTML` lub `dangerouslySetInnerHTML`.
5. Importuj najpierw do walidowanego `ImportIR`, potem mapuj do `DocumentModel`.
6. Nieobsługiwany wynik raportuj jako `simplified`, `flattened` albo `unsupported`.
7. Błąd/cancel importu pozostawia aktywny dokument bez zmian.

### SVG, PNG i `.vct`

- SVG: `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `g`, fill/stroke/transform oraz rozszerzenia z backlogu.
- Wybierz jedną strategię transformacji: przechowuj ją w modelu albo materializuj geometrię; nie mieszaj ad hoc.
- Eksporter tworzy poprawny `viewBox` z artboardu i wspiera dozwolone obiekty/basic linear gradient.
- `editable` export nie może agresywnie niszczyć struktury; `optimized` jest osobną opcją.
- PNG export jest async i ma limity wymiaru/pamięci.
- `.vct` ma `schemaVersion`, migracje i backward-compatible reader. Nowe pole persistence wymaga fallbacku, migracji i round-trip testu.
- Autosave: command → revision/dirty → debounce 500–1000 ms → IndexedDB adapter → saved/error. Nie blokuje inputu.

### Prywatność i backend przyszłości

- Nie commituj tokenów, kluczy, cookies, lokalnych baz, danych klientów ani prawdziwych plików bez zgody i anonimizacji.
- Sekrety tylko przez environment/CI secrets; przykłady bez sekretów w `.env.example`.
- Nie loguj pełnej treści dokumentów lub importów użytkownika.
- Limity zasobów chronią przed SVG/path bomb i memory exhaustion.
- Przyszły backend/cloud egzekwuje dostęp na serwerze. UI gate nie jest security gate.
- Dla każdej przyszłej RPC/RLS: `Actor → backend authority → negative test`; nie ufaj `userId` od klienta.

---

## 7. Proces taska

### 1. Zrozumienie

Ustal workflow użytkownika, granicę zaakceptowanego zakresu zadania, dotknięte warstwy, invariants, error/cancel/recovery, istniejące testy i potrzebę aktualnej dokumentacji API. Dla UI uwzględnij empty document, selection, drag, ekstremalny zoom, loading/error i mały viewport.

### 2. Mapa wpływu

Przed zmianą symbolu, typu, sygnatury, serializacji, commandu, modelu lub publicznego API wyszukaj wszystkie użycia w apps, packages, tests i fixtures. Jeżeli wspólny kontrakt ma ponad pięć użyć, zgłoś skalę przed edycją.

### 3. Plan

Dla zmian większych niż lokalna, oczywista korekta pokaż jeden kompletny plan. Plan nie jest listą plików — to udokumentowane decyzje. Każdy punkt poniżej jest **obowiązkowy**; brak któregokolwiek blokuje przejście do implementacji.

#### 3.1 Wymagane elementy planu

- **Rezultat użytkownika i granica scope**: co użytkownik będzie mógł zrobić; które taski backlogu (ID) wchodzą, a które jawnie nie.
- **Status audytu vs kod**: dla każdego dotkniętego taska podaj status DONE/PARTIAL/MISSING z dowodem `file:line` z rzeczywistego kodu, a nie z `BACKLOG.md`. Nie powtarzaj statusu z backlogu bez weryfikacji.
- **Pliki per warstwa**: dla każdego pliku — MODIFY/NEW + konkretna zmiana + cel. Sama lista ścieżek nie wystarcza.
- **Zmiany kontraktu domenowego**: nowe/edytowane typy `SceneObject`, `Command`, style, schema. Jeśli dodajesz typ obiektu, komendę lub zmieniasz `DocumentModel` — **ADR jest wymagane przed implementacją** (§10). Zapisz jawne ID ADR.
- **Commands/Undo-Redo**: każda mutacja dokumentu ma komendę z `execute`/`undo`; wskaż komendę i czy jest nowa czy istniejąca.
- **Invariants — jawna lista**: wymień konkretnych invariantów (np. `sides ∈ [3,64]`, `0 <= inner < outer`, skończone kąty, `turns ∈ (0,20]`), nie ogólnikowe "dodaj reguły".
- **Error/cancel/recovery**: Escape, pointercancel, błąd importu, pusty wynik — nie zostawiają częściowej mutacji.
- **Zależności międzyepiczne i międzywarstwowe**: jeśli task polega na innej warstwie/epicu (np. eksport `fill-rule` zależy od EPIC-08, mask rendering zależy od EPIC-08), zaznacz to jawnie. Nie implementuj w założeniu, że zależność już działa — zweryfikuj `file:line`.
- **Ryzyko regresji istniejących tasków DONE**: jeśli refaktorujesz istniejący kod (np. przenosisz logikę inline do engine), wskaż które DONE taski dotyka i jak zachowasz ich zachowanie + testy regresji.
- **Decyzje do rozstrzygnięcia PRZED implementacją**: każda niejasność (np. "osobny typ czy podtyp polygonu?", "pole persistowane czy wyliczane?") musi mieć rozstrzygnięcie w planie. Zabronione jest pisać "nie ma niejasności", jeśli plan wprowadza nowy kontrakt.
- **Pełna macierz testów**: unit (geometria/invariants/commands), Playwright E2E (workflow create→edit→cancel→export→undo), visual regression (Dark/Light, DPR 1/2, wymiary z §8), performance (jeśli hot path). Wymień scenariusze, nie tylko kategorie.
- **Quality gates — dokładne skrypty**: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm exec playwright test`, `pnpm build` (jeśli dotyka build). Nie zgaduj nazw — sprawdź `package.json`.
- **Comment rules**: plan dotyka publicznych metod/getterów >3 linie → JSDoc (CO/DLACZEGO, nie JAK).
- **Wszystkie pytania w jednej rundzie**.

#### 3.2 Checklist akceptacji planu

Plan jest kompletny (gotowy do implementacji) dopiero gdy każdy punkt odhaczony `[x]`:

- [ ] Scope + ID tasków backlogu (wchodzi/nie wchodzi).
- [ ] Status DONE/PARTIAL/MISSING per task z `file:line`.
- [ ] Pliki per warstwa z MODIFY/NEW + konkretna zmiana.
- [ ] ADR dla zmiany kontraktu domenowego (ID zapisane).
- [ ] Komendy z `execute`/`undo` wskazane.
- [ ] Invariants wylistowane jawnie.
- [ ] Error/cancel/recovery opisane.
- [ ] Zależności międzyepiczne/ międzywarstwowe zaznaczone i zweryfikowane.
- [ ] Ryzyko regresji istniejących DONE + testy regresji.
- [ ] Decyzje rozstrzygnięte (brak otwartych niejasności).
- [ ] Pełna macierz testów (unit + E2E + visual + perf).
- [ ] Quality gates — dokładne skrypty z `package.json`.
- [ ] Comment rules uwzględnione.

Jeśli choć jeden punkt jest `[ ]` bez uzasadnienia — plan **nie jest gotowy**. Nie mów "plan gotowy do implementacji".

Po akceptacji planu nie reanalizuj i nie rozszerzaj zakresu bez zgody.

### 4. Implementacja

- Małe, spójne zmiany; nie łącz feature, refactor i masowego formatowania.
- Jawne typy na granicach; nie ukrywaj błędów przez `any`, non-null assertion lub niekontrolowany cast.
- Oczekiwane błędy IO/importu to `Result` lub domain error, nie ciche `null`.
- Nie dodawaj debug logów do hot path.
- Bug poza scope zgłoś; nie naprawiaj go „przy okazji".
- **Nie dodawaj kodu, komentarzy, refaktorów ani wyjaśnień, o które nikt nie prosił.**

#### Reguły komentarzy (JSDoc)

- Dodawaj komentarz `/** ... */` (JSDoc) nad każdą **publiczną** metodą lub getterem dłuższym niż 3 linie.
- Komentarz opisuje **co element robi** i **dlaczego istnieje** — nie szczegóły implementacji.
- Nie dodawaj komentarzy krok-po-kroku wyjaśniających jak działa algorytm wewnątrz ciała funkcji.
- Nie dodawaj komentarzy do prywatnych helperów krótszych niż 3 linie — są oczywiste z kodu.

### 5. Weryfikacja

Uruchom prawdziwe skrypty z `package.json` — zwykle odpowiedni podzbiór:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright test
```

Nie zgaduj nazw skryptów i nie twierdź, że test/benchmark/manual check przeszedł, jeżeli go nie uruchomiono.

Finalny raport: pliki, rezultat, wykonane komendy i wynik, dodane testy, znane ograniczenia oraz ryzyko/krok manualny.

---

## 8. Testy i quality gates

| Typ zmiany | Minimalne dowody |
|---|---|
| Geometria, matrix, bounds, hit-test, snap | unit, edge cases, `NaN`/`Infinity`, extreme zoom, determinism |
| Command | `execute → expected`, `undo → exact previous`, `execute → undo → execute`, immutability |
| Tool/camera/input | state machine, world/screen, Escape/cancel, shortcut, Undo/Redo |
| Renderer/overlay | integration Document→Engine→Renderer; visual regression przy zmianie wyglądu |
| UI/workspace | accessibility i Playwright workflow; corrupted layout reset, jeśli dotyczy |
| Import/export | sanitizer/validator, fixture pozytywny/negatywny, atomic failure, report, round-trip gdy możliwy |
| IndexedDB/`.vct` | serialization, migration, restore i error test |
| Hot path | benchmark dotkniętego scenariusza i porównanie z budget |

Utrzymuj E2E dla: create→draw→move→undo/redo→autosave/restore→export; import happy/failure bez zmiany active document; workspace persistence/reset; huge artboard resize bez giant canvas/freeze; crash recovery.

Budżety produktu:

- pan/zoom 100 prostych obiektów: 60 FPS na urządzeniu referencyjnym;
- drag pojedynczego obiektu: p95 frame time ≤ 16.67 ms;
- input → visual response: < 50 ms;
- huge logical artboard resize: bez freeze UI;
- autosave/panel resize: bez zauważalnego laga.

Każdy PR: typecheck, lint, unit/integration, secret scan, dependency audit i brak niezatwierdzonych snapshotów. Zmiana `core`, renderer, importer lub workspace wymaga także odpowiednio visual/performance/Undo-Redo/recovery testu oraz ADR przy zmianie granic architektury.

---

## 9. Zakazy blokujące merge

Nie wolno:

- mutować `DocumentModel` z Reacta;
- renderować scene bezpośrednio na każdy browser event;
- ustawiać canvasu na fizyczny rozmiar artboardu;
- dopuścić `NaN`, `Infinity`, zero scale lub zerowego artboardu;
- tworzyć setek history commands podczas jednego dragu;
- eksportować PNG z viewport canvas;
- wstrzykiwać nieoczyszczone SVG do DOM;
- nadpisywać active document częściowym/błędnym importem;
- wyłączać testów, rozluźniać visual tolerance albo podnosić performance budget tylko po to, aby CI było zielone;
- mieszać `core` z React/Canvas/IO;
- zmieniać renderer/store bez ADR i planu migracji;
- udawać testy, benchmark lub manualną weryfikację;
- commitować sekrety lub prywatne pliki użytkowników;
- wykonywać `p`, merge, deploy albo push bez konkretnej komendy użytkownika.

---

## 10. Checklist przed finalem

- [ ] Zakres odpowiada pełnej specyfikacji epicu albo zaakceptowanemu ograniczeniu taska.
- [ ] Kod, dokumentacja i API versions zostały sprawdzone.
- [ ] Granice pakietów są zachowane.
- [ ] Mutacja dokumentu jest commandem z Undo/Redo.
- [ ] Invariants oraz error/cancel/recovery są zachowane.
- [ ] Canvas jest viewportem; input używa rAF.
- [ ] UI używa design tokens i jest dostępne.
- [ ] Import/persistence walidują input i chronią active document.
- [ ] Dodano adekwatne testy, fixtures, baselines lub benchmark.
- [ ] Uruchomiono oraz zaraportowano rzeczywiste quality gates.
- [ ] Zaktualizowano ADR/dokumentację, gdy zmieniono architekturę.

---

## 11. GEMINI FLASH CONSTRAINTS (Twarde reguły dla modeli generujących)

> **UWAGA**: Ta sekcja ma **absolutny priorytet** nad domyślnym zachowaniem modelu.
> Dotyczy **każdego** modelu AI pracującego w tym repozytorium, ze szczególnym naciskiem na
> modele z rodziny Gemini Flash, które mają udokumentowaną tendencję do: halucynowania uproszczeń,
> cichego ucinania kodu, ignorowania środkowych sekcji długiego kontekstu ("lost in the middle"),
> nadmiernej "kreatywnej optymalizacji" i rozjazdu z planem taska.
>
> Każde naruszenie reguły z tej sekcji oznacza **błąd krytyczny** w pracy agenta.

#### Dotyczy WSZYSTKICH modeli — nie tylko Gemini Flash

Te reguły obowiązują bezwzględnie niezależnie od modelu:

| Model | Główne ryzyko | Dodatkowe obostrzenie |
|---|---|---|
| **Gemini Flash** (3.5, 3.7, 4.0 Flash) | Ucinanie kodu, halucynacja importów, kreatywna optymalizacja | Wszystkie reguły N-01–N-10 bez wyjątku |
| **DeepSeek** (R1, V3, Flash) | Trzyma się planu, ale generuje kod wymagający debugowania; brak wyczucia estetyki i API projektu | MUSI używać tokenów z `DESIGN_SYSTEM.md`, składać UI z komponentów `packages/ui`, sprawdzać sygnatury z kodu |
| **GPT** (o3, o4-mini, Sol/Luna) | Pisze czysty kod, ale pomija 10-30% podpunktów z taska (context drift) | MUSI używać checklisty z Kroku 3; po kodzie MUSI wrócić do promptu i porównać punkt po punkcie (AD-02) |
| **Claude** (Sonnet, Opus, Haiku) | Dobra jakość, ale ryzyko kreatywnej optymalizacji i rozszerzania scope | N-03 (NO SCOPE CREEP) i N-07 (NO CREATIVE OPTIMIZATION) są priorytetem |
| **Każdy inny model** | Nieznane | Domyślnie traktowany jak Flash: wszystkie reguły obowiązują bez wyjątku |

**Słabszy model = surowsze ramy.** Jeśli model nie potrafi sam ocenić estetyki UI, MUSI:
1. Używać **wyłącznie** tokenów z `DESIGN_SYSTEM.md` — żadnych hardcodowanych kolorów, fontów, spacingów.
2. Składać UI z **istniejących komponentów** z `packages/ui` — nie wymyślać nowych stylów.
3. Sprawdzać **sygnatury API** z istniejącego kodu, a nie z pamięci.
4. Implementować **BACKLOG.md** według priorytetów — nie wymyślać własnych funkcji.

---

### 11.1 Rola i Tryb Pracy

- Jesteś **precyzyjnym wykonawcą kodu** (Code Generator), nie kreatywnym asystentem.
- **Zakaz lania wody.** Żadnych wstępów ("Oczywiście, chętnie pomogę..."), podsumowań ("Podsumowując..."), motywacyjnych komentarzy ani pustych fraz.
- Wykonujesz **wyłącznie zdefiniowany task** — nie optymalizujesz, nie refaktorujesz i nie "ulepszasz" kodu poza zakresem.
- Jeśli task ma 5 podpunktów, implementujesz **wszystkie 5**, nie 3 "najważniejsze".
- Nie podejmuj decyzji architektonicznych samodzielnie. Jeśli widzisz problem — zgłoś go, nie naprawiaj po cichu.

---

### 11.2 Żelazne Zakazy (Negative Rules)

Poniższe zakazy są **bezwzględne**. Nie istnieje sytuacja, w której mogą zostać złamane.

| # | Zakaz | Przykład naruszenia |
|---|---|---|
| N-01 | **NO SILENT TRUNCATION** — Bezwzględny zakaz wstawiania `// ...rest of code`, `// TODO`, `// implement later`, `/* existing code */` lub jakiejkolwiek formy cichego ucięcia istniejącego kodu. | Model zwraca plik z `// ... rest of component` zamiast pełnej implementacji. |
| N-02 | **NO MOCKING / NO GUESSING** — Jeśli brakuje typu, importu, funkcji lub interfejsu, **nie twórz atrapy** — zgłoś brak i zapytaj. | Model wymyśla `interface FakeStyle { color: string }` zamiast użyć istniejącego `ObjectStyle` z `@vectoria/core`. |
| N-03 | **NO SCOPE CREEP** — Nie zmieniaj architektury, bibliotek, struktury plików ani kodu poza zakresem taska. | Task dotyczy panelu Properties, a model "przy okazji" refaktoruje renderer. |
| N-04 | **NO PLACEHOLDER IMPLEMENTATION** — Każda funkcja musi mieć pełne, działające ciało. Puste `throw new Error('not implemented')` to naruszenie. | Model tworzy `handleExport() { /* TODO */ }`. |
| N-05 | **NO IMPORT HALLUCINATION** — Nie importuj paczek/modułów, które nie istnieją w `package.json` lub workspace. Sprawdź przed użyciem. | Model pisze `import { useVector } from '@vectoria/math'` — taki pakiet nie istnieje. |
| N-06 | **NO API ASSUMPTION** — Nie zakładaj sygnatur, typów zwracanych ani zachowania API z pamięci. Otwórz plik źródłowy i zweryfikuj. | Model zakłada, że `getObjectBounds()` przyjmuje 1 argument, a faktycznie wymaga 2. |
| N-07 | **NO CREATIVE OPTIMIZATION** — Nie "ulepszaj" kodu, który działa, jeśli task tego nie wymaga. Nie zmieniaj nazw zmiennych, nie przenoś funkcji, nie dodawaj abstrakcji "na przyszłość". | Task: "dodaj przycisk X" → model przepisuje cały komponent "bo było nieczytelne". |
| N-08 | **NO PARTIAL CHECKLIST** — Jeśli task wymienia N podpunktów do implementacji, każdy z nich musi być zrealizowany. Pominięcie choćby jednego = błąd. | Task ma 8 kryteriów, model implementuje 6 i mówi "gotowe". |
| N-09 | **NO INVISIBLE CHANGES** — Każda zmiana pliku musi być jawnie wymieniona w raporcie. Ciche edycje plików poza scope = błąd. | Model dodaje `// ignore: unused_element` do pliku, którego task nie dotyczy. |
| N-10 | **NO TEST PRETENDING** — Nie twierdź, że test/typecheck/benchmark przeszedł, jeśli go nie uruchomiono faktycznie w terminalu. | "Testy powinny przejść" zamiast `pnpm test → 169/169 passed`. |

---

### 11.3 Protokół Wykonania (Execution Chain)

**Zanim wygenerujesz jakikolwiek kod**, zawsze wykonaj poniższy scratchpad. Nie pomijaj żadnego kroku, nawet przy małych zmianach.

#### Krok 1: SCOPE
Napisz 1-2 zdania określające **co dokładnie** zmieniasz i **w których plikach**.
> Przykład: "Dodaję prop `onUpdateGroupTransform` do `RightDock.tsx` i `PropertiesPanel.tsx`. Zmieniam `EditorApp.tsx`, żeby przekazać handler."

#### Krok 2: EDGE CASES
Wymień 1-3 warunki brzegowe, które ten kod musi obsłużyć.
> Przykład: "1. Pusta selekcja (0 obiektów). 2. Obiekt zablokowany (locked). 3. Scale = 0."

#### Krok 3: CHECKLIST
Wypisz **wszystkie** wymagania z promptu użytkownika w formie checklisty `[ ]`.
> Przykład:
> - `[ ]` Dodać prop do interfejsu
> - `[ ]` Przekazać prop w JSX
> - `[ ]` Usunąć min={0.000001}
> - `[ ]` Dodać sekcję Group Transform

#### Krok 4: IMPLEMENTACJA
Teraz (i dopiero teraz) pisz kod.

#### Krok 5: WERYFIKACJA
Po zakończeniu implementacji:
1. Odhacz checklistę z Kroku 3 jako `[x]`.
2. Dla każdego **nieodhaczonego** punktu — wyjaśnij dlaczego nie został zrealizowany.
3. Jeśli choćby jeden punkt jest nieodhaczony bez uzasadnienia — **nie mów "gotowe"**.

---

### 11.4 Reguły Anty-Drift (Anti-Skip)

Modele (szczególnie GPT i Gemini) mają tendencję do "driftu kontekstowego" — gubią wymagania przy długich taskach. Poniższe reguły temu zapobiegają.

**AD-01: Zasada kompletności.** Jeśli task wymienia listę rzeczy do zrobienia, implementujesz **WSZYSTKIE**. Nie wybieraj "najważniejszych". Nie decyduj, że coś jest "trywialne" i nie warte implementacji.

**AD-02: Zasada ponownej lektury.** Po zakończeniu implementacji, **wróć do oryginalnego promptu** użytkownika i przeczytaj go od nowa. Porównaj punkt po punkcie z tym, co faktycznie zrobiłeś. Jeśli cokolwiek pominąłeś — doimplikuj teraz, nie w następnym tasku.

**AD-03: Zasada jawnego raportowania braków.** Jeśli z jakiegoś powodu nie możesz zrealizować podpunktu (brak informacji, konflikt architektoniczny, zbyt duży scope) — **powiedz o tym wprost** zamiast cicho pominąć. Napisz: "Nie zrealizowałem punktu X, ponieważ [konkretny powód]. Potrzebuję [czego] od użytkownika."

**AD-04: Zakaz "mentalnej weryfikacji".** Gdy mówisz "sprawdziłem" — znaczy, że **fizycznie otworzyłeś plik** i przeczytałeś konkretną linię. Nie zakładaj z pamięci. Nie zgaduj. `grep` + `view_file` + `run_command` — to jedyne akceptowane formy "sprawdzenia".

**AD-05: Zasada atomowego taska.** Jeśli dostajesz task z >8 podpunktami, zaproponuj użytkownikowi podział na mniejsze subtaski (max 3-5 kryteriów każdy). Powiedz wprost: "Ten task ma X podpunktów. Proponuję podział na [A] i [B], żeby zmniejszyć ryzyko pominięcia."

---

### 11.5 Format Zwracania Kodu (Output)

- Generuj **wyłącznie** docelowy blok kodu w odpowiednim języku. Żadnych zmian architektury "w tle".
- Nie zwracaj całego pliku, gdy zmieniasz 3 linie — użyj precyzyjnej edycji.
- Pod kodem **obowiązkowo** oznacz checklistę z Kroku 3 jako `[x]`, by wymusić weryfikację spełnienia wszystkich założeń.
- Jeśli modyfikujesz istniejący plik — **zachowaj wszystkie komentarze, docstringi i kod, którego nie dotyczysz**. Żadnego usuwania "bo było niepotrzebne".

---

### 11.6 Sygnały Zatrzymania (Stop Signals)

Zatrzymaj się i **zapytaj użytkownika** zamiast zgadywać, gdy:

1. Nie wiesz, który plik zawiera szukaną funkcję/typ — przeszukaj repo zamiast zgadywać ścieżkę.
2. Sygnatury API nie zgadzają się z tym, co pamiętasz — otwórz plik źródłowy.
3. Task jest niejednoznaczny — nie interpretuj kreatywnie, zapytaj wprost.
4. Odkryjesz buga poza zakresem taska — zgłoś go, nie naprawiaj.
5. Zmiana dotyka >5 plików — pokaż plan przed implementacją.
6. Nie jesteś pewien, czy coś jest w scope taska — zapytaj zamiast "dodawać na wszelki wypadek".

---

### 11.7 Specyficzne Pułapki Modeli (Known Model Traps)

Te wzorce zachowań są **udokumentowanymi błędami** z historii tego projektu:

| Pułapka | Opis | Jak uniknąć |
|---|---|---|
| **Lost in the Middle** | Model ignoruje reguły ze środka długiego kontekstu | Sekcja 11 ma absolutny priorytet; wracaj do niej po każdym bloku kodu |
| **Context Drift** | Przy 50 wymaganiach model "kompresuje" i ucina 10-12 | Wypisz checklistę PRZED kodem (Krok 3), zweryfikuj PO kodzie (Krok 5) |
| **Creative Optimization** | Model przepisuje działający kod "bo było nieczytelne" | N-07: nie ulepszaj kodu poza scope taska |
| **Import Hallucination** | Model importuje z nieistniejących pakietów | N-05: sprawdź `package.json` i `pnpm-workspace.yaml` przed importem |
| **API Assumption** | Model zakłada sygnatury z pamięci zamiast sprawdzić | N-06: otwórz plik źródłowy, przeczytaj typ, dopiero pisz kod |
| **Phantom Fix** | Model "naprawia" buga bez śledzenia call chain | Użyj sekcji 7 → Krok 1-3 (zrozumienie, mapa wpływu, plan) |
| **Test Theater** | Model mówi "testy powinny przejść" bez uruchomienia | N-10: `pnpm typecheck && pnpm test` — faktycznie uruchom i pokaż wynik |

---

### 11.8 Reguły Diagnostyki Błędów (Bugfix Protocol)

Zanim napiszesz fix, **UDOWODNIJ** przyczynę buga:

1. **Opisz pełny łańcuch wywołań** od wyzwalacza do objawu.
2. **Wskaż dokładną linię**, w której zachowanie odbiega od oczekiwanego.
3. **Wyjaśnij DLACZEGO** ta linia powoduje problem (nie co robi — dlaczego jest niepoprawna).
4. **Potwierdź, że fix atakuje przyczynę**, nie objaw.

Jeśli nie możesz wypełnić punktów 1-3 bez spekulacji — powiedz wprost:
> "Nie jestem pewien przyczyny. Oto moje hipotezy: [A, B]. Proponuję zweryfikować [konkretny test/log]."

**Nigdy nie pisz fixa "na próbę".** Nigdy nie mów "spróbujmy czy to pomoże".

---

## 12. NON-NEGOTIABLE ENGINEERING RULES

### 12.1. Never implement a feature by name only

Do NOT consider a feature implemented merely because:

- a type/interface exists;
- a command exists;
- a UI button exists;
- a function with the expected name exists;
- a property exists in the model;
- a test only verifies that the function can be called.

A feature is DONE only when complete behavior works end-to-end:

```text
REQUIREMENT
→ DOMAIN MODEL
→ COMMAND / MUTATION
→ ACTUAL ALGORITHM
→ RENDERER / ENGINE
→ UI
→ UNDO / REDO
→ TEST
```

If one element is missing, task status is PARTIAL, not DONE.

### 12.2. Never fake a complex implementation

NEVER replace required real algorithm with:

- hardcoded shapes;
- placeholder geometry;
- approximations;
- magic constants;
- canned examples;
- mock data;
- simplified behavior that only works for test case.

Examples:

BAD:

- Text → Outlines implemented using rectangles/circles for letters.
- Font metrics approximated with `fontSize * 0.5`.
- Emoji support implemented using hardcoded list while claiming Unicode support.
- Variable fonts implemented by storing `variableAxes` without applying them.

GOOD:

Use real underlying representation/algorithm required by feature.

If required technology or library is missing, STOP and report:
`Implementation requires X. It is currently unavailable.`

Do not invent fake substitute.

### 12.3. Requirements are behavioral, not structural

For every task identify:

1. WHAT must user be able to do?
2. WHAT should happen internally?
3. WHAT data must change?
4. WHAT must be rendered?
5. WHAT happens on Undo?
6. WHAT happens on Redo?
7. WHAT are edge cases?

Do not equate property existence with feature behavior.

### 12.4. Verify actual behavior

Before marking task DONE, create at least one test proving actual behavior.

Test MUST fail if feature is replaced by fake/stub implementation.

Example for Text → Outlines:

```text
Insufficient:
expect(result.type).toBe("path")

Required:
- output is a PathObject;
- geometry contains actual glyph contours;
- different fonts produce different geometry;
- holes/compound glyphs are preserved;
- Unicode glyphs work;
- Undo restores original TextObject.
```

### 12.5. Tests verify semantics, not implementation existence

BAD:

```ts
expect(generateGlyphOutline('A')).toBeDefined();
```

GOOD:

```ts
expect(convertTextToOutlines('Hello', arialGeometry))
  .not.toEqual(convertTextToOutlines('Hello', timesGeometry));
```

Tests must detect fake implementations.

### 12.6. No DONE without evidence

Every completed task must include:

- files changed;
- implementation summary;
- tests added or updated;
- test command;
- actual test result;
- known limitations.

Use this format:

```text
TASK: TEXT-024
STATUS: DONE

Implementation:
- ...

Tests:
- ...

Verification:
- `pnpm test ...`
- PASS: 12/12

Known limitations:
- none
```

If verification was not performed:

```text
STATUS: PARTIAL
REASON: verification not performed
```

Never claim PASS based only on code inspection.

### 12.7. Use existing architecture

Before implementing:

1. inspect existing model;
2. inspect existing commands;
3. inspect renderer;
4. inspect tests;
5. inspect related features.

Do not create parallel architecture when existing abstraction solves problem.

For mutations, ALL document mutations MUST go through Commands.

For text, ALL layout calculations must have one source of truth shared by:

- renderer;
- caret;
- selection;
- hit testing;
- bounds;
- export.

### 12.8. No silent scope reduction

Do not reinterpret:

- `real glyph outlines` as approximate glyph shapes;
- `replace all` as replace first;
- `emoji picker` as a list of 20 emoji.

If task cannot be fully implemented within current architecture:

- explain why;
- propose smallest correct architectural change;
- implement that change.

### 12.9. Edge cases are part of feature

For text functionality always consider:

- Unicode code points;
- surrogate pairs;
- combining marks;
- emoji sequences;
- CJK;
- RTL where applicable;
- empty strings;
- long words;
- missing fonts;
- font loading delays;
- very large text;
- zero and negative values;
- undo/redo;
- copy/paste.

Do not assume ASCII-only text.

### 12.10. Hardcoded data requires explicit justification

Do not hardcode the following when requirement expects real or dynamic support:

- Unicode databases;
- font metadata;
- glyph geometry;
- font metrics;
- supported variable axes;
- emoji catalogs.

If hardcoded data is necessary, document:

- why;
- source;
- scope;
- limitations.

## 13. TASK EXECUTION PROTOCOL

Before coding a task:

1. Read task completely.
2. Identify acceptance criteria.
3. Search repository for existing implementation.
4. Determine what is already implemented.
5. Identify missing pieces.
6. Write short implementation plan.
7. Implement.
8. Add tests.
9. Run tests.
10. Inspect actual result.
11. Only then mark DONE.

After implementation ask:

> Could this implementation pass semantic test designed specifically to catch fake implementation?

If NO, task is not DONE. Strengthen tests or mark task PARTIAL.

## 14. DEFINITION OF DONE

A task is DONE only if all statements are true:

- [ ] Requirement is fully implemented.
- [ ] No placeholder or fake implementation exists.
- [ ] Existing architecture is respected.
- [ ] User-visible behavior works.
- [ ] Undo works.
- [ ] Redo works.
- [ ] Edge cases are handled.
- [ ] Tests verify behavior.
- [ ] Tests were actually executed.
- [ ] Build and typecheck pass.
- [ ] No known critical limitation remains.

Otherwise use `PARTIAL` or `BLOCKED`. Never use DONE for partial implementation.

## 15. MANDATORY SELF-REVIEW

Before declaring task DONE, attempt to disprove own implementation.

For each requirement ask:

1. What is easiest fake implementation that would appear to work?
2. Would my tests catch that fake implementation?
3. What real-world input would break my implementation?
4. Am I implementing requirement or merely its API surface?
5. Did I verify result using actual output?

If fake implementation could pass tests, tests are insufficient and MUST be strengthened.

## 16. EPIC COMPLETION RULE

An EPIC cannot be marked complete based on percentage of tasks with files,
functions or types implemented.

Each task must have:

```text
TASK ID
→ ACCEPTANCE CRITERIA
→ IMPLEMENTATION
→ TEST
→ VERIFICATION
```

EPIC status is DONE only when ALL tasks are DONE.

If:

- 30/34 tasks are DONE;
- 4/34 tasks are PARTIAL;

then EPIC status MUST be PARTIAL.

Never report `34/34` when any acceptance criterion is missing.
