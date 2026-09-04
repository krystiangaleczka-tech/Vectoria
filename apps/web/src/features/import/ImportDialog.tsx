import React from 'react';
import type { ImportReport } from '@vectoria/core';
import { Dialog, Button } from '@vectoria/ui';

interface ImportDialogProps {
  isOpen: boolean;
  stage: 'idle' | 'read' | 'validate' | 'sanitize' | 'parse' | 'report';
  fileName: string | null;
  report: ImportReport | null;
  error: Error | null;
  onCommit: () => void;
  onCancel: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  stage,
  fileName,
  report,
  error,
  onCommit,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isWorking = stage !== 'idle' && stage !== 'report';
  const hasError = !!error;
  const isReport = stage === 'report' && !!report;

  return (
    <Dialog
      labelledBy="import-dialog-title"
      onClose={onCancel}
      width={640}
      testId="import-dialog"
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 id="import-dialog-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
          Import {fileName ? `"${fileName}"` : ''}
        </h2>

        <div aria-live="polite" style={{ fontSize: '0.875rem' }}>
          {isWorking && <p>Wczytywanie: faza {stage}...</p>}
          {hasError && <p style={{ color: 'var(--color-danger, #ef4444)' }}>Błąd: {error.message}</p>}
        </div>

        {isReport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p>Raport ze zgodności pliku z edytorem:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div style={{ padding: '8px', border: '1px solid var(--color-border-subtle, #33332f)', borderRadius: 'var(--radius-sm, 4px)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{report.editable}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>W pełni edytowalne</div>
              </div>
              <div style={{ padding: '8px', border: '1px solid var(--color-border-subtle, #33332f)', borderRadius: 'var(--radius-sm, 4px)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{report.simplified}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Uproszczone</div>
              </div>
              <div style={{ padding: '8px', border: '1px solid var(--color-border-subtle, #33332f)', borderRadius: 'var(--radius-sm, 4px)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: report.flattened > 0 ? 'var(--color-warning, #f59e0b)' : 'inherit' }}>{report.flattened}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Spłaszczone</div>
              </div>
              <div style={{ padding: '8px', border: '1px solid var(--color-border-subtle, #33332f)', borderRadius: 'var(--radius-sm, 4px)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: report.unsupported > 0 ? 'var(--color-danger, #ef4444)' : 'inherit' }}>{report.unsupported}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Nieobsługiwane</div>
              </div>
            </div>

            {report.entries.length > 0 && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border-subtle, #33332f)', borderRadius: 'var(--radius-sm, 4px)', padding: '8px' }}>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem' }}>
                  {report.entries.map((entry, idx) => (
                    <li key={idx} style={{ color: entry.category === 'unsupported' ? 'var(--color-danger, #ef4444)' : 'var(--color-warning, #f59e0b)' }}>
                      <strong>{entry.category.toUpperCase()}:</strong> {entry.message} ({entry.code})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            Anuluj
          </Button>
          {!isWorking && !hasError && (
            <Button
              variant="primary"
              onClick={onCommit}
              disabled={report?.unsupported === (report?.editable || 0) + (report?.simplified || 0) + (report?.flattened || 0) + (report?.unsupported || 0) && (report?.unsupported || 0) > 0}
            >
              Kontynuuj Import
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};
