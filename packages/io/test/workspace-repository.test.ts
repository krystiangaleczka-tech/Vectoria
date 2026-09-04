import { describe, expect, it } from 'vitest';
import {
  MemoryWorkspaceRepository,
  WorkspaceMetaSchema,
  WORKSPACE_LIMITS,
} from '../src/storage/workspace-repository.js';

describe('WorkspaceRepository (EPIC-17 SAAS-002..005, SAAS-020)', () => {
  it('creates projects, folders, and tags and organizes them cleanly', async () => {
    const repo = new MemoryWorkspaceRepository();

    const folder = await repo.createFolder('Marketing 2026', '#3b82f6');
    expect(folder.name).toBe('Marketing 2026');
    expect(folder.color).toBe('#3b82f6');

    const tag1 = await repo.createTag('Q3', '#10b981');
    const tag2 = await repo.createTag('Hero', '#f59e0b');

    const proj = await repo.createProject({
      name: 'Banner Kampanii',
      folderId: folder.id,
      tags: [tag1.id, tag2.id],
      documentId: 'doc-123',
    });

    expect(proj.name).toBe('Banner Kampanii');
    expect(proj.folderId).toBe(folder.id);
    expect(proj.tags).toEqual([tag1.id, tag2.id]);

    const meta = await repo.loadMeta();
    expect(meta.projects).toHaveLength(1);
    expect(meta.folders).toHaveLength(1);
    expect(meta.tags).toHaveLength(2);
    expect(meta.activeProjectId).toBe(proj.id);
  });

  it('filters and searches projects by keyword, folder, and tag', async () => {
    const repo = new MemoryWorkspaceRepository();
    const folderA = await repo.createFolder('Folder A');
    const folderB = await repo.createFolder('Folder B');
    const tagVIP = await repo.createTag('VIP', '#ef4444');

    await repo.createProject({ name: 'Projekt Alfa', folderId: folderA.id, tags: [tagVIP.id], documentId: 'doc-a' });
    await repo.createProject({ name: 'Projekt Beta', folderId: folderB.id, tags: [], documentId: 'doc-b' });
    await repo.createProject({ name: 'Wektor Gama', folderId: folderA.id, tags: [], documentId: 'doc-c' });

    // Search by text
    const searchAlfa = await repo.searchProjects('alfa');
    expect(searchAlfa).toHaveLength(1);
    expect(searchAlfa[0]?.name).toBe('Projekt Alfa');

    // Search by folder
    const inFolderA = await repo.searchProjects(undefined, folderA.id);
    expect(inFolderA).toHaveLength(2);

    // Search by tag
    const withVip = await repo.searchProjects(undefined, undefined, tagVIP.id);
    expect(withVip).toHaveLength(1);
    expect(withVip[0]?.name).toBe('Projekt Alfa');
  });

  it('updates projects and handles folder and tag deletion safely', async () => {
    const repo = new MemoryWorkspaceRepository();
    const folder = await repo.createFolder('Archiwum');
    const tag = await repo.createTag('Ważne', '#f43f5e');

    const proj = await repo.createProject({
      name: 'Stary Raport',
      folderId: folder.id,
      tags: [tag.id],
      documentId: 'doc-rep',
    });

    const updated = await repo.updateProject(proj.id, { name: 'Nowy Raport', isTemplate: true });
    expect(updated.name).toBe('Nowy Raport');
    expect(updated.isTemplate).toBe(true);

    // Deleting folder should nullify folderId on project, not delete project
    await repo.deleteFolder(folder.id);
    const metaAfterFolderDel = await repo.loadMeta();
    expect(metaAfterFolderDel.projects[0]?.folderId).toBeUndefined();

    // Deleting tag should remove it from project tags
    await repo.deleteTag(tag.id);
    const metaAfterTagDel = await repo.loadMeta();
    expect(metaAfterTagDel.projects[0]?.tags).toEqual([]);

    // Delete project
    await repo.deleteProject(proj.id);
    const metaFinal = await repo.loadMeta();
    expect(metaFinal.projects).toHaveLength(0);
  });

  it('enforces limits on project creation', async () => {
    const repo = new MemoryWorkspaceRepository();
    const meta = await repo.loadMeta();

    // Fill up to limit
    const dummyProjects = Array.from({ length: WORKSPACE_LIMITS.maxProjects }, (_, i) => ({
      id: `proj-${i}`,
      name: `Projekt ${i}`,
      tags: [],
      documentId: `doc-${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await repo.saveMeta({ ...meta, projects: dummyProjects });

    await expect(
      repo.createProject({ name: 'Overflow Project', documentId: 'doc-overflow' }),
    ).rejects.toThrow(/limit reached/);
  });

  it('validates WorkspaceMetaSchema and rejects corrupted inputs', () => {
    const validMeta = {
      folders: [{ id: 'f-1', name: 'Folder 1', createdAt: new Date().toISOString() }],
      tags: [{ id: 't-1', name: 'Tag 1', color: '#123456' }],
      projects: [],
    };
    expect(WorkspaceMetaSchema.parse(validMeta)).toBeDefined();

    // Empty folder name
    expect(() =>
      WorkspaceMetaSchema.parse({
        ...validMeta,
        folders: [{ id: 'f-2', name: '', createdAt: new Date().toISOString() }],
      }),
    ).toThrow();
  });
});
