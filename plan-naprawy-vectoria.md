# Plan Naprawy i Usprawnień — Projekt Vectoria (wersja finalna, skorygowana)

Ten plan konsoliduje wnioski z czterech tur audytu kodu i naprawia dwa braki
znalezione w poprzedniej wersji planu (brak fixów P0) oraz koryguje jeden
błąd projektowy w typowaniu (`GeometryPatch`) i jedno ryzykowne założenie
(`beforeunload`).

> [!IMPORTANT]
> Żaden plik źródłowy nie zostanie zmodyfikowany przed wyraźną akceptacją
> tego planu. Punkty oznaczone **[ZWERYFIKUJ NAJPIERW]** wymagają
> sprawdzenia stanu lokalnego repozytorium przed wprowadzeniem zmiany —
> w dumpie źródłowym, na którym oparta jest ta analiza, nie udało się ich
> jednoznacznie potwierdzić.

---

## Priorytet 0 — Błędy krytyczne (blokujące dalszy rozwój)

Te dwa punkty muszą zostać naprawione przed jakimkolwiek rozszerzaniem
zakresu funkcjonalnego (Ellipse/Line/Path), inaczej nowy kod odziedziczy te
same wady.

### 0.1 [MODIFY] `packages/io/src/svg/export.ts` — błędny `viewBox`/`clipPath` dla przesuniętego artboardu

**Problem:** `Artboard` ma pola `x`/`y`, ale eksport SVG zakłada zawsze
`(0, 0)`:

```ts
// PRZED
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ...>
  <defs>
    <clipPath id="${clipId}">
      <rect x="0" y="0" width="${width}" height="${height}" />
    </clipPath>
  </defs>
  <g clip-path="url(#${clipId})">
    ${elements.join("\n")}
  </g>
</svg>`;
```

Obiekty renderowane są w globalnych współrzędnych dokumentu
(`getTransformMatrix(obj.transform)`), więc artboard z `x`/`y` ≠ 0 daje
przesunięty lub pusty eksport.

**Naprawa:**

```ts
// PO
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
  width="${width}"
  height="${height}"
  overflow="hidden"
>
  <defs>
    <clipPath id="${clipId}">
      <rect x="0" y="0" width="${width}" height="${height}" />
    </clipPath>
  </defs>
  <g clip-path="url(#${clipId})" transform="translate(${-artboard.x} ${-artboard.y})">
    ${elements.join("\n")}
  </g>
</svg>`;
```

**Test regresyjny** (`packages/io/test/io.test.ts`):

```ts
it("exports objects relative to a displaced artboard", () => {
  const doc = createDefaultDocument({ width: 800, height: 600 });
  const artboard = doc.artboards[doc.activeArtboardId]!;

  const shiftedDoc = {
    ...doc,
    artboards: {
      ...doc.artboards,
      [artboard.id]: { ...artboard, x: 500, y: 300 },
    },
  };

  const rect: RectangleObject = {
    type: "rectangle",
    id: "rect-shifted",
    name: "Rect",
    layerId: shiftedDoc.activeLayerId,
    visible: true,
    locked: false,
    transform: createTransform({ x: 550, y: 350 }),
    style: defaultObjectStyle,
    width: 100,
    height: 50,
    cornerRadius: 0,
  };

  const docWithRect = {
    ...shiftedDoc,
    objects: { [rect.id]: rect },
    layers: {
      ...shiftedDoc.layers,
      [shiftedDoc.activeLayerId]: {
        ...shiftedDoc.layers[shiftedDoc.activeLayerId]!,
        objectIds: [rect.id],
      },
    },
  };

  const svg = exportArtboardToSvg(docWithRect);

  expect(svg).toContain('transform="translate(-500 -300)"');
  expect(svg).toContain('viewBox="0 0 800 600"');
});
```

---

### 0.2 [MODIFY] `apps/web/src/features/canvas/CanvasViewport.tsx` — usunięcie mutacji `doc` podczas dragowania

**Problem:** kod jawnie (i świadomie, wg komentarza autora) mutuje
`readonly` pola dokumentu podczas przesuwania obiektu, omijając
`CommandHistory` i niemutowalność `DocumentModel`:

```ts
// PRZED — bezpośrednia mutacja, komentarz autora:
// "Transient move preview by directly mutating active object during drag — no React state trigger"
(obj as { transform: Transform2D }).transform.position = {
  x: drag.initialObjectTransform.position.x + deltaWorld.x,
  y: drag.initialObjectTransform.position.y + deltaWorld.y,
};
```

**Naprawa — wprowadzenie osobnego stanu preview:**

```ts
// Nowy lokalny stan podglądu (nie mutuje doc)
type DragPreview = {
  objectId: ObjectId;
  transform: Transform2D;
} | null;

const [dragPreview, setDragPreview] = useState<DragPreview>(null);
```

W `handlePointerMove` (przypadek `move-object`):

```ts
setDragPreview({
  objectId: selectedObjectId,
  transform: {
    ...drag.initialObjectTransform,
    position: {
      x: drag.initialObjectTransform.position.x + deltaWorld.x,
      y: drag.initialObjectTransform.position.y + deltaWorld.y,
    },
  },
});
renderLoopRef.current?.invalidate();
```

`renderAll` i `renderScene`/`renderOverlay` przyjmują opcjonalny
`previewTransforms: ReadonlyMap<ObjectId, Transform2D>` i używają go
**wyłącznie do rysowania**, bez dotykania `doc`:

```ts
renderScene(sceneCtx, camera, doc, sceneCanvas.width, sceneCanvas.height, {
  previewTransforms: dragPreview
    ? new Map([[dragPreview.objectId, dragPreview.transform]])
    : undefined,
});
```

W `finishInteraction` (przypadek `move-object`) — dopiero tu tworzona jest
komenda, a preview jest czyszczony:

```ts
if (dragPreview) {
  const cmd = new TransformObjectsCommand(
    [dragPreview.objectId],
    new Map([[dragPreview.objectId, dragPreview.transform]]),
  );
  onExecuteCommand(cmd);
}
setDragPreview(null);
```

W `cancelInteraction` (Escape / pointercancel) wystarczy:

```ts
setDragPreview(null);
renderLoopRef.current?.invalidate();
```

— nie trzeba już „odtwarzać” mutowanego obiektu, bo `doc` nigdy nie był
zmieniony.

**Wymagane zmiany towarzyszące:**
- `renderScene()` w `packages/renderer/src/index.ts` musi przyjąć
  opcjonalny czwarty parametr `options?: { previewTransforms?: ReadonlyMap<ObjectId, Transform2D> }`
  i użyć transformacji z mapy zamiast `obj.transform`, jeśli obiekt jest w
  mapie.
- Analogicznie `renderOverlay()` dla obrysu zaznaczenia w trakcie ruchu.

---

## Priorytet 1 — Narzędzia, testy, CI

### 1.1 [MODIFY] `vitest.config.ts` (root)
Wykluczenie testów E2E Playwrighta z Vitest:

```ts
export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/e2e/**",
      "**/*.e2e.spec.ts",
    ],
  },
});
```

> Uwaga: jeśli pliki Playwrighta nazywają się `*.spec.ts` (bez `.e2e.`),
> lepiej ujednolicić konwencję nazewnictwa (`*.e2e.spec.ts` dla Playwright,
> `*.test.ts` dla Vitest) niż wykluczać ogólny wzorzec `*.spec.ts` — to
> ostatnie mogłoby przypadkiem wyciszyć realne testy jednostkowe, gdyby
> ktoś kiedyś nazwał plik `foo.spec.ts` z intencją użycia Vitest.

### 1.2 [MODIFY] `package.json` (root)
Dodanie `"type": "module"` — potrzebne wyłącznie jeśli faktycznie istnieje
`eslint.config.js` w formacie ESM w rootcie. **[ZWERYFIKUJ NAJPIERW]** czy
taki plik już istnieje — w analizowanym dumpie źródłowym go nie było.

### 1.3 [MODIFY] `packages/*/package.json` oraz `apps/web/package.json`
Zamiana we wszystkich 7 pakietach (`shared`, `core`, `editor-engine`,
`renderer`, `io`, `ui`, `web`):

```diff
- "lint": "echo \"lint ok\""
+ "lint": "eslint ."
```

Wymaga dodania w rootcie:

```bash
pnpm add -D -w eslint @eslint/js typescript-eslint \
  eslint-plugin-react-hooks eslint-plugin-react-refresh
```

z minimalnym `eslint.config.js` włączającym:
- `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`,
- `@typescript-eslint/no-explicit-any`,
- `@typescript-eslint/no-floating-promises`,
- zakaz `as` bez wyraźnego uzasadnienia (`no-unnecessary-type-assertion`).

### 1.4 [MODIFY] `apps/web/package.json` — dodanie zależności Playwright
Skrypt `"test:e2e": "playwright test"` istnieje, ale zależność nie:

```bash
pnpm add -D --filter vectoria-web @playwright/test
pnpm --filter vectoria-web exec playwright install chromium
```

Minimalny scenariusz E2E do dodania w `apps/web/e2e/editor.spec.ts`:
narysuj prostokąt → zaznacz → przesuń → cofnij → ponów → zmień fill →
odśwież stronę (sprawdź IndexedDB) → eksportuj SVG i zweryfikuj treść
(w tym poprawność `transform="translate(...)"` dla przesuniętego
artboardu — regresja do punktu 0.1).

### 1.5 [ZWERYFIKUJ NAJPIERW] `packages/ui/src/primitives/NumberInput.tsx`
Przed usunięciem importu `useEffect` sprawdź, czy hook nie synchronizuje
lokalnego stanu wyświetlanej wartości z propsem `value` przy zmianach
zewnętrznych (np. po undo/redo, gdy input nie ma fokusu). W zminifikowanym
buildzie widoczne jest wywołanie `useEffect` w komponencie o kształcie
odpowiadającym `NumberInput` — usunięcie go bez sprawdzenia może złamać
synchronizację wartości po undo/redo.

### 1.6 [ZWERYFIKUJ NAJPIERW] `apps/web/src/features/canvas/CanvasViewport.tsx`
Przed usunięciem „4 zbędnych komentarzy `eslint-disable`” zweryfikuj, że
faktycznie istnieją w aktualnej wersji pliku — w analizowanym źródle nie
były widoczne.

---

## Priorytet 2 — Warstwa domenowa (`packages/core`)

### 2.1 [MODIFY] `document-commands.ts` — kontekstowe opisy w `SetObjectStyleCommand`

```ts
constructor(
  private readonly objectIds: readonly ObjectId[],
  private readonly stylePatch: Partial<ObjectStyle>,
) {
  if (stylePatch.fill !== undefined) {
    this.description = "Change fill";
  } else if (stylePatch.stroke !== undefined) {
    this.description = "Change stroke";
  } else if (stylePatch.opacity !== undefined) {
    this.description = "Change opacity";
  } else {
    this.description = "Change style";
  }
}
```

### 2.2 [MODIFY] `document-commands.ts` — bezpieczne typowanie geometrii

Zamiast jednej niedyskryminowanej unii (`GeometryPatch` bez wspólnego pola
typu, która nie daje kompilatorowi żadnej korzyści przy zwężaniu typów),
**rozdzielić na komendy per typ obiektu** — to jest bezpieczniejsze i
łatwiejsze do walidacji niż ogólny `Record<string, unknown>`:

```ts
export class SetRectangleGeometryCommand implements Command {
  readonly type = "SetRectangleGeometry";
  description = "Resize";
  private previous: { width: number; height: number; cornerRadius: number } | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly patch: Readonly<{
      width?: number;
      height?: number;
      cornerRadius?: number;
    }>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (!object || object.type !== "rectangle") return doc;

    const width = this.patch.width ?? object.width;
    const height = this.patch.height ?? object.height;
    const cornerRadius = Math.min(
      Math.max(0, this.patch.cornerRadius ?? object.cornerRadius),
      width / 2,
      height / 2,
    );

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return doc;
    }

    this.previous = { width: object.width, height: object.height, cornerRadius: object.cornerRadius };
    this.description = this.patch.cornerRadius !== undefined && this.patch.width === undefined
      ? "Change corner radius"
      : "Resize";

    return {
      ...doc,
      objects: { ...doc.objects, [this.objectId]: { ...object, width, height, cornerRadius } },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const object = doc.objects[this.objectId];
    if (!object) return doc;
    return {
      ...doc,
      objects: { ...doc.objects, [this.objectId]: { ...object, ...this.previous } },
      updatedAt: new Date().toISOString(),
    };
  }
}
```

Analogiczne klasy: `SetEllipseGeometryCommand`, `SetLineGeometryCommand`
(patch `{ endPoint?: Vec2 }`), `SetPathGeometryCommand`
(patch `{ nodes?; closed? }`) — każda z własną walidacją odpowiadającą
kształtowi obiektu. Stary `SetObjectGeometryCommand` można oznaczyć jako
`@deprecated` i usunąć w kolejnym kroku po migracji wywołań w
`EditorApp.tsx`/`PropertiesPanel.tsx`.

### 2.3 [MODIFY] `packages/core/src/model/invariants.ts` — rozszerzenie walidacji

```ts
// Stroke
if (obj.style.stroke) {
  if (obj.style.stroke.width < 0) {
    violations.push({ code: "INVALID_STROKE_WIDTH", message: `Object ${objectId} has negative stroke width.` });
  }
  if (obj.style.stroke.opacity < 0 || obj.style.stroke.opacity > 1) {
    violations.push({ code: "INVALID_STROKE_OPACITY", message: `Object ${objectId} stroke opacity out of range.` });
  }
  if (obj.style.stroke.miterLimit < 1) {
    violations.push({ code: "INVALID_MITER_LIMIT", message: `Object ${objectId} miterLimit must be >= 1.` });
  }
}

// Gradient
if (obj.style.fill.type === "linear-gradient") {
  const { stops, start, end } = obj.style.fill;
  if (stops.length < 2) {
    violations.push({ code: "INVALID_GRADIENT_STOPS", message: `Object ${objectId} gradient needs >= 2 stops.` });
  }
  for (const stop of stops) {
    if (stop.offset < 0 || stop.offset > 1) {
      violations.push({ code: "INVALID_GRADIENT_OFFSET", message: `Object ${objectId} gradient offset out of range.` });
    }
  }
  if (!Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(end.x) || !Number.isFinite(end.y)) {
    violations.push({ code: "NON_FINITE_GRADIENT_POINT", message: `Object ${objectId} gradient has non-finite points.` });
  }
}

// Ellipse / Line / Path
if (obj.type === "ellipse" && (obj.width <= 0 || obj.height <= 0)) {
  violations.push({ code: "INVALID_ELLIPSE_SIZE", message: `Object ${objectId} has non-positive ellipse dimensions.` });
}
if (obj.type === "line" && (!Number.isFinite(obj.endPoint.x) || !Number.isFinite(obj.endPoint.y))) {
  violations.push({ code: "NON_FINITE_ENDPOINT", message: `Object ${objectId} has non-finite endPoint.` });
}
if (obj.type === "path") {
  for (const node of obj.nodes) {
    const points = [node.point, node.inHandle, node.outHandle].filter(Boolean) as Vec2[];
    if (points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
      violations.push({ code: "NON_FINITE_PATH_NODE", message: `Object ${objectId} has non-finite path node coordinates.` });
    }
  }
}

// Duplikaty w tablicach ID
if (new Set(doc.layerIds).size !== doc.layerIds.length) {
  violations.push({ code: "DUPLICATE_LAYER_IDS", message: "layerIds contains duplicates." });
}
if (new Set(doc.artboardIds).size !== doc.artboardIds.length) {
  violations.push({ code: "DUPLICATE_ARTBOARD_IDS", message: "artboardIds contains duplicates." });
}
```

### 2.4 [OPCJONALNE] Walidacja invariantów w trybie dev po każdej komendzie

```ts
// w CommandHistory.execute() lub w warstwie EditorApp
const next = command.execute(doc);
if (import.meta.env.DEV) {
  const violations = validateInvariants(next);
  if (violations.length > 0) {
    throw new Error(
      `Invalid document after ${command.type}: ${violations.map(v => v.message).join("; ")}`,
    );
  }
}
return next;
```

---

## Priorytet 3 — Silnik edytora, renderer, IO

### 3.1 [MODIFY] `packages/editor-engine/src/hit-test.ts`

```ts
function hitTestObject(obj: SceneObject, worldPoint: Vec2): boolean {
  switch (obj.type) {
    case "rectangle": return hitTestRectangle(obj, worldPoint);
    case "ellipse": return hitTestEllipse(obj, worldPoint);
    case "line": return hitTestLine(obj, worldPoint);
    case "path": return hitTestPath(obj, worldPoint);
    default: return false;
  }
}

function hitTestEllipse(obj: EllipseObject, worldPoint: Vec2): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;
  const local = mat3TransformPoint(inv, worldPoint);
  const rx = obj.width / 2;
  const ry = obj.height / 2;
  const cx = rx;
  const cy = ry;
  const hasFill = obj.style.fill.type !== "none";
  const strokeWidth = obj.style.stroke?.width ?? 0;

  const normalized = ((local.x - cx) ** 2) / (rx ** 2) + ((local.y - cy) ** 2) / (ry ** 2);

  if (hasFill) return normalized <= 1;

  const halfStroke = strokeWidth / 2;
  const outerRx = rx + halfStroke;
  const outerRy = ry + halfStroke;
  const innerRx = Math.max(rx - halfStroke, 0);
  const innerRy = Math.max(ry - halfStroke, 0);
  const outer = ((local.x - cx) ** 2) / (outerRx ** 2) + ((local.y - cy) ** 2) / (outerRy ** 2);
  const inner = innerRx > 0 && innerRy > 0
    ? ((local.x - cx) ** 2) / (innerRx ** 2) + ((local.y - cy) ** 2) / (innerRy ** 2)
    : Infinity;
  return outer <= 1 && inner >= 1;
}

function hitTestLine(obj: LineObject, worldPoint: Vec2): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;
  const local = mat3TransformPoint(inv, worldPoint);
  const strokeWidth = obj.style.stroke?.width ?? 1;
  const tolerance = Math.max(strokeWidth / 2, 4); // min. 4px tolerancji dla łatwiejszego klikania

  const distance = distancePointToSegment(local, { x: 0, y: 0 }, obj.endPoint);
  return distance <= tolerance;
}

function distancePointToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };
  const lengthSq = ab.x ** 2 + ab.y ** 2;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / lengthSq));
  const closest = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return Math.hypot(p.x - closest.x, p.y - closest.y);
}

function hitTestPath(obj: PathObject, worldPoint: Vec2): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;
  const local = mat3TransformPoint(inv, worldPoint);
  const hasFill = obj.style.fill.type !== "none";

  if (hasFill && obj.closed) {
    return pointInPolygon(local, obj.nodes.map(n => n.point));
  }

  const strokeWidth = obj.style.stroke?.width ?? 1;
  const tolerance = Math.max(strokeWidth / 2, 4);
  for (let i = 0; i < obj.nodes.length - (obj.closed ? 0 : 1); i++) {
    const a = obj.nodes[i]!.point;
    const b = obj.nodes[(i + 1) % obj.nodes.length]!.point;
    if (distancePointToSegment(local, a, b) <= tolerance) return true;
  }
  return false;
}
```

> Uwaga: powyższy hit-test dla `path` używa liniowej aproksymacji między
> węzłami (ignoruje `inHandle`/`outHandle`, czyli krzywizny Béziera). To
> jest świadomy kompromis na start — pełny hit-test na krzywych sześciennych
> wymaga próbkowania krzywej (np. 16–32 punktów na segment) i jest osobnym,
> większym zadaniem, które warto zaplanować jako kolejny krok, a nie
> wliczać w ten sam commit.

### 3.2 [MODIFY] `packages/renderer/src/index.ts`

```ts
function renderScene(ctx, camera, doc, canvasWidth, canvasHeight, options?: {
  previewTransforms?: ReadonlyMap<ObjectId, Transform2D>;
}) {
  // ...
  for (const objectId of layer.objectIds) {
    const obj = doc.objects[objectId];
    if (!obj?.visible) continue;
    const transform = options?.previewTransforms?.get(objectId) ?? obj.transform;
    const effectiveObj = transform === obj.transform ? obj : { ...obj, transform };
    switch (effectiveObj.type) {
      case "rectangle": renderRectangle(ctx, effectiveObj); break;
      case "ellipse": renderEllipse(ctx, effectiveObj); break;
      case "line": renderLine(ctx, effectiveObj); break;
      case "path": renderPath(ctx, effectiveObj); break;
    }
  }
}

function renderEllipse(ctx: CanvasRenderingContext2D, obj: EllipseObject): void {
  const matrix = getTransformMatrix(obj.transform);
  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;

  const rx = obj.width / 2;
  const ry = obj.height / 2;

  if (obj.style.fill.type === "solid") {
    ctx.fillStyle = obj.style.fill.color;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (obj.style.stroke) {
    ctx.strokeStyle = obj.style.stroke.color;
    ctx.lineWidth = obj.style.stroke.width;
    if (obj.style.stroke.dashArray.length > 0) ctx.setLineDash([...obj.style.stroke.dashArray]);
    ctx.globalAlpha = obj.style.opacity * obj.style.stroke.opacity;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function renderLine(ctx: CanvasRenderingContext2D, obj: LineObject): void {
  const matrix = getTransformMatrix(obj.transform);
  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  if (obj.style.stroke) {
    ctx.strokeStyle = obj.style.stroke.color;
    ctx.lineWidth = obj.style.stroke.width;
    ctx.lineCap = obj.style.stroke.lineCap;
    ctx.globalAlpha = obj.style.opacity * obj.style.stroke.opacity;
    if (obj.style.stroke.dashArray.length > 0) ctx.setLineDash([...obj.style.stroke.dashArray]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(obj.endPoint.x, obj.endPoint.y);
    ctx.stroke();
  }
  ctx.restore();
}

function renderPath(ctx: CanvasRenderingContext2D, obj: PathObject): void {
  const matrix = getTransformMatrix(obj.transform);
  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;

  ctx.beginPath();
  obj.nodes.forEach((node, i) => {
    if (i === 0) {
      ctx.moveTo(node.point.x, node.point.y);
      return;
    }
    const prev = obj.nodes[i - 1]!;
    const cp1 = prev.outHandle ?? prev.point;
    const cp2 = node.inHandle ?? node.point;
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, node.point.x, node.point.y);
  });
  if (obj.closed) ctx.closePath();

  if (obj.style.fill.type === "solid" && obj.closed) {
    ctx.fillStyle = obj.style.fill.color;
    ctx.fill();
  }
  if (obj.style.stroke) {
    ctx.strokeStyle = obj.style.stroke.color;
    ctx.lineWidth = obj.style.stroke.width;
    ctx.globalAlpha = obj.style.opacity * obj.style.stroke.opacity;
    ctx.stroke();
  }
  ctx.restore();
}
```

Analogiczne funkcje `renderEllipseSelectionOutline`,
`renderLineSelectionOutline`, `renderPathSelectionOutline` w
`renderOverlay()` — na wzór istniejącego `renderRectangleSelectionOutline`.

### 3.3 [MODIFY] `packages/io/src/svg/export.ts`

```ts
function renderSceneObjectToSvg(obj: SceneObject): string | null {
  switch (obj.type) {
    case "rectangle": return renderRectangleToSvg(obj);
    case "ellipse": return renderEllipseToSvg(obj);
    case "line": return renderLineToSvg(obj);
    case "path": return renderPathToSvg(obj);
    default: return null;
  }
}

function renderEllipseToSvg(obj: EllipseObject): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;
  const rx = obj.width / 2;
  const ry = obj.height / 2;
  const fillAttr = obj.style.fill.type === "solid" ? `fill="${escapeXml(obj.style.fill.color)}"` : `fill="none"`;
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : "";
  return `<ellipse cx="${rx}" cy="${ry}" rx="${rx}" ry="${ry}" transform="${transformAttr}" ${fillAttr}${strokeAttr} />`;
}

function renderLineToSvg(obj: LineObject): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : "";
  return `<line x1="0" y1="0" x2="${obj.endPoint.x}" y2="${obj.endPoint.y}" transform="${transformAttr}"${strokeAttr} />`;
}

function renderPathToSvg(obj: PathObject): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;
  const d = obj.nodes.map((node, i) => {
    if (i === 0) return `M ${node.point.x} ${node.point.y}`;
    const prev = obj.nodes[i - 1]!;
    const cp1 = prev.outHandle ?? prev.point;
    const cp2 = node.inHandle ?? node.point;
    return `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${node.point.x} ${node.point.y}`;
  }).join(" ") + (obj.closed ? " Z" : "");

  const fillAttr = obj.closed && obj.style.fill.type === "solid" ? `fill="${escapeXml(obj.style.fill.color)}"` : `fill="none"`;
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : "";
  return `<path d="${d}" transform="${transformAttr}" ${fillAttr}${strokeAttr} />`;
}

function buildStrokeAttr(stroke: StrokeStyle): string {
  let attr = ` stroke="${escapeXml(stroke.color)}" stroke-width="${stroke.width}" stroke-linecap="${stroke.lineCap}" stroke-linejoin="${stroke.lineJoin}" stroke-miterlimit="${stroke.miterLimit}"`;
  if (stroke.dashArray.length > 0) attr += ` stroke-dasharray="${stroke.dashArray.join(",")}"`;
  if (stroke.opacity < 1) attr += ` stroke-opacity="${stroke.opacity}"`;
  return attr;
}
```

---

## Priorytet 4 — Aplikacja webowa (`apps/web`)

### 4.1 [MODIFY] `EditorApp.tsx` — detekcja platformy

```ts
function isMacPlatform(): boolean {
  const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform
    ?? navigator.platform
    ?? "";
  return /mac/i.test(platform);
}
// użycie: const isMac = isMacPlatform();
```

### 4.2 [MODIFY] `EditorApp.tsx` — flush autosave przy zamykaniu/chowaniu strony

```ts
const latestDocRef = useRef<DocumentModel | null>(null);
useEffect(() => { latestDocRef.current = doc; }, [doc]);

useEffect(() => {
  const flush = () => {
    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const latest = latestDocRef.current;
    if (latest) {
      void saveDocument(latest);
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") flush();
  };

  // pagehide jest głównym mechanizmem — lepiej wspierany przez bfcache
  // niż beforeunload i bardziej rzetelnie wywoływany.
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("pagehide", flush);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    flush();
  };
}, []);
```

> `beforeunload` celowo pominięty jako główny mechanizm — nie garantuje
> dokończenia operacji asynchronicznych (zapis do IndexedDB) i wyłącza
> back/forward cache w niektórych przeglądarkach. `pagehide` +
> `visibilitychange` dają lepsze pokrycie przy mniejszym koszcie UX.

### 4.3 [MODIFY] `EditorApp.tsx` / `PropertiesPanel.tsx` — migracja na nowe komendy geometrii
Zamiana wywołań `new SetObjectGeometryCommand(...)` na odpowiednie
`SetRectangleGeometryCommand` / `SetEllipseGeometryCommand` / itd. z punktu
2.2, zgodnie z `selectedObject.type`.

---

## Plan Weryfikacji

### Testy automatyczne
1. `pnpm test` — pełny zestaw Vitest we wszystkich pakietach (bez kolizji z Playwrightem po pkt 1.1).
2. Nowe testy jednostkowe:
   - `packages/io/test/io.test.ts` — regresja eksportu SVG dla przesuniętego artboardu (pkt 0.1) + eksport Ellipse/Line/Path.
   - `packages/core/test/model.test.ts` — walidacja invariantów (stroke, gradient, ellipse, line, path, duplikaty ID).
   - `packages/core/test/commands.test.ts` — testy `SetRectangleGeometryCommand` i pozostałych komend geometrii (execute/undo, walidacja odrzucająca ujemne/nieskończone wartości).
   - `packages/editor-engine/test/hit-test.test.ts` — hit-test dla rectangle/ellipse/line/path.
3. Nowy test E2E (Playwright) w `apps/web/e2e/editor.spec.ts`:
   - rysowanie → zaznaczenie → **przesunięcie obiektu i weryfikacja, że podgląd nie psuje `doc` przed zwolnieniem przycisku** (regresja pkt 0.2) → undo/redo → export SVG.
4. `pnpm lint` — 0 błędów, 0 ostrzeżeń na całym monorepo.
5. `pnpm typecheck` — pełna weryfikacja typów.
6. `pnpm build` — build produkcyjny `apps/web` bez błędów.

### Manualna weryfikacja przed merge
- Eksport SVG dokumentu z artboardem przesuniętym w edytorze (nie tylko w teście) — otworzyć wynikowy plik w przeglądarce i porównać wizualnie z widokiem w edytorze.
- Przeciągnięcie obiektu przy aktywnym Reactowym StrictMode (podwójne montowanie efektów) — sprawdzić, że preview nie powoduje przeskoków ani duplikacji.
- Ręczne sprawdzenie punktów **[ZWERYFIKUJ NAJPIERW]** (1.5, 1.6, 1.2) w aktualnym stanie lokalnego repozytorium przed wprowadzeniem powiązanych zmian.

---

## Kolejność wdrażania (rekomendowana)

1. **0.1 i 0.2** (P0 — bez tego nie ruszać dalej).
2. 1.3 + 1.4 (lint + Playwright) — żeby dalsze zmiany były od razu kontrolowane przez CI.
3. 2.3 (invarianty) — zanim dodasz nowe typy obiektów, żeby móc łapać regresje.
4. 2.1, 2.2 (opisy komend, geometria per-typ).
5. 3.1 → 3.2 → 3.3 (hit-test → renderer → SVG) dla Ellipse, potem Line, potem Path — jeden typ na raz, z testami po każdym.
6. 4.1, 4.2, 4.3.
7. 1.1, 1.2, 1.5, 1.6 — porządki tooling/config, po zweryfikowaniu lokalnego stanu.
