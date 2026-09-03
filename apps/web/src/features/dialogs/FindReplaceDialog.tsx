import React, { useState, useMemo } from 'react';
import type { DocumentModel, ObjectId, ObjectStyle } from '@vectoria/core';
import { findObjectsByStyleCriteria, type FindStyleCriteria } from '@vectoria/core';
import { Button } from '@vectoria/ui';

export interface FindReplaceDialogProps {
  document: DocumentModel;
  isOpen: boolean;
  onClose: () => void;
  onSelectObject?: (id: ObjectId) => void;
  onReplaceMatch?: (id: ObjectId, newText: string) => void;
  onReplaceAll?: (search: string, replace: string, options: { matchCase: boolean; wholeWord: boolean }) => void;
  onReplaceStyles?: (updates: ReadonlyMap<ObjectId, Partial<ObjectStyle>>) => void;
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
  onReplaceStyles,
}) => {
  const [tab, setTab] = useState<'text' | 'style'>('text');

  // Text tab state
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Style tab state
  const [findFill, setFindFill] = useState('');
  const [findStrokeWidth, setFindStrokeWidth] = useState<string>('');
  const [findOpacity, setFindOpacity] = useState<string>('');
  const [findFontFamily, setFindFontFamily] = useState('');

  const [replaceFill, setReplaceFill] = useState('');
  const [replaceOpacity, setReplaceOpacity] = useState<string>('');

  const styleCriteria = useMemo<FindStyleCriteria>(() => {
    const c: FindStyleCriteria = {};
    if (findFill.trim()) c.fillColor = findFill.trim();
    if (findStrokeWidth.trim() && !Number.isNaN(Number(findStrokeWidth))) c.strokeWidth = Number(findStrokeWidth);
    if (findOpacity.trim() && !Number.isNaN(Number(findOpacity))) c.opacity = Number(findOpacity);
    if (findFontFamily.trim()) c.fontFamily = findFontFamily.trim();
    return c;
  }, [findFill, findStrokeWidth, findOpacity, findFontFamily]);

  const stylePatch = useMemo<Partial<ObjectStyle>>(() => {
    const patch: Partial<ObjectStyle> = {
      ...(replaceFill.trim() ? { fill: { type: 'solid', color: replaceFill.trim() } } : {}),
      ...(replaceOpacity.trim() && !Number.isNaN(Number(replaceOpacity)) ? { opacity: Math.max(0, Math.min(1, Number(replaceOpacity))) } : {}),
    };
    return patch;
  }, [replaceFill, replaceOpacity]);

  const styleMatches = useMemo(
    () => (isOpen && tab === 'style' && Object.keys(styleCriteria).length > 0 ? findObjectsByStyleCriteria(doc, styleCriteria) : []),
    [doc, styleCriteria, isOpen, tab],
  );

  const textMatches = useMemo(() => {
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

  const currentMatch = textMatches[activeMatchIndex] || null;

  const handleNext = () => {
    if (textMatches.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % textMatches.length;
    setActiveMatchIndex(nextIdx);
    if (textMatches[nextIdx]) {
      onSelectObject?.(textMatches[nextIdx].objectId);
    }
  };

  const handlePrev = () => {
    if (textMatches.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + textMatches.length) % textMatches.length;
    setActiveMatchIndex(prevIdx);
    if (textMatches[prevIdx]) {
      onSelectObject?.(textMatches[prevIdx].objectId);
    }
  };

  const handleReplaceText = () => {
    if (!currentMatch) return;
    const codePoints = Array.from(currentMatch.text);
    const updated = [...codePoints.slice(0, currentMatch.startIndex), ...Array.from(replaceTerm), ...codePoints.slice(currentMatch.startIndex + currentMatch.length)].join('');
    onReplaceMatch?.(currentMatch.objectId, updated);
  };

  const handleReplaceAllText = () => {
    if (!searchTerm) return;
    onReplaceAll?.(searchTerm, replaceTerm, { matchCase, wholeWord });
  };

  const handleApplyStyleReplace = () => {
    if (styleMatches.length === 0 || Object.keys(stylePatch).length === 0) return;
    const updates = new Map<ObjectId, Partial<ObjectStyle>>();
    for (const m of styleMatches) {
      updates.set(m.objectId, stylePatch);
    }
    onReplaceStyles?.(updates);
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
        width: '380px',
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
        <div role="tablist" style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="sm"
            variant={tab === 'text' ? 'primary' : 'ghost'}
            role="tab"
            aria-selected={tab === 'text'}
            data-testid="tab-text"
            onClick={() => setTab('text')}
          >
            Tekst
          </Button>
          <Button
            size="sm"
            variant={tab === 'style' ? 'primary' : 'ghost'}
            role="tab"
            aria-selected={tab === 'style'}
            data-testid="tab-style"
            onClick={() => setTab('style')}
          >
            Style
          </Button>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Zamknij">✕</Button>
      </div>

      {tab === 'text' ? (
        <>
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
              {textMatches.length > 0
                ? `Dopasowanie ${activeMatchIndex + 1} z ${textMatches.length}`
                : searchTerm
                ? 'Brak wyników'
                : ''}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <Button size="sm" variant="secondary" disabled={textMatches.length === 0} onClick={handlePrev}>Poprzedni</Button>
              <Button size="sm" variant="secondary" disabled={textMatches.length === 0} onClick={handleNext}>Następny</Button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button size="sm" variant="secondary" disabled={!currentMatch} onClick={handleReplaceText}>Zamień</Button>
            <Button size="sm" variant="primary" disabled={textMatches.length === 0} onClick={handleReplaceAllText}>Zamień wszystko</Button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary, #aaa)', marginBottom: '4px' }}>
                Kolor wypełnienia (np. #ff0000):
              </label>
              <input
                data-testid="style-find-fill"
                type="text"
                placeholder="#ff0000 lub red"
                value={findFill}
                onChange={(e) => setFindFill(e.target.value)}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary, #aaa)', marginBottom: '4px' }}>
                  Grubość obrysu:
                </label>
                <input
                  type="number"
                  placeholder="np. 2"
                  value={findStrokeWidth}
                  onChange={(e) => setFindStrokeWidth(e.target.value)}
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
                  Krycie (0–1):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  placeholder="np. 0.5"
                  value={findOpacity}
                  onChange={(e) => setFindOpacity(e.target.value)}
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
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary, #aaa)', marginBottom: '4px' }}>
                Czcionka (tekst):
              </label>
              <input
                type="text"
                placeholder="np. Arial"
                value={findFontFamily}
                onChange={(e) => setFindFontFamily(e.target.value)}
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

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-subtle, #333)', margin: '4px 0' }} />

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary, #aaa)', marginBottom: '4px' }}>
                Zamień wypełnienie na:
              </label>
              <input
                data-testid="style-replace-fill"
                type="text"
                placeholder="#00ff00"
                value={replaceFill}
                onChange={(e) => setReplaceFill(e.target.value)}
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
                Zamień krycie na (0–1):
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                placeholder="np. 1"
                value={replaceOpacity}
                onChange={(e) => setReplaceOpacity(e.target.value)}
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
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12px', color: 'var(--color-text-secondary, #aaa)' }}>
            <span>
              {Object.keys(styleCriteria).length > 0
                ? `Znaleziono: ${styleMatches.length} obiektów`
                : 'Podaj kryteria wyszukiwania'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              size="sm"
              variant="primary"
              data-testid="style-replace-btn"
              disabled={styleMatches.length === 0 || Object.keys(stylePatch).length === 0}
              onClick={handleApplyStyleReplace}
            >
              Zamień style
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
