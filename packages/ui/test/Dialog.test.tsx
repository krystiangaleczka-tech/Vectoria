// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { Dialog } from '../src/primitives/Dialog.js';

describe('Dialog primitive', () => {
  it('renders with accessibility attributes and focus trap', () => {
    const handleClose = vi.fn();

    render(
      <Dialog labelledBy="test-title" onClose={handleClose} testId="test-modal">
        <h2 id="test-title">Tytuł modala</h2>
        <input data-testid="input-1" placeholder="Input 1" />
        <button data-testid="btn-1">Zatwierdź</button>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'test-title');

    // First interactive element should be focused
    const input1 = screen.getByTestId('input-1');
    expect(document.activeElement).toBe(input1);
  });

  it('cycles focus on Tab and Shift+Tab (focus trap)', () => {
    const handleClose = vi.fn();

    render(
      <Dialog labelledBy="test-title" onClose={handleClose} testId="test-modal">
        <h2 id="test-title">Tytuł modala</h2>
        <input data-testid="first-input" />
        <button data-testid="last-btn">Koniec</button>
      </Dialog>
    );

    const first = screen.getByTestId('first-input');
    const last = screen.getByTestId('last-btn');

    // Focus last element, then press Tab -> should cycle to first
    last.focus();
    expect(document.activeElement).toBe(last);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(first);

    // Press Shift+Tab on first -> should cycle to last
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('closes when Escape key is pressed', () => {
    const handleClose = vi.fn();

    render(
      <Dialog labelledBy="test-title" onClose={handleClose}>
        <h2 id="test-title">Tytuł</h2>
        <button>OK</button>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to previous active element on close', () => {
    const TestComponent = () => {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button data-testid="trigger-btn" onClick={() => setOpen(true)}>
            Otwórz
          </button>
          {open && (
            <Dialog labelledBy="dialog-title" onClose={() => setOpen(false)}>
              <h2 id="dialog-title">Modal</h2>
              <button data-testid="close-btn" onClick={() => setOpen(false)}>
                Zamknij
              </button>
            </Dialog>
          )}
        </div>
      );
    };

    render(<TestComponent />);

    const trigger = screen.getByTestId('trigger-btn');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Click trigger to open
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close dialog
    const closeBtn = screen.getByTestId('close-btn');
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on backdrop click but does not close when clicking inside dialog content', () => {
    const handleClose = vi.fn();

    render(
      <Dialog labelledBy="test-title" onClose={handleClose} testId="test-modal">
        <h2 id="test-title">Tytuł</h2>
        <button data-testid="content-btn">Wewnątrz</button>
      </Dialog>
    );

    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement;
    expect(backdrop).toBeInTheDocument();

    // Click inside content
    const contentBtn = screen.getByTestId('content-btn');
    fireEvent.click(contentBtn);
    expect(handleClose).not.toHaveBeenCalled();

    // Click backdrop
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('focus trap ignores disabled buttons and includes textarea and select', () => {
    const handleClose = vi.fn();

    render(
      <Dialog labelledBy="test-title" onClose={handleClose}>
        <h2 id="test-title">Tytuł</h2>
        <button disabled data-testid="disabled-btn">Nieaktywny</button>
        <textarea data-testid="first-field" defaultValue="Tekst" />
        <select data-testid="middle-select">
          <option value="1">Opcja 1</option>
        </select>
        <button data-testid="last-active-btn">Aktywny</button>
      </Dialog>
    );

    const firstField = screen.getByTestId('first-field');
    const lastActive = screen.getByTestId('last-active-btn');
    const disabledBtn = screen.getByTestId('disabled-btn');

    // First active element focused (textarea, skipping disabled button)
    expect(document.activeElement).toBe(firstField);
    expect(document.activeElement).not.toBe(disabledBtn);

    // Tab cycle from last to first
    lastActive.focus();
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(firstField);
  });
});
