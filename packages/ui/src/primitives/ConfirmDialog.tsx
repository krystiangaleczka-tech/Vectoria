import React, { useId } from 'react';
import { Dialog } from './Dialog.js';
import { Button } from './Button.js';

export interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  width?: number | string;
  testId?: string;
}

/**
 * Standard confirmation dialog for destructive or irreversible actions.
 * Prompts user with title, explanation, and explicit Confirm / Cancel buttons.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Anuluj',
  destructive = true,
  onConfirm,
  onCancel,
  width = 440,
  testId = 'confirm-dialog',
}) => {
  const titleId = useId();
  const defaultConfirmLabel = destructive ? 'Usuń' : 'Potwierdź';

  return (
    <Dialog
      labelledBy={titleId}
      onClose={onCancel}
      width={width}
      testId={testId}
    >
      <div style={{ padding: '20px 24px 16px' }}>
        <h3
          id={titleId}
          data-testid={`${testId}-title`}
          style={{
            margin: '0 0 10px 0',
            fontSize: '16px',
            fontWeight: 600,
            color: destructive ? 'var(--color-danger, #f06a6a)' : 'var(--color-text-primary, #f0f0eb)',
          }}
        >
          {title}
        </h3>
        <p
          data-testid={`${testId}-description`}
          style={{
            margin: 0,
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'var(--color-text-secondary, #c5c5be)',
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          padding: '14px 24px',
          borderTop: '1px solid var(--color-border-subtle, #33332f)',
          backgroundColor: 'var(--color-panel-raised, #2e2e2b)',
        }}
      >
        <Button
          variant="secondary"
          size="md"
          data-testid={`${testId}-cancel`}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          size="md"
          data-testid={`${testId}-confirm`}
          onClick={onConfirm}
        >
          {confirmLabel ?? defaultConfirmLabel}
        </Button>
      </div>
    </Dialog>
  );
};
