import * as pdfjsLib from 'pdfjs-dist';
import type { ImageObject } from '@vectoria/core';
import { createTransform, defaultObjectStyle } from '@vectoria/core';
import { generateId, type Vec2 } from '@vectoria/shared';

/**
 * Configures the pdf.js worker source from the host application.
 * The IO package must not hardcode a CDN URL: the worker asset has to be
 * bundled by the app build to keep the PWA fully offline-capable.
 */
export function configurePdfWorker(workerSrc: string): void {
  if (workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  }
}

export interface PdfDocumentInfo {
  readonly numPages: number;
  readonly title?: string;
}

export interface PdfPageRenderResult {
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
  readonly pageNumber: number;
  readonly numPages: number;
}

export interface PdfImportResult {
  readonly image: ImageObject;
  readonly numPages: number;
  readonly pageNumber: number;
  readonly message: string;
}

/**
 * Loads a PDF document and returns its metadata including page count.
 * Destroys the underlying pdf.js document to avoid leaking native resources.
 */
export async function getPdfDocumentInfo(data: ArrayBuffer | Uint8Array): Promise<PdfDocumentInfo> {
  const loadingTask = pdfjsLib.getDocument({
    data: data instanceof Uint8Array ? data : new Uint8Array(data),
    isEvalSupported: false,
    useSystemFonts: true,
  });

  try {
    const pdfDoc = await loadingTask.promise;
    let title: string | undefined;
    try {
      const metadata = await pdfDoc.getMetadata();
      const info = metadata?.info as Record<string, unknown> | undefined;
      if (info && typeof info.Title === 'string' && info.Title.trim()) {
        title = info.Title.trim();
      }
    } catch {
      // Ignore metadata read failure
    }

    return {
      numPages: pdfDoc.numPages,
      title,
    };
  } finally {
    try {
      await loadingTask.destroy();
    } catch {
      // Ignore destroy failure
    }
  }
}

/**
 * Renders a specific page of a PDF document to a raster data URL.
 * Throws a controlled error instead of returning a placeholder when the
 * environment cannot render, so callers never receive a silent empty image.
 */
export async function renderPdfPageToDataUrl(
  data: ArrayBuffer | Uint8Array,
  pageNumber: number = 1,
  scale: number = 1.5,
): Promise<PdfPageRenderResult> {
  const loadingTask = pdfjsLib.getDocument({
    data: data instanceof Uint8Array ? data : new Uint8Array(data),
    isEvalSupported: false,
    useSystemFonts: true,
  });

  try {
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const targetPageNumber = Math.max(1, Math.min(numPages, pageNumber));

    const page = await pdfDoc.getPage(targetPageNumber);
    const viewport = page.getViewport({ scale });

    if (typeof document === 'undefined') {
      throw new Error('Renderowanie PDF wymaga środowiska przeglądarki (DOM).');
    }

    const width = Math.round(viewport.width);
    const height = Math.round(viewport.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx || typeof canvas.toDataURL !== 'function') {
      throw new Error('Środowisko nie udostępnia kontekstu canvas wymaganego do renderowania PDF.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    try {
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      throw new Error('Nie udało się wyrenderować strony PDF.', { cause: err });
    }

    const dataUrl = canvas.toDataURL('image/png');

    return {
      dataUrl,
      width,
      height,
      pageNumber: targetPageNumber,
      numPages,
    };
  } finally {
    try {
      await loadingTask.destroy();
    } catch {
      // Ignore destroy failure
    }
  }
}

/**
 * Imports a designated page of a PDF document as an ImageObject on the artboard.
 * Explicit MVP: generates a raster ImageObject, avoiding fake vector representation.
 * Rendering failures propagate as thrown errors — no silent placeholder images.
 */
export async function importPdfPageAsImageObject(
  data: ArrayBuffer | Uint8Array,
  options: {
    pageNumber?: number;
    dropPosition: Vec2;
    targetLayerId: string;
    fileName?: string;
  },
): Promise<PdfImportResult> {
  const { pageNumber = 1, dropPosition, targetLayerId, fileName = 'Document.pdf' } = options;
  const rendered = await renderPdfPageToDataUrl(data, pageNumber);

  let displayWidth = rendered.width;
  let displayHeight = rendered.height;
  const maxInitialDimension = 800;
  if (displayWidth > maxInitialDimension || displayHeight > maxInitialDimension) {
    const s = maxInitialDimension / Math.max(displayWidth, displayHeight);
    displayWidth = Math.round(displayWidth * s);
    displayHeight = Math.round(displayHeight * s);
  }

  const cleanName = fileName.replace(/\.pdf$/i, '');
  const pageLabel = rendered.numPages > 1 ? ` (Strona ${rendered.pageNumber} z ${rendered.numPages})` : '';

  const imageObject: ImageObject = {
    id: generateId(),
    name: `${cleanName}${pageLabel}`,
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
      data: rendered.dataUrl,
      mimeType: 'image/png',
    },
    naturalWidth: rendered.width,
    naturalHeight: rendered.height,
    width: displayWidth,
    height: displayHeight,
  };

  const message = rendered.numPages > 1
    ? `Zaimportowano stronę ${rendered.pageNumber} z ${rendered.numPages} pliku PDF jako obraz rastrowy.`
    : 'Zaimportowano dokument PDF jako obraz rastrowy.';

  return {
    image: imageObject,
    numPages: rendered.numPages,
    pageNumber: rendered.pageNumber,
    message,
  };
}
