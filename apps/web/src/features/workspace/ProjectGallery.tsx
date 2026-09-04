import React, { useMemo, useState } from 'react';
import type { FolderRecord, ProjectRecord, TagRecord, WorkspaceMeta } from '@vectoria/io';
import { ConfirmDialog } from '@vectoria/ui';

export interface ProjectGalleryProps {
  meta: WorkspaceMeta;
  activeProjectId?: string;
  onOpenProject: (project: ProjectRecord) => void;
  onCreateProject: (name: string, folderId?: string, tags?: readonly string[], isTemplate?: boolean) => Promise<void>;
  onUpdateProject: (id: string, patch: Partial<Pick<ProjectRecord, 'name' | 'folderId' | 'tags' | 'isTemplate'>>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onCreateFolder: (name: string, color?: string) => Promise<FolderRecord>;
  onDeleteFolder: (id: string) => Promise<void>;
  onCreateTag: (name: string, color: string) => Promise<TagRecord>;
  onDeleteTag: (id: string) => Promise<void>;
  onClose?: () => void;
}

const DEFAULT_TAG_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const ProjectGallery: React.FC<ProjectGalleryProps> = ({
  meta,
  activeProjectId,
  onOpenProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onCreateFolder,
  onDeleteFolder,
  onCreateTag,
  onDeleteTag,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [filterView, setFilterView] = useState<'all' | 'templates'>('all');

  // Creation forms state
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLORS[0]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Deletion confirm state
  const [projectToDelete, setProjectToDelete] = useState<ProjectRecord | null>(null);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return meta.projects.filter((p) => {
      if (filterView === 'templates' && !p.isTemplate) return false;
      if (selectedFolderId && p.folderId !== selectedFolderId) return false;
      if (selectedTagId && !p.tags.includes(selectedTagId)) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [meta.projects, searchQuery, selectedFolderId, selectedTagId, filterView]);

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const isTemplate = filterView === 'templates';
    await onCreateProject(newProjectName.trim(), selectedFolderId ?? undefined, selectedTagId ? [selectedTagId] : undefined, isTemplate);
    setNewProjectName('');
    setIsCreatingProject(false);
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await onCreateFolder(newFolderName.trim(), '#3b82f6');
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleCreateTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    await onCreateTag(newTagName.trim(), newTagColor || '#3b82f6');
    setNewTagName('');
    setIsCreatingTag(false);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    await onDeleteProject(projectToDelete.id);
    setProjectToDelete(null);
  };

  return (
    <div
      data-testid="project-gallery"
      role="region"
      aria-label="Galeria projektów i szablonów"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-app, #0f1117)',
        color: 'var(--color-text, #f3f4f6)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          height: '56px',
          borderBottom: '1px solid var(--color-border-subtle, #1f2937)',
          backgroundColor: 'var(--color-panel, #161922)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary, #6366f1)' }}>
            Vectoria Workspace
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #9ca3af)', background: 'var(--color-app, #0f1117)', padding: '2px 8px', borderRadius: '12px' }}>
            Local-First (IndexedDB)
          </span>
        </div>

        {/* Search input */}
        <div style={{ flex: 1, maxWidth: '400px', display: 'flex' }}>
          <input
            data-testid="project-search-input"
            type="search"
            aria-label="Szukaj projektów"
            placeholder="Szukaj po nazwie projektu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border-subtle, #374151)',
              backgroundColor: 'var(--color-app, #0f1117)',
              color: 'var(--color-text, #f3f4f6)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            data-testid="new-project-btn"
            onClick={() => setIsCreatingProject(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-primary, #6366f1)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            + Nowy projekt
          </button>

          {onClose && (
            <button
              type="button"
              data-testid="gallery-close-btn"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: 'var(--color-text-muted, #9ca3af)',
                border: '1px solid var(--color-border-subtle, #374151)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Wróć do edytora
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar: Folders and Tags */}
        <aside
          style={{
            width: '240px',
            borderRight: '1px solid var(--color-border-subtle, #1f2937)',
            backgroundColor: 'var(--color-panel, #161922)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            gap: '24px',
            overflowY: 'auto',
          }}
        >
          {/* View filter */}
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted, #9ca3af)', fontWeight: 700, marginBottom: '8px' }}>
              Widok
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                type="button"
                data-testid="filter-all-btn"
                onClick={() => setFilterView('all')}
                style={{
                  textAlign: 'left',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: filterView === 'all' ? 'var(--color-app, #1e2230)' : 'transparent',
                  color: filterView === 'all' ? 'var(--color-primary, #6366f1)' : 'var(--color-text, #f3f4f6)',
                  fontWeight: filterView === 'all' ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Wszystkie projekty ({meta.projects.length})
              </button>
              <button
                type="button"
                data-testid="filter-templates-btn"
                onClick={() => setFilterView('templates')}
                style={{
                  textAlign: 'left',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: filterView === 'templates' ? 'var(--color-app, #1e2230)' : 'transparent',
                  color: filterView === 'templates' ? 'var(--color-primary, #6366f1)' : 'var(--color-text, #f3f4f6)',
                  fontWeight: filterView === 'templates' ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Szablony zespołowe ({meta.projects.filter((p) => p.isTemplate).length})
              </button>
            </div>
          </div>

          {/* Folders */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted, #9ca3af)', fontWeight: 700 }}>
                Foldery
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(true)}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary, #6366f1)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                + Dodaj
              </button>
            </div>

            {isCreatingFolder && (
              <form onSubmit={handleCreateFolderSubmit} style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <input
                  type="text"
                  aria-label="Nazwa nowego folderu"
                  placeholder="Nazwa..."
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  style={{ flex: 1, padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #374151', background: '#0f1117', color: '#fff' }}
                />
                <button type="submit" style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', background: '#6366f1', color: '#fff', border: 'none' }}>OK</button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                style={{
                  textAlign: 'left',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: selectedFolderId === null ? 'var(--color-app, #1e2230)' : 'transparent',
                  color: selectedFolderId === null ? 'var(--color-primary, #6366f1)' : 'var(--color-text, #f3f4f6)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                📁 Wszystkie foldery
              </button>
              {meta.folders.map((f) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(f.id === selectedFolderId ? null : f.id)}
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: selectedFolderId === f.id ? 'var(--color-app, #1e2230)' : 'transparent',
                      color: selectedFolderId === f.id ? 'var(--color-primary, #6366f1)' : 'var(--color-text, #f3f4f6)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    📂 {f.name}
                  </button>
                  <button
                    type="button"
                    title="Usuń folder"
                    onClick={() => onDeleteFolder(f.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', padding: '4px' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted, #9ca3af)', fontWeight: 700 }}>
                Tagi
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingTag(true)}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary, #6366f1)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                + Dodaj
              </button>
            </div>

            {isCreatingTag && (
              <form onSubmit={handleCreateTagSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    aria-label="Nazwa nowego tagu"
                    placeholder="Nazwa tagu..."
                    autoFocus
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    style={{ flex: 1, padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #374151', background: '#0f1117', color: '#fff' }}
                  />
                  <button type="submit" style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', background: '#6366f1', color: '#fff', border: 'none' }}>OK</button>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {DEFAULT_TAG_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewTagColor(col)}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: col,
                        border: newTagColor === col ? '2px solid #fff' : 'none',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </form>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {meta.tags.map((t) => {
                const isSelected = selectedTagId === t.id;
                return (
                  <span
                    key={t.id}
                    onClick={() => setSelectedTagId(isSelected ? null : t.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? t.color : 'var(--color-app, #1f2937)',
                      color: isSelected ? '#fff' : t.color,
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: `1px solid ${t.color}`,
                    }}
                  >
                    #{t.name}
                    <button
                      type="button"
                      title="Usuń tag"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTag(t.id);
                      }}
                      style={{ background: 'none', border: 'none', color: 'inherit', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Project Grid Area */}
        <main
          style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            backgroundColor: 'var(--color-app, #0f1117)',
          }}
        >
          {/* Create Project Modal / Inline Box */}
          {isCreatingProject && (
            <div
              style={{
                marginBottom: '24px',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-panel, #161922)',
                border: '1px solid var(--color-primary, #6366f1)',
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>Tworzenie nowego projektu</h3>
              <form onSubmit={handleCreateProjectSubmit} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  aria-label="Nazwa projektu"
                  placeholder="Wpisz nazwę projektu..."
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #374151',
                    background: '#0f1117',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-primary, #6366f1)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Utwórz
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    border: '1px solid #374151',
                    cursor: 'pointer',
                  }}
                >
                  Anuluj
                </button>
              </form>
            </div>
          )}

          {/* Grid of Projects */}
          {filteredProjects.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: 'var(--color-text-muted, #9ca3af)',
              }}
            >
              <span style={{ fontSize: '36px', marginBottom: '12px' }}>📁</span>
              <p style={{ fontSize: '15px', fontWeight: 500, margin: 0 }}>Brak projektów spełniających kryteria</p>
              <p style={{ fontSize: '13px', margin: '4px 0 16px' }}>Utwórz nowy projekt za pomocą przycisku powyżej</p>
              <button
                type="button"
                onClick={() => setIsCreatingProject(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-primary, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Utwórz pierwszy projekt
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
              }}
            >
              {filteredProjects.map((proj) => {
                const folder = meta.folders.find((f) => f.id === proj.folderId);
                const isCurrent = proj.id === activeProjectId;

                return (
                  <div
                    key={proj.id}
                    data-testid={`project-card-${proj.id}`}
                    style={{
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-panel, #161922)',
                      border: isCurrent ? '2px solid var(--color-primary, #6366f1)' : '1px solid var(--color-border-subtle, #1f2937)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: 'var(--shadow-card, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: 'var(--color-text, #f3f4f6)' }}>
                          {proj.name}
                        </h4>
                        {folder && (
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                            📂 {folder.name}
                          </span>
                        )}
                      </div>
                      {proj.isTemplate && (
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 700 }}>
                          Szablon
                        </span>
                      )}
                    </div>

                    {/* Tag badges */}
                    {proj.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {proj.tags.map((tId) => {
                          const tag = meta.tags.find((t) => t.id === tId);
                          if (!tag) return null;
                          return (
                            <span
                              key={tag.id}
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: tag.color + '22',
                                color: tag.color,
                                border: `1px solid ${tag.color}`,
                              }}
                            >
                              #{tag.name}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #9ca3af)' }}>
                      Zmieniono: {new Date(proj.updatedAt).toLocaleString()}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle, #1f2937)' }}>
                      <button
                        type="button"
                        data-testid={`open-project-${proj.id}`}
                        onClick={() => onOpenProject(proj)}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--color-primary, #6366f1)',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {isCurrent ? 'Aktywny' : 'Otwórz'}
                      </button>

                      <button
                        type="button"
                        title={proj.isTemplate ? 'Usuń z szablonów' : 'Zapisz jako szablon'}
                        onClick={() => onUpdateProject(proj.id, { isTemplate: !proj.isTemplate })}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'transparent',
                          color: proj.isTemplate ? '#8b5cf6' : 'var(--color-text-muted, #9ca3af)',
                          border: '1px solid var(--color-border-subtle, #374151)',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        ★
                      </button>

                      <button
                        type="button"
                        data-testid={`delete-project-${proj.id}`}
                        title="Usuń projekt"
                        onClick={() => setProjectToDelete(proj)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          border: '1px solid var(--color-border-subtle, #374151)',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Dialog (UX-021) */}
      {projectToDelete && (
        <ConfirmDialog
          title="Potwierdź usunięcie projektu"
          description={`Czy na pewno chcesz usunąć projekt „${projectToDelete.name}”? Operacji nie można cofnąć.`}
          confirmLabel="Usuń projekt"
          cancelLabel="Anuluj"
          destructive
          testId="confirm-delete-project"
          onConfirm={confirmDeleteProject}
          onCancel={() => setProjectToDelete(null)}
        />
      )}
    </div>
  );
};
