import type { DocumentUnit } from './types.js';

export interface DocumentPreset {
  readonly id: string;
  readonly name: string;
  readonly category: 'screen' | 'print' | 'social' | 'business' | 'custom';
  readonly width: number;
  readonly height: number;
  readonly unit: DocumentUnit;
  readonly defaultName?: string;
}

export const DOCUMENT_PRESETS: readonly DocumentPreset[] = [
  { id: 'screen-1920', name: 'Screen · 1920 × 1080', category: 'screen', width: 1920, height: 1080, unit: 'px', defaultName: 'Screen 1920 × 1080' },
  { id: 'social-square', name: 'Social · Square', category: 'social', width: 1080, height: 1080, unit: 'px', defaultName: 'Social Square' },
  { id: 'social-story', name: 'Social · Story', category: 'social', width: 1080, height: 1920, unit: 'px', defaultName: 'Social Story' },
  { id: 'a4-portrait', name: 'A4 · Portrait', category: 'print', width: 210, height: 297, unit: 'mm', defaultName: 'A4 Portrait' },
  { id: 'a4-landscape', name: 'A4 · Landscape', category: 'print', width: 297, height: 210, unit: 'mm', defaultName: 'A4 Landscape' },
  { id: 'a3-portrait', name: 'A3 · Portrait', category: 'print', width: 297, height: 420, unit: 'mm', defaultName: 'A3 Portrait' },
  { id: 'a3-landscape', name: 'A3 · Landscape', category: 'print', width: 420, height: 297, unit: 'mm', defaultName: 'A3 Landscape' },
  { id: 'business-card', name: 'Business card', category: 'business', width: 90, height: 50, unit: 'mm', defaultName: 'Business card' },
  { id: 'custom', name: 'Custom', category: 'custom', width: 1920, height: 1080, unit: 'px' },
];

export interface ShapePreset {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly props: Record<string, unknown>;
}

export const SHAPE_PRESETS: readonly ShapePreset[] = [
  { id: 'triangle', type: 'polygon', name: 'Triangle', props: { sides: 3 } },
  { id: 'diamond', type: 'polygon', name: 'Diamond', props: { sides: 4, rotate45: true } },
  { id: 'star-5', type: 'star', name: 'Star 5-point', props: { points: 5, innerRatio: 0.5 } },
  { id: 'donut', type: 'ring', name: 'Donut', props: { innerRatio: 0.5 } },
  { id: 'speech-bubble', type: 'callout', name: 'Speech Bubble', props: { tailTipOffset: { x: 20, y: 30 }, tailBaseRatio: 0.2 } },
];

