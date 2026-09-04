import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, NumberInput } from '@vectoria/ui';
import type { DocumentModel, SelectionState } from '@vectoria/core';
import type { ExportFormat, ExportJob, ExportRequest, ExportTarget } from '@vectoria/io';
import { resolveExportRect, EXPORT_MEMORY_LIMITS } from '@vectoria/io';

export interface ExportDialogProps {
  doc: DocumentModel;
  selection: SelectionState;
  activeJob?: ExportJob;
  onClose: () => void;
  onExport: (request: ExportRequest) => void;
  onBatchExport: (requests: readonly ExportRequest[]) => void;
  onCancelJob: (jobId: string) => void;
}

const focusable = 'button:not([disabled]), input:not([disabled]), select:not([disabled])';

export const ExportDialog: React.FC<ExportDialogProps> = ({
  doc,
  selection,
  activeJob,
  onClose,
  onExport,
  onBatchExport,
  onCancelJob,
}) => {
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  // Target state
  const [targetKind, setTargetKind] = useState<'artboard' | 'selection' | 'area'>('artboard');
  const [selectedArtboardId, setSelectedArtboardId] = useState<string>(doc.activeArtboardId);
  const [areaRect, setAreaRect] = useState({ x: 0, y: 0, width: 800, height: 600 });

  // Format state
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scalePreset, setScalePreset] = useState<'1' | '2' | '3' | 'custom'>('1');
  const [customScale, setCustomScale] = useState<number>(1);
  const [quality, setQuality] = useState<number>(0.85);
  const [backgroundType, setBackgroundType] = useState<'transparent' | 'artboard' | 'custom'>('transparent');
  const [customBgColor, setCustomBgColor] = useState<string>('#ffffff');
  const [optimizeSvg, setOptimizeSvg] = useState<boolean>(true);
  const [pdfAllArtboards, setPdfAllArtboards] = useState<boolean>(false);
  const [pdfBleed, setPdfBleed] = useState<number>(0);
  const [pdfCropMarks, setPdfCropMarks] = useState<boolean>(false);

  // Export for Screens batch mode
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const batchVariants: Array<{ format: ExportFormat; scale: number }> = useMemo(
    () => [
      { format: 'png', scale: 1 },
      { format: 'png', scale: 2 },
      { format: 'svg', scale: 1 },
    ],
    [],
  );

  const effectiveScale = scalePreset === 'custom' ? customScale : Number(scalePreset);

  const hasSelection = selection.objectIds.length > 0;

  // Resolve target rect to display preview dimensions
  const resolvedTarget: ExportTarget = useMemo(() => {
    if (targetKind === 'selection') {
      return { kind: 'selection' };
    }
    if (targetKind === 'area') {
      return { kind: 'area', rect: areaRect };
    }
    return { kind: 'artboard', artboardId: selectedArtboardId };
  }, [targetKind, selectedArtboardId, areaRect]);

  const targetBounds = useMemo(() => {
    try {
      return resolveExportRect(doc, resolvedTarget, selection);
    } catch {
      return null;
    }
  }, [doc, resolvedTarget, selection]);

  // Dimensions & Memory Guard Check
  const outputPixels = targetBounds
    ? targetBounds.width * effectiveScale * (targetBounds.height * effectiveScale)
    : 0;

  const isMemoryExceeded = outputPixels > EXPORT_MEMORY_LIMITS.maxPixels;

  // File size estimate (EXPORT-022)
  const estimatedSizeText = useMemo(() => {
    if (!targetBounds || isMemoryExceeded) return '—';
    const totalPx = outputPixels;
    if (format === 'svg') {
      const objCount = Object.keys(doc.objects).length;
      const kb = Math.max(2, Math.round(objCount * 0.45));
      return `~${kb} KB`;
    }
    if (format === 'pdf' || format === 'ai') {
      const pageCount = pdfAllArtboards ? doc.artboardIds.length : 1;
      const mb = Math.max(0.1, (totalPx * 0.0000004 * pageCount));
      return `~${mb.toFixed(1)} MB`;
    }
    if (format === 'cdr') {
      const objCount = Object.keys(doc.objects).length;
      const kb = Math.max(5, Math.round(objCount * 0.6));
      return `~${kb} KB`;
    }
    if (format === 'jpeg') {
      const kb = Math.round((totalPx * 0.18 * quality) / 1024);
      return `~${Math.max(10, kb)} KB`;
    }
    if (format === 'webp') {
      const kb = Math.round((totalPx * 0.12 * quality) / 1024);
      return `~${Math.max(8, kb)} KB`;
    }
    // png
    const kb = Math.round((totalPx * 0.35) / 1024);
    return `~${Math.max(12, kb)} KB`;
  }, [targetBounds, isMemoryExceeded, outputPixels, format, doc, quality, pdfAllArtboards]);

  // Keyboard navigation & Focus Trap
  useEffect(() => {
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>(focusable);
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (activeJob) {
          onCancelJob(activeJob.id);
        } else {
          onClose();
        }
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const elements = [...dialog.querySelectorAll<HTMLElement>(focusable)];
      if (elements.length === 0) return;
      const firstEl = elements[0]!;
      const lastEl = elements[elements.length - 1]!;
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [onClose, activeJob, onCancelJob]);

  // Trigger export
  const handlePerformExport = () => {
    if (isMemoryExceeded || !targetBounds) return;

    let backgroundVal: string | 'transparent' | undefined = undefined;
    if (backgroundType === 'custom') {
      backgroundVal = customBgColor;
    } else if (backgroundType === 'artboard') {
      const artboard = doc.artboards[selectedArtboardId];
      backgroundVal = artboard?.background?.type === 'color' ? artboard.background.color : 'transparent';
    } else {
      backgroundVal = format === 'jpeg' ? '#ffffff' : 'transparent';
    }

    if (batchMode) {
      const requests: ExportRequest[] = batchVariants.map((v) => ({
        target: resolvedTarget,
        options: {
          format: v.format,
          scale: v.scale,
          quality,
          background: backgroundVal,
          optimizeSvg,
          fileNameTemplate: '{artboard}@{scale}x.{ext}',
        },
      }));
      onBatchExport(requests);
      return;
    }

    const request: ExportRequest = {
      target: resolvedTarget,
      options: {
        format,
        scale: effectiveScale,
        quality,
        background: backgroundVal,
        optimizeSvg,
        fileNameTemplate: '{artboard}.{ext}',
      },
    };

    onExport(request);
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !activeJob) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        data-testid="export-dialog"
      >
        <header className="dialog-header">
          <div>
            <p className="dialog-eyebrow">Eksport</p>
            <h2 id="export-dialog-title">Eksportuj zasoby</h2>
            <p className="dialog-description">
              Pobierz projekt w formacie wektorowym lub rastrowym bez blokowania pracy edytora.
            </p>
          </div>
          <button
            type="button"
            className="dialog-close"
            aria-label="Zamknij"
            onClick={onClose}
            disabled={Boolean(activeJob)}
          >
            ×
          </button>
        </header>

        {/* Section 1: Target Selector */}
        <div className="export-section">
          <div className="dialog-field-heading">
            <span>Obszar eksportu</span>
            {targetBounds && (
              <span className="dialog-field-hint">
                {Math.round(targetBounds.width)} × {Math.round(targetBounds.height)} px
              </span>
            )}
          </div>
          <div className="export-target-segmented" role="radiogroup" aria-label="Obszar eksportu">
            <button
              type="button"
              role="radio"
              aria-checked={targetKind === 'artboard'}
              className={targetKind === 'artboard' ? 'is-selected' : ''}
              onClick={() => setTargetKind('artboard')}
            >
              Artboard
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={targetKind === 'selection'}
              className={targetKind === 'selection' ? 'is-selected' : ''}
              onClick={() => setTargetKind('selection')}
              disabled={!hasSelection}
              title={hasSelection ? 'Zaznaczone obiekty' : 'Brak zaznaczonych obiektów'}
            >
              Zaznaczenie {!hasSelection && '(brak)'}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={targetKind === 'area'}
              className={targetKind === 'area' ? 'is-selected' : ''}
              onClick={() => setTargetKind('area')}
            >
              Własny obszar
            </button>
          </div>

          {targetKind === 'artboard' && (
            <label className="dialog-label export-subfield">
              Wybierz artboard
              <select
                value={selectedArtboardId}
                onChange={(e) => setSelectedArtboardId(e.target.value)}
              >
                {doc.artboardIds.map((id) => (
                  <option key={id} value={id}>
                    {doc.artboards[id]?.name || id} ({doc.artboards[id]?.width} × {doc.artboards[id]?.height})
                  </option>
                ))}
              </select>
            </label>
          )}

          {targetKind === 'area' && (
            <div className="property-grid export-subfield">
              <NumberInput
                label="X"
                value={areaRect.x}
                onChange={(x) => setAreaRect((r) => ({ ...r, x }))}
              />
              <NumberInput
                label="Y"
                value={areaRect.y}
                onChange={(y) => setAreaRect((r) => ({ ...r, y }))}
              />
              <NumberInput
                label="W"
                min={1}
                value={areaRect.width}
                onChange={(w) => setAreaRect((r) => ({ ...r, width: Math.max(1, w) }))}
              />
              <NumberInput
                label="H"
                min={1}
                value={areaRect.height}
                onChange={(h) => setAreaRect((r) => ({ ...r, height: Math.max(1, h) }))}
              />
            </div>
          )}
        </div>

        {/* Section 2: Format Selector */}
        <div className="export-section">
          <div className="dialog-field-heading">
            <span>Format pliku</span>
            <label className="export-batch-toggle">
              <input
                type="checkbox"
                checked={batchMode}
                onChange={(e) => setBatchMode(e.target.checked)}
              />
              <span>Export for Screens (batch)</span>
            </label>
          </div>

          {!batchMode ? (
            <div className="export-format-tabs" role="tablist">
              {(['png', 'svg', 'pdf', 'ai', 'cdr', 'jpeg', 'webp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  role="tab"
                  aria-selected={format === fmt}
                  className={`export-tab ${format === fmt ? 'is-active' : ''}`}
                  onClick={() => setFormat(fmt)}
                >
                  {fmt === 'ai' ? 'AI' : fmt === 'cdr' ? 'CDR' : fmt.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <div className="export-batch-list">
              <p className="dialog-field-hint">
                Zostaną wygenerowane pliki dla zestawu: PNG 1x, PNG 2x oraz SVG ze spójnym nazewnictwem.
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Format-Specific Settings */}
        {!batchMode && (
          <div className="export-section">
            {/* Scale Options for Raster & PDF */}
            {format !== 'svg' && (
              <div className="export-scale-row">
                <span className="export-scale-label">Skala:</span>
                <div className="export-scale-presets">
                  {(['1', '2', '3', 'custom'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`scale-preset-btn ${scalePreset === p ? 'is-selected' : ''}`}
                      onClick={() => setScalePreset(p)}
                    >
                      {p === 'custom' ? 'Własna' : `${p}x`}
                    </button>
                  ))}
                </div>
                {scalePreset === 'custom' && (
                  <div style={{ width: 90 }}>
                    <NumberInput
                      label="x"
                      min={0.1}
                      max={16}
                      step={0.5}
                      value={customScale}
                      onChange={(v) => setCustomScale(Math.max(0.1, v))}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Quality Slider for JPEG / WebP */}
            {(format === 'jpeg' || format === 'webp') && (
              <div className="export-quality-row">
                <label className="dialog-label">
                  Jakość kompresji ({Math.round(quality * 100)}%)
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                  />
                </label>
              </div>
            )}

            {/* SVG Optimization */}
            {format === 'svg' && (
              <label className="export-checkbox-row">
                <input
                  type="checkbox"
                  checked={optimizeSvg}
                  onChange={(e) => setOptimizeSvg(e.target.checked)}
                />
                <span>Zoptymalizowany SVG (usuń metadane edytora, zaokrąglij współrzędne)</span>
              </label>
            )}

            {/* PDF Multipage and Bleed Options */}
            {format === 'pdf' && (
              <div className="export-pdf-options">
                <label className="export-checkbox-row">
                  <input
                    type="checkbox"
                    checked={pdfAllArtboards}
                    onChange={(e) => setPdfAllArtboards(e.target.checked)}
                  />
                  <span>Eksportuj wszystkie artboardy jako osobne strony</span>
                </label>
                <div className="property-grid" style={{ marginTop: 8 }}>
                  <NumberInput
                    label="Spad (pt)"
                    min={0}
                    max={50}
                    value={pdfBleed}
                    onChange={(b) => setPdfBleed(Math.max(0, b))}
                  />
                  <label className="export-checkbox-row" style={{ marginTop: 14 }}>
                    <input
                      type="checkbox"
                      checked={pdfCropMarks}
                      onChange={(e) => setPdfCropMarks(e.target.checked)}
                    />
                    <span>Znaczniki cięcia (Crop marks)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Background Policy */}
            <div className="export-bg-row">
              <label className="dialog-label">
                Tło eksportu
                <select
                  value={backgroundType}
                  onChange={(e) => setBackgroundType(e.target.value as 'transparent' | 'artboard' | 'custom')}
                >
                  {format !== 'jpeg' && <option value="transparent">Przezroczyste</option>}
                  <option value="artboard">Kolor artboardu</option>
                  <option value="custom">Własny kolor</option>
                </select>
              </label>
              {backgroundType === 'custom' && (
                <input
                  type="color"
                  value={customBgColor}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  className="export-color-input"
                  title="Wybierz kolor tła"
                />
              )}
            </div>
          </div>
        )}

        {/* Section 4: Summary & Size Estimation */}
        <div className="export-summary-box">
          <div className="export-summary-metric">
            <span className="metric-label">Docelowe wymiary:</span>
            <span className="metric-value">
              {targetBounds
                ? `${Math.round(targetBounds.width * effectiveScale)} × ${Math.round(targetBounds.height * effectiveScale)} px`
                : '—'}
            </span>
          </div>
          <div className="export-summary-metric">
            <span className="metric-label">Szacowany rozmiar:</span>
            <span className="metric-value">{estimatedSizeText}</span>
          </div>
        </div>

        {/* Memory Guard Warning */}
        {isMemoryExceeded && (
          <div className="dialog-validation has-error" role="alert">
            <span aria-hidden="true">!</span>
            <span>
              Wymiary przekraczają bezpieczny limit 100 MP ({Math.round(outputPixels / 1_000_000)} MP).
              Wybierz mniejszą skalę lub ogranicz obszar eksportu.
            </span>
          </div>
        )}

        {/* Active Progress & Cancel Bar */}
        {activeJob && (
          <div className="export-progress-panel" aria-live="polite">
            <div className="progress-info">
              <span>
                {activeJob.stage === 'serialize' && 'Serializacja geometrii...'}
                {activeJob.stage === 'raster' && 'Renderowanie rastra...'}
                {activeJob.stage === 'encode' && 'Kompresja formatu...'}
                {activeJob.stage === 'deliver' && 'Pobieranie pliku...'}
                {!activeJob.stage && 'Przetwarzanie eksportu...'}
              </span>
              <span>{Math.round((activeJob.progress ?? 0.5) * 100)}%</span>
            </div>
            <div className="progress-bar-track" role="progressbar" aria-valuenow={Math.round((activeJob.progress ?? 0.5) * 100)}>
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.max(10, Math.round((activeJob.progress ?? 0.5) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Notification */}
        {activeJob?.status === 'error' && (
          <div className="dialog-validation has-error" role="alert">
            <span aria-hidden="true">!</span>
            <span>{activeJob.error?.message || 'Błąd podczas generowania pliku.'}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="dialog-actions">
          {activeJob ? (
            <Button variant="danger" size="sm" onClick={() => onCancelJob(activeJob.id)}>
              Anuluj eksport
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Zamknij
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isMemoryExceeded || !targetBounds}
                onClick={handlePerformExport}
              >
                {batchMode ? 'Eksportuj paczkę (3 pliki)' : 'Eksportuj'}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
