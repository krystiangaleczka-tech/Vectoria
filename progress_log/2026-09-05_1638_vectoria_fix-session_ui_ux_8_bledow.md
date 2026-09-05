# Progress Log: 2026-09-05_1638_vectoria_fix-session_ui_ux_8_bledow
Date: 2026-09-05 16:38

## Meta
- **Area**: UI/UX, Viewport Gestures, Theme Switching, Handles Scaling, Zoom Readout, Color Controls
- **Task**: PLAN_FIX-SESSION_ui_ux_8_bledow — Naprawa 8 błędów UI/UX i stabilizacja interakcji

## Summary
Zrealizowano pełny zakres planu FIX-SESSION rozwiązującego 8 zidentyfikowanych problemów UI/UX. Wyeliminowano commit-drift przy szybkich gestach (`< 300 ms`) poprzez wprowadzenie synchronicznych referencji stanu w `CanvasViewport`, wdrożono natychmiastowe przerysowanie tła i miarek przy zmianie motywu za pomocą `MutationObserver`, skompensowano skalę uchwytów transformacji (stały rozmiar 8×8 px), wyłączono niechcianą zieloną etykietę `ΔX/ΔY` podczas przesuwania obiektu, zoptymalizowano layout kontrolki `ColorControl`, zaimplementowano cykl presetów zoomu (25%–150%) z możliwością edycji wartości po przytrzymaniu (long-press), uporządkowano menu Obiekt usuwając zaśmiecające pozycje Select Same (z zachowaniem silnika w core i Command Palette) oraz ujednolicono tokeny kolorów miarki w trybie jasnym i ciemnym.

## Problem
1. Commit-drift: Szybkie przeciągnięcia obiektu lub szybkie tworzenie prostokąta gubiły transformację z powodu opóźnionego renderu stanu w domknięciu handlera.
2. Zmiana motywu w menu nie odświeżała natychmiast tła canvasu ani podziałek miarek.
3. Uchwyty zmiany rozmiaru i rotacji zniekształcały się eliptycznie przy nieproporcjonalnej skali obiektu.
4. Podczas przesuwania obiektu pod kursorem wyświetlała się zielona etykieta z relatywnym przesunięciem `ΔX/ΔY`.
5. W kontrolce `ColorControl` próbnik, kod HEX i przycisk None kolidowały ze sobą w węższych panelach.
6. Kliknięcie w odczyt zoomu w topbarze sztywno ustawiało 100%, brakowało cyklu presetów i manualnego wprowadzania.
7. Menu Obiekt było zaśmiecone 7 pozycjami podmenu „Zaznacz podobne”.
8. Miarka w trybie ciemnym nie miała spójnego odcienia z panelami, a w trybie jasnym brakowało dedykowanego tokenu.

## Implementation
1. **Pewne commity gestów (`CanvasViewport.tsx`)**: Dodano `dragPreviewRef`, `stylePreviewRef` oraz `pathPreviewRef`; commity odczytują wartości bezpośrednio z referencji; znormalizowano współrzędne ekranowe w `create-shape`; zabezpieczono anulowanie w `cancelInteraction`.
2. **Odświeżanie motywu (`CanvasViewport.tsx`, `CanvasRulers.tsx`)**: Dodano `MutationObserver` unieważniający pętlę renderu przy zmianie `data-theme`; w `CanvasRulers` dodano `currentTheme` do zależności rAF.
3. **Kompensacja skali uchwytów (`packages/renderer/src/index.ts`)**: Funkcje `drawResizeHandles` i `drawRotationHandle` dzielą rozmiary przez `Math.abs(scale.x || 1)` i `Math.abs(scale.y || 1)`.
4. **Usunięcie etykiety `ΔX/ΔY` (`CanvasViewport.tsx`, `packages/renderer/src/index.ts`)**: Usunięto branch `move-object` z `smartDistance`; ograniczono renderowanie tekstu do `options.smartDistance.hover`.
5. **Layout `ColorControl.tsx`**: Zwiększono odstęp do 12px, dodano responsywne pole HEX (`flex: 1 1 78px`, min 64px) z wyrównaniem do prawej.
6. **Zoom readout (`AppMenuBar.tsx`, `TopBar.tsx`, `EditorApp.tsx`, `editor.css`)**: Dodano presety `[0.25, 0.5, 0.75, 0.87, 1, 1.5]`, cykliczne przełączanie na kliknięcie oraz pole `.zoom-input` aktywowane po przytrzymaniu przez 500 ms.
7. **Uporządkowanie menu (`AppMenuBar.tsx`, `TopBar.tsx`, `EditorApp.tsx`)**: Usunięto 7 pozycji podmenu Zaznacz podobne z menu Obiekt.
8. **Tokeny kolorów (`themes.css`, `CanvasRulers.tsx`)**: Wprowadzono `--color-ruler: #262624` (dark) i `#f2f2ed` (light).

## Validation
- `pnpm typecheck`: 0 błędów w 7 pakietach monorepo.
- `pnpm lint`: 0 błędów, 0 ostrzeżeń.
- `pnpm test`: 82 pliki testowe, 427 testów zdanych (100% PASS), w tym nowy `handles.test.ts`.
- `pnpm test:e2e`: 40 testów Playwright E2E zdanych (100% PASS), w tym nowy `fast-gesture.spec.ts`.
- `pnpm build`: Pomyślny build produkcyjny web app (2.46s).

## Files Changed
- `BACKLOG.md`
- `apps/web/e2e/editor.spec.ts`
- `apps/web/e2e/fast-gesture.spec.ts`
- `apps/web/src/app/EditorApp.tsx`
- `apps/web/src/app/editor.css`
- `apps/web/src/features/canvas/CanvasRulers.tsx`
- `apps/web/src/features/canvas/CanvasViewport.tsx`
- `apps/web/src/features/panels/PropertiesPanel.tsx`
- `apps/web/src/features/properties/DocumentProperties.tsx`
- `apps/web/src/features/topbar/AppMenuBar.tsx`
- `apps/web/src/features/topbar/TopBar.tsx`
- `packages/renderer/src/index.ts`
- `packages/renderer/test/handles.test.ts`
- `packages/ui/src/primitives/ColorControl.tsx`
- `packages/ui/src/primitives/NumberInput.tsx`
- `packages/ui/src/tokens/themes.css`
- `plans/PLAN_FIX-SESSION_ui_ux_8_bledow.md`
- `dump/2026-09-05_1638_vectoria_fix-session_ui_ux_8_bledow.md`
- `progress_log/2026-09-05_1638_vectoria_fix-session_ui_ux_8_bledow.md`

## Outcome
Wszystkie 8 zgłoszonych błędów i uwag UX zostało trwale rozwiązanych bez naruszenia kontraktów domenowych i architektury edytora.

## Known Limitations
Brak znanych ograniczeń w ramach zrealizowanego zadania.
