import type { ColorPalette } from '@vectoria/core';
import { z } from 'zod';
import { ColorPaletteSchema } from '../schema/document-v1.js';

const DB_NAME = 'vectoria_db';
const DB_VERSION = 3;
const STORE_NAME = 'palettes';
const KEY = 'palette_library';

function openPaletteDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB is not supported in this environment')); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('documents')) request.result.createObjectStore('documents');
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open palette IndexedDB'));
  });
}

/** Load reusable user and saved palettes without touching active document state. */
export async function loadPaletteLibrary(): Promise<readonly ColorPalette[]> {
  const db = await openPaletteDb();
  try {
    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(KEY);
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error ?? new Error('Failed to load palette library'));
    });
    return z.array(ColorPaletteSchema).parse(raw) as ColorPalette[];
  } finally { db.close(); }
}

/** Persist bounded reusable palettes in a separate local IndexedDB record. */
export async function savePaletteLibrary(palettes: readonly ColorPalette[]): Promise<void> {
  const parsed = z.array(ColorPaletteSchema).max(256).parse(palettes).filter((palette) => palette.scope === 'user' || palette.scope === 'saved');
  const db = await openPaletteDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(parsed, KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to save palette library'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Palette library transaction aborted'));
    });
  } finally { db.close(); }
}
