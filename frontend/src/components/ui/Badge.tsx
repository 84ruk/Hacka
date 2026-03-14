'use client';

type Variant = 'default' | 'success' | 'warning' | 'destructive';

const variantClasses: Record<Variant, string> = {
  default:
    'bg-[var(--badge-default-bg)] text-[var(--badge-default-text)]',
  success:
    'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]',
  warning:
    'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]',
  destructive:
    'bg-[var(--badge-destructive-bg)] text-[var(--badge-destructive-text)]',
};

export function Badge({
  variant = 'default',
  children,
  className = '',
}: {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  return (
    <span className={`${base} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
