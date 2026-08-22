import React from 'react';
import { IconButton, VectoriaIcon } from '@vectoria/ui';
import { Tooltip } from '@vectoria/ui';

export type ActiveTool = 'select' | 'rectangle' | 'ellipse' | 'line' | 'pen' | 'hand' | 'zoom';

export interface ToolRailProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
}

export const ToolRail: React.FC<ToolRailProps> = ({ activeTool, onSelectTool }) => {
  const groups: readonly ToolGroup[] = [
    { label: 'Selection', tools: [{ id: 'select', label: 'Select Tool', shortcut: 'V', icon: 'select' }, { id: 'direct-select', label: 'Direct Select Tool', shortcut: 'A', icon: 'directSelect', disabled: true }] },
    { label: 'Shape', tools: [{ id: 'rectangle', label: 'Rectangle Tool', shortcut: 'R', icon: 'rectangle' }, { id: 'ellipse', label: 'Ellipse Tool', shortcut: 'E', icon: 'ellipse' }, { id: 'line', label: 'Line Tool', shortcut: 'L', icon: 'line' }] },
    { label: 'Draw', tools: [{ id: 'pen', label: 'Pen Tool', shortcut: 'P', icon: 'pen' }, { id: 'text', label: 'Text Tool', shortcut: 'T', icon: 'text', disabled: true }] },
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

type ToolId = 'select' | 'rectangle' | 'hand' | 'zoom' | 'direct-select' | 'ellipse' | 'pen' | 'line' | 'text';
type ToolIcon = React.ComponentProps<typeof VectoriaIcon>['name'];
interface ToolConfig { id: ToolId; label: string; shortcut: string; icon: ToolIcon; disabled?: boolean }
interface ToolGroup { label: string; tools: readonly ToolConfig[] }
