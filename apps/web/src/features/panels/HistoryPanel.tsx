import React from 'react';
import type { Command } from '@vectoria/core';

export interface HistoryPanelProps {
  entries: readonly Command[];
}

const friendlyDescription = (command: Command): string => {
  if (/create/i.test(command.description)) return 'Dodano prostokąt';
  if (/move|transform/i.test(command.description)) return 'Przeniesiono obiekt';
  if (/resize|geometry/i.test(command.description)) return 'Zmieniono rozmiar';
  if (/fill|style/i.test(command.description)) return 'Zmieniono wypełnienie';
  if (/delete|remove/i.test(command.description)) return 'Usunięto obiekt';
  return command.description;
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ entries }) => (
  <section className="dock-panel-content history-panel" data-testid="history-panel" aria-label="Historia">
    <div className="panel-section-heading"><span>Historia poleceń</span><span className="panel-count">{entries.length}</span></div>
    {entries.length === 0 ? <div className="panel-empty-state"><strong>Historia jest pusta</strong><span>Operacje dokumentu pojawią się tutaj.</span></div> : (
      <ol className="history-list" aria-label="Wykonane polecenia">
        {entries.map((command, index) => <li key={`${command.type}-${index}`} className={index === entries.length - 1 ? 'is-current' : ''}><span className="history-marker" aria-hidden="true" /><span>{friendlyDescription(command)}</span>{index === entries.length - 1 && <small>aktualnie</small>}</li>)}
      </ol>
    )}
    <p className="panel-note">Historia jest tylko do odczytu. Użyj Cofnij/Ponów, aby nawigować.</p>
  </section>
);
