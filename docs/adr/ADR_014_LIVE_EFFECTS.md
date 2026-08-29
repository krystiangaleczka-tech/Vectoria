# ADR 014: System "Live Effects" w modelu obiektów

**Data:** 2026-08-29
**Status:** Zaakceptowany
**Kontekst:** EPIC-13 "Efekty i appearance" wymaga wprowadzenia do obiektów niedestrukcyjnych efektów wizualnych takich jak Drop Shadow, Blur, czy filtry SVG, zachowujących odwracalność w UI bez modyfikacji macierzystej geometrii.
**Decyzja:** 
Zdecydowano na dodanie opcjonalnej tablicy `effects: readonly LiveEffect[]` wewnątrz głównego interfejsu `ObjectStyle` (zdefiniowanego w `types.ts`).
1. Każdy `LiveEffect` posiada `id`, `type` (określający wariant efektu) i `visible` (toggle), a następnie specyficzne parametry.
2. Efekty stanowią "warstwę wyglądu" nakładaną na końcu procesu renderowania dla pojedynczego obiektu, zachowując separację od modyfikacji punktów (np. krzywych Beziera).
3. Wybrano koncepcję płaskiej listy efektów (nakładanych po wypełnieniu i obrysie obiektu), w opozycji do kompleksowych warstw wyglądu mieszających obrysy z efektami (jak w niektórych rozbudowanych programach DTP) w celu zachowania prostoty i wydajności renderowania Canvas MVP.
**Konsekwencje:**
- Łatwiejsza implementacja w `Canvas2D`, gdyż większość efektów nakładanych globalnie mapuje się prosto na `ctx.filter` lub `ctx.shadow*`.
- Konieczność modyfikacji IO (`packages/io`), aby wspierało zapis i odczyt z `.vct`, zachowując kompatybilność wsteczną, jeśli własność `effects` brakuje w dokumencie V1.
- Renderer przy opcji jakości "interactive" może szybko ignorować pętlę renderującą efekty, obniżając obciążenie procesora bez ruszania modelu wektorowego.
