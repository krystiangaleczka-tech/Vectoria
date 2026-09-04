import React, { useRef, useEffect } from 'react';

export interface DialogProps {
  labelledBy?: string;
  ariaLabel?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number | string;
  className?: string;
  testId?: string;
  closeOnBackdropClick?: boolean;
  modal?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog primitive enforcing focus trapping, Escape key closing,
 * and automatic focus restoration upon dismissal according to WAI-ARIA guidelines.
 */
export const Dialog: React.FC<DialogProps> = ({
  labelledBy,
  ariaLabel,
  onClose,
  children,
  width = 560,
  className = '',
  testId = 'vectoria-dialog',
  closeOnBackdropClick = true,
  modal = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus the first interactive element or dialog body
    const el = containerRef.current;
    if (el) {
      const firstFocusable = el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        el.focus();
      }
    }

    return () => {
      // Restore focus to trigger element when dialog closes
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      const el = containerRef.current;
      if (!el) return;

      const focusables = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((node) => {
        if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
          const style = window.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
        }
        return true;
      });

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;

      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modal && closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="presentation"
      data-testid={`${testId}-backdrop`}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: modal ? 'rgba(0, 0, 0, 0.65)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        pointerEvents: modal ? 'auto' : 'none',
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal={modal ? 'true' : undefined}
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        data-testid={testId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`vectoria-dialog-card ${className}`.trim()}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          maxWidth: '95vw',
          maxHeight: '90vh',
          backgroundColor: 'var(--color-panel, #262624)',
          color: 'var(--color-text-primary, #f0f0eb)',
          borderRadius: 'var(--radius-lg, 8px)',
          border: '1px solid var(--color-border-default, #464641)',
          boxShadow: 'var(--shadow-dialog, 0 20px 60px rgba(0, 0, 0, 0.5))',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
};
