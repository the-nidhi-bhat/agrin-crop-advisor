import { ScanLine } from 'lucide-react';
import { Button } from '../ui/Button';
import { Brand } from '../layout/Brand';

export function SignedOutGate() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-3">
            <Brand />
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-deep">
              Beta
            </span>
          </span>
        </div>
        <div className="rounded-card border border-line bg-surface p-8 text-center shadow-sm">
          <div
            className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"
            aria-hidden
          >
            <ScanLine size={22} />
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink">Sign in to AgriN</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Sign in or create an account to scan your crops and keep a private history of their
            health.
          </p>
          <div className="mt-6 space-y-3">
            <Button to="/signin" size="lg" className="w-full">
              Sign in
            </Button>
            <Button to="/signup" size="lg" variant="secondary" className="w-full">
              Create an account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}