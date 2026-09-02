import { useState, useCallback, useRef } from 'react';
import type { FormatProviderRegistry, ProviderResult } from '@vectoria/io';
import type { DocumentModel, SceneObject, ImportReport } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';

export type ImportTarget = { mode: 'replace' } | { mode: 'append'; layerId: string; position: Vec2 };

export function useImportController(registry: FormatProviderRegistry) {
  const [stage, setStage] = useState<'idle' | 'read' | 'validate' | 'sanitize' | 'parse' | 'report'>('idle');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingRef = useRef<ProviderResult | null>(null);

  const start = useCallback(async (file: File) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    try {
      const provider = registry.resolve(file);
      if (!provider) throw new Error(`Nieobsługiwany format: ${file.name}`);
      setStage('read');
      const result = await provider.import(file, {
        signal: controller.signal,
        onProgress: (s) => setStage(s),
      });
      pendingRef.current = result;
      setReport(result.report);
      setStage('report'); // UI shows Compatibility Report
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // cancel → zero mutation
      setStage('idle');
      setError(err as Error);
    }
  }, [registry]);

  const commit = useCallback((helpers: { replaceDocument: (doc: DocumentModel) => void; appendObjects: (objects: readonly SceneObject[]) => void }) => {
    const result = pendingRef.current;
    if (!result) return;
    if (result.status === 'ok') helpers.replaceDocument(result.document);
    if (result.status === 'ok-partial') helpers.appendObjects(result.objects);
    pendingRef.current = null;
    setReport(null);
    setStage('idle');
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    pendingRef.current = null;
    setReport(null);
    setStage('idle');
    setError(null);
  }, []);

  return { stage, report, error, start, commit, cancel };
}
