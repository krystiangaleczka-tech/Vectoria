import React from 'react';

export type VectoriaIconName =
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'pen'
  | 'hand'
  | 'zoom'
  | 'undo'
  | 'redo'
  | 'fileExport'
  | 'save'
  | 'visible'
  | 'hidden'
  | 'lock'
  | 'unlock'
  | 'close'
  | 'check'
  | 'chevronDown'
  | 'plus'
  | 'trash'
  | 'directSelect'
  | 'corner'
  | 'pencil'
  | 'brush'
  | 'eraser'
  | 'scissors'
  | 'width'
  | 'text'
  | 'layers'
  | 'history'
  | 'menu'
  | 'grid'
  | 'more'
  | 'sliders'
  | 'eyedropper'
  | 'bucket'
  | 'polygon'
  | 'star'
  | 'arc'
  | 'pie'
  | 'ring'
  | 'spiral'
  | 'callout'
  | 'polyline'
  | 'textFrame'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'bulletList'
  | 'numberedList'
  | 'textOutlines'
  | 'textOnPath'
  | 'findReplace'
  | 'templateLayer'
  | 'outlineView'
  | 'soloMode'
  | 'filter'
  | 'folder'
  | 'search'
  | 'image'
  | 'crop'
  | 'link'
  | 'brokenLink'
  | 'trace'
  | 'symbol'
  | 'component'
  | 'brandKit'
  | 'stockSvg'
  | 'brightness'
  | 'contrast';

export interface VectoriaIconProps {
  name: VectoriaIconName;
  size?: number;
  className?: string;
  label?: string;
  decorative?: boolean;
}

export const VectoriaIcon: React.FC<VectoriaIconProps> = ({
  name,
  size = 20,
  className = '',
  label,
  decorative = true,
}) => {
  const iconProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': decorative ? true : undefined,
    'aria-label': label,
  };

  switch (name) {
    case 'select':
      return (
        <svg {...iconProps}>
          <path d="M4 4l7.07 17 2.51-7.39L21 11.07 4 4z" />
          <path d="M13.5 13.5L19 19" />
        </svg>
      );

    case 'rectangle':
      return (
        <svg {...iconProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
        </svg>
      );

    case 'ellipse':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );

    case 'line':
      return (
        <svg {...iconProps}>
          <line x1="4" y1="20" x2="20" y2="4" />
        </svg>
      );

    case 'polygon':
      return (
        <svg {...iconProps}>
          <polygon points="12 3 21 9.5 17.5 20 6.5 20 3 9.5" />
        </svg>
      );

    case 'star':
      return (
        <svg {...iconProps}>
          <polygon points="12 2.5 14.9 8.6 21.5 9.5 16.7 14.1 17.9 20.7 12 17.5 6.1 20.7 7.3 14.1 2.5 9.5 9.1 8.6" />
        </svg>
      );

    case 'arc':
      return (
        <svg {...iconProps}>
          <path d="M4 18a9 9 0 0 1 16 0" />
        </svg>
      );

    case 'pie':
      return (
        <svg {...iconProps}>
          <path d="M12 12V3a9 9 0 1 0 9 9h-9z" />
        </svg>
      );

    case 'ring':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );

    case 'spiral':
      return (
        <svg {...iconProps}>
          <path d="M12 12a2 2 0 1 1 2-2c0 2.2-2 3.6-4.2 3.2C7 12.7 5.6 10.4 6.2 8 7 4.9 10.4 3.1 13.6 4 17 4.9 19.2 8.4 18.3 12c-.9 3.8-4.7 6.2-8.5 5.3" />
        </svg>
      );

    case 'callout':
      return (
        <svg {...iconProps}>
          <path d="M4 5h16v11H10l-4 4v-4H4V5z" />
        </svg>
      );

    case 'polyline':
      return (
        <svg {...iconProps}>
          <polyline points="3 17 9 9 14 13 21 5" />
          <circle cx="3" cy="17" r="1.2" />
          <circle cx="21" cy="5" r="1.2" />
        </svg>
      );

    case 'pen':
      return (
        <svg {...iconProps}>
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      );

    case 'hand':
      return (
        <svg {...iconProps}>
          <path d="M18 11V6a2 2 0 0 0-4 0v4" />
          <path d="M14 10V4a2 2 0 0 0-4 0v6" />
          <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
      );

    case 'zoom':
      return (
        <svg {...iconProps}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );

    case 'undo':
      return (
        <svg {...iconProps}>
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      );

    case 'redo':
      return (
        <svg {...iconProps}>
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
      );

    case 'fileExport':
      return (
        <svg {...iconProps}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );

    case 'save':
      return (
        <svg {...iconProps}>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      );

    case 'visible':
      return (
        <svg {...iconProps}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );

    case 'hidden':
      return (
        <svg {...iconProps}>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      );

    case 'lock':
      return (
        <svg {...iconProps}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );

    case 'unlock':
      return (
        <svg {...iconProps}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
      );

    case 'close':
      return (
        <svg {...iconProps}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );

    case 'check':
      return (
        <svg {...iconProps}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );

    case 'chevronDown':
      return (
        <svg {...iconProps}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );

    case 'plus':
      return (
        <svg {...iconProps}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );

    case 'trash':
      return (
        <svg {...iconProps}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );

    case 'directSelect':
      return (
        <svg {...iconProps}>
          <path d="M5 3l5.5 14 2-5.5L18 9.5 5 3z" />
          <path d="M12.5 12.5L17 19" />
        </svg>
      );

    case 'corner':
      return (
        <svg {...iconProps}>
          <path d="M5 19V7a2 2 0 0 1 2-2h12" />
          <path d="M5 19h12a2 2 0 0 0 2-2v-4" />
          <circle cx="7" cy="7" r="2" />
          <path d="M13 5c0 4 3 7 7 7" />
        </svg>
      );

    case 'pencil':
      return (
        <svg {...iconProps}>
          <path d="m4 20 3.5-.8L19 7.7 16.3 5 4.8 16.5 4 20z" />
          <path d="m14.8 6.5 2.7 2.7M7.5 19.2 4.8 16.5" />
        </svg>
      );

    case 'brush':
      return (
        <svg {...iconProps}>
          <path d="m14 4 6 6-8.5 8.5a4.2 4.2 0 0 1-6 0l-.5-.5L14 4z" />
          <path d="M5 18c-2 1-2.5 3-2 4 2 .5 4-.1 5-2" />
        </svg>
      );

    case 'eraser':
      return (
        <svg {...iconProps}>
          <path d="m6 19-3-3a2 2 0 0 1 0-2.8L13.2 3a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L12 19H6z" />
          <path d="m11 5 8 8M5 19h16" />
        </svg>
      );

    case 'scissors':
      return (
        <svg {...iconProps}>
          <circle cx="6" cy="7" r="2.5" /><circle cx="6" cy="17" r="2.5" />
          <path d="m8 8.5 13 9M8 15.5 21 6" />
        </svg>
      );

    case 'width':
      return (
        <svg {...iconProps}>
          <path d="M4 18c4-8 12-8 16 0M4 6c4 8 12 8 16 0" />
          <path d="M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3" />
        </svg>
      );

    case 'text':
      return (
        <svg {...iconProps}>
          <path d="M4 5V3h16v2" />
          <path d="M12 3v18M8 21h8" />
        </svg>
      );

    case 'layers':
      return (
        <svg {...iconProps}>
          <path d="M12 3 3 8l9 5 9-5-9-5z" />
          <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
        </svg>
      );

    case 'history':
      return (
        <svg {...iconProps}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v6h6M12 7v5l3 2" />
        </svg>
      );

    case 'menu':
      return (
        <svg {...iconProps}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );

    case 'grid':
      return (
        <svg {...iconProps}>
          <rect x="4" y="4" width="6" height="6" />
          <rect x="14" y="4" width="6" height="6" />
          <rect x="4" y="14" width="6" height="6" />
          <rect x="14" y="14" width="6" height="6" />
        </svg>
      );

    case 'more':
      return (
        <svg {...iconProps}>
          <circle cx="5" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="19" cy="12" r="1" fill="currentColor" />
        </svg>
      );

    case 'sliders':
      return (
        <svg {...iconProps}>
          <line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2" fill="currentColor" />
          <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2" fill="currentColor" />
          <line x1="4" y1="18" x2="20" y2="18" /><circle cx="11" cy="18" r="2" fill="currentColor" />
        </svg>
      );

    case 'eyedropper':
      return <svg {...iconProps}><path d="m14 4 6 6M12 6 4 14l6 6 8-8M4 20l-2 2" /></svg>;
    case 'bucket':
      return <svg {...iconProps}><path d="m5 4 15 15M4 8l7-4 9 9-4 7H7L3 16z" /><path d="M16 18h5" /></svg>;

    case 'textFrame':
      return (
        <svg {...iconProps}>
          <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
          <path d="M7 8h10M12 8v8" />
        </svg>
      );

    case 'alignLeft':
      return (
        <svg {...iconProps}>
          <line x1="17" y1="10" x2="3" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="17" y1="18" x2="3" y2="18" />
        </svg>
      );

    case 'alignCenter':
      return (
        <svg {...iconProps}>
          <line x1="18" y1="10" x2="6" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="18" y1="18" x2="6" y2="18" />
        </svg>
      );

    case 'alignRight':
      return (
        <svg {...iconProps}>
          <line x1="21" y1="10" x2="7" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="21" y1="18" x2="7" y2="18" />
        </svg>
      );

    case 'alignJustify':
      return (
        <svg {...iconProps}>
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="10" x2="3" y2="10" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="21" y1="18" x2="3" y2="18" />
        </svg>
      );

    case 'bulletList':
      return (
        <svg {...iconProps}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <circle cx="4" cy="6" r="1.5" fill="currentColor" />
          <circle cx="4" cy="12" r="1.5" fill="currentColor" />
          <circle cx="4" cy="18" r="1.5" fill="currentColor" />
        </svg>
      );

    case 'numberedList':
      return (
        <svg {...iconProps}>
          <line x1="10" y1="6" x2="21" y2="6" />
          <line x1="10" y1="12" x2="21" y2="12" />
          <line x1="10" y1="18" x2="21" y2="18" />
          <path d="M4 6h2M5 6V4M4 12h2v-2H4v1h2M4 16h2v2H4v-1h2" />
        </svg>
      );

    case 'textOutlines':
      return (
        <svg {...iconProps}>
          <path d="M4 6V4h16v2M12 4v16M8 20h8" strokeDasharray="2 2" />
          <circle cx="4" cy="4" r="1.5" fill="currentColor" />
          <circle cx="20" cy="4" r="1.5" fill="currentColor" />
          <circle cx="12" cy="20" r="1.5" fill="currentColor" />
        </svg>
      );

    case 'textOnPath':
      return (
        <svg {...iconProps}>
          <path d="M3 18c6 0 6-12 12-12s6 12 6 12" />
          <path d="M9 7V5h4v2M11 5v7" />
        </svg>
      );

    case 'findReplace':
      return (
        <svg {...iconProps}>
          <circle cx="10" cy="10" r="7" />
          <line x1="21" y1="21" x2="15" y2="15" />
          <path d="m14 8 2 2-2 2" />
        </svg>
      );

    case 'templateLayer':
      return (
        <svg {...iconProps}>
          <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
          <path d="M9 3v18M3 9h18" strokeDasharray="2 2" />
        </svg>
      );

    case 'outlineView':
      return (
        <svg {...iconProps}>
          <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={1.5} />
          <circle cx="12" cy="12" r="4" strokeWidth={1.5} />
        </svg>
      );

    case 'soloMode':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );

    case 'filter':
      return (
        <svg {...iconProps}>
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      );

    case 'folder':
      return (
        <svg {...iconProps}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );

    case 'search':
      return (
        <svg {...iconProps}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );

    case 'image':
      return (
        <svg {...iconProps}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );

    case 'crop':
      return (
        <svg {...iconProps}>
          <path d="M6 2v14a2 2 0 0 0 2 2h14" />
          <path d="M18 22V8a2 2 0 0 0-2-2H2" />
        </svg>
      );

    case 'link':
      return (
        <svg {...iconProps}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );

    case 'brokenLink':
      return (
        <svg {...iconProps}>
          <path d="m19 5-1.5 1.5" />
          <path d="m5 19 1.5-1.5" />
          <path d="m2 2 20 20" />
          <path d="M10.5 13.5a5 5 0 0 0 6.54.54l1.5-1.5" />
          <path d="M13.5 10.5a5 5 0 0 0-6.54-.54l-1.5 1.5" />
        </svg>
      );

    case 'trace':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="m4.93 4.93 2.12 2.12" />
          <path d="m16.95 16.95 2.12 2.12" />
        </svg>
      );

    case 'symbol':
      return (
        <svg {...iconProps}>
          <path d="M12 2 2 7l10 5 10-5-10-5Z" />
          <path d="m2 17 10 5 10-5" />
          <path d="m2 12 10 5 10-5" />
        </svg>
      );

    case 'component':
      return (
        <svg {...iconProps}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case 'brandKit':
      return (
        <svg {...iconProps}>
          <path d="M12 2 2 7v10l10 5 10-5V7L12 2Z" />
          <path d="m12 12 8.5-5" />
          <path d="m12 12v9.5" />
          <path d="m12 12-8.5-5" />
        </svg>
      );

    case 'stockSvg':
      return (
        <svg {...iconProps}>
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
        </svg>
      );

    case 'brightness':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
        </svg>
      );

    case 'contrast':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
        </svg>
      );

    default:
      return null;
  }
};
