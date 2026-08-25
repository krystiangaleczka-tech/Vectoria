import React from 'react';
import type { Vec2 } from '@vectoria/shared';

export interface PivotControlProps {
  pivot: Vec2;
  size: { width: number; height: number };
  onChange: (pivot: Vec2) => void;
  disabled?: boolean;
}

export const PivotControl: React.FC<PivotControlProps> = ({ pivot, size, onChange, disabled }) => {
  const points = [
    { x: 0, y: 0, label: 'Top Left' },
    { x: size.width / 2, y: 0, label: 'Top Center' },
    { x: size.width, y: 0, label: 'Top Right' },
    { x: 0, y: size.height / 2, label: 'Middle Left' },
    { x: size.width / 2, y: size.height / 2, label: 'Center' },
    { x: size.width, y: size.height / 2, label: 'Middle Right' },
    { x: 0, y: size.height, label: 'Bottom Left' },
    { x: size.width / 2, y: size.height, label: 'Bottom Center' },
    { x: size.width, y: size.height, label: 'Bottom Right' },
  ];

  const isActive = (px: number, py: number) => Math.abs(pivot.x - px) < 0.1 && Math.abs(pivot.y - py) < 0.1;

  return (
    <div
      className="pivot-control"
      role="radiogroup"
      aria-label="Transform Origin"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '2px',
        width: '32px',
        height: '32px',
        padding: '2px',
        background: 'var(--color-bg-tertiary)',
        borderRadius: '4px',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {points.map((pt, i) => {
        const active = isActive(pt.x, pt.y);
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={pt.label}
            title={pt.label}
            disabled={disabled}
            onClick={() => onChange({ x: pt.x, y: pt.y })}
            style={{
              width: '100%',
              height: '100%',
              background: active ? 'var(--color-fg-primary)' : 'var(--color-fg-tertiary)',
              border: 'none',
              borderRadius: '1px',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        );
      })}
    </div>
  );
};
