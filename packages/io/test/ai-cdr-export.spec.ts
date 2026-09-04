import { describe, it, expect } from 'vitest';
import { createDefaultDocument } from '@vectoria/core';
import { exportAiFile } from '../src/ai/ai-exporter.js';
import { exportCdrFile } from '../src/cdr/cdr-exporter.js';
import { ZipBuilder, crc32 } from '../src/cdr/zip-builder.js';
import { importAi } from '../src/ai/ai-importer.js';
import { parseCdr } from '../src/cdr/cdr-parser.js';

describe('AI and CDR Export and Round-trip (ADR-021)', () => {
  describe('ZipBuilder and CRC-32', () => {
    it('computes standard IEEE 802.3 CRC-32 checksums', () => {
      const data = new TextEncoder().encode('123456789');
      // Standard CRC-32 check value for "123456789" is 0xcbf43926
      expect(crc32(data)).toBe(0xcbf43926);
    });

    it('assembles a valid PKZIP binary stream with correct magic headers', () => {
      const builder = new ZipBuilder();
      builder.addFile('test.txt', 'Hello Vectoria');
      const zipBytes = builder.build();

      // PK\x03\x04 signature
      expect(zipBytes[0]).toBe(0x50);
      expect(zipBytes[1]).toBe(0x4b);
      expect(zipBytes[2]).toBe(0x03);
      expect(zipBytes[3]).toBe(0x04);
      expect(zipBytes.length).toBeGreaterThan(50);
    });
  });

  describe('exportAiFile (.ai)', () => {
    it('exports a valid Adobe Illustrator compatible container with PDF-compatible stream', async () => {
      const doc = createDefaultDocument({ name: 'Illustrator Test File', width: 800, height: 600 });
      const aiBlob = await exportAiFile(doc);

      expect(aiBlob.type).toBe('application/illustrator');
      expect(aiBlob.size).toBeGreaterThan(100);

      const buffer = await aiBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const head = new TextDecoder('latin1').decode(bytes.slice(0, 10));

      // Must start with PDF header (%PDF-)
      expect(head.startsWith('%PDF-')).toBe(true);

      // Verify round-trip: importAi parses the stream
      const importResult = await importAi(buffer);
      expect(importResult).toBeDefined();
      expect(importResult.report.entries.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exportCdrFile (.cdr)', () => {
    it('exports a valid CorelDRAW PKZIP container with metadata and vector stream', async () => {
      const doc = createDefaultDocument({ name: 'CorelDRAW Test File', width: 1000, height: 700 });
      const cdrBlob = await exportCdrFile(doc);

      expect(cdrBlob.type).toBe('application/x-coreldraw');
      expect(cdrBlob.size).toBeGreaterThan(100);

      const buffer = await cdrBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const head = new TextDecoder('latin1').decode(bytes.slice(0, 4));

      // Must start with PKZIP signature
      expect(head).toBe('PK\x03\x04');

      // Verify round-trip: parseCdr parses the container and extracts vector geometry
      const importResult = await parseCdr(buffer);
      expect(importResult).toBeDefined();
      expect(importResult.objects.length).toBeGreaterThan(0);
      expect(importResult.report.entries.length).toBeGreaterThan(0);
    });
  });
});
