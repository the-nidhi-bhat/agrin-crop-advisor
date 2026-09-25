import { ScanLine, Eye, ListChecks, TrendingUp } from 'lucide-react';
import { useT } from '../../lib/strings';

const STEPS = [
  { icon: ScanLine, labelKey: 'journey.scan', copyKey: 'journey.scanCopy' },
  { icon: Eye, labelKey: 'journey.understand', copyKey: 'journey.understandCopy' },
  { icon: ListChecks, labelKey: 'journey.act', copyKey: 'journey.actCopy' },
  { icon: TrendingUp, labelKey: 'journey.monitor', copyKey: 'journey.monitorCopy' },
] as const;

export function JourneyStepper({
  current,
  completed = 0,
  compact = false,
  className = '',
}: {
  current?: number;
  completed?: number;
  compact?: boolean;
  className?: string;
}) {
  const t = useT();
  return (
    <ol
      className={`grid grid-cols-4 gap-2 lg:gap-3 ${className}`}
      aria-label={t(completed >= 4 ? 'journey.monitor' : 'journey.scan')}
    >
      {STEPS.map((step, i) => {
        const done = i + 1 <= completed;
        const active = !done && (current === undefined || current === i + 1);
        const Icon = step.icon;
        return (
          <li key={step.labelKey} className="min-w-0">
            <div
              className={`flex h-full flex-col items-center gap-1.5 rounded-card border p-2.5 text-center transition-colors duration-200 ${
                done
                  ? 'border-primary/30 bg-primary-soft/50 text-primary'
                  : active
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-line bg-sunken/60 text-muted'
              }`}
            >
              <Icon size={20} aria-hidden />
              <span
                className={`flex items-center gap-1 text-xs font-semibold leading-tight ${
                  done ? 'text-primary' : active ? 'text-on-primary' : 'text-muted'
                }`}
              >
                {done && (
                  <span aria-hidden className="text-[10px]">
                    ✓
                  </span>
                )}
                {t(step.labelKey)}
              </span>
            </div>
            {!compact && (
              <p className="mt-1.5 block px-0.5 text-[11px] leading-snug text-muted">{t(step.copyKey)}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}