import { Result } from '@vectoria/shared';
import { createDefaultDocument, type ClipboardFragment, type DocumentModel } from '@vectoria/core';
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
    return Result.ok(result.data as unknown as ClipboardFragment);
  } catch {
    return Result.err('invalid_json');
  }
}

export function fragmentToSvg(fragment: ClipboardFragment): string {
  const base = createDefaultDocument({ width: 800, height: 600 });
  const artboardId = base.activeArtboardId;
  const layerId = base.activeLayerId;
  const doc: DocumentModel = {
    ...base,
    layers: {
      [layerId]: {
        ...base.layers[layerId]!,
        objectIds: fragment.objects.map((o) => o.id),
      },
    },
    objects: Object.fromEntries(fragment.objects.map((o) => [o.id, o])),
  };
  return exportArtboardToSvg(doc, artboardId);
}
