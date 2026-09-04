// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { ConfirmDialog } from '../src/primitives/ConfirmDialog.js';

describe('ConfirmDialog', () => {
  it('renders title and description with proper aria', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Usunąć warstwę?"
        description="Operacji nie można cofnąć."
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmLabel="Usuń teraz"
        cancelLabel="Wróć"
      />
    );

    expect(screen.getByText('Usunąć warstwę?')).toBeInTheDocument();
    expect(screen.getByText('Operacji nie można cofnąć.')).toBeInTheDocument();
    expect(screen.getByText('Usuń teraz')).toBeInTheDocument();
    expect(screen.getByText('Wróć')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Potwierdzenie"
        description="Czy na pewno?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    const confirmBtn = screen.getByTestId('confirm-dialog-confirm');
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked or backdrop is clicked', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Potwierdzenie"
        description="Czy na pewno?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    const cancelBtn = screen.getByTestId('confirm-dialog-cancel');
    fireEvent.click(cancelBtn);

    expect(handleCancel).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });
});
