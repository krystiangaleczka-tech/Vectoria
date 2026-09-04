import { z } from 'zod';

/** Supported export formats for the document and regional exports. */
export const EXPORT_FORMATS = ['svg', 'png', 'jpeg', 'webp', 'pdf', 'ai', 'cdr'] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number];

/** Schema validating the target region of an export job. */
export const ExportTargetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('artboard'),
    artboardId: z.string().min(1),
  }),
  z.object({
    kind: z.literal('selection'),
  }),
  z.object({
    kind: z.literal('area'),
    rect: z.object({
      x: z.number().finite(),
      y: z.number().finite(),
      width: z.number().positive(),
      height: z.number().positive(),
    }),
  }),
]);
export type ExportTarget = z.infer<typeof ExportTargetSchema>;

/** Schema validating user-configurable export parameters. */
export const ExportFormatOptionsSchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  scale: z.number().positive().max(16).default(1),
  quality: z.number().min(0).max(1).optional(),
  background: z.union([z.literal('transparent'), z.string().regex(/^#[0-9a-fA-F]{3,8}$/)]).optional(),
  optimizeSvg: z.boolean().default(false),
  fileNameTemplate: z.string().default('{artboard}.{ext}'),
});
export type ExportFormatOptions = z.infer<typeof ExportFormatOptionsSchema>;

/**
 * High-level export specification representing target geometry and format settings.
 */
export interface ExportRequest {
  readonly target: ExportTarget;
  readonly options: ExportFormatOptions;
}

export type ExportJobStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled';
export type ExportStage = 'serialize' | 'raster' | 'encode' | 'deliver';

/**
 * Representation of an active or completed export job in the sequential export queue.
 */
export interface ExportJob {
  readonly id: string;
  readonly status: ExportJobStatus;
  readonly stage?: ExportStage;
  readonly progress?: number;
  readonly error?: { code: string; message: string };
  readonly result?: { readonly blob: Blob; readonly fileName: string };
}

/**
 * Maximum safe memory limits for raster canvas allocations (approx. 400 MB RGBA at 100 MP).
 * Prevents mobile and low-memory browser crashes during high-scale rasterization.
 */
export const EXPORT_MEMORY_LIMITS = {
  maxPixels: 100_000_000,
  maxSidePx: 16_384,
} as const;
