import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'tool';
  shortcut?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  active = false,
  size = 'md',
  shortcut,
  disabled,
  className = '',
  ...props
}) => {
  const pixelSize = size === 'tool' ? 40 : size === 'sm' ? 24 : size === 'lg' ? 36 : 30;

  const styles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${pixelSize}px`,
    height: `${pixelSize}px`,
    minWidth: `${pixelSize}px`,
    minHeight: `${pixelSize}px`,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    backgroundColor: active ? 'var(--color-selection-surface-strong)' : 'transparent',
    color: active ? '#ffffff' : 'var(--color-text-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    outline: 'none',
    transition: 'background var(--duration-fast), color var(--duration-fast)',
    padding: 0,
  };

  const title = shortcut ? `${label} (${shortcut})` : label;

  return (
    <button
      style={styles}
      title={title}
      aria-label={label}
      disabled={disabled}
      className={className}
      {...props}
    >
      {icon}
    </button>
  );
};
