import React, { useEffect, useState } from 'react';
import type { DocumentModel } from '@vectoria/core';
import { listDocumentFonts, checkFontAvailability, type DocumentFontUsage } from '@vectoria/io';
import { Button } from '@vectoria/ui';

export interface UsedFontsPanelProps {
  document: DocumentModel;
  isOpen: boolean;
  onClose: () => void;
  onReplaceFont?: (sourceFont: string, targetFont: string) => void;
}

export const UsedFontsPanel: React.FC<UsedFontsPanelProps> = ({
  document: doc,
  isOpen,
  onClose,
  onReplaceFont,
}) => {
  const [fontList, setFontList] = useState<Array<DocumentFontUsage & { available: boolean }>>([]);
  const [substituteTarget, setSubstituteTarget] = useState<string>('Inter, sans-serif');

  useEffect(() => {
    if (!isOpen) return;

    const used = listDocumentFonts(doc);
    Promise.all(
      used.map(async (item) => ({
        ...item,
        available: await checkFontAvailability(item.fontFamily),
      }))
    ).then(setFontList);
  }, [doc, isOpen]);

  if (!isOpen) return null;

  const hasMissing = fontList.some((f) => !f.available);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Used Document Fonts"
      data-testid="used-fonts-dialog"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: '440px',
          backgroundColor: 'var(--color-bg-surface, #1e1e24)',
          borderRadius: '8px',
          border: '1px solid var(--color-border-subtle, #333)',
          padding: '20px',
          color: 'var(--color-text-primary, #fff)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Użyte czcionki w dokumencie</h2>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Zamknij">✕</Button>
        </div>

        {hasMissing && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(255, 170, 0, 0.15)',
              border: '1px solid rgba(255, 170, 0, 0.4)',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#ffaa00',
            }}
          >
            ⚠️ Wykryto brakujące fonty w systemie. Niektóre teksty mogą być renderowane fontem zastępczym.
          </div>
        )}

        <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '16px' }}>
          {fontList.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary, #aaa)' }}>
              Brak obiektów tekstowych w dokumencie.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fontList.map((item) => (
                <div
                  key={item.fontFamily}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-bg-base, #16161a)',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border-subtle, #2a2a30)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{item.fontFamily}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, #888)' }}>
                      Wystąpienia: {item.count}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        backgroundColor: item.available ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                        color: item.available ? '#4caf50' : '#f44336',
                      }}
                    >
                      {item.available ? 'Dostępny' : 'Brak'}
                    </span>
                    {!item.available && onReplaceFont && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onReplaceFont(item.fontFamily, substituteTarget)}
                      >
                        Zastąp
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {hasMissing && onReplaceFont && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-text-secondary, #aaa)' }}>
              Zastąp przez:
            </label>
            <select
              value={substituteTarget}
              onChange={(e) => setSubstituteTarget(e.target.value)}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: 'var(--color-bg-base, #16161a)',
                color: '#fff',
                border: '1px solid var(--color-border-subtle, #333)',
              }}
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Helvetica, sans-serif">Helvetica</option>
              <option value="Times New Roman, serif">Times New Roman</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={onClose}>Zamknij</Button>
        </div>
      </div>
    </div>
  );
};
