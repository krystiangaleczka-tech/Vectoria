import { z } from 'zod';

export const WORKSPACE_LIMITS = {
  maxProjects: 256,
  maxFolders: 64,
  maxTags: 64,
} as const;

export const TagRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(32),
  color: z.string().min(1),
});

export type TagRecord = z.infer<typeof TagRecordSchema>;

export const FolderRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(64),
  color: z.string().optional(),
  createdAt: z.string(),
});

export type FolderRecord = z.infer<typeof FolderRecordSchema>;

export const ProjectRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  folderId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  documentId: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  isTemplate: z.boolean().optional(),
});

export type ProjectRecord = z.infer<typeof ProjectRecordSchema>;

export const WorkspaceMetaSchema = z.object({
  activeProjectId: z.string().optional(),
  folders: z.array(FolderRecordSchema).max(WORKSPACE_LIMITS.maxFolders).default([]),
  tags: z.array(TagRecordSchema).max(WORKSPACE_LIMITS.maxTags).default([]),
  projects: z.array(ProjectRecordSchema).max(WORKSPACE_LIMITS.maxProjects).default([]),
});

export type WorkspaceMeta = z.infer<typeof WorkspaceMetaSchema>;

export interface WorkspaceRepository {
  loadMeta(): Promise<WorkspaceMeta>;
  saveMeta(meta: WorkspaceMeta): Promise<void>;
  createProject(data: { name: string; folderId?: string; tags?: readonly string[]; documentId: string; isTemplate?: boolean }): Promise<ProjectRecord>;
  updateProject(id: string, patch: Partial<Pick<ProjectRecord, 'name' | 'folderId' | 'tags' | 'isTemplate'>>): Promise<ProjectRecord>;
  deleteProject(id: string): Promise<void>;
  createFolder(name: string, color?: string): Promise<FolderRecord>;
  updateFolder(id: string, patch: Partial<Pick<FolderRecord, 'name' | 'color'>>): Promise<FolderRecord>;
  deleteFolder(id: string): Promise<void>;
  createTag(name: string, color: string): Promise<TagRecord>;
  deleteTag(id: string): Promise<void>;
  searchProjects(query?: string, folderId?: string, tagId?: string): Promise<readonly ProjectRecord[]>;
}

const DB_NAME = 'vectoria_db';
const DB_VERSION = 4;
const WORKSPACE_STORE = 'workspace';
const WORKSPACE_META_KEY = 'workspace_meta';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('documents')) request.result.createObjectStore('documents');
      if (!request.result.objectStoreNames.contains('palettes')) request.result.createObjectStore('palettes');
      if (!request.result.objectStoreNames.contains(WORKSPACE_STORE)) request.result.createObjectStore(WORKSPACE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

/**
 * IndexedDB implementation of WorkspaceRepository for local-first project management.
 */
export class IndexedDBWorkspaceRepository implements WorkspaceRepository {
  /**
   * Loads and validates workspace metadata from IndexedDB, falling back to default on corruption.
   */
  async loadMeta(): Promise<WorkspaceMeta> {
    try {
      const db = await openDB();
      const raw = await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(WORKSPACE_STORE, 'readonly');
        const req = tx.objectStore(WORKSPACE_STORE).get(WORKSPACE_META_KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('Failed to load workspace meta'));
      });
      db.close();

      if (!raw) {
        return { folders: [], tags: [], projects: [] };
      }
      return WorkspaceMetaSchema.parse(raw);
    } catch (e) {
      console.warn('[Vectoria] Corrupted workspace meta, resetting to defaults:', e);
      return { folders: [], tags: [], projects: [] };
    }
  }

  /**
   * Persists validated workspace metadata into IndexedDB.
   */
  async saveMeta(meta: WorkspaceMeta): Promise<void> {
    const validated = WorkspaceMetaSchema.parse(meta);
    const db = await openDB();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(WORKSPACE_STORE, 'readwrite');
        tx.objectStore(WORKSPACE_STORE).put(validated, WORKSPACE_META_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Failed to save workspace meta'));
        tx.onabort = () => reject(tx.error ?? new Error('Workspace save transaction aborted'));
      });
    } finally {
      db.close();
    }
  }

  /**
   * Creates a new project entry within workspace limits.
   */
  async createProject(data: {
    name: string;
    folderId?: string;
    tags?: readonly string[];
    documentId: string;
    isTemplate?: boolean;
  }): Promise<ProjectRecord> {
    const meta = await this.loadMeta();
    if (meta.projects.length >= WORKSPACE_LIMITS.maxProjects) {
      throw new Error(`Workspace project limit reached (${WORKSPACE_LIMITS.maxProjects})`);
    }

    const trimmedName = data.name.trim().slice(0, 120);
    if (!trimmedName) throw new Error('Project name cannot be empty');

    const now = new Date().toISOString();
    const newProject: ProjectRecord = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      folderId: data.folderId,
      tags: [...(data.tags ?? [])],
      documentId: data.documentId,
      createdAt: now,
      updatedAt: now,
      isTemplate: data.isTemplate,
    };

    meta.projects.unshift(newProject);
    meta.activeProjectId = newProject.id;
    await this.saveMeta(meta);
    return newProject;
  }

  /**
   * Updates an existing project entry with patch values.
   */
  async updateProject(
    id: string,
    patch: Partial<Pick<ProjectRecord, 'name' | 'folderId' | 'tags' | 'isTemplate'>>,
  ): Promise<ProjectRecord> {
    const meta = await this.loadMeta();
    const index = meta.projects.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Project '${id}' not found`);

    const existing = meta.projects[index]!;
    const updated: ProjectRecord = {
      ...existing,
      ...patch,
      name: patch.name !== undefined ? patch.name.trim().slice(0, 120) || existing.name : existing.name,
      tags: patch.tags ? [...patch.tags] : existing.tags,
      updatedAt: new Date().toISOString(),
    };

    meta.projects[index] = updated;
    await this.saveMeta(meta);
    return updated;
  }

  /**
   * Deletes a project by ID from workspace metadata.
   */
  async deleteProject(id: string): Promise<void> {
    const meta = await this.loadMeta();
    meta.projects = meta.projects.filter((p) => p.id !== id);
    if (meta.activeProjectId === id) {
      meta.activeProjectId = meta.projects[0]?.id;
    }
    await this.saveMeta(meta);
  }

  /**
   * Creates a new folder for project categorization.
   */
  async createFolder(name: string, color?: string): Promise<FolderRecord> {
    const meta = await this.loadMeta();
    if (meta.folders.length >= WORKSPACE_LIMITS.maxFolders) {
      throw new Error(`Workspace folder limit reached (${WORKSPACE_LIMITS.maxFolders})`);
    }

    const trimmed = name.trim().slice(0, 64);
    if (!trimmed) throw new Error('Folder name cannot be empty');

    const newFolder: FolderRecord = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      color,
      createdAt: new Date().toISOString(),
    };

    meta.folders.push(newFolder);
    await this.saveMeta(meta);
    return newFolder;
  }

  /**
   * Updates an existing folder name or color.
   */
  async updateFolder(id: string, patch: Partial<Pick<FolderRecord, 'name' | 'color'>>): Promise<FolderRecord> {
    const meta = await this.loadMeta();
    const folder = meta.folders.find((f) => f.id === id);
    if (!folder) throw new Error(`Folder '${id}' not found`);

    if (patch.name !== undefined) {
      const trimmed = patch.name.trim().slice(0, 64);
      if (!trimmed) throw new Error('Folder name cannot be empty');
      (folder as { name: string }).name = trimmed;
    }
    if (patch.color !== undefined) {
      (folder as { color?: string }).color = patch.color;
    }

    await this.saveMeta(meta);
    return folder;
  }

  /**
   * Deletes a folder and clears folderId on associated projects.
   */
  async deleteFolder(id: string): Promise<void> {
    const meta = await this.loadMeta();
    meta.folders = meta.folders.filter((f) => f.id !== id);
    meta.projects = meta.projects.map((p) => (p.folderId === id ? { ...p, folderId: undefined } : p));
    await this.saveMeta(meta);
  }

  /**
   * Creates a new tag badge.
   */
  async createTag(name: string, color: string): Promise<TagRecord> {
    const meta = await this.loadMeta();
    if (meta.tags.length >= WORKSPACE_LIMITS.maxTags) {
      throw new Error(`Workspace tag limit reached (${WORKSPACE_LIMITS.maxTags})`);
    }

    const trimmed = name.trim().slice(0, 32);
    if (!trimmed) throw new Error('Tag name cannot be empty');

    const newTag: TagRecord = {
      id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      color,
    };

    meta.tags.push(newTag);
    await this.saveMeta(meta);
    return newTag;
  }

  /**
   * Deletes a tag and strips it from projects.
   */
  async deleteTag(id: string): Promise<void> {
    const meta = await this.loadMeta();
    meta.tags = meta.tags.filter((t) => t.id !== id);
    meta.projects = meta.projects.map((p) => ({
      ...p,
      tags: p.tags.filter((t) => t !== id),
    }));
    await this.saveMeta(meta);
  }

  /**
   * Searches and filters projects by substring, folderId, and tagId.
   */
  async searchProjects(query?: string, folderId?: string, tagId?: string): Promise<readonly ProjectRecord[]> {
    const meta = await this.loadMeta();
    const q = query?.trim().toLowerCase();

    return meta.projects.filter((p) => {
      if (folderId && p.folderId !== folderId) return false;
      if (tagId && !p.tags.includes(tagId)) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }
}

/**
 * In-memory repository for fast isolated unit tests without IndexedDB.
 */
export class MemoryWorkspaceRepository implements WorkspaceRepository {
  private meta: WorkspaceMeta = { folders: [], tags: [], projects: [] };

  async loadMeta(): Promise<WorkspaceMeta> {
    return JSON.parse(JSON.stringify(this.meta)) as WorkspaceMeta;
  }

  async saveMeta(meta: WorkspaceMeta): Promise<void> {
    this.meta = WorkspaceMetaSchema.parse(meta);
  }

  async createProject(data: {
    name: string;
    folderId?: string;
    tags?: readonly string[];
    documentId: string;
    isTemplate?: boolean;
  }): Promise<ProjectRecord> {
    if (this.meta.projects.length >= WORKSPACE_LIMITS.maxProjects) {
      throw new Error(`Workspace project limit reached (${WORKSPACE_LIMITS.maxProjects})`);
    }
    const trimmed = data.name.trim().slice(0, 120);
    if (!trimmed) throw new Error('Project name cannot be empty');
    const now = new Date().toISOString();
    const proj: ProjectRecord = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      folderId: data.folderId,
      tags: [...(data.tags ?? [])],
      documentId: data.documentId,
      createdAt: now,
      updatedAt: now,
      isTemplate: data.isTemplate,
    };
    this.meta.projects.unshift(proj);
    this.meta.activeProjectId = proj.id;
    return proj;
  }

  async updateProject(
    id: string,
    patch: Partial<Pick<ProjectRecord, 'name' | 'folderId' | 'tags' | 'isTemplate'>>,
  ): Promise<ProjectRecord> {
    const idx = this.meta.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project '${id}' not found`);
    const existing = this.meta.projects[idx]!;
    const updated: ProjectRecord = {
      ...existing,
      ...patch,
      name: patch.name !== undefined ? patch.name.trim().slice(0, 120) || existing.name : existing.name,
      tags: patch.tags ? [...patch.tags] : existing.tags,
      updatedAt: new Date().toISOString(),
    };
    this.meta.projects[idx] = updated;
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    this.meta.projects = this.meta.projects.filter((p) => p.id !== id);
    if (this.meta.activeProjectId === id) {
      this.meta.activeProjectId = this.meta.projects[0]?.id;
    }
  }

  async createFolder(name: string, color?: string): Promise<FolderRecord> {
    if (this.meta.folders.length >= WORKSPACE_LIMITS.maxFolders) {
      throw new Error(`Workspace folder limit reached (${WORKSPACE_LIMITS.maxFolders})`);
    }
    const trimmed = name.trim().slice(0, 64);
    if (!trimmed) throw new Error('Folder name cannot be empty');
    const folder: FolderRecord = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      color,
      createdAt: new Date().toISOString(),
    };
    this.meta.folders.push(folder);
    return folder;
  }

  async updateFolder(id: string, patch: Partial<Pick<FolderRecord, 'name' | 'color'>>): Promise<FolderRecord> {
    const folder = this.meta.folders.find((f) => f.id === id);
    if (!folder) throw new Error(`Folder '${id}' not found`);
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim().slice(0, 64);
      if (!trimmed) throw new Error('Folder name cannot be empty');
      (folder as { name: string }).name = trimmed;
    }
    if (patch.color !== undefined) {
      (folder as { color?: string }).color = patch.color;
    }
    return folder;
  }

  async deleteFolder(id: string): Promise<void> {
    this.meta.folders = this.meta.folders.filter((f) => f.id !== id);
    this.meta.projects = this.meta.projects.map((p) => (p.folderId === id ? { ...p, folderId: undefined } : p));
  }

  async createTag(name: string, color: string): Promise<TagRecord> {
    if (this.meta.tags.length >= WORKSPACE_LIMITS.maxTags) {
      throw new Error(`Workspace tag limit reached (${WORKSPACE_LIMITS.maxTags})`);
    }
    const trimmed = name.trim().slice(0, 32);
    if (!trimmed) throw new Error('Tag name cannot be empty');
    const tag: TagRecord = {
      id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      color,
    };
    this.meta.tags.push(tag);
    return tag;
  }

  async deleteTag(id: string): Promise<void> {
    this.meta.tags = this.meta.tags.filter((t) => t.id !== id);
    this.meta.projects = this.meta.projects.map((p) => ({
      ...p,
      tags: p.tags.filter((t) => t !== id),
    }));
  }

  async searchProjects(query?: string, folderId?: string, tagId?: string): Promise<readonly ProjectRecord[]> {
    const q = query?.trim().toLowerCase();
    return this.meta.projects.filter((p) => {
      if (folderId && p.folderId !== folderId) return false;
      if (tagId && !p.tags.includes(tagId)) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }
}
