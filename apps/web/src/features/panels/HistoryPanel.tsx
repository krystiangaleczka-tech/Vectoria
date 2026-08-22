import React from 'react';
import type { HistoryEntry } from '@vectoria/core';

export interface HistoryPanelProps {
  entries: readonly HistoryEntry[];
  cursor: number;
  onJump: (cursor: number) => void;
}

const formatTimestamp = (timestamp: string): string => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ entries, cursor, onJump }) => (
  <section className="dock-panel-content history-panel" data-testid="history-panel" aria-label="Historia">
    <div className="panel-section-heading"><span>Historia poleceń</span><span className="panel-count">{entries.length}</span></div>
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
  </section>
);
