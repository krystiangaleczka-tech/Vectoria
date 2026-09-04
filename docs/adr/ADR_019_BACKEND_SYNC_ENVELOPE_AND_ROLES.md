# ADR 019: Architektura backendu chmurowego, koperta synchronizacji i role (Etap 2 — specyfikacja bramkowa)

**Data:** 2026-09-04  
**Status:** Proposed (Gate Document dla Etapu 2)  
**Kontekst:** Wymagania specyfikacji EPIC-17 (SAAS-001, SAAS-006..011, SAAS-019) dotyczące przyszłej integracji z chmurą i autoryzacji serwerowej.

---

## Kontekst i problem

Architektura Vectoria opiera się na zasadzie „local-first”. W Etapie 2 planowane jest dodanie kont użytkowników, przestrzeni zespołowych w chmurze, linków udostępniania oraz ról (viewer, commenter, editor, owner).
Wymogi bezpieczeństwa:
1. Klient przeglądarkowy **nie może** być źródłem prawdy o uprawnieniach (`client is not the source of authorization`).
2. Sprawdzanie ról po stronie klienta służy wyłącznie polepszeniu doświadczenia użytkownika (UX) i ukrywaniu niedozwolonych kontrolek, podczas gdy serwer egzekwuje uprawnienia w regułach RLS / procedurach RPC.
3. Synchronizacja dokumentów musi zachować odporność na utratę łączności (offline fallback).

---

## Proponowane decyzje na Etap 2

1. **Jednostka synchronizacji: Koperta `PersistedDocument`**:
   - Dokument jest przesyłany jako wersjonowana koperta (`PersistedDocument`) zawierająca numer rewizji (`revision`), identyfikator dokumentu (`document.id`) oraz znacznik czasu (`savedAt`).
   - Zapis do chmury wykorzystuje mechanizm `If-Match: revision` (Compare-And-Swap), aby zapobiec cichym nadpisaniom równoległych edycji.

2. **Hierarchia ról i autoryzacja serwerowa**:
   - `viewer`: dostęp wyłącznie do odczytu (`read-only`). Serwer odrzuca żądania `PUT/POST/PATCH` dla dokumentu i komentarzy.
   - `commenter`: dostęp do odczytu dokumentu + tworzenie, modyfikacja i rozwiązywanie własnych komentarzy. Brak uprawnień do zmiany geometrii sceny.
   - `editor`: pełne prawo do wprowadzania zmian w dokumencie i obiektach sceny.
   - `owner`: pełne uprawnienia edytora + zarządzanie członkami projektu, zmiana ról, transfer własności i usuwanie projektu.

3. **Autentykacja i tokeny sesji**:
   - Wykorzystanie bezpiecznych ciasteczek `HttpOnly` i `SameSite=Lax` chroniących przed atakami XSS i kradzieżą tokenu dostępowego.
   - Brak składowania surowych kluczy API w `localStorage`.

4. **Przygotowanie w silniku (Etap 1 groundwork)**:
   - Wprowadzono flagę `readOnly` w `EditorContext` silnika `editor-engine`. W trybie `readOnly=true` wywołania poleceń modyfikujących dokument są zablokowane na poziomie dyspozytora poleceń, co pozwala na bezpieczne testowanie zachowania widoku przeglądającego bez backendu.

---

## Konsekwencje

- Implementacja kodu chmurowego zostanie rozpoczęta dopiero po formalnej akceptacji dostawcy backendu (np. Supabase, PostgreSQL z RLS lub dedykowany mikroserwis Go/Node) przez użytkownika.
