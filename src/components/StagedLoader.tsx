import { ScanLine } from 'lucide-react';
import { Card } from './ui/Card';

interface StagedLoaderProps {
  currentStep: number;
}

const steps = [
  'Uploading photo',
  'Analyzing the leaf',
  'Preparing local advice',
  'Generating Kannada version',
];

export function StagedLoader({ currentStep }: StagedLoaderProps) {
  return (
    <div className="mx-auto w-full max-w-md py-6">
      <Card>
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <ScanLine size={24} aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-bold text-ink">Analyzing your crop</h2>
          <p className="mt-1 text-sm text-muted">This takes a short while — hang on.</p>
        </div>

        <ol className="mt-6 space-y-2.5" aria-label="Diagnosis progress">
          {steps.map((label, index) => {
            const isActive = index === currentStep;
            const isDone = index < currentStep;
            return (
              <li
                key={label}
                className={`flex items-center gap-3 rounded-control p-3 transition-colors duration-200 ${
                  isActive ? 'bg-primary-soft' : isDone ? 'opacity-60' : 'opacity-40'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? 'bg-primary text-white'
                      : isActive
                        ? 'bg-primary text-white'
                        : 'bg-sunken text-muted'
                  }`}
                >
                  {isDone ? '✓' : index + 1}
                </span>
                <span className={`text-sm font-semibold ${isActive ? 'text-ink' : 'text-muted'}`}>
                  {label}
                </span>
                {isActive && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}