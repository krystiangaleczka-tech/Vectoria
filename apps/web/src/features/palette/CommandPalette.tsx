import React, { useState, useEffect, useRef } from 'react';
import type { EditorCommand } from '@vectoria/editor-engine';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: EditorCommand[];
  onExecute: (commandId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
  onExecute
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);


  const filteredCommands = commands.filter(c => 
    c.title.toLowerCase().includes(query.toLowerCase()) || 
    c.id.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        onExecute(selected.id);
        onClose();
      }
      e.preventDefault();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, 0)',
        width: '500px',
        backgroundColor: 'var(--color-bg-surface, #1e1e24)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-subtle, #333)',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Wpisz komendę..."
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary, #fff)',
          border: 'none',
          borderBottom: '1px solid var(--color-border-subtle, #333)',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {filteredCommands.length === 0 ? (
          <div style={{ padding: '16px', color: 'var(--color-text-secondary, #aaa)', textAlign: 'center' }}>
            Brak wyników
          </div>
        ) : (
          filteredCommands.map((cmd, idx) => (
            <div
              key={cmd.id}
              onClick={() => {
                onExecute(cmd.id);
                onClose();
              }}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: idx === selectedIndex ? 'var(--color-bg-active, rgba(255, 255, 255, 0.1))' : 'transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <span style={{ color: 'var(--color-text-primary, #fff)' }}>{cmd.title}</span>
              {cmd.shortcut && (
                <span style={{ 
                  fontSize: '12px', 
                  color: 'var(--color-text-secondary, #aaa)',
                  backgroundColor: 'var(--color-bg-base)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {cmd.shortcut}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
