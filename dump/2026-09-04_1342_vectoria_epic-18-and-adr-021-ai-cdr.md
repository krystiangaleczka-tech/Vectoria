# Dump: EPIC-18 (UX, Dostępność, Onboarding) oraz ADR-021 (Zapis kopii AI i CDR)

- **Data:** 2026-09-04 13:42:00 +02:00
- **Autor:** Antigravity / Vectoria Team
- **Aktywny zakres:** EPIC-18 (UX-001..UX-023) oraz ADR-021 (Eksport i zapis kopii do .ai oraz .cdr)
- **Status:** Completed & Fully Validated

---

## 1. Stan przed i po

### Stan PRZED:
- Brak semantycznych ról ARIA dla canvasu viewport (`role="application"`), brak wskaźników focusu w wysokim kontraście.
- Klawisze strzałek nie przesuwały zaznaczonych obiektów z debouncingiem do pojedynczej komendy.
- Brak ujednoliconego skrótu Select All (`Cmd+A` / `Ctrl+A`).
- Brak dedykowanych komponentów dostępnych okien modalnych (`Dialog` z pułapką focusu i Escape oraz `ConfirmDialog` zamiast natywnego `window.confirm`).
- Brak wbudowanego onboardingu: checklisty kroków startowych i interaktywnych samouczków.
- Zapis projektu oferował wyłącznie eksport do `.vct`, a w menu brakowało bezpośredniej możliwości zapisu kopii roboczej do formatów branżowych `.ai` i `.cdr`.
- W oknie `ExportDialog` brakowało formatów AI i CDR.

### Stan PO:
- Canvas posiada semantyczne atrybuty ARIA (`role="application"`, `tabindex=0`, `aria-roledescription="edytor wektorowy"`).
- Klawiatura obsługuje Nudge (1px standardowo, 10px z Shiftem) scalany 300ms w `TransformObjectsCommand`.
- Dostępne modalne komponenty `Dialog` (focus trap, Escape, aria-labelledby) oraz `ConfirmDialog` zintegrowane we wszystkich panelach edytora.
- Dodano przełącznik wysokiego kontrastu (`[data-contrast="high"]` z żółtym ringiem `#ffd60a`) i skalowanie interfejsu (85%–130%).
- Zaimplementowano checklistę kroków startowych (`OnboardingChecklist`) oraz 4 interaktywne samouczki (`TutorialOverlay`).
- Wdrożono ADR-021: w menu `Plik` dodano pozycje „Zapisz kopię jako Adobe Illustrator (.ai)” oraz „Zapisz kopię jako CorelDRAW (.cdr)”.
- W `packages/io` zaimplementowano eksportery `exportAiFile` (PDF-compatible stream `%PDF-1.5`) oraz `exportCdrFile` (CorelDRAW PKZIP package z `metadata/metadata.xml` i wektorami) wraz z czystym `ZipBuilder`.
- W oknie `ExportDialog` dodano zakładki AI i CDR.

---

## 2. Zmiany per plik (Changes Per File)

### 1. `docs/adr/ADR_021_AI_CDR_EXPORT_COMPATIBILITY.md`
- **Stan przed:** Plik nie istniał.
- **Konkretna zmiana:** Utworzono dokument ADR-021 definiujący standard i kompatybilność eksportu do `.ai` i `.cdr`.
- **Cel:** Formalne rozszerzenie ADR-008 i zapewnienie spójności architektonicznej.

### 2. `packages/io/src/cdr/zip-builder.ts`
- **Stan przed:** Plik nie istniał.
- **Konkretna zmiana:** Czysty generator archiwów ZIP (`PK\x03\x04`, Central Directory, EOCD) z funkcją `crc32`.
- **Cel:** Budowanie poprawnych pakietów CorelDRAW bez zewnętrznych bibliotek.

### 3. `packages/io/src/cdr/cdr-exporter.ts`
- **Stan przed:** Plik nie istniał.
- **Konkretna zmiana:** Implementacja `exportCdrFile(doc, options)` tworząca pakiet PKZIP z `metadata/metadata.xml` i wektorami.
- **Cel:** Bezpośredni eksport do formatu CorelDRAW `.cdr`.

### 4. `packages/io/src/ai/ai-exporter.ts`
- **Stan przed:** Plik nie istniał.
- **Konkretna zmiana:** Implementacja `exportAiFile(doc, options)` tworząca strumień PDF-compatible `%PDF-1.5` z metadanymi Illustratora.
- **Cel:** Bezpośredni eksport do formatu Adobe Illustrator `.ai`.

### 5. `packages/io/src/export/export-types.ts`
- **Stan przed:** `EXPORT_FORMATS` = `['svg', 'png', 'jpeg', 'webp', 'pdf']`.
- **Konkretna zmiana:** Dodano `'ai'` oraz `'cdr'`.
- **Cel:** Rozszerzenie dozwolonych formatów eksportu.

### 6. `packages/io/src/index.ts`
- **Stan przed:** Brak eksportu modułów `ai-exporter` i `cdr-exporter`.
- **Konkretna zmiana:** Re-eksport `exportAiFile` i `exportCdrFile`.
- **Cel:** Publiczne API pakietu `@vectoria/io`.

### 7. `packages/io/test/ai-cdr-export.spec.ts`
- **Stan przed:** Plik nie istniał.
- **Konkretna zmiana:** Zestaw testów jednostkowych i round-trip odczytu dla formatów AI i CDR.
- **Cel:** Gwarancja bezbłędnej serializacji i odzyskiwania wektorów.

### 8. `apps/web/src/features/topbar/AppMenuBar.tsx`
- **Stan przed:** Menu Plik zawierało tylko `Zapisz jako .vct`.
- **Konkretna zmiana:** Dodano pozycje `Zapisz kopię jako Adobe Illustrator (.ai)` oraz `Zapisz kopię jako CorelDRAW (.cdr)`.
- **Cel:** Dostępność operacji zapisu dla użytkownika w głównym menu.

### 9. `apps/web/src/features/topbar/TopBar.tsx`
- **Stan przed:** Brak propsów `onExportAi` i `onExportCdr`.
- **Konkretna zmiana:** Dodano i przekazano propsy do `AppMenuBar`.
- **Cel:** Przekazanie akcji zapisu z poziomu aplikacji do paska menu.

### 10. `apps/web/src/app/EditorApp.tsx`
- **Stan przed:** Brak handlerów `handleExportAi` i `handleExportCdr`.
- **Konkretna zmiana:** Dodano funkcje zapisu z automatycznym wywołaniem `downloadBlob(...)`.
- **Cel:** Realizacja pobierania wygenerowanych plików `.ai` i `.cdr`.

### 11. `apps/web/src/features/export/useExportController.ts`
- **Stan przed:** Brak obsługi `'ai'` i `'cdr'` w kolejce zadań eksportu.
- **Konkretna zmiana:** Dodano gałęzie generowania plików AI i CDR.
- **Cel:** Pełna integracja z silnikiem eksportu w tle.

### 12. `apps/web/src/features/dialogs/ExportDialog.tsx`
- **Stan przed:** Zakładki formatów zawierały tylko PNG, SVG, PDF, JPEG, WEBP.
- **Konkretna zmiana:** Dodano zakładki AI i CDR oraz estymację rozmiaru pliku.
- **Cel:** Wybór AI i CDR w głównym oknie dialogowym eksportu.

### 13. `apps/web/e2e/editor.spec.ts`
- **Stan przed:** Brak testu E2E weryfikującego menu Plik i okno eksportu pod kątem AI i CDR.
- **Konkretna zmiana:** Dodano test E2E `ADR-021: AI and CDR export options in Plik menu and Export dialog`.
- **Cel:** Zautomatyzowana regresja Playwright dla nowych formatów.

### 14. `packages/ui/src/primitives/Dialog.tsx` & `ConfirmDialog.tsx`
- **Stan przed:** Pliki nie istniały.
- **Konkretna zmiana:** Dostępne komponenty okien modalnych z pułapką fokusu, Escape i obsługą wariantów niszczących.
- **Cel:** Realizacja wymagań EPIC-18 (UX-015..021).

### 15. `packages/ui/test/Dialog.test.tsx` & `ConfirmDialog.test.tsx`
- **Stan przed:** Pliki nie istniały.
- **Konkretna zmiana:** Testy komponentów modalnych w środowisku Vitest jsdom.
- **Cel:** Weryfikacja dostępności i obsługi klawiatury.

### 16. `apps/web/src/features/onboarding/OnboardingChecklist.tsx` & `TutorialOverlay.tsx`
- **Stan przed:** Pliki nie istniały.
- **Konkretna zmiana:** Komponenty checklisty kroków startowych oraz 4 interaktywne tutoriale z podświetleniem elementów.
- **Cel:** Realizacja wymagań onboardingu w EPIC-18 (UX-022..023).

### 17. `apps/web/e2e/a11y.spec.ts`
- **Stan przed:** Plik nie istniał.
- **Konkretna zmiana:** Zestaw 6 testów Playwright E2E weryfikujących wszystkie kryteria EPIC-18.
- **Cel:** Automatyczna walidacja a11y, skrótów, dialogów i samouczków.

### 18. `BACKLOG.md`
- **Stan przed:** Zadania UX-001..UX-023 były odznaczone jako `[ ]`.
- **Konkretna zmiana:** Zaktualizowano wszystkie zadania EPIC-18 do `[x]`.
- **Cel:** Spójność backlogu z rzeczywistym kodem.

---

## 3. Walidacja jakościowa (Quality Gates)

- `pnpm typecheck`: 7/7 projektów (0 błędów).
- `pnpm lint`: 7/7 projektów (0 błędów, 0 ostrzeżeń).
- `pnpm test`: 81 plików testowych, 424 zdane (0 niepowodzeń).
- `pnpm test:e2e`: 36 testów Playwright zdanych (w tym 6 dla a11y i 1 dla ADR-021).
- `pnpm build`: Gotowy produkcyjny bundle webowy (3.74s).

---

## 4. Ograniczenia i następny krok

- Złożone, specyficzne dla Vectorii funkcje (drzewa boolowskie na żywo, piny komentarzy, proceduralne Repeat Grid) są w `.ai` i `.cdr` renderowane jako zoptymalizowana geometria wektorowa (nie makra Illustratora/Corela).
- Następny bezpieczny krok: dalszy rozwój backlogu (np. kolejne optymalizacje wydajnościowe, rozszerzenia narzędzi wektorowych lub backend SaaS).
