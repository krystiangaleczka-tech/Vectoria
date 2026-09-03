import type { ImportReportEntry } from '@vectoria/core';

export const SVG_LIMITS = {
  maxBytes: 50 * 1024 * 1024,
  maxElements: 5_000,
  maxGroupNesting: 32,
  maxPathDataLength: 100_000,
} as const;

export interface SanitizeResult {
  readonly text: string;
  readonly warnings: readonly ImportReportEntry[];
}

/**
 * Single entry point for ALL untrusted SVG (file, drop, clipboard).
 * Regexes must keep the three attribute value forms: "x", 'x', x.
 * Runs before DOMParser so hostile markup never reaches the DOM.
 */
export function sanitizeSvg(svgText: string, limits: typeof SVG_LIMITS = SVG_LIMITS): SanitizeResult {
  if (new Blob([svgText]).size > limits.maxBytes) {
    throw new Error(`SVG przekracza limit ${(limits.maxBytes / 1024 / 1024) | 0} MB`);
  }

  // We are skipping the global regex match for path lengths here and will handle it properly in parsing
  // because matching the whole string iteratively is very slow or leads to stack overflows

  const warnings: ImportReportEntry[] = [];
  let result = svgText;

  // Destructive blocks - removing <script> entirely
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<script[^>]*\/>/gi, '');

  // Destructive blocks - removing <foreignObject> entirely
  result = result.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  result = result.replace(/<foreignObject[^>]*\/>/gi, '');

  // Strip event handlers e.g. onclick="...", onclick='...', onclick=...
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // Strip javascript: hrefs and srcs
  result = result.replace(/\s+(?:xlink:)?href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi, '');
  result = result.replace(/\s+src\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi, '');

  // Strip vbscript: and disallowed data: URIs (allowlist: raster images only).
  // data:image/svg+xml is intentionally blocked — an SVG payload can carry script.
  const DATA_URI_ALLOWED = /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i;
  const uriAttr = /\s(?:xlink:)?(?:href|src)\s*=\s*("data:[^"]*"|'data:[^']*'|data:[^\s>]*)/gi;
  const blockedData = [...svgText.matchAll(uriAttr)]
    .map((m) => m[1]!.replace(/^["']|["']$/g, ''))
    .filter((uri) => !DATA_URI_ALLOWED.test(uri));

  const vbscriptMatches = result.match(/\s(?:xlink:)?(?:href|src)\s*=\s*(?:"vbscript:[^"]*"|'vbscript:[^']*'|vbscript:[^\s>]*)/gi) ?? [];
  result = result.replace(
    /\s(?:xlink:)?(?:href|src)\s*=\s*(?:"vbscript:[^"]*"|'vbscript:[^']*'|vbscript:[^\s>]*)/gi,
    '',
  );
  for (const uri of blockedData) {
    const escaped = uri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\s(?:xlink:)?(?:href|src)\\s*=\\s*(?:"${escaped}"|'${escaped}'|${escaped})`, 'gi'), '');
  }
  const totalBlocked = blockedData.length + vbscriptMatches.length;
  if (totalBlocked > 0) {
    warnings.push({
      category: 'unsupported',
      code: 'svg.uri.blocked',
      message: `Usunięto ${totalBlocked} niedozwolonych URI (vbscript:/data:)`,
    });
  }

  // Strip external references http/https
  const external = result.match(/\s(?:xlink:)?href\s*=\s*"(?:https?:)?\/\/[^"]*"/gi) ?? [];
  if (external.length > 0) {
    result = result.replace(/\s(?:xlink:)?href\s*=\s*(?:"(?:https?:)?\/\/[^"]*"|'(?:https?:)?\/\/[^']*'|(?:https?:)?\/\/[^\s>]*)/gi, '');
    warnings.push({
      category: 'unsupported',
      code: 'svg.href.external',
      message: `Usunięto ${external.length} zewnętrznych referencji href`,
    });
  }

  // Quick heuristic for extremely complex paths, but precise limits are in path parsing
  if (result.length > limits.maxPathDataLength * 4 && /<path[^>]*\sd="[^"]{100000,}"/i.test(result)) {
    warnings.push({
      category: 'flattened',
      code: 'svg.path.complexity',
      message: 'Ścieżki o ekstremalnej złożoności zostaną uproszczone',
    });
  }

  return { text: result, warnings };
}
