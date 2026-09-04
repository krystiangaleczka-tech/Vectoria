/**
 * Pure TypeScript in-memory ZIP package builder.
 * Produces standard PKZIP packages without external dependencies or native bindings.
 */

// Precomputed CRC-32 table for fast checksum generation
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

/**
 * Computes standard IEEE 802.3 CRC-32 checksum for a byte sequence.
 */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i] ?? 0;
    const tableVal = CRC_TABLE[(crc ^ byte) & 0xff] ?? 0;
    crc = (crc >>> 8) ^ tableVal;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  readonly path: string;
  readonly data: Uint8Array | string;
}

/**
 * In-memory ZIP archive generator supporting arbitrary binary and text payloads.
 */
export class ZipBuilder {
  private readonly files: Array<{ path: string; bytes: Uint8Array }> = [];

  /**
   * Adds a file entry to the pending archive.
   */
  addFile(path: string, content: Uint8Array | string): this {
    const bytes = typeof content === 'string'
      ? new TextEncoder().encode(content)
      : content;
    this.files.push({ path, bytes });
    return this;
  }

  /**
   * Generates the complete serialized ZIP archive as an ArrayBuffer.
   */
  build(): Uint8Array {
    const encoder = new TextEncoder();
    const localHeaders: Uint8Array[] = [];
    const centralHeaders: Uint8Array[] = [];

    let currentOffset = 0;

    for (const file of this.files) {
      const nameBytes = encoder.encode(file.path);
      const fileData = file.bytes;
      const fileCrc = crc32(fileData);
      const fileLength = fileData.length;

      // 1. Local File Header (30 bytes + name + data)
      const local = new Uint8Array(30 + nameBytes.length + fileLength);
      const localView = new DataView(local.buffer);

      localView.setUint32(0, 0x04034b50, true); // Local file header signature (PK\x03\x04)
      localView.setUint16(4, 20, true); // Version needed (2.0)
      localView.setUint16(6, 0, true); // General purpose flag
      localView.setUint16(8, 0, true); // Compression method (0 = stored)
      localView.setUint16(10, 0, true); // Last mod file time
      localView.setUint16(12, 0, true); // Last mod file date
      localView.setUint32(14, fileCrc, true); // CRC-32
      localView.setUint32(18, fileLength, true); // Compressed size
      localView.setUint32(22, fileLength, true); // Uncompressed size
      localView.setUint16(26, nameBytes.length, true); // File name length
      localView.setUint16(28, 0, true); // Extra field length

      local.set(nameBytes, 30);
      local.set(fileData, 30 + nameBytes.length);

      localHeaders.push(local);

      // 2. Central Directory Header (46 bytes + name)
      const central = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(central.buffer);

      centralView.setUint32(0, 0x02014b50, true); // Central file header signature (PK\x01\x02)
      centralView.setUint16(4, 20, true); // Version made by
      centralView.setUint16(6, 20, true); // Version needed to extract
      centralView.setUint16(8, 0, true); // Flags
      centralView.setUint16(10, 0, true); // Compression method (stored)
      centralView.setUint16(12, 0, true); // Mod time
      centralView.setUint16(14, 0, true); // Mod date
      centralView.setUint32(16, fileCrc, true); // CRC-32
      centralView.setUint32(20, fileLength, true); // Compressed size
      centralView.setUint32(24, fileLength, true); // Uncompressed size
      centralView.setUint16(28, nameBytes.length, true); // File name length
      centralView.setUint16(30, 0, true); // Extra field length
      centralView.setUint16(32, 0, true); // File comment length
      centralView.setUint16(34, 0, true); // Disk number start
      centralView.setUint16(36, 0, true); // Internal file attributes
      centralView.setUint32(38, 0, true); // External file attributes
      centralView.setUint32(42, currentOffset, true); // Relative offset of local header

      central.set(nameBytes, 46);

      centralHeaders.push(central);

      currentOffset += local.length;
    }

    const centralDirectoryOffset = currentOffset;
    const centralDirectorySize = centralHeaders.reduce((acc, h) => acc + h.length, 0);

    // 3. End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);

    eocdView.setUint32(0, 0x06054b50, true); // End of central dir signature (PK\x05\x06)
    eocdView.setUint16(4, 0, true); // Number of this disk
    eocdView.setUint16(6, 0, true); // Disk with central directory
    eocdView.setUint16(8, this.files.length, true); // Entries on this disk
    eocdView.setUint16(10, this.files.length, true); // Total entries
    eocdView.setUint32(12, centralDirectorySize, true); // Size of central directory
    eocdView.setUint32(16, centralDirectoryOffset, true); // Offset of central directory
    eocdView.setUint16(20, 0, true); // Comment length

    // Assemble total package
    const totalSize = currentOffset + centralDirectorySize + eocd.length;
    const output = new Uint8Array(totalSize);

    let writePos = 0;
    for (const h of localHeaders) {
      output.set(h, writePos);
      writePos += h.length;
    }
    for (const h of centralHeaders) {
      output.set(h, writePos);
      writePos += h.length;
    }
    output.set(eocd, writePos);

    return output;
  }
}
