# Progress Log: 2026-09-04_1342_vectoria_epic-18-and-adr-021-ai-cdr
Date: 2026-09-04 13:42

## Meta
- **Area**: UX & Accessibility (EPIC-18), Dialog Primitives, Onboarding & Interactive Tutorials, High Contrast, UI Scaling, Adobe Illustrator (.ai) & CorelDRAW (.cdr) Export Engine (ADR-021)
- **Task**: EPIC-18: UX, dostępność i onboarding oraz ADR-021: Bezpośredni zapis kopii AI i CDR

## Summary
Zrealizowano pełny zakres epiku **EPIC-18 (UX-001..UX-023)** oraz wdrożono **ADR-021** umożliwiający bezpośredni zapis/eksport otwartego projektu do formatów Adobe Illustrator (`.ai`) oraz CorelDRAW (`.cdr`) z poziomu menu Plik oraz okna dialogowego ExportDialog, zachowując format `.vct` jako bezstratny format roboczy. Utworzono moduły eksportu `ai-exporter.ts`, `cdr-exporter.ts`, lekki bezbiblioteczny `zip-builder.ts`, komponenty `Dialog`, `ConfirmDialog`, `OnboardingChecklist`, `TutorialOverlay`, dynamiczny `hitTolerancePx` dla touch/stylus, skróty Nudge (1px/10px) i Select All. Wszystkie testy automatyczne przeszły w 100%.

## Problem
1. Brak dostępności klawiatury dla precyzyjnego pozycjonowania (nudge) i zaznaczania (`Cmd+A` / `Ctrl+A`).
2. Brak dostępnych, modalnych okien dialogowych z pułapką fokusu i obsługą klawisza Escape (używano natywnego `window.confirm`).
3. Brak wsparcia dla trybu wysokiego kontrastu oraz skalowania interfejsu (85%–130%).
4. Brak wbudowanego onboardingu dla nowych użytkowników.
5. Niemożliwość bezpośredniego zapisu kopii roboczej do dominujących w branży formatów `.ai` i `.cdr` bez konieczności zewnętrznej konwersji.

## Implementation
1. **Dostępność i nawigacja klawiaturą (UX-001..009)**:
   - Atrybuty ARIA w `CanvasViewport`: `role="application"`, `tabindex=0`, `aria-roledescription="edytor wektorowy"`.
   - Nudge: strzałki przesuwają obiekty o 1px (lub 10px z Shift), debouncing 300ms łączący serię przesunięć w pojedynczy `TransformObjectsCommand`.
   - Skrót Select All (`Cmd+A` / `Ctrl+A`) w `useEditorShortcuts`.
   - Obsługa rysika i dotyku: wykrywanie końcówki gumki (`pointerType === 'pen' && button === 5`), pinch-to-zoom bez zanieczyszczania historii Undo/Redo, dynamiczny `hitTolerancePx` w `hit-tolerance.ts`.
2. **Modalne okna dialogowe i komunikaty (UX-015..021)**:
   - Komponenty `Dialog` i `ConfirmDialog` w `packages/ui` z pułapką fokusu (`focus trap`), obsługą Escape i wariantami niszczącymi.
   - Zastąpienie wszystkich wywołań `window.confirm` w panelach: `ArtboardsPanel`, `PalettesPanel`, `ObjectStylesPanel`, `AppearancePanel`, `ProjectGallery`, `ShortcutConfigDialog`.
3. **Wysoki kontrast i skalowanie UI (UX-010..014)**:
   - Tryb wysokiego kontrastu: `data-contrast="high"` z żółtym obrysem fokusu `#ffd60a`.
   - Skalowanie UI: selektor 85%–130% aplikowany do `#root { zoom }` z zachowaniem niezależności canvasu.
4. **Onboarding i samouczki (UX-022..023)**:
   - Komponent `OnboardingChecklist` (5 kroków startowych, pasek postępu, ukrywanie).
   - Komponent `TutorialOverlay`: 4 interaktywne samouczki ('shortcuts', 'first-document', 'pen', 'node') z dynamicznym podświetleniem elementów.
5. **Eksport do AI i CDR (ADR-021)**:
   - `docs/adr/ADR_021_AI_CDR_EXPORT_COMPATIBILITY.md`.
   - `packages/io/src/ai/ai-exporter.ts`: generowanie strumienia `%PDF-1.5` z metadanymi Illustratora i artboardami.
   - `packages/io/src/cdr/cdr-exporter.ts`: generowanie pakietu PKZIP z `metadata/metadata.xml` i wektorami.
   - `packages/io/src/cdr/zip-builder.ts`: czysty generator ZIP bez zewnętrznych zależności.
   - Rozszerzenie `EXPORT_FORMATS` w `packages/io/src/export/export-types.ts` o `'ai'` i `'cdr'`.
   - Menu `Plik` w `AppMenuBar.tsx`: dodano pozycje zapisu kopii jako `.ai` i `.cdr`.
   - Okno `ExportDialog.tsx`: dodano zakładki AI i CDR wraz z estymacją rozmiaru.

## Validation
- `pnpm typecheck`: 0 błędów w 7 projektach monorepo.
- `pnpm lint`: 0 błędów, 0 ostrzeżeń w całym repozytorium.
- `pnpm test`: 81 plików testowych Vitest, 424 zdane (w tym nowe `ai-cdr-export.spec.ts`).
- `pnpm test:e2e`: 36 testów Playwright E2E zdanych (w tym `a11y.spec.ts` i testy ADR-021 w `editor.spec.ts`).
- `pnpm build`: Pomyślna kompilacja produkcyjna web app (3.74s).

## Files Changed
- `docs/adr/ADR_021_AI_CDR_EXPORT_COMPATIBILITY.md`
- `dump/2026-09-04_1342_vectoria_epic-18-and-adr-021-ai-cdr.md`
- `progress_log/2026-09-04_1342_vectoria_epic-18-and-adr-021-ai-cdr.md`
- `BACKLOG.md`
- `packages/ui/src/primitives/Dialog.tsx`
- `packages/ui/src/primitives/ConfirmDialog.tsx`
- `packages/ui/src/primitives/IconButton.tsx`
- `packages/ui/src/index.ts`
- `packages/ui/src/tokens/themes.css`
- `packages/ui/test/Dialog.test.tsx`
- `packages/ui/test/ConfirmDialog.test.tsx`
- `packages/editor-engine/src/tools/hit-tolerance.ts`
- `packages/editor-engine/src/commands/shortcut-manager.ts`
- `packages/editor-engine/src/index.ts`
- `packages/editor-engine/test/hit-tolerance.test.ts`
- `packages/io/src/ai/ai-exporter.ts`
- `packages/io/src/cdr/cdr-exporter.ts`
- `packages/io/src/cdr/zip-builder.ts`
- `packages/io/src/export/export-types.ts`
- `packages/io/src/index.ts`
- `packages/io/test/ai-cdr-export.spec.ts`
- `apps/web/src/hooks/useUiPreferences.ts`
- `apps/web/src/features/onboarding/OnboardingChecklist.tsx`
- `apps/web/src/features/onboarding/TutorialOverlay.tsx`
- `apps/web/src/features/canvas/CanvasViewport.tsx`
- `apps/web/src/features/topbar/AppMenuBar.tsx`
- `apps/web/src/features/topbar/TopBar.tsx`
- `apps/web/src/features/dialogs/ExportDialog.tsx`
- `apps/web/src/features/dialogs/FindReplaceDialog.tsx`
- `apps/web/src/features/dialogs/ShortcutConfigDialog.tsx`
- `apps/web/src/features/export/useExportController.ts`
- `apps/web/src/features/import/ImportDialog.tsx`
- `apps/web/src/features/palette/CommandPalette.tsx`
- `apps/web/src/features/panels/AppearancePanel.tsx`
- `apps/web/src/features/panels/ArtboardsPanel.tsx`
- `apps/web/src/features/panels/LayersPanel.tsx`
- `apps/web/src/features/panels/ObjectStylesPanel.tsx`
- `apps/web/src/features/panels/PalettesPanel.tsx`
- `apps/web/src/features/statusbar/StatusBar.tsx`
- `apps/web/src/features/toolbar/ToolRail.tsx`
- `apps/web/src/features/workspace/ProjectGallery.tsx`
- `apps/web/src/app/EditorApp.tsx`
- `apps/web/src/app/editor.css`
- `apps/web/e2e/a11y.spec.ts`
- `apps/web/e2e/editor.spec.ts`

## Outcome
Zadania EPIC-18 oraz wymogi ADR-021 zostały w 100% zaimplementowane, zintegrowane i zweryfikowane.

## Known Limitations
- Eksport AI i CDR konwertuje specyficzne dla Vectorii unikalne elementy (drzewa boolowskie, piny komentarzy) do zoptymalizowanej geometrii wektorowej.
