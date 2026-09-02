import React from 'react';
import type { ImportReport } from '@vectoria/core';

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

  // Render logic for different stages
  // This uses standard html elements, replace with Radix UI / design system if available
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: 'var(--color-bg-panel, #ffffff)',
          color: 'var(--color-text, #111111)',
          borderRadius: 'var(--radius-lg, 8px)',
          padding: '24px',
          boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.1))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
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
              <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{report.editable}</div>
                <div style={{ fontSize: '0.75rem' }}>W pełni edytowalne</div>
              </div>
              <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{report.simplified}</div>
                <div style={{ fontSize: '0.75rem' }}>Uproszczone</div>
              </div>
              <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: report.flattened > 0 ? '#f59e0b' : 'inherit' }}>{report.flattened}</div>
                <div style={{ fontSize: '0.75rem' }}>Spłaszczone</div>
              </div>
              <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: report.unsupported > 0 ? '#ef4444' : 'inherit' }}>{report.unsupported}</div>
                <div style={{ fontSize: '0.75rem' }}>Nieobsługiwane</div>
              </div>
            </div>

            {report.entries.length > 0 && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px', padding: '8px' }}>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem' }}>
                  {report.entries.map((entry, idx) => (
                    <li key={idx} style={{ color: entry.category === 'unsupported' ? '#ef4444' : '#f59e0b' }}>
                      <strong>{entry.category.toUpperCase()}:</strong> {entry.message} ({entry.code})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', background: 'transparent' }}
          >
            Anuluj
          </button>
          {!isWorking && !hasError && (
            <button
              onClick={onCommit}
              disabled={report?.unsupported === (report?.editable || 0) + (report?.simplified || 0) + (report?.flattened || 0) + (report?.unsupported || 0) && (report?.unsupported || 0) > 0}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: 'var(--color-primary, #3b82f6)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Kontynuuj Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
