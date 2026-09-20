import { ScanLine } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';

export function HealthPage() {
  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Monitor"
        title="Crop Health"
        description="Your scans grouped by crop — a running picture of how each crop is doing, and what you did about it."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h3 className="font-bold text-ink">In progress</h3>
            <p className="mt-0.5 text-sm text-muted">This space is being built, not faked.</p>
          </div>
          <Badge tone="warn">Coming soon</Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Once scans exist, this page will group them by crop — tomato, chili, and paddy — with a
          timeline and, when there is enough data, honest comparisons across scans. Nothing is
          estimated or invented before then.
        </p>
      </Card>

      <EmptyState
        icon={ScanLine}
        title="No crop history yet"
        description="Your scans will appear here as they happen. Each scan adds to a real picture of your crop's health over time."
        action={<Button to="/scan">Scan your first crop</Button>}
      />
    </div>
  );
}