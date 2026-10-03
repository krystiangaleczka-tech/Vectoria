import React from 'react';
import { formatShortcutCombo, getToolShortcutAction, type ShortcutBinding } from '@vectoria/editor-engine';
import { IconButton, Tooltip, VectoriaIcon } from '@vectoria/ui';

export type ActiveTool = 'select' | 'direct-select' | 'lasso' | 'node-lasso' | 'rectangle' | 'ellipse' | 'line' | 'polygon' | 'star' | 'arc' | 'pie' | 'ring' | 'spiral' | 'callout' | 'polyline' | 'pen' | 'pencil' | 'brush' | 'smooth' | 'corner' | 'eraser' | 'knife' | 'scissors' | 'width' | 'text' | 'eyedropper' | 'bucket' | 'hand' | 'zoom';

export interface ToolRailProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  shortcuts?: readonly ShortcutBinding[];
}

const groups: readonly ToolGroup[] = [
  { label: 'Zaznaczanie', tools: [{ id: 'select', icon: 'select' }, { id: 'direct-select', icon: 'directSelect' }, { id: 'lasso', icon: 'select' }, { id: 'node-lasso', icon: 'directSelect' }] },
  { label: 'Kształty', tools: [{ id: 'rectangle', icon: 'rectangle' }, { id: 'ellipse', icon: 'ellipse' }, { id: 'polygon', icon: 'polygon' }, { id: 'star', icon: 'star' }, { id: 'arc', icon: 'arc' }, { id: 'pie', icon: 'pie' }, { id: 'ring', icon: 'ring' }, { id: 'spiral', icon: 'spiral' }, { id: 'callout', icon: 'callout' }, { id: 'line', icon: 'line' }, { id: 'polyline', icon: 'polyline' }] },
  { label: 'Rysowanie', tools: [{ id: 'pen', icon: 'pen' }, { id: 'pencil', icon: 'pencil' }, { id: 'brush', icon: 'brush' }] },
  { label: 'Tekst', tools: [{ id: 'text', icon: 'text' }] },
  { label: 'Edycja ścieżki', tools: [{ id: 'corner', icon: 'corner' }, { id: 'smooth', icon: 'pen' }, { id: 'width', icon: 'width' }, { id: 'eraser', icon: 'eraser' }, { id: 'knife', icon: 'scissors' }, { id: 'scissors', icon: 'scissors' }] },
  { label: 'Wypełnienie i styl', tools: [{ id: 'eyedropper', icon: 'eyedropper' }, { id: 'bucket', icon: 'bucket' }] },
  { label: 'Nawigacja', tools: [{ id: 'hand', icon: 'hand', temporaryShortcut: 'Spacja (przytrzymaj) — tymczasowe przesuwanie' }, { id: 'zoom', icon: 'zoom' }] },
];

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform
    ?? navigator.platform
    ?? '';
  return /Mac|iPod|iPhone|iPad/i.test(platform);
}

function toolLabel(toolId: ActiveTool): string {
  const action = getToolShortcutAction(toolId);
  if (!action) return toolId;
  return action.label.replace(/^Narzędzie:\s*/, '');
}

export const ToolRail: React.FC<ToolRailProps> = ({ activeTool, onSelectTool, shortcuts }) => {
  const isMac = isMacPlatform();

  const shortcutForTool = (toolId: ActiveTool): string | undefined => {
    const action = getToolShortcutAction(toolId);
    if (!action) return undefined;
    const configured = shortcuts?.find((binding) => binding.actionId === action.actionId)?.combo;
    const effective = configured ?? action.defaultCombo;
    if (!effective?.key) return undefined;
    return formatShortcutCombo(effective, isMac);
  };

  return (
    <aside
      data-testid="tool-rail"
      style={{
        width: '48px',
        minWidth: '48px',
        backgroundColor: 'var(--color-toolbar)',
        borderRight: '1px solid var(--color-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        gap: '4px',
        zIndex: 5,
        // The rail scrolls internally so a growing tool list never stretches
        // the workspace row or shifts the canvas viewport.
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {groups.map((group, groupIndex) => (
        <React.Fragment key={group.label}>
          {groupIndex > 0 && <div className="tool-group-divider" aria-hidden="true" />}
          <div className="tool-group" aria-label={group.label}>
            {group.tools.map((tool) => {
              const label = toolLabel(tool.id);
              const shortcut = shortcutForTool(tool.id);
              const shortcutDetails = [shortcut, tool.temporaryShortcut].filter(Boolean).join(' · ');
              const button = <IconButton
                data-tool={tool.id}
                data-shortcut={shortcut ?? ''}
                data-testid={`tool-${tool.id}`}
                size="tool"
                icon={<VectoriaIcon name={tool.icon} size={20} />}
                label={tool.disabled ? `${label} — Wkrótce` : label}
                shortcut={shortcut}
                active={activeTool === tool.id}
                disabled={tool.disabled}
                onClick={() => onSelectTool(tool.id)}
              />;
              const tooltipText = tool.disabled
                ? `${label}${shortcutDetails ? ` (${shortcutDetails})` : ''} — Wkrótce`
                : `${label}${shortcutDetails ? ` (${shortcutDetails})` : ''}`;

              return (
                <Tooltip key={tool.id} content={tooltipText}>
                  {button}
                </Tooltip>
              );
            })}
          </div>
        </React.Fragment>
      ))}
    </aside>
  );
};

type ToolIcon = React.ComponentProps<typeof VectoriaIcon>['name'];
interface ToolConfig {
  id: ActiveTool;
  icon: ToolIcon;
  temporaryShortcut?: string;
  disabled?: boolean;
}
interface ToolGroup { label: string; tools: readonly ToolConfig[] }
