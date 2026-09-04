import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentModel, SelectionState } from '@vectoria/core';
import {
  ExportJobRunner,
  type ExportJob,
  type ExportRequest,
  resolveExportRect,
  exportRegionToSvg,
  rasterizeSvgToBlob,
  optimizeSvg,
  exportDocToPdf,
  downloadBlob,
} from '@vectoria/io';
import { resolveFileName } from './export-naming.js';

export interface UseExportControllerResult {
  readonly jobs: readonly ExportJob[];
  readonly activeJob: ExportJob | undefined;
  readonly isExporting: boolean;
  startExport: (request: ExportRequest) => string;
  startBatchExport: (requests: readonly ExportRequest[]) => readonly string[];
  cancelExport: (jobId: string) => void;
  clearCompletedJobs: () => void;
}

/**
 * Controller hook connecting UI components to the sequential ExportJobRunner.
 * Implements immutable document snapshotting (D7) and triggers browser file downloads on delivery.
 */
export function useExportController(
  doc: DocumentModel | null,
  selection: SelectionState,
): UseExportControllerResult {
  const runner = useMemo(() => new ExportJobRunner(), []);
  const [jobs, setJobs] = useState<readonly ExportJob[]>([]);
  const latestDocRef = useRef(doc);
  const selectionRef = useRef(selection);

  useEffect(() => {
    latestDocRef.current = doc;
    selectionRef.current = selection;
  });

  useEffect(() => {
    return runner.subscribe((nextJobs) => {
      setJobs(nextJobs);
    });
  }, [runner]);

  const activeJob = useMemo(
    () => jobs.find((j) => j.status === 'running' || j.status === 'queued'),
    [jobs],
  );

  const startExport = useCallback(
    (request: ExportRequest): string => {
      const snapshotDoc = latestDocRef.current;
      if (!snapshotDoc) {
        throw new Error('No active document available for export');
      }

      const activeArtboard = snapshotDoc.artboards[snapshotDoc.activeArtboardId];
      const targetArtboardId =
        request.target.kind === 'artboard' ? request.target.artboardId : snapshotDoc.activeArtboardId;
      const targetArtboard = snapshotDoc.artboards[targetArtboardId] ?? activeArtboard;

      return runner.enqueue({
        request,
        run: async (signal, onStage) => {
          onStage('serialize', 0.15);

          const { format, scale, quality, background, optimizeSvg: shouldOptimize, fileNameTemplate } =
            request.options;
          const rect = resolveExportRect(snapshotDoc, request.target, selectionRef.current);

          const fileName = resolveFileName(fileNameTemplate, {
            artboard: targetArtboard?.name,
            scale,
            format,
            ext: format === 'jpeg' ? 'jpg' : format,
          });

          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

          // SVG Export Pipeline (EXPORT-001, EXPORT-002)
          if (format === 'svg') {
            const rawSvg = exportRegionToSvg(snapshotDoc, rect, { background });
            onStage('encode', 0.7);
            const finalSvg = shouldOptimize ? optimizeSvg(rawSvg) : rawSvg;
            const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
            onStage('deliver', 1);
            downloadBlob(blob, fileName);
            return { blob, fileName };
          }

          // PDF Export Pipeline (EXPORT-012, EXPORT-013, EXPORT-014)
          if (format === 'pdf') {
            onStage('raster', 0.4);
            const artboardIds =
              request.target.kind === 'artboard'
                ? [request.target.artboardId]
                : snapshotDoc.artboardIds;

            const blob = await exportDocToPdf(snapshotDoc, {
              artboardIds,
              scale,
            });

            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            onStage('deliver', 1);
            downloadBlob(blob, fileName);
            return { blob, fileName };
          }

          // Raster Export Pipeline: PNG, JPEG, WebP (EXPORT-003..011)
          onStage('serialize', 0.3);
          const svg = exportRegionToSvg(snapshotDoc, rect, { background });

          onStage('raster', 0.6);
          const targetW = rect.width * scale;
          const targetH = rect.height * scale;

          const blob = await rasterizeSvgToBlob(svg, targetW, targetH, {
            format,
            quality,
            background,
          });

          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
          onStage('deliver', 1);
          downloadBlob(blob, fileName);
          return { blob, fileName };
        },
      });
    },
    [runner],
  );

  const startBatchExport = useCallback(
    (requests: readonly ExportRequest[]): readonly string[] => {
      return requests.map((req) => startExport(req));
    },
    [startExport],
  );

  const cancelExport = useCallback(
    (jobId: string) => {
      runner.cancel(jobId);
    },
    [runner],
  );

  const clearCompletedJobs = useCallback(() => {
    runner.clearCompleted();
  }, [runner]);

  return {
    jobs,
    activeJob,
    isExporting: Boolean(activeJob),
    startExport,
    startBatchExport,
    cancelExport,
    clearCompletedJobs,
  };
}
