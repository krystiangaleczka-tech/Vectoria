import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IndexedDBWorkspaceRepository,
  type FolderRecord,
  type ProjectRecord,
  type TagRecord,
  type WorkspaceMeta,
  type WorkspaceRepository,
} from '@vectoria/io';

export function useWorkspace(repository?: WorkspaceRepository) {
  const repo = useMemo(() => repository ?? new IndexedDBWorkspaceRepository(), [repository]);
  const [meta, setMeta] = useState<WorkspaceMeta>({ folders: [], tags: [], projects: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await repo.loadMeta();
      setMeta(loaded);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createProject = useCallback(
    async (data: { name: string; folderId?: string; tags?: readonly string[]; documentId: string; isTemplate?: boolean }): Promise<ProjectRecord> => {
      const proj = await repo.createProject(data);
      await refresh();
      return proj;
    },
    [repo, refresh],
  );

  const updateProject = useCallback(
    async (id: string, patch: Partial<Pick<ProjectRecord, 'name' | 'folderId' | 'tags' | 'isTemplate'>>) => {
      const proj = await repo.updateProject(id, patch);
      await refresh();
      return proj;
    },
    [repo, refresh],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await repo.deleteProject(id);
      await refresh();
    },
    [repo, refresh],
  );

  const createFolder = useCallback(
    async (name: string, color?: string): Promise<FolderRecord> => {
      const folder = await repo.createFolder(name, color);
      await refresh();
      return folder;
    },
    [repo, refresh],
  );

  const updateFolder = useCallback(
    async (id: string, patch: Partial<Pick<FolderRecord, 'name' | 'color'>>) => {
      const folder = await repo.updateFolder(id, patch);
      await refresh();
      return folder;
    },
    [repo, refresh],
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      await repo.deleteFolder(id);
      await refresh();
    },
    [repo, refresh],
  );

  const createTag = useCallback(
    async (name: string, color: string): Promise<TagRecord> => {
      const tag = await repo.createTag(name, color);
      await refresh();
      return tag;
    },
    [repo, refresh],
  );

  const deleteTag = useCallback(
    async (id: string) => {
      await repo.deleteTag(id);
      await refresh();
    },
    [repo, refresh],
  );

  const searchProjects = useCallback(
    async (query?: string, folderId?: string, tagId?: string) => {
      return repo.searchProjects(query, folderId, tagId);
    },
    [repo],
  );

  return {
    meta,
    loading,
    error,
    refresh,
    createProject,
    updateProject,
    deleteProject,
    createFolder,
    updateFolder,
    deleteFolder,
    createTag,
    deleteTag,
    searchProjects,
  };
}
