import { AlertCircle, ArrowRight, Clock, Leaf, ScanLine } from 'lucide-react';
import { useCropHealth, type CropHealthScan } from '../hooks/useCropHealth';
import { confidenceTone, healthState, HEALTH_STATE_META } from '../components/scan/ScanResult';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${date}, ${time}`;
}

function scanLabel(scan: CropHealthScan): string {
  if (scan.status === 'success') return scan.disease ?? 'Scan completed';
  if (scan.status === 'failed') return 'Scan did not complete';
  return 'Still processing';
}

interface ScanRowProps {
  scan: CropHealthScan;
  thumb: string | undefined;
}

function ScanRow({ scan, thumb }: ScanRowProps) {
  const state = healthState(scan.disease);

  return (
    <li className="flex items-center gap-4 py-3">
      {thumb ? (
        <img
          src={thumb}
          alt={`Photo of the ${scan.crop} scan on ${formatDate(scan.created_at)}`}
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-card border border-line bg-sunken object-cover"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card border border-line bg-sunken text-muted">
          <Leaf size={20} aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{scanLabel(scan)}</p>
          {state && scan.status === 'success' && (
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${HEALTH_STATE_META[state].dot}`}
              aria-hidden
            />
          )}
          {scan.confidence && scan.status === 'success' && (
            <Badge tone={confidenceTone(scan.confidence)}>Confidence: {scan.confidence}</Badge>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
          <Clock size={12} aria-hidden />
          {formatDate(scan.created_at)}
        </p>
      </div>
    </li>
  );
}

export function HealthPage() {
  const { scans, thumbnails, error, reload } = useCropHealth();

  const latest = scans?.[0];
  const latestState = latest?.disease ? healthState(latest.disease) : null;
  const latestSuccess =
    latest?.status === 'success'
      ? latest
      : scans?.find((s) => s.status === 'success' && s.advisory_text) ?? null;

  const groups: { crop: string; scans: CropHealthScan[] }[] = [];
  for (const scan of scans ?? []) {
    const existing = groups.find((g) => g.crop === scan.crop);
    if (existing) existing.scans.push(scan);
    else groups.push({ crop: scan.crop, scans: [scan] });
  }

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Monitor"
        title="Crop Health"
        description="Your real scans, grouped by crop — what was found and what you did about it. Only your own records appear here."
      />

      {!scans && !error && (
        <p className="text-sm text-muted" role="status">
          Loading your scan history…
        </p>
      )}

      {error && (
        <div role="alert" className="space-y-3">
          <Card className="border-danger/30">
            <h3 className="flex items-center gap-2 font-semibold text-danger">
              <AlertCircle size={18} aria-hidden />
              Could not load your scan history
            </h3>
            <p className="mt-2 text-sm text-muted">
              {error} — this usually means the service is temporarily unreachable.
            </p>
            <Button variant="secondary" size="md" className="mt-4" onClick={reload}>
              Try again
            </Button>
          </Card>
        </div>
      )}

      {scans && scans.length === 0 && (
        <EmptyState
          icon={ScanLine}
          title="No crop history yet"
          description="Your scans will appear here as they happen. Each scan adds a real record of what was found on a given date."
          action={<Button to="/scan">Scan your first crop</Button>}
        />
      )}

      {scans && scans.length > 0 && (
        <>
          {latest && (
            <Card className="border-primary/20 bg-primary-soft/40">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                Current status
              </p>
              {latest.status === 'success' ? (
                <>
                  <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start">
                    {thumbnails[latest.id] && (
                      <img
                        src={thumbnails[latest.id]}
                        alt={`Photo of the ${latest.crop} leaf on ${formatDate(latest.created_at)}`}
                        className="h-28 w-28 shrink-0 rounded-card border border-line bg-sunken object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight text-ink">
                          {latest.disease ?? 'Scan completed'}
                        </h2>
                        {latestState && latest.status === 'success' && (
                          <span className={`mt-1 text-sm font-semibold ${HEALTH_STATE_META[latestState].text}`}>
                            {HEALTH_STATE_META[latestState].label}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-muted">
                          {latest.crop}
                        </span>
                        {latest.confidence && (
                          <Badge tone={confidenceTone(latest.confidence)}>
                            Confidence: {latest.confidence}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Clock size={12} aria-hidden />
                          {formatDate(latest.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : latest.status === 'failed' ? (
                <div className="mt-2">
                  <h2 className="text-xl font-bold tracking-tight text-ink">
                    Your latest scan did not complete
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    That scan hit an error before it produced a result. Re-scan that crop to get a
                    usable reading.
                  </p>
                  <Button to="/scan" size="md" className="mt-4">
                    <ScanLine size={17} aria-hidden />
                    Scan again
                  </Button>
                </div>
              ) : (
                <div className="mt-2">
                  <h2 className="text-xl font-bold tracking-tight text-ink">
                    Your latest scan is still processing
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    Check back shortly — scan results save to this page the moment they finish.
                  </p>
                </div>
              )}
            </Card>
          )}

          {latestSuccess?.advisory_text && (
            <Card>
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                What to monitor now
              </h3>
              <p className="mt-1 text-sm font-semibold text-muted">
                Most recent advice on record · {latestSuccess.crop} ·{' '}
                {formatDate(latestSuccess.created_at)}
              </p>
              <p className="mt-3 break-words leading-relaxed text-ink/80">
                {latestSuccess.advisory_text}
              </p>
            </Card>
          )}

          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.crop} aria-labelledby={`health-${group.crop}`}>
                <div className="mb-1 flex flex-wrap items-baseline gap-2">
                  <h3 id={`health-${group.crop}`} className="text-lg font-bold text-ink">
                    {group.crop}
                  </h3>
                  <span className="text-xs font-semibold text-muted">
                    {group.scans.length} {group.scans.length === 1 ? 'scan' : 'scans'}
                  </span>
                </div>
                <Card className="divide-y divide-line p-0">
                  <ul>
                    {group.scans.map((scan) => (
                      <ScanRow key={scan.id} scan={scan} thumb={thumbnails[scan.id]} />
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-control border border-line bg-sunken/60 p-4">
            <p className="text-sm text-muted">
              This page only shows records saved by a real scan — no estimates or projections.
            </p>
            <Button to="/scan" size="md">
              <ArrowRight size={17} aria-hidden />
              Scan a crop
            </Button>
          </div>
        </>
      )}
    </div>
  );
}