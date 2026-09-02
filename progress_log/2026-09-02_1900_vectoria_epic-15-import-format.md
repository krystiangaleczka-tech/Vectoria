# Progress Log: 2026-09-02_1900_vectoria_epic-15-import-format
Date: 2026-09-02 19:00

## Meta
- **Epic**: EPIC-15
- **Task**: Wdrożenie obsługi importu i zapisu .vct, SVG, schowka (Etap 0.1)

## Summary
Zrealizowano pełny Etap 0.1 Epic-15. Podłączono `.vct` I/O, usunięto obejścia walidacji dla SVG, wdrożono `sanitizer.ts`, ustandaryzowano import przez nowy komponent podpinający się pod upuszczenia plików, panel menu oraz wklejanie ze schowka. Wynik raportuje logi importu do `ImportDialog`.

## Problem
Aplikacja Vectoria nie wspierała zapisu do własnego pliku natywnego oraz nie raportowała wsparcia na elementach SVG wczytując i nadpisując domyślne parametry (jak filtry, `transform` w `<g>`), posiadając lukę na skrypty.

## Implementation
Wdrożono `importVctFile` oraz `exportVctFile` pracujące na skompresowanych bufferach. Rozwiązano problem braku bezpiecznego zrzutu ze schowka w obcych formatach przez walidację MIME type. Aplikacja wspiera dekompozycję węzłowych w SVG na `Transform2D`. Wprowadzono architekturę FormatProviders by abstrakcyjnie obsłużyć poszczególne rozszerzenia plików. Ukończono z podpięciem komponentu paska menu, kontrolera upuszczeń w obszarze roboczym.

## Validation
Testy Vitest przechodzą wzorowo (321 assertions, 55 plików). Utrzymano wsteczną kompatybilność, nie łamiąc formatu. TypeScript typecheck zwraca sukces bez waringów.

## Files Changed
- `BACKLOG.md` (aktualizacja scope)
- `packages/core/src/import/import-types.ts`
- `packages/io/src/svg/sanitizer.ts`
- `packages/io/src/vct/vct-file.ts`
- `packages/io/src/providers/format-provider.ts`
- `packages/io/src/providers/svg-file-provider.ts`
- `packages/io/src/providers/honest-unsupported-providers.ts`
- `apps/web/src/features/import/import-registry.ts`
- `apps/web/src/features/import/useImportController.ts`
- `apps/web/src/features/import/ImportDialog.tsx`
- `apps/web/src/app/EditorApp.tsx`
- `apps/web/src/features/topbar/AppMenuBar.tsx`
- `apps/web/src/features/topbar/TopBar.tsx`
- `apps/web/src/features/canvas/CanvasViewport.tsx`
- `packages/io/src/svg/import.ts`
- `packages/io/src/assets/file-drop-importer.ts`
- `apps/web/src/features/clipboard/clipboard-service.ts`

## Outcome
Wdrożono i pomyślnie zintegrowano system Import / Zapis (Etap 0.1). Oczekuje na start Etapu 0.2.
