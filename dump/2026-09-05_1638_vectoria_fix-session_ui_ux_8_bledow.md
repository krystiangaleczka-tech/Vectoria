# Dump: 2026-09-05_1638_vectoria_fix-session_ui_ux_8_bledow
Date: 2026-09-05 16:38

## Meta
- **Area**: UI/UX, Canvas Viewport, Gesture Commit Reliability, Theme Switching, Handles Scaling, Ruler Theming, Zoom Presets, Color Control
- **Task**: PLAN_FIX-SESSION_ui_ux_8_bledow (8 błędów UI/UX i stabilizacja edytora)

## Stan PRZED
1. **Commit-drift szybkich gestów**: Szybkie przeciągnięcia obiektu (`< 300 ms`) powodowały powrót obiektu na miejsce startowe, a szybkie narysowanie kształtu gubiło obiekt z powodu odczytu stanu Reacta w domknięciu handlera.
2. **Odświeżanie motywu**: Zmiana motywu (jasny/ciemny) w menu nie odświeżała natychmiast tła canvasu ani podziałek miarek bez interakcji myszą.
3. **Zniekształcanie uchwytów**: Uchwyty transformacji i rotacji rozciągały się eliptycznie przy nieproporcjonalnej skali obiektu.
4. **Zielona etykieta pod kursorem**: Podczas przesuwania obiektu pod kursorem renderował się zielony napis relatywnych współrzędnych `ΔX... / ΔY...`.
5. **Ścisk w ColorControl**: Próbnik koloru, pole HEX oraz przycisk None nachodziły na siebie w węższych panelach właściwości.
6. **Zoom readout**: Kliknięcie w odczyt zoomu ustawiało sztywne 100%, bez możliwości cyklu presetów ani edycji.
7. **Zaśmiecone menu Obiekt**: 7 pozycji podmenu „Zaznacz podobne: …” wydłużało menu Obiekt.
8. **Kolory miarki**: W trybie ciemnym miarka nie miała jednolitego odcienia z panelami, a w trybie jasnym brakowało dedykowanego tokenu.

## Stan PO
1. **Pewne commity gestów**: `dragPreviewRef`, `stylePreviewRef` i `pathPreviewRef` gwarantują synchroniczny odczyt transformacji i geometrii przy pointerup, eliminując commit-drift.
2. **Natychmiastowe odświeżenie**: `MutationObserver` na `data-theme` unieważnia pętlę renderu, a `CanvasRulers` uwzględnia `currentTheme` w zależnościach rAF.
3. **Kwadratowe uchwyty 8×8 px**: Funkcje rysujące uchwyty kompensują skalę obiektu osiowo, zachowując stały wymiar na ekranie.
4. **Czysty kursor przy przesuwaniu**: Etykieta `ΔX/ΔY` została ograniczona wyłącznie do trybu pomiaru Alt+hover.
5. **Responsywny ColorControl**: `gap: 12px`, elastyczna szerokość pola HEX i wyrównanie do prawej krawędzi eliminują kolizje.
6. **Cykl i edycja zoomu**: Kliknięcie cyklicznie przełącza presety `25% → 50% → 75% → 87% → 100% → 150%`, a przytrzymanie 500 ms aktywuje pole `.zoom-input` (1%–6400%).
7. **Uporządkowane menu**: Usunięto podmenu „Zaznacz podobne” z menu Obiekt (silnik w core zachowany i dostępny w Command Palette).
8. **Spójne tokeny miarki**: `--color-ruler` (`#262624` dark, `#f2f2ed` light) zintegrowane w `themes.css`, Canvas i CSS.

## Implementacja
- Dodano synchroniczne referencje podglądu i znormalizowano współrzędne ekranowe w `CanvasViewport.tsx`.
- Skompensowano skalę w `drawResizeHandles` i `drawRotationHandle` w `packages/renderer/src/index.ts`.
- Dodano `MutationObserver` dla `data-theme` w `CanvasViewport.tsx` oraz zależność `currentTheme` w `CanvasRulers.tsx`.
- Dodano obsługę cyklu presetów i long-press w `AppMenuBar.tsx`, `TopBar.tsx`, `EditorApp.tsx` i `editor.css`.
- Uelastyczniono layout `ColorControl.tsx`.
- Usunięto pozycje `selectSame` z menu Obiekt w `AppMenuBar.tsx`.
- Zaktualizowano wpisy w `BACKLOG.md`.
- Utworzono testy E2E `fast-gesture.spec.ts` oraz testy jednostkowe `handles.test.ts`.

## Walidacja
- `pnpm typecheck`: 0 błędów w 7 pakietach monorepo.
- `pnpm lint`: 0 błędów i 0 ostrzeżeń.
- `pnpm test`: 82 pliki testowe, 427 testów zdanych (100% PASS).
- `pnpm test:e2e`: 40 testów Playwright zdanych (100% PASS).
- `pnpm build`: Pomyślna kompilacja produkcyjna web app (2.46s).

## Ograniczenia
- Brak znanych ograniczeń w ramach zrealizowanego zakresu zadań.

## Następny bezpieczny krok
- Kontynuacja prac nad kolejnymi zadaniami z roadmapy Vectoria (np. kolejne ulepszenia SaaS / workspace).

## Zmiany per plik (Changes Per File)

### `BACKLOG.md`
- **Stan przed**: Zadanie SEL-038 otwarte; PROD-016..021 bez adnotacji o usunięciu z UI.
- **Konkretna zmiana po**: Oznaczenie SEL-038 jako zrealizowane z notatką UX o usunięciu etykiety przy move; dodanie notatek o zachowaniu silnika selectSame dla PROD-016..021.
- **Cel**: Spójność dokumentacji produktowej z podjętymi decyzjami projektowymi.

### `apps/web/e2e/editor.spec.ts`
- **Stan przed**: Test select same klikał w usuniętą pozycję menu Obiekt.
- **Konkretna zmiana po**: Wywołanie polecenia select same przez Paletę Poleceń (Cmd+K).
- **Cel**: Dostosowanie asercji testu E2E do usunięcia pozycji z menu Obiekt.

### `apps/web/e2e/fast-gesture.spec.ts`
- **Stan przed**: Brak pliku.
- **Konkretna zmiana po**: Nowy zestaw 4 testów Playwright E2E dla szybkich gestów tworzenia i przeciągania, braku pozycji select same w menu oraz cyklu presetów zoomu.
- **Cel**: Trwałe zapobieganie regresji w obszarze commit-driftu i interakcji w edytorze.

### `apps/web/src/app/EditorApp.tsx`
- **Stan przed**: Przekazywanie `onSelectSame` do TopBar; brak `handleSetZoom`.
- **Konkretna zmiana po**: Dodanie callbacku `handleSetZoom` z ustawieniem kamery i przekazanie `onSetZoom` do TopBar; usunięcie propu `onSelectSame`.
- **Cel**: Obsługa nowego zoom readoutu oraz odpięcie usuniętego menu select same.

### `apps/web/src/app/editor.css`
- **Stan przed**: Brak klasy `.zoom-input`.
- **Konkretna zmiana po**: Zdefiniowanie styli `.zoom-input` dla pola edycyjnego zoomu.
- **Cel**: Estetyczny wygląd i czytelność wprowadzanego zoomu.

### `apps/web/src/features/canvas/CanvasRulers.tsx`
- **Stan przed**: Brak `currentTheme` w tablicy zależności rAF; sztywne kolory dark.
- **Konkretna zmiana po**: Dodanie `currentTheme` do deps rAF; pobieranie kolorów z tokenów `--color-ruler`.
- **Cel**: Natychmiastowe odświeżanie kolorystyki miarek przy zmianie motywu.

### `apps/web/src/features/canvas/CanvasViewport.tsx`
- **Stan przed**: Commity gestów czytały stan Reacta; brak obserwatora motywu; gałąź `move-object` w smartDistance; screenPoint w create-shape przekazywał worldPoint.
- **Konkretna zmiana po**: Wprowadzenie `dragPreviewRef`, `stylePreviewRef`, `pathPreviewRef`; odczyt refów w commitach; `MutationObserver` dla `data-theme`; usunięcie gałęzi `move-object` z smartDistance; normalizacja współrzędnych screen w pointerUp create-shape.
- **Cel**: Wyeliminowanie commit-driftu, natychmiastowe przerysowanie tła i usunięcie zielonej etykiety pod kursorem.

### `apps/web/src/features/panels/PropertiesPanel.tsx`
- **Stan przed**: Nagłówek sekcji umieszczony sztywno nad kontenerem przewijania.
- **Konkretna zmiana po**: Przeniesienie nagłówka do wnętrza `.dock-panel-content`.
- **Cel**: Eliminacja kolizji nagłówka z pierwszymi polami właściwości.

### `apps/web/src/features/properties/DocumentProperties.tsx`
- **Stan przed**: Sztywne kolory tekstu i etykiety h3 kolidujące z układem.
- **Konkretna zmiana po**: Ujednolicenie z tokenami `--color-text-primary` i czcionką UI z `tabular-nums`.
- **Cel**: Pełna czytelność właściwości dokumentu w motywach jasnym i ciemnym.

### `apps/web/src/features/topbar/AppMenuBar.tsx`
- **Stan przed**: Sztywny button zoomu wywołujący `onZoom100`; 7 pozycji podmenu Zaznacz podobne w menu Obiekt.
- **Konkretna zmiana po**: Dodanie cyklu presetów zoomu (25%–150%) oraz long-press do edycji custom; usunięcie pozycji Zaznacz podobne z menu Obiekt.
- **Cel**: Realizacja wymagań D1 i D2 planu FIX-SESSION.

### `apps/web/src/features/topbar/TopBar.tsx`
- **Stan przed**: Prop `onSelectSame`; brak `onSetZoom`.
- **Konkretna zmiana po**: Zamiana `onSelectSame` na opcjonalny `onSetZoom` i przekazanie do AppMenuBar.
- **Cel**: Spójny interfejs propsów komponentu TopBar.

### `packages/renderer/src/index.ts`
- **Stan przed**: Uchwyty transformacji deformowały się przy skali obiektu; etykieta delta wyświetlała się przy move-object; cień artboardu rozmywał się na 18px.
- **Konkretna zmiana po**: Kompensacja skali w `drawResizeHandles` i `drawRotationHandle`; gating etykiety delta na `options.smartDistance.hover`; usunięcie `shadowBlur` artboardu.
- **Cel**: Stały rozmiar uchwytów 8×8 px, brak zielonego tekstu przy dragu oraz czysty artboard bez gradientu.

### `packages/renderer/test/handles.test.ts`
- **Stan przed**: Brak pliku.
- **Konkretna zmiana po**: Nowy zestaw testów jednostkowych Vitest weryfikujący kompensację skali uchwytów, bezpieczną obsługę skali zerowej oraz gating etykiety delta.
- **Cel**: Ochrona przed regresją renderera.

### `packages/ui/src/primitives/ColorControl.tsx`
- **Stan przed**: Nachodzące na siebie elementy przy szerokości 78px i odstępie 8px; zduplikowany napis statyczny.
- **Konkretna zmiana po**: Usunięcie duplikatu tekstu; zwiększenie gap do 12px; responsywna szerokość pola HEX (`flex: 1 1 78px`, min 64px) z wyrównaniem do prawej.
- **Cel**: Czytelność i brak kolizji w panelu kolorów.

### `packages/ui/src/primitives/NumberInput.tsx`
- **Stan przed**: Sztywna czcionka maszynowa JetBrains Mono.
- **Konkretna zmiana po**: Zmiana na czcionkę interfejsową `var(--font-ui)` z `fontVariantNumeric: 'tabular-nums'`.
- **Cel**: Nowoczesna typografia liczb zgodna z design systemem.

### `packages/ui/src/tokens/themes.css`
- **Stan przed**: Brak semantycznych tokenów `--color-ruler`.
- **Konkretna zmiana po**: Zdefiniowanie `--color-ruler`, `--color-ruler-tick`, `--color-ruler-text` w trybach ciemnym (`#262624`) i jasnym (`#f2f2ed`).
- **Cel**: Jednolita kolorystyka miarki w obu motywach.

### `plans/PLAN_FIX-SESSION_ui_ux_8_bledow.md`
- **Stan przed**: Brak pliku w repozytorium.
- **Konkretna zmiana po**: Zapisanie zatwierdzonego planu naprawczego 8 problemów UI/UX.
- **Cel**: Źródło prawdy dla wdrożonych poprawek.
