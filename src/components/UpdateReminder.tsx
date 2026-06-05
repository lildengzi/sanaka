import { usePresence } from '../hooks/usePresence';
import type { UpdateAvailableEvent } from '../types/electron';

interface UpdateReminderProps {
  reminder: UpdateAvailableEvent | null;
  onDismiss: () => void;
  onSkip: (version: string) => void;
  onOpenPage: (url: string) => void;
}

export function UpdateReminder({ reminder, onDismiss, onSkip, onOpenPage }: UpdateReminderProps) {
  const { mounted, visible } = usePresence(Boolean(reminder));

  if (!mounted || !reminder) return null;

  const { manifest } = reminder;

  return (
    <div
      className={visible ? 'update-reminder-backdrop update-reminder-backdrop--visible' : 'update-reminder-backdrop'}
      role="presentation"
      onClick={onDismiss}
    >
      <div
        className={visible ? 'update-reminder update-reminder--visible' : 'update-reminder'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-reminder-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="update-reminder__header">
          <div>
            <h2 id="update-reminder-title" className="update-reminder__title">
              发现新版本 {manifest.version}
              {manifest.title ? ` (${manifest.title})` : ''}
            </h2>
            {manifest.pubDate ? (
              <p className="update-reminder__date">{manifest.pubDate}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="update-reminder__close"
            onClick={onDismiss}
            aria-label="关闭"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="update-reminder__content">
          <div className="update-reminder__notes">{manifest.notes}</div>
        </div>

        <div className="update-reminder__footer">
          <button
            type="button"
            className="button button--primary"
            onClick={() => onOpenPage(manifest.url)}
          >
            前往下载
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={onDismiss}
          >
            稍后
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => onSkip(manifest.version)}
          >
            跳过此版本
          </button>
        </div>
      </div>
    </div>
  );
}
