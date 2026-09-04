import React, { useEffect, useState, useRef } from 'react';
import { Button, IconButton, VectoriaIcon } from '@vectoria/ui';
import { TUTORIALS, type TutorialId } from './tutorials.js';

export interface TutorialOverlayProps {
  tutorialId: TutorialId | null;
  onClose: () => void;
  onComplete: (id: TutorialId) => void;
}

/**
 * Interactive spotlight tutorial overlay.
 * Guides the user through steps with highlights, descriptions, and keyboard navigation.
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  tutorialId,
  onClose,
  onComplete,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const tutorial = TUTORIALS.find((t) => t.id === tutorialId);

  useEffect(() => {
    setStepIndex(0);
  }, [tutorialId]);

  useEffect(() => {
    if (!tutorial) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (stepIndex < tutorial.steps.length - 1) {
          setStepIndex((i) => i + 1);
        } else {
          onComplete(tutorial.id);
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (stepIndex > 0) {
          setStepIndex((i) => i - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tutorial, stepIndex, onClose, onComplete]);

  // Focus card on mount or step change for screen readers
  useEffect(() => {
    if (tutorial && cardRef.current) {
      cardRef.current.focus();
    }
  }, [tutorial, stepIndex]);

  if (!tutorial) return null;

  const currentStep = tutorial.steps[stepIndex];
  if (!currentStep) return null;

  const isLast = stepIndex === tutorial.steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete(tutorial.id);
      onClose();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Samouczek: ${tutorial.title}`}
      data-testid="tutorial-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        data-testid="tutorial-card"
        style={{
          width: '460px',
          maxWidth: '90vw',
          backgroundColor: 'var(--color-panel-raised, #242421)',
          border: '1px solid var(--color-border-focus, #e67e22)',
          borderRadius: '10px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
          padding: '24px',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-primary, #e67e22)',
                backgroundColor: 'rgba(230, 126, 34, 0.15)',
                padding: '3px 8px',
                borderRadius: '4px',
              }}
            >
              Krok {stepIndex + 1} z {tutorial.steps.length}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #999)' }}>
              {tutorial.title}
            </span>
          </div>
          <IconButton
            size="sm"
            icon={<VectoriaIcon name="close" size={14} />}
            label="Zamknij samouczek"
            onClick={onClose}
          />
        </div>

        <div>
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #fff)',
            }}
          >
            {currentStep.title}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              lineHeight: 1.55,
              color: 'var(--color-text-secondary, #ccc)',
            }}
          >
            {currentStep.description}
          </p>
        </div>

        {currentStep.shortcut && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'var(--color-panel, #181816)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--color-text-primary, #fff)',
            }}
          >
            <span style={{ color: 'var(--color-text-secondary, #888)' }}>Skrót:</span>
            <kbd
              style={{
                backgroundColor: 'var(--color-panel-raised, #333)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontWeight: 600,
                border: '1px solid var(--color-border-subtle, #444)',
              }}
            >
              {currentStep.shortcut}
            </kbd>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
          }}
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            data-testid="tutorial-skip-btn"
          >
            Pomiń
          </Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="sm"
              variant="secondary"
              disabled={stepIndex === 0}
              onClick={handlePrev}
              data-testid="tutorial-prev-btn"
            >
              Wstecz
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleNext}
              data-testid="tutorial-next-btn"
            >
              {isLast ? 'Zakończ' : 'Dalej'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
