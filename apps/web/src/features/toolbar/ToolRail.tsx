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
  { label: 'Selection', tools: [{ id: 'select', label: 'Select Tool', icon: 'select' }, { id: 'direct-select', label: 'Direct Select Tool', icon: 'directSelect' }, { id: 'lasso', label: 'Lasso Tool', icon: 'select' }, { id: 'node-lasso', label: 'Node Lasso Tool', icon: 'directSelect' }] },
  { label: 'Shapes', tools: [{ id: 'rectangle', label: 'Rectangle Tool', icon: 'rectangle' }, { id: 'ellipse', label: 'Ellipse Tool', icon: 'ellipse' }, { id: 'polygon', label: 'Polygon Tool', icon: 'polygon' }, { id: 'star', label: 'Star Tool', icon: 'star' }, { id: 'arc', label: 'Arc Tool', icon: 'arc' }, { id: 'pie', label: 'Pie Tool', icon: 'pie' }, { id: 'ring', label: 'Ring / Donut Tool', icon: 'ring' }, { id: 'spiral', label: 'Spiral Tool', icon: 'spiral' }, { id: 'callout', label: 'Callout Tool', icon: 'callout' }, { id: 'line', label: 'Line Tool', icon: 'line' }, { id: 'polyline', label: 'Polyline Tool', icon: 'polyline' }] },
  { label: 'Pen & Draw', tools: [{ id: 'pen', label: 'Pen Tool', icon: 'pen' }, { id: 'pencil', label: 'Pencil Tool', icon: 'pencil' }, { id: 'brush', label: 'Brush Tool', icon: 'brush' }] },
  { label: 'Text', tools: [{ id: 'text', label: 'Text Tool', icon: 'text' }] },
  { label: 'Path Edit', tools: [{ id: 'corner', label: 'Corner Tool', icon: 'corner' }, { id: 'smooth', label: 'Smooth Tool', icon: 'pen' }, { id: 'width', label: 'Width Tool', icon: 'width' }, { id: 'eraser', label: 'Eraser Tool', icon: 'eraser' }, { id: 'knife', label: 'Knife Tool', icon: 'scissors' }, { id: 'scissors', label: 'Scissors Tool', icon: 'scissors' }] },
  { label: 'Fill & Style', tools: [{ id: 'eyedropper', label: 'Eyedropper Tool', icon: 'eyedropper' }, { id: 'bucket', label: 'Paint Bucket Tool', icon: 'bucket' }] },
  { label: 'Navigate', tools: [{ id: 'hand', label: 'Hand / Pan Tool', icon: 'hand', temporaryShortcut: 'Space (hold) — Temporary Pan' }, { id: 'zoom', label: 'Zoom Tool', icon: 'zoom' }] },
];

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform
    ?? navigator.platform
    ?? '';
  return /Mac|iPod|iPhone|iPad/i.test(platform);
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
              const shortcut = shortcutForTool(tool.id);
              const shortcutDetails = [shortcut, tool.temporaryShortcut].filter(Boolean).join(' · ');
              const button = <IconButton
                data-tool={tool.id}
                data-shortcut={shortcut ?? ''}
                data-testid={`tool-${tool.id}`}
                size="tool"
                icon={<VectoriaIcon name={tool.icon} size={20} />}
                label={tool.disabled ? `${tool.label} — Wkrótce` : tool.label}
                shortcut={shortcut}
                active={activeTool === tool.id}
                disabled={tool.disabled}
                onClick={() => onSelectTool(tool.id)}
              />;
              const tooltipText = tool.disabled
                ? `${tool.label}${shortcutDetails ? ` (${shortcutDetails})` : ''} — Wkrótce`
                : `${tool.label}${shortcutDetails ? ` (${shortcutDetails})` : ''}`;

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
  label: string;
  icon: ToolIcon;
  temporaryShortcut?: string;
  disabled?: boolean;
}
interface ToolGroup { label: string; tools: readonly ToolConfig[] }
