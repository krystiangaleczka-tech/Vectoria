import { describe, expect, it } from 'vitest';
import { CommandRegistry, type EditorCommand, type EditorContext } from '../src/commands/command-registry.js';
import { evaluateNumber } from '../src/math/expression-parser.js';

describe('EPIC-14: Command Registry & Math Parser', () => {
  describe('CommandRegistry', () => {
    it('registers and searches commands respecting enabled state', () => {
      const registry = new CommandRegistry();
      const duplicateCmd: EditorCommand = {
        id: 'object.duplicate',
        title: 'Powiel obiekt',
        shortcut: 'Mod+D',
        enabled: (ctx: EditorContext) => {
          const sel = ctx.selection;
          if ('objectIds' in sel) return sel.objectIds.length > 0;
          return sel.length > 0;
        },
        execute: () => {},
      };
      const newDocCmd: EditorCommand = {
        id: 'file.new',
        title: 'Nowy dokument',
        shortcut: 'Mod+N',
        enabled: () => true,
        execute: () => {},
      };

      registry.register(duplicateCmd);
      registry.register(newDocCmd);

      const ctxWithSelection: EditorContext = {
        selection: ['obj-1'],
        canUndo: true,
        canRedo: false,
      };

      const ctxWithoutSelection: EditorContext = {
        selection: [],
        canUndo: false,
        canRedo: false,
      };

      const results1 = registry.search('Powiel', ctxWithSelection);
      expect(results1).toHaveLength(1);
      expect(results1[0]!.command.id).toBe('object.duplicate');
      expect(results1[0]!.enabled).toBe(true);

      const results2 = registry.search('Powiel', ctxWithoutSelection);
      expect(results2[0]!.enabled).toBe(false);
    });
  });

  describe('evaluateNumber', () => {
    it('evaluates basic arithmetic operations', () => {
      expect(evaluateNumber('120 + 30')).toBe(150);
      expect(evaluateNumber('100 - 40')).toBe(60);
      expect(evaluateNumber('20 * 4')).toBe(80);
      expect(evaluateNumber('100 / 4')).toBe(25);
      expect(evaluateNumber('(10 + 20) * 3')).toBe(90);
    });

    it('evaluates percentages against context base', () => {
      expect(evaluateNumber('50%', { base: 200 })).toBe(100);
      expect(evaluateNumber('25%', { base: 400 })).toBe(100);
      expect(evaluateNumber('+10%', { base: 100 })).toBe(110);
      expect(evaluateNumber('-20%', { base: 100 })).toBe(80);
    });

    it('evaluates units into pixel equivalents', () => {
      expect(evaluateNumber('2in')).toBe(192); // 2 * 96
      expect(evaluateNumber('100px')).toBe(100);
      expect(evaluateNumber('25.4mm')).toBeCloseTo(96, 1);
    });
  });
});
