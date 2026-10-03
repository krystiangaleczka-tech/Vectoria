# AI_CDR_COMPATIBILITY_MATRIX.md

> Status: **Initial target matrix**  
> Data: 2026-09-16  
> Strategia: `FORMAT_STRATEGY_AI_CDR.md`  
> Backlog: `AI_CDR_IMPORT_BACKLOG.md`

## Jak czytać macierz

Statusy:

- **E** — native editable: Vectoria ma lub ma otrzymać natywny model i edycję;
- **P** — preserved appearance: wygląd musi zostać zachowany, nawet jeśli semantyka nie jest jeszcze natywna;
- **S** — simplified: świadoma, raportowana konwersja stratna;
- **U** — unsupported: jawny brak obsługi, bez cichego pomijania;
- **R** — research/spike required.

`Target` oznacza oczekiwany wynik docelowy, nie stan obecnego kodu.

---

## PDF

| Feature | Stan obecny | Target | Uwagi / test gate |
|---|---|---:|---|
| strony/page count | częściowy | E | poprawne page boxes, rotation i kolejność |
| paths: move/line/cubic | częściowy | E | geometry golden tests |
| compound paths | ograniczony | E | fill rule + subpaths |
| fill/stroke | częściowy | E | opacity i stroke params |
| affine transforms | częściowy | E | matrix nesting |
| clipping path | brak/skip | E | obowiązkowy corpus |
| text basic | częściowy | E/P | zależy od font/glyph mapping |
| embedded font | brak pełnego modelu | E/P | preserve glyph appearance, jeśli semantyka niepewna |
| subset font | brak pełnego modelu | P/E | bez silent font substitution |
| missing font | obecnie ryzyko fallback | P | jawny `missing-font` |
| per-glyph positioning | ograniczony | E/P | porównanie reference render |
| rotated/skewed text | ograniczony | E/P | matrix fidelity |
| image XObject | skip/niepełne | E | embedded image + mask |
| image mask | brak | E/P | soft/image mask tests |
| gradient/shading | skip | E/P | linear/radial jako E, inne minimum P |
| mesh/shading complex | brak | P/E | zależne od modelu mesh |
| tiling pattern | brak | P/E | pattern transform |
| opacity | częściowy | E | object/group opacity |
| blend modes | brak parsera | E/P | wszystkie tryby renderera + fallback |
| transparency group | brak | E/P | isolation/knockout |
| soft mask | brak | E/P | alpha/luminosity |
| DeviceGray | częściowy | E | zachować source color w IR |
| DeviceRGB | częściowy | E | bez strat |
| DeviceCMYK | obecnie konwersja RGB | E/S | docelowo color model; do tego czasu S |
| Lab | brak | E/S | wymaga color ADR |
| ICCBased | brak | E/S | profile reference |
| Separation/spot | brak | E/P | nie redukować po cichu |
| annotations/widgets | poza core import | U/R | decyzja produktowa osobno |
| metadata/title | częściowy | E | bez wpływu na scene fidelity |
| corrupted PDF | częściowe błędy | U | kontrolowany error, zero mutation |

---

## Adobe Illustrator `.ai`

### PDF-compatible path

| Feature | Target | Uwagi |
|---|---:|---|
| PDF-compatible payload detection | E | bez założenia, że payload = pełna semantyka AI |
| paths/basic paint | E | przez zatwierdzony PDF engine |
| layers | E/P | zależy od danych dostępnych w PDF/native path |
| artboards | E/P | native Adobe path preferowany, jeśli PDF nie zachowuje danych |
| clipping | E | przez PDF engine |
| transparency | E/P | jak PDF |
| text | E/P | jak PDF + font policy |
| gradients | E/P | jak PDF |
| images | E | jak PDF |
| Illustrator live effects | P | native Adobe extractor może rozszerzać E |
| appearance stack | P | nie zgadywać |
| symbols | P/E | native Adobe path |
| brushes | P/E | native Adobe path / future domain model |
| envelope/distort | P/E | jeśli Vectoria ma równoważny live effect i fidelity test przechodzi |
| perspective/extrude | P/E | jw. |
| mesh | P/E | native mapping po testach |
| linked assets | P/E | wymagany resolver policy |
| spot colors | P/E | color model |
| Illustrator-only metadata | P/U | zachować tylko dane potrzebne do fidelity/remap |

### Adobe native high-fidelity path

| Feature | Target | Gate |
|---|---:|---|
| otwarcie `.ai` przez Illustrator API | R | feasibility + credentials + terms |
| custom `script.jsx` | R | public beta risk |
| export normalized manifest | R -> E | schema validation |
| source object IDs/types | R -> E | potrzebne do report/remap |
| reference rendition | R -> E | obowiązkowy diff |
| assets extraction | R -> E | limity + security |
| cloud privacy consent | R -> E | zero silent upload |

### AI bez PDF-compatible data

| Stan | Zachowanie |
|---|---|
| native Adobe path niedostępny | jawny unsupported z instrukcją ponownego zapisu albo użycia innej ścieżki |
| native Adobe path dostępny i user zgadza się na cloud | native extractor + reference verification |
| user wymaga local-only | brak fałszywego częściowego importu |

---

## CorelDRAW `.cdr`

### libcdr path

| Feature | Target | Uwagi |
|---|---:|---|
| rozpoznanie wersji/kontenera | E | `CDRDocument::isSupported`/parser |
| basic curves | E | custom RVNGDrawingInterface |
| rectangle/ellipse/polygon | E | mapować jako primitive lub path zależnie od danych |
| groups | E | hierarchy |
| layers/pages | E/P | zależy od danych parsera i modelu |
| text | E/P | font policy |
| uniform fill | E | zachować color source |
| outline/stroke | E | width/cap/join/dash |
| fountain/gradient fill | E/P | fidelity tests |
| bitmap | E | embedded/link policy |
| PowerClip | E/P | mapować do clip/mask jeśli semantyka dostępna |
| transparency | E/P | compositing model |
| mesh fill | P/E | zależne od parser data + model mesh |
| blend group | P/E | native Corel bridge może dostarczyć semantykę |
| extrude | P/E | native effect lub preserved |
| contour | P/E | native mapping tylko przy exact fidelity |
| bevel | P/E | preserved do czasu natywnego efektu |
| drop shadow group | E/P | jeśli parametry mapują się 1:1, E |
| artistic media | P/E | brush model może dać E dla subsetu |
| custom effect | P | nie flattenować bez reportu |
| symbols | P/E | wymaga source semantics |
| spot/CMYK | E/P | color model |
| linked content/OLE | U/P | security/product decision |
| macros | U | nigdy nie wykonywać podczas importu |

### Native Corel bridge

| Feature | Target | Gate |
|---|---:|---|
| `OpenDocument` | R -> E | deployment/licensing |
| enumerate page shapes | R -> E | Corel object model |
| recursive shape hierarchy | R -> E | stable source IDs/names |
| text/fill/outline extraction | R -> E | manifest schema |
| complex effect type discovery | R -> E/P | per-feature mapping |
| `PublishToPDF` reference | R -> E | reference fidelity setup |
| isolated Windows worker | R | crash/temp/session handling |
| concurrent jobs | R | license + reliability |

---

## Vectoria model gaps wymagające decyzji

| Obszar | Obecny model | Potrzebna zmiana |
|---|---|---|
| ImportIR | placeholder `type: string` | discriminated ImportIR v2 |
| preserved appearance | brak dedykowanego typu | ADR + `ForeignAppearanceObject` lub równoważny kontrakt |
| color | głównie string/hex w fill/stroke | source-aware RGB/CMYK/Lab/ICC/spot model lub warstwa color resource |
| fonts | family/weight/style + runs | source font identity, embedding/subset/dependency metadata |
| group compositing | częściowo style/masks | isolation/knockout/transparency group semantics |
| patterns | ograniczony natywny pattern set | generic imported pattern/tiling representation lub preserved |
| shadings | podstawowe gradienty + mesh model | generic import shading mapping/fallback |
| source attachment | brak jednolitego modelu | bezpieczne metadata/source payload dla remap |
| fidelity status | editable/simplified/flattened/unsupported | dodać `preserved` + visual verification |

---

## Reference test packs

### Pack A — geometry

- line/curve/path;
- multiple subpaths;
- compound path;
- even-odd/nonzero;
- nested transforms;
- negative scale;
- rotated page/artboard.

### Pack B — compositing

- clipping;
- opacity mask alpha;
- opacity mask luminance;
- nested masks;
- object opacity;
- group opacity;
- multiply/screen/overlay/difference;
- isolated group;
- knockout group.

### Pack C — paint

- RGB solid;
- CMYK solid;
- Lab;
- ICC;
- spot/separation;
- linear/radial gradient;
- mesh;
- tiling pattern;
- image/texture.

### Pack D — typography

- embedded font;
- subset font;
- missing font;
- kerning;
- letter spacing;
- multi-run;
- rotated/skewed text;
- text on path;
- variable font;
- ligatures;
- RTL/vertical writing jako research case.

### Pack E — images/assets

- JPEG/PNG embedded;
- alpha image;
- image mask;
- linked image available;
- linked image missing;
- huge image;
- image with ICC profile.

### Pack F — AI-specific

- artboards;
- Illustrator layers;
- symbols;
- brushes;
- live effects;
- appearance stack;
- clipping groups;
- mesh;
- envelope/perspective/extrude;
- PDF-compatible on/off.

### Pack G — CDR-specific

- old RIFF versions;
- modern CDR versions;
- PowerClip;
- fountain fill;
- mesh;
- contour;
- blend;
- extrude;
- bevel;
- drop shadow;
- artistic media;
- custom effect;
- multi-page.

### Pack H — robustness

- truncated file;
- malformed object stream;
- decompression bomb candidate;
- excessive path nodes;
- excessive pages;
- cyclic/recursive structures;
- NaN/Infinity-like numeric corruption;
- invalid image dimensions;
- external URLs/macros/scripts.

---

## Release gates

### Gate 1 — experimental

Format może wejść jako experimental, gdy:

- parser jest sandboxed/worker-based;
- brak cichej utraty danych;
- crash corpus przechodzi;
- raport działa;
- reference render istnieje dla głównych przypadków.

### Gate 2 — beta high-fidelity

- >= 90% zatwierdzonego reprezentatywnego corpus przechodzi visual threshold;
- pozostałe przypadki kończą się `preserved` albo jawnym warningiem;
- brak znanych silent corruption cases;
- font/asset dependency warnings działają;
- telemetry/test logs rozróżniają parser fail od mapping fail.

Wartość 90% jest tylko proponowanym gate'em startowym i ma zostać potwierdzona po zbudowaniu corpus. Nie jest deklaracją kompatybilności produktu.

### Gate 3 — stable

- zatwierdzony corpus obejmuje realne pliki klientów/testowe z wielu wersji;
- visual regression jest blocking CI;
- brak P0/P1 fidelity bugs;
- licencje engine/native bridges są zatwierdzone;
- privacy/security review zakończony;
- performance budgets przechodzą;
- dokumentacja UI opisuje rzeczywisty zakres.

---

## Najważniejsza zasada macierzy

Jeżeli Vectoria nie umie jeszcze edytować konstrukcji źródłowej, właściwym wynikiem jest **P — preserved appearance**, a nie przybliżony obiekt oznaczony jako `editable`.
