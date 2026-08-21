import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  active = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    fontSize: size === 'sm' ? '11px' : size === 'lg' ? '14px' : '12px',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background var(--duration-fast), border-color var(--duration-fast)',
    outline: 'none',
    opacity: disabled ? 0.4 : 1,
    height: size === 'sm' ? '24px' : size === 'lg' ? '36px' : '28px',
    padding: size === 'sm' ? '0 8px' : size === 'lg' ? '0 16px' : '0 10px',
  };

  let variantStyles: React.CSSProperties = {};

  switch (variant) {
    case 'primary':
      variantStyles = {
        backgroundColor: 'var(--color-accent)',
        color: 'var(--color-text-on-accent)',
        borderColor: 'var(--color-accent)',
      };
      break;
    case 'secondary':
      variantStyles = {
        backgroundColor: active ? 'var(--color-panel-pressed)' : 'var(--color-panel-raised)',
        color: 'var(--color-text-primary)',
        borderColor: 'var(--color-border-subtle)',
      };
      break;
    case 'ghost':
      variantStyles = {
        backgroundColor: active ? 'var(--color-panel-hover)' : 'transparent',
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
      };
      break;
    case 'danger':
      variantStyles = {
        backgroundColor: 'var(--color-danger-subtle)',
        color: 'var(--color-danger)',
        borderColor: 'var(--color-danger)',
      };
      break;
  }

  return (
    <button
      style={{ ...baseStyles, ...variantStyles }}
      disabled={disabled}
      className={className}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
