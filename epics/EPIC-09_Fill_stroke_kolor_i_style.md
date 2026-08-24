# [EPIC-09] Fill, stroke, kolor i style — specyfikacja wykonawcza

## Cel

Użytkownik nadaje obiektom spójny fill, stroke, gradienty, palety, style i blend modes; wszystkie wartości są serializowalne, command-based oraz renderowane identycznie w Canvas i SVG.

## Niezmienniki

- ObjectStyle jest renderer-independent i zawiera fill/stroke; opacity pozostaje w zakresie 0–1.

- Każda zmiana stylu przechodzi przez UpdateObjectStyleCommand i jest Undo/Redo.

- Color parsing/normalization jest centralne; UI nie zawiera niezależnych konwersji RGB/HSL/CMYK.

- Gradient preview i drag stops są transient overlay; commit następuje po Apply/pointerup.

- Global color propagation jest atomowa, command-based i nie blokuje inputu.

- Canvas renderer, SVG importer i exporter stosują jeden semantyczny model stylu.

- Kolor nigdy nie jest jedynym nośnikiem statusu; UI używa tokenów Dark/Light.

## Kontrakty

```ts
export type FillStyle = { type:"none" } | { type:"solid"; color:string } | { type:"linear-gradient"; start:Vec2; end:Vec2; stops:GradientStop[] };
export interface GradientStop { id:string; offset:number; color:string; opacity:number; }
export interface StrokeStyle { enabled:boolean; color:string; width:number; lineCap:"butt"|"round"|"square"; lineJoin:"miter"|"round"|"bevel"; miterLimit:number; dashArray:number[]; }
```

## Backlog

### STYLE-001 — Jednolity fill

- [ ] Zdefiniuj domain model, validation i command dla Jednolity fill.
- [ ] Dodaj Properties/ColorControl workflow dla Jednolity fill.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Jednolity fill.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Jednolity fill.
- [ ] Dodaj unit i E2E test edge cases dla Jednolity fill.

### STYLE-002 — Brak fill

- [ ] Zdefiniuj domain model, validation i command dla Brak fill.
- [ ] Dodaj Properties/ColorControl workflow dla Brak fill.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Brak fill.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Brak fill.
- [ ] Dodaj unit i E2E test edge cases dla Brak fill.

### STYLE-003 — Color Picker

- [ ] Zdefiniuj domain model, validation i command dla Color Picker.
- [ ] Dodaj Properties/ColorControl workflow dla Color Picker.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Color Picker.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Color Picker.
- [ ] Dodaj unit i E2E test edge cases dla Color Picker.

### STYLE-004 — RGB

- [ ] Zdefiniuj domain model, validation i command dla RGB.
- [ ] Dodaj Properties/ColorControl workflow dla RGB.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla RGB.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla RGB.
- [ ] Dodaj unit i E2E test edge cases dla RGB.

### STYLE-005 — HEX

- [ ] Zdefiniuj domain model, validation i command dla HEX.
- [ ] Dodaj Properties/ColorControl workflow dla HEX.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla HEX.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla HEX.
- [ ] Dodaj unit i E2E test edge cases dla HEX.

### STYLE-006 — HSL

- [ ] Zdefiniuj domain model, validation i command dla HSL.
- [ ] Dodaj Properties/ColorControl workflow dla HSL.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla HSL.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla HSL.
- [ ] Dodaj unit i E2E test edge cases dla HSL.

### STYLE-007 — CMYK

- [ ] Zdefiniuj domain model, validation i command dla CMYK.
- [ ] Dodaj Properties/ColorControl workflow dla CMYK.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla CMYK.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla CMYK.
- [ ] Dodaj unit i E2E test edge cases dla CMYK.

### STYLE-008 — Out-of-gamut

- [ ] Zdefiniuj domain model, validation i command dla Out-of-gamut.
- [ ] Dodaj Properties/ColorControl workflow dla Out-of-gamut.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Out-of-gamut.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Out-of-gamut.
- [ ] Dodaj unit i E2E test edge cases dla Out-of-gamut.

### STYLE-009 — Kolor stroke

- [ ] Zdefiniuj domain model, validation i command dla Kolor stroke.
- [ ] Dodaj Properties/ColorControl workflow dla Kolor stroke.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Kolor stroke.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Kolor stroke.
- [ ] Dodaj unit i E2E test edge cases dla Kolor stroke.

### STYLE-010 — Grubość stroke

- [ ] Zdefiniuj domain model, validation i command dla Grubość stroke.
- [ ] Dodaj Properties/ColorControl workflow dla Grubość stroke.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Grubość stroke.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Grubość stroke.
- [ ] Dodaj unit i E2E test edge cases dla Grubość stroke.

### STYLE-011 — Pozycja stroke

- [ ] Zdefiniuj domain model, validation i command dla Pozycja stroke.
- [ ] Dodaj Properties/ColorControl workflow dla Pozycja stroke.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Pozycja stroke.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Pozycja stroke.
- [ ] Dodaj unit i E2E test edge cases dla Pozycja stroke.

### STYLE-012 — Line caps

- [ ] Zdefiniuj domain model, validation i command dla Line caps.
- [ ] Dodaj Properties/ColorControl workflow dla Line caps.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Line caps.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Line caps.
- [ ] Dodaj unit i E2E test edge cases dla Line caps.

### STYLE-013 — Line joins

- [ ] Zdefiniuj domain model, validation i command dla Line joins.
- [ ] Dodaj Properties/ColorControl workflow dla Line joins.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Line joins.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Line joins.
- [ ] Dodaj unit i E2E test edge cases dla Line joins.

### STYLE-014 — Miter limit

- [ ] Zdefiniuj domain model, validation i command dla Miter limit.
- [ ] Dodaj Properties/ColorControl workflow dla Miter limit.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Miter limit.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Miter limit.
- [ ] Dodaj unit i E2E test edge cases dla Miter limit.

### STYLE-015 — Dashed stroke

- [ ] Zdefiniuj domain model, validation i command dla Dashed stroke.
- [ ] Dodaj Properties/ColorControl workflow dla Dashed stroke.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Dashed stroke.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Dashed stroke.
- [ ] Dodaj unit i E2E test edge cases dla Dashed stroke.

### STYLE-016 — Dash/gap

- [ ] Zdefiniuj domain model, validation i command dla Dash/gap.
- [ ] Dodaj Properties/ColorControl workflow dla Dash/gap.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Dash/gap.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Dash/gap.
- [ ] Dodaj unit i E2E test edge cases dla Dash/gap.

### STYLE-017 — Gradient liniowy

- [ ] Zdefiniuj domain model, validation i command dla Gradient liniowy.
- [ ] Dodaj Properties/ColorControl workflow dla Gradient liniowy.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Gradient liniowy.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Gradient liniowy.
- [ ] Dodaj unit i E2E test edge cases dla Gradient liniowy.

### STYLE-018 — Gradient radialny

- [ ] Zdefiniuj domain model, validation i command dla Gradient radialny.
- [ ] Dodaj Properties/ColorControl workflow dla Gradient radialny.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Gradient radialny.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Gradient radialny.
- [ ] Dodaj unit i E2E test edge cases dla Gradient radialny.

### STYLE-019 — Gradient kątowy

- [ ] Zdefiniuj domain model, validation i command dla Gradient kątowy.
- [ ] Dodaj Properties/ColorControl workflow dla Gradient kątowy.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Gradient kątowy.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Gradient kątowy.
- [ ] Dodaj unit i E2E test edge cases dla Gradient kątowy.

### STYLE-020 — Gradient stops

- [ ] Zdefiniuj domain model, validation i command dla Gradient stops.
- [ ] Dodaj Properties/ColorControl workflow dla Gradient stops.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Gradient stops.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Gradient stops.
- [ ] Dodaj unit i E2E test edge cases dla Gradient stops.

### STYLE-021 — Gradient editor

- [ ] Zdefiniuj domain model, validation i command dla Gradient editor.
- [ ] Dodaj Properties/ColorControl workflow dla Gradient editor.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Gradient editor.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Gradient editor.
- [ ] Dodaj unit i E2E test edge cases dla Gradient editor.

### STYLE-022 — Pattern fill

- [ ] Zdefiniuj domain model, validation i command dla Pattern fill.
- [ ] Dodaj Properties/ColorControl workflow dla Pattern fill.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Pattern fill.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Pattern fill.
- [ ] Dodaj unit i E2E test edge cases dla Pattern fill.

### STYLE-023 — Document palette

- [ ] Zdefiniuj domain model, validation i command dla Document palette.
- [ ] Dodaj Properties/ColorControl workflow dla Document palette.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Document palette.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Document palette.
- [ ] Dodaj unit i E2E test edge cases dla Document palette.

### STYLE-024 — User palette

- [ ] Zdefiniuj domain model, validation i command dla User palette.
- [ ] Dodaj Properties/ColorControl workflow dla User palette.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla User palette.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla User palette.
- [ ] Dodaj unit i E2E test edge cases dla User palette.

### STYLE-025 — Saved palettes

- [ ] Zdefiniuj domain model, validation i command dla Saved palettes.
- [ ] Dodaj Properties/ColorControl workflow dla Saved palettes.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Saved palettes.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Saved palettes.
- [ ] Dodaj unit i E2E test edge cases dla Saved palettes.

### STYLE-026 — Import palettes

- [ ] Zdefiniuj domain model, validation i command dla Import palettes.
- [ ] Dodaj Properties/ColorControl workflow dla Import palettes.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Import palettes.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Import palettes.
- [ ] Dodaj unit i E2E test edge cases dla Import palettes.

### STYLE-027 — Color swatches

- [ ] Zdefiniuj domain model, validation i command dla Color swatches.
- [ ] Dodaj Properties/ColorControl workflow dla Color swatches.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Color swatches.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Color swatches.
- [ ] Dodaj unit i E2E test edge cases dla Color swatches.

### STYLE-028 — Gradient swatches

- [ ] Zdefiniuj domain model, validation i command dla Gradient swatches.
- [ ] Dodaj Properties/ColorControl workflow dla Gradient swatches.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Gradient swatches.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Gradient swatches.
- [ ] Dodaj unit i E2E test edge cases dla Gradient swatches.

### STYLE-029 — Pattern swatches

- [ ] Zdefiniuj domain model, validation i command dla Pattern swatches.
- [ ] Dodaj Properties/ColorControl workflow dla Pattern swatches.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Pattern swatches.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Pattern swatches.
- [ ] Dodaj unit i E2E test edge cases dla Pattern swatches.

### STYLE-030 — Global colors

- [ ] Zdefiniuj domain model, validation i command dla Global colors.
- [ ] Dodaj Properties/ColorControl workflow dla Global colors.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Global colors.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Global colors.
- [ ] Dodaj unit i E2E test edge cases dla Global colors.

### STYLE-031 — Global color propagation

- [ ] Zdefiniuj domain model, validation i command dla Global color propagation.
- [ ] Dodaj Properties/ColorControl workflow dla Global color propagation.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Global color propagation.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Global color propagation.
- [ ] Dodaj unit i E2E test edge cases dla Global color propagation.

### STYLE-032 — Object styles

- [ ] Zdefiniuj domain model, validation i command dla Object styles.
- [ ] Dodaj Properties/ColorControl workflow dla Object styles.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Object styles.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Object styles.
- [ ] Dodaj unit i E2E test edge cases dla Object styles.

### STYLE-033 — Style appearance

- [ ] Zdefiniuj domain model, validation i command dla Style appearance.
- [ ] Dodaj Properties/ColorControl workflow dla Style appearance.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Style appearance.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Style appearance.
- [ ] Dodaj unit i E2E test edge cases dla Style appearance.

### STYLE-034 — Eyedropper

- [ ] Zdefiniuj domain model, validation i command dla Eyedropper.
- [ ] Dodaj Properties/ColorControl workflow dla Eyedropper.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Eyedropper.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Eyedropper.
- [ ] Dodaj unit i E2E test edge cases dla Eyedropper.

### STYLE-035 — Eyedropper color/style

- [ ] Zdefiniuj domain model, validation i command dla Eyedropper color/style.
- [ ] Dodaj Properties/ColorControl workflow dla Eyedropper color/style.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Eyedropper color/style.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Eyedropper color/style.
- [ ] Dodaj unit i E2E test edge cases dla Eyedropper color/style.

### STYLE-036 — Paint Bucket

- [ ] Zdefiniuj domain model, validation i command dla Paint Bucket.
- [ ] Dodaj Properties/ColorControl workflow dla Paint Bucket.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Paint Bucket.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Paint Bucket.
- [ ] Dodaj unit i E2E test edge cases dla Paint Bucket.

### STYLE-037 — Opacity

- [ ] Zdefiniuj domain model, validation i command dla Opacity.
- [ ] Dodaj Properties/ColorControl workflow dla Opacity.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Opacity.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Opacity.
- [ ] Dodaj unit i E2E test edge cases dla Opacity.

### STYLE-038 — Normal blend

- [ ] Zdefiniuj domain model, validation i command dla Normal blend.
- [ ] Dodaj Properties/ColorControl workflow dla Normal blend.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Normal blend.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Normal blend.
- [ ] Dodaj unit i E2E test edge cases dla Normal blend.

### STYLE-039 — Multiply

- [ ] Zdefiniuj domain model, validation i command dla Multiply.
- [ ] Dodaj Properties/ColorControl workflow dla Multiply.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Multiply.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Multiply.
- [ ] Dodaj unit i E2E test edge cases dla Multiply.

### STYLE-040 — Screen

- [ ] Zdefiniuj domain model, validation i command dla Screen.
- [ ] Dodaj Properties/ColorControl workflow dla Screen.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Screen.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Screen.
- [ ] Dodaj unit i E2E test edge cases dla Screen.

### STYLE-041 — Overlay

- [ ] Zdefiniuj domain model, validation i command dla Overlay.
- [ ] Dodaj Properties/ColorControl workflow dla Overlay.
- [ ] Zachowaj render parity Canvas/SVG oraz serializację dla Overlay.
- [ ] Dodaj preview, Cancel/Apply, history label i Undo/Redo dla Overlay.
- [ ] Dodaj unit i E2E test edge cases dla Overlay.

## UI i design system

- ColorControl zawsze pokazuje swatch; Fill/Stroke ma jawny target toggle i oddzielną akcję No fill.

- Wartości HEX/RGB/HSL/CMYK mają parser, formatowanie, text+icon+border errors oraz accessible labels.

- Gradient editor ma własny panel, stops, offset, opacity i preview; nie jest ukryty w losowym menu.

- Properties ma Appearance section: Fill, Stroke, Opacity, Blend; labels są krótkie i tabular values.

- Eyedropper oraz Paint Bucket pokazują explicit target/status; blend modes są opisane tekstem, nie ikoną samą.

- Palety/swatches używają tokenowych selected/hover/focus states; global color ma impact preview przed propagacją.

- Out-of-gamut ma warning color + icon + tekst oraz nie zmienia automatycznie dokumentu bez decyzji użytkownika.

## Test matrix

- [ ] TM-001: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-002: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-003: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-004: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-005: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-006: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-007: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-008: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-009: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-010: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-011: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-012: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-013: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-014: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-015: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-016: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-017: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-018: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-019: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-020: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-021: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-022: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-023: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-024: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-025: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-026: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-027: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-028: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-029: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-030: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-031: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-032: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-033: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-034: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-035: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-036: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-037: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-038: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-039: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-040: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-041: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-042: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-043: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-044: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-045: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-046: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-047: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-048: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-049: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-050: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-051: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-052: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-053: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-054: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-055: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-056: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-057: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-058: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-059: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-060: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-061: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-062: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-063: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-064: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-065: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-066: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-067: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-068: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-069: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-070: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-071: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-072: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-073: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-074: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-075: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-076: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-077: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-078: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-079: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-080: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-081: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-082: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-083: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-084: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-085: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-086: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-087: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-088: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-089: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-090: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-091: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-092: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-093: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-094: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-095: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-096: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-097: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-098: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-099: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-100: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-101: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-102: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-103: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-104: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-105: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-106: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-107: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-108: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-109: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-110: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-111: Sprawdź none fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-112: Sprawdź RGB conversion dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-113: Sprawdź CMYK gamut dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-114: Sprawdź stroke join dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-115: Sprawdź dash pattern dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-116: Sprawdź linear gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-117: Sprawdź radial gradient dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-118: Sprawdź global color dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-119: Sprawdź blend mode dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.
- [ ] TM-120: Sprawdź solid fill dla Canvas, SVG, Undo/Redo, import/export, keyboard i Dark/Light.

## Definition of Done

- [ ] STYLE-001…041 są zaimplementowane lub etapowane z zachowaniem contracts.
- [ ] Styl jest command-based, serializowalny i renderer-independent.
- [ ] Canvas/SVG parity, palette/global-color propagation i blend modes mają regression coverage.
- [ ] UI spełnia tokens, accessibility, focus i explicit feedback.
- [ ] Testy geometry/style/SVG/E2E przechodzą w CI.

## Źródła

- `BACKLOG.md`: STYLE-001…041.
- `VECTORIA_ARCHITECTURE.md`: ObjectStyle, FillStyle, StrokeStyle, gradients, commands i SVG adapter.
- `DESIGN_SYSTEM.md`: ColorControl, Properties, tokens, feedback i accessibility.
