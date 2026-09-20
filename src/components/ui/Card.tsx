import type { ReactNode } from 'react';

interface CardProps {
  className?: string;
  children: ReactNode;
}

export function Card({ className = '', children }: CardProps) {
  return (
    <div className={`rounded-card border border-line bg-surface p-5 ${className}`}>{children}</div>
  );
}