# Vectoria — Design System

> Wersja: 1.1.0 — **Vectoria Dark Premium**
>
> Status: obowiązujące źródło prawdy dla interfejsu aplikacji
>
> Kierunek: profesjonalny edytor wektorowy o ergonomii klasy Adobe Illustrator/CorelDRAW, z ciemnym, spokojnym i typograficznie dopracowanym charakterem inspirowanym dojrzałymi narzędziami knowledge-work. Nie kopiujemy brandingu, layoutu 1:1, ikon ani innych chronionych elementów produktów referencyjnych.

---

## 1. Wizja UI

**Vectoria** ma dawać wrażenie szybkiego, precyzyjnego narzędzia desktopowego dostępnego w przeglądarce.

Użytkownik powinien od razu rozumieć:

- gdzie znajduje się jego dokument;
- które narzędzie jest aktywne;
- co jest zaznaczone;
- jakie właściwości edytuje;
- czy dokument jest zapisany;
- czy import `.ai` / `.cdr` zachował pełną edytowalność.

### Formula wizualna

> **Illustrator-like ergonomics + calm premium dark UI + Vectoria-first AI/CDR workflow.**

### Zasady projektowe

1. **Canvas first** — dokument użytkownika zawsze ma pierwszeństwo nad interfejsem.
2. **Professional density** — UI jest zwarte, lecz nie klaustrofobiczne.
3. **Quiet confidence** — mało agresywnych kolorów, subtelne powierzchnie, wyraźna typografia.
4. **Precision over decoration** — liczby, pozycje, węzły, prowadnice i style są ważniejsze od ozdobników.
5. **Progressive disclosure** — podstawowe akcje są stale pod ręką; rzadkie opcje trafiają do popoverów lub menu.
6. **Feedback is explicit** — import, save, warning, lock, snap i error są czytelne bez zgadywania.
7. **No deceptive compatibility** — UI zawsze pokazuje, co z AI/CDR jest edytowalne, uproszczone, spłaszczone lub nieobsługiwane.
8. **Own visual identity** — własne ikony, tokeny i component library; żadnych kopii UI Adobe/Corel/Perplexity.

---

## 2. Główny layout

### 2.1. Desktop workspace

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Top Bar                                                                      │
│ Vectoria · Plik · Edycja · Obiekt · Tekst · Wybierz · Widok · Okno · Pomoc │
│ dokument · save status · undo/redo · zoom · import/export · konto           │
├────────────┬───────────────────────────────────────────────────┬──────────┤
│ Tool Rail  │                    Canvas                          │ Right    │
│            │                                                    │ Dock     │
│ Select     │                  Workspace                         │          │
│ Node       │                  + Artboard                        │ Props    │
│ Pen        │                                                    │ Layers   │
│ Shapes     │                                                    │ History  │
│ Text       │                                                    │ Assets   │
│ Navigate   │                                                    │ Report   │
├────────────┴───────────────────────────────────────────────────┴──────────┤
│ Status Bar: hint · X/Y · zoom · snap · document save · dev performance     │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Wymiary

| Element | Standard | Uwagi |
|---|---:|---|
| Top bar | 40 px | menu, dokument, globalne akcje |
| Context bar | 36 px | opcjonalny; właściwości aktywnego toola |
| Tool rail | 48 px | 40×40 px hit target per tool |
| Right dock | 320 px | resize: min 240 px, max 480 px |
| Panel header | 32 px | tytuł + utility actions |
| Status bar | 26 px | niska hierarchia wizualna |
| Panel padding | 12 px | 8 px w listach typu Layers |
| Canvas gutter | 24 px | minimalnie 12 px przy małym viewport |

### 2.3. Breakpointy

| Szerokość | Zachowanie |
|---:|---|
| `≥ 1280px` | pełny workspace, dokowane panele |
| `1024–1279px` | dock zwężony, panele jako zakładki |
| `768–1023px` | dock jako overlay drawer, toolbar grupowany |
| `< 768px` | compact/tablet mode; nie pełny desktop editor |

Desktop 1280 px+ jest pierwszorzędnym targetem. Edycja mobilna pełnego pliku AI/CDR nie jest zakresem MVP.

---

## 3. Color system

### 3.1. Dark Premium — główny motyw

Dark theme ma być prawie czarny, lekko ciepły, elegancki i mniej „szary” niż klasyczne aplikacje desktopowe. Wyróżniamy powierzchnie przez subtelną zmianę luminancji, a nie ciężkie bordery.

```css
:root[data-theme='dark'] {
  /* Application & canvas */
  --color-app: #1b1b19;
  --color-workspace: #20201e;
  --color-workspace-deep: #161615;
  --color-artboard: #ffffff;
  --color-artboard-shadow: rgba(0, 0, 0, 0.36);

  /* Surfaces */
  --color-topbar: #222220;
  --color-toolbar: #252523;
  --color-panel: #262624;
  --color-panel-raised: #2e2e2b;
  --color-panel-hover: #373733;
  --color-panel-pressed: #40403b;
  --color-input: #1d1d1b;
  --color-input-hover: #242421;
  --color-selection-surface: #303a45;
  --color-selection-surface-strong: #2d6ca8;

  /* Borders */
  --color-border-subtle: #33332f;
  --color-border-default: #464641;
  --color-border-strong: #696960;
  --color-border-focus: #61adff;

  /* Content */
  --color-text-primary: #f0f0eb;
  --color-text-secondary: #c5c5be;
  --color-text-muted: #90908a;
  --color-text-disabled: #64645f;
  --color-text-on-accent: #ffffff;

  /* Semantic */
  --color-accent: #5caeff;
  --color-accent-hover: #83c0ff;
  --color-accent-pressed: #3a91e6;
  --color-accent-subtle: rgba(92, 174, 255, 0.16);

  --color-success: #5ac487;
  --color-success-subtle: rgba(90, 196, 135, 0.15);
  --color-warning: #f0bd58;
  --color-warning-subtle: rgba(240, 189, 88, 0.16);
  --color-danger: #f06a6a;
  --color-danger-hover: #ff8080;
  --color-danger-subtle: rgba(240, 106, 106, 0.16);
  --color-info: #62b5ff;
  --color-info-subtle: rgba(98, 181, 255, 0.16);

  /* Editor-only */
  --color-selection: #5caeff;
  --color-selection-fill: rgba(92, 174, 255, 0.13);
  --color-node: #ffffff;
  --color-node-selected: #5caeff;
  --color-guide: #52cdf6;
  --color-snap: #ed61da;
  --color-smart-distance: #5acc9a;
}
```

### 3.2. Light theme

```css
:root[data-theme='light'] {
  --color-app: #f4f4f1;
  --color-workspace: #d9d9d4;
  --color-workspace-deep: #c7c7c1;
  --color-artboard: #ffffff;
  --color-artboard-shadow: rgba(24, 24, 20, 0.22);

  --color-topbar: #fbfbf9;
  --color-toolbar: #f7f7f5;
  --color-panel: #ffffff;
  --color-panel-raised: #f5f5f2;
  --color-panel-hover: #ecece8;
  --color-panel-pressed: #e2e2dc;
  --color-input: #ffffff;
  --color-input-hover: #f6f6f3;
  --color-selection-surface: #e4effb;
  --color-selection-surface-strong: #cce4fb;

  --color-border-subtle: #e2e2dd;
  --color-border-default: #cacac3;
  --color-border-strong: #a4a49b;
  --color-border-focus: #1976ca;

  --color-text-primary: #242420;
  --color-text-secondary: #55554f;
  --color-text-muted: #777771;
  --color-text-disabled: #a5a59e;
  --color-text-on-accent: #ffffff;

  --color-accent: #1976ca;
  --color-accent-hover: #0e89eb;
  --color-accent-pressed: #0e62aa;
  --color-accent-subtle: rgba(25, 118, 202, 0.12);

  --color-success: #1f8751;
  --color-success-subtle: rgba(31, 135, 81, 0.12);
  --color-warning: #9b6100;
  --color-warning-subtle: rgba(155, 97, 0, 0.12);
  --color-danger: #c63b3b;
  --color-danger-hover: #dd4b4b;
  --color-danger-subtle: rgba(198, 59, 59, 0.12);
  --color-info: #1976ca;
  --color-info-subtle: rgba(25, 118, 202, 0.12);

  --color-selection: #1976ca;
  --color-selection-fill: rgba(25, 118, 202, 0.11);
  --color-node: #ffffff;
  --color-node-selected: #1976ca;
  --color-guide: #008fcf;
  --color-snap: #b837aa;
  --color-smart-distance: #158458;
}
```

### 3.3. Reguły kolorów

- Komponenty używają wyłącznie tokenów semantycznych; zakaz hard-coded `#hex` w feature components.
- Accent blue oznacza focus, aktywny tool, selection i główną akcję.
- Magenta jest zarezerwowana dla snappingu.
- Cyan jest zarezerwowany dla guides/smart guides.
- Zielony = sukces/odległość, żółty = warning, czerwony = destructive/error.
- Kolor nigdy nie jest jedynym nośnikiem informacji: każdy status ma ikonę i tekst.

---

## 4. Foundations

### 4.1. Spacing

```css
--space-0: 0;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### 4.2. Typography

```css
--font-ui: Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
```

| Token | Rozmiar / line-height | Waga | Użycie |
|---|---|---:|---|
| `text-xs` | 11 / 16 px | 400 | statusbar, metadata, skróty |
| `text-sm` | 12 / 18 px | 400 | menu, labels, tooltipy |
| `text-md` | 13 / 20 px | 400 | panel content |
| `text-lg` | 14 / 20 px | 500 | header panelu |
| `text-xl` | 16 / 24 px | 600 | title dialogu |
| `text-2xl` | 20 / 28 px | 600 | empty state |

- Wszystkie wartości numeryczne korzystają z `font-variant-numeric: tabular-nums`.
- X/Y/W/H, zoom, jednostki i kod błędu mogą używać `--font-mono`.
- UI nie używa uppercase jako domyślnej stylistyki nagłówków.

### 4.3. Radius, borders, shadows

```css
--radius-xs: 2px;
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 10px;

--shadow-artboard: 0 4px 18px rgba(0, 0, 0, 0.32);
--shadow-popover: 0 10px 30px rgba(0, 0, 0, 0.38);
--shadow-dialog: 0 20px 60px rgba(0, 0, 0, 0.50);
```

- Docked panels: `radius: 0`.
- Input/button: `radius-sm` lub `radius-md`.
- Popover/dialog: `radius-md` lub `radius-lg`.
- Cienie określają elevation, nigdy nie służą jako dekoracja na każdym komponencie.

### 4.4. Motion

```css
--duration-fast: 100ms;
--duration-normal: 160ms;
--duration-slow: 220ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
```

- Hover: 100 ms.
- Menu/popover: opacity + translate 2 px, maks. 160 ms.
- Pan, zoom, selection, dragging, node handles: bez CSS transition.
- `prefers-reduced-motion`: wyłącz animacje niekrytyczne.

---

## 5. Ikonografia

### 5.1. Zasady

Ikony Vectorii są autorskie albo użyte legalnie z bibliotek o zgodnej licencji. Nie kopiujemy glyphów Adobe/Corel ani nie używamy ich znaków towarowych jako brandingu.

| Cecha | Standard |
|---|---|
| Viewbox | 24×24 |
| Default render | 20×20 px |
| Stroke | 1.75 px |
| Line cap/join | round / round |
| Styl | outline-first, geometryczny, minimalny |
| Active state | fill/duotone dopuszczalne, znaczenie ikony bez zmian |
| Minimalny rozmiar | 14–16 px |

### 5.2. Rozmiary i hit targets

| Kontekst | Ikona | Hit target |
|---|---:|---:|
| Tool Rail | 20 px | 40×40 px |
| Menu | 16 px | 32 px row |
| Input utility | 16 px | 28×28 px |
| Statusbar | 14 px | 24×24 px |
| Dialog/empty state | 32–40 px | zależnie od sekcji |

### 5.3. Icon API

```ts
export type VectoriaIconName =
  | 'appMark'
  | 'fileNew' | 'fileOpen' | 'fileImport' | 'fileExport' | 'save'
  | 'undo' | 'redo' | 'select' | 'directSelect' | 'node' | 'pen'
  | 'rectangle' | 'ellipse' | 'line' | 'shape' | 'type'
  | 'pencil' | 'brush' | 'eraser' | 'scissors' | 'width'
  | 'hand' | 'zoom' | 'artboard' | 'fill' | 'stroke' | 'gradient'
  | 'layers' | 'history' | 'assets' | 'report'
  | 'visible' | 'hidden' | 'lock' | 'unlock'
  | 'success' | 'warning' | 'error' | 'info'
  | 'chevronDown' | 'chevronRight' | 'more' | 'close' | 'search'
  | 'settings' | 'command' | 'sparkle';

export interface VectoriaIconProps {
  name: VectoriaIconName;
  size?: 14 | 16 | 18 | 20 | 24 | 32 | 40;
  label?: string;
  decorative?: boolean;
  className?: string;
}
```

### 5.4. Tool dictionary

| Narzędzie | Ikona | Oznaczenie | Skrót |
|---|---|---|---|
| Select | `select` | cursor arrow + selection corner | `V` |
| Direct Select | `directSelect` | arrow + anchor node | `A` |
| Node | `node` | Bézier segment + nodes | `A` / context |
| Pen | `pen` | pen nib + anchor point | `P` |
| Rectangle | `rectangle` | prostokąt + subtle corner handle | `R` |
| Ellipse | `ellipse` | outline ellipse | `L` |
| Line | `line` | segment + endpoints | `\` |
| Type | `type` | autorskie `T` | `T` |
| Pencil | `pencil` | pencil + curve | `N` |
| Brush | `brush` | brush stroke | `B` |
| Eraser | `eraser` | eraser + broken path | `Shift+E` |
| Scissors | `scissors` | scissors across path | `C` |
| Hand | `hand` | open hand | `Space` |
| Zoom | `zoom` | magnifier | `Z` |
| Artboard | `artboard` | page/crop corners | `Shift+O` |

### 5.5. AI/CDR format icons

- Używamy neutralnej ikony dokumentu z wyraźnym text badge `AI` albo `CDR`.
- Nie używamy logo Adobe Illustrator ani CorelDRAW jako głównej ikony importu.
- Format jest zawsze komunikowany tekstowo: `Importuj plik AI` / `Importuj plik CDR`.
- Raport zgodności używa autorskiego `report` + ikon `success`, `warning`, `info`, `error`.

### 5.6. Accessibility

- Icon-only button zawsze ma accessible label.
- Ikona dekoracyjna ma `aria-hidden="true"`.
- Tooltip nie zastępuje `aria-label`.
- Destructive action nie może być wyłącznie nieopisanym czerwonym symbolem.

---

## 6. Primitives

### 6.1. Button

| Wariant | Zastosowanie |
|---|---|
| Primary | Utwórz, Importuj, Eksportuj, Kontynuuj |
| Secondary | Anuluj, Dodaj, Zmień ustawienia |
| Ghost | toolbar, panel utility |
| Danger | Usuń, Porzuć import |
| Icon | przycisk ikonowy z tooltipem |

```css
--button-sm: 28px;
--button-md: 32px;
--button-lg: 40px;
```

Primary button ma accent blue, ale tylko jedna główna akcja jest wyróżniona w ramach jednego dialogu.

### 6.2. NumberInput

Najważniejszy input profesjonalnego edytora.

```text
┌────────────────────────────┐
│ X                      128 │
│                        px  │
└────────────────────────────┘
```

Wymagania:

- label 11–12 px;
- right-aligned value + mono/tabular numbers;
- suffix jednostki;
- obsługa `100/3`, `20+4`, `50%` w dozwolonych polach;
- `Enter` commit, `Escape` revert;
- arrow nudge, Shift dla większego kroku;
- błąd = tekst + icon + border, nie tylko kolor;
- aktualizacja pola nie może wymuszać React renderu całego edytora.

### 6.3. ColorControl

```text
[ swatch ]  #5CAEFFFF   [▼]
Fill:       [None] [Solid] [Gradient]
```

- Swatch zawsze widoczny.
- `Fill` i `Stroke` mają przełącznik targetu.
- `No fill` jest oddzielną, rozpoznawalną akcją.
- Wartość może być HEX, RGB/HSL oraz później CMYK.
- Gradient ma własny editor, nie jest ukrywany w losowym menu.

### 6.4. Tooltip

- Pojawia się po 500 ms hover/focus.
- Max width: 260 px.
- Pokazuje label i shortcut w mono badge.
- Nie zakrywa active pointer/selection jeśli da się tego uniknąć.

### 6.5. Menu i context menu

- Menu row: 32 px.
- Lewa strona: icon 16 px + label.
- Prawa strona: shortcut/submenu chevron.
- Separatory tylko między grupami intencji.
- Danger actions na końcu.
- Escape zawsze zamyka menu.

### 6.6. Dialog

| Dialog | Width | Zastosowanie |
|---|---:|---|
| New Document | 560–680 px | presety, width, height, unit |
| Import AI/CDR | 640–800 px | file, progress, compatibility |
| Export | 560–720 px | SVG/PDF/PNG options |
| Critical confirm | ≤ 480 px | delete/irreversible action |
| Command Palette | 640 px | commands, search, AI action |

Dialog ma focus trap, jasną primary action, Escape dla akcji niedestrukcyjnych i tylko subtelny overlay — bez ciężkiego blur obciążającego słabsze urządzenia.

---

## 7. Editor components

### 7.1. Top Bar

Lewy obszar:

```text
[Vectoria mark] [File] [Edit] [Object] [Type] [Select] [View] [Window] [Help]
```

Środek:

```text
[document icon] Project name [saved/saving/offline]
```

Prawy obszar:

```text
[undo] [redo] [zoom] [Import] [Export] [Command] [Account]
```

- Top bar nie może być przeładowany; rzadkie akcje trafiają do `More`.
- Status `Saving…`, `Saved locally`, `Sync error`, `Offline` jest krótki i semantyczny.
- Podczas importu AI/CDR widoczny jest progress chip, nie blokujący całego top bara.

### 7.2. Tool Rail

```text
[ Select ]
[ Direct Select / Node ]
────────────
[ Pen ]
[ Pencil ]
[ Brush ]
────────────
[ Rectangle ]
[ Ellipse ]
[ Line ]
[ Shape group ]
────────────
[ Type ]
────────────
[ Hand ]
[ Zoom ]
────────────
[ Fill / Stroke ]
[ Default colors ]
[ No fill ]
```

- Tool button: 40×40 px, icon 20 px.
- Active: `--color-selection-surface-strong`, white icon.
- Hover: `--color-panel-hover`.
- Tool groups mają small chevron/long-press behavior.
- Wszystkie tool buttons mają tooltip ze skrótem.

### 7.3. Right Dock

Domyślne taby:

```text
Properties | Layers | History | Assets | Import Report
```

- Properties jest domyślnie otwarty.
- Warstwy i History muszą pozostać osiągalne z menu `Okno`, nawet jeśli dock jest ukryty.
- Panel content ma subtelny scroll; scrollbar nie może dominować wizualnie.

### 7.4. Properties

Dla obiektu:

```text
Transform
  X · Y
  W · H · proportional lock
  Rotation · flip

Appearance
  Fill
  Stroke
  Opacity

Object
  Name
  Visibility · Lock
```

Dla artboardu:

```text
Artboard
  Name
  Width · Height · unit
  Orientation
  Background

View
  Grid
  Snap
```

- Sekcja może być collapsed, ale pokazuje summary.
- Control labels są krótkie: `X`, `Y`, `W`, `H`, `Rot`, `Opacity`.
- Nie twórz osobnej strony ustawień dla podstawowych parametrów obiektu.

### 7.5. Layers

```text
[eye] [lock] [disclosure] [type/thumb] Object name       [···]
```

- Row: 28 px.
- Indent: 16 px na poziom.
- Selected: subtle selection surface, nie solidny niebieski block.
- Drag reorder: accent insertion line.
- Hidden: eye-off + muted label.
- Locked: lock icon, blokada drag/edit.
- Przy dużych dokumentach lista ma virtualizację.

### 7.6. Status Bar

```text
[tool hint] · X: 120 Y: 84 · 100% · Snap: Grid · Saved locally · FPS (dev)
```

- `text-xs`, muted.
- Status bar jest informacyjny, nie stanowi głównego miejsca dla akcji.
- FPS, frame time i memory są widoczne tylko w developer mode.

---

## 8. Canvas language

### 8.1. Workspace i artboard

- Workspace: `--color-workspace`.
- Artboard: domyślnie `#fff`, z `--shadow-artboard` i 1 px subtle border.
- Transparent artboard: neutral checkerboard w screen-space.
- Nazwa artboardu: poza obszarem dokumentu, `text-xs`, muted.
- Canvas nie ma ozdobnego gradientu/noise w MVP — ma być deterministyczny i lekki.

### 8.2. Grid i guides

| Element | Styl |
|---|---|
| Minor grid | neutral, 10–15% opacity |
| Major grid | neutral, 20–25% opacity |
| Guide | 1 px cyan, screen-space |
| Smart guide | cyan/magenta tylko podczas interakcji |
| Distance label | green text + dark/light pill background |

Grid renderuje wyłącznie widoczny viewport, nigdy pełny dokument.

### 8.3. Selection

```css
--selection-stroke-width: 1.5px;
--selection-handle-size: 8px;
--selection-handle-touch: 14px;
--node-size: 7px;
```

- Bounding box: blue selection stroke + low-opacity fill.
- Corner handles: white fill, blue border.
- Rotation handle: 16–24 px nad bounding box.
- Multi-selection: jeden outer box, gdy to czytelniejsze.
- Selection musi być widoczny na jasnym, ciemnym i wielokolorowym artworku.

### 8.4. Node/Bezier language

- Node: 7 px diamond/square, white fill + blue outline.
- Selected node: solid blue.
- Handle line: 1 px blue, 70% opacity.
- Handle endpoint: 6 px circle.
- Segment hover: 2–3 px accent highlight.
- Brak technicznych labels na canvasie poza debug mode.

### 8.5. Snap language

- Snap: magenta cross/dot/intersection, max 12 px.
- Krótki label: `Grid`, `Center`, `Anchor`, `Edge`, `Intersection`.
- Indicator znika po zakończeniu drag.
- Snap nie może być mylony z guide cyan ani selection blue.

---

## 9. AI/CDR import UX

### 9.1. Import Dialog

```text
Import file
──────────────────────────────────────────────
[ document badge: AI / CDR ]
project-logo.ai
12.4 MB · AI PDF-compatible detected

[██████████████░░░░] 72%
Converting vector geometry…

[Cancel]
```

Stany:

| Stan | UI |
|---|---|
| idle | drop zone + file picker AI/CDR |
| inspecting | filename + spinner |
| converting | progress, etap, cancel |
| validating | progress / indeterminate label |
| ready | Compatibility Report preview |
| failed | code, plain-language reason, recovery action |
| cancelled | powrót bez modyfikacji dokumentu |

### 9.2. Compatibility Report

To jeden z najważniejszych autorskich komponentów Vectorii.

```text
Import AI completed
project-logo.ai

✓ 128   Fully editable
! 10    Simplified
◒ 3     Flattened
× 1     Unsupported

[All] [Warnings] [Flattened] [Unsupported]

! Layer “Glow” — live effect flattened
! Title — missing font converted to outlines
× Object 34 — mesh is not currently supported

[Continue editing]  [Cancel import]
```

| Klasa | Ikona | Kolor | Znaczenie |
|---|---|---|---|
| Editable | `success` | success | pełna edycja |
| Simplified | `warning` | warning | obiekt edytowalny z różnicą |
| Flattened | `info` / warning | info | zachowany wizualnie, ograniczona edycja |
| Unsupported | `error` | danger | element pominięty lub wymagający działania |

Zasady:

- Report jest jasny dla osoby nietechnicznej.
- Każdy warning wskazuje warstwę/obiekt, gdy dane są dostępne.
- Użytkownik nigdy nie traci obecnego dokumentu przed kliknięciem `Continue editing`.
- W przypadku server-side CDR conversion przed uploadem jest wyraźna informacja o przetwarzaniu pliku.

### 9.3. Command Palette / AI Command Bar

Inspiracją jest spokojny, szeroki input command-first; nie jest to chat UI dominujący nad edytorem.

```text
┌────────────────────────────────────────────────────────────┐
│ ⌘  Type a command or ask Vectoria…                         │
│    Align selected objects · Clean path · Import AI          │
└────────────────────────────────────────────────────────────┘
```

- Shortcut: `Ctrl/Cmd + K`.
- Najpierw deterministyczne akcje edytora, potem AI actions.
- AI command zawsze pokazuje preview przed commitem.
- Wynik AI jest odwracalny przez Undo.

---

## 10. Feedback, errors i toasts

### Toast

- Prawy dolny róg nad status barem.
- Width: 320–420 px.
- Success: 3 s.
- Warning/error: 5–8 s + dismiss.
- Toast nie służy do długiego importu ani krytycznych informacji.

Przykłady:

```text
✓ Document saved locally
! Layer is locked
✓ PNG export ready
× AI import failed: PDF-compatible data not found
```

### Error UX

- Błąd ma prosty opis, kod dla supportu oraz następną akcję.
- Nie używamy browserowego `alert()`.
- Example:

```text
Cannot open this AI file
This file does not include PDF-compatible data.
Open it in Illustrator, enable “Create PDF Compatible File”, save and try again.
Code: AI_NO_PDF_COMPATIBILITY
```

---

## 11. Accessibility

- Każda akcja jest dostępna z klawiatury.
- `focus-visible` ma 2 px ring `--color-border-focus`.
- Icon-only button ma `aria-label`.
- Tooltip nie zastępuje accessible name.
- Status importu/save używa kontrolowanego `aria-live`.
- Nie komunikujemy każdej zmiany pozycji kursora screen readerowi.
- Layers działa jako semantyczne drzewo obiektów.
- Properties umożliwia edycję bez drag na canvasie.
- Kolor nie jest jedynym przekazem statusu.
- Touch mode powiększa ważne hit targets do 44×44 px.
- `prefers-reduced-motion` redukuje motion.

---

## 12. Implementation architecture

```text
packages/ui/
├── src/
│   ├── tokens/
│   │   ├── colors.css
│   │   ├── typography.css
│   │   ├── spacing.css
│   │   ├── motion.css
│   │   └── themes.css
│   ├── icons/
│   │   ├── VectoriaIcon.tsx
│   │   ├── icon-map.ts
│   │   └── custom/
│   │       ├── SelectIcon.tsx
│   │       ├── NodeIcon.tsx
│   │       ├── PenIcon.tsx
│   │       └── ArtboardIcon.tsx
│   ├── primitives/
│   │   ├── Button/
│   │   ├── IconButton/
│   │   ├── NumberInput/
│   │   ├── Select/
│   │   ├── Toggle/
│   │   ├── Tooltip/
│   │   ├── Menu/
│   │   ├── Dialog/
│   │   ├── Tabs/
│   │   └── Toast/
│   ├── editor/
│   │   ├── ToolButton/
│   │   ├── Panel/
│   │   ├── PropertiesSection/
│   │   ├── ColorControl/
│   │   ├── LayerRow/
│   │   ├── ImportProgress/
│   │   └── CompatibilityReport/
│   └── index.ts
```

### Implementation rules

- Primitives nie zależą od `editor-engine`, renderer ani `DocumentModel`.
- Feature components mapują action UI na command/engine action.
- Canvas renderer nie zależy od komponentów UI.
- UI nie czyta high-frequency `pointermove` do renderowania paneli.
- Wszystkie kolory, spacing i typografia używają tokenów.
- Icons są inline SVG, nie PNG.

---

## 13. Design QA checklist

### Każdy komponent

- [ ] Używa semantycznych tokenów.
- [ ] Ma dark i light state.
- [ ] Ma hover, active, focus-visible, disabled i loading gdy dotyczy.
- [ ] Działa z klawiaturą.
- [ ] Ma accessibility label.
- [ ] Nie przekazuje informacji tylko kolorem.
- [ ] Nie powoduje renderu canvasu.
- [ ] Działa w compact layout.
- [ ] Nie używa kopiowanych ikon/logotypów innych produktów.

### Release UI

- [ ] Artboard jest wyraźnie oddzielony od workspace.
- [ ] Active tool jest oczywisty.
- [ ] Selection, nodes, guides i snap są czytelne.
- [ ] Properties i Layers działają dla artboardu/obiektu/braku selection.
- [ ] Import AI/CDR ma progres, cancel i Compatibility Report.
- [ ] Tooltipy pokazują skróty.
- [ ] Dark Premium nie obniża kontrastu tekstu.
- [ ] UI pozostaje własnym produktem, nie kopią aplikacji referencyjnej.

---

## 14. Pierwsze taski

1. Stworzyć `packages/ui` i tokeny Dark Premium / Light.
2. Zbudować `VectoriaIcon`, registry i autorskie ikony Select, Node, Pen, Rectangle, Ellipse, Line, Hand, Zoom, Artboard.
3. Zbudować Button, IconButton, Tooltip, NumberInput, Menu i Dialog.
4. Zbudować Top Bar, Tool Rail, Right Dock i Status Bar.
5. Zbudować Properties Panel dla artboardu i rectangle.
6. Zbudować Layers Panel dla jednej warstwy i podstawowych obiektów.
7. Zbudować Import Dialog oraz Compatibility Report AI/CDR.
8. Zbudować Command Palette jako deterministyczny command-first UI.
9. Dodać dark/light screenshot regression tests.
10. Przetestować UI na 1280×720, 1440×900, 1920×1080 oraz DPR 1/2.

---

## 15. Definition of Done

System designu jest gotowy dla Skeleton MVP, gdy:

1. Vectoria ma spójny Dark Premium i Light theme oparty wyłącznie na tokenach.
2. Desktop layout obejmuje top bar, tool rail, canvas, right dock i status bar.
3. Wszystkie podstawowe tools mają własne/legalne ikony, active state, tooltip i shortcut.
4. Properties oraz Layers są dostępne z klawiatury.
5. Canvas selection, node handles, guides i snap indicators są czytelne przy każdym zoomie.
6. AI/CDR import ma jasny progres, cancel, error recovery i Compatibility Report.
7. Command Palette jest gotowa jako fundament future AI workflows.
8. UI nie kopiuje brandingu, ikon ani layoutu Adobe Illustrator/CorelDRAW/Perplexity 1:1.
9. Żaden komponent UI nie degraduje render loop ani responsywności canvasu.
