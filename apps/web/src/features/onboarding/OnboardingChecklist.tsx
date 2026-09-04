import React, { useState } from 'react';
import { Button, IconButton, VectoriaIcon } from '@vectoria/ui';
import { ONBOARDING_CHECKLIST, type TutorialId } from './tutorials.js';

export interface OnboardingChecklistProps {
  isOpen: boolean;
  onToggle: () => void;
  onStartTutorial: (id: TutorialId) => void;
  completedTutorials: readonly string[];
}

/**
 * Collapsible onboarding checklist widget.
 * Guides beginners through core features and tracks their progress.
 */
export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  isOpen,
  onToggle,
  onStartTutorial,
  completedTutorials,
}) => {
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setManualChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isCompleted = (item: (typeof ONBOARDING_CHECKLIST)[number]) => {
    if (manualChecks[item.id]) return true;
    if (item.tutorialId && completedTutorials.includes(item.tutorialId)) return true;
    return false;
  };

  const completedCount = ONBOARDING_CHECKLIST.filter(isCompleted).length;
  const totalCount = ONBOARDING_CHECKLIST.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  if (!isOpen) {
    return (
      <button
        type="button"
        data-testid="onboarding-checklist-trigger"
        onClick={onToggle}
        aria-label="Otwórz listę powitalną Vectoria"
        title="Lista kroków startowych"
        style={{
          position: 'fixed',
          bottom: '36px',
          left: '60px',
          zIndex: 8000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: 'var(--color-panel-raised, #2a2a27)',
          border: '1px solid var(--color-border-subtle, #444)',
          borderRadius: '24px',
          color: 'var(--color-text-primary, #fff)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
        }}
      >
        <VectoriaIcon name="check" size={16} />
        <span>Kroki startowe</span>
        <span
          style={{
            fontSize: '11px',
            backgroundColor: 'var(--color-primary, #e67e22)',
            color: '#fff',
            padding: '1px 6px',
            borderRadius: '10px',
            fontWeight: 700,
          }}
        >
          {completedCount}/{totalCount}
        </span>
      </button>
    );
  }

  return (
    <aside
      data-testid="onboarding-checklist"
      role="region"
      aria-label="Lista startowa"
      style={{
        position: 'fixed',
        bottom: '36px',
        left: '60px',
        width: '340px',
        maxHeight: '80vh',
        zIndex: 8000,
        backgroundColor: 'var(--color-panel-raised, #242421)',
        border: '1px solid var(--color-border-subtle, #383834)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--color-border-subtle, #383834)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3
            style={{
              margin: '0 0 4px 0',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #fff)',
            }}
          >
            Witaj w Vectoria!
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: 'var(--color-text-secondary, #aaa)',
            }}
          >
            Postęp: {completedCount} z {totalCount} ({progressPercent}%)
          </p>
        </div>
        <IconButton
          size="sm"
          icon={<VectoriaIcon name="close" size={14} />}
          label="Zwiń listę startową"
          onClick={onToggle}
        />
      </div>

      <div
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'var(--color-panel, #181816)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: 'var(--color-primary, #e67e22)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div
        style={{
          padding: '12px 16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {ONBOARDING_CHECKLIST.map((item) => {
          const done = isCompleted(item);
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '8px',
                borderRadius: '6px',
                backgroundColor: done ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--color-border-subtle, #333)',
              }}
            >
              <input
                type="checkbox"
                id={`check-${item.id}`}
                checked={done}
                onChange={() => toggleCheck(item.id)}
                aria-label={item.label}
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <label
                  htmlFor={`check-${item.id}`}
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    textDecoration: done ? 'line-through' : 'none',
                    color: done ? 'var(--color-text-secondary, #777)' : 'var(--color-text-primary, #fff)',
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </label>
                <p
                  style={{
                    margin: '2px 0 6px 0',
                    fontSize: '11px',
                    color: 'var(--color-text-secondary, #999)',
                    lineHeight: 1.4,
                  }}
                >
                  {item.description}
                </p>
                {item.tutorialId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onStartTutorial(item.tutorialId!)}
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                  >
                    Zobacz samouczek
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
