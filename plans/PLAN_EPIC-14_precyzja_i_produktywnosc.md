# EPIC-14: Precyzja i produktywność — Plan Implementacji v2

> Wersja: 2.0 — 2026-09-02
> Zastępuje odrzucony plan v1 (audyt bez `file:line`, złe ścieżki, otwarte decyzje, naruszenia granic pakietów).
> Status: **gotowy do akceptacji**. Checklist §3.1/§3.2 AGENTS.md odhaczona na końcu dokumentu.

---

## 1. Rezultat użytkownika i granica scope

Po wdrożeniu użytkownik będzie mógł:

1. Wpisywać w polach liczbowych wyrażenia matematyczne z procentami (`50+10%`, `100/3`) i szybko przełączać jednostkę pola (PROD-007/008/009).
2. Kopiować/wklejać obiekty przez schowek z paste in place, paste on all artboards oraz duplicate & transform (PROD-010..015).
3. Zaznaczać wszystkie obiekty o tych samych atrybutach (fill/stroke/font/rozmiar/opacity/typ) jednym poleceniem (PROD-016..021).
4. Szukać i masowo zamieniać tekst oraz style z podglądem wyniku przed aplikacją (PROD-022/023).
5. Uruchamiać wszystkie akcje z Command Palette (Cmd/Ctrl+K) (PROD-024).
6. Konfigurować skróty klawiszowe z wykrywaniem konfliktów i resetem (PROD-025/026).
7. Zapisywać własne presety układu interfejsu (PROD-027).

**Wchodzi:** PROD-001…027 (BACKLOG.md:508-534).
**Nie wchodzi:** Smart Guides / advanced snap (inny epik), AI w Command Palette (epic Reguła: "command-first, najpierw deterministyczne actions"), zmiana schematu `.vct` (ClipboardFragment jest kontraktem sesyjnym, nie persistence — patrz ADR-010).

---

## 2. Status audytu vs kod (zweryfikowane `file:line`)

| Task | Status | Dowód | Brakuje |
|---|---|---|---|
| PROD-001 Properties kontekstowy | PARTIAL | `apps/web/src/features/panels/PropertiesPanel.tsx:158-162` (Object/Artboard heading), `RightDock.tsx:271` | Document inspector przy pustej selekcji |
| PROD-002 Inspector dokumentu | MISSING | Brak pliku; fragmenty: `PropertiesPanel.tsx:53` (`onUpdateUnit`), `SetDocumentUnitCommand` `document-commands.ts:1357` | Dedikowany panel + unit switch UX |
| PROD-003 Inspector obiektu | PARTIAL | `PropertiesPanel.tsx:162-548`, `features/properties/GeometryProperties.tsx`, `features/panels/AppearancePanel.tsx` | Konsolidacja sekcji (collapse) — niski priorytet |
| PROD-004 Inspector tekstu | PARTIAL | `PropertiesPanel.tsx:313-548` (fonty, variable axes, kolumny, listy, text-on-path) | Działa end-to-end; brak dedykowanego panelu — **decyzja: nie wydzielamy** (ryzyko regresji > wartość) |
| PROD-005 Inspector fill | PARTIAL | `AppearancePanel.tsx`; `SetObjectStyleCommand` `document-commands.ts:569-651` | — |
| PROD-006 Inspector stroke | PARTIAL | `AppearancePanel.tsx`; arrowheads `PropertiesPanel.tsx:307-312` | — |
| PROD-007 Wyrażenia matematyczne | PARTIAL | `parseNumericExpression` `packages/shared/src/units.ts:25-91` (bezpieczny recursive descent, bez eval); wołane w `packages/ui/src/primitives/NumberInput.tsx:42` | Inline `%` (`50+10%`), sufiksy jednostek, feedback błędu |
| PROD-008 Procenty | PARTIAL | Parser wspiera trailing `%` z `percentBase` (`units.ts:88-90`), ale `NumberInput.tsx:42` **nigdy nie przekazuje `percentBase`** → `%` nie działa w UI | Przekazanie bazy + inline `%` |
| PROD-009 Jednostki | PARTIAL | `convertUnit` `packages/shared/src/units.ts:19`; per-field unit w `PropertiesPanel.tsx:168`; `SetDocumentUnitCommand` `document-commands.ts:1357` | Szybkie przełączanie jednostki **w polu** |
| PROD-010 Copy | PARTIAL | `EditorApp.tsx:1288-1289` (`clipboardRef` in-memory) | Serializacja, schowek systemowy, limit/walidacja |
| PROD-011 Paste keep style | PARTIAL | `EditorApp.tsx:1290-1301` (`structuredClone` zachowuje style, nowe ID ✓) | Regeneracja node IDs (paths!), policy warstw |
| PROD-012 Paste keep position | MISSING | Paste zawsze dodaje offset +20 (`EditorApp.tsx:1297`) | Tryb in-place |
| PROD-013 Paste in place | MISSING | — | Komenda + UI |
| PROD-014 Paste on all artboards | MISSING | — | Komenda + target policy |
| PROD-015 Duplicate & transform | PARTIAL | Cmd+D `EditorApp.tsx:1302-1307` (fixed offset); `DuplicateObjectsCommand` `document-commands.ts:424-460`; `RepeatTransformCommand` `:557-565` | Duplicate ze skumulowaną transformacją (transform-again na kopi) |
| PROD-016..021 Select Same | MISSING | Brak czegokolwiek; `SelectionService` ma tylko marquee/lasso (`selection-service.ts:46-93`) | Matcher + selekcja + menu |
| PROD-022 Find/Replace Object (tekst) | PARTIAL | `apps/web/src/features/dialogs/FindReplaceDialog.tsx:1-213` (regex, matchCase, wholeWord, lista matchy); `BatchReplaceTextCommand` `text-commands.ts:349`; `SetTextContentCommand` `:105` | Ekstrakcja query do core (testowalność), replace-all jako jedna komenda w dialogu |
| PROD-023 Find/Replace Style | MISSING | — | Query + batch command + UI |
| PROD-024 Command Palette | MISSING | Brak plików; Cmd/Ctrl+K nieprzypisane (plain `k` = knife, `EditorApp.tsx:1368-1370` — **bez kolizji**, palette wymaga modyfikatora) | Rejestr + UI + wiring |
| PROD-025 Domyślne skróty | PARTIAL | Hardcode `EditorApp.tsx:1341-1383`: V✓(1344) A✓(1346) R✓(1350) L✓(1352) T✓(1356) P✓(1358); hand na `h`(1378) | Space-pan do weryfikacji w `CanvasViewport.tsx`; ekstrakcja do ShortcutManager |
| PROD-026 Konfiguracja skrótów | MISSING | — | ShortcutManager + dialog + storage |
| PROD-027 Presety interfejsu | MISSING | Tylko theme w localStorage (`EditorApp.tsx:182,241`); `RightDock.tsx:230` lokalny stan panelu bez persistencji | Presety układu + storage |

Wniosek: 9× PARTIAL, 18× MISSING/brak-UI. Fundamenty (parser, komendy, dialog Find/Replace, SelectionService) istnieją — plan je **rozszerza**, nie tworzy równoległej architektury.

---

## 3. Decyzje rozstrzygnięte PRZED implementacją

| # | Decyzja | Uzasadnienie |
|---|---|---|
| D1 | **Parser**: rozszerzamy istniejący `parseNumericExpression` w `packages/shared/src/units.ts`. Bez `mathjs` i bez nowego dependency. | Już jest centralnym parserem (`NumberInput.tsx:2`), bezpieczny (regex whitelist `units.ts:31`), przetestowany. Zerowy koszt bundle. |
| D2 | **Semantyka `%`**: `%` zawsze względem **bieżącej wartości pola** (`percentBase` = value). Inline: `100+10%` = 110; `200*10%` = 20. Trailing `%` zachowuje obecną semantykę (back-compat: bez bazy → `null`, `units.ts:89`). | Standard branżowy (Figma/AI); jednoznaczne; nie wymaga kontekstu poza wartością pola. |
| D3 | **Sufiksy jednostek w wyrażeniach** (`2cm+10px`): **Etap 0.2**, nie 0.1. W 0.1 tylko liczby + `%`. | Ogranicza ryzyko 0.1; pola już pokazują/akceptują jednostkę docelową przez `convertUnit`. |
| D4 | **Format schowka**: typ `ClipboardFragment` w `core` (kontrakt), serializacja + walidacja Zod w `io` (reuse `SceneObjectSchema` z `packages/io/src/schema/document-v1.ts:385`). Wewnątrz aplikacji clipboard = in-memory fragment (synchroniczny, niezawodny). Schowek systemowy: `application/x-vectoria-fragment` (JSON) + `text/plain` (SVG fragmentu przez `io/svg/export.ts`). Odczyt: prefer custom MIME → fallback: parsowanie `text/plain` jako SVG przez sanityzowany `io/svg/import.ts`. Limity: **200 obiektów / 5 MB JSON**. | Interop bez ryzyka; input nieufny walidowany na granicy (§6 AGENTS); SVG fallback działa z zewnętrznymi edytorami. |
| D5 | **Storage skrótów i presetów**: `localStorage` (local-first), klucze `vectoria.shortcuts.v1` / `vectoria.layout-presets.v1`, walidacja JSON + reset na corruption. **Nie IndexedDB.** | Epic Reguła "storage local-first"; małe payloady; precedens: theme już w localStorage (`EditorApp.tsx:182`); zero workerów/migracji. ADR-011. |
| D6 | **Select Same**: pure matcher w `core/src/query/select-same.ts` (normalizacja przez `normalizeColor`, tolerancja liczb `1e-6`). Wynik = `ObjectId[]`. Zmiana selekcji przez **istniejący** `SelectionService.selectObjects` (`selection-service.ts:26-32`). **Bez Command, bez historii** — selekcja to stan engine, nie dokument. | Architektura: core nie może mutować selekcji engine; command w historii dla selekcji łamie §4 (tylko mutacje dokumentu są commandami). Naprawia błąd v1. |
| D7 | **Find/Replace Style**: query (kryteria → pary obiektów) liczy dialog/preview; Apply = **jedna** `ReplaceStylesBatchCommand` (wzorzec `previousStyles: Map` jak `SetObjectStyleCommand:572`). Bez cichej masowej mutacji (epic Reguła). | Jedna komenda = jeden Undo; podgląd przed apply. |
| D8 | **Command Palette**: rejestr `EditorCommand` (kontrakt z epic L26) w **engine** jako pure service (bez Reacta); aplikacja rejestruje akcje (mieszają komendy + otwieranie dialogów — to zawsze UI orchestration). UI w `apps/web`. | Engine nie importuje Reacta (§3); akcje injektowane z app = brak odwróconej zależności. |
| D9 | **ShortcutManager**: pure service w engine (normalizacja, konflikty, match, defaults). **Persistencja w apps/web** (hook `useShortcutSettings` → localStorage). Guard focus: `input`/`textarea`/`[contenteditable]` — rozszerzenie istniejącego guarda `EditorApp.tsx:1279-1283`. | Engine bez IO i DOM (§3). Naprawia błąd v1 (IndexedDB w engine). |
| D10 | **Paste policy**: `offset` = +20/+20 (zachowane, `EditorApp.tsx:1297`); `in-place` = source world position bez offsetu; `all-artboards` = kopia na każdym artboardzie w tych samych world coords; target = aktywna warstwa; jeden wpis historii. | Epic Reguła "paste in place używa source world transform; paste all artboards ma wyraźną target policy". |
| D11 | **Menu**: rozszerzamy istniejący `AppMenuBar.tsx` (Edit menu, linia 120-122), **nie** tworzymy `EditMenu.tsx` (błąd v1). | Menu już istnieje z systemem `MenuItem`. |
| D12 | **PROD-004 Inspector tekstu**: bez wydzielania `TextProperties.tsx`. Sekcja typografii zostaje inline w `PropertiesPanel` (+ ewentualne collapsed sections w 0.2). | 235 linii działającego kodu; ekstrakcja = czysty refactor bez funkcji użytkowej, wysokie ryzyko regresji (N-07: no creative optimization). |

### Wymagane ADR (przed implementacją, pattern: `ADR_008…`, `ADR_009…` w root)

- **`ADR_010_Clipboard_Fragment_i_Paste_Policy.md`** — kontrakt `ClipboardFragment`, strategia schowka systemowego, tryby paste, regeneracja ID.
- **`ADR_011_Shortcut_i_Layout_Preset_Storage.md`** — localStorage local-first, walidacja, reset, brak wpływu na DocumentModel.

---

## 4. Pliki per warstwa

### `packages/shared` (MODIFY)

| Plik | Zmiana | Cel |
|---|---|---|
| `src/units.ts` | Rozszerz `parseNumericExpression`: inline `%` jako postfix operatora primary; nowy opcjonalny parametr pozycyjny bez zmiany istniejącej sygnatury (`input, percentBase?`) | PROD-007/008; back-compat |

### `packages/core` (NEW + MODIFY)

| Plik | Zmiana | Cel |
|---|---|---|
| `src/clipboard/clipboard-fragment.ts` | **NEW**: interfejs `ClipboardFragment` (kontrakt epic L27) + `cloneObjectsWithNewIds()` (nowe ID obiektów **i path node IDs**) | PROD-010..014 |
| `src/commands/paste-commands.ts` | **NEW**: `PasteObjectsCommand` (tryby `offset`/`in-place`/`all-artboards`) | PROD-012/013/014 |
| `src/commands/duplicate-transform-command.ts` | **NEW**: `DuplicateTransformCommand` (klon + delta transform na kopii) | PROD-015 |
| `src/query/select-same.ts` | **NEW**: `SelectSameCriteria`, `selectSame(doc, sourceIds, criteria): ObjectId[]` | PROD-016..021 |
| `src/query/find-text.ts` | **NEW**: ekstrakcja logiki matchy z `FindReplaceDialog.tsx:36-60` (regex, matchCase, wholeWord → `FindTextMatch[]`) | PROD-022 (testowalność, reuse) |
| `src/query/find-style.ts` | **NEW**: `findObjectsByStyleCriteria(doc, criteria): ObjectId[]` | PROD-023 |
| `src/commands/replace-styles-command.ts` | **NEW**: `ReplaceStylesBatchCommand` (mapa `ObjectId → Partial<ObjectStyle>`, undo z `previousStyles`) | PROD-023 |
| `src/commands/index.ts` | MODIFY: exports nowych symboli | API |
| `src/index.ts` | MODIFY: exports query + clipboard | API |

### `packages/editor-engine` (NEW + MODIFY)

| Plik | Zmiana | Cel |
|---|---|---|
| `src/commands/shortcut-manager.ts` | **NEW**: `ShortcutManager` — normalizacja combo (`Cmd`/`Ctrl` per platforma), wykrywanie konfliktów, `match(event, context)`, `DEFAULT_SHORTCUTS` (V, A, P, T, R, L, Space + istniejące). Bez DOM, bez IO. | PROD-025/026 |
| `src/commands/command-registry.ts` | **NEW**: `CommandRegistry` + typy `EditorCommand`, `EditorContext` (kontrakt epic L26); `register/list/search` | PROD-024 |
| `src/index.ts` | MODIFY: exports | API |

**Bez zmian**: `selection-service.ts` (`selectObjects` istnieje, `:26`), `tools/*` — skróty narzędzi zostają obsługiwane przez `EditorApp` handler, ale decyzje przenosi `ShortcutManager`.

### `packages/io` (NEW + MODIFY)

| Plik | Zmiana | Cel |
|---|---|---|
| `src/clipboard/clipboard-schema.ts` | **NEW**: `ClipboardFragmentSchema` (Zod; reuse `SceneObjectSchema`, `Transform2DSchema` z `schema/document-v1.ts`) + limity | PROD-010; walidacja nieufnego inputu (§6) |
| `src/clipboard/clipboard-serialization.ts` | **NEW**: `serializeFragment(fragment): string`, `deserializeFragment(json): Result<ClipboardFragment, ClipboardParseError>`; SVG fragmentu przez istniejący `svg/export.ts` | Round-trip, fallback text/plain |
| `src/index.ts` | MODIFY: exports | API |

### `packages/ui` (MODIFY)

| Plik | Zmiana | Cel |
|---|---|---|
| `src/primitives/NumberInput.tsx` | Dodaj: `percentBase?: number`, `onUnitCycle?: () => void` (klik w etykietę jednostki = szybki switch), stan błędu parse (czerwona obwódka tokenem `--color-danger`, `aria-invalid`, `role="alert"`), przekazanie `percentBase` do parsera | PROD-007/008/009 |
| `test/NumberInput.test.tsx` | MODIFY: testy percent/error/unit-cycle | Regresja |

### `apps/web` (NEW + MODIFY)

| Plik | Zmiana | Cel |
|---|---|---|
| `src/features/clipboard/clipboard-service.ts` | **NEW**: copy (fragment + system clipboard async, fire-and-forget z catch), paste (internal fragment → walidacja → komenda; fallback SVG), read-failure handling | PROD-010..014 |
| `src/features/palette/CommandPalette.tsx` | **NEW**: 640 px, focus trap, search input, ↑/↓/Enter, Escape close, `aria-label`, shortcut badges, disabled + reason | PROD-024 |
| `src/features/properties/DocumentProperties.tsx` | **NEW**: inspektor przy pustej selekcji: nazwa dokumentu, jednostka (select → `SetDocumentUnitCommand`), artboard (W/H/background → `UpdateArtboardCommand` `document-commands.ts:1312`), statystyki (liczba obiektów/warstw) | PROD-001/002 |
| `src/features/dialogs/ShortcutConfigDialog.tsx` | **NEW**: lista skrótów, capture nowego combo, konflikt → blokada + komunikat, reset defaults | PROD-026 |
| `src/features/dialogs/FindReplaceDialog.tsx` | MODIFY: zakładki `Tekst` / `Style`; tryb Style = kryteria (fill kolor, stroke width, opacity, font, typ) + podgląd + Apply | PROD-022/023 |
| `src/features/panels/PropertiesPanel.tsx` | MODIFY: `!selected` → render `DocumentProperties` (zamiast nagłówka "Artboard Properties") | PROD-001/002 |
| `src/features/topbar/AppMenuBar.tsx` | MODIFY: Edit menu — Copy/Paste/Paste in Place/Paste on All Artboards/Duplicate & Transform/Select Same (submenu 6 pozycji)/Find & Replace/Command Palette | Menu workflow |
| `src/app/EditorApp.tsx` | MODIFY: (a) usuń inline clipboard/duplicate z `:1288-1307` → `clipboard-service`; (b) keydown handler przez `ShortcutManager` (guard focus rozszerzony o `contenteditable`); (c) Cmd/Ctrl+K → palette; (d) handlery Select Same; (e) presety layoutu | Integracja |
| `src/hooks/useShortcutSettings.ts` | **NEW**: localStorage load/save/reset + walidacja + fallback defaults | PROD-026 |
| `src/hooks/useLayoutPresets.ts` | **NEW**: save/load/usuń presety `{ name, rightDockOpen, activePanel, theme }`, walidacja, corrupted → reset | PROD-027 |

**Nie dotykamy**: `PropertiesPanel` sekcji typografii (D12), `RightDock` struktury (tylko sterowanie `activePanel`/open z zewnątrz), renderera, `.vct` schema.

---

## 5. Commands i Undo/Redo

| Komenda | Status | `execute` | `undo` |
|---|---|---|---|
| `PasteObjectsCommand` | NEW | Klonuje fragment z nowymi ID (obiekty + path nodes), wstawia do aktywnej warstwy wg trybu | Usuwa utworzone ID ze wszystkich dotkniętych warstw (wzorzec `DuplicateObjectsCommand.undo` `document-commands.ts:452-459`) |
| `DuplicateTransformCommand` | NEW | Klon + aplikuje deltę transform (position/rotation/scale) do **kopii** | Usuwa kopie |
| `ReplaceStylesBatchCommand` | NEW | Aplikuje mapę patchy stylów; pomija locked; odrzuca `NaN`/opacity poza `[0,1]` | Przywraca `previousStyles` (wzorzec `SetObjectStyleCommand.undo` `:632-650`) |
| `BatchReplaceTextCommand` | **EXISTING** (`text-commands.ts:349`) — reuse dla Replace All | — | — |
| `SetDocumentUnitCommand` | **EXISTING** (`document-commands.ts:1357`) — reuse dla DocumentProperties | — | — |
| `UpdateArtboardCommand` | **EXISTING** (`document-commands.ts:1312`) — reuse | — | — |
| `CreateObjectsCommand` | **EXISTING** (`document-commands.ts:29`) — PasteObjects może delegować per-partię | — | — |

Reguły: `pointermove` bez komend (nie dotyczy), jeden drag = jedna komenda (nie dotyczy), **select same / zmiana selekcji NIE jest komendą** (stan engine), `execute` nie mutuje inputu (fragment klonowany w konstruktorze execute).

---

## 6. Invariants — jawna lista

1. **Paste regeneruje wszystkie ID**: `objectId` oraz `PathNode.id` dla paths (wzorzec: `document-commands.ts:442-444`). Zero konfliktów identyfikatorów.
2. **Paste target**: aktywna warstwa; locked layer/locked source → pominięcie (wzorzec `:438`); `CreateObjectsCommand.execute` i tak odrzuca locked (`:47`).
3. **Parser**: wynik musi być `Number.isFinite`; clamp min/max + round decimals przed `onChange` (`NumberInput.tsx:43-47` — zachowane). `NaN`/`Infinity` nigdy nie wchodzą do `DocumentModel`.
4. **Parse error**: brak mutacji modelu, revert tekstu do poprzedniej wartości, `aria-invalid` + komunikat. Bez cichego "zjedzenia" inputu bez feedbacku.
5. **Select Same / Find query**: tylko `layer.visible && !layer.locked && object.visible && !object.locked` (spójnie z marquee `selection-service.ts:48-53`).
6. **Style replace**: `opacity ∈ [0,1]`, `normalizeColor` na kolorach, porównanie JSON przed zapisem (bez no-op wpisów historii) — guardy `SetObjectStyleCommand:602-614`.
7. **Clipboard payload**: ≤ 200 obiektów, ≤ 5 MB JSON, Zod parse; odrzucenie = error UI, dokument nietknięty.
8. **Shortcuts**: ignorowane gdy `document.activeElement` to `input`/`textarea`/`isContentEditable` (rozszerzenie guarda `EditorApp.tsx:1279-1283`). Plain `k` (knife) i Cmd+K (palette) bez kolizji.
9. **Presety layoutu**: walidacja pól (`rightDockOpen: boolean`, `activePanel: znany DockPanel`, `theme`); corrupted → reset do defaults, bez crasha (§5 AGENTS).
10. **NumberInput unit cycle**: przełącza tylko **wyświetlaną** jednostkę (przeliczenie `convertUnit`), nie zmienia world geometry — brak driftu (epic Reguła).
11. Komenda zwracająca `doc` (bez zmian) nie tworzy wpisu historii (mechanizm `command.ts:77`).

---

## 7. Error / cancel / recovery

| Sytuacja | Zachowanie |
|---|---|
| Escape w NumberInput | Revert wartości + blur (istnieje, `NumberInput.tsx:62-64`) |
| Escape w Command Palette / dialogach | Close, focus wraca do canvasa / triggera |
| Błąd odczytu schowka systemowego (permissions, brak MIME) | Toast error; dokument nietknięty; internal fragment nadal działa |
| Niepoprawny JSON / payload nieprzechodzący Zod | Toast error `Nieprawidłowe dane w schowku`; brak mutacji |
| Paste gdy brak aktywnej warstwy / locked | Komenda zwraca `doc` — brak wpisu historii; status bar message |
| Konflikt skrótu w dialogu | Blokada zapisu + komunikat wskazujący kolidujące polecenie |
| Uszkodzony `vectoria.shortcuts.v1` / preset | Walidacja fail → defaults + console.warn (bez crasha) |
| Replace All na 0 matchach | Disabled Apply; brak pustej komendy |
| Anulowanie dialogu Find/Replace | Brak mutacji (apply tylko przyciskiem) |

---

## 8. Zależności międzyepiczne / międzywarstwowe

- **Typy obiektów**: `ClipboardFragmentSchema` reuse `SceneObjectSchema` (`io/src/schema/document-v1.ts:385`) — pełny zestaw typów (text-frame, image, symbol-instance) już w schemacie. Zależność od EPIC typów: **spełniona, zweryfikowana**.
- **SVG fallback paste**: zależy od istniejącego `io/src/svg/import.ts` (sanityzowany) i `io/src/svg/export.ts`.
- **Palette ↔ menu**: `CommandRegistry` rejestruje te same akcje, które obsługują `AppMenuBar` — jedna definicja, dwa wejścia.
- **Renderer**: zero zmian. **`.vct`**: zero zmian (ClipboardFragment nie jest persistowany).

---

## 9. Ryzyko regresji istniejących DONE + testy regresji

| Ryzyko | Ochrona |
|---|---|
| Wymiana inline clipboard `EditorApp.tsx:1288-1307` | E2E: copy → paste → undo (klonuje istniejący przepływ); test: nowe ID po paste, offset +20 zachowany |
| `parseNumericExpression` zmiana | Back-compat testy: trailing `%` bez bazy → `null` (`units.ts:89`); wszystkie obecne przypadki bez `%` identyczne |
| `NumberInput` nowe props | Istniejące testy `packages/ui/test/NumberInput.test.tsx` (Enter/Escape/Arrow/min-max/decimals/unit) przechodzą **bez zmian** |
| `PropertiesPanel` render `DocumentProperties` przy pustej selekcji | Visual regression: empty selection Dark/Light, DPR 1/2 |
| `AppMenuBar` nowe pozycje | E2E: menu otwiera palette/dialogi; aria-label na każdym `MenuItem` |
| Keydown handler przez ShortcutManager | Test jednostkowy tabeli: wszystkie dotychczasowe combo (`:1288-1382`) mapują 1:1 na defaults; E2E smoke narzędzi V/R/L/P/T |
| `FindReplaceDialog` zakładki | Istniejący przepływ tekstowy bez zmian jako default tab |

---

## 10. Etapowanie

**Etap 0.1 (P0 — precyzja i schowek):** PROD-007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021 + ADR-010.

Kolejność: parser → NumberInput → clipboard core/io → PasteObjectsCommand → DuplicateTransformCommand → EditorApp wiring → select-same core → menu + wiring → testy.

**Etap 0.2 (P1 — produktywność):** PROD-001, 002, 022, 023, 024, 025, 026, 027 + ADR-011 (+ konsolidacja 003/004 jeśli zostanie budżet; sufiksy jednostek D3).

Kolejność: find-text extract → Find/Replace Style → CommandRegistry + ShortcutManager → CommandPalette UI → ShortcutConfigDialog → DocumentProperties → presety → E2E.

---

## 11. Pełna macierz testów

### Unit (Vitest, `pnpm test`)

1. **Parser** (`packages/shared/test/units.test.ts`): `100/3+10 ≈ 43.33`; `20+4=24`; `50+10%` base=50 → 55; `200*10%` base=200 → 20; trailing `10%` base=200 → 20; trailing `10%` bez bazy → `null` (back-compat); `10%+5` bez bazy → `null`; `/0` → `null`; `1..2` → `null`; `abc` → `null`; `,` → `.`; wynik zawsze finite.
2. **NumberInput** (`packages/ui/test/NumberInput.test.tsx`): commit Enter/blur; Escape revert; percentBase przekazany przy `%`; error state → `aria-invalid=true` + brak `onChange`; unit cycle wywołuje `onUnitCycle` bez zmiany value; min/max clamp.
3. **PasteObjectsCommand** (`packages/core/test/paste-commands.test.ts`): 3 tryby pozycjonowania; path node IDs zregenerowane; undo → exact previous (deep equal); `execute → undo → execute` idempotentne; locked layer → `doc` bez zmian i brak wpisu historii; z-order append na końcu warstwy; all-artboards = (liczba artboardów × obiekty) kopii; immutability inputu (fragment niezmodyfikowany po execute).
4. **DuplicateTransformCommand**: delta transform tylko na kopi, oryginał nietknięty; undo usuwa kopie; execute→undo→execute.
5. **select-same** (`packages/core/test/select-same.test.ts`): fill `#fff` vs `#ffffff` match (normalizacja); stroke width eps 1e-6; font exact string; rozmiar tolerance; opacity; typ obiektu; locked/hidden wykluczone; multi-source = unia kryteriów; pusty wynik OK.
6. **ReplaceStylesBatchCommand**: batch undo exact; niepowiązane atrybuty nietknięte (JSON compare); locked pominięte; opacity 1.5 odrzucone.
7. **ShortcutManager**: normalizacja (`meta` vs `ctrl` per platforma); konflikt detect; `match()` hit/miss; `shouldIgnoreKeydown` dla input/textarea/contenteditable; defaults pokrywają obecne combo z `EditorApp.tsx:1341-1383` (test tabeli).
8. **Clipboard serialization** (`packages/io/test/clipboard.test.ts`): round-trip serialize→deserialize deep equal; odrzucenie payloadu z niedozwolonymi polami (Zod fail); limit 200 obiektów / 5 MB; błąd = `Result.err`, nie throw.
9. **find-text / find-style**: matchCase/wholeWord; Unicode (`Array.from`, spójnie z `FindReplaceDialog.tsx:54`); kryteria stylów z tolerancją.

### E2E (Playwright, `pnpm test:e2e`)

1. Rysuj rect → Cmd+C → Paste in Place (pozycja identyczna) → W = `10*5` Enter → W=50 w modelu → Cmd+K → wpisz "duplicate" → Enter → Undo ×3 → stan bazowy → Redo.
2. Dwa recty różny fill → Select Same fill → status bar pokazuje liczbę zaznaczonych.
3. Find/Replace Style: ustaw kryterium fill → podgląd 2 matchy → Apply → undo cofa oba.
4. Find/Replace tekst: replace all → undo cofa wszystkie.
5. Shortcut dialog: zmień skrót na kolidujący → błąd; reset → defaults działają.
6. Focus w text inputu: skróty narzędzi nie aktywują się podczas pisania.
7. Palette: klawiatura tylko (Cmd+K → strzałki → Enter), `aria-activedescendant` aktualizowany.

### Visual regression

- Command Palette Dark/Light, DPR 1/2.
- ShortcutConfigDialog, FindReplaceDialog (zakładka Style) Dark/Light.
- PropertiesPanel empty selection (DocumentProperties) Dark/Light.

### Performance

- `selectSame` + `findObjectsByStyleCriteria` na dokumencie 10 000 obiektów: < 100 ms (single pass O(n), brak alokacji per obiekt). Benchmark w `benchmarks/` porównany z budżetem; porcjowanie tylko jeśli benchmark pokaże przekroczenie (decyzja: NIE implementujemy porcjowania w 0.1).

### Manual

- `pnpm dev`: wpisywanie `25%+10` w X/Y/W/H; Enter commit; Escape revert.
- Wklejanie z zewnętrznego edytora (tekst SVG w schowku) → import fallback.
- Dark/Light palette + dialogi; reduced motion.

---

## 12. Quality gates (dokładne skrypty z root `package.json` — zweryfikowane)

```bash
pnpm lint         # pnpm -r lint
pnpm typecheck    # pnpm -r typecheck
pnpm test         # vitest run --passWithNoTests
pnpm test:e2e     # pnpm --filter @vectoria/web test:e2e
pnpm build        # pnpm --filter @vectoria/web build
```

Uwaga: `pnpm exec playwright test` z roota **nie istnieje** jako skrypt — używać `pnpm test:e2e`.

---

## 13. Comment rules

Publiczne metody/gettery > 3 linie dostają JSDoc (CO/DLACZEGO): `ShortcutManager.match`, `ShortcutManager.normalizeCombo`, `PasteObjectsCommand.execute`, `deserializeFragment`, `selectSame`, `CommandRegistry.search`. Helpery prywatne < 3 linie — bez komentarzy. Zero komentarzy krok-po-kroku w ciałach funkcji.

---

## 14. Przykłady kodu

### 14.1 Parser v2 — `packages/shared/src/units.ts` (MODIFY)

```ts
/** Parse safe arithmetic used by professional numeric controls. No eval.
 *  `%` is relative to `percentBase` (the field's current value):
 *  inline `100+10%` (base 100) → 110; trailing `10%` (base 200) → 20.
 *  Without `percentBase`, any `%` yields null (backward compatible). */
export function parseNumericExpression(input: string, percentBase?: number): number | null {
  const source = input.trim().replace(/,/g, '.');
  if (!source) return null;
  if (source.includes('%') && (percentBase === undefined || !Number.isFinite(percentBase))) return null;

  // Whitelist: digits, operators, parens, percent. Keeps existing charset + '%'.
  if (!/^[+\-*/().\d\s%]+$/.test(source)) return null;

  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)%?|[()+\-*/%]/g);
  if (!tokens || tokens.join('') !== source.replace(/\s/g, '')) return null;
  let index = 0;

  const parsePrimary = (): number | null => {
    const token = tokens[index];
    if (token === undefined) return null;
    if (token === '(') {
      index += 1;
      const value = parseAdditive();
      if (tokens[index] !== ')') return null;
      index += 1;
      return value;
    }
    if (!/^\d|^\./.test(token)) return null;
    index += 1;
    const isPercent = token.endsWith('%');
    const value = Number(isPercent ? token.slice(0, -1) : token);
    if (!Number.isFinite(value)) return null;
    return isPercent ? percentBase! * value / 100 : value;
  };

  // parseUnary / parseMultiplicative / parseAdditive — bez zmian, ale
  // parseMultiplicative traktuje '%' jako część primary (postfix), nie operator.
  // …(istniejące ciała funkcji bez modyfikacji)…

  const result = parseAdditive();
  if (result === null || index !== tokens.length || !Number.isFinite(result)) return null;
  return result;
}
```

Back-compat: stare wywołania trailing-`%` (`"10%"`, baza 200 → 20) dają ten sam wynik, bo `10%` = primary = `base*10/100`. Nowe: `%` działa też mid-expression. Bez bazy → wczesny `null` (`percentBase` wymagany dla jakiegokolwiek `%`).

### 14.2 NumberInput — `packages/ui/src/primitives/NumberInput.tsx` (MODIFY, diff)

```tsx
export interface NumberInputProps {
  // …istniejące props bez zmian…
  /** Base for `%` expressions; current field value in most contexts. */
  percentBase?: number;
  /** Cycle display unit on unit-label click (PROD-009). */
  onUnitCycle?: () => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({ /* …*/ percentBase, onUnitCycle, /* …*/ }) => {
  const [text, setText] = useState(() => value.toFixed(decimals));
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (newText: string) => {
    const parsed = parseNumericExpression(newText, percentBase ?? value);
    if (parsed !== null && Number.isFinite(parsed)) {
      setHasError(false);
      let clamped = parsed;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      const rounded = parseFloat(clamped.toFixed(decimals));
      onChange(rounded);
      setText(rounded.toFixed(decimals));
    } else if (newText.trim() !== value.toFixed(decimals)) {
      setHasError(true);          // feedback zamiast cichego revertu
      setText(value.toFixed(decimals));
    }
  };

  return (
    <div style={{ /* …istniejące…, borderColor: hasError ? 'var(--color-danger)' : (isFocused ? 'var(--color-border-focus)' : 'var(--color-border-subtle)') */ }}>
      <span>{label}</span>
      <input
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${testId}-error` : undefined}
        onFocus={() => { setIsFocused(true); setHasError(false); }}
        onBlur={() => { setIsFocused(false); commit(text); }}
        onKeyDown={handleKeyDown}
        /* …reszta bez zmian… */
      />
      {hasError && <span id={`${testId}-error`} role="alert" aria-live="polite">Nieprawidłowe wyrażenie</span>}
      {unit && (
        <button
          type="button"
          onClick={onUnitCycle}
          disabled={!onUnitCycle}
          aria-label={`Przełącz jednostkę (obecnie ${unit})`}
          style={{ /* tokeny, wygląd jak dotychczasowy span */ }}
        >
          {unit}
        </button>
      )}
    </div>
  );
};
```

Konwencja wywołań w panelach: `percentBase={value}` (wartość pola). Escape revert + focus-clear błędu zapobiega blokującym stanom.

### 14.3 ClipboardFragment + klonowanie — `packages/core/src/clipboard/clipboard-fragment.ts` (NEW)

```ts
import { generateId } from '@vectoria/shared';
import type { Rect, SceneObject } from '../model/types.js';

/** Session-scoped copy payload. Type-only contract (epic L27).
 *  Serialization + validation live in @vectoria/io (Zod); this module stays pure. */
export interface ClipboardFragment {
  readonly schemaVersion: 1;
  readonly objects: readonly SceneObject[];
  readonly sourceArtboardId?: string;
  readonly sourceWorldRect?: Rect;
}

/** Deep-clone fragment objects with fresh object IDs and fresh path node IDs.
 *  Path node IDs must regenerate too — they are addressed as `${objectId}:${index}`
 *  in selection state and would collide across pastes otherwise. */
export function cloneObjectsWithNewIds(objects: readonly SceneObject[]): SceneObject[] {
  return objects.map((object) => {
    const clone = structuredClone(object) as SceneObject;
    const withNewId = { ...clone, id: generateId() };
    return withNewId.type === 'path'
      ? { ...withNewId, nodes: withNewId.nodes.map((node) => ({ ...node, id: generateId() })) }
      : withNewId;
  });
}
```

### 14.4 PasteObjectsCommand — `packages/core/src/commands/paste-commands.ts` (NEW)

```ts
import type { Command } from './command.js';
import type { DocumentModel, LayerId, ObjectId, SceneObject, Transform2D } from '../model/types.js';
import { isValidTransform } from '../model/transform.js';
import { isValidPathGeometry } from '../model/path.js';
import { cloneObjectsWithNewIds, type ClipboardFragment } from '../clipboard/clipboard-fragment.js';

export type PasteMode = 'offset' | 'in-place' | 'all-artboards';

/** Paste a clipboard fragment in one undoable step.
 *  offset:       +20/+20 world offset (legacy behaviour).
 *  in-place:     keep source world position.
 *  all-artboards: one copy per artboard at the source world position,
 *                 every copy on the target layer; single history entry. */
export class PasteObjectsCommand implements Command {
  readonly type = 'PasteObjects';
  readonly description: string;
  private createdIds: ObjectId[] = [];

  constructor(
    private readonly fragment: ClipboardFragment,
    private readonly targetLayerId: LayerId,
    private readonly mode: PasteMode,
    private readonly artboardIds: readonly string[],
  ) {
    this.description = mode === 'in-place' ? 'Paste in place'
      : mode === 'all-artboards' ? 'Paste on all artboards' : 'Paste';
  }

  execute(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.targetLayerId];
    if (!layer || layer.locked) return doc;

    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };
    const objectIds = [...layer.objectIds];
    const placements = this.mode === 'all-artboards' ? this.artboardIds : [null];

    for (const _artboardId of placements) {
      for (const source of this.fragment.objects) {
        if (source.locked) continue;
        const [clone] = cloneObjectsWithNewIds([source]);
        const transform: Transform2D = this.mode === 'offset'
          ? { ...clone.transform, position: { x: clone.transform.position.x + 20, y: clone.transform.position.y + 20 } }
          : clone.transform; // in-place i all-artboards: world position bez zmian
        if (!isValidTransform(transform)) continue;
        const placed: SceneObject = {
          ...clone, layerId: this.targetLayerId, transform,
          type: clone.type === 'path' && !isValidPathGeometry(clone.nodes, clone.closed) ? clone.type : clone.type,
        };
        if (newObjects[placed.id]) continue;
        newObjects[placed.id] = placed;
        objectIds.push(placed.id);
        this.createdIds.push(placed.id);
      }
    }

    if (this.createdIds.length === 0) return doc;
    newLayers[this.targetLayerId] = { ...layer, objectIds };
    return { ...doc, objects: newObjects, layers: newLayers, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.createdIds.length === 0) return doc;
    const created = new Set(this.createdIds);
    const objects = { ...doc.objects };
    for (const id of created) delete objects[id];
    const layers = Object.fromEntries(
      Object.entries(doc.layers).map(([id, l]) => [id, { ...l, objectIds: l.objectIds.filter((oid) => !created.has(oid)) }]),
    ) as DocumentModel['layers'];
    return { ...doc, objects, layers, updatedAt: new Date().toISOString() };
  }
}
```

(Tryb `all-artboards` celowo NIE zmienia `artboardId` obiektów — obiekty w modelu są własnością warstwy, artboard to viewport meta; docelowa polityka potwierdzona w ADR-010.)

### 14.5 Select Same — `packages/core/src/query/select-same.ts` (NEW) + wiring

```ts
import type { DocumentModel, ObjectId, SceneObject } from '../model/types.js';
import { normalizeColor } from '@vectoria/shared';

export type SelectSameCriteria =
  | 'fill' | 'stroke' | 'font' | 'size' | 'opacity' | 'type';

const EPS = 1e-6;

const solidColor = (fill: SceneObject['style']['fill']): string | null =>
  fill.type === 'solid' ? normalizeColor(fill.color) : null;

/** Pure matcher: all visible, unlocked objects sharing the criteria values of
 *  the source selection. Selection state itself is engine-owned (no Command). */
export function selectSame(doc: DocumentModel, sourceIds: readonly ObjectId[], criteria: SelectSameCriteria): ObjectId[] {
  const sources = sourceIds.map((id) => doc.objects[id]).filter((o): o is SceneObject => Boolean(o));
  if (sources.length === 0) return [];
  const reference = sources[0]!;

  const matches = (candidate: SceneObject): boolean => {
    switch (criteria) {
      case 'fill': return JSON.stringify(solidColor(candidate.style.fill)) === JSON.stringify(solidColor(reference.style.fill));
      case 'stroke': {
        const a = reference.style.stroke, b = candidate.style.stroke;
        if (!a || !b) return !a === !b;
        return normalizeColor(a.color) === normalizeColor(b.color) && Math.abs(a.width - b.width) < EPS;
      }
      case 'font': {
        const a = reference.type === 'text' || reference.type === 'text-frame' ? reference.fontFamily : null;
        const b = candidate.type === 'text' || candidate.type === 'text-frame' ? candidate.fontFamily : null;
        return a !== null && a === b;
      }
      case 'size': {
        const a = reference.type === 'text' || reference.type === 'text-frame' ? reference.fontSize : null;
        const b = candidate.type === 'text' || candidate.type === 'text-frame' ? candidate.fontSize : null;
        return a !== null && b !== null && Math.abs(a - b) < EPS;
      }
      case 'opacity': return Math.abs(candidate.style.opacity - reference.style.opacity) < EPS;
      case 'type': return candidate.type === reference.type;
    }
  };

  const result: ObjectId[] = [];
  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer || !layer.visible || layer.locked) continue;
    for (const objectId of layer.objectIds) {
      const object = doc.objects[objectId];
      if (!object || !object.visible || object.locked) continue;
      if (matches(object)) result.push(objectId);
    }
  }
  return result;
}
```

Wiring w `EditorApp` (zmiana selekcji, bez historii):

```ts
const handleSelectSame = (criteria: SelectSameCriteria) => {
  if (!doc || selectedObjectIds.length === 0) return;
  const ids = selectSame(doc, selectedObjectIds, criteria);
  const next = selectionService.selectObjects(selection, ids, false);
  setSelection(next); // istniejący EditorStore/React state dla selekcji
};
```

### 14.6 ReplaceStylesBatchCommand — `packages/core/src/commands/replace-styles-command.ts` (NEW, szkic)

```ts
export class ReplaceStylesBatchCommand implements Command {
  readonly type = 'ReplaceStylesBatch';
  readonly description = 'Replace styles';
  private previousStyles = new Map<ObjectId, ObjectStyle>();

  constructor(private readonly updates: ReadonlyMap<ObjectId, Partial<ObjectStyle>>) {}

  execute(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    let changed = false;
    this.previousStyles.clear();
    for (const [objectId, patch] of this.updates) {
      const object = doc.objects[objectId];
      if (!object || object.locked) continue;
      if (patch.opacity !== undefined && (!Number.isFinite(patch.opacity) || patch.opacity < 0 || patch.opacity > 1)) continue;
      const nextStyle: ObjectStyle = { ...object.style, ...patch }; // normalizeFill per SetObjectStyleCommand
      if (JSON.stringify(nextStyle) === JSON.stringify(object.style)) continue;
      this.previousStyles.set(objectId, object.style);
      objects[objectId] = { ...object, style: nextStyle };
      changed = true;
    }
    return changed ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.previousStyles.size === 0) return doc;
    const objects = { ...doc.objects };
    for (const [id, style] of this.previousStyles) if (objects[id]) objects[id] = { ...objects[id]!, style };
    return { ...doc, objects, updatedAt: new Date().toISOString() };
  }
}
```

### 14.7 ShortcutManager — `packages/editor-engine/src/commands/shortcut-manager.ts` (NEW)

```ts
export interface ShortcutCombo { readonly key: string; readonly meta: boolean; readonly ctrl: boolean; readonly shift: boolean; readonly alt: boolean; }

/** Pure keyboard-shortcut registry. No DOM, no persistence (app layer owns both).
 *  Combos normalize Ctrl→Cmd on macOS so stored settings stay platform-neutral. */
export class ShortcutManager {
  private bindings = new Map<string, string>(); // comboId → actionId

  constructor(defaults: readonly { actionId: string; combo: ShortcutCombo }[], private readonly isMac: boolean) {
    for (const d of defaults) this.bindings.set(ShortcutManager.comboId(d.combo, isMac), d.actionId);
  }

  static comboId(combo: ShortcutCombo, isMac: boolean): string {
    const mod = isMac ? combo.meta : combo.ctrl;
    return [mod ? 'mod' : '', combo.ctrl && !isMac ? 'ctrl' : '', combo.alt ? 'alt' : '', combo.shift ? 'shift' : '', combo.key.toLowerCase()].filter(Boolean).join('+');
  }

  /** Returns bound actionId or null. Ignores events from text-entry targets. */
  match(e: { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; target?: EventTarget | null }): string | null {
    if (shouldIgnoreKeydown(e.target)) return null;
    return this.bindings.get(ShortcutManager.comboId(toCombo(e), this.isMac)) ?? null;
  }

  conflicts(combo: ShortcutCombo): string | null {
    return this.bindings.get(ShortcutManager.comboId(combo, this.isMac)) ?? null;
  }

  bind(actionId: string, combo: ShortcutCombo): boolean {
    const id = ShortcutManager.comboId(combo, this.isMac);
    if (this.bindings.has(id)) return false; // konflikt → caller pokazuje błąd
    this.unbindAction(actionId);
    this.bindings.set(id, actionId);
    return true;
  }

  unbindAction(actionId: string): void {
    for (const [id, action] of this.bindings) if (action === actionId) this.bindings.delete(id);
  }

  reset(defaults: readonly { actionId: string; combo: ShortcutCombo }[]): void {
    this.bindings = new Map(defaults.map((d) => [ShortcutManager.comboId(d.combo, this.isMac), d.actionId]));
  }
}

/** Shortcuts must never swallow typing in text fields (epic Niezmiennik). */
export function shouldIgnoreKeydown(target: EventTarget | null | undefined): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}
```

### 14.8 CommandRegistry + palette wiring — `packages/editor-engine/src/commands/command-registry.ts` (NEW)

```ts
export interface EditorContext {
  readonly doc: DocumentModel;
  readonly selection: SelectionState;
  execute(command: Command): void;          // dispatcher callback injektowany z app
  report(message: string): void;             // status bar / toast
}

export interface EditorCommand {
  readonly id: string;
  readonly title: string;
  readonly shortcut?: string;
  readonly enabled: (ctx: EditorContext) => boolean;
  readonly enabledReason?: string;
  execute(ctx: EditorContext): void;
}

/** Deterministic action registry for Command Palette and menus. Command-first:
 *  every entry either dispatches a document Command or triggers an app-level
 *  UI action injected at registration time (engine never imports React). */
export class CommandRegistry {
  private commands = new Map<string, EditorCommand>();
  register(command: EditorCommand): void { this.commands.set(command.id, command); }
  list(): EditorCommand[] { return [...this.commands.values()]; }
  search(query: string): EditorCommand[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.list();
    return this.list().filter((c) => c.title.toLowerCase().includes(q));
  }
}
```

Aplikacja (`EditorApp`):

```ts
const registry = useMemo(() => {
  const r = new CommandRegistry();
  r.register({ id: 'edit.paste-in-place', title: 'Wklej w miejscu', shortcut: '⌘⇧V',
    enabled: (ctx) => clipboardFragment() !== null,
    execute: (ctx) => runPaste('in-place') });
  r.register({ id: 'select.same-fill', title: 'Zaznacz takie same: wypełnienie',
    enabled: (ctx) => ctx.selection.objectIds.length > 0,
    execute: (ctx) => handleSelectSame('fill') });
  r.register({ id: 'view.command-palette', title: 'Paleta poleceń', shortcut: '⌘K',
    enabled: () => true, execute: () => setPaletteOpen(true) });
  // …reszta akcji menu…
  return r;
}, [/* handlery */]);
```

`CommandPalette.tsx`: dialog `role="dialog" aria-label="Paleta poleceń"`, input z `aria-controls` listboxa, `aria-activedescendant`, ↑/↓/Enter/Escape, focus trap, `role="option"` + `aria-selected`, disabled pozycje z `title={enabledReason}` i `aria-disabled`.

### 14.9 Persistencja skrótów — `apps/web/src/hooks/useShortcutSettings.ts` (NEW, szkic)

```ts
const KEY = 'vectoria.shortcuts.v1';

interface StoredShortcuts { readonly version: 1; readonly bindings: readonly { actionId: string; combo: ShortcutCombo }[]; }

const isValid = (raw: unknown): raw is StoredShortcuts =>
  typeof raw === 'object' && raw !== null && (raw as StoredShortcuts).version === 1 &&
  Array.isArray((raw as StoredShortcuts).bindings) &&
  (raw as StoredShortcuts).bindings.every((b) => typeof b.actionId === 'string' && typeof b.combo?.key === 'string');

export function loadShortcutSettings(): StoredShortcuts['bindings'] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed.bindings : null; // corrupted → null → defaults
  } catch { return null; }
}

export function saveShortcutSettings(bindings: StoredShortcuts['bindings']): void {
  localStorage.setItem(KEY, JSON.stringify({ version: 1, bindings } satisfies StoredShortcuts));
}
```

Hook spina `loadShortcutSettings` → `ShortcutManager` (restore) i zapis po każdej zmianie w `ShortcutConfigDialog`. Reset = `manager.reset(DEFAULT_SHORTCUTS)` + `localStorage.removeItem(KEY)`.

---

## 15. Checklist akceptacji planu (§3.2)

- [x] Scope + ID tasków backlogu: PROD-001…027 wchodzi; smart guides/AI palette poza scope (§1).
- [x] Status DONE/PARTIAL/MISSING per task z `file:line` (§2, 27 wierszy zweryfikowanych w repo).
- [x] Pliki per warstwa MODIFY/NEW + konkretna zmiana + cel (§4).
- [x] ADR dla zmian kontraktów domenowych: **ADR-010** (ClipboardFragment + paste policy), **ADR-011** (shortcut/preset storage) — ID zapisane, napisanie przed kodem (§3).
- [x] Komendy z `execute`/`undo` wskazane, nowe vs istniejące (§5).
- [x] Invariants wylistowane jawnie, 11 pozycji (§6).
- [x] Error/cancel/recovery opisane per sytuacja (§7).
- [x] Zależności międzyepiczne/ międzywarstwowe zweryfikowane `file:line` (§8).
- [x] Ryzyko regresji istniejących DONE + testy regresji (§9).
- [x] Decyzje rozstrzygnięte: D1-D12, zero otwartych niejasności (§3).
- [x] Pełna macierz testów: unit (9 grup, konkretne przypadki), E2E (7 scenariuszy), visual, perf, manual (§11).
- [x] Quality gates — dokładne skrypty z root `package.json` (§12).
- [x] Comment rules uwzględnione (§13).

**Plan gotowy do implementacji po zaakceptowaniu.** Start: Etap 0.1 (§10), pierwszy krok: parser v2 + testy back-compat.
