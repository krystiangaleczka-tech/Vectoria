import React, { useMemo, useState } from 'react';
import type { CanvasAnnotation } from '@vectoria/core';
import { exportAnnotationsToJson, exportAnnotationsToMarkdown } from '@vectoria/io';

export interface CommentsPanelProps {
  annotations: readonly CanvasAnnotation[];
  activeAnnotationId: string | null;
  documentName?: string;
  onSelectAnnotation: (id: string) => void;
  onToggleResolve: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onAddComment?: (body: string) => void;
  onClose?: () => void;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  annotations,
  activeAnnotationId,
  documentName = 'Dokument',
  onSelectAnnotation,
  onToggleResolve,
  onDeleteAnnotation,
  onAddComment,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [newCommentText, setNewCommentText] = useState('');
  const [authorName, setAuthorName] = useState<string>(() => {
    try {
      return localStorage.getItem('vectoria-display-name') || 'Użytkownik';
    } catch {
      return 'Użytkownik';
    }
  });

  const handleAuthorChange = (val: string) => {
    setAuthorName(val);
    try {
      localStorage.setItem('vectoria-display-name', val);
    } catch {
      /* ignore */
    }
  };

  const filteredAnnotations = useMemo(() => {
    if (filter === 'open') return annotations.filter((a) => !a.resolved);
    if (filter === 'resolved') return annotations.filter((a) => a.resolved);
    return annotations;
  }, [annotations, filter]);

  const openCount = useMemo(() => annotations.filter((a) => !a.resolved).length, [annotations]);
  const resolvedCount = useMemo(() => annotations.filter((a) => a.resolved).length, [annotations]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !onAddComment) return;
    onAddComment(newCommentText.trim());
    setNewCommentText('');
  };

  const handleExportJson = () => {
    const content = exportAnnotationsToJson(annotations);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentName.replace(/\s+/g, '_')}_komentarze.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const content = exportAnnotationsToMarkdown(documentName, annotations);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentName.replace(/\s+/g, '_')}_komentarze.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      data-testid="comments-panel"
      role="complementary"
      aria-label="Panel komentarzy i uwag"
      style={{
        width: '320px',
        height: '100%',
        backgroundColor: 'var(--color-panel, #161922)',
        borderLeft: '1px solid var(--color-border-subtle, #1f2937)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--color-text, #f3f4f6)',
        fontSize: '13px',
        zIndex: 20,
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-subtle, #1f2937)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Komentarze</span>
          <span
            style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary, #6366f1)',
              color: '#fff',
            }}
          >
            {annotations.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Export buttons */}
          <button
            type="button"
            data-testid="export-comments-json-btn"
            title="Eksportuj do JSON"
            onClick={handleExportJson}
            style={{
              background: 'none',
              border: '1px solid var(--color-border-subtle, #374151)',
              color: 'var(--color-text-muted, #9ca3af)',
              padding: '3px 6px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            JSON
          </button>
          <button
            type="button"
            data-testid="export-comments-md-btn"
            title="Eksportuj do Markdown"
            onClick={handleExportMarkdown}
            style={{
              background: 'none',
              border: '1px solid var(--color-border-subtle, #374151)',
              color: 'var(--color-text-muted, #9ca3af)',
              padding: '3px 6px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            MD
          </button>

          {onClose && (
            <button
              type="button"
              data-testid="close-comments-panel-btn"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted, #9ca3af)',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Author Name Configuration */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--color-border-subtle, #1f2937)',
          backgroundColor: 'var(--color-app, #0f1117)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
        }}
      >
        <span style={{ color: 'var(--color-text-muted, #9ca3af)', whiteSpace: 'nowrap' }}>Twój podpis:</span>
        <input
          type="text"
          aria-label="Twój podpis w komentarzach"
          value={authorName}
          onChange={(e) => handleAuthorChange(e.target.value)}
          maxLength={64}
          style={{
            flex: 1,
            padding: '2px 6px',
            fontSize: '11px',
            borderRadius: '4px',
            border: '1px solid var(--color-border-subtle, #374151)',
            backgroundColor: 'var(--color-panel, #161922)',
            color: 'var(--color-text, #f3f4f6)',
          }}
        />
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border-subtle, #1f2937)',
          backgroundColor: 'var(--color-panel, #161922)',
        }}
      >
        <button
          type="button"
          data-testid="filter-comments-all"
          onClick={() => setFilter('all')}
          style={{
            flex: 1,
            padding: '8px',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: filter === 'all' ? 600 : 400,
            color: filter === 'all' ? 'var(--color-primary, #6366f1)' : 'var(--color-text-muted, #9ca3af)',
            borderBottom: filter === 'all' ? '2px solid var(--color-primary, #6366f1)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Wszystkie ({annotations.length})
        </button>
        <button
          type="button"
          data-testid="filter-comments-open"
          onClick={() => setFilter('open')}
          style={{
            flex: 1,
            padding: '8px',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: filter === 'open' ? 600 : 400,
            color: filter === 'open' ? 'var(--color-primary, #6366f1)' : 'var(--color-text-muted, #9ca3af)',
            borderBottom: filter === 'open' ? '2px solid var(--color-primary, #6366f1)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Otwarte ({openCount})
        </button>
        <button
          type="button"
          data-testid="filter-comments-resolved"
          onClick={() => setFilter('resolved')}
          style={{
            flex: 1,
            padding: '8px',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: filter === 'resolved' ? 600 : 400,
            color: filter === 'resolved' ? 'var(--color-primary, #6366f1)' : 'var(--color-text-muted, #9ca3af)',
            borderBottom: filter === 'resolved' ? '2px solid var(--color-primary, #6366f1)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Rozwiązane ({resolvedCount})
        </button>
      </div>

      {/* Comment Creation Input */}
      {onAddComment && (
        <form onSubmit={handleAddSubmit} style={{ padding: '12px', borderBottom: '1px solid var(--color-border-subtle, #1f2937)' }}>
          <textarea
            data-testid="new-comment-textarea"
            aria-label="Treść nowego komentarza"
            placeholder="Dodaj uwagę... (możesz użyć @user)"
            rows={2}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border-subtle, #374151)',
              backgroundColor: 'var(--color-app, #0f1117)',
              color: '#fff',
              resize: 'none',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="submit"
              data-testid="submit-comment-btn"
              disabled={!newCommentText.trim()}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                borderRadius: '4px',
                backgroundColor: 'var(--color-primary, #6366f1)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: newCommentText.trim() ? 'pointer' : 'not-allowed',
                opacity: newCommentText.trim() ? 1 : 0.5,
              }}
            >
              Dodaj uwagę
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredAnnotations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-muted, #9ca3af)' }}>
            <p style={{ margin: 0, fontSize: '13px' }}>Brak uwag w tym widoku</p>
          </div>
        ) : (
          filteredAnnotations.map((item) => {
            const isSelected = item.id === activeAnnotationId;
            return (
              <div
                key={item.id}
                data-testid={`comment-item-${item.id}`}
                onClick={() => onSelectAnnotation(item.id)}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor: isSelected ? 'var(--color-app, #1f2433)' : 'var(--color-app, #0f1117)',
                  border: isSelected ? '1px solid var(--color-primary, #6366f1)' : '1px solid var(--color-border-subtle, #1f2937)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {/* Header: Author + Coordinate + Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: item.resolved ? '#9ca3af' : '#f3f4f6' }}>
                      {item.authorName}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted, #9ca3af)', fontFamily: 'var(--font-mono)' }}>
                      ({Math.round(item.worldPoint.x)}, {Math.round(item.worldPoint.y)})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      data-testid={`toggle-resolve-${item.id}`}
                      title={item.resolved ? 'Oznacz jako otwarty' : 'Oznacz jako rozwiązany'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleResolve(item.id);
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: item.resolved ? '#10b98122' : '#374151',
                        color: item.resolved ? '#10b981' : '#9ca3af',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {item.resolved ? '✓ Rozwiązany' : 'Oznacz'}
                    </button>
                    <button
                      type="button"
                      data-testid={`delete-comment-${item.id}`}
                      title="Usuń komentarz"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAnnotation(item.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Body */}
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    lineHeight: 1.4,
                    color: item.resolved ? '#9ca3af' : '#f3f4f6',
                    textDecoration: item.resolved ? 'line-through' : 'none',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.body}
                </p>

                {/* Mentions tags */}
                {item.mentions.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                    {item.mentions.map((m) => (
                      <span
                        key={m}
                        style={{
                          fontSize: '10px',
                          color: '#6366f1',
                          backgroundColor: '#6366f122',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          fontWeight: 600,
                        }}
                      >
                        @{m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
