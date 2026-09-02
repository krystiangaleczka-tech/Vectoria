import React, { useState, useRef, useEffect } from 'react';
import { parseNumericExpression } from '@vectoria/shared';

export interface NumberInputProps {
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  disabled?: boolean;
  'data-testid'?: string;
  onChange: (val: number) => void;
  percentBase?: number;
  onUnitCycle?: () => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  unit = 'px',
  min,
  max,
  step = 1,
  decimals = 0,
  disabled = false,
  'data-testid': testId,
  onChange,
  percentBase,
  onUnitCycle,
}) => {
  const [text, setText] = useState(() => value.toFixed(decimals));
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync displayed text with external value changes (e.g., after drag, undo/redo)
  // Only sync when input is not focused to avoid overwriting user's manual edit
  useEffect(() => {
    if (!isFocused) {
      setText(value.toFixed(decimals));
    }
  }, [value, decimals, isFocused]);

  const commit = (newText: string) => {
    const parsed = parseNumericExpression(newText, percentBase ?? value);
    if (parsed !== null && Number.isFinite(parsed)) {
      setHasError(false);
      let clamped = parsed;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      const rounded = parseFloat(clamped.toFixed(decimals));
      onChange(rounded);
      setText(rounded.toFixed(decimals));
    } else if (newText.trim() !== value.toFixed(decimals)) {
      setHasError(true);
      setText(value.toFixed(decimals));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Enter') {
      commit(text);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setText(value.toFixed(decimals));
      setHasError(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const mult = e.shiftKey ? 10 : 1;
      const delta = (e.key === 'ArrowUp' ? step : -step) * mult;
      const current = parseFloat(text) || value;
      let next = current + delta;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      const rounded = parseFloat(next.toFixed(decimals));
      onChange(rounded);
      setText(rounded.toFixed(decimals));
    }
  };

  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '28px',
        backgroundColor: isFocused ? 'var(--color-input-hover)' : 'var(--color-input)',
        border: `1px solid ${hasError ? 'var(--color-danger)' : isFocused ? 'var(--color-border-focus)' : 'var(--color-border-subtle)'}`,
        borderRadius: 'var(--radius-sm)',
        padding: '0 6px',
        opacity: disabled ? 0.4 : 1,
        transition: 'border-color var(--duration-fast)',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          marginRight: '6px',
          fontWeight: 500,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={text}
        disabled={disabled}
        aria-label={`${label}${unit ? ` (${unit})` : ''}`}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${testId ?? 'input'}-error` : undefined}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => {
          setIsFocused(true);
          setHasError(false);
        }}
        onBlur={() => {
          setIsFocused(false);
          commit(text);
        }}
        onKeyDown={handleKeyDown}
        style={{
          flex: 1,
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--color-text-primary)',
          fontSize: '12px',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'var(--font-mono)',
        }}
      />
      {hasError && <span id={`${testId ?? 'input'}-error`} role="alert" aria-live="polite" style={{ display: 'none' }}>Nieprawidłowe wyrażenie</span>}
      {unit && (
        <button
          type="button"
          onClick={onUnitCycle}
          disabled={!onUnitCycle}
          aria-label={`Przełącz jednostkę (obecnie ${unit})`}
          style={{
            fontSize: '10px',
            color: 'var(--color-text-muted)',
            marginLeft: '4px',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: onUnitCycle ? 'pointer' : 'default',
          }}
        >
          {unit}
        </button>
      )}
    </div>
  );
};
