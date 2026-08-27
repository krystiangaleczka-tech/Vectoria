import React, { useState, useMemo } from 'react';
import type { DocumentModel, ObjectId } from '@vectoria/core';
import { Button } from '@vectoria/ui';

export interface FindReplaceDialogProps {
  document: DocumentModel;
  isOpen: boolean;
  onClose: () => void;
  onSelectObject?: (id: ObjectId) => void;
  onReplaceMatch?: (id: ObjectId, newText: string) => void;
  onReplaceAll?: (search: string, replace: string, options: { matchCase: boolean; wholeWord: boolean }) => void;
}

interface MatchItem {
  objectId: ObjectId;
  objectName: string;
  startIndex: number;
  length: number;
  text: string;
}

export const FindReplaceDialog: React.FC<FindReplaceDialogProps> = ({
  document: doc,
  isOpen,
  onClose,
  onSelectObject,
  onReplaceMatch,
  onReplaceAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const matches = useMemo(() => {
    if (!searchTerm) return [];

    const results: MatchItem[] = [];
    const flags = matchCase ? 'gu' : 'giu';
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patternStr = wholeWord ? `\\b${escaped}\\b` : escaped;
    let regex: RegExp;
    try {
      regex = new RegExp(patternStr, flags);
    } catch {
      return [];
    }

    for (const obj of Object.values(doc.objects)) {
      if ((obj.type === 'text' || obj.type === 'text-frame') && obj.text) {
        let match: RegExpExecArray | null;
        while ((match = regex.exec(obj.text)) !== null) {
          const startIndex = Array.from(obj.text.slice(0, match.index)).length;
          const matchLength = Array.from(match[0]).length;
          results.push({
            objectId: obj.id,
            objectName: obj.name,
            startIndex,
            length: matchLength,
            text: obj.text,
          });
          if (match[0].length === 0) regex.lastIndex += 1;
        }
      }
    }

    return results;
  }, [doc, searchTerm, matchCase, wholeWord]);

  if (!isOpen) return null;

  const currentMatch = matches[activeMatchIndex] || null;

  const handleNext = () => {
    if (matches.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % matches.length;
    setActiveMatchIndex(nextIdx);
    if (matches[nextIdx]) {
      onSelectObject?.(matches[nextIdx].objectId);
    }
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + matches.length) % matches.length;
    setActiveMatchIndex(prevIdx);
    if (matches[prevIdx]) {
      onSelectObject?.(matches[prevIdx].objectId);
    }
  };

  const handleReplace = () => {
    if (!currentMatch) return;
    const codePoints = Array.from(currentMatch.text);
    const updated = [...codePoints.slice(0, currentMatch.startIndex), ...Array.from(replaceTerm), ...codePoints.slice(currentMatch.startIndex + currentMatch.length)].join('');
    onReplaceMatch?.(currentMatch.objectId, updated);
  };

  const handleReplaceAll = () => {
    if (!searchTerm) return;
    onReplaceAll?.(searchTerm, replaceTerm, { matchCase, wholeWord });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Find and Replace"
      data-testid="find-replace-dialog"
      style={{
        position: 'fixed',
        top: '60px',
        right: '320px',
        width: '360px',
        backgroundColor: 'var(--color-bg-surface, #1e1e24)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-subtle, #333)',
        padding: '16px',
        color: 'var(--color-text-primary, #fff)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Znajdź i zamień</h3>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Zamknij">✕</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary, #aaa)', marginBottom: '4px' }}>
            Szukaj:
          </label>
          <input
            data-testid="find-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-bg-base, #16161a)',
              color: '#fff',
              border: '1px solid var(--color-border-subtle, #333)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary, #aaa)', marginBottom: '4px' }}>
            Zamień na:
          </label>
          <input
            data-testid="replace-input"
            type="text"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-bg-base, #16161a)',
              color: '#fff',
              border: '1px solid var(--color-border-subtle, #333)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
            />
            Wielkość liter
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
            />
            Całe słowa
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12px', color: 'var(--color-text-secondary, #aaa)' }}>
        <span>
          {matches.length > 0
            ? `Dopasowanie ${activeMatchIndex + 1} z ${matches.length}`
            : searchTerm
            ? 'Brak wyników'
            : ''}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button size="sm" variant="secondary" disabled={matches.length === 0} onClick={handlePrev}>Poprzedni</Button>
          <Button size="sm" variant="secondary" disabled={matches.length === 0} onClick={handleNext}>Następny</Button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <Button size="sm" variant="secondary" disabled={!currentMatch} onClick={handleReplace}>Zamień</Button>
        <Button size="sm" variant="primary" disabled={matches.length === 0} onClick={handleReplaceAll}>Zamień wszystko</Button>
      </div>
    </div>
  );
};
