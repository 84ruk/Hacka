'use client';

type Variant = 'error' | 'success' | 'warning' | 'info';

const variantClasses: Record<Variant, string> = {
  error:
    'border-[var(--alert-error-border)] bg-[var(--alert-error-bg)] text-[var(--alert-error-text)]',
  success:
    'border-[var(--alert-success-border)] bg-[var(--alert-success-bg)] text-[var(--alert-success-text)]',
  warning:
    'border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] text-[var(--alert-warning-text)]',
  info:
    'border-[var(--alert-info-border)] bg-[var(--alert-info-bg)] text-[var(--alert-info-text)]',
};

export function Alert({
  variant = 'info',
  title,
  children,
  className = '',
}: {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const base = 'rounded-[var(--radius-sm)] border p-4 text-sm';
  return (
    <div
      role="alert"
      className={`${base} ${variantClasses[variant]} ${className}`}
    >
      {title && <p className="font-semibold">{title}</p>}
      <p className={title ? 'mt-0.5' : ''}>{children}</p>
    </div>
  );
}
