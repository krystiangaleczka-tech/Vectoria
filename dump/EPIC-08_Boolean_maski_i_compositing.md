# EPIC-08 Boolean, maski i compositing

## Metadane

- Task: `epic-08`
- Spec: `epics/EPIC-08_Boolean_maski_i_compositing.md`
- Data: 2026-08-24
- Tryb: DUMP-ONLY
- Status: fundament EPIC-08 dostarczony; część zaawansowana etapowana

## Stan Przed / Po

Przed implementacją repozytorium posiadało operacje geometrii EPIC-07, komendy undo/redo i wielokrotną selekcję, ale nie posiadało kontraktów Boolean, compound paths, masek ani isolate mode.

Po implementacji dostępne są kontrakty i komendy dla sześciu operacji Boolean, compound path, clipping/opacity mask, preview-first session oraz transient isolation service. UI Properties udostępnia akcje Boolean. Renderer obsługuje compound subpaths i fill rule.

## Implementacja

- Boolean normalizuje zamknięte obiekty do world-space paths bez mutacji źródeł.
- Operacje tworzą deterministyczne wyniki i ostrzeżenia dla pustego/niepoprawnego inputu.
- Apply wykonuje pojedynczą odwracalną komendę; nieudany preview zachowuje dokument.
- Compound path przechowuje `compoundChildren` i `fillRule`.
- Maski przechowują jawne `maskId`, `contentIds`, tryb oraz semantics opacity.
- Invariants wykrywają dangling mask targets i niepoprawne content references.
- Persistence schema przyjmuje nowe pola bez zmiany istniejących payloadów.
- Isolation context pozostaje poza React i ogranicza scope hit-test/editing.
- Properties pokazuje Boolean controls z accessible labels.
- Dodano testy Boolean, compound, mask i atomic failure.

## Walidacja

- `pnpm typecheck` — OK
- `pnpm test` — OK, 21 plików, 146 testów
- `pnpm lint` — OK
- `pnpm build` — OK
- `git diff --check` — OK

## Ograniczenia

- Boolean używa deterministycznej poligonizacji punktów; pełna operacja na krzywych Béziera wymaga dedykowanego algorytmu path clipping.
- Brak ukończonych Playwright workflows dla Boolean/mask/isolation.
- Brak pełnego SVG round-trip dla compound/mask metadata.
- Isolate mode ma kontrakt engine, ale nie ma jeszcze breadcrumb/status UI.

## Changes Per File

| Plik | Stan przed | Zmiana po | Cel |
|---|---|---|---|
| `packages/core/src/model/types.ts` | Brak Boolean/mask/compound kontraktów | Dodano `BooleanOperation`, `BooleanPreview`, `MaskGroup`, compound metadata | Stabilny kontrakt domenowy |
| `packages/core/src/geometry/boolean.ts` | Brak Boolean geometry | Dodano normalizację world-space, preview i operacje Boolean | Domain geometry bez bitmapy |
| `packages/core/src/commands/boolean.ts` | Brak komend Boolean/mask | Dodano `BooleanCommand`, `CompoundPathCommand`, `MaskCommand` | Atomiczne Apply i undo/redo |
| `packages/core/src/commands/index.ts` | Brak eksportów EPIC-08 | Wyeksportowano nowe komendy | Publiczne API core |
| `packages/core/src/index.ts` | Brak eksportu Boolean geometry | Wyeksportowano Boolean API | Publiczne API core |
| `packages/core/src/model/invariants.ts` | Brak walidacji masek | Dodano dangling target/content checks | Integralność dokumentu |
| `packages/core/test/epic-08-boolean.test.ts` | Brak testów EPIC-08 | Dodano testy Boolean, compound, mask i rejection | Regresja domeny |
| `packages/editor-engine/src/operations/boolean-session.ts` | Brak Boolean session | Dodano preview/apply/cancel dla Boolean, compound i mask | Preview-first engine |
| `packages/editor-engine/src/isolation/isolation-service.ts` | Brak isolate context | Dodano transient stack, breadcrumb i scope checks | Isolate mode poza React |
| `packages/editor-engine/src/index.ts` | Brak eksportów engine EPIC-08 | Wyeksportowano sessions i isolation | Publiczne API engine |
| `packages/io/src/schema/document-v1.ts` | Schema nie znała compound/mask | Dodano opcjonalne pola i mask schema | Bezpieczna persistence |
| `packages/renderer/src/index.ts` | Renderer rysował pojedynczy subpath | Dodano compound subpaths i fill rule | Renderowanie holes |
| `apps/web/src/features/properties/GeometryProperties.tsx` | Properties nie miało Boolean controls | Dodano Boolean action group i Compound button | Dostępne UI EPIC-08 |
| `apps/web/src/app/EditorApp.tsx` | App obsługiwał tylko EPIC-07 sessions | Podłączono BooleanOperationSession i preview mapping | Integracja UI → engine |

## Następny Bezpieczny Krok

Zastąpić poligonizację pełnym clippingiem krzywych, następnie dodać Playwright coverage, SVG round-trip oraz breadcrumb/status UI dla isolate mode.
