// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StrictMode } from 'react';
import { NumberInput } from '../src/primitives/NumberInput.js';

describe('NumberInput', () => {
  it('renders with initial value', () => {
    render(<NumberInput label="X" value={42} onChange={() => {}} />);
    const input = screen.getByDisplayValue('42');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange when user types and blurs', () => {
    let changedValue = 0;
    render(<NumberInput label="X" value={10} onChange={(v) => { changedValue = v; }} />);
    
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.blur(input);
    
    expect(changedValue).toBe(25);
  });

  it('synchronizes displayed text when value prop changes externally', () => {
    const { rerender } = render(
      <NumberInput label="X" value={10} onChange={() => {}} />
    );

    // Initial value
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();

    // External value change (e.g., after drag, undo/redo)
    rerender(<NumberInput label="X" value={42} onChange={() => {}} />);

    // Should display new value
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
  });

  it('does not overwrite user input while focused', () => {
    const { rerender } = render(
      <NumberInput label="X" value={10} onChange={() => {}} />
    );

    const input = screen.getByDisplayValue('10');
    
    // User focuses and starts typing
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '99' } });
    
    // External value change while user is editing
    rerender(<NumberInput label="X" value={42} onChange={() => {}} />);
    
    // Should NOT overwrite user's input while focused
    expect(input).toHaveValue('99');
    
    // After blur, should sync with external value
    fireEvent.blur(input);
    expect(input).toHaveValue('42');
  });

  it('clamps value to min/max on commit', () => {
    let changedValue = 0;
    render(<NumberInput label="X" value={50} min={0} max={100} onChange={(v) => { changedValue = v; }} />);
    
    const input = screen.getByDisplayValue('50');
    
    // Try to set value above max
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.blur(input);
    expect(changedValue).toBe(100);
    
    // Try to set value below min
    fireEvent.change(input, { target: { value: '-50' } });
    fireEvent.blur(input);
    expect(changedValue).toBe(0);
  });

  it('reverts to current value on invalid input', () => {
    render(<NumberInput label="X" value={42} onChange={() => {}} />);
    
    const input = screen.getByDisplayValue('42');
    
    // Type invalid value
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    
    // Should revert to last valid value
    expect(input).toHaveValue('42');
  });

  it('handles arrow key increments', () => {
    let changedValue = 10;
    render(<NumberInput label="X" value={10} step={5} onChange={(v) => { changedValue = v; }} />);
    
    const input = screen.getByDisplayValue('10');
    
    // ArrowUp should increment by step
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(changedValue).toBe(15);
    
    // ArrowDown should decrement by step
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(changedValue).toBe(10);
  });

  it('handles Shift+Arrow for larger increments', () => {
    let changedValue = 10;
    render(<NumberInput label="X" value={10} step={5} onChange={(v) => { changedValue = v; }} />);
    
    const input = screen.getByDisplayValue('10');
    
    // Shift+ArrowUp should increment by step * 10
    fireEvent.keyDown(input, { key: 'ArrowUp', shiftKey: true });
    expect(changedValue).toBe(60);
  });

  it('respects decimals prop', () => {
    render(<NumberInput label="X" value={3.14159} decimals={2} onChange={() => {}} />);
    
    const input = screen.getByDisplayValue('3.14');
    expect(input).toBeInTheDocument();
  });

  it('displays unit suffix', () => {
    render(<NumberInput label="X" value={100} unit="px" onChange={() => {}} />);
    
    expect(screen.getByText('px')).toBeInTheDocument();
  });

  it('reverts to current value on Escape', () => {
    render(<NumberInput label="X" value={42} onChange={() => {}} />);
    
    const input = screen.getByDisplayValue('42');
    
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    
    expect(input).toHaveValue('42');
  });

  it('commits value on Enter', () => {
    let changedValue = 0;
    render(<NumberInput label="X" value={10} onChange={(v) => { changedValue = v; }} />);
    
    const input = screen.getByDisplayValue('10');
    
    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(changedValue).toBe(75);
  });

  it('synchronizes external value in StrictMode', () => {
    const { rerender } = render(
      <StrictMode>
        <NumberInput label="X" value={10} onChange={() => {}} />
      </StrictMode>,
    );

    rerender(
      <StrictMode>
        <NumberInput label="X" value={42} onChange={() => {}} />
      </StrictMode>,
    );

    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
  });

  it('reformats text when decimals changes externally', () => {
    const { rerender } = render(
      <NumberInput label="X" value={3.14159} decimals={0} onChange={() => {}} />,
    );

    expect(screen.getByDisplayValue('3')).toBeInTheDocument();

    rerender(
      <NumberInput label="X" value={3.14159} decimals={2} onChange={() => {}} />,
    );

    expect(screen.getByDisplayValue('3.14')).toBeInTheDocument();
  });
});
