import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@vectoria/ui';

export interface WebFontImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (family: string, url: string) => void;
}

const focusable = 'button:not([disabled]), input:not([disabled]), select:not([disabled])';

export const WebFontImportDialog: React.FC<WebFontImportDialogProps> = ({ isOpen, onClose, onImport }) => {
  const [fontFamily, setFontFamily] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const isFormValid = useMemo(() => fontFamily.trim() !== '' && url.trim() !== '', [fontFamily, url]);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setFontFamily('');
      setUrl('');
      setStatus('idle');
      setErrorMessage('');
      
      const dialog = dialogRef.current;
      setTimeout(() => {
        const first = dialog?.querySelector<HTMLElement>(focusable);
        first?.focus();
      }, 0);
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = [...dialog.querySelectorAll<HTMLElement>(focusable)];
      if (elements.length === 0) return;
      const firstElement = elements[0]!;
      const lastElement = elements[elements.length - 1]!;
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleImport = async () => {
    if (!isFormValid) return;
    setStatus('loading');
    setErrorMessage('');

    try {
      const face = new FontFace(fontFamily, `url(${url})`);
      const loaded = await face.load();
      document.fonts.add(loaded);
      
      setStatus('success');
      onImport(fontFamily, url);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Nie udało się wczytać fontu z podanego URL (CORS lub nieprawidłowy format).');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Importuj font webowy"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <section
        ref={dialogRef}
        style={{
          background: 'var(--color-surface, #1e293b)',
          color: 'var(--color-on-surface, #f8fafc)',
          padding: '24px',
          borderRadius: '8px',
          width: '400px',
          maxWidth: '90vw',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Importuj font webowy</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
            <span>Nazwa rodziny fontu (Font Family)</span>
            <input
              type="text"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              placeholder="np. Roboto"
              style={{
                background: 'var(--color-surface-variant, #334155)',
                color: 'inherit',
                border: '1px solid var(--color-outline, #475569)',
                padding: '8px',
                borderRadius: '4px',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
            <span>URL do pliku fontu (.woff2, .woff, .ttf)</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              style={{
                background: 'var(--color-surface-variant, #334155)',
                color: 'inherit',
                border: '1px solid var(--color-outline, #475569)',
                padding: '8px',
                borderRadius: '4px',
              }}
            />
          </label>
        </div>

        {status === 'error' && (
          <div style={{ color: 'var(--color-error, #ef4444)', fontSize: '14px' }}>
            {errorMessage}
          </div>
        )}
        
        {status === 'success' && (
          <div style={{ color: 'var(--color-success, #22c55e)', fontSize: '14px' }}>
            Font wczytany pomyślnie!
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', margin: '8px 0 0 0' }}>
          <Button variant="secondary" onClick={onClose} disabled={status === 'loading'}>Anuluj</Button>
          <Button variant="primary" onClick={handleImport} disabled={!isFormValid || status === 'loading'}>
            {status === 'loading' ? 'Wczytywanie...' : 'Importuj'}
          </Button>
        </div>
      </section>
    </div>
  );
};
