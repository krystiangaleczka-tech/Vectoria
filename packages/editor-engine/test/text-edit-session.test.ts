import { describe, it, expect } from 'vitest';
import { TextEditSession } from '../src/index.js';

describe('TextEditSession', () => {
  it('inserts text and navigates caret accurately', () => {
    const session = new TextEditSession('obj-1', 'Hello');
    expect(session.caret).toBe(5);

    session.insertText(' World');
    expect(session.text).toBe('Hello World');
    expect(session.caret).toBe(11);

    session.moveCaret('left');
    expect(session.caret).toBe(10);

    session.deleteBackward();
    expect(session.text).toBe('Hello Word');
    expect(session.caret).toBe(9);
  });

  it('handles Unicode code points and emoji without character splitting', () => {
    const session = new TextEditSession('obj-1', 'Hi 🚀!');
    expect(session.totalCodePoints).toBe(5); // 'H', 'i', ' ', '🚀', '!'

    session.moveCaret('left'); // before '!'
    session.deleteBackward(); // deletes '🚀' in single operation
    expect(session.text).toBe('Hi !');
    expect(session.totalCodePoints).toBe(4);
  });

  it('manages text selection and replacement', () => {
    const session = new TextEditSession('obj-1', 'Quick brown fox');
    session.setSelection(6, 11); // selects 'brown'
    expect(session.getSelectedText()).toBe('brown');

    session.insertText('red');
    expect(session.text).toBe('Quick red fox');
    expect(session.selection).toBeNull();
  });

  it('selects words and paragraphs', () => {
    const session = new TextEditSession('obj-1', 'First sentence.\nSecond line.');
    session.selectWordAt(8); // inside 'sentence'
    expect(session.getSelectedText()).toBe('sentence');

    session.selectParagraphAt(20); // inside 'Second line.'
    expect(session.getSelectedText()).toBe('Second line.');
  });

  it('moves caret vertically while preserving code-point column', () => {
    const session = new TextEditSession('obj-1', 'A\nWW\n😀');
    session.moveCaret('home');
    session.moveCaret('right');
    session.moveCaretVertical('down');
    expect(session.caret).toBe(3);
    session.moveCaretVertical('down');
    expect(session.caret).toBe(6);
  });
});
