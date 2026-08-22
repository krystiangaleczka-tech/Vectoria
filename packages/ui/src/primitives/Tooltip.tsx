import React from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactElement;
}

/** Lightweight tooltip primitive. Visual presentation lives in application tokens. */
export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => (
  <span className="vectoria-tooltip" data-tooltip={content} title={content}>{children}</span>
);
