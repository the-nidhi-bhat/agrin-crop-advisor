import type { ReactNode } from 'react';

interface BadgeProps {
  tone?: 'soft' | 'neutral' | 'warn' | 'danger';
  children: ReactNode;
}

const tones = {
  soft: 'bg-primary-soft text-primary',
  neutral: 'bg-sunken text-muted',
  warn: 'bg-accent-soft text-[#7a5a12]',
  danger: 'bg-danger-soft text-danger',
} as const;

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}