import React from 'react';

interface FullscreenTransitionProps {
  type: 'launch' | 'console' | 'delete';
}

export function FullscreenTransition({ type }: FullscreenTransitionProps) {
  return (
    <div className="fullscreen-transition-overlay" data-testid="fullscreen-transition">
      <div className={`fullscreen-transition-icon fullscreen-transition-icon--${type}`}>
        {type === 'launch' && (
          <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
            <polygon points="5 3 19 12 5 21" />
          </svg>
        )}
        {type === 'console' && (
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
            <rect x="2" y="3" width="20" height="14" rx="2" fill="currentColor" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}
        {type === 'delete' && (
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="currentColor" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        )}
      </div>
    </div>
  );
}
