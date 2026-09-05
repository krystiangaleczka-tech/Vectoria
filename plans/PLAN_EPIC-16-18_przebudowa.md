# Plan przebudowy EPIC-16–18: Trwałość projektów, eksport PDF i formaty

Tak — poniżej masz konkretny plan przebudowy, w kolejności minimalizującej ryzyko utraty danych i fałszywych deklaracji kompatybilności. Najpierw naprawiamy **P0**: trwałość projektów, realne przekazywanie opcji PDF oraz eksport AI/CDR; dopiero potem domykamy UX, onboarding i jakość procesu. Plan wynika bezpośrednio z luk znalezionych w commitach EPIC‑16–18. 

## Kolejność prac

Nie robiłbym kolejnego dużego commita „EPIC‑16–18 fixes”. Prace należy rozdzielić na małe PR-y, z niezależnymi kryteriami akceptacji.

| Faza | Priorytet | PR / gałąź | Cel | Blokuje release |
|---|---|---|---|---|
| 0 | P0 | `chore/audit-baseline` | Zamrożenie regresji: testy reprodukujące obecne błędy | Tak |
| 1 | P0 | `fix/workspace-project-storage` | Prawdziwe, niezależne dokumenty per projekt | Tak |
| 2 | P0 | `fix/pdf-export-options-and-snapshot` | Wszystkie artboardy, bleed, crop marks i snapshot zaznaczenia | Tak |
| 3 | P0 | `fix/export-format-honesty` | Wycofanie nieprawdziwych claims AI/CDR lub realna implementacja | Tak |
| 4 | P1 | `feat/vector-pdf-interchange` | Wektorowy PDF kompatybilny z Illustrator/Affinity/Corel | Nie, jeśli AI/CDR są ukryte |
| 5 | P1 | `fix/a11y-dialogs-onboarding` | Prawdziwy spotlight tutorial, focus i testy E2E portable | Nie |
| 6 | P2 | `refactor/export-pipeline-contracts` | Uporządkowanie API, testów i dokumentacji | Nie |

**Zasada release’u:** dopóki fazy 1–3 nie przejdą, backlog nie powinien oznaczać EPIC‑16/17/18 jako w pełni zakończonych. W szczególności statusy EXPORT‑013/014, SAAS‑002 oraz ADR‑021 wymagają korekty. 

***

## Faza 1: naprawa workspace

### Problem do usunięcia

Obecna implementacja miesza dwa modele:

- `ProjectRecord` przechowuje `documentId`;
- repozytorium dokumentów nadal korzysta z domyślnego, stałego klucza `current_document`;
- tworzenie projektu zapisuje dokument przez repozytorium aktywnego dokumentu;
- otwieranie szuka dokumentu po `project.documentId`.

To musi zostać zastąpione modelem: **jeden projekt → jeden stabilny identyfikator dokumentu → jeden rekord w IndexedDB**. 

### Docelowy kontrakt

Najprostsza bezpieczna przebudowa to uczynienie klucza dokumentu jawnym w API repozytorium.

```ts
// packages/io/src/storage/document-repository.ts

export interface DocumentRepository {
  load(documentId: string): Promise<PersistedDocument | null>;

  save(
    documentId: string,
    snapshot: PersistedDocument,
  ): Promise<void>;

  deleteDocument?(documentId: string): Promise<void>;

  listDocuments?(): Promise<readonly string[]>;

  saveAtomic?(
    documentId: string,
    snapshot: PersistedDocument,
  ): Promise<void>;

  loadKnownGood?(
    documentId: string,
  ): Promise<PersistedDocument | null>;
}
```

Nie należy pozostawiać wariantu `save(snapshot)` bez ID dla logiki projektu. Taki podpis zachęca do ponownego zapisania dokumentu pod domyślnym kluczem.

### Implementacja IndexedDB

```ts
// packages/io/src/storage/indexeddb-repository.ts

export class IndexedDBDocumentRepository implements DocumentRepository {
  async load(documentId: string): Promise<PersistedDocument | null> {
    const db = await openDB();

    try {
      return await new Promise<PersistedDocument | null>((resolve, reject) => {
        const transaction = db.transaction('documents', 'readonly');
        const request = transaction.objectStore('documents').get(documentId);

        request.onsuccess = () => {
          resolve((request.result as PersistedDocument | undefined) ?? null);
        };

        request.onerror = () => {
          reject(request.error ?? new Error('Failed to load document'));
        };
      });
    } finally {
      db.close();
    }
  }

  async save(
    documentId: string,
    snapshot: PersistedDocument,
  ): Promise<void> {
    const db = await openDB();

    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('documents', 'readwrite');

        transaction.objectStore('documents').put(snapshot, documentId);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
          reject(transaction.error ?? new Error('Failed to save document'));
        };
        transaction.onabort = () => {
          reject(transaction.error ?? new Error('Document save aborted'));
        };
      });
    } finally {
      db.close();
    }
  }
}
```

### Tworzenie projektu

Tworzenie projektu musi najpierw ustalić identyfikator dokumentu, potem zapisać dokument pod tym samym ID, a dopiero następnie utworzyć rekord workspace.

```ts
// apps/web/src/app/EditorApp.tsx

const handleCreateProjectInGallery = useCallback(
  async (
    name: string,
    folderId?: string,
    tags?: readonly string[],
    isTemplate?: boolean,
  ) => {
    const document = createDefaultDocument({ name });

    const snapshot: PersistedDocument = {
      app: 'vectoria',
      schemaVersion: document.schemaVersion,
      document,
      revision: 0,
      savedAt: new Date().toISOString(),
    };

    const documentRepository = getDocumentRepository();

    await documentRepository.save(document.id, snapshot);

    try {
      const project = await workspace.createProject({
        name,
        folderId,
        tags,
        documentId: document.id,
        isTemplate,
      });

      setActiveProjectId(project.id);
    } catch (error) {
      // Kompensacja: nie pozostawiamy osieroconego dokumentu,
      // jeśli zapis metadanych workspace się nie udał.
      await documentRepository.deleteDocument?.(document.id);
      throw error;
    }
  },
  [workspace],
);
```

### Otwieranie projektu

```ts
const handleOpenProject = useCallback(
  async (project: ProjectRecord) => {
    flushAutosave();

    const repository = getDocumentRepository();
    const persisted = await repository.load(project.documentId);

    if (!persisted) {
      throw new Error(
        `PROJECT_DOCUMENT_MISSING: ${project.id} → ${project.documentId}`,
      );
    }

    const parsed = parseAndMigrateDocument(persisted.document);

    setDoc(parsed);
    latestDocRef.current = parsed;

    history.clear(persisted.revision);
    setRevision(persisted.revision);
    setSavedRevision(persisted.revision);

    setActiveProjectId(project.id);
    setWorkspaceMode('editor');
  },
  [flushAutosave, history],
);
```

Nie należy przy braku dokumentu automatycznie tworzyć pustego projektu. To maskuje uszkodzenie danych. W UI trzeba pokazać błąd z akcją „przywróć z backupu” albo „usuń uszkodzony rekord projektu”.

### Testy obowiązkowe

```ts
it('keeps independent document state for two projects after reload', async () => {
  const projectA = await createProject('Projekt A');
  const projectB = await createProject('Projekt B');

  await openProject(projectA.id);
  await drawRectangle({ x: 10, y: 10, width: 100, height: 100 });
  await saveCurrentProject();

  await openProject(projectB.id);
  expect(getCanvasObjectCount()).toBe(0);

  await drawCircle({ x: 50, y: 50, radius: 20 });
  await saveCurrentProject();

  await reloadApplication();

  await openProject(projectA.id);
  expect(getCanvasObjectTypes()).toEqual(['rectangle']);

  await openProject(projectB.id);
  expect(getCanvasObjectTypes()).toEqual(['ellipse']);
});
```

Dodatkowo:

- test usunięcia projektu i polityki jego dokumentu;
- test przerwania między zapisem dokumentu a zapisem metadanych;
- test migracji starego `current_document` do pierwszego projektu workspace;
- test `activeProjectId` po odświeżeniu aplikacji.

***

## Faza 2: eksport PDF i snapshot

EPIC‑16 ma poprawne fundamenty eksportu, ale opcje PDF obecnie istnieją w dialogu, nie w pełnym kontrakcie wykonawczym. `pdfAllArtboards`, `pdfBleed` i `pdfCropMarks` należy przeprowadzić przez cały pipeline. 

### Rozszerzenie kontraktu eksportu

```ts
// packages/io/src/export/export-types.ts

export interface PdfExportOptions {
  readonly artboards: 'target' | 'all';
  readonly bleedPt: number;
  readonly cropMarks: boolean;
}

export const ExportFormatOptionsSchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  scale: z.number().positive().max(16).default(1),
  quality: z.number().min(0).max(1).optional(),
  background: z
    .union([
      z.literal('transparent'),
      z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
    ])
    .optional(),
  optimizeSvg: z.boolean().default(false),
  fileNameTemplate: z.string().default('{artboard}.{ext}'),

  pdf: z.object({
    artboards: z.enum(['target', 'all']).default('target'),
    bleedPt: z.number().min(0).max(50).default(0),
    cropMarks: z.boolean().default(false),
  }).optional(),
});
```

### Przekazanie opcji z dialogu

```ts
// apps/web/src/features/dialogs/ExportDialog.tsx

const pdfOptions =
  format === 'pdf'
    ? {
        artboards: pdfAllArtboards ? ('all' as const) : ('target' as const),
        bleedPt: pdfBleed,
        cropMarks: pdfCropMarks,
      }
    : undefined;

const request: ExportRequest = {
  target: resolvedTarget,
  options: {
    format,
    scale: effectiveScale,
    quality,
    background: backgroundVal,
    optimizeSvg,
    fileNameTemplate: '{artboard}.{ext}',
    pdf: pdfOptions,
  },
};
```

### Wykonanie eksportu PDF

```ts
// apps/web/src/features/export/useExportController.ts

if (format === 'pdf') {
  const pdfOptions = request.options.pdf;

  const artboardIds =
    pdfOptions?.artboards === 'all'
      ? snapshotDoc.artboardIds
      : request.target.kind === 'artboard'
        ? [request.target.artboardId]
        : [snapshotDoc.activeArtboardId];

  const blob = await exportDocToPdf(snapshotDoc, {
    artboardIds,
    scale,
    bleed: pdfOptions?.bleedPt ?? 0,
    cropMarks: pdfOptions?.cropMarks ?? false,
  });

  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  onStage('deliver', 1);
  downloadBlob(blob, fileName);

  return { blob, fileName };
}
```

### Snapshot selection

Obecnie document snapshot jest przechwytywany, ale selection jest odczytywany z mutable ref dopiero w momencie wykonania kolejki. To trzeba zamrozić w chwili kliknięcia „Eksportuj”. 

Najprostszy wariant: rozszerzyć wewnętrzny model joba o obliczony rect.

```ts
// packages/io/src/export/export-jobs.ts

export interface ExportExecutionSnapshot {
  readonly document: DocumentModel;
  readonly selection: SelectionState;
  readonly rect: Rect;
}

export interface JobInput {
  readonly request: ExportRequest;
  readonly snapshot: ExportExecutionSnapshot;
  readonly run: (
    snapshot: ExportExecutionSnapshot,
    signal: AbortSignal,
    onStage: (stage: ExportStage, progress?: number) => void,
  ) => Promise<{ blob: Blob; fileName: string }>;
}
```

Przy enqueue:

```ts
const documentSnapshot = latestDocRef.current;
const selectionSnapshot: SelectionState = {
  objectIds: [...selectionRef.current.objectIds],
  nodeIds: [...selectionRef.current.nodeIds],
  mode: selectionRef.current.mode,
};

const rect = resolveExportRect(
  documentSnapshot,
  request.target,
  selectionSnapshot,
);

return runner.enqueue({
  request,
  snapshot: {
    document: documentSnapshot,
    selection: selectionSnapshot,
    rect,
  },
  run: async (snapshot, signal, onStage) => {
    const svg = exportRegionToSvg(snapshot.document, snapshot.rect, {
      background,
    });

    // dalszy pipeline
  },
});
```

### Testy akceptacyjne PDF

- pojedynczy artboard = dokładnie jedna strona;
- `pdf.artboards = 'all'` = liczba stron równa `doc.artboardIds.length`;
- bleed zwiększa `MediaBox`;
- crop marks tworzą instrukcje linii;
- wybór „all artboards” działa niezależnie od aktualnie zaznaczonego artboardu;
- eksport selection używa zaznaczenia z momentu enqueue, nie późniejszego.

```ts
it('freezes selection bounds when a queued job starts later', async () => {
  const selectedBeforeQueue = {
    objectIds: ['rect-a'],
    nodeIds: [],
    mode: 'object' as const,
  };

  const queued = enqueueSelectionExport(selectedBeforeQueue);

  changeSelection({
    objectIds: ['rect-b'],
    nodeIds: [],
    mode: 'object',
  });

  const result = await queued;

  expect(result.exportedBounds).toEqual({
    x: 10,
    y: 10,
    width: 100,
    height: 80,
  });
});
```

***

## Faza 3: AI/CDR — uczciwy i bezpieczny model

Obecny kod nie powinien być reklamowany jako natywny eksport AI/CDR:

- `.ai` jest PDF-em, którego PDF pipeline osadza raster PNG;
- `.cdr` jest własnym ZIP-em z XML/SVG;
- testy sprawdzają nagłówki i round-trip przez własne parsery, a nie rzeczywiste programy Adobe/Corel. 

### Natychmiastowa poprawka produktowa

Do czasu stworzenia prawdziwej interoperacyjności:

1. usunąć formaty `ai` i `cdr` z `EXPORT_FORMATS`;
2. usunąć zakładki AI/CDR z `ExportDialog`;
3. usunąć akcje „Zapisz kopię jako Adobe Illustrator (.ai)” i „CorelDRAW (.cdr)”;
4. zastąpić je akcją:

```text
Eksportuj PDF do otwarcia w Illustratorze / CorelDRAW
```

5. oznaczyć ADR‑021 jako `Superseded` albo `Proposed`, a nie `Accepted`.

Przykład UI:

```tsx
<MenuItem
  label="Eksportuj wektorowy PDF do aplikacji DTP…"
  onClick={() => setExportDialogOpen(true)}
/>
```

### Docelowy model formatów

```ts
export const EXPORT_FORMATS = [
  'svg',
  'png',
  'jpeg',
  'webp',
  'pdf',
] as const;
```

Dopiero po spełnieniu testów kompatybilności można dodać:

```ts
type InterchangeProfile =
  | 'pdf-vector'
  | 'svg-editable'
  | 'illustrator-ai'
  | 'coreldraw-cdr';
```

### Wektorowy PDF jako właściwy etap 1

Obecny `exportDocToPdf` można przebudować na dwa profile:

```ts
export type PdfRenderMode =
  | 'raster'
  | 'vector';

export interface PdfExportOptions {
  readonly artboardIds?: readonly string[];
  readonly scale?: number;
  readonly bleed?: number;
  readonly cropMarks?: boolean;
  readonly mode?: PdfRenderMode;
}
```

Minimalny przykład eksportu wektorowego path do `pdf-lib`:

```ts
import { PDFDocument, rgb } from 'pdf-lib';

function drawVectorPath(
  page: PDFPage,
  path: { d: string; fill?: string; stroke?: string; strokeWidth?: number },
) {
  page.drawSvgPath(path.d, {
    color: path.fill ? hexToPdfColor(path.fill) : undefined,
    borderColor: path.stroke ? hexToPdfColor(path.stroke) : undefined,
    borderWidth: path.strokeWidth ?? 0,
  });
}

function hexToPdfColor(hex: string) {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  return rgb(r, g, b);
}
```

To nie wystarczy dla wszystkich obiektów Vectorii, ale jest poprawnym kierunkiem:

- prostokąty, elipsy, linie i pathy → wektor;
- tekst → tekst z osadzonym fontem lub jawnie udokumentowany fallback do outline;
- gradienty → gradient PDF albo rasterized fallback tylko dla konkretnego efektu;
- mesh, procedural repeats, masks, live effects → kontrolowany fallback;
- annotations → celowo nie eksportować do grafiki.

### Kryteria przed przywróceniem AI/CDR

AI/CDR można przywrócić dopiero, gdy istnieje:

- wersjonowana specyfikacja docelowa;
- corpus referencyjny plików;
- test z niezależnym parserem;
- test otwarcia w docelowej aplikacji;
- weryfikacja, że prostokąt, path, tekst, gradient, warstwa i artboard pozostają edytowalne;
- jasno opisana degradacja funkcji niestandardowych Vectorii.

Przykładowa macierz testowa:

| Funkcja | SVG | PDF vector | Illustrator AI | CorelDRAW CDR |
|---|---:|---:|---:|---:|
| Rectangle / ellipse / path | Edytowalne | Edytowalne | Wymaga testu | Wymaga testu |
| Tekst | Edytowalny | Font/outline | Wymaga testu | Wymaga testu |
| Warstwy | Struktura grup | OCG lub grupy | Wymaga testu | Wymaga testu |
| Gradient | SVG gradient | PDF shading/fallback | Wymaga testu | Wymaga testu |
| Live effect | Fallback | Fallback | Dokumentacja | Dokumentacja |
| Annotation pin | Pomijany | Pomijany | Pomijany | Pomijany |

***

## Faza 4: UX, onboarding i testy

EPIC‑18 zawiera przydatne mechanizmy: `Dialog`, `ConfirmDialog`, nudge, high contrast, UI scale, touch/pen hit tolerance i checklistę. Jednak tutorial jest obecnie kartą informacyjną — `targetSelector` nie jest wykorzystywany do spotlightu. 

### Prawdziwy spotlight tutorial

Trzeba obliczyć pozycję elementu wskazanego przez `targetSelector`, narysować ramkę oraz ustawić kartę tutorialu w odpowiednim miejscu.

```tsx
type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function useTutorialTarget(selector?: string): SpotlightRect | null {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useLayoutEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const element = document.querySelector(selector);

      if (!element) {
        setRect(null);
        return;
      }

      const bounds = element.getBoundingClientRect();

      setRect({
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
      });
    };

    updateRect();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [selector]);

  return rect;
}
```

W `TutorialOverlay`:

```tsx
const spotlight = useTutorialTarget(currentStep.targetSelector);

{spotlight && (
  <div
    aria-hidden="true"
    className="tutorial-spotlight"
    style={{
      position: 'fixed',
      top: spotlight.top - 6,
      left: spotlight.left - 6,
      width: spotlight.width + 12,
      height: spotlight.height + 12,
      border: '3px solid var(--color-border-focus)',
      borderRadius: 8,
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
      pointerEvents: 'none',
      zIndex: 9001,
    }}
  />
)}
```

### Poprawa dialogów

Do testów `Dialog` należy dodać:

- Escape niezależnie od tego, które dziecko ma focus;
- focus restoration po kliknięciu backdrop;
- focus trap z `textarea`, `select`, disabled button;
- zagnieżdżony `ConfirmDialog` nad innym dialogiem;
- brak zamknięcia dialogu przy kliknięciu w jego zawartość;
- poprawne `aria-describedby` dla opisu potwierdzenia.

```tsx
<Dialog
  labelledBy={titleId}
  describedBy={descriptionId}
  onClose={onCancel}
>
  <h2 id={titleId}>{title}</h2>
  <p id={descriptionId}>{description}</p>
</Dialog>
```

### Przenośne screenshoty Playwright

Należy usunąć absolutne ścieżki typu `/Users/...`. 

Zamiast:

```ts
await page.screenshot({
  path: '/Users/krystiangaleczka/.../ai_cdr_plik_menu.png',
});
```

użyć:

```ts
await expect(page).toHaveScreenshot('ai-cdr-file-menu.png', {
  fullPage: true,
});
```

albo:

```ts
await page.screenshot({
  path: testInfo.outputPath('ai-cdr-file-menu.png'),
});
```

### Testy UX do dodania

- nudge robi **jedną** komendę Undo po serii 10 strzałek;
- nudge nie przesuwa locked object;
- pinch-to-zoom nie tworzy wpisów historii;
- touch ma większy hitbox niż mouse;
- tutorial spotlight wskazuje prawdziwy element;
- `Ctrl+A` działa na Windows/Linux, `Cmd+A` na macOS;
- tooltip jest dostępny przez focus, nie wyłącznie hover;
- kontrast ma weryfikację automatyczną kluczowych tokenów i widocznego focus ring.

***

## Definition of Done

### Warunki P0

Nie oznaczać epików jako zakończonych, dopóki wszystkie punkty są spełnione:

- [ ] Dwa projekty mają dwa różne `documentId` i zachowują niezależne dane po reloadzie.
- [ ] Nie można przypadkowo stworzyć pustego dokumentu przy błędzie odczytu projektu.
- [ ] Usunięcie projektu ma zdefiniowaną, testowaną politykę dokumentu.
- [ ] PDF „wszystkie artboardy” generuje wszystkie strony.
- [ ] PDF poprawnie przenosi bleed i crop marks z UI do binarnego pliku.
- [ ] Eksport selection używa snapshotu z chwili enqueue.
- [ ] Akcje AI/CDR są usunięte, wyłączone feature flagą albo poparte realną zgodnością.
- [ ] Dokumentacja ADR‑021 nie twierdzi, że istnieje natywna kompatybilność, jeśli nie ma dowodu interoperacyjności.

### Warunki P1

- [ ] Tutorial używa faktycznego spotlightu i target selectorów.
- [ ] Wszystkie dialogi przechodzą test focus trap, Escape i focus restoration.
- [ ] Brak ścieżek lokalnych użytkownika w testach, konfiguracji i dokumentacji.
- [ ] Każdy nowy PR ma osobny changelog: kontrakt, migracja, UI, testy i rollback plan.
- [ ] Testy E2E uruchamiają się na czystym CI bez danych IndexedDB z poprzednich testów.

### Zalecana sekwencja commitów

```text
test: reproduce multi-project persistence failure
fix(storage): persist project documents by explicit documentId
test(storage): verify two-project reload isolation

test(export): cover all-artboards bleed crop marks and frozen selection
fix(export): carry PDF options through ExportRequest pipeline
fix(export): freeze selection target at enqueue time

chore(export): disable unsupported native AI and CDR claims
docs(adr): revise ADR-021 to PDF interchange scope
test(export): verify unavailable formats cannot be selected

feat(onboarding): implement target spotlight geometry
test(a11y): cover tutorial target and dialog focus lifecycle
test(e2e): replace absolute screenshot paths with Playwright snapshots
```

Po fazach 1–3 można uczciwie oznaczyć: **EPIC‑16 gotowy warunkowo**, **EPIC‑17 Etap 1 gotowy**, a **EPIC‑18 UX gotowy poza AI/CDR**. Dopiero po niezależnej walidacji aplikacjami Adobe/Corel można rozważać ponowne dodanie natywnych formatów do produktu.
