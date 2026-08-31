# ADR 009 — Architektura Live Effects (EPIC-13)

Data: 2026-08-29 · Status: Accepted

## Kontekst

EPIC-13 wprowadza efekty i appearance. Kontrakt bazowy istniał w `core/src/model/types.ts`
(`ObjectStyle.effects: readonly LiveEffect[]`, typy dropShadow/blur/roundedCorners/svgFilter),
ale nie miał renderu, eksportu, komend ani UI.

## Decyzje

### 1. Klasyfikacja efektów

| Klasa | Typy | Mechanizm |
|---|---|---|
| Rastrowe | dropShadow, blur, innerShadow, glow, svgFilter(colorMatrix, turbulence) | offscreen canvas composite; SVG `<filter>` |
| Geometryczne | roundedCorners, distort, envelope, perspective | transformacja geometrii przed rysowaniem/eksportem (core, czyste funkcje) |
| Instancyjne (repeat) | radialRepeat, mirrorRepeat, gridRepeat | transformowane kopie na poziomie scene; expand materializuje |
| Wolumetryczne | extrude | kopie offsetowe z cieniowaniem (pseudo-3D, jawnie ograniczone) |

### 2. Kolejność aplikowania

`style.effects` w kolejności tablicy. Geometryczne i instancyjne działają przed rastrowymi
(geometria → kopie → raster chain). SVG eksport zachowuje tę samą kolejność w `<filter>`.

### 3. Jakość renderu (PERF-031-037)

`quality === 'interactive'` → efekty rastrowe pomijane; `final` → pełne. Overlay/hit-test
nigdy nie używa efektów.

### 4. Hit-test

Bazuje na bazowej geometrii obiektu. Efekty są wizualne i nie powiększają obszaru klikalnego
(FX-001). Culling: raster margin liczony z parametrów efektów.

### 5. Ograniczenia (jawne)

- **Mesh (FX-021)**: tylko mesh gradient 3×3 kolorów, render triangulacją, SVG flatten do
  polygonów. Brak mesh warp.
- **Brushes artystyczne/pattern (FX-017/018)**: render canvas przez stemple arc-length;
  SVG eksport uproszczony (pełny eksport stempli poza zakresem MVP epiku).
- **Expand (FX-029)**: tylko efekty geometryczne i instancyjne; rastrowe nie mają
  reprezentacji wektorowej — Expand zablokowany w UI.
- **Turbulence (FX-007)**: SVG pełny; Canvas pomijany (brak natywnego odpowiednika).
- Hit-test nie podąża za efektami geometrycznymi w tym迭代 (baza geometrii).

### 6. Kompatybilność

Schema pozostaje v1; wszystkie nowe pola opcjonalne. Reader v1 bez `effects` działa bez zmian.
`visible` na efekcie = toggle FX-028 (brak nowego pola `enabled`).
