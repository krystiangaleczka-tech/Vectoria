# FORMAT_STRATEGY_AI_CDR.md

> Status: **Proposed**  
> Data: 2026-09-16  
> Zakres: PDF, Adobe Illustrator (`.ai`), CorelDRAW (`.cdr`)  
> Powiązane: `ADR_008_AI_CDR_FORMAT_FIRST.md`, `docs/adr/ADR_015_IMPORT_IR_REPORT_SVG_TRANSFORM.md`, `docs/adr/ADR_016_EXPORT_PIPELINE_TARGETS_JOBS_AND_PDF.md`, `SECURITY.md`, `TESTING_STRATEGY.md`

## 1. Cel

Vectoria ma otwierać dokumenty pochodzące z Illustrator/Corel/PDF w sposób, który w pierwszej kolejności chroni **wygląd dokumentu**, a następnie maksymalizuje **edytowalność**.

Docelowa zasada produktu:

> **Nigdy nie pogarszamy wyglądu dokumentu tylko po to, aby udawać pełną edytowalność.**

Import może mieć różny poziom semantycznej edytowalności, ale użytkownik nie może po cichu otrzymać dokumentu z przesuniętym clippingiem, innym gradientem, zgubioną przezroczystością, zmienionym fontem albo usuniętym efektem.

## 2. Dwie niezależne miary jakości

### 2.1 Visual fidelity

Czy dokument po otwarciu w Vectorii wygląda tak samo jak w programie źródłowym.

To jest kryterium nadrzędne dla importu profesjonalnych plików.

### 2.2 Semantic/editing fidelity

Czy obiekty zachowują znaczenie i model edycji z programu źródłowego: tekst pozostaje tekstem, ścieżka ścieżką, mesh meshem, clipping clippingiem, live effect pozostaje edytowalnym live effect itd.

Nie każdy proprietary construct ma odpowiednik w `DocumentModel`. W takich przypadkach Vectoria ma zachować appearance i jasno raportować ograniczenie edycji.

## 3. Audyt stanu obecnego

### 3.1 PDF

Aktualny `packages/io/src/pdf/pdf-vector-importer.ts` jest własnym uproszczonym interpreterem operatorów PDF. Rozpoznaje część operatorów geometrii, kolorów, transformacji i tekstu, ale nie implementuje pełnego modelu PDF graphics state.

W szczególności kod jawnie traktuje jako pomijane lub niepełne m.in. XObjecty (`Do`), shadings (`sh`), clipping (`W`, `W*`), część color spaces i extended graphics state (`gs`). Taki parser może działać dla prostych fixture'ów, ale nie może być podstawą importu 1:1 dla produkcyjnych dokumentów PDF/AI.

Repo zawiera już `pdfjs-dist` w `packages/io/src/assets/pdf-import-service.ts`. Ta ścieżka daje dobry, kontrolowany render referencyjny strony, ale obecnie służy głównie raster preview i nie jest źródłem pełnego modelu obiektowego.

### 3.2 Adobe Illustrator

Aktualny `packages/io/src/ai/ai-importer.ts` ma dwa tory:

- PDF-compatible AI -> `importPdf()`;
- legacy PostScript AI -> parser EPS.

Dla PDF-compatible AI jakość jest więc ograniczona przez obecny parser PDF. Dodatkowo wszystkie odzyskane obiekty są obecnie raportowane jako `editable`, nawet jeśli warstwa PDF nie zawiera pełnej semantyki dokumentu Illustrator.

### 3.3 CorelDRAW

Aktualny `packages/io/src/cdr/cdr-parser.ts` rozpoznaje kontener RIFF/RIFX/ZIP, ale realnie odzyskuje obiekty tylko wtedy, gdy znajdzie osadzony fragment `<svg>...</svg>`. Typowy binarny CDR bez takiego strumienia kończy się `unsupported`.

Nie jest to pełny parser formatu CorelDRAW.

### 3.4 ImportIR

`packages/core/src/import/import-types.ts` ma poprawną granicę domenową, ale `ImportIRNode` jest obecnie placeholderem z `type: string` bez modelu geometrii, hierarchii, kolorów, masek, obrazów, fontów i appearance.

To blokuje stworzenie prawdziwie wspólnego adaptera PDF/AI/CDR.

### 3.5 Eksport AI/CDR

Aktualny `packages/io/src/ai/ai-exporter.ts` zwraca PDF z MIME `application/illustrator`. Nie zapisuje natywnych danych Illustrator.

Aktualny `packages/io/src/cdr/cdr-exporter.ts` buduje ZIP z SVG/XML i zwraca go z rozszerzeniem/MIME CDR. Nie jest to potwierdzony natywny writer CorelDRAW.

To pozostaje w sprzeczności z zasadą ADR-008, że Vectoria nie powinna produkować plików `.ai`/`.cdr`, jeśli nie została udowodniona zgodność.

## 4. Decyzja architektoniczna

Import PDF/AI/CDR ma przejść na **dual representation**:

```text
SOURCE FILE
   |
   v
trusted/native parser
   |
   v
ImportIR v2 ----------------------+
   |                              |
   v                              v
native Vectoria mapping     preserved appearance
   |                              |
   +---------------+--------------+
                   |
                   v
           DocumentModel
                   |
                   v
          Vectoria renderer
                   |
                   v
      reference render comparison
```

### 4.1 Native mapping

Element jest mapowany do natywnego `SceneObject`, jeżeli Vectoria umie zachować jego znaczenie i wygląd w zaakceptowanej tolerancji.

Przykłady:

- path / compound path;
- fill / stroke;
- podstawowe gradienty;
- clipping i opacity mask po rozszerzeniu modelu;
- tekst, jeśli font i shaping mogą być zachowane;
- image;
- group/layer;
- blend mode wspierany przez renderer.

### 4.2 Preserved appearance

Jeżeli konstrukcji nie da się wiarygodnie odwzorować natywnie, importer nie upraszcza jej po cichu.

Docelowo model powinien otrzymać jawny typ roboczo nazywany `ForeignAppearanceObject` albo równoważny kontrakt, który przechowuje:

- appearance gotowy do renderu;
- bounds i transform;
- źródłowy format/version;
- source object ID/path, jeśli dostępny;
- oryginalne lub znormalizowane dane potrzebne do późniejszego remapowania;
- status kompatybilności;
- opcjonalny editable proxy.

Nazwa i finalny kształt typu wymagają osobnego ADR przed zmianą `DocumentModel`.

## 5. ImportIR v2

Nowy `ImportIR` musi być rzeczywistym neutralnym kontraktem formatów, a nie aliasem na `SceneObject`.

Minimalny zakres:

### Dokument

- format źródłowy i wersja;
- pages/artboards;
- page boxes: Media/Crop/Bleed/Trim/Art dla PDF;
- document color profile/output intent;
- metadata potrzebne do raportowania.

### Hierarchia

- layers;
- nested groups;
- stacking order;
- visibility/lock tam, gdzie format to zachowuje;
- clipping groups;
- transparency/isolation groups.

### Geometria

- path i compound path;
- primitives;
- affine transform;
- stroke geometry;
- fill rule.

### Paint i compositing

- solid fill;
- stroke;
- gradient;
- shading/mesh;
- pattern/tile;
- opacity;
- blend mode;
- knockout/isolation;
- soft mask / opacity mask.

### Kolor

Nie wolno na granicy importu redukować wszystkiego do `#RRGGBB`.

IR ma zachowywać co najmniej:

- DeviceGray;
- RGB;
- CMYK;
- Lab;
- ICCBased / profile reference;
- spot/separation/named color, jeśli parser udostępnia dane.

Konwersja do bieżącego modelu Vectorii jest osobnym etapem i ma być raportowana, jeśli jest stratna.

### Tekst

- Unicode, jeśli dostępny;
- glyph ID;
- font reference / PostScript name;
- font size;
- transform/text matrix;
- runs;
- character/glyph positioning;
- writing mode;
- kerning/spacing tam, gdzie parser dostarcza dane;
- informacja o subset/embedded font.

### Assets

- embedded images;
- linked resources;
- image masks;
- ICC/profile references;
- source relationship metadata.

### Compatibility metadata

Każdy node ma klasyfikację:

- `editable`;
- `simplified`;
- `preserved`;
- `unsupported`.

`preserved` oznacza: wygląd zachowany, ale semantyka nie jest jeszcze w pełni natywna.

## 6. PDF — rekomendowany silnik

### 6.1 Preferowany kierunek: MuPDF.js

MuPDF ma JavaScript/WASM API, w którym `Page.run(device, transform)` odtwarza zawartość strony przez `Device`. Device dostaje callbacki m.in. dla:

- fill/stroke path;
- fill/stroke/clip text;
- image i image mask;
- shadings;
- clipping;
- soft masks;
- transparency groups;
- blend modes;
- tiles/pattern-like operations;
- layers/structure.

To pasuje bezpośrednio do architektury `parser -> ImportIR` i eliminuje konieczność ręcznego interpretowania surowych streamów PDF regexami.

MuPDF może także generować render referencyjny z tego samego dokumentu.

**Warunek:** MuPDF/Artifex stosuje model AGPLv3 lub licencję komercyjną. Przed dependency potrzebna jest decyzja licencyjna. Zamknięty produkt/SaaS, który nie chce podlegać obowiązkom AGPL, powinien założyć licencję komercyjną albo wybrać alternatywę.

### 6.2 Alternatywa: PDFium

PDFium daje API page objects i posiada rozbudowany silnik renderujący PDF. Może być bazą własnego adaptera WASM i nie niesie modelu licencyjnego MuPDF/Artifex.

Koszt integracji i utrzymania własnego builda WASM będzie jednak większy.

### 6.3 PDF.js

`pdfjs-dist` pozostaje wartościowy dla:

- preview;
- metadata/page count;
- render fallback;
- awaryjnego/reference rendering w środowiskach, gdzie główny engine nie jest dostępny.

Nie rekomendujemy budowania kolejnego ręcznego parsera na bazie tekstowego tokenizowania streamów.

### 6.4 Gate decyzji

Przed implementacją należy wykonać spike MuPDF.js vs PDFium na wspólnym corpusie. Wybór ma opierać się na:

- visual fidelity;
- kompletności callbacków obiektowych;
- zachowaniu fontów i kolorów;
- bundle size / startup time;
- peak memory;
- kosztach licencji i dystrybucji;
- zgodności z PWA/offline.

## 7. Adobe Illustrator (`.ai`)

AI ma dwa tory.

### 7.1 Local fast path

Dla AI z PDF-compatible representation:

```text
AI -> detect PDF payload -> PDF engine -> ImportIR v2 -> DocumentModel
```

To jest tor offline/PWA i powinien obejmować większość plików zapisanych z kompatybilnością PDF.

Nie zakładamy, że PDF representation zawiera wszystkie dane edycyjne Illustratora.

### 7.2 Native high-fidelity path

Adobe udostępnia Illustrator API w Firefly Services, a Custom Scripts API pozwala wykonywać własne `script.jsx` na dokumentach Illustrator. Usługa jest obecnie oznaczona przez Adobe jako public beta.

Planowany `vectoria-extractor.jsx` powinien:

1. otworzyć dokument przez API Illustratora;
2. przejść pages/artboards/layers/pageItems;
3. wyeksportować znormalizowany manifest JSON zgodny logicznie z ImportIR;
4. wyeksportować potrzebne embedded assets;
5. wygenerować reference rendition/PDF do porównania wizualnego;
6. nie modyfikować dokumentu wejściowego;
7. zwrócić raport konstrukcji, których Vectoria nie potrafi zmapować.

Ten tor nie może być jedyną metodą otwierania AI: local PDF-compatible path pozostaje potrzebny dla offline i prywatności.

### 7.3 AI bez PDF-compatible data

Do czasu wdrożenia native Adobe path aplikacja ma pokazywać jasny komunikat, a nie produkować częściowo losowy wynik.

Po wdrożeniu native path aplikacja może zaproponować secure cloud import za zgodą użytkownika.

## 8. CorelDRAW (`.cdr`)

CDR także ma dwa tory.

### 8.1 Open/local path: libcdr

`libcdr` jest biblioteką LibreOffice służącą do czytania/konwersji binarnych dokumentów CorelDRAW i jest dostępna na MPL 2.0.

Kluczowy interfejs:

```cpp
CDRDocument::parse(input, librevenge::RVNGDrawingInterface *painter)
```

Rekomendacja:

```text
CDR -> libcdr -> custom RVNGDrawingInterface -> ImportIR v2
```

Nie:

```text
CDR -> SVG -> parse SVG -> DocumentModel
```

Bezpośredni painter ogranicza utratę informacji przed etapem ImportIR.

Należy wykonać spike:

- native worker/backend sandbox;
- WASM build libcdr + wymaganych zależności;
- porównanie bundle/memory/startup.

### 8.2 Native high-fidelity path: CorelDRAW bridge

CorelDRAW 2026 SDK udostępnia automatyzację m.in. `Application.OpenDocument`, dostęp do `Page.Shapes`/`FindShapes` i `Document.PublishToPDF`.

Native bridge może więc służyć jako golden/high-fidelity fallback:

```text
CDR
 -> isolated Windows/Corel worker
 -> native document inspection
 -> normalized ImportIR payload
 -> reference PDF/raster
 -> Vectoria
```

Przed implementacją serwerowego bridge trzeba osobno zweryfikować licencję CorelDRAW dla wybranego modelu hostowania/automatyzacji. Techniczna obecność API nie oznacza automatycznie prawa do dowolnego SaaS deploymentu.

## 9. Automatyczne fidelity verification

Każdy high-fidelity import ma generować lub posiadać render referencyjny.

Pipeline:

1. trusted/native engine renderuje źródło;
2. Vectoria mapuje ImportIR do dokumentu;
3. renderer Vectorii generuje wynik;
4. system wykonuje pixel/perceptual diff;
5. przekroczenie progu nie może zakończyć importu jako `exact`.

Docelowo weryfikacja powinna działać także na poziomie subtree/group, aby fallback `preserved appearance` obejmował tylko problematyczny fragment, a nie całą stronę.

## 10. Status kompatybilności w UI

Minimalne statusy produktu:

- **Exact · Editable** — natywne obiekty, appearance w tolerancji;
- **Exact · Partially editable** — appearance w tolerancji, część elementów `preserved`;
- **Exact appearance** — wygląd zachowany, edycja ograniczona;
- **Needs attention** — brak fontu, assetu, profilu, nieobsługiwany element albo diff ponad próg.

Nie używamy słowa `exact` bez pomiaru/baseline.

## 11. Font policy

Importer nie może po cichu zamieniać brakującego fontu na `Inter` ani inny domyślny font i raportować obiektu jako poprawnie edytowalny.

Jeśli font jest dostępny i można zachować layout, tekst pozostaje tekstem.

Jeśli font nie jest dostępny albo PDF zawiera subset/glyph mapping bez wiarygodnej semantyki:

- appearance zostaje zachowany;
- editable proxy jest opcjonalny;
- raport wskazuje brak/ograniczenie fontu;
- użytkownik może świadomie podmienić font.

## 12. Color management policy

Bieżący `DocumentModel` opiera wiele fill/stroke na kolorach stringowych. High-fidelity import wymaga osobnej decyzji domenowej dla kolorów i profili.

Do czasu rozszerzenia modelu:

- ImportIR zachowuje źródłowy model koloru;
- mapping do sRGB jest oznaczany `simplified`;
- spot/ICC/CMYK nie mogą być po cichu deklarowane jako bezstratne.

## 13. Eksport i round-trip

### 13.1 PDF

Bieżący PDF export z ADR-016 jest świadomie rastrowy. Nie może być używany jako podstawa profesjonalnego round-trip AI.

Osobny etap ma wprowadzić vector PDF writer, zachowujący paths/text/images/gradients/clips oraz color information w zakresie modelu Vectorii.

### 13.2 AI/CDR

Do czasu wdrożenia i testów natywnych ścieżek eksportowych:

- nie reklamujemy istniejącego `exportAiFile()` jako natywnego AI;
- nie reklamujemy istniejącego `exportCdrFile()` jako natywnego CDR;
- preferujemy VCT, SVG i PDF zgodnie z faktyczną jakością;
- ekspozycja pseudo-native exportu w UI powinna zostać objęta osobnym taskiem naprawczym.

Potencjalne przyszłe ścieżki:

- AI export przez Illustrator API/custom script albo inny oficjalny format-supported pipeline;
- CDR export przez zweryfikowany CorelDRAW bridge;
- wyłącznie po corpus tests i otwarciu wyniku w programie docelowym.

## 14. Security i privacy

Zasady `SECURITY.md` pozostają obowiązkowe.

Dodatkowo:

- parsing ciężkich formatów musi działać w workerze/sandboxie;
- limity bytes/pages/objects/path nodes/images/decompressed size;
- timeout + `AbortSignal`;
- brak wykonywania macro/script z pliku użytkownika;
- external links nie są automatycznie pobierane;
- cloud/native import wymaga jawnej informacji, że plik opuszcza urządzenie;
- pliki w native bridge są ephemeral i usuwane po zakończeniu joba;
- żadnych persistent temp files bez potrzeby produktowej.

## 15. Test corpus

Przed deklaracją stabilnego importu potrzebny jest versioned corpus obejmujący co najmniej:

- proste paths/shapes;
- nested transforms;
- compound paths i fill rules;
- clipping paths;
- opacity masks;
- transparency groups;
- blend modes;
- gradients/shadings;
- mesh/patterns;
- embedded + linked images;
- RGB/CMYK/Lab/ICC/spot;
- text z embedded/subset/missing fonts;
- variable fonts;
- rotated/skewed/path text;
- multiple pages/artboards;
- duże dokumenty;
- corrupted/adversarial files;
- pliki z wielu wersji Illustrator/CorelDRAW.

Każdy fixture ma mieć:

- source file;
- expected metadata;
- authoritative reference render;
- oczekiwane klasy `editable/preserved/simplified/unsupported`;
- tolerancję visual diff;
- informację o źródłowej aplikacji i wersji.

## 16. Definition of Done dla "high fidelity"

Format może być oznaczony w UI jako high-fidelity dopiero, gdy:

1. nie ma cichej utraty obiektów;
2. każda strata semantyki trafia do reportu;
3. reference render i Vectoria render przechodzą ustalony visual threshold na zatwierdzonym corpusie;
4. missing fonts/assets są jawne;
5. import jest transactional, cancellable i resource-limited;
6. źródłowy plik nigdy nie jest modyfikowany;
7. regresje wizualne działają w CI;
8. licencje wszystkich użytych engine'ów są zaakceptowane;
9. UI nie deklaruje większej kompatybilności niż faktycznie zmierzono.

## 17. Decyzje do zatwierdzenia przed kodem

- [ ] MuPDF commercial vs PDFium jako główny PDF object engine.
- [ ] Finalny kontrakt ImportIR v2.
- [ ] Finalny kontrakt preserved appearance w `DocumentModel`.
- [ ] Rozszerzenie color model / ICC / CMYK / spot.
- [ ] Model font embedding/subsetting/source attachment.
- [ ] Adobe Illustrator API: credentials, koszty, limity i beta risk.
- [ ] libcdr: WASM vs sandbox backend.
- [ ] CorelDRAW bridge: licencja i model hostowania.
- [ ] Polityka prywatności dla cloud importu.
- [ ] Progi visual/perceptual diff.

## 18. Źródła techniczne zweryfikowane 2026-09-16

### MuPDF / Artifex

- MuPDF `Page.run(device, transform)`: https://mupdf.readthedocs.io/en/1.28.3/reference/javascript/types/Page.html
- MuPDF JavaScript `Device`: https://mupdf.readthedocs.io/en/1.28.0/reference/javascript/types/Device.html
- MuPDF.js page/device example: https://mupdfjs.readthedocs.io/en/latest/how-to-guide/page.html
- Artifex licensing: https://artifex.com/licensing

### PDFium

- PDF page object API: https://pdfium.googlesource.com/pdfium/+/refs/heads/main/public/fpdf_edit.h

### Adobe Illustrator API

- Illustrator API overview: https://developer.adobe.com/firefly-services/docs/illustrator/
- Custom Script Guide: https://developer.adobe.com/firefly-services/docs/illustrator/guides/custom-scripts/
- Custom script concepts: https://developer.adobe.com/firefly-services/docs/illustrator/getting-started/concepts/

### CorelDRAW 2026 SDK

- `Application.OpenDocument`: https://community.coreldraw.com/sdk/api/draw/27/m/application.opendocument
- `Page.Shapes`: https://community.coreldraw.com/sdk/api/draw/27/p/page.shapes
- `Page.FindShapes`: https://community.coreldraw.com/sdk/api/draw/27/m/page.findshapes
- `Document.PublishToPDF`: https://community.coreldraw.com/sdk/api/draw/27/m/document.publishtopdf

### libcdr

- Project/README: https://github.com/LibreOffice/libcdr
- `CDRDocument::parse`: https://github.com/LibreOffice/libcdr/blob/master/inc/libcdr/CDRDocument.h

## 19. Wynik decyzji

Rekomendowany kierunek Vectorii:

| Format | Local/offline path | High-fidelity/native path |
|---|---|---|
| PDF | MuPDF.js lub PDFium -> ImportIR v2 | ten sam engine + reference render + preserved appearance |
| AI | PDF-compatible payload -> PDF engine | Adobe Illustrator Custom Scripts API |
| CDR | libcdr -> custom drawing adapter -> ImportIR v2 | isolated CorelDRAW automation bridge |

Ta strategia rozszerza ADR-008: AI/CDR nadal są formatami pierwszej klasy, ale "pierwsza klasa" oznacza mierzoną kompatybilność i uczciwy fallback, a nie samo zaakceptowanie rozszerzenia pliku.
