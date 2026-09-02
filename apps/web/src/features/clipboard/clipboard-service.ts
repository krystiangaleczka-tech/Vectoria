import { type ClipboardFragment } from '@vectoria/core';
import { serializeFragment, deserializeFragment, fragmentToSvg } from '@vectoria/io';

export const VECTORIA_MIME = 'application/x-vectoria-fragment';

/**
 * Copies the given fragment to the system clipboard.
 * Falls back to text/plain (JSON) and image/svg+xml for external apps.
 */
export async function copyToSystemClipboard(fragment: ClipboardFragment): Promise<void> {
  if (!navigator.clipboard?.write) {
    console.warn('[Vectoria] Clipboard API not supported');
    return;
  }

  try {
    const jsonStr = serializeFragment(fragment);
    const svgStr = fragmentToSvg(fragment);

    const textBlob = new Blob([jsonStr], { type: 'text/plain' });
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml' });

    // Not all browsers support custom MIME types. We'll use text/plain for the internal JSON.
    const items: Record<string, Blob> = {
      'text/plain': textBlob,
      'image/svg+xml': svgBlob,
    };

    await navigator.clipboard.write([new ClipboardItem(items)]);
  } catch (err) {
    console.error('[Vectoria] System clipboard write failed', err);
  }
}

/**
 * Tries to read a vectoria fragment from the system clipboard.
 */
export async function readFromSystemClipboard(): Promise<ClipboardFragment | null> {
  if (!navigator.clipboard?.read) return null;

  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      // First try to parse text/plain as Vectoria JSON
      if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain');
        const text = await blob.text();
        const result = deserializeFragment(text);
        if (result.ok) {
          return result.value;
        }
      }
      
      // If we supported custom web types we'd check them here.
    }
  } catch (err) {
    console.warn('[Vectoria] System clipboard read failed', err);
  }
  
  return null;
}
