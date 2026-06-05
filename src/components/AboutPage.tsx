import React, { useEffect, useRef, useState } from 'react';
import { SocialIcons } from './SocialIcons';

interface AboutPageProps {
  isOpen: boolean;
  onClose: () => void;
  clickPosition: { x: number; y: number };
}

type AnimationPhase = 'closed' | 'expanding' | 'open' | 'exiting';

const OPEN_DURATION_MS = 1000;
const CLOSE_DURATION_MS = 1000;

export const AboutPage: React.FC<AboutPageProps> = ({
  isOpen,
  onClose,
  clickPosition
}) => {
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('closed');
  const pageRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAnimationPhase('expanding');
      const timer = setTimeout(() => {
        setAnimationPhase('open');
      }, OPEN_DURATION_MS);

      return () => clearTimeout(timer);
    } else {
      setAnimationPhase('closed');
    }
  }, [isOpen]);

  useEffect(() => {
    if (pageRef.current && (animationPhase === 'expanding' || animationPhase === 'exiting')) {
      pageRef.current.style.setProperty('--click-x', `${clickPosition.x}px`);
      pageRef.current.style.setProperty('--click-y', `${clickPosition.y}px`);
    }
  }, [animationPhase, clickPosition]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const scheduleClose = (url?: string) => {
    if (animationPhase === 'exiting') {
      return;
    }
    setAnimationPhase('exiting');
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
      if (url) {
        void window.electronAPI.app.openExternal(url);
      }
    }, CLOSE_DURATION_MS);
  };

  const handleIconClick = (url: string) => scheduleClose(url);
  const handleBackgroundClick = () => scheduleClose();
  const handleCloseClick = () => scheduleClose();

  const getPageClassName = () => {
    const baseClass = 'about-page';
    const classes = [baseClass];
    
    switch (animationPhase) {
      case 'expanding':
        classes.push('about-page--animating-in');
        break;
      case 'open':
        classes.push('about-page--open', 'about-page--content-visible');
        break;
      case 'exiting':
        classes.push('about-page--open', 'about-page--animating-out');
        break;
    }
    
    return classes.join(' ');
  };

  if (animationPhase === 'closed' && !isOpen) {
    return null;
  }

  return (
    <div
      ref={pageRef}
      className={getPageClassName()}
      onClick={handleBackgroundClick}
    >
      <button
        type="button"
        className="about-page__close"
        onClick={handleCloseClick}
        aria-label="关闭"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div
        className="about-page__content"
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="about-page__title">Sanakaprix</h1>
        <p className="about-page__subtitle">落单的企鹅将要涅槃重生</p>
        <div className="about-page__icons">
          <SocialIcons onIconClick={handleIconClick} />
        </div>
      </div>
    </div>
  );
};
