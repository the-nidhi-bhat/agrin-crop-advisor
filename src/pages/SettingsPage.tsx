import { useAuth } from '../hooks/useAuth';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';
import { MessageSquareText } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();
  const isAnonymous = user?.is_anonymous ?? true;
  const label = user?.email ? 'Email account' : 'Anonymous session';

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
              {isAnonymous ? 'Anonymous — no sign-up needed' : user?.email}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">Diagnosis runs</dt>
            <dd className="font-semibold text-ink">Rate-limited to keep the service fair</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">SMS delivery</dt>
            <dd className="font-semibold text-ink">Currently simulated</dd>
          </div>
        </dl>
      </Card>

      <EmptyState
        icon={MessageSquareText}
        title="More controls are coming"
        description="Phone number management, SMS preferences, and language choices will live here in later builds."
      />
    </div>
  );
}