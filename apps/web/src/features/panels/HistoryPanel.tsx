import React from 'react';
import type { HistoryEntry } from '@vectoria/core';
import type { DocumentVersion } from '@vectoria/io';

export interface HistoryPanelProps {
  entries: readonly HistoryEntry[];
  cursor: number;
  onJump: (cursor: number) => void;
  versions?: readonly DocumentVersion[];
  onSaveVersion?: (name: string) => void;
  onRestoreVersion?: (version: DocumentVersion) => void;
  isDirty?: boolean;
}

const formatTimestamp = (timestamp: string): string => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ entries, cursor, onJump, versions = [], onSaveVersion, onRestoreVersion, isDirty = false }) => {
  const [name, setName] = React.useState('');
  const [versionToRestore, setVersionToRestore] = React.useState<DocumentVersion | null>(null);

  const confirmRestore = () => {
    if (!versionToRestore || !onRestoreVersion) return;
    onRestoreVersion(versionToRestore);
    setVersionToRestore(null);
  };

  return (
  <section className="dock-panel-content history-panel" data-testid="history-panel" aria-label="Historia">
    <div className="panel-section-heading"><span>Historia poleceń</span><span className="panel-count">{entries.length}{isDirty ? ' (niezapisane)' : ''}</span></div>
    {entries.length === 0 ? <div className="panel-empty-state"><strong>Historia jest pusta</strong><span>Operacje dokumentu pojawią się tutaj.</span></div> : (
      <ol className="history-list" aria-label="Wykonane polecenia">
        <li className={cursor === -1 ? 'is-current' : ''}>
          <span className="history-marker" aria-hidden="true" />
          <button type="button" className="history-entry-button" aria-current={cursor === -1 ? 'step' : undefined} onClick={() => onJump(-1)}>Stan początkowy</button>
          {cursor === -1 && <small>aktualnie</small>}
        </li>
        {entries.map((entry, index) => (
          <li key={entry.id} className={index === cursor ? 'is-current' : ''}>
            <span className="history-marker" aria-hidden="true" />
            <button type="button" className="history-entry-button" aria-current={index === cursor ? 'step' : undefined} onClick={() => onJump(index)}>
              <span>{entry.label}</span><small>{formatTimestamp(entry.timestamp)}</small>
            </button>
            {index === cursor && <small>aktualnie</small>}
          </li>
        ))}
      </ol>
    )}
    <p className="panel-note">Wybierz krok, aby przejść do stanu dokumentu. Nowa operacja po skoku odcina gałąź ponawiania.</p>
    {onSaveVersion && onRestoreVersion && <section className="versions-section" aria-label="Wersje dokumentu">
      <div className="panel-section-heading"><span>Wersje dokumentu</span><span className="panel-count">{versions.length}</span></div>
      <form className="version-save-form" onSubmit={(event) => { event.preventDefault(); if (name.trim()) { onSaveVersion(name); setName(''); } }}>
        <input aria-label="Nazwa wersji" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nazwa wersji" maxLength={120} />
        <button type="submit" disabled={!name.trim()}>Zapisz</button>
      </form>
      <ul className="version-list">{versions.map((version) => <li key={version.id}><span><strong>{version.name}</strong><small>{new Date(version.document.savedAt).toLocaleString()}</small></span><button type="button" data-testid={`restore-version-btn-${version.id}`} onClick={() => setVersionToRestore(version)}>Przywróć</button></li>)}</ul>
    </section>}

    {/* Restore Confirmation Dialog */}
    {versionToRestore && (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="restore-dialog-title"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}
      >
        <div
          data-testid="version-restore-modal"
          style={{
            width: '340px',
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-panel, #161922)',
            border: '1px solid var(--color-border-subtle, #374151)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h4 id="restore-dialog-title" style={{ margin: 0, fontSize: '15px', color: 'var(--color-warning, #f59e0b)' }}>
            Przywrócić wersję dokumentu?
          </h4>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.4, color: 'var(--color-text, #f3f4f6)' }}>
            Bieżący stan dokumentu zostanie zastąpiony wersją <strong>„{versionToRestore.name}”</strong>. Zmianę będzie można cofnąć poleceniem Undo.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setVersionToRestore(null)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: '#9ca3af',
                border: '1px solid #374151',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Anuluj
            </button>
            <button
              type="button"
              data-testid="confirm-restore-version-btn"
              onClick={confirmRestore}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                backgroundColor: 'var(--color-primary, #6366f1)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Przywróć
            </button>
          </div>
        </div>
      </div>
    )}
  </section>
  );
};
