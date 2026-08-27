import React, { useState } from 'react';
import { Button } from '@vectoria/ui';

export interface SpecialCharactersPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (char: string) => void;
}

const CATEGORIES: Record<string, string[]> = {
  'Typografia': ['—', '–', '…', '«', '»', '“', '”', '‘', '’', '„', '‚', '©', '®', '™', '§', '°', '±', '×', '÷', '·', '•', '¶', '†', '‡'],
  'Waluty': ['€', '$', '£', '¥', '₽', '₴', '₿', '¢', '₹', '₩', '₪', '₫'],
  'Matematyka': ['≠', '≤', '≥', '≈', '≡', '∞', '√', '∑', '∏', '∆', 'π', 'µ', '∫', '∂', '∠', '‰', '⅓', '⅔', '⅛', '⅜', '⅝', '⅞'],
  'Greckie': ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'σ', 'φ', 'ψ', 'ω', 'Δ', 'Σ', 'Ω'],
  'Symbole': ['★', '☆', '♥', '♦', '♣', '♠', '✔', '✖', '➜', '➤', '▲', '▼', '◄', '►', '■', '□', '●', '○', '⚙', '⚡', '🚀', '💡', '🎨', '📝', '✨', '🔥'],
};

export const SpecialCharactersPopover: React.FC<SpecialCharactersPopoverProps> = ({
  isOpen,
  onClose,
  onSelectCharacter,
}) => {
  const [activeTab, setActiveTab] = useState<string>('Typografia');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Special Characters"
      data-testid="special-characters-dialog"
      style={{
        position: 'fixed',
        top: '60px',
        right: '320px',
        width: '320px',
        backgroundColor: 'var(--color-bg-surface, #1e1e24)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-subtle, #333)',
        padding: '12px',
        color: 'var(--color-text-primary, #fff)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Znaki specjalne</h3>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Zamknij">✕</Button>
      </div>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border-subtle, #333)', paddingBottom: '8px', marginBottom: '8px', overflowX: 'auto' }}>
        {Object.keys(CATEGORIES).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveTab(cat)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === cat ? 'var(--color-brand-primary, #5caeff)' : 'transparent',
              color: activeTab === cat ? '#000' : 'var(--color-text-secondary, #aaa)',
              fontWeight: activeTab === cat ? 600 : 400,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '4px',
          maxHeight: '180px',
          overflowY: 'auto',
        }}
      >
        {CATEGORIES[activeTab]?.map((char, index) => (
          <button
            key={`${char}-${index}`}
            type="button"
            data-testid={`char-btn-${char}`}
            onClick={() => onSelectCharacter(char)}
            style={{
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              borderRadius: '4px',
              border: '1px solid var(--color-border-subtle, #2a2a30)',
              backgroundColor: 'var(--color-bg-base, #16161a)',
              color: '#fff',
              cursor: 'pointer',
            }}
            title={char}
          >
            {char}
          </button>
        ))}
      </div>
    </div>
  );
};
