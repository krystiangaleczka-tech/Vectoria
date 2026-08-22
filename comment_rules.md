/**
 * Zasady dotyczące komentarzy, przeniesione z AI_PROJECT_RULES.txt.
 *
 * Źródłowy tekst:
 * „Komentarz `///` nad każdą publiczną metodą/getterem >3 linie — co robi
 * i dlaczego istnieje, nie jak działa.”
 *
 * W TypeScript odpowiednikiem `///` jest JSDoc: `/** ... *\/`.
 */

/**
 * Dodawaj komentarz JSDoc nad każdą publiczną metodą lub getterem
 * dłuższym niż 3 linie.
 *
 * Komentarz ma opisywać, co element robi i dlaczego istnieje,
 * a nie szczegóły tego, jak jest zaimplementowany.
 */
export const commentRule = {
  appliesTo: 'public methods and getters longer than 3 lines',
  format: 'JSDoc (/** ... */)',
  describe: ['what it does', 'why it exists'],
  avoid: ['implementation details', 'step-by-step explanation of how it works'],
} as const;

/**
 * Nie dodawaj kodu, komentarzy, refaktorów ani wyjaśnień,
 * o które nikt nie prosił.
 */
export const scopeRule = {
  doNotAddUnrequested: ['code', 'comments', 'refactors', 'explanations'],
} as const;
