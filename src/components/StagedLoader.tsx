import { Clock3, ScanLine } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface StagedLoaderProps {
  crop: string;
  preview: string;
  currentStep: number;
  isSlow: boolean;
  onTryAgain: () => void;
}

const steps = [
  'Preparing your scan',
  'Examining the crop',
  'Preparing your guidance',
  'Finalizing your guidance',
];

export function StagedLoader({ crop, preview, currentStep, isSlow, onTryAgain }: StagedLoaderProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="space-y-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <ScanLine size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-ink">Analyzing your {crop}</h2>
            <p className="mt-1 text-sm text-muted">
              Your photo is processed privately server-side. This can take up to a minute, and high
              demand can slow it down.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-line bg-sunken">
            <img
              src={preview}
              alt={`Photo of the ${crop} leaf being analyzed`}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span
              className="agrin-scanline absolute inset-x-0 h-[2px] bg-primary/80"
              aria-hidden
            />
            <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-ink">
              {crop}
            </span>
          </div>

          <ol className="space-y-2.5" aria-label="Scan progress" aria-live="polite">
            {steps.map((label, index) => {
              const isActive = index === currentStep;
              const isDone = index < currentStep;
              return (
                <li
                  key={label}
                  className={`flex items-center gap-3 rounded-control px-4 py-3 transition-colors duration-300 ${
                    isActive ? 'bg-primary-soft' : isDone ? 'opacity-55' : 'opacity-35'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300 ${
                      isDone || isActive
                        ? 'bg-primary text-white'
                        : 'bg-sunken text-muted'
                    }`}
                  >
                    {isDone ? '✓' : index + 1}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      isActive ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    {label}
                  </span>
                  {isActive && (
                    <span
                      className="ml-auto h-2 w-2 animate-pulse rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {isSlow && (
          <div
            className="flex flex-col gap-3 rounded-control border border-accent/40 bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-[#6b4f10]">
              <Clock3 size={18} className="mt-0.5 shrink-0" aria-hidden />
              This is taking longer than expected — the AI is under high demand. You can keep
              waiting or try again with the same photo.
            </p>
            <Button variant="secondary" size="md" onClick={onTryAgain} className="shrink-0">
              Try again
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}