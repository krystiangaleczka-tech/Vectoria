import { describe, expect, it } from 'vitest';
import { createDefaultDocument } from '../src/model/factory.js';
import { validateInvariants } from '../src/model/invariants.js';
import type { CanvasAnnotation } from '../src/model/types.js';
import {
  AddAnnotationCommand,
  DeleteAnnotationCommand,
  MoveAnnotationPinCommand,
  UpdateAnnotationCommand,
} from '../src/commands/comment-commands.js';

describe('Canvas Annotations (EPIC-17 SAAS-012..014)', () => {
  const sampleAnnotation: CanvasAnnotation = {
    id: 'ann-1',
    projectId: 'proj-1',
    worldPoint: { x: 150, y: 220 },
    body: 'Proszę zmienić kolor tła tego nagłówka @designer',
    authorName: 'Jan Kowalski',
    resolved: false,
    mentions: ['designer'],
    createdAt: '2026-09-04T05:00:00.000Z',
    updatedAt: '2026-09-04T05:00:00.000Z',
  };

  it('AddAnnotationCommand adds annotation, supports undo/redo, and preserves immutability', () => {
    const doc = createDefaultDocument();
    expect(doc.annotations).toBeUndefined();

    const cmd = new AddAnnotationCommand(sampleAnnotation);
    const addedDoc = cmd.execute(doc);

    expect(addedDoc.annotations).toHaveLength(1);
    expect(addedDoc.annotations?.[0]).toEqual(sampleAnnotation);
    expect(doc.annotations).toBeUndefined(); // original untouched

    const undoneDoc = cmd.undo(addedDoc);
    expect(undoneDoc.annotations).toHaveLength(0);

    const redoneDoc = cmd.execute(undoneDoc);
    expect(redoneDoc.annotations).toHaveLength(1);
    expect(redoneDoc.annotations?.[0]?.id).toBe('ann-1');
  });

  it('UpdateAnnotationCommand updates body and resolved state, and restores previous on undo', () => {
    const doc = createDefaultDocument();
    const docWithAnn = new AddAnnotationCommand(sampleAnnotation).execute(doc);

    const updateCmd = new UpdateAnnotationCommand('ann-1', {
      body: 'Poprawiono kolor nagłówka @lead',
      resolved: true,
      mentions: ['lead'],
    });

    const updatedDoc = updateCmd.execute(docWithAnn);
    const updated = updatedDoc.annotations?.find((a) => a.id === 'ann-1');
    expect(updated?.body).toBe('Poprawiono kolor nagłówka @lead');
    expect(updated?.resolved).toBe(true);
    expect(updated?.mentions).toEqual(['lead']);

    const undoneDoc = updateCmd.undo(updatedDoc);
    const reverted = undoneDoc.annotations?.find((a) => a.id === 'ann-1');
    expect(reverted?.body).toBe('Proszę zmienić kolor tła tego nagłówka @designer');
    expect(reverted?.resolved).toBe(false);
    expect(reverted?.mentions).toEqual(['designer']);
  });

  it('DeleteAnnotationCommand removes annotation and restores on undo', () => {
    const doc = createDefaultDocument();
    const docWithAnn = new AddAnnotationCommand(sampleAnnotation).execute(doc);

    const delCmd = new DeleteAnnotationCommand('ann-1');
    const deletedDoc = delCmd.execute(docWithAnn);
    expect(deletedDoc.annotations).toHaveLength(0);

    const undoneDoc = delCmd.undo(deletedDoc);
    expect(undoneDoc.annotations).toHaveLength(1);
    expect(undoneDoc.annotations?.[0]?.id).toBe('ann-1');
  });

  it('MoveAnnotationPinCommand updates world coordinates and reverts cleanly', () => {
    const doc = createDefaultDocument();
    const docWithAnn = new AddAnnotationCommand(sampleAnnotation).execute(doc);

    const moveCmd = new MoveAnnotationPinCommand('ann-1', { x: 300, y: 450 });
    const movedDoc = moveCmd.execute(docWithAnn);
    expect(movedDoc.annotations?.[0]?.worldPoint).toEqual({ x: 300, y: 450 });

    const undoneDoc = moveCmd.undo(movedDoc);
    expect(undoneDoc.annotations?.[0]?.worldPoint).toEqual({ x: 150, y: 220 });
  });

  it('validates annotation invariants: finite coordinates, body lengths, and author limits', () => {
    const validDoc = new AddAnnotationCommand(sampleAnnotation).execute(createDefaultDocument());
    expect(validateInvariants(validDoc)).toEqual([]);

    // Non-finite point
    const nonFiniteDoc = {
      ...validDoc,
      annotations: [{ ...sampleAnnotation, worldPoint: { x: NaN, y: 100 } }],
    };
    const violations1 = validateInvariants(nonFiniteDoc);
    expect(violations1.some((v) => v.code === 'INVALID_ANNOTATION_POINT')).toBe(true);

    // Empty body
    const emptyBodyDoc = {
      ...validDoc,
      annotations: [{ ...sampleAnnotation, body: '   ' }],
    };
    const violations2 = validateInvariants(emptyBodyDoc);
    expect(violations2.some((v) => v.code === 'INVALID_ANNOTATION_BODY')).toBe(true);

    // Duplicate annotation ID
    const duplicateIdDoc = {
      ...validDoc,
      annotations: [sampleAnnotation, { ...sampleAnnotation, worldPoint: { x: 10, y: 10 } }],
    };
    const violations3 = validateInvariants(duplicateIdDoc);
    expect(violations3.some((v) => v.code === 'DUPLICATE_ANNOTATION_ID')).toBe(true);
  });
});
