import type { ImageObject, SceneObject } from '@vectoria/core';
import { generateId, type Vec2 } from '@vectoria/shared';
import { createTransform, defaultObjectStyle } from '@vectoria/core';
import { importSvgWithReport } from '../svg/import.js';
import { sanitizeSvg } from '../svg/sanitizer.js';
import { importPdfPageAsImageObject } from './pdf-import-service.js';
import { importPdf } from '../pdf/pdf-vector-importer.js';

// ─── Limity bezpieczeństwa ────────────────────────────────────────────────────

/** Maksymalny rozmiar pliku: 50 MB */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Maksymalna liczba elementów wektorowych z jednego SVG */
const MAX_SVG_OBJECTS = 5_000;

// ─── Typy ─────────────────────────────────────────────────────────────────────

export type DroppedAssetResult =
  | { readonly kind: 'image'; readonly image: ImageObject; readonly message?: string }
  | { readonly kind: 'vector'; readonly objects: readonly SceneObject[]; readonly message?: string };

// ─── Główna funkcja ───────────────────────────────────────────────────────────

/**
 * Handles dragged and dropped files (PNG, JPG, WebP, SVG, PDF) asynchronously,
 * producing either an ImageObject or imported editable vector scene objects.
 * Validates file size, element count, and sanitizes SVG before processing.
 */
export async function processDroppedFile(
  file: File,
  dropPosition: Vec2,
  targetLayerId: string,
): Promise<DroppedAssetResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Plik jest za duży (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksymalny rozmiar to ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
    );
  }

  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  // SVG -> Vector Import (ASSET-004)
  if (mime === 'image/svg+xml' || name.endsWith('.svg')) {
    const text = await readFileAsText(file);
    const { text: sanitized } = sanitizeSvg(text);
    const { document: importedDoc, report } = importSvgWithReport(sanitized);
    const objects = Object.values(importedDoc.objects) as SceneObject[];

    if (objects.length === 0) {
      throw new Error('Plik SVG nie zawiera importowalnych elementów wektorowych.');
    }

    if (objects.length > MAX_SVG_OBJECTS) {
      throw new Error(
        `SVG zawiera zbyt wiele elementów (${objects.length}). Maksimum to ${MAX_SVG_OBJECTS}.`,
      );
    }

    const firstArtboard = Object.values(importedDoc.artboards)[0];
    const originX = firstArtboard ? firstArtboard.x : 0;
    const originY = firstArtboard ? firstArtboard.y : 0;

    const positionedObjects: SceneObject[] = objects.map((obj) => ({
      ...obj,
      id: generateId(),
      layerId: targetLayerId,
      transform: {
        ...obj.transform,
        position: {
          x: obj.transform.position.x - originX + dropPosition.x,
          y: obj.transform.position.y - originY + dropPosition.y,
        },
      },
    }));

    return {
      kind: 'vector',
      objects: positionedObjects,
      message: `Zaimportowano ${positionedObjects.length} obiektów wektorowych z SVG.` + (report.unsupported > 0 ? ` Pominięto ${report.unsupported} elementów nieobsługiwanych.` : ''),
    };
  }

  // Raster Images -> PNG (ASSET-001), JPG (ASSET-002), WebP (ASSET-003)
  if (
    mime.startsWith('image/') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp')
  ) {
    const dataUrl = await readFileAsDataUrl(file);
    const { width: naturalWidth, height: naturalHeight } = await getImageDimensions(dataUrl);

    let displayWidth = naturalWidth;
    let displayHeight = naturalHeight;
    const maxInitialDimension = 600;
    if (displayWidth > maxInitialDimension || displayHeight > maxInitialDimension) {
      const scale = maxInitialDimension / Math.max(displayWidth, displayHeight);
      displayWidth = Math.round(displayWidth * scale);
      displayHeight = Math.round(displayHeight * scale);
    }

    const imageId = generateId();
    const imageObject: ImageObject = {
      id: imageId,
      name: file.name.replace(/\.[^/.]+$/, ''),
      layerId: targetLayerId,
      visible: true,
      locked: false,
      type: 'image',
      transform: createTransform(dropPosition),
      style: {
        ...defaultObjectStyle,
        fill: { type: 'none' },
        stroke: null,
      },
      source: {
        type: 'embed',
        data: dataUrl,
        mimeType: file.type || 'image/png',
      },
      naturalWidth,
      naturalHeight,
      width: displayWidth,
      height: displayHeight,
    };

    return {
      kind: 'image',
      image: imageObject,
    };
  }

  // PDF -> Vector / Page Raster Import (ASSET-005 & IO-012)
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    const buffer = await readFileAsArrayBuffer(file);
    try {
      const vectorResult = await importPdf(buffer);
      if (vectorResult.objects.length > 0) {
        const offsetObjects = vectorResult.objects.map((obj) => ({
          ...obj,
          layerId: targetLayerId,
          transform: {
            ...obj.transform,
            position: {
              x: obj.transform.position.x + dropPosition.x,
              y: obj.transform.position.y + dropPosition.y,
            },
          },
        }));
        return {
          kind: 'vector',
          objects: offsetObjects,
          message: `Zaimportowano ${vectorResult.objects.length} elementów wektorowych z PDF`,
        };
      }
    } catch {
      // Fall back to raster import
    }

    const result = await importPdfPageAsImageObject(buffer, {
      dropPosition,
      targetLayerId,
      fileName: file.name,
      pageNumber: 1,
    });

    return {
      kind: 'image',
      image: result.image,
      message: result.message,
    };
  }

  throw new Error(`Nieobsługiwany format pliku: ${file.name}`);
}



// ─── Pomocnicze ───────────────────────────────────────────────────────────────

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Nie udało się odczytać pliku'));
      reader.readAsArrayBuffer(file);
    });
  }
  throw new Error('Środowisko nie obsługuje odczytu plików');
}

async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Nie udało się odczytać pliku jako tekst'));
      reader.readAsText(file);
    });
  }
  throw new Error('Środowisko nie obsługuje odczytu plików');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

async function readFileAsDataUrl(file: File): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Nie udało się odczytać pliku jako Data URL'));
      reader.readAsDataURL(file);
    });
  }
  if (typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const mime = file.type || 'image/png';
    return `data:${mime};base64,${base64}`;
  }
  throw new Error('Środowisko nie obsługuje odczytu plików');
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve({ width: 400, height: 300 });
      return;
    }
    const img = new Image();
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ width: img.naturalWidth || 400, height: img.naturalHeight || 300 });
      }
    }, 200);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({
          width: img.naturalWidth || 400,
          height: img.naturalHeight || 300,
        });
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ width: 400, height: 300 });
      }
    };
    img.src = src;
  });
}
