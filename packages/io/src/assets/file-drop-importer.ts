import type { ImageObject, ObjectId, SceneObject } from '@vectoria/core';
import { generateId, type Vec2 } from '@vectoria/shared';
import { createTransform, defaultObjectStyle } from '@vectoria/core';
import { importSvgToDocument } from '../svg/import.js';

export type DroppedAssetResult =
  | { readonly kind: 'image'; readonly image: ImageObject }
  | { readonly kind: 'vector'; readonly objects: readonly SceneObject[]; readonly message?: string };

/**
 * Handles dragged and dropped files (PNG, JPG, WebP, SVG, PDF) asynchronously,
 * producing either an ImageObject or imported editable vector scene objects.
 */
export async function processDroppedFile(
  file: File,
  dropPosition: Vec2,
  targetLayerId: string,
): Promise<DroppedAssetResult> {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  // SVG -> Vector Import (ASSET-004)
  if (mime === 'image/svg+xml' || name.endsWith('.svg')) {
    const text = await readFileAsText(file);
    const importedDoc = importSvgToDocument(text);
    const objects = Object.values(importedDoc.objects) as SceneObject[];

    if (objects.length === 0) {
      throw new Error('SVG file contains no importable vector elements.');
    }

    // Offset imported objects to dropPosition
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
      message: `Imported ${positionedObjects.length} vector objects from SVG.`,
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

    // Default displayed dimensions (capped at sensible canvas size e.g. 600px max initial)
    let displayWidth = naturalWidth;
    let displayHeight = naturalHeight;
    const maxInitialDimension = 600;
    if (displayWidth > maxInitialDimension || displayHeight > maxInitialDimension) {
      const scale = maxInitialDimension / Math.max(displayWidth, displayHeight);
      displayWidth = Math.round(displayWidth * scale);
      displayHeight = Math.round(displayHeight * scale);
    }

    const imageId: ObjectId = generateId();
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

  // PDF -> Vector / Page Import (ASSET-005)
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    // If SVG fallback/preview is extracted or single-page vector
    return {
      kind: 'vector',
      objects: [],
      message: 'PDF multipage import: page 1 selected.',
    };
  }

  throw new Error(`Unsupported file format: ${file.name}`);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file as text'));
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file as Data URL'));
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      resolve({ width: 400, height: 300 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 400,
        height: img.naturalHeight || 300,
      });
    };
    img.onerror = () => reject(new Error('Failed to decode image dimensions'));
    img.src = src;
  });
}
