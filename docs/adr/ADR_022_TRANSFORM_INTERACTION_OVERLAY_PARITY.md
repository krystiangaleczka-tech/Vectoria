# ADR-022: Zgodność uchwytów transformacji i nakładki zaznaczenia

- Status: Accepted — zatwierdzone przez użytkownika w tej sesji.
- Data: 2026-10-03
- Zakres: naprawy po weryfikacji VEC-010–013, SEL-015/016/019.

## Kontekst

Adapter canvasa mieszał lokalne wymiary z world-space przesunięciem. Nakładka dla ścieżek i kształtów parametrycznych rysowała world-space AABB, podczas gdy poprawne skalowanie wymaga uchwytów lokalnych przekształconych pełną macierzą obiektu. Różne współrzędne rysowania i hit-testu powodowały skoki albo brak trafienia w widoczną kotwicę. Obrót zmieniał kąt względem środka kursora, ale nie kompensował transform.position.

## Decyzja

1. Engine oblicza resize/rotate z istniejących Transform2D i Rect, przez istniejące macierze core. Kotwica przeciwległa jest stała w świecie; obrót zachowuje światową pozycję geometrycznego środka.
2. Renderer rysuje osiem screen-space uchwytów na lokalnym obrysie przekształconym macierzą obiektu; pozycja środkowego uchwytu obrotu jest odsunięta o 20 CSS px. Hit-test używa identycznego obrysu i odsunięcia. Narożne strefy obrotu to cursor feedback poza uchwytami resize, 24 CSS px od narożnika.
3. Zachowujemy istniejące scene/background/overlay, rAF, theme tokens i read-only renderer. Publiczne API renderera, granice importów, DocumentModel, persistence i Command pozostają bez zmian.
4. Prowadnice background są rysowane po wypełnieniu artboardu, aby tło ich nie zasłaniało. Zachowujemy background/scene/overlay oraz dotychczasowe API guides.
5. Gesture preview nie zmienia dokumentu. Pointerup tworzy jeden TransformObjectsCommand; cancel usuwa preview.

## Plan migracji

Najpierw helper engine i testy kotwic/macierzowe. Następnie lokalna korekta wewnętrznej nakładki zaznaczenia i integracja adaptera. Zastąpić podwójny geometry/position commit pojedynczą istniejącą komendą transformacji. Zweryfikować prostokąt, elipsę i ścieżkę, wszystkie uchwyty, obrót, cancel, Undo/Redo i eksport. Dokumenty istniejące nie wymagają migracji; przywrócenie poprzedniej wersji nie zmienia formatu zapisu.

## Konsekwencje i walidacja

World-space AABB nadal służy cullingowi. Widoczny obrys zaznaczenia jest zgodny z lokalnym układem obiektu. Rozmiar uchwytów nie rośnie wraz ze scale obiektu. Wymagane: unit dla obrotu/pivot/skew/scale i kotwic, integration engine→renderer, E2E gest→cancel/undo/export, dark/light i DPR 1/2, pomiar drag i podglądu Ołówka. Nie wolno zmieniać budżetów ani tolerancji w celu ukrycia regresji.
