# Vectoria — Architektura aplikacji

> Status: Skeleton MVP / dokument nadrzędny
>
> Cel: szybki, przeglądarkowy edytor grafiki wektorowej typu SVG, rozwijany iteracyjnie. Architektura ma od pierwszego dnia chronić płynność interakcji, stabilne klatki oraz odporność na duże logiczne rozmiary dokumentów.

---

## 1. Decyzje architektoniczne

### 1.1. Cel produktu

**Vectoria** to aplikacja webowa/PWA do tworzenia, edycji, importu i eksportu grafiki wektorowej. Pierwszy pełny workflow użytkownika:

1. Utworzenie dokumentu
2. Rysowanie prostokąta, elipsy, linii albo prostej ścieżki Béziera
3. Zaznaczenie, przesunięcie i skalowanie obiektu
4. Zmiana fill, stroke i opacity
5. Zapis lokalny
6. Import lub eksport SVG
7. Eksport PNG

Wersja pierwsza nie jest klonem 1:1 CorelDRAW ani Adobe Illustrator. Jest stabilnym rdzeniem, który ma zostać systematycznie rozszerzony o Node Tool, Boolean operations, tekst, assety, PDF, współpracę i AI.

### 1.2. Najważniejsze zasady

- **Canvas jest rozmiarem viewportu, nie dokumentu.** Artboard może mieć logicznie miliony jednostek, ale renderer nie może tworzyć bitmapy o jego fizycznych wymiarach.
- **Dokument jest niezależny od renderera.** Model danych nie zna Reacta, Canvas API ani komponentów UI.
- **React zarządza UI, nie pętlą renderingu sceny.** `pointermove`, pan, zoom i drag nie mogą wywoływać renderu całego drzewa komponentów.
- **Każda modyfikacja dokumentu jest komendą.** To umożliwia Undo/Redo, audyt zmian, późniejszy autosave różnicowy oraz współpracę realtime.
- **Input ma priorytet nad obliczeniami.** Import, eksport, trace, Boolean i optymalizacja ścieżek będą wykonywane poza głównym wątkiem, gdy staną się kosztowne.
- **Budujemy vertical slices.** Każdy etap ma dostarczać działającą ścieżkę użytkownika, a nie samą infrastrukturę.
- **Nie optymalizujemy hipotetycznie.** Od startu stosujemy viewport canvas, `requestAnimationFrame`, poprawne transformacje i lekki model. R-tree, OffscreenCanvas i agresywny cache dokładamy po benchmarkach.

### 1.3. Proponowany stack

| Obszar | Decyzja dla Skeleton MVP | Uzasadnienie |
|---|---|---|
| Aplikacja | React + TypeScript + Vite | Szybki development, mocne typowanie i prosty build |
| UI | React + CSS Modules/Tailwind + Radix/shadcn | Panele, dialogi, tooltipy i dostępność bez budowania wszystkiego od zera |
| Renderer | Canvas 2D, z adapterem renderera | Kontrola nad redraw, overlay i wydajnością; późniejszy WebGL bez zmiany modelu dokumentu |
| SVG | Własny importer/eksporter adapterowy | SVG jest otwartym formatem wymiany, ale nie może być jedynym modelem stanu |
| Stan UI | Zustand lub mały store oparty o `useSyncExternalStore` | Selektywne subskrypcje bez masowych rerenderów Reacta |
| Stan dokumentu | Niezależny `DocumentStore` + command dispatcher | Czysty model, Undo/Redo i testowalna logika |
| Persistencja lokalna | IndexedDB przez adapter | Autozapis dokumentów bez backendu |
| Walidacja | Zod dla plików, komend i serializacji | Bezpieczny import oraz odporność na uszkodzony dokument |
| Testy | Vitest + Playwright | Testy geometrii/modelu oraz E2E workflow edytora |
| Wydajność | `requestAnimationFrame`, viewport culling, benchmark fixtures | Płynność jako wymaganie produktu |

> Uwaga: biblioteka renderująca może zostać wymieniona, ale `DocumentModel`, system komend, kamera i publiczne interfejsy silnika nie mogą zależeć od konkretnego renderera.

---

## 2. Granice systemu

```text
┌───────────────────────────────────────────────────────────────────┐
│                           React Application                         │
│  AppShell / Toolbars / Panels / Dialogs / Keyboard / Accessibility │
└───────────────────────────────┬───────────────────────────────────┘
                                │ intencje użytkownika
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                            Editor Engine                            │
│ Tool State Machine · Selection · Camera · Command Dispatcher       │
│ Snap Service · Hit Testing · Interaction Session · Undo/Redo       │
└─────────────┬──────────────────────┬─────────────────────┬────────┘
              │                      │                     │
              ▼                      ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐
│   Document Domain    │  │  Rendering Adapter  │  │      IO Layer    │
│ Shapes · Paths       │  │ Canvas2D Renderer   │  │ SVG / PNG / VCT  │
│ Layers · Artboards   │  │ Overlay Renderer    │  │ IndexedDB        │
│ Styles · Commands    │  │ Camera Transform    │  │ Import/Export    │
└─────────────────────┘  └─────────────────────┘  └──────────────────┘
              │                      │                     │
              └──────────────────────┴─────────────────────┘
                                     │
                                     ▼
                         Browser APIs / Workers later
```

### 2.1. Warstwy i odpowiedzialność

#### A. Application/UI

Odpowiada za:

- layout aplikacji;
- toolbar, menu, panele, modal New Document;
- skróty klawiszowe;
- formularze i walidację pól;
- wyświetlanie stanu silnika;
- motyw, tooltipy, focus i ARIA.

Nie odpowiada za:

- geometrię;
- render sceny dokumentu;
- mutowanie obiektów bezpośrednio;
- pętlę renderingu.

#### B. Editor Engine

Odpowiada za:

- aktywne narzędzie i jego state machine;
- obsługę pointer/keyboard/wheel;
- zaznaczenie;
- kamerę i nawigację;
- hit-testing;
- snapping;
- dispatch komend;
- historię Undo/Redo;
- synchronizację renderu po zmianie stanu.

#### C. Document Domain

Odpowiada za:

- typy obiektów;
- geometrię i macierze transformacji;
- warstwy, artboardy i style;
- czyste komendy modyfikujące dokument;
- serializację natywnego formatu;
- walidację invariants dokumentu.

#### D. Rendering

Odpowiada za:

- render tła, artboardu i sceny;
- render selection/handles/guides;
- viewport culling;
- `requestAnimationFrame`;
- mapowanie współrzędnych world/screen;
- adaptacyjną jakość renderu w przyszłości.

#### E. IO i Persistencja

Odpowiada za:

- import SVG;
- eksport SVG i PNG;
- zapis/odczyt IndexedDB;
- serializację `.vct`;
- później: PDF, assety, cloud sync i migracje.

---

## 3. Struktura repozytorium

```text
vectoria/
├── apps/
│   └── web/
│       ├── public/
│       └── src/
│           ├── app/
│           │   ├── App.tsx
│           │   ├── AppProviders.tsx
│           │   ├── routes.tsx
│           │   └── global.css
│           ├── features/
│           │   ├── editor-shell/
│           │   │   ├── EditorPage.tsx
│           │   │   ├── EditorLayout.tsx
│           │   │   └── useEditorBootstrap.ts
│           │   ├── document/
│           │   │   ├── NewDocumentDialog.tsx
│           │   │   ├── ArtboardControls.tsx
│           │   │   └── DocumentNameControl.tsx
│           │   ├── toolbar/
│           │   │   ├── LeftToolbar.tsx
│           │   │   ├── TopToolbar.tsx
│           │   │   └── toolDefinitions.ts
│           │   ├── properties/
│           │   │   ├── PropertiesPanel.tsx
│           │   │   ├── TransformProperties.tsx
│           │   │   ├── FillStrokeProperties.tsx
│           │   │   └── ArtboardProperties.tsx
│           │   ├── layers/
│           │   │   ├── LayersPanel.tsx
│           │   │   └── LayerRow.tsx
│           │   ├── history/
│           │   │   └── HistoryControls.tsx
│           │   ├── import-export/
│           │   │   ├── ImportButton.tsx
│           │   │   └── ExportMenu.tsx
│           │   └── statusbar/
│           │       └── StatusBar.tsx
│           └── main.tsx
│
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── document/
│   │       │   ├── document.types.ts
│   │       │   ├── document.factory.ts
│   │       │   ├── document.invariants.ts
│   │       │   ├── artboard.ts
│   │       │   ├── layer.ts
│   │       │   └── object.ts
│   │       ├── objects/
│   │       │   ├── common.ts
│   │       │   ├── rectangle.ts
│   │       │   ├── ellipse.ts
│   │       │   ├── line.ts
│   │       │   ├── path.ts
│   │       │   ├── group.ts
│   │       │   ├── text.ts
│   │       │   └── image.ts
│   │       ├── geometry/
│   │       │   ├── vec2.ts
│   │       │   ├── rect.ts
│   │       │   ├── matrix.ts
│   │       │   ├── bezier.ts
│   │       │   ├── bounds.ts
│   │       │   └── hit-test.ts
│   │       ├── style/
│   │       │   ├── fill.ts
│   │       │   ├── stroke.ts
│   │       │   └── gradient.ts
│   │       ├── commands/
│   │       │   ├── command.types.ts
│   │       │   ├── create-object.ts
│   │       │   ├── update-object.ts
│   │       │   ├── delete-object.ts
│   │       │   ├── move-objects.ts
│   │       │   ├── resize-artboard.ts
│   │       │   └── set-style.ts
│   │       └── index.ts
│   │
│   ├── editor-engine/
│   │   └── src/
│   │       ├── editor-engine.ts
│   │       ├── editor-state.ts
│   │       ├── document-store.ts
│   │       ├── history-store.ts
│   │       ├── selection-service.ts
│   │       ├── camera/
│   │       │   ├── camera.ts
│   │       │   ├── camera-transform.ts
│   │       │   └── viewport.ts
│   │       ├── interaction/
│   │       │   ├── pointer-router.ts
│   │       │   ├── keyboard-router.ts
│   │       │   ├── drag-session.ts
│   │       │   └── interaction-state.ts
│   │       ├── tools/
│   │       │   ├── tool.types.ts
│   │       │   ├── select-tool.ts
│   │       │   ├── rectangle-tool.ts
│   │       │   ├── ellipse-tool.ts
│   │       │   ├── line-tool.ts
│   │       │   ├── pen-tool.ts
│   │       │   └── pan-tool.ts
│   │       ├── snapping/
│   │       │   ├── grid-snap.ts
│   │       │   └── snap-service.ts
│   │       ├── hit-testing/
│   │       │   └── scene-hit-tester.ts
│   │       └── index.ts
│   │
│   ├── renderer/
│   │   └── src/
│   │       ├── renderer.types.ts
│   │       ├── render-loop.ts
│   │       ├── canvas-renderer.ts
│   │       ├── scene-renderer.ts
│   │       ├── overlay-renderer.ts
│   │       ├── background-renderer.ts
│   │       ├── viewport-culling.ts
│   │       └── render-quality.ts
│   │
│   ├── io/
│   │   └── src/
│   │       ├── vct/
│   │       │   ├── vct.schema.ts
│   │       │   ├── vct.serialize.ts
│   │       │   └── vct.migrations.ts
│   │       ├── svg/
│   │       │   ├── svg-importer.ts
│   │       │   ├── svg-exporter.ts
│   │       │   └── svg-sanitizer.ts
│   │       ├── png/
│   │       │   └── png-exporter.ts
│   │       ├── persistence/
│   │       │   ├── document-repository.ts
│   │       │   └── indexeddb-repository.ts
│   │       └── index.ts
│   │
│   ├── shared/
│   │   └── src/
│   │       ├── ids.ts
│   │       ├── events.ts
│   │       ├── result.ts
│   │       ├── units.ts
│   │       └── logger.ts
│   │
│   └── test-fixtures/
│       ├── svg/
│       ├── documents/
│       └── performance/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PRODUCT_SCOPE.md
│   ├── PERFORMANCE_BUDGET.md
│   ├── SVG_COMPATIBILITY.md
│   └── ADR/
│       ├── 001-canvas-first-renderer.md
│       ├── 002-command-based-history.md
│       └── 003-logical-document-coordinates.md
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

### Reguły importów

- `apps/web` może importować z każdego pakietu.
- `editor-engine` może importować tylko `core` i `shared`.
- `renderer` może importować tylko `core`, `editor-engine` (kontrakty read-only) i `shared`.
- `io` może importować `core` i `shared`, ale nie React ani renderer.
- `core` nie może importować niczego z `apps`, `renderer`, `io` ani `editor-engine`.
- Żaden komponent React nie może bezpośrednio mutować `DocumentModel`; wszystkie zmiany przechodzą przez silnik i komendy.

---

## 4. Model domenowy

### 4.1. Współrzędne i jednostki

Wszystkie obiekty dokumentu używają **współrzędnych logicznych świata**. Nie są to piksele canvasa.

```ts
export type Unit = 'px' | 'mm' | 'cm' | 'in';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Założenia:

- `Document` zna jednostkę domyślną i może ją później przeliczać.
- Geometria może być przechowywana we wspólnej jednostce logicznej, np. `px`; UI konwertuje wartości do mm/cm/in.
- Kamera odpowiada za rzutowanie świata na ekran.
- Powiększenie artboardu nie wpływa na rozdzielczość canvasa.

### 4.2. Dokument

```ts
export interface DocumentModel {
  id: string;
  schemaVersion: 1;
  name: string;
  unit: Unit;
  artboards: Artboard[];
  layers: Layer[];
  objects: Record<string, SceneObject>;
  createdAt: string;
  updatedAt: string;
}

export interface Artboard {
  id: string;
  name: string;
  frame: Rect;
  background: ArtboardBackground;
  visible: boolean;
}

export type ArtboardBackground =
  | { type: 'transparent' }
  | { type: 'color'; color: string };

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  children: LayerChild[];
}

export type LayerChild =
  | { type: 'object'; objectId: string }
  | { type: 'group'; groupId: string };
```

### 4.3. Obiekty sceny

```ts
export interface BaseObject {
  id: string;
  name?: string;
  type: SceneObjectType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  transform: Transform;
  style: ObjectStyle;
}

export type SceneObjectType =
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'path'
  | 'group'
  | 'text'
  | 'image';

export interface Transform {
  position: Vec2;
  rotation: number;
  scale: Vec2;
  skew: Vec2;
  pivot: Vec2;
}

export interface RectangleObject extends BaseObject {
  type: 'rectangle';
  width: number;
  height: number;
  cornerRadius: {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
  };
}

export interface EllipseObject extends BaseObject {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
}

export interface LineObject extends BaseObject {
  type: 'line';
  start: Vec2;
  end: Vec2;
}

export interface PathObject extends BaseObject {
  type: 'path';
  closed: boolean;
  nodes: PathNode[];
}

export interface PathNode {
  id: string;
  point: Vec2;
  inHandle?: Vec2;
  outHandle?: Vec2;
  kind: 'corner' | 'smooth' | 'symmetric' | 'auto';
}

export type SceneObject =
  | RectangleObject
  | EllipseObject
  | LineObject
  | PathObject
  | GroupObject
  | TextObject
  | ImageObject;
```

W Skeleton MVP aktywne są: `rectangle`, `ellipse`, `line`, `path`. Typy `group`, `text`, `image` istnieją jako przyszła część kontraktu domenowego, ale UI i renderer nie muszą ich jeszcze obsługiwać.

### 4.4. Style

```ts
export interface ObjectStyle {
  fill: FillStyle;
  stroke: StrokeStyle;
}

export type FillStyle =
  | { type: 'none' }
  | { type: 'solid'; color: string }
  | {
      type: 'linear-gradient';
      start: Vec2;
      end: Vec2;
      stops: GradientStop[];
    };

export interface GradientStop {
  id: string;
  offset: number;
  color: string;
  opacity: number;
}

export interface StrokeStyle {
  enabled: boolean;
  color: string;
  width: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  miterLimit: number;
  dashArray: number[];
}
```

### 4.5. Invariants dokumentu

Każda komenda oraz importer muszą pozostawić dokument w poprawnym stanie:

- Każdy `objectId` w warstwie wskazuje na istniejący obiekt.
- Jeden obiekt nie może występować równocześnie w dwóch miejscach drzewa warstw.
- Artboard ma dodatnią szerokość i wysokość.
- Obiekt ma skończone wartości liczbowe; zakaz `NaN` i `Infinity`.
- Skala obiektu nie może być równa zero.
- Path ma minimum dwa węzły jako otwarta linia albo trzy jako zamknięty kształt.
- Wszystkie ID są unikalne.
- `opacity` jest w zakresie 0–1.

---

## 5. Kamera, viewport i renderowanie

### 5.1. Stan kamery

```ts
export interface Camera {
  pan: Vec2;
  zoom: number;
  rotation: number;
}

export interface Viewport {
  cssWidth: number;
  cssHeight: number;
  devicePixelRatio: number;
}
```

Początkowo `rotation = 0`, ale pole zostaje w kontrakcie, aby przyszła rotacja widoku nie wymagała zmiany modelu.

### 5.2. Transformacje

```text
world point → transform obiektu → camera transform → screen point
screen point → inverse camera transform → world point
```

Wymagania:

- Zoom kółkiem odbywa się względem kursora, a nie środka ekranu.
- Wszystkie narzędzia dostają zarówno `screenPoint`, jak i `worldPoint`.
- Tolerancje kliknięcia i uchwytów są w pikselach ekranu; po przeliczeniu na świat zależą od zoomu.
- Np. hit radius 8 px ma pozostać 8 px dla każdego poziomu zoomu.

### 5.3. Warstwy renderowania

```text
Canvas 1: background   → tło aplikacji, artboard, checkerboard
Canvas 2: scene        → obiekty dokumentu
Canvas 3: overlay      → selection box, handles, guides, lasso, Pen preview
DOM:      application  → toolbar, panele, menu, dialogi, tooltipy
```

Trzy canvasy są preferowane nad jednym, ponieważ ruch kursora lub uchwytów nie powinien wymuszać przerysowania całej sceny.

### 5.4. Kontrakt renderera

```ts
export interface VectorRenderer {
  setViewport(viewport: Viewport): void;
  renderScene(input: SceneRenderInput): void;
  renderOverlay(input: OverlayRenderInput): void;
  invalidate(reason: RenderInvalidation): void;
  dispose(): void;
}

export interface SceneRenderInput {
  document: DocumentModel;
  camera: Camera;
  viewport: Viewport;
  quality: 'interactive' | 'final';
}
```

### 5.5. Pętla renderu

- Nie renderuj na każde zdarzenie przeglądarki.
- Event tylko aktualizuje lekki stan i wywołuje `invalidate()`.
- `RenderLoop` gwarantuje maksymalnie jeden render w najbliższej klatce `requestAnimationFrame`.
- Gdy nie ma zmian, pętla nie renderuje niczego.
- W trakcie pan/zoom/drag renderer używa jakości `interactive`.
- Po około 120 ms bez interakcji renderuje jakość `final`.

```ts
class RenderLoop {
  private scheduled = false;

  invalidate(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.render();
    });
  }
}
```

### 5.6. Culling

Dla Skeleton MVP:

- wylicz `visibleWorldRect` na podstawie inverse transform kamery;
- wylicz bounding box każdego obiektu;
- renderuj tylko obiekty, których bounds przecinają viewport;
- hit-testuj od góry z-orderu i kończ po znalezieniu pierwszego trafienia.

Po pojawieniu się realnych dokumentów z tysiącami obiektów:

- wprowadź R-tree;
- indeksuj bounds obiektów i grup;
- hit-testuj tylko kandydatów z indeksu;
- utrzymuj indeks inkrementalnie po komendach.

### 5.7. Bezpieczny resize artboardu

Resize dokumentu jest operacją domenową, nie operacją rozmiaru canvasa.

```text
Użytkownik zmienia artboard 13 × 29 cm → 1350 × 4500 cm
        │
        ├─ natychmiast: UpdateArtboardFrameCommand
        ├─ natychmiast: renderer rysuje nowy obrys na viewport canvas
        ├─ później: odświeżenie gridu/miniatury/cache
        └─ nigdy: canvas.width = 1350 cm w pikselach
```

Dla ekstremalnych zmian logiczny rozmiar dokumentu może być ustawiony od razu, a kosztowne zadania poboczne będą aktualizowane w tle lub stopniowo. Jeśli w przyszłości trzeba będzie zwiększać roboczy zakres/cache, robi to krokowo co 10%, bez blokowania UI.

---

## 6. Stan aplikacji

### 6.1. Podział stanu

```ts
export interface DocumentState {
  document: DocumentModel;
  revision: number;
  dirty: boolean;
}

export interface EditorState {
  activeTool: ToolId;
  camera: Camera;
  selection: SelectionState;
  activeArtboardId: string;
  grid: GridSettings;
  snap: SnapSettings;
}

export interface InteractionState {
  pointerScreen: Vec2 | null;
  pointerWorld: Vec2 | null;
  drag: DragSession | null;
  lasso: LassoSession | null;
  penDraft: PenDraft | null;
}
```

| Stan | Częstotliwość zmian | Miejsce |
|---|---:|---|
| Dokument | po komendzie | `DocumentStore` |
| Kamera | pan/zoom | `EditorStore` |
| Selekcja | klik/drag | `EditorStore` |
| Kursor, gumka pióra, drag delta | nawet 120 razy/s | lokalny `InteractionState`, poza React renderingiem paneli |
| Otwarte menu, dialog, motyw | sporadycznie | store/UI React |

### 6.2. Selekcja

```ts
export interface SelectionState {
  objectIds: string[];
  nodeIds: string[];
  mode: 'object' | 'node';
}
```

W MVP wspieramy jedno zaznaczenie obiektu. Kontrakt jest wieloelementowy od początku, aby później dodać `Shift + click`, marquee, lasso i Align/Distribute bez przebudowy stanu.

---

## 7. System komend i historia

### 7.1. Kontrakt komendy

```ts
export interface Command {
  id: string;
  label: string;
  execute(document: DocumentModel): DocumentModel;
  undo(document: DocumentModel): DocumentModel;
  canMergeWith?(next: Command): boolean;
  mergeWith?(next: Command): Command;
}
```

W praktyce dopuszczalne są dwa warianty implementacji:

1. Komenda przechowuje stan przed/po operacji — prostsze dla MVP.
2. Komenda przechowuje minimalny patch/inverse patch — wydajniejsze dla większych plików.

Początkowo wybieramy wariant 1 dla prostoty, ale każde API ma pozostać command-based.

### 7.2. Minimalne komendy Skeleton MVP

```text
CreateObjectCommand
DeleteObjectsCommand
UpdateObjectTransformCommand
UpdateObjectStyleCommand
ResizeArtboardCommand
RenameLayerCommand
SetLayerVisibilityCommand
SetLayerLockedCommand
```

### 7.3. Drag jako jedna komenda

Podczas przeciągania:

1. `pointerdown`: zapisz initial transform do `DragSession`.
2. `pointermove`: aktualizuj tylko podgląd/stan tymczasowy.
3. `pointerup`: utwórz jedną `UpdateObjectTransformCommand`.
4. Undo cofa cały drag jednym skrótem, a nie o jeden piksel.

---

## 8. Narzędzia jako state machines

Każde narzędzie implementuje wspólny kontrakt. Nie pisz logiki narzędzi bezpośrednio w komponentach React.

```ts
export type ToolId =
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'pen'
  | 'pan';

export interface EditorTool {
  id: ToolId;
  cursor: string;
  activate?(ctx: ToolContext): void;
  deactivate?(ctx: ToolContext): void;
  pointerDown?(event: ToolPointerEvent, ctx: ToolContext): void;
  pointerMove?(event: ToolPointerEvent, ctx: ToolContext): void;
  pointerUp?(event: ToolPointerEvent, ctx: ToolContext): void;
  keyDown?(event: ToolKeyboardEvent, ctx: ToolContext): void;
  cancel?(ctx: ToolContext): void;
}
```

### 8.1. Narzędzia Skeleton MVP

| Tool | Skrót | Minimalne zachowanie |
|---|---|---|
| Select | `V` | kliknięcie zaznacza, drag przesuwa, handles skalują, `Delete` usuwa |
| Rectangle | `R` | drag tworzy prostokąt, `Shift` wymusza kwadrat |
| Ellipse | `L` | drag tworzy elipsę, `Shift` wymusza koło |
| Line | `\\` lub własny | drag tworzy linię |
| Pen | `P` | klik tworzy segment prosty, drag tworzy punkt z uchwytem Béziera, klik w pierwszy punkt zamyka ścieżkę, Enter kończy |
| Pan | `Space` | drag przesuwa kamerę; middle mouse działa niezależnie od aktywnego toola |

### 8.2. Pen Tool — minimalna state machine

```text
Idle
 └─ pointerDown on empty canvas → CreatingPath

CreatingPath
 ├─ click → Add corner node
 ├─ drag → Add smooth node with out handle
 ├─ click first node → Commit closed path → Idle
 ├─ Enter → Commit open path → Idle
 └─ Escape → Cancel current draft → Idle
```

W MVP nie implementujemy jeszcze pełnej edycji węzłów. Projektujemy jednak `PathNode`, uchwyty i typy węzłów od razu, aby Node Tool był rozszerzeniem, a nie zmianą formatu dokumentu.

---

## 9. Hit-testing i snapping

### 9.1. Hit-testing MVP

Kolejność od najprostszej do pełnej:

1. Najpierw bounding box obiektu.
2. Dla prostokąta i elipsy: sprawdzenie wnętrza/obrysu.
3. Dla linii i path: minimalna odległość kursora od segmentu.
4. Wynik wybierany zgodnie z kolejnością warstw/z-orderem od góry.

```ts
export interface HitTestResult {
  objectId: string;
  part: 'fill' | 'stroke' | 'bounds' | 'handle' | 'node';
  distancePx: number;
}
```

### 9.2. Snap MVP

Skeleton MVP ma wyłącznie snap do siatki.

```ts
export interface GridSettings {
  visible: boolean;
  size: number;
  subdivisions: number;
}

export interface SnapSettings {
  grid: boolean;
  tolerancePx: number;
}
```

Później `SnapService` rozszerzamy o prowadnice, węzły, centra, krawędzie, przecięcia i piksele. Narzędzia nie implementują własnego snappingu — pytają jeden serwis o `SnapResult`.

---

## 10. UI i layout

```text
┌──────────────────────────────── TopToolbar ───────────────────────────────┐
│ Logo · nazwa dokumentu · Undo/Redo · zoom · import/export · profil         │
├────────────┬──────────────────────── Canvas Area ────────────────┬────────┤
│ Left       │                                                      │ Right  │
│ Toolbar    │              Background / Scene / Overlay            │ Panels │
│            │                                                      │ Props  │
│ Select     │                                                      │ Layers │
│ Rectangle  │                                                      │        │
│ Ellipse    │                                                      │        │
│ Line       │                                                      │        │
│ Pen        │                                                      │        │
├────────────┴──────────────────────────────────────────────────────┴────────┤
│ StatusBar: pozycja kursora · zaznaczenie · zoom · jednostka · FPS dev      │
└────────────────────────────────────────────────────────────────────────────┘
```

### 10.1. Property panel

Panel prawy działa kontekstowo:

- brak zaznaczenia: właściwości dokumentu/artboardu;
- zaznaczony prostokąt/elipsa: X, Y, width, height, rotation, fill, stroke, opacity;
- zaznaczona linia/path: stroke, fill, opacity;
- aktywne narzędzie: ustawienia narzędzia, np. domyślny styl tworzonego obiektu.

### 10.2. Dostępność od początku

- Wszystkie przyciski toolbar mają nazwę, tooltip i skrót.
- Panele są dostępne klawiaturą i mają prawidłowy focus order.
- Canvas ma opisową etykietę ARIA oraz obsługę klawiatury.
- Interakcje wyłącznie pointerowe muszą mieć odpowiednik w panelu Properties.
- Motyw jasny/ciemny i widoczne focus ringi są częścią Skeleton MVP.

---

## 11. IO, autozapis i format pliku

### 11.1. Natywny format `.vct`

Natywny format Vectorii jest JSON-em lub archiwum JSON + assety, z wyraźnym numerem schematu.

```json
{
  "schemaVersion": 1,
  "app": "vectoria",
  "document": {}
}
```

MVP może zapisywać sam `DocumentModel` jako JSON w IndexedDB. Eksport pliku `.vct` można dodać w kolejnym kroku, gdy dokument ma już stabilny model.

### 11.2. Autosave

```text
Command dispatched
  → DocumentStore revision +1
  → oznacz dokument jako dirty
  → debounce 500–1000 ms
  → IndexedDBRepository.save(document)
  → oznacz jako saved / pokaż status
```

Wymagania:

- autosave nie blokuje inputu;
- awaria zapisu pokazuje stan błędu, ale nie niszczy dokumentu w pamięci;
- po odświeżeniu aplikacja odtwarza ostatni zapisany dokument;
- później zapis będzie wykonywany w workerze dla dużych plików.

### 11.3. SVG import

Importer SVG powinien:

1. Sanityzować wejście i odrzucać skrypty/niebezpieczne URL-e.
2. Mapować `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `g`, podstawowe `fill` i `stroke` na `DocumentModel`.
3. Zachowywać transformacje albo materializować je w modelu zgodnie z jedną zasadą.
4. Ostrzegać, jeśli SVG zawiera nieobsługiwany filtr, maskę, font lub element.
5. Nie udawać pełnej kompatybilności z każdym SVG już w MVP.

### 11.4. SVG export

Eksporter SVG powinien:

- generować poprawny `viewBox` na podstawie wybranego artboardu;
- renderować wszystkie wspierane obiekty;
- generować fill, stroke i basic linear gradient;
- mieć wariant `editable` bez agresywnej optymalizacji;
- później otrzymać wariant `optimized`.

### 11.5. PNG export

Eksport PNG może korzystać z tymczasowego canvasa o docelowym rozmiarze eksportu, ale:

- ma limit wymiaru i pamięci;
- nie używa głównego canvasa edytora;
- działa asynchronicznie;
- później przechodzi do workera;
- użytkownik dostaje ustawienia skali i transparentnego tła.

---

## 12. Granice MVP

### Wchodzi do Skeleton MVP

- Jedna strona edytora
- Nowy dokument: Custom, A4, 1920×1080, jednostka px
- Jeden artboard
- Bezpieczny resize artboardu
- Kamera: pan, zoom kursorem, fit artboard, fit drawing, 100%
- Grid + snap do grid
- Rectangle, ellipse, line, minimalny Pen Tool
- Select: wybór, move, resize, delete, duplicate, copy/paste
- Jedna warstwa z panelem widoczności/lock/rename
- Fill, stroke, opacity, linear gradient
- Właściwości X/Y/W/H
- Undo/Redo dla głównych operacji
- IndexedDB autosave i restore
- SVG import/export dla obsługiwanego podzbioru
- PNG export artboardu i zaznaczenia
- FPS debug overlay
- Motyw jasny/ciemny, tooltipy i podstawowa obsługa klawiatury

### Celowo nie wchodzi do Skeleton MVP

- Node Tool i pełna edycja uchwytów
- Boolean, clipping/opacity masks, compound paths
- Tekst i fonty
- Obrazy, trace image i assety
- Multi-artboard
- PDF/EPS/AI/CDR
- Collaboration, użytkownicy, płatności i chmura
- AI
- R-tree, worker pool, OffscreenCanvas, WebGL, cache tekstur
- Zaawansowane efekty, brushes, mesh, perspective i 3D

---

## 13. Plan implementacji

### Faza A — działający canvas

**Rezultat:** pusty, płynny edytor z bezpiecznym artboardem.

- Bootstrap monorepo i aplikacji webowej
- `core`: dokument, artboard, warstwa, rectangle i style
- Canvas 2D + trzy warstwy renderu
- Kamera, pan, zoom i fit artboard
- RenderLoop oparty o `requestAnimationFrame`
- Minimalny Performance HUD
- New Document modal i resize artboardu

### Faza B — pierwszy obiekt

**Rezultat:** użytkownik tworzy prostokąt, widzi go i nie gubi go podczas zoomu/pan.

- Rectangle Tool
- Select Tool
- Hit-test bounds prostokąta
- Selection overlay
- Drag move i Delete
- Fill/stroke panel
- Jedna warstwa w Layers panel

### Faza C — podstawowa grafika

**Rezultat:** można zrobić prostą ikonę/logo.

- Ellipse i line
- Skalowanie selection przez handles
- X/Y/W/H i lock proportions
- Grid i grid snap
- Duplicate/copy/paste
- Undo/Redo
- Linear gradient

### Faza D — rdzeń wektorowy

**Rezultat:** można stworzyć i eksportować prostą ścieżkę Béziera.

- Minimalny Pen Tool
- Path renderer
- Path hit-testing podstawowy
- Zamykanie i anulowanie ścieżki
- SVG path import/export

### Faza E — trwałość i pliki

**Rezultat:** użytkownik może wrócić do pracy i użyć wyniku poza Vectorią.

- IndexedDB autosave
- Restore ostatniego dokumentu
- SVG export
- SVG import wspieranego podzbioru
- PNG export artboardu/zaznaczenia
- Błędy importu/eksportu i komunikaty UI

---

## 14. Performance budget

### Wymagania MVP

| Sytuacja | Cel |
|---|---:|
| Pan i zoom prostego dokumentu | 60 FPS |
| Drag jednego obiektu | 60 FPS |
| Reakcja na kliknięcie | poniżej 50 ms |
| Zmiana wymiaru artboardu | UI nie może się blokować |
| Autosave | niewidoczny dla użytkownika |
| Import/export | może trwać, ale ma status/progress i nie blokuje UI docelowo |

### Reguły wydajności

- Nigdy nie renderuj dokumentu przez React reconciliation na każdy `pointermove`.
- Nigdy nie twórz canvasa o wymiarach dokumentu.
- Nigdy nie kopiuj całego dokumentu dla każdego piksela drag.
- Zawsze renderuj przez `requestAnimationFrame`.
- Zawsze przeliczaj world/screen jedną wspólną implementacją transformacji.
- Zawsze mierz frame time przed dodaniem złożonej optymalizacji.
- Gdy pojawią się ciężkie operacje, przenieś je do workera zamiast blokować main thread.

### Scenariusze benchmarkowe

```text
B1: 100 rectangles, pan/zoom/drag
B2: 1 000 rectangles, pan/zoom
B3: 100 paths po 50 segmentów
B4: logiczny artboard 1 000 000 × 1 000 000 units
B5: resize artboardu z małego do ekstremalnie dużego
B6: import SVG z 1 000 wspieranych elementów
B7: eksport PNG 4k z dużego artboardu
```

B1 i B4 są wymagane jeszcze przed końcem Skeleton MVP. Pozostałe benchmarki powinny pojawić się, zanim dodasz optymalizacje typu R-tree lub worker rendering.

---

## 15. Rozszerzenia po MVP

### Etap 1: Profesjonalna edycja wektorów

- Node Tool: wybieranie węzłów, segmentów i uchwytów
- Typy węzłów: corner, smooth, symmetric, auto
- Add/delete/join/break nodes
- Smooth i simplify paths
- Corner Tool, offset path i outline stroke
- Boolean: unite, subtract, intersect, exclude, divide
- Compound paths, clipping mask i isolate mode

### Etap 2: Projektowanie i typografia

- Artistic text i paragraph text
- Fonty, kerning, tracking, text on path
- Multi-artboard
- Swatches, global colors, styles
- Assets, symbols, components i Brand Kit
- Image import, crop, trace image

### Etap 3: Pliki i produktywność

- PDF import/export
- Export for Screens
- Batch export
- SVG optimized export
- Wyszukiwanie i zamiana obiektów/stylów
- Command palette i konfigurowalne skróty

### Etap 4: SaaS i AI

- Konta, projekty i foldery
- Cloud sync oraz historia wersji
- Linki do podglądu, komentarze i współpraca
- Realtime collaboration
- AI SVG icon generation
- AI clean-up paths, naming layers, palette extraction i komendy językowe

---

## 16. Definition of Done dla Skeleton MVP

Skeleton MVP jest gotowy tylko wtedy, gdy przejdzie poniższy scenariusz:

1. Użytkownik otwiera aplikację i tworzy dokument 1920×1080.
2. Użytkownik płynnie przybliża, oddala i przesuwa widok.
3. Użytkownik rysuje prostokąt, koło, linię i prostą ścieżkę Béziera.
4. Użytkownik zaznacza prostokąt, przesuwa go, skaluje i usuwa.
5. Użytkownik ustawia fill, stroke, opacity i gradient liniowy.
6. Użytkownik zmienia artboard na ekstremalnie większy, a UI nie zawiesza się.
7. Użytkownik wykonuje Undo i Redo dla tworzenia, przesunięcia, usunięcia i stylu.
8. Użytkownik odświeża stronę i odzyskuje ostatnio zapisany dokument.
9. Użytkownik importuje wspierany prosty SVG.
10. Użytkownik eksportuje artboard do SVG i PNG.

Jeżeli któryś z tych punktów nie działa stabilnie, nie dokładamy jeszcze Booleanów, tekstu, PDF, AI ani collaboration.

---

## 17. ADR — decyzje do utrzymania

### ADR-001: Canvas-first rendering

**Decyzja:** scena dokumentu jest renderowana przez Canvas 2D, a UI przez React DOM.

**Powód:** kontrola nad renderingiem, overlay, cullingiem i zachowaniem przy dużej liczbie obiektów.

**Konsekwencja:** trzeba własnoręcznie implementować hit-testing, selection overlay i część dostępności canvasa.

### ADR-002: Dokument w współrzędnych logicznych

**Decyzja:** rozmiar artboardu i obiektów istnieje wyłącznie jako dane logiczne; canvas jest wielkości viewportu.

**Powód:** odporność na ogromne dokumenty i brak alokacji gigantycznych bitmap.

**Konsekwencja:** wszystkie narzędzia muszą poprawnie konwertować screen ↔ world.

### ADR-003: Command-based document mutations

**Decyzja:** dokument zmieniają wyłącznie komendy dispatchowane przez Editor Engine.

**Powód:** Undo/Redo, autosave, testy, współpraca i łatwiejsza diagnostyka.

**Konsekwencja:** nie wolno mutować obiektów wprost w komponentach UI.

### ADR-004: React nie obsługuje high-frequency interaction

**Decyzja:** stan kursora, drag delta, lasso i draft Pen Tool żyją w engine/rendererze, nie w propsach całej aplikacji.

**Powód:** zachowanie stałych klatek i brak masowych rerenderów.

**Konsekwencja:** panele mogą aktualizować się po commicie lub selektywnie, a nie per pixel ruchu kursora.

### ADR-005: SVG jako format wymiany, `.vct` jako format projektu

**Decyzja:** SVG służy do importu/eksportu, a natywny model Vectorii jest źródłem prawdy projektu.

**Powód:** nie wszystkie funkcje przyszłej aplikacji da się stabilnie zapisać w prostym SVG.

**Konsekwencja:** importer/eksporter są adapterami z jasno opisanym zakresem kompatybilności.

---

## 18. Zakazy projektowe

Następujące rozwiązania są zabronione bez świadomej decyzji architektonicznej:

- Rysowanie całego dokumentu przez tysiące elementów SVG DOM jako domyślny renderer.
- Trzymanie całego dokumentu w jednym React Context aktualizowanym na każde `pointermove`.
- Wymiar canvasa równy wymiarowi artboardu.
- Operacje importu, eksportu, Boolean, trace lub ciężkiej serializacji synchronicznie w UI event handlerze.
- Mieszanie geometrii i Canvas API w komponentach paneli.
- Implementowanie Undo przez kopiowanie całego dokumentu dla każdej minimalnej zmiany bez limitu lub strategii kompresji.
- Dodawanie kolejnych narzędzi bez testów transformacji world/screen i bez testu Undo/Redo.
- Udawanie pełnej kompatybilności AI/CDR/PDF bez test fixtures i listy obsługiwanych elementów.

---

## 19. Pierwsza checklista techniczna

- [ ] Utworzyć monorepo: `apps/web`, `packages/core`, `packages/editor-engine`, `packages/renderer`, `packages/io`
- [ ] Zdefiniować `DocumentModel`, `Artboard`, `Layer`, `RectangleObject`, `ObjectStyle`
- [ ] Napisać testy invariants dokumentu
- [ ] Utworzyć `EditorEngine` i `DocumentStore`
- [ ] Zaimplementować `Camera` i world/screen transform
- [ ] Utworzyć trzy canvas layers
- [ ] Zaimplementować `RenderLoop` przez `requestAnimationFrame`
- [ ] Zaimplementować background/artboard renderer
- [ ] Zaimplementować Rectangle renderer
- [ ] Utworzyć `RectangleTool` oraz `SelectTool`
- [ ] Zaimplementować hit-test bounds prostokąta
- [ ] Dodać selection overlay i drag move
- [ ] Dodać `CreateObject`, `MoveObject`, `DeleteObject` oraz Undo/Redo
- [ ] Dodać New Document dialog i resize artboardu
- [ ] Dodać fill/stroke controls
- [ ] Dodać IndexedDB autosave
- [ ] Dodać SVG export prostokąta
- [ ] Dodać benchmark B1 i B4

---

Ten dokument jest źródłem prawdy dla architektury Vectorii. Backlog funkcji ma być podporządkowany tym granicom: płynna interakcja, logiczny model dokumentu, renderer niezależny od UI oraz rozwój od małego działającego workflow do profesjonalnego edytora.
