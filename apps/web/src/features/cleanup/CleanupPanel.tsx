import React from 'react';
import type { CleanupPlan } from '@vectoria/core';
import { Button } from '@vectoria/ui';

interface CleanupPanelProps {
  plan: CleanupPlan;
  onChangeSelection: (findingIds: readonly string[]) => void;
  onApply: () => void;
  onCancel: () => void;
}

export const CleanupPanel: React.FC<CleanupPanelProps> = ({ plan, onChangeSelection, onApply, onCancel }) => {
  const toggle = (id: string) => onChangeSelection(plan.selectedFindingIds.includes(id) ? plan.selectedFindingIds.filter((findingId) => findingId !== id) : [...plan.selectedFindingIds, id]);
  return (
    <div className="dock-panel-content cleanup-panel" data-testid="cleanup-panel">
      <div className="panel-section-heading"><span>Clean Up review</span><span className="panel-count">{plan.findings.length}</span></div>
      {plan.findings.length === 0 ? (
        <div className="panel-empty-state"><strong>Document is clean</strong><span>No invalid paths or duplicate geometry found.</span></div>
      ) : (
        <>
          <div className="cleanup-list" role="listbox" aria-label="Cleanup findings" aria-multiselectable="true">
            {plan.findings.map((finding) => {
              const selected = plan.selectedFindingIds.includes(finding.id);
              return <label key={finding.id} className={`cleanup-row ${selected ? 'is-selected' : ''}`}><input type="checkbox" checked={selected} onChange={() => toggle(finding.id)} /><span className="cleanup-severity" aria-hidden="true">{finding.severity === 'warning' ? '!' : 'i'}</span><span><strong>{finding.kind}</strong><small>{finding.reason ?? 'Review suggested fix.'}</small></span></label>;
            })}
          </div>
          <div className="property-actions cleanup-actions"><Button size="sm" variant="primary" disabled={plan.selectedFindingIds.length === 0} onClick={onApply}>Apply selected</Button><Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button></div>
        </>
      )}
      <p className="panel-note">Scan does not mutate document. Apply creates one undoable command.</p>
    </div>
  );
};
