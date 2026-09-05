import React, { useEffect, useState } from 'react';
import { parseColor } from '@vectoria/shared';

export interface ColorControlProps {
  label: string;
  color: string | null; // null represents "none" / no fill
  disabled?: boolean;
  onChange: (newColor: string | null) => void;
}

export const ColorControl: React.FC<ColorControlProps> = ({
  label,
  color,
  disabled = false,
  onChange,
}) => {
  const isNone = color === null;
  const [text, setText] = useState(color ?? '');
  const [error, setError] = useState(false);
  const parsed = text ? parseColor(text) : null;

  useEffect(() => {
    setText(color ?? '');
    setError(false);
  }, [color]);

  const commit = (value: string) => {
    const next = parseColor(value);
    if (!next) {
      setError(true);
      return;
    }
    setError(false);
    setText(next.hex.toUpperCase());
    onChange(next.hex);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '32px',
        padding: '0 8px',
        backgroundColor: 'var(--color-input)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-sm)',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span
        style={{
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
        {/* Color preview swatch + hidden native color input */}
        <label
          style={{
            position: 'relative',
            width: '22px',
            height: '22px',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: isNone ? 'transparent' : (color ?? '#cccccc'),
            border: '1px solid var(--color-border-default)',
            cursor: disabled ? 'default' : 'pointer',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          title={isNone ? 'Brak koloru (kliknij, aby wybrać)' : `Bieżący kolor: ${color}`}
        >
          {isNone && (
            <div
              style={{
                width: '100%',
                height: '1.5px',
                backgroundColor: 'var(--color-danger)',
                transform: 'rotate(-45deg)',
              }}
            />
          )}
          <input
            type="color"
            value={color ?? '#5caeff'}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute',
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer',
            }}
          />
        </label>

        {/* Hex input */}
        <input
          aria-label={`${label} HEX`}
          value={isNone ? 'None' : text.toUpperCase()}
          placeholder={isNone ? 'None' : '#000000'}
          disabled={disabled || isNone}
          onChange={(event) => { setText(event.target.value); setError(false); }}
          onBlur={() => !isNone && commit(text)}
          onKeyDown={(event) => { if (event.key === 'Enter') commit(text); if (event.key === 'Escape') setText(color ?? ''); }}
          aria-invalid={error}
          style={{
            flex: '1 1 78px',
            minWidth: '64px',
            height: '24px',
            border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border-subtle)'}`,
            borderRadius: 'var(--radius-xs)',
            background: 'var(--color-input)',
            color: isNone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            fontSize: '11px',
            fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: '0 6px',
            letterSpacing: '0.04em',
          }}
        />

        {/* None toggle button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(isNone ? '#5caeff' : null)}
          style={{
            fontSize: '11px',
            fontWeight: 500,
            padding: '2px 8px',
            height: '24px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--color-border-subtle)',
            backgroundColor: isNone ? 'var(--color-accent-subtle)' : 'transparent',
            color: isNone ? 'var(--color-accent)' : 'var(--color-text-muted)',
            cursor: disabled ? 'default' : 'pointer',
          }}
          title={isNone ? 'Ustaw kolor wypełnienia' : 'Ustaw brak wypełnienia'}
        >
          {isNone ? 'Fill' : 'None'}
        </button>
      </div>
      {error && <span role="alert" style={{ color: 'var(--color-danger)', fontSize: '10px' }}>Invalid color</span>}
      {parsed?.outOfGamut && <span role="status" style={{ color: 'var(--color-warning)', fontSize: '10px' }}>Color outside display gamut</span>}
    </div>
  );
};
