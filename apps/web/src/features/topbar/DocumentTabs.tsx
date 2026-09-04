import React from 'react';
import { IconButton, VectoriaIcon } from '@vectoria/ui';

export interface DocumentTabsProps {
  documentName: string;
  dirty: boolean;
  onOpenGallery?: () => void;
  onToggleComments?: () => void;
  commentsCount?: number;
}

export const DocumentTabs: React.FC<DocumentTabsProps> = ({
  documentName,
  dirty,
  onOpenGallery,
  onToggleComments,
  commentsCount = 0,
}) => (
  <div className="document-tabs" data-testid="document-tabs" role="tablist" aria-label="Dokumenty">
    {onOpenGallery && (
      <button
        type="button"
        data-testid="open-gallery-tab-btn"
        className="document-tab"
        onClick={onOpenGallery}
        title="Otwórz galerię projektów"
        style={{ color: 'var(--color-primary, #6366f1)', fontWeight: 600 }}
      >
        <span>📁 Projekty</span>
      </button>
    )}
    <button type="button" className="document-tab is-active" role="tab" aria-selected="true">
      <span>{documentName}</span>
      <span className="document-dirty" aria-label={dirty ? 'Niezapisane zmiany' : 'Zapisano'}>
        {dirty ? '•' : ''}
      </span>
    </button>
    <IconButton
      className="new-document-button"
      size="sm"
      icon={<VectoriaIcon name="plus" size={14} />}
      label="Nowy projekt w galerii"
      onClick={onOpenGallery}
    />
    <span className="document-tabs-spacer" />
    {onToggleComments && (
      <button
        type="button"
        data-testid="toggle-comments-tab-btn"
        className="document-tab"
        onClick={onToggleComments}
        title="Pokaż/ukryj panel komentarzy"
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
        }}
      >
        <span>💬 Komentarze</span>
        {commentsCount > 0 && (
          <span
            style={{
              fontSize: '10px',
              padding: '0 5px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary, #6366f1)',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {commentsCount}
          </span>
        )}
      </button>
    )}
  </div>
);
