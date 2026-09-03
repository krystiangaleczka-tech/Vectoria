import React from 'react';
import { IconButton, VectoriaIcon } from '@vectoria/ui';
import { Tooltip } from '@vectoria/ui';

export type ActiveTool = 'select' | 'direct-select' | 'lasso' | 'node-lasso' | 'rectangle' | 'ellipse' | 'line' | 'polygon' | 'star' | 'arc' | 'pie' | 'ring' | 'spiral' | 'callout' | 'polyline' | 'pen' | 'pencil' | 'brush' | 'smooth' | 'corner' | 'eraser' | 'knife' | 'scissors' | 'width' | 'text' | 'eyedropper' | 'bucket' | 'hand' | 'zoom';

export interface ToolRailProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
}

export const ToolRail: React.FC<ToolRailProps> = ({ activeTool, onSelectTool }) => {
  const groups: readonly ToolGroup[] = [
    { label: 'Selection', tools: [{ id: 'select', label: 'Select Tool', shortcut: 'V', icon: 'select' }, { id: 'direct-select', label: 'Direct Select Tool', shortcut: 'A', icon: 'directSelect' }, { id: 'lasso', label: 'Lasso Tool', shortcut: 'O', icon: 'select' }, { id: 'node-lasso', label: 'Node Lasso Tool', shortcut: 'Shift+O', icon: 'directSelect' }] },
    { label: 'Shapes', tools: [{ id: 'rectangle', label: 'Rectangle Tool', shortcut: 'R', icon: 'rectangle' }, { id: 'ellipse', label: 'Ellipse Tool', shortcut: 'L', icon: 'ellipse' }, { id: 'polygon', label: 'Polygon Tool', icon: 'polygon' }, { id: 'star', label: 'Star Tool', icon: 'star' }, { id: 'arc', label: 'Arc Tool', icon: 'arc' }, { id: 'pie', label: 'Pie Tool', icon: 'pie' }, { id: 'ring', label: 'Ring / Donut Tool', icon: 'ring' }, { id: 'spiral', label: 'Spiral Tool', icon: 'spiral' }, { id: 'callout', label: 'Callout Tool', icon: 'callout' }, { id: 'line', label: 'Line Tool', shortcut: '\\', icon: 'line' }, { id: 'polyline', label: 'Polyline Tool', icon: 'polyline' }] },
    { label: 'Pen & Draw', tools: [{ id: 'pen', label: 'Pen Tool', shortcut: 'P', icon: 'pen' }, { id: 'pencil', label: 'Pencil Tool', shortcut: 'N', icon: 'pencil' }, { id: 'brush', label: 'Brush Tool', shortcut: 'B', icon: 'brush' }] },
    { label: 'Text', tools: [{ id: 'text', label: 'Text Tool', shortcut: 'T', icon: 'text' }] },
    { label: 'Path Edit', tools: [{ id: 'corner', label: 'Corner Tool', shortcut: 'Q', icon: 'corner' }, { id: 'smooth', label: 'Smooth Tool', shortcut: 'S', icon: 'pen' }, { id: 'width', label: 'Width Tool', shortcut: 'W', icon: 'width' }, { id: 'eraser', label: 'Eraser Tool', shortcut: 'Shift+E', icon: 'eraser' }, { id: 'knife', label: 'Knife Tool', shortcut: 'K', icon: 'scissors' }, { id: 'scissors', label: 'Scissors Tool', shortcut: 'C', icon: 'scissors' }] },
    { label: 'Fill & Style', tools: [{ id: 'eyedropper', label: 'Eyedropper Tool', shortcut: 'I', icon: 'eyedropper' }, { id: 'bucket', label: 'Paint Bucket Tool', shortcut: 'G', icon: 'bucket' }] },
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
interface ToolConfig { id: ToolId; label: string; shortcut?: string; icon: ToolIcon; disabled?: boolean }
interface ToolGroup { label: string; tools: readonly ToolConfig[] }
