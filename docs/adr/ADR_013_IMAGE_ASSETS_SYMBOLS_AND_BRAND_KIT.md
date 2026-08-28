# ADR 013: Model obrazów rastrowych, zasobów zewnętrznych, symboli i Brand Kit

## Status
Accepted

## Kontekst
Vectoria wymaga pełnego wsparcia dla:
1. Obrazów rastrowych (PNG, JPG, WebP) z obsługą przeciągania na canvas (Drag & Drop), osadzaniem (Embed z Data URL) oraz linkowaniem zewnętrznym (Link z URL).
2. Wykrywania brakujących zasobów i panelu linków zewnętrznych.
3. Niedestrukcyjnego kadrowania (Crop) i filtrów obrazu (brightness, contrast, saturation, grayscale).
4. Wektoryzacji obrazów (Image Tracing B&W i wielokolorowych logotypów) z algorytmem upraszczania węzłów.
5. Systemu symboli/komponentów wielokrotnego użytku (`SymbolDefinition`, `SymbolInstanceObject`) z atomową propagacją edycji definicji.
6. Biblioteki gotowych ikon i kształtów SVG oraz Brand Kit (logo, kolory, fonty, komponenty).

## Decyzje architektoniczne

### 1. Model obrazu (`ImageObject`)
- Obiekt sceny `type: 'image'` z polami:
  - `source`: `ImageSource` (`{ type: 'embed', data: string, mimeType: string }` lub `{ type: 'link', url: string, mimeType?: string }`).
  - `naturalWidth`, `naturalHeight`: wymiary oryginalnego pliku obrazu w pikselach.
  - `width`, `height`: wymiary wyświetlane w przestrzeni świata dokumentu.
  - `crop?: ImageCrop`: niedestrukcyjny wycinek `{ x: number, y: number, width: number, height: number }` w przestrzeni pikseli obrazu naturalnego.
  - `filters?: ImageFilters`: parametry `{ brightness?: number, contrast?: number, saturation?: number, grayscale?: boolean }`.
  - `isMissing?: boolean`: flaga błędu ładowania zasobu zewnętrznego.

### 2. DND i routing formatów
- Upuszczenie pliku na canvas:
  - PNG, JPG, WebP -> tworzenie `ImageObject` przez `CreateImageObjectCommand`.
  - SVG -> import wektorowy do edytowalnych ścieżek (`PathObject`, `GroupObject`) przez `importSvgToDocumentModel`.
  - PDF -> import stron/wektorów do dokumentu.

### 3. System symboli (`SymbolDefinition` i `SymbolInstanceObject`)
- Definicje symboli przechowywane są w `doc.symbols: Record<SymbolId, SymbolDefinition>`.
- Instancje symboli na warstwach to obiekty `type: 'symbol-instance'`, które przechowują jedynie `symbolId`, `transform` i wymiary.
- Edycja definicji symbolu przez `UpdateSymbolDefinitionCommand` jest atomową operacją obejmującą definicję i automatycznie odświeżającą wszystkie instancje.

### 4. Brand Kit
- Model `BrandKit` w `doc.brandKit` integruje:
  - Logotypy marki (`logos`).
  - Identyfikatory palet kolorów (`colorPaletteIds`).
  - Nazwy rodzin fontów firmowych (`fontFamilies`).
  - Identyfikatory symboli/komponentów brandowych (`symbolIds` / `isBrandAsset`).

### 5. Algorytm wektoryzacji (Image Trace)
- Deterministyczny algorytm w `packages/core/src/geometry/image-trace.ts`:
  - Binary thresholding / Color quantization.
  - Moore-Neighbor / Marching squares contour extraction.
  - Douglas-Peucker & Bézier curve fitting do formatu `PathObject`.

## Konsekwencje
- Zachowanie niezmienników dokumentu i pełna obsługa Undo/Redo.
- Zgodność z walidacją wejścia Zod w `packages/io` i poprawny eksport SVG z `<image>` oraz `<use>`.
