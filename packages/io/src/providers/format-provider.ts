import type { DocumentModel, SceneObject } from '@vectoria/core';
import type { ImportReport } from '@vectoria/core';

export interface ProviderImportOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (stage: 'read' | 'validate' | 'sanitize' | 'parse' | 'report', ratio: number) => void;
}

export type ProviderResult =
  | { status: 'ok'; document: DocumentModel; report: ImportReport }                       // replace (open file)
  | { status: 'ok-partial'; objects: readonly SceneObject[]; report: ImportReport }        // append (drop/clipboard)
  | { status: 'unsupported'; report: ImportReport };                                       // honest, z guidance

/** Capability boundary for external formats. UI never learns the implementation
 *  (ADR-008 pkt 4); heavy providers run their own workers (epic invariant). */
export interface FormatProvider {
  readonly id: string;
  readonly label: string;
  canImport(file: { name: string; type: string }): boolean;
  import(file: File, options?: ProviderImportOptions): Promise<ProviderResult>;
}

export class FormatProviderRegistry {
  private providers: FormatProvider[] = [];
  register(provider: FormatProvider): void { this.providers.push(provider); }
  resolve(file: { name: string; type: string }): FormatProvider | null {
    return this.providers.find((provider) => provider.canImport(file)) ?? null;
  }
}
