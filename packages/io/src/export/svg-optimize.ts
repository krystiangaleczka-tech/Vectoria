/**
 * Optimizes an SVG document string for production distribution.
 * Strips editor-specific attributes (`data-vectoria-*`), XML comments, collapses extraneous whitespace,
 * and rounds high-precision floating numbers to 2 decimal places.
 *
 * @param svg The raw editable SVG content.
 * @returns Cleaned and optimized SVG string.
 */
export function optimizeSvg(svg: string): string {
  let result = svg;

  // 1. Strip XML comments
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Strip editor-specific attributes (matches double quotes, single quotes, and unquoted values per AGENTS.md rule)
  result = result.replace(/\s*data-vectoria-[a-z0-9-]+=(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // 3. Round floating point numbers with more than 2 decimal places
  result = result.replace(/(?<=[ ,=]|^)(\d+\.\d{3,})(?=[ ,";\s>]|$)/gm, (match) => {
    const val = Number(match);
    return Number.isFinite(val) ? String(Math.round(val * 100) / 100) : match;
  });

  // 4. Clean up blank lines and trailing whitespace
  result = result
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

  return result;
}
