# ADR 017: Domena adnotacji, komentarze na canvasie i pinezki w przestrzeni świata

**Data:** 2026-09-04  
**Status:** Accepted  
**Kontekst:** Wdrożenie komentarzy i adnotacji przypiętych do współrzędnych logicznych dokumentu (EPIC-17 SAAS-012..014, SAAS-018) w architekturze local-first.

---

## Kontekst i problem

Wektorowy edytor Vectoria wymaga możliwości nanoszenia uwag, komentarzy i wątków dyskusyjnych przypiętych do określonych miejsc na canvasie.
Kluczowe wyzwania architektoniczne:
1. **Separacja od geometrii sceny**: Komentarze nie są kształtami wektorowymi ani obiektami graficznymi (`SceneObject`). Nie mogą wpływać na eksport graficzny SVG/PNG, bounding box artboardu, narzędzia selekcji obiektów (`SelectTool`), operacje boolean ani drzewo warstw graficznych (`layers`).
2. **Spójność z dokumentem i historia Undo/Redo**: Komentarze muszą być częścią trwałego stanu dokumentu, aby przetrwać zapis w formacie `.vct`, wersjonowanie oraz pozwalać na cofanie dodania, edycji, przesunięcia czy usunięcia komentarza.
3. **Pinezki w przestrzeni świata (world-space) vs rzutowanie na ekran**: Pinezki muszą być powiązane ze współrzędnymi logicznymi świata (`worldPoint: Vec2`), a nie pikselami widoku ekranowego, aby zachować stabilne położenie względem grafiki przy dowolnym powiększeniu (`zoom`) i przesunięciu (`pan`).
4. **Wydajność i dostępność (A11y)**: Renderowanie interaktywnych kontrolek komentarzy w pętli Canvas 2D utrudnia obsługę czytników ekranu, nawigację klawiaturą, focus ringi i edycję tekstu.

---

## Decyzja

1. **Rozszerzenie modelu `DocumentModel` o domenę adnotacji (`packages/core/src/model/types.ts`)**:
   - Wprowadzono typ `CanvasAnnotation`:
     ```ts
     export interface CanvasAnnotation {
       readonly id: string;
       readonly projectId?: string;
       readonly worldPoint: Vec2;
       readonly body: string;
       readonly authorName: string;
       readonly resolved: boolean;
       readonly mentions: readonly string[];
       readonly createdAt: string;
       readonly updatedAt: string;
     }
     ```
   - Do `DocumentModel` dodano opcjonalne pole `readonly annotations?: readonly CanvasAnnotation[]`.
   - Pole to jest opcjonalne, co gwarantuje pełną zgodność wsteczną z dotychczasowymi plikami `.vct` i bazą IndexedDB (stare dokumenty po prostu mają brak tego pola lub pustą listę).

2. **Niezmienniki domeny (Invariants w `packages/core/src/model/invariants.ts`)**:
   - Każda adnotacja posiada unikalny identyfikator `id` (weryfikowany w globalnym rejestrze identyfikatorów dokumentu).
   - Współrzędne `worldPoint.x` i `worldPoint.y` muszą być skończonymi liczbami (`Number.isFinite`).
   - `body` nie może być puste po obcięciu spacji i nie może przekraczać 4000 znaków.
   - `authorName` nie może być puste i nie może przekraczać 120 znaków.
   - Wprowadzono limit maksymalnie 500 adnotacji na dokument (`DOCUMENT_LIMITS.maxAnnotations = 500`).
   - Pole `mentions` jest zbiorem unikalnych nicków wyekstrahowanych z treści komentarza za pomocą wyrażenia regularnego `/@([a-zA-Z0-9_-]+)/g`.

3. **Deterministyczne komendy Undo/Redo (`packages/core/src/commands/comment-commands.ts`)**:
   - `AddAnnotationCommand`: dodaje nową adnotację do `doc.annotations`.
   - `UpdateAnnotationCommand`: aktualizuje treść `body`, flagę `resolved` lub pozycję `worldPoint`.
   - `DeleteAnnotationCommand`: usuwa adnotację (zapamiętując pełny obiekt do przywrócenia w `undo`).
   - `MoveAnnotationPinCommand`: komenda zatwierdzająca zakończenie przeciągania pinezki na canvasie. W trakcie ruchu kursora (`pointermove`) aktualizowany jest wyłącznie lokalny stan podglądu (preview), a `pointerup` emituje pojedynczą komendę w historii dokumentu.

4. **Walidacja Zod i schemat trwałości (`packages/io/src/schema/document-v1.ts`)**:
   - Zdefiniowano `CanvasAnnotationSchema` z twardymi limitami długości ciągów znaków.
   - `DocumentV1Schema` zawiera pole `annotations: z.array(CanvasAnnotationSchema).max(500).default([])`.

5. **Prezentacja UI: Pinezki jako DOM-Overlay (`apps/web/src/features/canvas/CanvasViewport.tsx`)**:
   - Pinezki komentarzy są renderowane w warstwie HTML nakładanej na viewport canvasu (DOM-overlay).
   - Współrzędne ekranowe obliczane są wyłącznie przez `camera.worldToScreen(annotation.worldPoint)`.
   - Pinezki są w pełni dostępne z klawiatury (przyciski HTML z etykietami `aria-label`, `tabIndex`, widocznymi focus ringami).

---

## Konsekwencje

- **Zalety**:
  - Zerowy wpływ na render loop Canvas 2D (60 FPS zachowane przy dowolnym pan/zoom).
  - Pełne wsparcie dla Undo/Redo i automatycznego zapisu do IndexedDB.
  - Wysoka dostępność (klawiatura, czytniki ekranu) dzięki elementom semantycznym HTML.
  - Bezpieczeństwo danych dzięki rygorystycznym invariantom i walidacji Zod.
- **Kompromisy**:
  - Przy bardzo dużej liczbie komentarzy (>200 widocznych jednocześnie) nakładka DOM wymaga wirtualizacji lub filtrowania pinezek nierozwiązanych. Wprowadzono filtr „Ukryj rozwiązane” oraz limit 500 adnotacji.
