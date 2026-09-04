import type { BrandKit, CanvasAnnotation } from '@vectoria/core';
import { BrandKitSchema } from '../schema/document-v1.js';

/**
 * Serializes canvas annotations to formatted JSON with metadata.
 */
export function exportAnnotationsToJson(annotations: readonly CanvasAnnotation[]): string {
  const payload = {
    app: 'vectoria',
    type: 'annotations-export',
    exportedAt: new Date().toISOString(),
    count: annotations.length,
    annotations,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Formats canvas annotations as a readable Markdown summary with status and coordinates.
 */
export function exportAnnotationsToMarkdown(docName: string, annotations: readonly CanvasAnnotation[]): string {
  const open = annotations.filter((a) => !a.resolved);
  const resolved = annotations.filter((a) => a.resolved);

  const lines: string[] = [
    `# Komentarze i adnotacje: ${docName || 'Dokument'}`,
    ``,
    `> Wyeksportowano: ${new Date().toLocaleString()}`,
    `> Razem: ${annotations.length} (Otwarte: ${open.length}, Rozwiązane: ${resolved.length})`,
    ``,
    `## Otwarte uwagi (${open.length})`,
    ``,
  ];

  if (open.length === 0) {
    lines.push(`*Brak otwartych uwag.*`, ``);
  } else {
    for (const item of open) {
      const mentionsStr = item.mentions.length > 0 ? ` (oznaczeni: ${item.mentions.map((m) => `@${m}`).join(', ')})` : '';
      lines.push(
        `### [ ] ${item.authorName} — (${Math.round(item.worldPoint.x)}, ${Math.round(item.worldPoint.y)})`,
        `*Data: ${new Date(item.createdAt).toLocaleString()}*${mentionsStr}`,
        ``,
        `> ${item.body.replace(/\n/g, '\n> ')}`,
        ``,
      );
    }
  }

  lines.push(`## Rozwiązane uwagi (${resolved.length})`, ``);
  if (resolved.length === 0) {
    lines.push(`*Brak rozwiązanych uwag.*`, ``);
  } else {
    for (const item of resolved) {
      lines.push(
        `### [x] ${item.authorName} — (${Math.round(item.worldPoint.x)}, ${Math.round(item.worldPoint.y)})`,
        `*Data: ${new Date(item.createdAt).toLocaleString()}*`,
        ``,
        `> ${item.body.replace(/\n/g, '\n> ')}`,
        ``,
      );
    }
  }

  return lines.join('\n');
}

export interface ExportedBrandKitPayload {
  app: 'vectoria';
  schemaVersion: 1;
  type: 'brandkit-bundle';
  exportedAt: string;
  brandKit: BrandKit;
}

/**
 * Serializes a BrandKit to a portable JSON bundle file content.
 */
export function exportBrandKitToFile(brandKit: BrandKit): string {
  const validated = BrandKitSchema.parse(brandKit);
  const payload: ExportedBrandKitPayload = {
    app: 'vectoria',
    schemaVersion: 1,
    type: 'brandkit-bundle',
    exportedAt: new Date().toISOString(),
    brandKit: validated,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parses and validates an imported BrandKit JSON file content.
 */
export function importBrandKitFromFile(jsonContent: string): BrandKit {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (e) {
    throw new Error('Invalid JSON format in Brand Kit file', { cause: e });
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Brand Kit payload must be a JSON object');
  }

  const obj = parsed as Record<string, unknown>;
  const rawBrandKit = 'brandKit' in obj ? obj.brandKit : obj;

  return BrandKitSchema.parse(rawBrandKit);
}
