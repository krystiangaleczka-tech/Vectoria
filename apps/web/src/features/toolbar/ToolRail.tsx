import React from 'react';
import { IconButton, VectoriaIcon } from '@vectoria/ui';

export type ActiveTool = 'select' | 'rectangle' | 'hand';

export interface ToolRailProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
}

export const ToolRail: React.FC<ToolRailProps> = ({ activeTool, onSelectTool }) => {
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
        gap: '6px',
        zIndex: 5,
      }}
    >
      <IconButton
        size="tool"
        icon={<VectoriaIcon name="select" size={20} />}
        label="Select Tool"
        shortcut="V"
        active={activeTool === 'select'}
        onClick={() => onSelectTool('select')}
      />

      <IconButton
        size="tool"
        icon={<VectoriaIcon name="rectangle" size={20} />}
        label="Rectangle Tool"
        shortcut="R"
        active={activeTool === 'rectangle'}
        onClick={() => onSelectTool('rectangle')}
      />

      <div
        style={{
          width: '28px',
          height: '1px',
          backgroundColor: 'var(--color-border-subtle)',
          margin: '4px 0',
        }}
      />

      <IconButton
        size="tool"
        icon={<VectoriaIcon name="hand" size={20} />}
        label="Hand / Pan Tool"
        shortcut="Space"
        active={activeTool === 'hand'}
        onClick={() => onSelectTool('hand')}
      />
    </aside>
  );
};
