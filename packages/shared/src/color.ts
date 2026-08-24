export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly alpha: number;
}

export interface ParsedColor {
  readonly hex: string;
  readonly rgb: RgbColor;
  readonly outOfGamut: boolean;
}

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
const byte = (value: number): number => Math.round(clamp(value, 0, 255));
const toHex = (value: number): string => byte(value).toString(16).padStart(2, '0');

export function rgbToHex(rgb: RgbColor): string {
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function parseColor(input: string): ParsedColor | null {
  const value = input.trim().toLowerCase();
  const hex = value.match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i);
  if (hex) {
    const raw = hex[1]!;
    const expanded = raw.length <= 4 ? raw.split('').map((part) => part + part).join('') : raw;
    const rgb = { r: parseInt(expanded.slice(0, 2), 16), g: parseInt(expanded.slice(2, 4), 16), b: parseInt(expanded.slice(4, 6), 16), alpha: expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1 };
    return { hex: rgbToHex(rgb), rgb, outOfGamut: false };
  }

  const rgbMatch = value.match(/^rgba?\(\s*([\d.+-]+)%?\s*,\s*([\d.+-]+)%?\s*,\s*([\d.+-]+)%?(?:\s*,\s*([\d.+-]+))?\s*\)$/);
  if (rgbMatch) {
    const values = [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
    const percent = value.includes('%');
    const alpha = rgbMatch[4] === undefined ? 1 : Number(rgbMatch[4]);
    const channels = values.map((channel) => percent ? channel * 2.55 : channel);
    if (channels.every(Number.isFinite) && Number.isFinite(alpha)) {
      const rgb = { r: channels[0]!, g: channels[1]!, b: channels[2]!, alpha: clamp(alpha) };
      return { hex: rgbToHex(rgb), rgb, outOfGamut: channels.some((channel) => channel < 0 || channel > 255) };
    }
  }

  const hsl = value.match(/^hsla?\(\s*([\d.+-]+)\s*,\s*([\d.+-]+)%\s*,\s*([\d.+-]+)%(?:\s*,\s*([\d.+-]+))?\s*\)$/);
  if (hsl) {
    const hue = Number(hsl[1]); const saturation = Number(hsl[2]) / 100; const lightness = Number(hsl[3]) / 100;
    if ([hue, saturation, lightness].every(Number.isFinite)) {
      const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
      const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1)); const m = lightness - chroma / 2;
      const sector = ((hue % 360) + 360) % 360;
      const [r, g, b] = sector < 60 ? [chroma, x, 0] : sector < 120 ? [x, chroma, 0] : sector < 180 ? [0, chroma, x] : sector < 240 ? [0, x, chroma] : sector < 300 ? [x, 0, chroma] : [chroma, 0, x];
      const rgb = { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, alpha: clamp(Number(hsl[4] ?? 1)) };
      return { hex: rgbToHex(rgb), rgb, outOfGamut: saturation < 0 || saturation > 1 || lightness < 0 || lightness > 1 };
    }
  }

  const cmyk = value.match(/^cmyk\(\s*([\d.+-]+)%?\s*,\s*([\d.+-]+)%?\s*,\s*([\d.+-]+)%?\s*,\s*([\d.+-]+)%?\s*\)$/);
  if (cmyk) {
    const channels = [cmyk[1], cmyk[2], cmyk[3], cmyk[4]].map((channel) => Number(channel) / 100);
    if (channels.every(Number.isFinite)) {
      const [c = 0, m = 0, y = 0, k = 0] = channels;
      const rgb = { r: 255 * (1 - clamp(c)) * (1 - clamp(k)), g: 255 * (1 - clamp(m)) * (1 - clamp(k)), b: 255 * (1 - clamp(y)) * (1 - clamp(k)), alpha: 1 };
      return { hex: rgbToHex(rgb), rgb, outOfGamut: channels.some((channel) => channel < 0 || channel > 1) };
    }
  }
  return null;
}

export function normalizeColor(input: string): string | null {
  return parseColor(input)?.hex ?? null;
}
