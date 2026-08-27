# Dump: EPIC-11: Warstwy, obiekty i assety (LAYER-001 – LAYER-021)

- **Data:** 2026-08-27
- **Autor:** Antigravity AI
- **Zakres:** EPIC-11 (`LAYER-001` do `LAYER-021`)
- **Status:** DONE (wszystkie 21 tasków zrealizowane)

---

## 1. Cel i zakres implementacji

Kompleksowa implementacja systemu zarządzania warstwami, hierarchią obiektów, szablonami, trybami podglądu (Outline View, Solo Mode) oraz panelem zasobów (Assets Panel: Symbole, Komponenty, Style, Palety) w architekturze edytora grafiki wektorowej Vectoria.

Wszystkie mutacje dokumentu realizowane są deterministycznymi komendami atomowymi z pełną obsługą Undo/Redo oraz walidacją niezmienników modelu.

---

## 2. Zrealizowane taski (Definition of Done)

- [x] **LAYER-001** Dodać panel Layers (`LayersPanel.tsx`)
- [x] **LAYER-002** Tworzyć warstwy (`CreateLayerCommand`)
- [x] **LAYER-003** Usuwać warstwy (`DeleteLayerCommand`, ochrona ostatniej warstwy, czyszczenie referencji masek)
- [x] **LAYER-004** Zmieniać nazwę warstwy (`RenameLayerCommand` z inline input)
- [x] **LAYER-005** Dodać kolor etykiety warstwy (`labelColor`, 8 kolorów akcentu, swatche w panelu i w widoku)
- [x] **LAYER-006** Obsłużyć grupy i podgrupy bez sztucznego limitu głębokości (rekurencyjne drzewo `renderHierarchyItem`)
- [x] **LAYER-007** Dodać drag-and-drop porządku warstw (HTML5 Drag & Drop z wizualnym wskaźnikiem i pojedynczym commitem)
- [x] **LAYER-008** Dodać widoczność warstwy (przełącznik oka, wykluczenie z renderera i eksportu SVG)
- [x] **LAYER-009** Dodać blokadę warstwy (kłódka w panelu, ochrona przed edycją obiektów)
- [x] **LAYER-010** Dodać blokadę wybranych atrybutów obiektu (`lockedAttributes: ('position' | 'size' | 'rotation' | 'style' | 'content')[]`, `LockObjectAttributesCommand`)
- [x] **LAYER-011** Zaznaczać wszystkie elementy warstwy (przycisk i callback `onSelectAllInLayer`)
- [x] **LAYER-012** Przenosić obiekty między warstwami (`MoveObjectsToLayerCommand` z zachowaniem macierzy transformacji)
- [x] **LAYER-013** Dodać Template Layer (`isTemplate`, dimming 50% w canvasie, automatyczne blokowanie i pomijanie w eksporcie)
- [x] **LAYER-014** Dodać Outline View (`Ctrl+Y` / `Cmd+Y`, wireframe render bez wypełnień z kolorami warstw)
- [x] **LAYER-015** Dodać Solo Mode (`Alt+S`, efemeryczna izolacja aktywnej warstwy z banerem ostrzegawczym)
- [x] **LAYER-016** Dodać wyszukiwarkę w warstwach (filtrowanie tekstowe z automatycznym rozwijaniem ścieżki przodków)
- [x] **LAYER-017** Dodać filtrowanie warstw (przyciski filtrów: Wszystko, Zablokowane, Ukryte, Tekst, Ścieżki, Grupy)
- [x] **LAYER-018** Zbudować panel Assets (`AssetsPanel.tsx` z 4 zakładkami)
- [x] **LAYER-019** Przechowywać symbole w Assets (widok symboli z biblioteki i dokumentu)
- [x] **LAYER-020** Przechowywać komponenty w Assets (komponenty z instancjami)
- [x] **LAYER-021** Przechowywać style i brand assets w Assets (`doc.objectStyles`, `doc.palettes`)

---

## 3. Zmiany per plik (Changes Per File)

### `docs/adr/ADR_012_LAYER_SYSTEM_AND_ASSETS.md`
- **Stan przed:** Brak pliku.
- **Stan po:** Nowy dokument ADR definiujący architekturę hierarchii warstw, atrybutów blokad, szablonów, trybów renderingu oraz panelu Assets.
- **Cel:** Udokumentowanie decyzji architektonicznych i kontraktów domenowych zgodnie z AGENTS.md.

### `packages/core/src/model/types.ts`
- **Stan przed:** Model `Layer` zawierał podstawowe pola `id, name, visible, locked, opacity, blendMode, objectIds`. Brak `labelColor` i `isTemplate`. Brak `LockedAttribute` w `SceneObjectBase`.
- **Stan po:** Dodano opcjonalne pola `labelColor?: string` i `isTemplate?: boolean` do `Layer`. Dodano `export type LockedAttribute = 'position' | 'size' | 'rotation' | 'style' | 'content'` oraz `lockedAttributes?: readonly LockedAttribute[]` do `SceneObjectBase`.
- **Cel:** Rozszerzenie modelu domenowego o metadane warstw i granularne blokady.

### `packages/core/src/model/invariants.ts`
- **Stan przed:** Brak walidacji niezmienników dla `labelColor`, `isTemplate` i `lockedAttributes`.
- **Stan po:** Dodano walidację formatu hex `labelColor`, poprawności typów w `lockedAttributes` i unikalności wartości.
- **Cel:** Gwarancja spójności stanu dokumentu w `validateInvariants`.

### `packages/core/src/commands/layer-commands.ts`
- **Stan przed:** Brak dedykowanego modułu komend warstw.
- **Stan po:** Nowy moduł zawierający 7 komend atomowych (`CreateLayerCommand`, `DeleteLayerCommand`, `RenameLayerCommand`, `UpdateLayerPropertiesCommand`, `ReorderLayersCommand`, `MoveObjectsToLayerCommand`, `LockObjectAttributesCommand`).
- **Cel:** Pełna obsługa Undo/Redo operacji na warstwach z zachowaniem niezmienników (ochrona ostatniej warstwy, czyszczenie referencji).

### `packages/core/src/commands/index.ts` & `packages/core/src/index.ts`
- **Stan przed:** Brak eksportu komend warstw.
- **Stan po:** Wyeksportowano komendy warstw i typy powiązane.
- **Cel:** Dostępność komend dla warstwy UI i engine.

### `packages/core/test/layer-commands.test.ts`
- **Stan przed:** Brak testów komend warstw.
- **Stan po:** 9 testów jednostkowych weryfikujących tworzenie, usuwanie, zmianę nazwy, reordering, template layers, przenoszenie obiektów i blokady atrybutów z walidacją `execute -> undo -> redo`.
- **Cel:** Pokrycie testami jednostkowymi warstwy domenowej komend.

### `packages/io/src/schema/document-v1.ts`
- **Stan przed:** `LayerSchema` i `SceneObjectBaseSchema` nie uwzględniały nowych pól.
- **Stan po:** Zaktualizowano Zod schema o `labelColor`, `isTemplate` i `lockedAttributes`.
- **Cel:** Walidacja wejścia na granicach deserializacji dokumentu `.vct`.

### `packages/io/src/svg/export.ts`
- **Stan przed:** Eksporter SVG przetwarzał wszystkie warstwy dokumentu.
- **Stan po:** Pomijanie warstw z `isTemplate === true` oraz `visible === false`.
- **Cel:** Zgodność ze specyfikacją Template Layer (warstwa pomocnicza niewidoczna w eksporcie produkcyjnym).

### `packages/renderer/src/index.ts`
- **Stan przed:** `renderScene` przyjmował podstawowe opcje bez trybów Outline i Solo.
- **Stan po:** Dodano opcje `outlineMode?: boolean` oraz `soloLayerId?: string | null`. Zaimplementowano renderowanie wireframe bez wypełnień w Outline Mode oraz przyciemnienie 50% opacity dla Template Layer.
- **Cel:** Wsparcie widoków podglądu w silniku renderowania sceny Canvas 2D.

### `packages/ui/src/icons/VectoriaIcon.tsx`
- **Stan przed:** Brak ikon dla warstw szablonu, widoku outline, solo mode, filtrów i zasobów.
- **Stan po:** Dodano ikony wektorowe `templateLayer`, `outlineView`, `soloMode`, `filter`, `folder`, `search`, `numberedList`.
- **Cel:** Spójne ikony SVG w interfejsie użytkownika.

### `apps/web/src/features/panels/LayersPanel.tsx`
- **Stan przed:** Uproszczona, płaska lista warstw bez drag-and-drop, filtrów i zagnieżdżeń.
- **Stan po:** Kompletny, hierarchiczny komponent drzewa warstw z obsługą grup, inline rename, swatches etykiet, DND reorderingu, wyszukiwania z widocznością ścieżki i filtrów typów.
- **Cel:** Pełna realizacja wymagań UI panelu warstw (`LAYER-001` - `LAYER-017`).

### `apps/web/src/features/panels/AssetsPanel.tsx`
- **Stan przed:** Brak pliku.
- **Stan po:** Nowy panel zasobów z zakładkami: Symbole, Komponenty, Style (`doc.objectStyles`), Palety (`doc.palettes`).
- **Cel:** Realizacja wymagań `LAYER-018` - `LAYER-021`.

### `apps/web/src/features/panels/RightDock.tsx`
- **Stan przed:** Posiadał panele properties, layers, history, used-fonts.
- **Stan po:** Dodano panel `'assets'` (Zasoby) oraz przekazywanie callbacków layer managera.
- **Cel:** Integracja panelu Assets w prawym doku.

### `apps/web/src/features/topbar/AppMenuBar.tsx` & `TopBar.tsx`
- **Stan przed:** Brak skrótów dla Outline View i Assets.
- **Stan po:** Dodano pozycję menu Widok -> "Widok konturów (Outline View) Ctrl+Y" oraz Okno -> "Zasoby".
- **Cel:** Dostępność funkcji z poziomu menu głównego aplikacji.

### `apps/web/src/features/canvas/CanvasViewport.tsx`
- **Stan przed:** Brak przekazywania `outlineMode` i `soloLayerId` do renderera.
- **Stan po:** Przekazywanie parametrów `outlineMode` i `soloLayerId` do `renderScene`.
- **Cel:** Podgląd na żywo Outline View i Solo Mode w viewport.

### `apps/web/src/app/EditorApp.tsx`
- **Stan przed:** Brak obsługi stanu `outlineMode`, `soloLayerId` i komend warstw.
- **Stan po:** Dodano stan i skróty klawiszowe (`Ctrl+Y` / `Cmd+Y` dla Outline View, `Alt+S` dla Solo Mode), baner Solo Mode z przyciskiem wyjścia oraz handlery komend warstw.
- **Cel:** Koordynacja stanu aplikacji i interakcji użytkownika.

### `apps/web/src/app/editor.css`
- **Stan przed:** Brak stylów dla drzewa hierarchicznego, banera solo mode i panelu assets.
- **Stan po:** Dodano kompletną stylizację CSS z tokenami Design System (`layer-item`, `badge`, `solo-banner`, `asset-card`, etc.).
- **Cel:** Spójny wygląd i wysoka estetyka zgodna z `DESIGN_SYSTEM.md`.

### `apps/web/e2e/editor.spec.ts`
- **Stan przed:** Brak testów E2E dla panelu warstw i zasobów.
- **Stan po:** Dodano test E2E weryfikujący tworzenie warstw, warstwę szablonu, filtrowanie wyszukiwarką i przełączanie panelu zasobów.
- **Cel:** Automatyczna weryfikacja end-to-end w Playwright.

### `BACKLOG.md`
- **Stan przed:** Zadania `LAYER-001` - `LAYER-021` nieoznaczone jako zakończone.
- **Stan po:** Oznaczono zadania `LAYER-001` - `LAYER-021` jako ukończone `[x]`.
- **Cel:** Aktualizacja stanu backlogu.

---

## 4. Walidacja Quality Gates

| Narzędzie | Polecenie | Status |
|---|---|---|
| **Typecheck** | `pnpm typecheck` | PASS (0 błędów w 7 pakietach) |
| **Linter** | `pnpm lint` | PASS (0 błędów, 0 ostrzeżeń) |
| **Unit / Integration Tests** | `pnpm test` | PASS (42 pliki testowe, 264 testy) |
| **Production Build** | `pnpm build` | PASS (bundle Vite wygenerowany w 4.99s) |
| **E2E Tests** | `pnpm --filter @vectoria/web test:e2e` | PASS (17/17 testów Playwright) |

---

## 5. Następny krok

Przejście do kolejnego epicu z backlogu: **EPIC-12: Obrazy i zasoby zewnętrzne** (`ASSET-001` do `ASSET-010`).
