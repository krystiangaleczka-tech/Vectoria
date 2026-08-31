# EPIC-13 — Efekty i appearance (FX-001..FX-029)

## Metadane

- Data: 2026-08-29
- Zakres: EPIC-13, taski FX-001..FX-029
- Status: **PARTIAL** — 25/29 DONE, 4 PARTIAL (FX-017, FX-018, FX-021, FX-023 — ograniczenia w ADR_009)
- ADR: `ADR_009_Live_Effects_Architecture.md` (NEW)
- Quality gates: `pnpm typecheck` 0 errors · `pnpm lint` 0 · `pnpm test` 317 passed (25 nowych) · `pnpm build` OK

## Stan przed

Kontrakt `LiveEffect` istniał tylko w typach (`core/src/model/types.ts`): dropShadow/blur/roundedCorners/svgFilter, pole `ObjectStyle.effects` — bez renderu, eksportu, komend, walidacji i UI. BlendMode 4 wartości. Stroke align bez wizualnego eksportu SVG (tylko atrybut `data-`). Schema v1 bez `effects`. Brak Appearance Panel.

## Stan po

Pełny pipeline live effects: model (9 nowych typów efektów + 8 fillów/brushów) → komendy z Undo/Redo → invariants → schema v1 (backward-compatible) → render Canvas (offscreen composite, quality policy PERF-032) → eksport SVG (filter chain, clip/mask, patternTransform, kopie instancji) → Appearance Panel w RightDock (stos, DnD reorder, toggle, expand).

## Implementacja

| Klasa efektu | Mechanizm |
|---|---|
| Rastrowe (dropShadow, blur, innerShadow, glow, svgFilter, extrude) | offscreen canvas composite w `renderer/src/effects.ts`; SVG `<filter>` chain |
| Geometryczne (roundedCorners, distort, envelope, perspective) | czyste funkcje w `core/src/geometry/effects.ts`; bake przed rysowaniem i eksportem |
| Instancyjne (radial/mirror/gridRepeat) | transformowane kopie; koniugacja W = M·I·M⁻¹ w eksporcie |
| Pędzle (caligraphic/stamp/pattern) | kaligraficzny = generowany outline; stemple = arc-length sampling |

Kolejność aplikowania = kolejność tablicy `style.effects` (FX-010). `quality === 'interactive'` pomija efekty rastrowe. Hit-test na bazowej geometrii; culling z marginesem z parametrów efektów.

## Walidacja

- core: `test/effects.test.ts` — komendy (add/update/reorder/toggle/remove z pełnym undo), expand (bake + materializacja repeatów do grupy), invariants (invalid params), geometria (perspective/envelope/zigzag/repeaty/kaligrafia)
- io: `test/effects-export.test.ts` — feDropShadow/feGaussianBlur/innerShadow chain, mix-blend-mode, patternTransform, texture, mesh fallback, kopie repeat, clipPath align, kaligrafia, schema round-trip z effects
- renderer: 3/3 (istniejące)

## Ograniczenia (udokumentowane w ADR_009)

1. FX-017/018: stemple — SVG eksport uproszczony do kropek; benchmark FPS (PERF-073) nieuruchomiony.
2. FX-021: mesh tylko gradient 3×3; SVG = kolor średni; bez mesh warp.
3. FX-023: extrude pikselowy (kopie z cieniowaniem), nie geometria bevelu.
4. Turbulence bez renderu Canvas (brak natywnego odpowiednika).
5. Efekty dzieci w grupach bez composite pipeline (tylko top-level).
6. Hit-test nie podąża za efektami geometrycznymi.
7. Expand dla efektów rastrowych zablokowany w UI (brak reprezentacji wektorowej).

## Następny bezpieczny krok

Manualna weryfikacja wizualna `pnpm dev` (środowisko testowe nie ma Canvas API), ewentualnie benchmark FX-017 (PERF-073) i E2E Appearance Panel.

## Changes Per File

| Plik | Stan przed | Zmiana po | Cel |
|---|---|---|---|
| `ADR_009_Live_Effects_Architecture.md` | — (NEW) | ADR: klasyfikacja efektów, kolejność, jakość, ograniczenia | Wymagany ADR dla zmiany kontraktu domenowego |
| `packages/core/src/model/types.ts` | 4 typy LiveEffect, BlendMode ×4, PatternFill bez transform | +9 typów efektów (innerShadow, glow, distort, envelope, perspective, extrude, 3× repeat), BlendMode ×16 + `BLEND_MODES`, `PatternTransform`, `TextureFill`, `MeshGradientFill`, `BrushProfile` na PathObject | Kontrakt domenowy FX-011..026 |
| `packages/core/src/geometry/effects.ts` | — (NEW) | samplePath/arc-length, roundedCorners, zigzag/roughen/pucker, envelope bilinear, homografia perspective, transformy repeatów, kaligraficzny outline, `effectiveGeometry` | Czysta geometria efektów, wspólna dla renderer+export |
| `packages/core/src/model/invariants.ts` | brak walidacji efektów, blend ×4 | `validateLiveEffects` (limity count/steps/amplitude/quads), blend z `BLEND_MODES` | Invariants dokumentu |
| `packages/core/src/commands/effect-commands.ts` | — (NEW) | Add/Update/Remove/Reorder/Toggle (EffectStackCommand, skip locked) + `ExpandLiveEffectCommand` (bake + materializacja do grupy + layer rewire, pełne undo) | Wszystkie mutacje przez Command |
| `packages/core/src/commands/index.ts` | eksport bez efektów | +6 eksportów komend | API pakietu |
| `packages/core/src/commands/document-commands.ts` | normalizeFill bez texture/mesh | early-return dla texture/mesh-gradient | Normalizacja nowych fillów |
| `packages/core/src/commands/style-commands.ts` | replaceStyleColors bez texture/mesh | guard `'stops' in fill` + fallback | Global color propagation nie wywala się na nowych fillach |
| `packages/core/src/index.ts` | bez geometry/effects | `export * from './geometry/effects.js'` | API pakietu |
| `packages/io/src/schema/document-v1.ts` | ObjectStyleSchema bez effects, blend ×4, PathObject bez brush | LiveEffectSchema (13 wariantów), `effects` optional, blend ×16, PatternTransform/Texture/Mesh/Brush schemas, helper schemas | Persistence backward-compatible (schemaVersion 1) |
| `packages/io/src/svg/export.ts` | brak efektów; align jako data-attr | wrapper `renderSceneObjectToSvg`: bake geometrii, brush render, align clip/mask, kopie instancji (koniugacja macierzowa), filter chain (feDropShadow/feGaussianBlur/inner shadow recipe/feFlood/feColorMatrix/feTurbulence), patternTransform, texture pattern, mesh avg | Eksport zgodny z renderem Canvas |
| `packages/renderer/src/effects.ts` | — (NEW) | `drawObjectWithEffects` (offscreen bounded 8k/16MP guard, chain w kolejności stosu, device-space composite), repeatInstances, extrude copies, mesh tile cache | Raster pipeline + quality policy |
| `packages/renderer/src/index.ts` | bez efektów; blend bez walidacji | integracja: culling z marginesem, bake geometrii, repeaty/extrude, brush w renderPath, texture/mesh w resolveFill, blend przez BLEND_MODES, outlineMode zeruje effects | Render FX-001..026 |
| `apps/web/src/features/panels/AppearancePanel.tsx` | — (NEW) | Panel: fill/stroke/align/dash/opacity/blend + stos efektów (toggle, params, DnD+strzałki, add/remove, expand z confirm) | FX-003/004/006/007/008/009/010/013/028/029 UI |
| `apps/web/src/features/panels/RightDock.tsx` | 9 paneli | +`appearance` tab, props on*Effect, sekcja renderu | Integracja panelu |
| `apps/web/src/app/EditorApp.tsx` | brak handlerów efektów | 6 handlerów (Add/Update/Remove/Reorder/Toggle/Expand → komendy na selectedObjectIds) | Wiring przez dispatcher |
| `apps/web/src/app/editor.css` | brak stylów appearance | ~30 reguł wyłącznie na tokenach (`--color-*`, `--radius-sm`, `--font-mono`) | DESIGN_SYSTEM compliance |
| `packages/core/test/effects.test.ts` | — (NEW) | 15 testów | Semantyka komend/geometrii/invariants |
| `packages/io/test/effects-export.test.ts` | — (NEW) | 10 testów | Eksport + round-trip |

## Zmiany zastane (pre-existing, przed sesją)

Niezweryfikowane — `git status` uruchomiono dopiero po implementacji. Cały diff odpowiada zakresowi EPIC-13 (lista plików pokrywa się 1:1 z sekcją Changes Per File); jeśli przed sesją istniały niezatwierdzone zmiany w tych plikach, są włączone w ten commit.
