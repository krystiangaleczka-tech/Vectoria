# Vectoria — Release Checklist

> Używaj tej checklisty dla każdej wersji beta, publicznego release'u i hotfixa.
>
> Release nie jest gotowy, jeżeli punkt oznaczony jako blokujący nie został zweryfikowany.

---

## 1. Informacje o release

```text
Version:
Release type: [ ] internal  [ ] alpha  [ ] beta  [ ] public  [ ] hotfix
Release owner:
Branch / commit SHA:
Planned date:
Environment: [ ] preview  [ ] staging  [ ] production
Changelog URL:
Rollback owner:
```

## 2. Zakres i decyzja Go/No-Go

- [ ] Zakres release'u jest zapisany w changelogu.
- [ ] Każdy feature ma kryteria akceptacji i status Done.
- [ ] Nie ma nieświadomych zmian funkcjonalnych ukrytych w refactorze.
- [ ] Znane ograniczenia są opisane w release notes lub UI.
- [ ] Nie reklamujemy funkcji jako „pełna obsługa AI/CDR”, jeśli nie przeszły test corpus.
- [ ] Compatibility matrix została zaktualizowana, jeśli zmienił się importer/eksporter.
- [ ] Właściciel release'u podjął decyzję Go/No-Go.

## 3. Kod i build — blokujące

- [ ] Branch release jest aktualny względem głównej gałęzi.
- [ ] Wszystkie wymagane PR-y mają review albo świadomą akceptację solo-owner.
- [ ] `typecheck` przechodzi.
- [ ] `lint` przechodzi.
- [ ] Unit tests przechodzą.
- [ ] Integration tests przechodzą.
- [ ] E2E tests przechodzą.
- [ ] Build produkcyjny przechodzi.
- [ ] Preview/staging uruchamia się bez błędów console.
- [ ] Nie ma nieobsłużonych promise rejection.
- [ ] Nie ma błędów runtime w podstawowym workflow.
- [ ] Source maps i error tracking są skonfigurowane zgodnie z polityką prywatności.
- [ ] Nie ma sekretów, `.env`, tokenów ani prywatnych plików w artefakcie/repozytorium.

## 4. Krytyczny workflow Vectorii — blokujące

### Dokument i canvas

- [ ] Aplikacja ładuje pusty edytor.
- [ ] New Document tworzy dokument z poprawnym artboardem.
- [ ] Pan działa przez `Space + drag` i middle mouse.
- [ ] Zoom działa względem kursora.
- [ ] Fit Artboard/Fit Drawing/100% działają.
- [ ] Canvas ma rozmiar viewportu, nie wymiar logiczny dokumentu.
- [ ] Resize bardzo dużego artboardu nie zamraża UI.
- [ ] Grid i grid snap działają zgodnie z ustawieniami.

### Podstawowa edycja

- [ ] Rectangle tworzy poprawny obiekt.
- [ ] Ellipse/Line/Pen działają w zakresie danego release'u.
- [ ] Select zaznacza właściwy obiekt.
- [ ] Move i scale działają.
- [ ] Delete działa.
- [ ] Fill, stroke i opacity aktualizują renderer.
- [ ] Undo/Redo działa dla utworzenia, przesunięcia, usunięcia i zmiany stylu.
- [ ] Warstwa hidden nie renderuje się ani nie jest zaznaczalna.
- [ ] Warstwa/object locked nie jest przypadkowo edytowalny.

### Persistencja

- [ ] Autosave zapisuje dokument.
- [ ] Odświeżenie strony odtwarza ostatni zapisany dokument.
- [ ] Błąd zapisu nie usuwa dokumentu z pamięci.
- [ ] Status saved/saving/error jest zrozumiały.

## 5. AI import — blokujące, gdy AI import jest w release

- [ ] PDF-compatible `.ai` z basic shapes importuje się.
- [ ] Ścieżki Béziera po imporcie są widoczne i edytowalne w zakresie release'u.
- [ ] Fill, stroke i opacity są wizualnie poprawne dla fixture P0.
- [ ] Layers/groups zachowują rozsądną kolejność renderu.
- [ ] Compatibility Report jest wyświetlany.
- [ ] Warning, flattened i unsupported obiekt nie znikają po cichu.
- [ ] AI bez PDF-compatible data pokazuje instrukcję, nie crash.
- [ ] Anulowanie importu zostawia bieżący dokument bez zmian.
- [ ] Import błędnego/uszkodzonego AI nie psuje aplikacji.
- [ ] Import AI nie blokuje UI bez statusu/progresu.

## 6. CDR import — blokujące, gdy CDR import jest w release

- [ ] Referencyjny `.cdr` basic shapes importuje się przez wybrany adapter.
- [ ] Curves, fill i outline są zgodne z określonym zakresem.
- [ ] Compatibility Report jest wyświetlany.
- [ ] Nieobsługiwane PowerClip/effects/text mają warning albo fallback.
- [ ] Nieobsługiwana wersja CDR ma czytelny błąd.
- [ ] Anulowanie CDR importu działa.
- [ ] Timeout/limit zasobów daje kontrolowany błąd.
- [ ] Import CDR nie wykonuje macro/VBA/script content.
- [ ] Aktualny dokument pozostaje bez zmian po błędzie importu.
- [ ] Jeśli używany jest backend: użytkownik widzi komunikat przed uploadem.

## 7. Eksport — blokujące dla obsługiwanych formatów

- [ ] Eksport `.vct` zapisuje dokument możliwy do ponownego otwarcia.
- [ ] SVG export otwiera się poprawnie w referencyjnym viewerze/przeglądarce.
- [ ] SVG export zachowuje wspierane shapes, paths, fill i stroke.
- [ ] PNG export ma poprawne wymiary, tło i przezroczystość.
- [ ] Eksport wybranego artboardu nie wycina zawartości błędnie.
- [ ] Eksport zaznaczenia ma poprawne bounds.
- [ ] Błąd eksportu jest czytelny i nie blokuje dalszej edycji.
- [ ] Eksport dużego PNG nie powoduje trwałego wycieku pamięci.

## 8. Wydajność — blokujące

- [ ] Benchmark 100 obiektów: pan/zoom jest płynny.
- [ ] Drag pojedynczego obiektu mieści się w ustalonym frame budget.
- [ ] Pointer input daje reakcję wizualną w docelowym budżecie.
- [ ] Performance HUD/telemetria developerska nie pokazuje regresji krytycznej.
- [ ] Test ekstremalnego logicznego artboardu przechodzi.
- [ ] Resize artboardu nie alokuje canvasa o wymiarze dokumentu.
- [ ] Autosave nie powoduje zauważalnego lag.
- [ ] Import/eksport długiej operacji daje progres i możliwość anulowania, jeśli funkcja to wspiera.
- [ ] Nie ma znanej regresji p95 frame time bez zaakceptowanego wyjątku.

## 9. Bezpieczeństwo i prywatność — blokujące

- [ ] Security Definition of Done przechodzi dla zmienionych importerów.
- [ ] SVG sanitizer odrzuca skrypty, event handlers i external URL-e.
- [ ] AI/CDR/PDF parser działa poza UI main thread albo w wymaganej izolacji.
- [ ] Limity pliku, czasu, obiektów i segmentów są aktywne.
- [ ] Nie ma sekretów w frontend bundle.
- [ ] Nie ma pełnej treści dokumentów w telemetryce/logach.
- [ ] Jeśli import jest server-side: sandbox i polityka usuwania plików są aktywne.
- [ ] Jeśli import jest server-side: tekst informacji o uploadzie jest widoczny użytkownikowi.
- [ ] Skan zależności nie pokazuje niezaakceptowanej krytycznej luki.
- [ ] Nie ma otwartego P0/P1 security issue dla wydawanej wersji.

## 10. Dostępność i UX

- [ ] Toolbar ma tooltipy, nazwy i skróty.
- [ ] Każdy przycisk ma widoczny stan focus.
- [ ] Podstawowy workflow można przejść klawiaturą.
- [ ] Error states są zrozumiałe i nie opierają się wyłącznie na kolorze.
- [ ] Dialog importu ma fokus, Escape i dostępny cancel.
- [ ] Compatibility Report jest czytelny dla użytkownika nietechnicznego.
- [ ] Jasny i ciemny motyw nie mają krytycznych problemów kontrastu.
- [ ] Aplikacja działa z podstawowym touch/pointer input w zakresie release'u.

## 11. Observability i support

- [ ] Error tracking jest aktywny i testowo odbiera kontrolowany błąd.
- [ ] Telemetria używa tylko dozwolonych, zanonimizowanych danych.
- [ ] Dashboard pokazuje import success/failure/cancel rate dla AI/CDR.
- [ ] Dashboard pokazuje median/p95 import duration.
- [ ] Dashboard pokazuje crash-free sessions.
- [ ] Są przygotowane kody błędów do supportu, np. `AI_NO_PDF_COMPATIBILITY`, `CDR_VERSION_UNSUPPORTED`, `IMPORT_TIMEOUT`.
- [ ] Release owner ma instrukcję diagnozy i rollbacku.

## 12. Dokumentacja i komunikacja

- [ ] `README.md` ma aktualne komendy.
- [ ] `ROADMAP.md` jest zaktualizowany.
- [ ] `AI_CDR_COMPATIBILITY_MATRIX.md` odzwierciedla realne wsparcie.
- [ ] `TESTING_STRATEGY.md` i `SECURITY.md` są aktualne, jeśli zmienił się importer/format.
- [ ] Changelog opisuje zmiany użytkowe oraz znane ograniczenia.
- [ ] Release notes nie składają obietnic szerszych niż realny test coverage.
- [ ] W razie zmiany architektury powstał ADR.

## 13. Deployment i rollback

- [ ] Staging został zweryfikowany na finalnym buildzie.
- [ ] Migracje danych są backward-compatible albo mają plan rollbacku.
- [ ] Feature flags dla eksperymentalnego importu AI/CDR działają.
- [ ] Można wyłączyć importer/konwerter bez wyłączenia całej aplikacji.
- [ ] Backup konfiguracji produkcyjnej istnieje.
- [ ] Plan rollbacku jest przetestowany lub udokumentowany.
- [ ] Po deployu wykonano smoke test na produkcji.
- [ ] Po deployu obserwowano błędy i metryki przez ustalony czas.

## 14. Post-release

- [ ] Potwierdzono działanie produkcyjne po release.
- [ ] Przejrzano błędy i metryki pierwszych użytkowników.
- [ ] Nowe problemy z plikami AI/CDR trafiły do feedback/bug backlogu.
- [ ] Reprezentatywne, legalne reproduce files zostały dodane do corpus.
- [ ] Spisano decyzję: sukces / follow-up / rollback.
- [ ] Zamknięto feature flag, jeśli eksperyment zakończył się sukcesem.

## 15. Sign-off

```text
[ ] Product / scope: ____________________
[ ] Engineering / build: ________________
[ ] Import fidelity: ____________________
[ ] Security / privacy: _________________
[ ] Performance: ________________________
[ ] Release owner Go/No-Go: _____________
Date and time: __________________________
```
