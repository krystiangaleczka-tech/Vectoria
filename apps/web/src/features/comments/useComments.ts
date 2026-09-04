import { useCallback, useMemo, useState } from 'react';
import type { CanvasAnnotation, Command, DocumentModel } from '@vectoria/core';
import {
  AddAnnotationCommand,
  DeleteAnnotationCommand,
  MoveAnnotationPinCommand,
  UpdateAnnotationCommand,
} from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';

const EXTRACT_MENTIONS_REGEX = /@([a-zA-Z0-9_-]+)/g;

function extractMentions(body: string): readonly string[] {
  const matches = body.matchAll(EXTRACT_MENTIONS_REGEX);
  const mentions = new Set<string>();
  for (const match of matches) {
    if (match[1]) mentions.add(match[1]);
  }
  return Array.from(mentions);
}

export function useComments(
  doc: DocumentModel | null,
  onExecuteCommand: (command: Command) => void,
) {
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  const annotations = useMemo(() => doc?.annotations ?? [], [doc?.annotations]);

  const addAnnotation = useCallback(
    (worldPoint: Vec2, body: string, authorName?: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      const author = authorName?.trim() || localStorage.getItem('vectoria-display-name') || 'Użytkownik';
      const now = new Date().toISOString();
      const newAnnotation: CanvasAnnotation = {
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        worldPoint,
        body: trimmed,
        authorName: author,
        resolved: false,
        mentions: extractMentions(trimmed),
        createdAt: now,
        updatedAt: now,
      };

      onExecuteCommand(new AddAnnotationCommand(newAnnotation));
      setActiveAnnotationId(newAnnotation.id);
      return newAnnotation;
    },
    [onExecuteCommand],
  );

  const updateAnnotation = useCallback(
    (id: string, patch: Partial<Pick<CanvasAnnotation, 'body' | 'resolved' | 'worldPoint'>>) => {
      const mentions = patch.body !== undefined ? extractMentions(patch.body) : undefined;
      onExecuteCommand(new UpdateAnnotationCommand(id, { ...patch, mentions }));
    },
    [onExecuteCommand],
  );

  const deleteAnnotation = useCallback(
    (id: string) => {
      onExecuteCommand(new DeleteAnnotationCommand(id));
      if (activeAnnotationId === id) {
        setActiveAnnotationId(null);
      }
    },
    [activeAnnotationId, onExecuteCommand],
  );

  const toggleResolve = useCallback(
    (id: string) => {
      const target = annotations.find((a) => a.id === id);
      if (!target) return;
      onExecuteCommand(new UpdateAnnotationCommand(id, { resolved: !target.resolved }));
    },
    [annotations, onExecuteCommand],
  );

  const moveAnnotationPin = useCallback(
    (id: string, newWorldPoint: Vec2) => {
      onExecuteCommand(new MoveAnnotationPinCommand(id, newWorldPoint));
    },
    [onExecuteCommand],
  );

  return {
    annotations,
    activeAnnotationId,
    setActiveAnnotationId,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    toggleResolve,
    moveAnnotationPin,
  };
}
