import { describe, expect, it } from 'vitest';
import {
  routeCanvasKeyDown,
  routeCanvasKeyUp,
  type CanvasKeyboardEventLike,
  type CanvasKeyboardRouteContext,
} from '../src/interaction/canvas-keyboard-router.js';

const event = (
  key: string,
  overrides: Partial<CanvasKeyboardEventLike> = {},
): CanvasKeyboardEventLike => ({
  key,
  code: overrides.code ?? key,
  shiftKey: overrides.shiftKey ?? false,
  ctrlKey: overrides.ctrlKey ?? false,
  metaKey: overrides.metaKey ?? false,
  altKey: overrides.altKey ?? false,
});

const context = (
  overrides: Partial<CanvasKeyboardRouteContext> = {},
): CanvasKeyboardRouteContext => ({
  activeTool: 'select',
  textEditActive: false,
  hasObjectSelection: false,
  hasNodeSelection: false,
  blockedByTextInput: false,
  ...overrides,
});

describe('canvas keyboard router', () => {
  it('ignores canvas routing while a text input owns focus', () => {
    expect(routeCanvasKeyDown(event('Delete'), context({
      hasObjectSelection: true,
      blockedByTextInput: true,
    }))).toBeNull();
  });

  it('gives active text editing priority over document shortcuts', () => {
    expect(routeCanvasKeyDown(event('Escape'), context({ textEditActive: true }))).toEqual({
      type: 'text-edit',
      command: { type: 'cancel' },
    });
    expect(routeCanvasKeyDown(event('Enter'), context({ textEditActive: true }))).toEqual({
      type: 'text-edit',
      command: { type: 'insert-newline' },
    });
    expect(routeCanvasKeyDown(event('ArrowLeft', { shiftKey: true }), context({ textEditActive: true }))).toEqual({
      type: 'text-edit',
      command: { type: 'move-horizontal', direction: 'left', extendSelection: true },
    });
    expect(routeCanvasKeyDown(event('a', { ctrlKey: true }), context({ textEditActive: true }))).toEqual({
      type: 'text-edit',
      command: { type: 'select-all' },
    });
    expect(routeCanvasKeyDown(event('x'), context({ textEditActive: true }))).toEqual({
      type: 'text-edit',
      command: { type: 'insert-text', text: 'x' },
    });
  });

  it('keeps temporary Space pan separate from persistent tool activation', () => {
    expect(routeCanvasKeyDown(event(' ', { code: 'Space' }), context())).toEqual({
      type: 'space-pan',
      pressed: true,
    });
    expect(routeCanvasKeyUp(event(' ', { code: 'Space' }))).toEqual({
      type: 'space-pan',
      pressed: false,
    });
  });

  it('routes Pen and Direct Select deletion before generic object deletion', () => {
    expect(routeCanvasKeyDown(event('Delete'), context({
      activeTool: 'pen',
      hasObjectSelection: true,
    }))).toEqual({ type: 'pen-delete', key: 'Delete' });

    expect(routeCanvasKeyDown(event('Backspace'), context({
      activeTool: 'direct-select',
      hasObjectSelection: true,
      hasNodeSelection: true,
    }))).toEqual({ type: 'direct-select-delete-node' });

    expect(routeCanvasKeyDown(event('Delete'), context({
      activeTool: 'direct-select',
      hasObjectSelection: true,
      hasNodeSelection: false,
    }))).toEqual({ type: 'delete-selection' });
  });

  it('routes nudge only when object selection exists', () => {
    expect(routeCanvasKeyDown(event('ArrowRight'), context())).toBeNull();
    expect(routeCanvasKeyDown(event('ArrowRight', { shiftKey: true }), context({
      hasObjectSelection: true,
    }))).toEqual({
      type: 'nudge',
      key: 'ArrowRight',
      shiftKey: true,
    });
  });

  it('routes Pen, Polyline and generic Escape with the same precedence as the viewport', () => {
    expect(routeCanvasKeyDown(event('Escape'), context({ activeTool: 'pen' }))).toEqual({
      type: 'pen-key',
      key: 'Escape',
    });

    expect(routeCanvasKeyDown(event('Backspace'), context({ activeTool: 'polyline' }))).toEqual({
      type: 'polyline-key',
      key: 'Backspace',
    });

    expect(routeCanvasKeyDown(event('Escape'), context({ activeTool: 'select' }))).toEqual({
      type: 'escape',
    });
  });

  it('routes Alt transitions on keydown and keyup', () => {
    expect(routeCanvasKeyDown(event('Alt', { altKey: true }), context())).toEqual({
      type: 'alt-key',
      pressed: true,
    });
    expect(routeCanvasKeyUp(event('Alt', { altKey: false }))).toEqual({
      type: 'alt-key',
      pressed: false,
    });
  });
});
