import React from 'react';
import { IconButton, VectoriaIcon } from '@vectoria/ui';
import { Tooltip } from '@vectoria/ui';

export type ActiveTool = 'select' | 'direct-select' | 'rectangle' | 'ellipse' | 'line' | 'pen' | 'pencil' | 'brush' | 'smooth' | 'corner' | 'eraser' | 'knife' | 'scissors' | 'width' | 'eyedropper' | 'bucket' | 'hand' | 'zoom';

export interface ToolRailProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
}

export const ToolRail: React.FC<ToolRailProps> = ({ activeTool, onSelectTool }) => {
  const groups: readonly ToolGroup[] = [
    { label: 'Selection', tools: [{ id: 'select', label: 'Select Tool', shortcut: 'V', icon: 'select' }, { id: 'direct-select', label: 'Direct Select Tool', shortcut: 'A', icon: 'directSelect' }] },
    { label: 'Shape', tools: [{ id: 'rectangle', label: 'Rectangle Tool', shortcut: 'R', icon: 'rectangle' }, { id: 'ellipse', label: 'Ellipse Tool', shortcut: 'L', icon: 'ellipse' }, { id: 'line', label: 'Line Tool', shortcut: '\\', icon: 'line' }] },
    { label: 'Draw', tools: [{ id: 'pen', label: 'Pen Tool', shortcut: 'P', icon: 'pen' }, { id: 'pencil', label: 'Pencil Tool', shortcut: 'N', icon: 'pencil' }, { id: 'brush', label: 'Brush Tool', shortcut: 'B', icon: 'brush' }, { id: 'smooth', label: 'Smooth Tool', shortcut: 'S', icon: 'pen' }] },
    { label: 'Edit path', tools: [{ id: 'corner', label: 'Corner Tool', shortcut: 'Q', icon: 'corner' }, { id: 'eraser', label: 'Eraser Tool', shortcut: 'Shift+E', icon: 'eraser' }, { id: 'knife', label: 'Knife Tool', shortcut: 'K', icon: 'scissors' }, { id: 'scissors', label: 'Scissors Tool', shortcut: 'C', icon: 'scissors' }, { id: 'width', label: 'Width Tool', shortcut: 'W', icon: 'width' }] },
    { label: 'Style', tools: [{ id: 'eyedropper', label: 'Eyedropper Tool', shortcut: 'I', icon: 'eyedropper' }, { id: 'bucket', label: 'Paint Bucket Tool', shortcut: 'G', icon: 'bucket' }] },
    { label: 'Navigate', tools: [{ id: 'hand', label: 'Hand / Pan Tool', shortcut: 'Space', icon: 'hand' }, { id: 'zoom', label: 'Zoom Tool', shortcut: 'Z', icon: 'zoom' }] },
  ];

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
      }}
    >
      {groups.map((group, groupIndex) => (
        <React.Fragment key={group.label}>
          {groupIndex > 0 && <div className="tool-group-divider" aria-hidden="true" />}
          <div className="tool-group" aria-label={group.label}>
            {group.tools.map((tool) => {
              const button = <IconButton
                size="tool"
                icon={<VectoriaIcon name={tool.icon} size={20} />}
                label={tool.disabled ? `${tool.label} — Wkrótce` : tool.label}
                shortcut={tool.shortcut}
                active={activeTool === tool.id}
                disabled={tool.disabled}
                onClick={() => onSelectTool(tool.id as ActiveTool)}
              />;
              return tool.disabled ? <Tooltip key={tool.id} content={`${tool.label} (${tool.shortcut}) — Wkrótce`}>{button}</Tooltip> : <React.Fragment key={tool.id}>{button}</React.Fragment>;
            })}
          </div>
        </React.Fragment>
      ))}
    </aside>
  );
};

type ToolId = ActiveTool | 'text';
type ToolIcon = React.ComponentProps<typeof VectoriaIcon>['name'];
interface ToolConfig { id: ToolId; label: string; shortcut: string; icon: ToolIcon; disabled?: boolean }
interface ToolGroup { label: string; tools: readonly ToolConfig[] }
