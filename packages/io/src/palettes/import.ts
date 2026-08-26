import type { AngularGradientFill, ColorPalette, LinearGradientFill, PaletteSwatch, RadialGradientFill } from '@vectoria/core';
import { generateId, normalizeColor } from '@vectoria/shared';

export type PaletteImportFormat = 'json' | 'svg' | 'gpl' | 'ase';

const MAX_PALETTE_BYTES = 10 * 1024 * 1024;
const MAX_ENTRIES = 2048;

interface PaletteImportOptions {
  readonly format?: PaletteImportFormat;
  readonly name?: string;
}

interface JsonPaletteEntry {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly color?: unknown;
  readonly type?: unknown;
  readonly fill?: unknown;
}

/** Parse a bounded palette file into normalized, non-executable palette data. */
export function importPalette(payload: string | ArrayBuffer, options: PaletteImportOptions = {}): ColorPalette {
  const format = options.format ?? detectFormat(payload);
  const bytes = typeof payload === 'string' ? new TextEncoder().encode(payload).byteLength : payload.byteLength;
  if (bytes > MAX_PALETTE_BYTES) throw new Error(`Palette exceeds ${MAX_PALETTE_BYTES} byte limit`);

  const entries = format === 'ase'
    ? parseAse(payload)
    : format === 'svg'
      ? parseSvg(String(payload))
      : format === 'gpl'
        ? parseGpl(String(payload))
        : parseJson(String(payload));
  if (entries.length === 0) throw new Error('Palette contains no supported entries');
  if (entries.length > MAX_ENTRIES) throw new Error(`Palette exceeds ${MAX_ENTRIES} entry limit`);

  const colors = entries.filter((entry): entry is Extract<ParsedEntry, { kind: 'color' }> => entry.kind === 'color').map((entry) => ({ id: generateId(), name: entry.name, color: entry.color }));
  const swatches = entries.filter((entry): entry is Extract<ParsedEntry, { kind: 'swatch' }> => entry.kind === 'swatch').map((entry) => ({ ...entry.swatch, id: entry.swatch.id || generateId(), name: entry.name }));
  return { id: generateId(), name: options.name?.trim() || 'Imported palette', scope: 'saved', colors, ...(swatches.length > 0 ? { swatches } : {}) };
}

function detectFormat(payload: string | ArrayBuffer): PaletteImportFormat {
  if (payload instanceof ArrayBuffer) return 'ase';
  const text = payload.trim();
  if (text.startsWith('<')) return 'svg';
  if (text.startsWith('{') || text.startsWith('[')) return 'json';
  return 'gpl';
}

type ParsedEntry = { readonly kind: 'color'; readonly name: string; readonly color: string } | { readonly kind: 'swatch'; readonly name: string; readonly swatch: PaletteSwatch };

function normalizeEntry(name: string, value: string): ParsedEntry | null {
  const color = normalizeColor(value);
  return color ? { kind: 'color', name: name.trim() || color, color } : null;
}

function parseGpl(text: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || /^gimp palette/i.test(trimmed) || /^name:/i.test(trimmed) || /^columns:/i.test(trimmed)) continue;
    const match = trimmed.match(/^(\d+)\s+(\d+)\s+(\d+)(?:\s+(.*))?$/);
    if (!match) continue;
    const entry = normalizeEntry(match[4] ?? `Color ${entries.length + 1}`, `rgb(${match[1]}, ${match[2]}, ${match[3]})`);
    if (entry) entries.push(entry);
  }
  return entries;
}

function parseJson(text: string): ParsedEntry[] {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (error) { throw new Error('Invalid palette JSON', { cause: error }); }
  const source = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { colors?: unknown }).colors) ? (raw as { colors: unknown[] }).colors : raw && typeof raw === 'object' && Array.isArray((raw as { swatches?: unknown }).swatches) ? (raw as { swatches: unknown[] }).swatches : [];
  if (!Array.isArray(source)) return [];
  const entries: ParsedEntry[] = [];
  const ids = new Set<string>();
  for (const item of source) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as JsonPaletteEntry;
    if (typeof entry.id === 'string') {
      if (ids.has(entry.id)) throw new Error(`Duplicate palette entry ID '${entry.id}'`);
      ids.add(entry.id);
    }
    const name = typeof entry.name === 'string' ? entry.name : `Color ${entries.length + 1}`;
    if (typeof entry.color === 'string') {
      const normalized = normalizeEntry(name, entry.color);
      if (normalized) entries.push(normalized);
      continue;
    }
    const swatch = parseJsonSwatch(entry, name);
    if (swatch) entries.push({ kind: 'swatch', name, swatch });
  }
  return entries;
}

function parseJsonSwatch(entry: JsonPaletteEntry, name: string): PaletteSwatch | null {
  const fill: Record<string, unknown> = entry.fill && typeof entry.fill === 'object' ? entry.fill as Record<string, unknown> : entry as unknown as Record<string, unknown>;
  const type = fill.type;
  if (type === 'solid' && typeof fill.color === 'string') {
    const color = normalizeColor(fill.color);
    return color ? { id: typeof entry.id === 'string' ? entry.id : generateId(), name, type: 'solid', color } : null;
  }
  if (type === 'pattern' && (fill.kind === 'dots' || fill.kind === 'grid' || fill.kind === 'hatch') && typeof fill.foreground === 'string' && typeof fill.background === 'string' && typeof fill.size === 'number' && Number.isFinite(fill.size) && fill.size > 0) {
    const foreground = normalizeColor(fill.foreground);
    const background = normalizeColor(fill.background);
    return foreground && background ? { id: typeof entry.id === 'string' ? entry.id : generateId(), name, type: 'pattern', fill: { type: 'pattern', kind: fill.kind, foreground, background, size: fill.size } } : null;
  }
  if (type === 'linear-gradient' || type === 'radial-gradient' || type === 'angular-gradient') {
    const parsed = parseGradient(fill, type);
    return parsed ? { id: typeof entry.id === 'string' ? entry.id : generateId(), name, type: 'gradient', fill: parsed } : null;
  }
  return null;
}

function parseGradient(fill: Record<string, unknown>, type: 'linear-gradient' | 'radial-gradient' | 'angular-gradient'): LinearGradientFill | RadialGradientFill | AngularGradientFill | null {
  if (!Array.isArray(fill.stops) || fill.stops.length < 2) return null;
  const stops = fill.stops.slice(0, 128).flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const stop = value as Record<string, unknown>;
    const color = typeof stop.color === 'string' ? normalizeColor(stop.color) : null;
    const offset = typeof stop.offset === 'number' ? stop.offset : NaN;
    const opacity = typeof stop.opacity === 'number' ? stop.opacity : 1;
    return color && Number.isFinite(offset) && offset >= 0 && offset <= 1 && Number.isFinite(opacity) && opacity >= 0 && opacity <= 1 ? [{ id: typeof stop.id === 'string' ? stop.id : generateId(), offset, color, opacity }] : [];
  });
  if (stops.length < 2) return null;
  const point = (value: unknown): { x: number; y: number } | null => value && typeof value === 'object' && Number.isFinite((value as { x?: unknown }).x) && Number.isFinite((value as { y?: unknown }).y) ? { x: Number((value as { x: number }).x), y: Number((value as { y: number }).y) } : null;
  if (type === 'linear-gradient') {
    const start = point(fill.start); const end = point(fill.end);
    return start && end ? { type, start, end, stops } : null;
  }
  const center = point(fill.center);
  if (!center) return null;
  if (type === 'radial-gradient') return typeof fill.radius === 'number' && Number.isFinite(fill.radius) && fill.radius > 0 ? { type, center, radius: fill.radius, stops } : null;
  return typeof fill.angle === 'number' && Number.isFinite(fill.angle) ? { type, center, angle: fill.angle, stops } : null;
}

function parseSvg(text: string): ParsedEntry[] {
  if (/<(?:script|foreignObject|iframe|object|embed|use)\b|\bon[a-z]+\s*=|(?:javascript:|data:|https?:|url\s*\()/i.test(text)) throw new Error('Unsafe SVG palette content');
  if (typeof DOMParser === 'undefined') throw new Error('SVG palette import requires DOMParser');
  const root = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
  if (!root || root.nodeName.toLowerCase() === 'parsererror') throw new Error('Invalid SVG palette');
  const entries: ParsedEntry[] = [];
  const ids = new Set<string>();
  const paletteElements = root.querySelectorAll('color, swatch, stop, rect, circle, ellipse, path, polygon, polyline');
  for (const [index, element] of Array.from(paletteElements).entries()) {
    const id = element.getAttribute('id');
    if (id) {
      if (ids.has(id)) throw new Error(`Duplicate palette entry ID '${id}'`);
      ids.add(id);
    }
    const value = element.getAttribute('color') ?? element.getAttribute('stop-color') ?? element.getAttribute('fill');
    const entry = value ? normalizeEntry(element.getAttribute('name') ?? `Color ${index + 1}`, value) : null;
    if (entry) entries.push(entry);
  }
  return entries;
}

function parseAse(payload: string | ArrayBuffer): ParsedEntry[] {
  if (!(payload instanceof ArrayBuffer)) throw new Error('ASE palette import requires binary data');
  const bytes = new DataView(payload);
  if (bytes.byteLength < 12 || readAscii(bytes, 0, 4) !== 'ASEF') throw new Error('Invalid ASE header');
  const entries: ParsedEntry[] = [];
  let offset = 12;
  const blocks = bytes.getUint32(8, false);
  let parsedBlocks = 0;
  for (let block = 0; block < blocks && offset + 6 <= bytes.byteLength; block += 1) {
    const type = bytes.getUint16(offset, false);
    const length = bytes.getUint32(offset + 2, false);
    offset += 6;
    if (length > bytes.byteLength - offset) throw new Error('Invalid ASE block length');
    if (type === 0x0001) {
      const parsed = parseAseColor(bytes, offset, length);
      if (parsed) entries.push(parsed);
    }
    offset += length;
    parsedBlocks += 1;
  }
  if (parsedBlocks !== blocks) throw new Error('Invalid ASE block table');
  return entries;
}

function parseAseColor(bytes: DataView, offset: number, length: number): ParsedEntry | null {
  if (length < 4) return null;
  const nameLength = bytes.getUint16(offset, false);
  const nameBytes = nameLength * 2;
  if (nameLength < 1 || 2 + nameBytes + 4 > length) return null;
  let name = '';
  for (let index = 0; index < nameLength - 1; index += 1) name += String.fromCharCode(bytes.getUint16(offset + 2 + index * 2, false));
  const modelOffset = offset + 2 + nameBytes;
  const model = readAscii(bytes, modelOffset, 4);
  const channelOffset = modelOffset + 4;
  if (model === 'RGB ' && channelOffset + 12 <= offset + length) return normalizeEntry(name, `rgb(${bytes.getFloat32(channelOffset, false) * 255}, ${bytes.getFloat32(channelOffset + 4, false) * 255}, ${bytes.getFloat32(channelOffset + 8, false) * 255})`);
  if (model === 'CMYK' && channelOffset + 16 <= offset + length) return normalizeEntry(name, `cmyk(${bytes.getFloat32(channelOffset, false) * 100}%, ${bytes.getFloat32(channelOffset + 4, false) * 100}%, ${bytes.getFloat32(channelOffset + 8, false) * 100}%, ${bytes.getFloat32(channelOffset + 12, false) * 100}%)`);
  if (model === 'GRAY' && channelOffset + 4 <= offset + length) {
    const value = bytes.getFloat32(channelOffset, false) * 255;
    return normalizeEntry(name, `rgb(${value}, ${value}, ${value})`);
  }
  return null;
}

function readAscii(bytes: DataView, offset: number, length: number): string {
  let value = '';
  for (let index = 0; index < length && offset + index < bytes.byteLength; index += 1) value += String.fromCharCode(bytes.getUint8(offset + index));
  return value;
}
