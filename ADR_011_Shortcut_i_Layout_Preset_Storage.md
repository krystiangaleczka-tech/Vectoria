# ADR 011: Shortcut i Layout Preset Storage

## Kontekst
Użytkownicy potrzebują możliwości konfigurowania własnych skrótów klawiszowych i zapisywania układów interfejsu. Ustawienia te są specyficzne dla użytkownika/urządzenia i powinny ładować się natychmiast przy starcie edytora. Należy podjąć decyzję o sposobie persystencji tych ustawień bez wpływu na czystość architektoniczną `core` edytora oraz opóźnień asynchronicznych (np. wczytywania przez IndexedDB).

## Decyzja
1. Użycie `localStorage` dla zapisywania skrótów (`vectoria.shortcuts.v1`) i presetów layoutu (`vectoria.layout-presets.v1`).
2. Rozwiązanie "local-first" i synchroniczne. Zapewnia natychmiastowe ładowanie, zgodne z obecnym sposobem przechowywania preferencji motywu (theme).
3. Ładowanie i zapis ustawień zarządza warstwa `apps/web` przez dedykowane hooki (np. `useShortcutSettings`), a engine otrzymuje wyłącznie normalizowane i czyste struktury.
4. Każde odczytanie z `localStorage` podlega walidacji przez `zod`. Jeśli dane są uszkodzone ("corrupted"), następuje przywrócenie do wartości domyślnych z ewentualnym `console.warn`, bez blokowania renderowania aplikacji.

## Konsekwencje
- Natychmiastowy dostęp do skrótów na starcie, bez asynchronicznych mechanizmów z IndexedDB.
- Skróty i układy nigdy nie są zapisywane w formacie `.vct` dokumentu, utrzymując podział pomiędzy modelem danych wektorowych a interfejsem użytkownika.
- Limit rozmiaru `localStorage` (typowo ok. 5MB) nie jest problemem dla małych ładunków JSON, jakimi są definicje skrótów i konfiguracja paneli.
