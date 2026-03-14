'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', type = 'text', ...props }, ref) => {
    const base =
      'w-full rounded-[var(--radius-sm)] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none disabled:opacity-50 disabled:bg-slate-50';
    const error = props['aria-invalid'] === true ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '';

    return (
      <input
        ref={ref}
        type={type}
        className={`${base} ${error} ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
