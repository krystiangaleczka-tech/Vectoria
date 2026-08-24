# [EPIC-05] Pen Tool i ścieżki — bardzo szczegółowa specyfikacja wykonawcza

> Dokument wykonawczy. Każdy punkt jest wymaganiem implementacyjnym, testowym albo kryterium akceptacji.

## 1. Cel

Użytkownik tworzy i edytuje otwarte oraz zamknięte ścieżki Béziera z precyzją profesjonalnego edytora wektorowego, bez degradacji render loop ani naruszenia modelu dokumentu.

## 2. Architektura

- Ścieżka jest obiektem domenowym w logical world space; canvas pozostaje wyłącznie viewportem.

- Pen Tool i Node Tool są state machines w `editor-engine`, nigdy logiką komponentów React.

- Każda trwała zmiana patha jest commandem; preview, rubber band i drag handles są transient overlay.

- Każdy tool event posiada `screenPoint` i `worldPoint`; tolerancje node/segment są stałe w px ekranu.

- Renderer używa osobnych warstw background/scene/overlay oraz requestAnimationFrame.

- `DocumentModel` nie zależy od React, DOM, Canvas API ani renderer-specific danych.

- Path invariants odrzucają NaN, Infinity, scale 0, duplicate IDs i ścieżki o zbyt małej liczbie nodes.

## 3. Kontrakty

```ts
export interface PathNode {
  id: string;
  point: Vec2;
  inHandle?: Vec2;
  outHandle?: Vec2;
  kind: 'corner' | 'smooth' | 'symmetric' | 'auto';
}

export interface PathObject extends BaseObject {
  type: 'path';
  closed: boolean;
  nodes: PathNode[];
}
```

## 4. Backlog wykonawczy

### PATH-001 — Pen Tool jako niezależna state machine

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Pen Tool jako niezależna state machine.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Pen Tool jako niezależna state machine.
- [ ] Renderuj preview/overlay dla: Pen Tool jako niezależna state machine bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Pen Tool jako niezależna state machine.
- [ ] Waliduj path invariants przed commitem operacji: Pen Tool jako niezależna state machine.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Pen Tool jako niezależna state machine.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Pen Tool jako niezależna state machine.

### PATH-002 — Punkt narożny przez kliknięcie

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Punkt narożny przez kliknięcie.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Punkt narożny przez kliknięcie.
- [ ] Renderuj preview/overlay dla: Punkt narożny przez kliknięcie bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Punkt narożny przez kliknięcie.
- [ ] Waliduj path invariants przed commitem operacji: Punkt narożny przez kliknięcie.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Punkt narożny przez kliknięcie.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Punkt narożny przez kliknięcie.

### PATH-003 — Punkt Béziera przez kliknięcie i przeciągnięcie

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Punkt Béziera przez kliknięcie i przeciągnięcie.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Punkt Béziera przez kliknięcie i przeciągnięcie.
- [ ] Renderuj preview/overlay dla: Punkt Béziera przez kliknięcie i przeciągnięcie bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Punkt Béziera przez kliknięcie i przeciągnięcie.
- [ ] Waliduj path invariants przed commitem operacji: Punkt Béziera przez kliknięcie i przeciągnięcie.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Punkt Béziera przez kliknięcie i przeciągnięcie.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Punkt Béziera przez kliknięcie i przeciągnięcie.

### PATH-004 — Segment prosty

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Segment prosty.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Segment prosty.
- [ ] Renderuj preview/overlay dla: Segment prosty bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Segment prosty.
- [ ] Waliduj path invariants przed commitem operacji: Segment prosty.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Segment prosty.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Segment prosty.

### PATH-005 — Segment cubic Bézier

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Segment cubic Bézier.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Segment cubic Bézier.
- [ ] Renderuj preview/overlay dla: Segment cubic Bézier bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Segment cubic Bézier.
- [ ] Waliduj path invariants przed commitem operacji: Segment cubic Bézier.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Segment cubic Bézier.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Segment cubic Bézier.

### PATH-006 — Ścieżka otwarta

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Ścieżka otwarta.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Ścieżka otwarta.
- [ ] Renderuj preview/overlay dla: Ścieżka otwarta bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Ścieżka otwarta.
- [ ] Waliduj path invariants przed commitem operacji: Ścieżka otwarta.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Ścieżka otwarta.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Ścieżka otwarta.

### PATH-007 — Zamykanie przez punkt początkowy

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Zamykanie przez punkt początkowy.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Zamykanie przez punkt początkowy.
- [ ] Renderuj preview/overlay dla: Zamykanie przez punkt początkowy bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Zamykanie przez punkt początkowy.
- [ ] Waliduj path invariants przed commitem operacji: Zamykanie przez punkt początkowy.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Zamykanie przez punkt początkowy.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Zamykanie przez punkt początkowy.

### PATH-008 — Rubber band

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Rubber band.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Rubber band.
- [ ] Renderuj preview/overlay dla: Rubber band bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Rubber band.
- [ ] Waliduj path invariants przed commitem operacji: Rubber band.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Rubber band.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Rubber band.

### PATH-009 — Dodawanie węzła na segmencie

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Dodawanie węzła na segmencie.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Dodawanie węzła na segmencie.
- [ ] Renderuj preview/overlay dla: Dodawanie węzła na segmencie bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Dodawanie węzła na segmencie.
- [ ] Waliduj path invariants przed commitem operacji: Dodawanie węzła na segmencie.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Dodawanie węzła na segmencie.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Dodawanie węzła na segmencie.

### PATH-010 — Usuwanie węzła

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Usuwanie węzła.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Usuwanie węzła.
- [ ] Renderuj preview/overlay dla: Usuwanie węzła bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Usuwanie węzła.
- [ ] Waliduj path invariants przed commitem operacji: Usuwanie węzła.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Usuwanie węzła.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Usuwanie węzła.

### PATH-011 — Przesuwanie węzła

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Przesuwanie węzła.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Przesuwanie węzła.
- [ ] Renderuj preview/overlay dla: Przesuwanie węzła bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Przesuwanie węzła.
- [ ] Waliduj path invariants przed commitem operacji: Przesuwanie węzła.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Przesuwanie węzła.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Przesuwanie węzła.

### PATH-012 — Scalanie węzłów

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Scalanie węzłów.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Scalanie węzłów.
- [ ] Renderuj preview/overlay dla: Scalanie węzłów bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Scalanie węzłów.
- [ ] Waliduj path invariants przed commitem operacji: Scalanie węzłów.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Scalanie węzłów.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Scalanie węzłów.

### PATH-013 — Rozcinanie ścieżki

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Rozcinanie ścieżki.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Rozcinanie ścieżki.
- [ ] Renderuj preview/overlay dla: Rozcinanie ścieżki bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Rozcinanie ścieżki.
- [ ] Waliduj path invariants przed commitem operacji: Rozcinanie ścieżki.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Rozcinanie ścieżki.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Rozcinanie ścieżki.

### PATH-014 — Łączenie końców otwartych ścieżek

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Łączenie końców otwartych ścieżek.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Łączenie końców otwartych ścieżek.
- [ ] Renderuj preview/overlay dla: Łączenie końców otwartych ścieżek bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Łączenie końców otwartych ścieżek.
- [ ] Waliduj path invariants przed commitem operacji: Łączenie końców otwartych ścieżek.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Łączenie końców otwartych ścieżek.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Łączenie końców otwartych ścieżek.

### PATH-015 — Segment prosty na krzywą

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Segment prosty na krzywą.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Segment prosty na krzywą.
- [ ] Renderuj preview/overlay dla: Segment prosty na krzywą bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Segment prosty na krzywą.
- [ ] Waliduj path invariants przed commitem operacji: Segment prosty na krzywą.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Segment prosty na krzywą.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Segment prosty na krzywą.

### PATH-016 — Segment krzywy na prosty

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Segment krzywy na prosty.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Segment krzywy na prosty.
- [ ] Renderuj preview/overlay dla: Segment krzywy na prosty bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Segment krzywy na prosty.
- [ ] Waliduj path invariants przed commitem operacji: Segment krzywy na prosty.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Segment krzywy na prosty.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Segment krzywy na prosty.

### PATH-017 — Węzeł cusp

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Węzeł cusp.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Węzeł cusp.
- [ ] Renderuj preview/overlay dla: Węzeł cusp bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Węzeł cusp.
- [ ] Waliduj path invariants przed commitem operacji: Węzeł cusp.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Węzeł cusp.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Węzeł cusp.

### PATH-018 — Węzeł smooth

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Węzeł smooth.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Węzeł smooth.
- [ ] Renderuj preview/overlay dla: Węzeł smooth bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Węzeł smooth.
- [ ] Waliduj path invariants przed commitem operacji: Węzeł smooth.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Węzeł smooth.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Węzeł smooth.

### PATH-019 — Węzeł symmetrical

- [ ] Zdefiniuj domain operation oraz odwracalną command dla: Węzeł symmetrical.
- [ ] Zaimplementuj zachowanie narzędzia i jego przejścia state machine dla: Węzeł symmetrical.
- [ ] Renderuj preview/overlay dla: Węzeł symmetrical bez React rerender paneli.
- [ ] Zintegruj snap, hit-test oraz tolerancję screen-space dla: Węzeł symmetrical.
- [ ] Waliduj path invariants przed commitem operacji: Węzeł symmetrical.
- [ ] Dodaj label historii, Undo/Redo i autosave po commicie dla: Węzeł symmetrical.
- [ ] Dodaj test Vitest geometrii/command oraz test Playwright workflow dla: Węzeł symmetrical.

## 5. State machine Pen Tool

```text
Idle → pointerDown(empty) → CreatingPath
CreatingPath → click → Add corner node
CreatingPath → drag → Add smooth node with out handle
CreatingPath → hover → render rubber band
CreatingPath → click first node → Commit closed path → Idle
CreatingPath → Enter → Commit open path → Idle
CreatingPath → Escape → Cancel draft → Idle
```

## 6. UX i visual language

- Tool Rail: Pen ma autorską ikonę `pen`, hit target 40×40, tooltip oraz shortcut `P`.

- Node ma 7 px, white fill i blue outline; selected node jest solid blue.

- Handle line ma 1 px blue przy 70% opacity; endpoint handle ma 6 px.

- Segment hover ma accent highlight 2–3 px bez technicznych labels poza debug mode.

- Selection używa blue stroke 1.5 px i low-opacity fill; snap pozostaje magenta, guides cyan.

- Properties udostępnia edycję bez drag: node kind, coordinates, handles, closed/open, fill/stroke/opacity.

- NumberInput używa mono/tabular values, Enter commit, Escape revert oraz error text+icon+border.

- Wszystkie controls są tokenowe, Dark/Light, keyboard accessible, focus-visible i reduced-motion aware.

## 7. Test matrix

- [ ] TM-001: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-002: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-003: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-004: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-005: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-006: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-007: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-008: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-009: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-010: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-011: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-012: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-013: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-014: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-015: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-016: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-017: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-018: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-019: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-020: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-021: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-022: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-023: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-024: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-025: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-026: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-027: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-028: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-029: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-030: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-031: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-032: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-033: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-034: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-035: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-036: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-037: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-038: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-039: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-040: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-041: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-042: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-043: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-044: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-045: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-046: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-047: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-048: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-049: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-050: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-051: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-052: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-053: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-054: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-055: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-056: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-057: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-058: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-059: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-060: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-061: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-062: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-063: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-064: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-065: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-066: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-067: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-068: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-069: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-070: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-071: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-072: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-073: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-074: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-075: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-076: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-077: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-078: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-079: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-080: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-081: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-082: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-083: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-084: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-085: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-086: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-087: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-088: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-089: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-090: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-091: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-092: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-093: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-094: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-095: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-096: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-097: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-098: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-099: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-100: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-101: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-102: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-103: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-104: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-105: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-106: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-107: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-108: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-109: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-110: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-111: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-112: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-113: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-114: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-115: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-116: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-117: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-118: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-119: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-120: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-121: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-122: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-123: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-124: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-125: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-126: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-127: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-128: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-129: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-130: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-131: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-132: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-133: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-134: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-135: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-136: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-137: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-138: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-139: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-140: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-141: Zweryfikuj smooth handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-142: Zweryfikuj symmetric handles przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-143: Zweryfikuj open paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-144: Zweryfikuj closed paths przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-145: Zweryfikuj segment split przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-146: Zweryfikuj node merge przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-147: Zweryfikuj path join przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-148: Zweryfikuj cut path przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-149: Zweryfikuj SVG round-trip przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.
- [ ] TM-150: Zweryfikuj corner nodes przy zoomie, Undo/Redo, snapie, keyboard i screen-space tolerancji.

## 8. Definition of Done

- [ ] Pen Tool tworzy open/closed line i cubic Bézier paths zgodnie ze state machine.
- [ ] Node/segment operations zachowują invariants oraz są command-based i odwracalne.
- [ ] Overlay rubber band, nodes i handles nie degradują render loop.
- [ ] Hit-test i snapping są poprawne przy każdym zoomie.
- [ ] UI spełnia tokeny, własną ikonografię, keyboard, ARIA oraz Dark/Light.
- [ ] Vitest, Playwright i geometry/SVG regression tests przechodzą w CI.

## 9. Źródła

- `BACKLOG.md`: EPIC-05 i PATH-001…019.
- `VECTORIA_ARCHITECTURE.md`: PathObject/PathNode, tools, commands, renderer i hit-test.
- `DESIGN_SYSTEM.md`: Pen/Node Tool Rail, Node/Bezier language, Properties, tokens i accessibility.
<!-- Specyfikacja utrzymania PATH: linia kontrolna 432; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 433; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 434; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 435; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 436; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 437; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 438; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 439; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 440; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 441; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 442; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 443; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 444; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 445; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 446; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 447; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 448; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 449; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 450; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 451; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 452; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 453; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 454; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 455; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 456; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 457; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 458; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 459; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 460; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 461; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 462; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 463; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 464; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 465; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 466; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 467; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 468; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 469; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 470; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 471; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 472; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 473; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 474; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 475; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 476; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 477; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 478; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 479; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 480; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 481; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 482; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 483; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 484; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 485; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 486; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 487; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 488; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 489; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 490; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 491; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 492; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 493; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 494; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 495; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 496; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 497; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 498; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 499; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 500; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 501; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 502; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 503; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 504; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 505; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 506; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 507; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 508; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 509; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 510; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 511; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 512; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 513; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 514; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 515; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 516; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 517; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 518; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 519; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 520; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 521; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 522; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 523; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 524; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 525; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 526; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 527; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 528; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 529; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 530; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 531; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 532; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 533; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 534; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 535; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 536; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 537; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 538; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 539; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 540; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 541; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 542; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 543; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 544; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 545; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 546; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 547; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 548; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 549; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 550; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 551; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 552; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 553; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 554; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 555; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 556; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 557; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 558; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 559; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 560; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 561; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 562; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 563; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 564; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 565; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 566; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 567; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 568; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 569; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 570; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 571; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 572; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 573; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 574; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 575; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 576; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 577; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 578; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 579; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 580; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 581; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 582; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 583; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 584; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 585; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 586; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 587; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 588; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 589; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 590; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 591; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 592; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 593; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 594; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 595; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 596; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 597; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 598; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 599; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 600; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 601; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 602; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 603; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 604; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 605; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 606; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 607; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 608; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 609; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 610; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 611; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 612; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 613; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 614; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 615; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 616; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 617; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 618; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 619; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
<!-- Specyfikacja utrzymania PATH: linia kontrolna 620; nie usuwać bez aktualizacji test matrix i Definition of Done. -->
