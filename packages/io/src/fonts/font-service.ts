import type { DocumentModel } from '@vectoria/core';

export interface DocumentFontUsage {
  readonly fontFamily: string;
  readonly count: number;
  readonly isAvailable?: boolean;
}

/**
 * Check if a specific font family is currently loaded and available in the browser.
 */
export async function checkFontAvailability(
  fontFamily: string,
  sampleSize: number = 16,
): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts?.check) {
    return true; // Assume available in headless test environments
  }
  try {
    // Check with document.fonts
    return document.fonts.check(`${sampleSize}px "${fontFamily}"`);
  } catch {
    return false;
  }
}

/**
 * Load a web font dynamically using the FontFace API.
 */
export async function loadWebFont(
  fontFamily: string,
  url: string,
  descriptors?: FontFaceDescriptors,
): Promise<boolean> {
  if (typeof window === 'undefined' || typeof FontFace === 'undefined' || !document.fonts) {
    return false;
  }

  try {
    const font = new FontFace(fontFamily, `url(${url})`, descriptors);
    const loadedFont = await font.load();
    document.fonts.add(loadedFont);
    return true;
  } catch {
    return false;
  }
}

/**
 * Query locally installed fonts on the user device if supported by the browser (Local Font Access API).
 */
export async function queryLocalFontFamilies(): Promise<string[]> {
  if (typeof window === 'undefined' || !('queryLocalFonts' in window)) {
    return [];
  }

  try {
    const queryFn = (window as unknown as { queryLocalFonts: () => Promise<Array<{ family: string }>> }).queryLocalFonts;
    const fonts = await queryFn();
    const families = new Set<string>();
    for (const font of fonts) {
      if (font.family) families.add(font.family);
    }
    return Array.from(families).sort();
  } catch {
    return [];
  }
}

/**
 * Extract all unique font families used across all text objects in a DocumentModel.
 */
export function listDocumentFonts(doc: DocumentModel): DocumentFontUsage[] {
  const counts = new Map<string, number>();

  for (const obj of Object.values(doc.objects)) {
    if (obj.type === 'text' || obj.type === 'text-frame') {
      const family = obj.fontFamily || 'Inter, sans-serif';
      counts.set(family, (counts.get(family) || 0) + 1);

      if (obj.runs) {
        for (const run of obj.runs) {
          if (run.fontFamily) {
            counts.set(run.fontFamily, (counts.get(run.fontFamily) || 0) + 1);
          }
        }
      }
    }
  }

  const result: DocumentFontUsage[] = [];
  for (const [fontFamily, count] of counts.entries()) {
    result.push({ fontFamily, count });
  }

  return result.sort((a, b) => b.count - a.count);
}

/**
 * Detect missing fonts across the document.
 */
export async function detectMissingDocumentFonts(doc: DocumentModel): Promise<string[]> {
  const fonts = listDocumentFonts(doc);
  const missing: string[] = [];

  for (const item of fonts) {
    const available = await checkFontAvailability(item.fontFamily);
    if (!available) {
      missing.push(item.fontFamily);
    }
  }

  return missing;
}
