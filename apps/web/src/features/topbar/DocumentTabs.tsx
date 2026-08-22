import React from 'react';
import { IconButton, VectoriaIcon } from '@vectoria/ui';

export interface DocumentTabsProps {
  documentName: string;
  dirty: boolean;
}

export const DocumentTabs: React.FC<DocumentTabsProps> = ({ documentName, dirty }) => (
  <div className="document-tabs" data-testid="document-tabs" role="tablist" aria-label="Dokumenty">
    <button type="button" className="document-tab is-active" role="tab" aria-selected="true">
      <span>{documentName}</span><span className="document-dirty" aria-label={dirty ? 'Niezapisane zmiany' : 'Zapisano'}>{dirty ? '•' : ''}</span>
    </button>
    <IconButton className="new-document-button" size="sm" icon={<VectoriaIcon name="plus" size={14} />} label="Nowy dokument" disabled />
    <span className="document-tabs-spacer" />
  </div>
);
