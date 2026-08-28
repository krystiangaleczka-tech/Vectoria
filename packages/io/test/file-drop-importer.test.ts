// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { processDroppedFile } from '../src/assets/file-drop-importer.js';

function makeFile(content: string, name: string, type: string, sizeOverride?: number): File {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type, lastModified: Date.now() });
  if (sizeOverride !== undefined) {
    Object.defineProperty(file, 'size', { value: sizeOverride, configurable: true });
  }
  return file;
}

describe('processDroppedFile (ASSET-001...005)', () => {
  it('throws error when file exceeds MAX_FILE_SIZE_BYTES', async () => {
    const file = makeFile('dummy', 'large.png', 'image/png', 60 * 1024 * 1024);
    await expect(processDroppedFile(file, { x: 100, y: 100 }, 'layer-1')).rejects.toThrow(
      'Plik jest za duży',
    );
  });

  it('imports valid SVG and sanitizes scripts/event handlers (quoted, unquoted, mixed)', async () => {
    const maliciousSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <script>alert("xss")</script>
      <foreignObject width="100" height="100"><div>evil</div></foreignObject>
      <rect x="10" y="10" width="80" height="80" fill="red" onclick="alert(1)" />
      <rect x="10" y="10" width="40" height="40" fill="blue" onclick=attack() />
      <rect x="10" y="10" width="20" height="20" fill="green" onload='exec()' />
    </svg>`;
    const file = makeFile(maliciousSvg, 'graphic.svg', 'image/svg+xml');
    const result = await processDroppedFile(file, { x: 50, y: 50 }, 'layer-1');

    expect(result.kind).toBe('vector');
    if (result.kind === 'vector') {
      expect(result.objects.length).toBeGreaterThan(0);
      // Żaden obiekt nie może mieć event handlera w danych po sanityzacji
      for (const obj of result.objects) {
        expect(JSON.stringify(obj)).not.toContain('onclick');
        expect(JSON.stringify(obj)).not.toContain('onload');
      }
    }
  });

  it('throws error on empty/non-vector SVG', async () => {
    const emptySvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"></svg>`;
    const file = makeFile(emptySvg, 'empty.svg', 'image/svg+xml');
    await expect(processDroppedFile(file, { x: 0, y: 0 }, 'layer-1')).rejects.toThrow(
      'nie zawiera importowalnych elementów',
    );
  });

  it('throws explicit error on PDF files with user-facing guidance', async () => {
    const file = makeFile('%PDF-1.4', 'document.pdf', 'application/pdf');
    await expect(processDroppedFile(file, { x: 0, y: 0 }, 'layer-1')).rejects.toThrow(
      'Import PDF nie jest obsługiwany',
    );
  });

  it('throws error on unsupported file format', async () => {
    const file = makeFile('some text', 'archive.zip', 'application/zip');
    await expect(processDroppedFile(file, { x: 0, y: 0 }, 'layer-1')).rejects.toThrow(
      'Nieobsługiwany format pliku',
    );
  });

  it('imports raster image (PNG) as ImageObject', async () => {
    const fakePng = 'fake-png-data';
    const file = makeFile(fakePng, 'sample.png', 'image/png');
    const result = await processDroppedFile(file, { x: 200, y: 150 }, 'layer-1');

    expect(result.kind).toBe('image');
    if (result.kind === 'image') {
      expect(result.image.type).toBe('image');
      expect(result.image.name).toBe('sample');
      expect(result.image.layerId).toBe('layer-1');
      expect(result.image.source.type).toBe('embed');
      expect(result.image.transform.position).toEqual({ x: 200, y: 150 });
    }
  });
});
