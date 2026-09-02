import { z } from 'zod';
import { SceneObjectSchema } from '../schema/document-v1.js';

export const ClipboardFragmentSchema = z.object({
  schemaVersion: z.literal(1),
  objects: z.array(SceneObjectSchema).max(200, 'Too many objects in clipboard (max 200)'),
  sourceArtboardId: z.string().optional(),
  sourceWorldRect: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }).optional(),
});
