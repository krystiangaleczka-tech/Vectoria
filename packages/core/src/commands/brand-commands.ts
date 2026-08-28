import type { BrandKit, DocumentModel } from '../model/types.js';
import type { Command } from './command.js';

/**
 * Updates document Brand Kit assets (logos, brand color palettes, brand fonts, brand symbols).
 */
export class UpdateBrandKitCommand implements Command {
  readonly type = 'update-brand-kit';
  readonly description = 'Update brand kit';
  private previousBrandKit: BrandKit | undefined;

  constructor(private readonly brandKitUpdate: Partial<BrandKit>) {}

  execute(doc: DocumentModel): DocumentModel {
    this.previousBrandKit = doc.brandKit;

    const nextBrandKit: BrandKit = {
      ...(doc.brandKit ?? {}),
      ...this.brandKitUpdate,
    };

    return {
      ...doc,
      brandKit: nextBrandKit,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    return {
      ...doc,
      brandKit: this.previousBrandKit,
      updatedAt: new Date().toISOString(),
    };
  }
}
