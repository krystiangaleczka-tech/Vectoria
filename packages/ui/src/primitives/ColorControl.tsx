import React from 'react';

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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '28px',
        padding: '0 4px',
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
          fontWeight: 500,
          paddingLeft: '4px',
        }}
      >
        {label}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Color preview swatch + hidden native color input */}
        <label
          style={{
            position: 'relative',
            width: '20px',
            height: '20px',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: isNone ? 'transparent' : (color ?? '#cccccc'),
            border: '1px solid var(--color-border-default)',
            cursor: disabled ? 'default' : 'pointer',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isNone ? 'No color (Click to pick)' : `Current color: ${color}`}
        >
          {isNone && (
            <div
              style={{
                width: '100%',
                height: '1px',
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

        {/* Hex Text or "None" */}
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: isNone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            minWidth: '55px',
          }}
        >
          {isNone ? 'None' : color?.toUpperCase()}
        </span>

        {/* None toggle button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(isNone ? '#5caeff' : null)}
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--color-border-subtle)',
            backgroundColor: isNone ? 'var(--color-accent-subtle)' : 'transparent',
            color: isNone ? 'var(--color-accent)' : 'var(--color-text-muted)',
            cursor: disabled ? 'default' : 'pointer',
          }}
          title={isNone ? 'Set solid color' : 'Set no fill'}
        >
          {isNone ? 'Fill' : 'None'}
        </button>
      </div>
    </div>
  );
};
