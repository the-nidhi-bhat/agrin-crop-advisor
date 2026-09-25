import { useAuth } from '../hooks/useAuth';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';
import { LogOut, MessageSquareText } from 'lucide-react';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const isAnonymous = user?.is_anonymous ?? false;
  const displayName = user?.user_metadata?.full_name as string | undefined;
  const label = user?.email ? 'Email account' : isAnonymous ? 'Anonymous session' : 'Account';

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Settings"
        title="Settings"
        description="Your AgriN account and preferences."
      />

      <Card className="max-w-xl">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-bold text-ink">Account</h3>
          <Badge tone="soft">{label}</Badge>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">Sign-in</dt>
            <dd className="font-semibold text-ink">
              {isAnonymous || !user?.email ? 'Anonymous — no sign-up needed' : user.email}
            </dd>
          </div>
          {displayName ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-muted">Name</dt>
              <dd className="font-semibold text-ink">{displayName}</dd>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">Diagnosis runs</dt>
            <dd className="font-semibold text-ink">Rate-limited to keep the service fair</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">SMS delivery</dt>
            <dd className="font-semibold text-ink">Currently simulated</dd>
          </div>
        </dl>
        <Button
          variant="secondary"
          className="mt-5"
          onClick={() => void signOut()}
          aria-label="Sign out of AgriN"
        >
          <LogOut size={16} aria-hidden />
          Sign out
        </Button>
      </Card>

      <EmptyState
        icon={MessageSquareText}
        title="More controls are coming"
        description="Phone number management, SMS preferences, and language choices will live here in later builds."
      />
    </div>
  );
}