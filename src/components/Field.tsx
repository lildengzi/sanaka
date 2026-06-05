import type { ReactNode } from 'react';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function SectionCard({
  title,
  description,
  children,
  aside,
  icon
}: {
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="section-card__header">
        <div className="section-card__title-wrap">
          {icon ? <span className="section-card__icon">{icon}</span> : null}
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        {aside}
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  );
}

export function StatusChip({ tone = 'default', children }: { tone?: 'default' | 'accent' | 'warning' | 'success'; children: ReactNode }) {
  return <span className={`status-chip status-chip--${tone}`}>{children}</span>;
}
