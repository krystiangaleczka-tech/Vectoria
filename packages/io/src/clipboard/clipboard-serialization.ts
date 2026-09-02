import { Result } from '@vectoria/shared';
import type { ClipboardFragment } from '@vectoria/core';
import { ClipboardFragmentSchema } from './clipboard-schema.js';
import { exportArtboardToSvg } from '../svg/export.js';

export type ClipboardParseError = 'invalid_json' | 'validation_failed';

export function serializeFragment(fragment: ClipboardFragment): string {
  return JSON.stringify(fragment);
}

export function deserializeFragment(json: string): Result<ClipboardFragment, ClipboardParseError> {
  try {
    const parsed = JSON.parse(json);
    const result = ClipboardFragmentSchema.safeParse(parsed);
    if (!result.success) {
      return Result.err('validation_failed');
    }
    return Result.ok(result.data as any as ClipboardFragment);
  } catch {
    return Result.err('invalid_json');
  }
}

export function fragmentToSvg(fragment: ClipboardFragment): string {
  const doc: import('@vectoria/core').DocumentModel = {
    schemaVersion: 1 as const,
    id: 'temp',
    artboards: { tempArtboard: { id: 'tempArtboard', x: 0, y: 0, width: 800, height: 600, background: { type: 'color', color: '#ffffff' }, name: 'Temp' } },
    activeArtboardId: 'tempArtboard',
    layerIds: ['layer1'],
    layers: {
      layer1: { id: 'layer1', name: 'Layer 1', visible: true, locked: false, objectIds: fragment.objects.map(o => o.id) }
    },
    objects: Object.fromEntries(fragment.objects.map(o => [o.id, o])),
  } as any as import('@vectoria/core').DocumentModel;
  return exportArtboardToSvg(doc, 'tempArtboard');
}
