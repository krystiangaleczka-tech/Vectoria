export type CanvasArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export interface CanvasKeyboardEventLike {
  key: string;
  code?: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

export interface CanvasKeyboardRouteContext {
  activeTool: string;
  textEditActive: boolean;
  hasObjectSelection: boolean;
  hasNodeSelection: boolean;
  blockedByTextInput: boolean;
}

export type CanvasTextEditKeyboardCommand =
  | { type: 'cancel' }
  | { type: 'insert-newline' }
  | { type: 'delete-backward' }
  | { type: 'delete-forward' }
  | { type: 'move-horizontal'; direction: 'left' | 'right'; extendSelection: boolean }
  | { type: 'move-vertical'; direction: 'up' | 'down'; extendSelection: boolean }
  | { type: 'move-boundary'; direction: 'home' | 'end'; extendSelection: boolean }
  | { type: 'select-all' }
  | { type: 'insert-text'; text: string };

export type CanvasKeyboardAction =
  | { type: 'text-edit'; command: CanvasTextEditKeyboardCommand }
  | { type: 'alt-key'; pressed: boolean }
  | { type: 'space-pan'; pressed: boolean }
  | { type: 'pen-delete'; key: 'Delete' | 'Backspace' }
  | { type: 'direct-select-delete-node' }
  | { type: 'delete-selection' }
  | { type: 'nudge'; key: CanvasArrowKey; shiftKey: boolean }
  | { type: 'pen-key'; key: 'Enter' | 'Escape' }
  | { type: 'polyline-key'; key: 'Enter' | 'Escape' | 'Backspace' | 'Delete' }
  | { type: 'escape' };

const ARROW_KEYS = new Set<CanvasArrowKey>(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const POLYLINE_KEYS = new Set(['Enter', 'Escape', 'Backspace', 'Delete']);

function routeTextEditKey(event: CanvasKeyboardEventLike): CanvasKeyboardAction | null {
  if (event.key === 'Escape') {
    return { type: 'text-edit', command: { type: 'cancel' } };
  }
  if (event.key === 'Enter') {
    return { type: 'text-edit', command: { type: 'insert-newline' } };
  }
  if (event.key === 'Backspace') {
    return { type: 'text-edit', command: { type: 'delete-backward' } };
  }
  if (event.key === 'Delete') {
    return { type: 'text-edit', command: { type: 'delete-forward' } };
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    return {
      type: 'text-edit',
      command: {
        type: 'move-horizontal',
        direction: event.key === 'ArrowLeft' ? 'left' : 'right',
        extendSelection: event.shiftKey,
      },
    };
  }
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    return {
      type: 'text-edit',
      command: {
        type: 'move-vertical',
        direction: event.key === 'ArrowUp' ? 'up' : 'down',
        extendSelection: event.shiftKey,
      },
    };
  }
  if (event.key === 'Home' || event.key === 'End') {
    return {
      type: 'text-edit',
      command: {
        type: 'move-boundary',
        direction: event.key === 'Home' ? 'home' : 'end',
        extendSelection: event.shiftKey,
      },
    };
  }
  if ((event.key === 'a' || event.key === 'A') && (event.ctrlKey || event.metaKey)) {
    return { type: 'text-edit', command: { type: 'select-all' } };
  }
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    return { type: 'text-edit', command: { type: 'insert-text', text: event.key } };
  }
  return null;
}

export function routeCanvasKeyDown(
  event: CanvasKeyboardEventLike,
  context: CanvasKeyboardRouteContext,
): CanvasKeyboardAction | null {
  if (context.blockedByTextInput) return null;

  if (context.textEditActive) {
    return routeTextEditKey(event);
  }

  if (event.key === 'Alt') {
    return { type: 'alt-key', pressed: event.altKey };
  }

  if (event.code === 'Space') {
    return { type: 'space-pan', pressed: true };
  }

  if (context.activeTool === 'pen' && (event.key === 'Delete' || event.key === 'Backspace')) {
    return { type: 'pen-delete', key: event.key };
  }

  if (
    context.activeTool === 'direct-select'
    && (event.key === 'Delete' || event.key === 'Backspace')
    && context.hasNodeSelection
  ) {
    return { type: 'direct-select-delete-node' };
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && context.hasObjectSelection) {
    return { type: 'delete-selection' };
  }

  if (ARROW_KEYS.has(event.key as CanvasArrowKey)) {
    if (!context.hasObjectSelection) return null;
    return {
      type: 'nudge',
      key: event.key as CanvasArrowKey,
      shiftKey: event.shiftKey,
    };
  }

  if (context.activeTool === 'pen' && (event.key === 'Enter' || event.key === 'Escape')) {
    return { type: 'pen-key', key: event.key };
  }

  if (context.activeTool === 'polyline' && POLYLINE_KEYS.has(event.key)) {
    return {
      type: 'polyline-key',
      key: event.key as 'Enter' | 'Escape' | 'Backspace' | 'Delete',
    };
  }

  if (event.key === 'Escape') {
    return { type: 'escape' };
  }

  return null;
}

export function routeCanvasKeyUp(event: CanvasKeyboardEventLike): CanvasKeyboardAction | null {
  if (event.key === 'Alt') {
    return { type: 'alt-key', pressed: event.altKey };
  }

  if (event.code === 'Space') {
    return { type: 'space-pan', pressed: false };
  }

  return null;
}
