# Vectoria — kompleksowy audyt ukończenia, UI/UX i lifecycle narzędzi

**Data:** 2026-09-16  
**Audytowany ref:** `master` @ `0f7a1f9eb613d27c567635e7b96f3e14d67e9e7e`  
**Repo:** `krystiangaleczka-tech/Vectoria`  
**Charakter audytu:** głęboki audyt statyczny kodu, dokumentacji, testów i historii prac. Nie jest to ręczny test działającej aplikacji w przeglądarce.

---

## 1. Wniosek wykonawczy

Vectoria **nie jest pustym szkieletem ani MVP-em z kilkoma atrapami**. Repo zawiera duży, realny edytor wektorowy: rozbudowany `DocumentModel`, command/undo system, renderer Canvas, narzędzia geometryczne, Pen/Node/freehand, boolean/maski, style/appearance, tekst, obrazy, symbole, Brand Kit, import/export, multi-project local workspace, accessibility, onboarding, część collaboration i bardzo szeroki zestaw testów.

Jednocześnie nie można jeszcze uczciwie oznaczyć całej aplikacji jako „skończona”. Największy problem nie polega dziś na braku kodu, tylko na czterech rzeczach:

1. **status projektu jest niespójny z kodem** — `BACKLOG.md`, stare plany i progress logi wzajemnie sobie przeczą;
2. **lifecycle interakcji jest zbyt rozproszony** w bardzo dużym `CanvasViewport.tsx`, co tworzy ryzyko subtelnych regresji przy Escape, zmianie narzędzia i utracie pointer capture;
3. **formaty wejściowe AI/CDR/PDF/EPS nadal mają jawne ograniczenia produkcyjne**, szczególnie fidelity realnych plików;
4. **brakuje aktualnego release evidence**: na audytowanym HEAD nie ma status checks/workflow runów, więc historyczne „424/432/443 tests PASS” nie są dowodem dla dzisiejszego SHA.

Najbardziej pilne znalezione problemy w aktualnym kodzie:

- **P0/P1 — podwójna ścieżka obsługi nudge strzałkami**: canvas ma własny `onKeyDown={handleKeyDown}` z 300 ms burst/debounce, a jednocześnie `window.keydown` ma osobny branch Arrow keys wykonujący `TransformObjectsCommand`. Może to produkować dwa commity/no-op commity, rozbijać semantykę jednego burstu Undo albo powodować race zależny od renderu. Aktualny E2E sprawdza tylko, że historia się zmieniła — nie dokładny delta i liczbę wpisów.
- **P1 — Escape anuluje interakcję, ale dodatkowo zeruje zaznaczenie** (`onSelectObject(null)`). Dokument i history mogą pozostać bez zmian, a użytkownik i tak traci poprzedni selection context.
- **P1 — shortcut drift**: Tool Rail deklaruje `Shift+E` dla Eraser i `Shift+O` dla Node Lasso, ale `ShortcutManager` nie ma akcji/bindingów `tool.eraser` ani `tool.node-lasso`. Hand pokazuje `Space`, podczas gdy konfigurowalny shortcut ma `H`; `Space` jest osobnym chwilowym panem.
- **P1 — Brand Kit SVG logo może być klikane bez efektu**: `BrandKitLogo` dopuszcza `svgData`, ale `handleInsertBrandLogo` obsługuje tylko `logo.imageUrl`.
- **P1/P2 — zmiana aktywnego narzędzia nie czyści wszystkich sesji jednakowo**: efekt `activeTool` anuluje m.in. Pen/Pencil/Brush/Eraser/Knife/Shape/Polyline/Corner, ale nie wywołuje jawnie `widthTool.cancel()`, nie zeruje `smoothStartScreenRef`, a aktywna sesja edycji tekstu ma osobny lifecycle.
- **P2 — UI ma lokalne odstępstwa od design systemu**: w aktualnym `AssetsPanel` są inline hardcoded `rgba(...)`, `#10b981`, `#ef4444`; może to omijać tokeny theme/high-contrast.

---

## 2. Metoda i poziomy pewności

Statusów nie przyjmowano z checkboxów bez weryfikacji. Dla każdej większej części użyto triangulacji:

- `BACKLOG.md`, `ROADMAP.md`, epiki i plany;
- bieżące typy/model/komendy w `packages/core`;
- state machines w `packages/editor-engine`;
- wiring w `CanvasViewport`, `EditorApp`, panelach i dialogach;
- renderer i IO round-trip;
- unit/E2E znajdujące się w repo;
- progress logi jako **dowód historyczny**, nie jako dowód aktualnego CI.

Legenda:

- **✅ CODE-VERIFIED** — w aktualnym kodzie widać pełny lub bardzo mocny end-to-end wiring;
- **🟡 PARTIAL / VERIFY** — duża część istnieje, ale pozostał ograniczony zakres, brak runtime proof lub znane ograniczenie;
- **🔴 REMAINING** — zakres realnie jeszcze nie jest domknięty;
- **🧾 DOC DRIFT** — dokumentacja mówi coś innego niż aktualny kod;
- **🧪 RELEASE VERIFY** — kod może istnieć, ale przed release wymaga aktualnego wykonania testów/benchmarku na tym samym SHA.

---

## 3. Krytyczny problem organizacyjny: status drift

`BACKLOG.md` nie może dziś być źródłem prawdy.

Przykłady:

- EPIC-03 ma dużą liczbę `SEL-*` nadal jako `[ ]`, mimo że kod zawiera selection state, Select/Direct Select, lasso, node lasso, transforms, align/distribute, grouping, z-order, nudge i testy.
- EPIC-04 nadal ma `[ ]` przy Arc/Pie/Ring/Polygon/Star/Spiral/Callout/Polyline, a aktualny `SceneObject` ma `PolygonObject`, `StarObject`, `ArcObject`, `PieObject`, `RingObject`, `SpiralObject`, `CalloutObject`, `PolylineObject`, Tool Rail je pokazuje, a Canvas wiąże drag-shapes do `ShapeTool`.
- Stary `PLAN_01_zasady_i_EPIC04.md` twierdzi, że te typy i tool state machines nie istnieją — to prawda historyczna, ale już nie bieżąca.
- `BACKLOG.md` oznacza FX-019..023 jako niegotowe, podczas gdy aktualny model i Appearance Panel mają Distort, Envelope, Perspective, Extrude, a renderer/core ma implementacje; ADR jednocześnie uczciwie opisuje ograniczenia fidelity.
- historyczne logi potrafiły oznaczyć zakres jako „100%”, a kolejny dzień przynosił poprawki P0 (np. izolacja projektów w IndexedDB, snapshot exportu, wycofanie nieuczciwych claims AI/CDR).

### Do zrobienia

- [ ] Zbudować **jeden canonical feature registry** z polami `task`, `status`, `evidence`, `knownLimitations`, `lastVerifiedSha`.
- [ ] Wygenerować z niego BACKLOG/feature matrix zamiast ręcznych sprzecznych checklist.
- [ ] Stare plany oznaczyć `historical/superseded`, żeby nie wyglądały jak aktualny stan.
- [ ] Nie używać słowa „100%” bez przypiętego SHA + test run + znanych ograniczeń.

---

## 4. Macierz ukończenia EPIC 00–19

| Epic | Ocena teraz | Co realnie jest | Co pozostaje / wymaga dowodu |
|---|---|---|---|
| **00 Foundation / performance** | 🟡 | Monorepo, model, renderer, viewport-sized canvases, camera, rAF render loop, safe large artboard, HUD, część workerów (storage, PDF, trace) | aktualne benchmarki frame budget/p95/input latency; benchmark-gated spatial indexing/caching; CI performance gate; pełna macierz ciężkich operacji |
| **01 Dokument / artboard / grid / guides** | 🟡/✅ | dokumenty, presety, jednostki, artboards, grid, snapping, guides są obecne | pełny runtime pass guide drag/lock/hide/delete i wszystkie snap sources; dokumentacja statusu jest stara |
| **02 Historia / persistence** | ✅ local, 🔴 cloud | command pattern, Undo/Redo, autosave, restore, versions istnieją w kodzie/logach | aktualny data-safety test na HEAD; cloud sync nadal osobny zakres |
| **03 Selection / transforms** | ✅ core + 🧾 | Select, Direct Select, multi-select, lasso, node lasso, move/resize/rotate, nudge, grouping, z-order itd. | naprawić Escape selection side effect; zweryfikować duplicate nudge path; pełny lifecycle E2E; BACKLOG do synchronizacji |
| **04 Shapes** | ✅ duża część + 🧾 | rectangle/ellipse/line + polygon/star/arc/pie/ring/spiral/callout/polyline, shape presets, arrowheads, parametric properties, SVG support | zweryfikować parametric handles i preset-library UX end-to-end; uprościć dokumentację — stare plany mówią, że większość nie istnieje |
| **05 Pen / paths** | ✅ | Pen, node editing, joins/breaks/close, convert/operations, unit tests | pełny lifecycle matrix: switch tool mid-draft, lost capture, selection preservation |
| **06 Freehand / cutting** | ✅ core, 🟡 lifecycle | Pencil, Brush, Smooth, Eraser, Knife, Scissors, Width istnieją jako engine tools / komendy | jawne cleanup dla Width/Smooth na tool switch; testy „cancel leaves doc+history+selection+tool session unchanged” |
| **07 Geometry edit** | ✅ | simplify/smooth/offset/corner/expand/cleanup workflow | runtime/regression pass dla preview→cancel→apply i large paths |
| **08 Boolean / masks** | ✅ core | boolean, compound, mask/compositing/isolation istnieją | Escape semantics w isolate są specjalne; potrzebny test, że tylko intended selection/context się zmienia |
| **09 Styles / colors** | ✅/🟡 | fills, gradients, palette, global colors, eyedropper/bucket, styles, gradient handles | ujednolicić status STYLE-033 z Appearance; zweryfikować round-trip wszystkich fill variants |
| **10 Text** | ✅ broad, 🟡 UX | artistic/frame text, typography, lists/columns, text-on-path, outlines, font import/report, find/replace, variable text | zdefiniować Escape: commit czy cancel/revert; tool switch podczas inline edit; font corpus/runtime fidelity |
| **11 Layers / assets panel** | ✅ | layers, nesting, DnD, lock/visibility, asset panel, symbols/components/brand assets | UI symbol-definition workflow nadal powinien być testowany end-to-end, nie tylko command-level |
| **12 Images / external assets** | ✅ broad, 🟡 import fidelity | raster/SVG/PDF drop, embed/link, crop/filters/trace, symbols, stock SVG, Brand Kit | Brand Kit `svgData` insertion bug; real PDF fidelity; linked asset error/relink lifecycle; MIME hardcode dla brand image |
| **13 Effects / appearance** | 🟡 | Appearance stack, shadows/blur/glow, patterns/textures, distort/envelope/perspective/extrude/repeats, mesh variant, brush profiles | ADR nadal opisuje uproszczenia: artistic/pattern brushes, mesh, 3D i część SVG/canvas parity; nie oznaczać jako pełna zgodność pro-DTP |
| **14 Productivity** | ✅ broad, 🟡 shortcuts | command palette, clipboard, expression inputs, shortcuts, zoom UX, precision workflows | source-of-truth skrótów; Eraser/Node Lasso/Hand mismatch; dokładny nudge/history test |
| **15 Import / native format** | 🟡 | VCT, sanitized SVG, provider pipeline, PDF worker/import, EPS parser, AI via PDF-compatible path, CDR recognition + honest unsupported fallback | real-world corpus/fidelity AI/CDR/PDF/EPS; compatibility matrix; brak deklarowania pełnej obsługi CDR binarnego |
| **16 Export** | ✅ core, 🧪 | SVG/raster/PDF, target selection, jobs, snapshot, bleed/crop marks, frozen selection | aktualne E2E/build na HEAD; memory/perf dużych eksportów; cross-viewer corpus |
| **17 Collaboration / SaaS** | 🟡 | local workspace/projects/folders/tags/search, annotations/comments/mentions/version-related UI, handoff pieces | konta/auth, share links, real roles/permissions, public read-only, backend policy, realtime collaboration — jeśli full SaaS jest celem release |
| **18 UX / accessibility** | ✅ broad, 🟡 polish | Dialog/ConfirmDialog, keyboard canvas, focus, high contrast, UI scale, touch/pinch/stylus, onboarding/tutorials | shortcut drift, mixed PL/EN labels, hardcoded colors, lifecycle Escape, full keyboard regression pass |
| **19 AI workflows** | 🔴 postponed | roadmap/contracts mogą istnieć | funkcjonalności AI są świadomie późniejszym etapem; nie są blockerem single-user vector editor release, ale są blockerem „pełnego ROADMAP produktu” |

### Wniosek z macierzy

Dla **single-user beta edytora wektorowego** repo jest dużo bliżej końca niż sugeruje `BACKLOG.md`. Dla **pełnej aplikacji zgodnej z całą roadmapą** pozostają duże obszary: production-grade compatibility AI/CDR/PDF, część zaawansowanych efektów, SaaS/auth/permissions/realtime oraz AI workflows.

---

## 5. Pełna checklista 29 narzędzi z Tool Rail

### Selection

| Tool | Wiring | Commit/cancel | Ocena lifecycle |
|---|---|---|---|
| Select | `SelectTool`, canvas hit-test/marquee | selection transient + transforms przez commands | 🟡 Escape globalnie może wyczyścić wcześniejsze zaznaczenie |
| Direct Select | `DirectSelectTool`, node selection | node edits commands | 🟡 jw.; Delete ma własną semantykę node |
| Lasso | `LassoSession` | kończy zmianą selection, cancel czyści sesję | 🟡 potrzebny exact state regression |
| Node Lasso | osobny branch drag | kończy node selection | 🟡 tooltip `Shift+O`, brak bindingu w ShortcutManager |

### Shapes

| Tool | Wiring | Commit/cancel | Ocena lifecycle |
|---|---|---|---|
| Rectangle | shared `ShapeTool` | pointerUp → CreateObjectsCommand, Escape/cancel → draft reset | ✅ core / 🟡 selection-on-Escape |
| Ellipse | shared `ShapeTool` | jw. | ✅/🟡 |
| Line | shared `ShapeTool` | jw.; arrowheads w model/UI/SVG | ✅/🟡 |
| Polygon | shared `ShapeTool` + parametric type | jw. | ✅/🟡 |
| Star | shared `ShapeTool` + parametric type | jw. | ✅/🟡 |
| Arc | shared `ShapeTool` + `ArcObject` | jw. | ✅/🟡 |
| Pie | shared `ShapeTool` + `PieObject` | jw. | ✅/🟡 |
| Ring | shared `ShapeTool` + `RingObject` | jw. | ✅/🟡 |
| Spiral | shared `ShapeTool` + `SpiralObject` | jw. | ✅/🟡 |
| Callout | shared `ShapeTool` + `CalloutObject` | jw. | ✅/🟡 |
| Polyline | dedicated `PolylineTool` | multi-click; Enter/finish; Escape cancel | ✅; osobny lifecycle jest czytelniejszy niż inline logic |

### Pen & Draw

| Tool | Wiring | Commit/cancel | Ocena lifecycle |
|---|---|---|---|
| Pen | `PenTool` state machine | Enter/Escape + commit/cancel; switch away sends Escape | ✅ core; sprawdzić selection policy |
| Pencil | `PencilTool`/SampleTool | pointerUp commit; Escape/cancel clears samples | ✅ core |
| Brush | `BrushTool`/SampleTool + pressure | pointerUp commit; Escape/cancel | ✅ core |

### Text

| Tool | Wiring | Commit/cancel | Ocena lifecycle |
|---|---|---|---|
| Text | `TextTool` + `TextEditSession` | create + inline edit | 🟡 `Escape` w active text edit wywołuje commit, nie revert; po zmianie toola sesja nie jest centralnie anulowana |

### Path Edit

| Tool | Wiring | Commit/cancel | Ocena lifecycle |
|---|---|---|---|
| Corner | `CornerTool` | preview→commit; tool switch jawnie canceluje | ✅ |
| Smooth | `SmoothTool` | path preview→SetPathGeometry | 🟡 `smoothStartScreenRef` nie jest jawnie resetowany w ogólnym `activeTool` cleanup |
| Width | `WidthTool` | profile preview→SetPathWidth | 🟡 `activeTool` cleanup zeruje `widthStartScreenRef`, ale nie woła jawnie `widthTool.cancel()` |
| Eraser | `EraserTool` | points→erase command; cancel | 🟡 tooltip `Shift+E`, brak shortcut action/binding |
| Knife | `KnifeTool` | points→knife command; cancel | ✅ core |
| Scissors | `ScissorsTool` | hit/cut split | ✅ core; krótka interakcja nie ma rozbudowanego draftu |

### Fill & Style

| Tool | Wiring | Commit/cancel | Ocena lifecycle |
|---|---|---|---|
| Eyedropper | `EyedropperTool`, `style-sample` drag state | applies sampled style through command | ✅ core / 🟡 Escape może skasować selection |
| Paint Bucket | `PaintBucketTool` | applies fill/stroke through command | ✅ core / 🟡 jw. |

### Navigate

| Tool | Wiring | Commit/cancel | Ocena lifecycle |
|---|---|---|---|
| Hand | persistent `activeTool='hand'`; dodatkowo Space temporary pan | camera-only, brak document mutation | ✅ chwilowy Space poprawnie wraca do poprzedniego activeTool; 🟡 tooltip vs configurable H mismatch |
| Zoom | click → `camera.zoomAtPoint(...)` | camera-only | ✅ podstawowy; sprawdzić czy zakres UX ma obejmować zoom-out/drag zoom |

---

## 6. Lifecycle: co dzieje się po „używam narzędzia i wracam”

### Co jest dobrze

- `pointercancel` i `lostPointerCapture` są podpięte do `cancelInteraction`.
- Jest E2E `pointercancel leaves document and history unchanged`.
- Shape creation ma engine state machine, a nie tylko lokalny draft w React.
- Tool switch anuluje większość aktywnych draftów, zamiast je przypadkowo commitować.
- Space-pan nie zmienia `activeTool`; po puszczeniu Space naturalnie wraca zachowanie poprzedniego toola.
- Stylus eraser end tworzy `effectiveTool='eraser'`, nie niszcząc trwałego activeTool.
- szybkie gesty używają synchronicznych refs (`dragPreviewRef` itd.), co naprawiło wcześniejszy commit drift.

### Co jest niebezpieczne

#### LIFECYCLE-001 — Escape ma side effect na selection — **P1**

Globalny branch Escape wykonuje cancel narzędzia, a następnie `onSelectObject(null)`. To znaczy:

`wybrany obiekt → rozpoczęcie transient operation → Escape`

może skończyć się:

`dokument bez zmian + historia bez zmian + zaznaczenie utracone`.

Dla użytkownika to nie jest pełny powrót do poprzedniego stanu.

**Naprawa:** rozdzielić semantykę:

1. Escape #1: canceluje bieżący transient interaction i przywraca selection snapshot;
2. Escape #2, gdy nie ma transient interaction: ewentualnie clear selection / exit context;
3. isolate/text mają jawne, osobne kontrakty.

#### LIFECYCLE-002 — tool-switch cleanup nie ma jednego kontraktu — **P1/P2**

Aktualny `useEffect([activeTool])` ręcznie wymienia narzędzia do anulowania. To łatwo zepsuć przy dodaniu kolejnego toola. Width/Smooth/Text pokazują już ryzyko niesymetrycznego cleanup.

**Naprawa:** wprowadzić lifecycle registry/controller:

```text
enter(tool)
update(event)
commit(reason)
cancel(reason)
exit(reason)
getTransientState()
```

Canvas powinien delegować zmianę toola do jednego controller-a, a nie znać każdą ref osobno.

#### LIFECYCLE-003 — brak testu „cały stan wraca” — **P1**

Obecny E2E kontroluje document/history. Powinien snapshotować także:

- selection objectIds/nodeIds;
- activeTool;
- path/shape/style/text previews;
- camera (jeśli operacja nie jest nawigacyjna);
- isolation context;
- history length/index;
- document revision;
- pointer capture/session refs pośrednio przez UI;
- status bar / inspector context.

---

## 7. Konkretne problemy znalezione w aktualnym kodzie

### AUDIT-001 — dwie implementacje nudge strzałkami — **P0/P1**

`CanvasViewport` ma React `handleKeyDown` podpięty do `onKeyDown` viewportu. Ten handler:

- buduje `nudgeBurstRef`;
- pokazuje preview;
- grupuje serię do jednego commitu po 300 ms.

W tym samym komponencie istnieje globalny `window.addEventListener('keydown', ...)`, który również obsługuje ArrowLeft/Right/Up/Down i wykonuje `TransformObjectsCommand`.

Ponieważ event z focused canvas może dojść do obu ścieżek, jest ryzyko:

- dodatkowego/no-op wpisu history;
- utraty założenia „jeden burst = jeden Undo”;
- race pomiędzy command-em natychmiastowym i preview opartym o poprzedni transform;
- innego zachowania, gdy focus jest na viewportcie vs poza nim.

**Nie należy zakładać konkretnego finalnego przesunięcia bez runtime testu** — statycznie pewne jest natomiast, że są dwie konkurencyjne ścieżki.

**Test wymagany:** 1× ArrowRight = dokładnie +1 px i dokładnie 1 history entry po burst; 10× w <300 ms = +10 px i 1 history entry; Shift+Arrow = 10 px; Undo = dokładnie stan startowy.

### AUDIT-002 — Eraser shortcut jest deklarowany, ale nie zarejestrowany — **P1**

Tool Rail i design system pokazują `Shift+E`; `SHORTCUT_ACTIONS` oraz `DEFAULT_SHORTCUTS` nie zawierają `tool.eraser`.

### AUDIT-003 — Node Lasso shortcut jest deklarowany, ale nie zarejestrowany — **P1**

Tool Rail pokazuje `Shift+O`, registry nie zawiera `tool.node-lasso`.

### AUDIT-004 — Hand: `Space` vs `H` — **P2**

- Tool Rail: `Space`;
- ShortcutManager: `H` jako `tool.hand`;
- Canvas: Space = temporary pan bez zmiany activeTool.

To są dwa różne zachowania opisane jak jeden shortcut. UI powinno powiedzieć np. `H — Hand Tool`, `Space (hold) — Temporary Pan`.

### AUDIT-005 — Brand Kit `svgData` nie jest wstawiane — **P1**

`BrandKitLogo` ma `svgData?` i `imageUrl?`. `handleInsertBrandLogo` ma tylko branch `if (logo.imageUrl)`. Logo zapisane jako SVG data bez imageUrl nie trafia na canvas.

**Naprawa:** dla `svgData` użyć bezpiecznego, sanetyzowanego SVG import path i CreateObjectsCommand; dodać E2E.

### AUDIT-006 — Brand logo MIME jest hardcoded `image/png` — **P2**

Przy `imageUrl` `ImageObject.source.mimeType` jest zawsze `image/png`, nawet jeśli URL/data URL jest JPEG/WebP/SVG. To może psuć downstream metadata/export/relink policy.

### AUDIT-007 — „edytuj definicję symbolu” wymaga uczciwego UX — **P2**

Command domenowy `UpdateSymbolDefinitionCommand` jest pełniejszy, ale aktualny UI workflow trzeba traktować jako osobny acceptance test. Jeśli przycisk mówi „edytuj definicję”, a flow oferuje głównie rename, label powinien mówić dokładnie co robi albo aplikacja powinna wejść w pełny symbol-edit context.

### AUDIT-008 — AssetsPanel omija tokeny design systemu — **P2**

Hardcoded green/red oraz `rgba(...)` dla statusów mogą nie mieć odpowiedniego kontrastu w light/dark/high-contrast. Wszystkie stany powinny używać semantic tokens (`success`, `danger`, `warning`, `surface-hover`, `border`).

### AUDIT-009 — mieszany język UI — **P2**

Top/menu/dialogi są w dużej mierze po polsku, a Tool Rail używa m.in. `Select Tool`, `Direct Select Tool`, `Paint Bucket Tool`, `Hand / Pan Tool`. Dla publicznego produktu należy wybrać jedną politykę: pełne PL, pełne EN albo i18n.

### AUDIT-010 — bardzo duże komponenty zwiększają koszt regresji — **P2 engineering risk**

`CanvasViewport.tsx`, `EditorApp.tsx`, `PropertiesPanel.tsx` są centralnymi węzłami wielu kontraktów. Szczególnie Canvas łączy input, narzędzia, keyboard, previews, render invalidation, selection, text edit, snapping i command commit.

Nie rekomenduję „refactoru dla refactoru” przed release. Rekomenduję wyciągać tylko granice, które bezpośrednio zmniejszają ryzyko:

- ToolLifecycleController;
- Keyboard/shortcut router;
- transient interaction store;
- text edit session controller.

---

## 8. UI/UX — ocena całościowa

### Mocne strony

- wspólne `Dialog` / `ConfirmDialog`, focus trap, Escape, focus return;
- canvas focusable z rolą i ARIA;
- dark/light + high contrast + UI scaling;
- pinch-to-zoom, Pointer Events, stylus/pressure i eraser-end;
- onboarding + tutorial spotlight;
- ContextualControlBar oraz Right Dock;
- Tool Rail ma tooltips i aria labels;
- fast-gesture regression został wcześniej zauważony i naprawiony;
- zoom readout/presets poprawione;
- selection handles są kompensowane względem transform scale.

### Główne UX gaps

- [ ] Ujednolicić skróty z jednym registry.
- [ ] Ujednolicić semantics Escape/cancel/revert/clear selection.
- [ ] Ustalić behavior po tool switch podczas aktywnej interakcji.
- [ ] Ujednolicić język UI.
- [ ] Zastąpić hardcoded colors semantic tokens.
- [ ] Sprawdzić vertical Tool Rail przy niskiej wysokości viewportu; scroll działa, ale 29 narzędzi jako pojedyncza lista ma wysoką gęstość poznawczą.
- [ ] Rozważyć flyout/group dla shapes/path-edit, ale dopiero po user testach — nie zmieniać dla samej estetyki.
- [ ] Dodać widoczny status, gdy narzędzie ma „one-shot” vs „persistent” behavior.
- [ ] W tooltipach odróżnić skrót aktywacji toola od modifier/temporary override.

---

## 9. Import/formaty — co jest uczciwie gotowe

### SVG — **najmocniejsza ścieżka**

- sanitizer działa przed DOMParser;
- usuwa/raportuje niebezpieczne konstrukcje i ma limity;
- importer korzysta z `sanitizeSvg`;
- istnieją testy URI/sanitizer;
- parametric shapes/arrowheads mają rosnące round-trip support.

### VCT — **mocna ścieżka robocza**

- schema/envelope/migration;
- compression worker z fallbackiem;
- IndexedDB multi-project fix;
- local versions/autosave.

### PDF — **działa, ale nie utożsamiać z pełną zgodnością PDF**

Jest worker i importer wektorowy, ale ostatni audyt projektu sam dokumentuje ograniczenia parsera. Przed obietnicą produkcyjną potrzebny corpus z:

- wieloma stronami;
- fontami i encodingami;
- XObjects/images;
- clippingiem/transparency;
- różnymi filtrami streamów;
- CMYK;
- PDF-em z Illustrator/InDesign/drukarni.

### AI — **PDF-compatible path**

To powinno pozostać opisane jako AI PDF-compatible import, nie „pełne AI”. Compatibility Report musi mówić co zostało editable/flattened/unsupported.

### CDR — **honest partial/unsupported**

Aktualny parser poprawnie przestał produkować fikcyjną geometrię. Rozpoznaje kontener, potrafi odzyskać osadzony SVG, a dla binarnego RIFF/RIFX bez obsługiwalnego streamu zwraca `unsupported`. To jest prawidłowsze produktowo niż fałszywy sukces.

Do pełnego CDR nadal potrzebny jest prawdziwy adapter/parser/konwersja z corpus i polityką bezpieczeństwa.

### EPS — **parser istnieje, produkcyjne fidelity wymaga corpus**

Nie oznaczać jako pełna zgodność PostScript tylko dlatego, że podstawowe operatory działają.

---

## 10. Testy: co jest i czego brakuje

### Jest

- szeroki zestaw unit tests w core/editor-engine/io/renderer/ui/shared;
- Playwright `editor.spec.ts`;
- `a11y.spec.ts`;
- `fast-gesture.spec.ts`;
- collaboration/workspace E2E;
- historyczne logi PASS dla 424/427/432/443 unit tests i 36/40 E2E w różnych momentach.

### Ważne zastrzeżenie

Na audytowanym HEAD GitHub nie pokazuje status checks ani workflow runu. Historyczne logi są przydatne, ale nie zastępują aktualnego `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` na dokładnie tym SHA.

### Brakująca macierz regresji przed release

- [ ] Każdy z 29 tooli: activate → start → cancel Escape → state snapshot identical where expected.
- [ ] Każdy drag tool: pointercancel.
- [ ] Każdy drag tool: lostPointerCapture.
- [ ] Tool switch w połowie interakcji.
- [ ] Tool switch + Undo/Redo.
- [ ] Selection preservation przy cancel.
- [ ] Text edit: Escape/Enter/click outside/tool switch.
- [ ] Width/Smooth mid-gesture switch.
- [ ] Nudge exact geometry + exact history cardinality.
- [ ] Shortcut registry ↔ ToolRail tooltip parity.
- [ ] Temporary Space pan: activeTool przed/po identyczny.
- [ ] Stylus eraser: activeTool przed/po identyczny.
- [ ] Brand Kit image + SVG logo insertion.
- [ ] Theme/high-contrast screenshot dla Assets/Brand badges.
- [ ] Multi-project save/open/restore po reload.
- [ ] Export frozen selection podczas queued job.
- [ ] Import error/cancel leaves current document and selection unchanged.

---

## 11. Priorytety do „skończenia apki”

### P0 — przed jakąkolwiek publiczną betą

- [ ] Uruchomić pełne quality gates na finalnym SHA: lint/typecheck/unit/E2E/build.
- [ ] Dodać CI status checks do `master`/PR.
- [ ] Rozstrzygnąć i naprawić podwójną obsługę nudge.
- [ ] Dodać exact nudge/history regression.
- [ ] Przejść `RELEASE_CHECKLIST.md` na realnym staging/preview, nie jako pusty template.
- [ ] Przejść data-safety smoke: multi-project, autosave, reload, failed save, corrupt snapshot/recovery.
- [ ] Zamrozić publiczne claims formatów zgodnie z realnym corpus: SVG/VCT mocne, PDF/AI/CDR/EPS z jawnie opisanym zakresem.
- [ ] Wykonać security/import smoke z hostile SVG i błędnymi/dużymi plikami.

### P1 — poprawność interakcji i UX

- [ ] Escape ma przywracać poprzedni interaction state bez przypadkowego clear selection.
- [ ] Zbudować lifecycle test matrix dla 29 tooli.
- [ ] Ujednolicić cleanup Width/Smooth/Text na tool switch.
- [ ] Jeden registry dla tool id + label + icon + shortcut + command action + temporary modifiers.
- [ ] Naprawić Eraser `Shift+E`, Node Lasso `Shift+O`, Hand `H`/Space messaging.
- [ ] Naprawić Brand Kit `svgData` insertion i MIME detection.
- [ ] Zweryfikować symbol-definition UX end-to-end.
- [ ] Ujednolicić tokeny kolorów w AssetsPanel.
- [ ] Reconciliacja `BACKLOG.md` z aktualnym kodem.

### P1/P2 — compatibility i jakość produkcyjna

- [ ] Zbudować legalny corpus AI/CDR/PDF/EPS z expected reports.
- [ ] Compatibility matrix per real file/version/feature.
- [ ] Visual regression imported vs reference.
- [ ] Pomiar editable fidelity, unsupported/flattened ratio.
- [ ] Performance benchmark dla import/export/boolean/trace/dużych scen.
- [ ] p50/p95 frame/input budget i regression threshold.
- [ ] Worker/cancel/progress policy dla każdej ciężkiej operacji, nie tylko wybranych.

### P2 — polish i maintainability

- [ ] Jedna polityka językowa/i18n.
- [ ] Rozdzielić Canvas keyboard routing od lifecycle tooli.
- [ ] Rozdzielić text edit session controller.
- [ ] Stopniowo usuwać inline hardcoded style na rzecz tokenów/primitives.
- [ ] Przegląd Tool Rail density/flyouts na podstawie user testów.
- [ ] Aktualizować dokumentację automatycznie z feature registry.

### P3 — pełny roadmap product, nie blocker single-user beta

- [ ] Full auth/account/workspace backend.
- [ ] Share links i public read-only.
- [ ] Role enforcement owner/editor/commenter/viewer.
- [ ] Realtime collaboration + konflikt model.
- [ ] Dalsze fidelity artistic/pattern brushes, mesh editor, advanced perspective/3D zależnie od kierunku produktu.
- [ ] AI workflows z ROADMAP Stage 8.

---

## 12. Proponowany kontrakt jakości dla każdego narzędzia

Każde narzędzie powinno mieć automatycznie ten sam zestaw acceptance criteria:

- [ ] **Activate:** wejście nie modyfikuje dokumentu.
- [ ] **Preview:** pointer move modyfikuje tylko transient state.
- [ ] **Commit:** dokładnie jeden logiczny command/history entry.
- [ ] **Cancel/Escape:** document revision i history index bez zmian.
- [ ] **Cancel state:** selection/camera/isolation wracają do snapshotu, chyba że spec mówi inaczej.
- [ ] **Pointer cancel:** identyczna semantyka jak Escape.
- [ ] **Lost capture:** identyczna semantyka jak cancel.
- [ ] **Tool switch:** jawnie commit albo cancel — nigdy przypadkowy mix.
- [ ] **Undo:** wraca dokładnie do stanu sprzed commitu.
- [ ] **Redo:** odtwarza dokładnie commit.
- [ ] **Locked/hidden:** brak niedozwolonej mutacji.
- [ ] **Zoom invariant:** hit tolerance i handles zachowują screen-space behavior.
- [ ] **Keyboard:** shortcut jest zgodny z ToolRail/CommandPalette/ShortcutSettings.
- [ ] **A11y:** tooltip/label/focus state istnieją.
- [ ] **Persistence/round-trip:** jeśli tool tworzy nowy typ/styl, VCT/SVG/export ma jawny kontrakt.

Najlepiej wygenerować parametrized E2E z registry tooli zamiast pisać 29 niezależnych, niespójnych testów.

---

## 13. Release scope — co oznacza „skończone”

### Wariant A — single-user Vector Editor Beta

Może być osiągnięty stosunkowo szybko po P0/P1 powyżej. W tym wariancie:

- AI/CDR są oznaczone jako compatibility/import alpha;
- brak auth/realtime nie blokuje release;
- advanced brushes/mesh/3D nie blokują release;
- podstawowe edit→save→export musi być bezwzględnie stabilne.

### Wariant B — produkt zgodny z całym obecnym BACKLOG/ROADMAP

Nie jest blisko „kilku poprawek”. Wymaga pełnego SaaS, permissions/realtime, dalszej compatibility pracy, zaawansowanych efektów i później AI workflows.

**Rekomendacja zakresowa:** najpierw formalnie domknąć Wariant A i przestać mieszać jego Definition of Done z odległymi Stage 7/8.

---

## 14. Checklist finalnego przeglądu tego audytu

- [x] Repo metadata i aktualny `master` sprawdzone.
- [x] Struktura monorepo i główne pakiety przejrzane.
- [x] BACKLOG/ROADMAP/AGENTS/RELEASE_CHECKLIST porównane z kodem.
- [x] Historyczne progress logi porównane z późniejszymi fixami.
- [x] Tool Rail — wszystkie 29 ActiveTool IDs ujęte.
- [x] Shared shape state machine sprawdzona.
- [x] Freehand/cut tools sprawdzone.
- [x] Pen/polyline/text lifecycle przejrzany.
- [x] `cancelInteraction`, pointercancel i lost capture przejrzane.
- [x] Tool-switch cleanup przejrzany.
- [x] Keyboard/Escape/Space/nudge przejrzane.
- [x] Shortcut registry porównany z Tool Rail.
- [x] A11y/dialog/high-contrast/onboarding zakres sprawdzony.
- [x] Brand Kit/symbol recent changes sprawdzone.
- [x] SVG sanitizer sprawdzony.
- [x] Worker evidence sprawdzone.
- [x] CDR current parser sprawdzony — honest unsupported zamiast fake geometry.
- [x] Import/export status i ograniczenia opisane.
- [x] Aktualny CI/status check stan sprawdzony — brak bieżącego runu dla HEAD.
- [x] Lista P0/P1/P2/P3 przygotowana.
- [ ] Runtime/manual browser QA — **nie wykonano w tym audycie**.
- [ ] Aktualne lokalne test suite na HEAD — **nie wykonano w tym audycie; należy wykonać w CI/środowisku repo**.

---

## 15. Końcowy werdykt

Vectoria ma już zaskakująco szeroki zakres realnej implementacji, a część dokumentów bardzo mocno zaniża dzisiejszy stan kodu. Największym błędem byłoby teraz dalej „odhaczać feature’y” bez stabilizacji lifecycle i bez jednego źródła prawdy.

Najlepsza kolejność domknięcia:

1. **interaction correctness** — nudge, Escape, tool-switch, text/width/smooth;
2. **tool lifecycle regression suite** — 29 tooli × cancel/switch/pointercancel/undo;
3. **status/documentation reconciliation**;
4. **format fidelity + corpus + release claims**;
5. **aktualny CI + staging release checklist**;
6. dopiero potem dalsze rozszerzanie SaaS/advanced effects/AI.

Po tych krokach będzie można rzetelnie powiedzieć, które elementy są „produkcyjnie skończone”, a które są świadomym późniejszym etapem produktu — bez mieszania działającego kodu, historycznych planów i aspiracyjnych checkboxów.
