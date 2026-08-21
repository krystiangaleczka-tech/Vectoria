# Vectoria — Roadmap produktu

> Status: roadmap kierunkowy
>
> Strategia: format-first. Vectoria najpierw dostarcza wartość przez otwieranie i przekształcanie plików `.ai` i `.cdr`, następnie staje się coraz pełniejszym edytorem wektorowym.
>
> Zasada: etap kończy się działającym workflow użytkownika, nie liczbą „ukończonych tasków”.

---

## 1. North Star

> **Vectoria pozwala otworzyć plik z Adobe Illustrator lub CorelDRAW, zrozumieć co zostało zaimportowane, poprawić najważniejsze elementy wektorowe i bezpiecznie wyeksportować wynik — szybko, w przeglądarce.**

## 2. Kolejność priorytetów

```text
AI import → wspólny import pipeline → CDR import → podstawowa edycja
→ jakość/wydajność → profesjonalne narzędzia wektorowe
→ tekst/asset workflow → zaawansowany eksport → SaaS/collaboration → AI
```

Nie odwracamy tej kolejności przez przypadkowe feature requesty. Funkcja, która nie zwiększa jakości AI/CDR importu, podstawowej edycji lub stabilności, jest odkładana do odpowiedniego późniejszego etapu.

## 3. Etap 0 — Foundation

### Cel

Powstaje stabilny silnik dokumentu i canvas, na którym można wyświetlić wynik importu bez zamrażania UI.

### Zakres

- Natywny `DocumentModel`, artboard, warstwy i obiekty podstawowe
- Współrzędne logiczne niezależne od rozmiaru canvasu
- Kamera: pan, zoom względem kursora, fit artboard, fit drawing
- Canvas renderer z `requestAnimationFrame`
- Warstwy renderu: background, scene, overlay
- Rectangle, ellipse, line, path jako podstawowe typy modelu
- Select Tool i podstawowy hit-test
- Command system oraz Undo/Redo foundation
- Minimalny local autosave
- Performance HUD w dev mode

### Definition of Done

- Można otworzyć pusty dokument.
- Canvas ma rozmiar viewportu, nie artboardu.
- Pan/zoom są płynne dla prostych scen.
- Ekstremalny logiczny resize artboardu nie blokuje aplikacji.
- Rectangle jest renderowany, zaznaczany i przesuwany.

### Poza zakresem

- Node Tool
- Boolean
- Text
- Pełne SVG import/export
- CDR parser
- Konta, chmura i AI

## 4. Etap 1 — AI Import Alpha

### Cel

Pierwszy rzeczywisty workflow produktu: użytkownik otwiera PDF-compatible `.ai`, widzi wynik, otrzymuje raport zgodności i może zmienić podstawowy obiekt.

### Zakres

- `ImportIR`, `CompatibilityReport`, transakcyjny import
- Inspekcja AI i wykrywanie PDF-compatible stream
- Czytelny błąd dla AI bez PDF compatibility
- PDF/AI adapter dla podstawowych shapes i cubic Bézier
- Artboards/pages, z-order, podstawowe groups
- Fill, stroke, opacity, podstawowe transformacje
- Import osadzonych obrazów jako fallback/asset
- Import warning/flattened/unsupported categories
- UI importu: file picker, drag-and-drop, progres, cancel, report
- Select, move, delete, fill/stroke dla wspieranych obiektów
- SVG i PNG export po imporcie
- Test corpus AI i visual regression

### Definition of Done

Użytkownik może:

1. Wybrać PDF-compatible AI.
2. Otrzymać wynik importu bez crasha.
3. Zobaczyć liczbę elementów edytowalnych i problematycznych.
4. Zaznaczyć i przesunąć wspierany path/shape.
5. Cofnąć zmianę.
6. Wyeksportować wynik jako SVG/PNG.

### Nie deklarujemy

- pełnej obsługi AI;
- tekstu z zachowaniem fontów;
- mesh, 3D, live effects i wszystkich blend modes;
- zapisu natywnego `.ai`.

## 5. Etap 2 — CDR Import Alpha

### Cel

Vectoria otwiera referencyjne pliki `.cdr` i mapuje podstawową geometrię CorelDRAW do edytowalnego modelu Vectorii.

### Przed implementacją

- Test corpus z różnymi wersjami CDR
- Spike lokalnego parsera/WASM/backend conversion service
- Ocena fidelity, wydajności, licencji, bezpieczeństwa i prywatności
- ADR z wyborem adaptera CDR

### Zakres

- CDR inspection
- CDR adapter działający poza UI main thread
- Timeout, cancel, progress oraz limity zasobów
- Import page/artboard, shapes, curves, fill i outline
- Zachowanie kolejności i podstawowej hierarchy
- Bitmap/image fallback
- PowerClip/effects/text jako warning/fallback w zależności od możliwości adaptera
- Compatibility Report wspólny z AI
- SVG/PDF/PNG export po imporcie
- Corpus CDR, e2e i visual regression

### Definition of Done

Użytkownik może zaimportować reprezentatywny CDR z podstawowymi shapes/curves, edytować obsługiwany obiekt i otrzymać uczciwy raport dla elementów nieobsługiwanych.

## 6. Etap 3 — Core Editor Beta

### Cel

Vectoria nie tylko otwiera AI/CDR, ale pozwala wykonać realną korektę logo, ikony albo prostej ilustracji.

### Zakres

- Rectangle, ellipse, line, polyline, star/polygon
- Pen Tool dopracowany: paths, closing, handles, rubber band
- Node Tool: select/move/add/delete nodes
- Node types: corner, smooth, symmetric, auto
- Scale, rotate, flip, precise X/Y/W/H
- Multi-select, marquee i basic lasso
- Layers: visibility, lock, rename, order, groups
- Grid, guides i smart snapping
- Align, distribute, duplicate, repeat transform
- Linear/radial gradients, dashes, caps, joins
- Object opacity i podstawowe blend modes
- IndexedDB restore i native `.vct`
- SVG editable export oraz improved import

### Definition of Done

Użytkownik może otworzyć prosty AI/CDR, poprawić krzywe, zmienić kolory, przesunąć elementy, przygotować wariant logo oraz zachować projekt w Vectorii.

## 7. Etap 4 — Professional Vector Tools

### Cel

Usunąć największe blokery profesjonalnej edycji obiektów importowanych z AI/CDR.

### Zakres

- Boolean: unite, subtract, intersect, exclude, divide
- Compound paths
- Clipping mask i isolate mode
- Outline stroke
- Convert shape/text to curves
- Join/break/close paths
- Corner Tool i offset path
- Simplify, smooth, pencil i brush
- Eraser, knife, scissors, width tool
- Swatches, global colors i object styles
- Appearance panel
- Basic effects: blur, shadow, rounded corners
- Multi-artboard
- Export selection and Export for Screens

### Definition of Done

Użytkownik może przekształcić importowane logo/ikony bez ręcznej edycji setek węzłów oraz wyeksportować gotowe assety w wielu formatach i skalach.

## 8. Etap 5 — Typography, Assets and Print

### Cel

Rozszerzyć Vectorię z edytora geometrii do narzędzia do materiałów marketingowych, layoutu i prostych projektów drukowanych.

### Zakres

- Artistic text i paragraph text
- Font family, weight, size, kerning, tracking, line height
- Text on path
- Font fallback/report po imporcie AI/CDR
- Convert text to outlines
- Images: link/embed, crop, basic adjustments
- Asset library, symbols/components
- Brand Kit: logo, kolory, fonty, komponenty
- PDF import/export
- Bleed, crop marks i ustawienia druku
- CMYK workflow/ostrzeżenia gamut w zakresie możliwości aplikacji
- Trace image dla prostych logo

### Definition of Done

Użytkownik może stworzyć lub poprawić prosty materiał drukowany/marketingowy, złożyć go z tekstu i wektorów oraz wyeksportować przewidywalny PDF.

## 9. Etap 6 — Compatibility and Performance Expansion

### Cel

Podnosić faktyczną jakość importu AI/CDR na podstawie rzeczywistych plików i benchmarków, bez psucia płynności.

### Zakres

- Rozszerzanie compatibility matrix dla AI/CDR
- Więcej wersji CDR i AI
- Ulepszone gradients, clipping, transparency i blends
- Obsługa kolejnych typów images/assets
- Fallback rendering dla zaawansowanych efektów
- R-tree, gdy benchmarki tego wymagają
- Web Workers dla importu, exportu, trace i Boolean
- Cache złożonych grup/efektów
- Adaptacyjna jakość renderu interactive/final
- OffscreenCanvas/WebGL tylko po udowodnionej potrzebie
- Performance regression dashboard

### Definition of Done

Wspierane rzeczywiste pliki importują się z mierzalnie lepszą liczbą `editable` obiektów, a benchmarki nie pokazują regresji FPS/latency.

## 10. Etap 7 — Collaboration and SaaS

### Cel

Umożliwić bezpieczne przechowywanie projektów, przekazywanie pracy i współpracę zespołową.

### Zakres

- Konta użytkowników i workspace
- Cloud sync, projekty, foldery, tagi
- Historia wersji i restore
- Publiczny read-only link
- Roles: owner, editor, commenter, viewer
- Komentarze przypięte do canvasu i `@mentions`
- Shared templates i Brand Kit
- Audit log
- Realtime collaboration po ustabilizowaniu conflict modelu
- Pricing, limity i billing

### Definition of Done

Użytkownik może udostępnić projekt, zebrać komentarze, przywrócić wersję i bezpiecznie kontrolować dostęp do pliku.

## 11. Etap 8 — AI Workflows

### Cel

AI przyspiesza istniejący workflow edytora, ale nie zastępuje deterministycznej kontroli użytkownika.

### Zakres

- Generowanie prostych ikon SVG z promptu
- Vectorize sketch/image dla kontrolowanego zakresu
- Remove redundant nodes i path cleanup
- Auto naming layers
- Auto organize SVG/layers
- Palette extraction z obrazu/brandu
- Text commands: align, distribute, recolor, clean paths
- Preview zmian AI przed zastosowaniem
- Undo dla każdej akcji AI
- Konfigurowalni providerzy/model routing

### Definition of Done

Użytkownik może przyspieszyć rutynową pracę, zawsze widzi proposed change przed commitem i może cofnąć wynik jednym Undo.

## 12. Niezmienne standardy we wszystkich etapach

- Dokument ma współrzędne logiczne; canvas nigdy nie ma rozmiaru artboardu.
- Import jest transakcyjny i nie niszczy otwartego dokumentu.
- Nieobsługiwany element AI/CDR jest raportowany, nie ignorowany po cichu.
- Każda zmiana dokumentu ma Undo/Redo.
- Funkcja formatowa ma fixture, test regresyjny i Compatibility Report.
- Ciężka operacja nie blokuje UI.
- Każda znacząca decyzja architektoniczna ma ADR.
- Każdy release przechodzi `RELEASE_CHECKLIST.md`.

## 13. Czego nie robimy przed czasem

- Nie budujemy pełnego klona CorelDRAW/Illustratora przed zweryfikowaniem importu i podstawowej edycji AI/CDR.
- Nie budujemy realtime collaboration przed stabilnym single-user document model.
- Nie obiecujemy eksportu AI/CDR przed udowodnieniem wierności.
- Nie dodajemy R-tree/WebGL/worker renderingu bez benchmarku wskazującego problem.
- Nie robimy generatora obrazów AI jako substytutu prawdziwej pracy wektorowej.
- Nie dodajemy kilkudziesięciu narzędzi deformacji, zanim Pen, Node, Boolean i export nie są niezawodne.

## 14. Miary postępu

Roadmapa nie jest oceniana po liczbie checkboxów, lecz po efektach:

| Miara | Pytanie |
|---|---|
| Import success rate | Ile rzeczywistych AI/CDR otwiera się bez crasha? |
| Editable fidelity | Jaki procent obiektów pozostaje edytowalny? |
| Compatibility clarity | Czy użytkownik wie, co zostało uproszczone? |
| Workflow completion | Czy import → edit → export kończy się sukcesem? |
| Performance | Czy pan/zoom/drag pozostają w budżecie? |
| Data safety | Czy błąd importu lub crash nie niszczy pracy? |
| Retention | Czy użytkownik wraca do Vectorii do kolejnego pliku? |

## 15. Backlog parking lot

Poniższe funkcje są wartościowe, lecz świadomie nie są częścią najbliższych etapów:

- pełne 3D;
- mesh gradient/editor;
- advanced perspective;
- brushes artystyczne i pattern brushes;
- CAD/technical drawing tools;
- pełna edycja rastrowa jak Photoshop;
- marketplace assetów;
- pełny mobile editor jako główne środowisko pracy;
- natywny eksport `.ai` i `.cdr` bez osobnego, udowodnionego planu kompatybilności.
