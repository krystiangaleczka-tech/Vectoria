import { describe, expect, it } from 'vitest';
import {
  createDefaultDocument,
  CreateObjectsCommand,
  createTransform,
  defaultObjectStyle,
  type RectangleObject,
  type EllipseObject,
} from '@vectoria/core';
import { MemoryDocumentRepository } from '../src/storage/document-repository.js';
import { MemoryWorkspaceRepository } from '../src/storage/workspace-repository.js';
import type { PersistedDocument } from '../src/schema/document-v1.js';

describe('Multi-project independent persistence (SAAS-002, EXPORT-018)', () => {
  it('keeps independent document state for two projects without key collisions', async () => {
    const docRepo = new MemoryDocumentRepository();
    const workspaceRepo = new MemoryWorkspaceRepository();

    // 1. Create Project A with rectangle
    let docA = {
      ...createDefaultDocument(),
      id: 'doc-proj-a',
      name: 'Projekt A',
    };
    const rect: RectangleObject = {
      type: 'rectangle',
      id: 'rect-1',
      name: 'Prostokąt A',
      layerId: docA.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 10, y: 10 }),
      style: defaultObjectStyle,
      width: 100,
      height: 80,
      cornerRadius: 0,
    };
    docA = new CreateObjectsCommand([rect], docA.activeLayerId).execute(docA);

    const snapshotA: PersistedDocument = {
      app: 'vectoria',
      schemaVersion: docA.schemaVersion,
      document: docA,
      revision: 1,
      savedAt: new Date().toISOString(),
    };
    await docRepo.save(docA.id, snapshotA);
    const projA = await workspaceRepo.createProject({
      name: 'Projekt A',
      documentId: docA.id,
    });

    // 2. Create Project B with ellipse
    let docB = {
      ...createDefaultDocument(),
      id: 'doc-proj-b',
      name: 'Projekt B',
    };
    const ellipse: EllipseObject = {
      type: 'ellipse',
      id: 'circle-1',
      name: 'Koło B',
      layerId: docB.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 50, y: 50 }),
      style: defaultObjectStyle,
      width: 60,
      height: 60,
    };
    docB = new CreateObjectsCommand([ellipse], docB.activeLayerId).execute(docB);

    const snapshotB: PersistedDocument = {
      app: 'vectoria',
      schemaVersion: docB.schemaVersion,
      document: docB,
      revision: 1,
      savedAt: new Date().toISOString(),
    };
    await docRepo.save(docB.id, snapshotB);
    const projB = await workspaceRepo.createProject({
      name: 'Projekt B',
      documentId: docB.id,
    });

    // 3. Verify both projects exist in workspace with distinct documentIds
    expect(projA.documentId).toBe('doc-proj-a');
    expect(projB.documentId).toBe('doc-proj-b');
    expect(projA.documentId).not.toBe(projB.documentId);

    // 4. Verify loading Project A returns only Project A shapes
    const loadedA = await docRepo.load(projA.documentId);
    expect(loadedA).not.toBeNull();
    expect(loadedA?.document.name).toBe('Projekt A');
    expect(Object.keys(loadedA?.document.objects ?? {})).toEqual(['rect-1']);

    // 5. Verify loading Project B returns only Project B shapes
    const loadedB = await docRepo.load(projB.documentId);
    expect(loadedB).not.toBeNull();
    expect(loadedB?.document.name).toBe('Projekt B');
    expect(Object.keys(loadedB?.document.objects ?? {})).toEqual(['circle-1']);

    // 6. Delete Project A and its document
    await workspaceRepo.deleteProject(projA.id);
    await docRepo.deleteDocument(projA.documentId);

    expect(await docRepo.load(projA.documentId)).toBeNull();
    // Project B is completely intact
    const intactB = await docRepo.load(projB.documentId);
    expect(intactB).not.toBeNull();
    expect(Object.keys(intactB?.document.objects ?? {})).toEqual(['circle-1']);
  });
});
