import { AlertCircle, ArrowRight, Clock, Leaf, ScanLine } from 'lucide-react';
import { useCropHealth, type CropHealthScan } from '../hooks/useCropHealth';
import {
  confidenceTone,
  healthState,
  HEALTH_STATE_LABEL,
  HEALTH_STATE_META,
} from '../components/scan/ScanResult';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useT } from '../lib/strings';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${date}, ${time}`;
}

function scanLabel(scan: CropHealthScan, t: ReturnType<typeof useT>): string {
  if (scan.status === 'success') return scan.disease ?? t('health.scanCompleted');
  if (scan.status === 'failed') return t('health.scanFailed');
  return t('health.stillProcessing');
}

interface ScanRowProps {
  scan: CropHealthScan;
  thumb: string | undefined;
  t: ReturnType<typeof useT>;
}

function ScanRow({ scan, thumb, t }: ScanRowProps) {
  const state = healthState(scan.disease);

  return (
    <li className="flex items-center gap-4 py-3">
      {thumb ? (
        <img
          src={thumb}
          alt={t('health.scanPhotoAlt', {
            crop: scan.crop,
            date: formatDate(scan.created_at),
          })}
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
          <p className="font-semibold text-ink">{scanLabel(scan, t)}</p>
          {state && scan.status === 'success' && (
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${HEALTH_STATE_META[state].dot}`}
              aria-hidden
            />
          )}
          {scan.confidence && scan.status === 'success' && (
            <Badge tone={confidenceTone(scan.confidence)}>
              {t('health.confidence', { value: scan.confidence })}
            </Badge>
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
  const t = useT();

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
        eyebrow={t('health.eyebrow')}
        title={t('health.title')}
        description={t('health.description')}
      />

      {!scans && !error && (
        <p className="text-sm text-muted" role="status">
          {t('health.loading')}
        </p>
      )}

      {error && (
        <div role="alert" className="space-y-3">
          <Card className="border-danger/30">
            <h3 className="flex items-center gap-2 font-semibold text-danger">
              <AlertCircle size={18} aria-hidden />
              {t('health.errorTitle')}
            </h3>
            <p className="mt-2 text-sm text-muted">{t('health.errorCopy', { error })}</p>
            <Button variant="secondary" size="md" className="mt-4" onClick={reload}>
              {t('common.tryAgain')}
            </Button>
          </Card>
        </div>
      )}

      {scans && scans.length === 0 && (
        <EmptyState
          icon={ScanLine}
          title={t('health.emptyTitle')}
          description={t('health.emptyDescription')}
          action={<Button to="/scan">{t('health.emptyAction')}</Button>}
        />
      )}

      {scans && scans.length > 0 && (
        <>
          {latest && (
            <Card className="border-primary/20 bg-primary-soft/40">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                {t('health.currentStatus')}
              </p>
              {latest.status === 'success' ? (
                <>
                  <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start">
                    {thumbnails[latest.id] && (
                      <img
                        src={thumbnails[latest.id]}
                        alt={t('health.leafPhotoAlt', {
                          crop: latest.crop,
                          date: formatDate(latest.created_at),
                        })}
                        className="h-28 w-28 shrink-0 rounded-card border border-line bg-sunken object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight text-ink">
                          {latest.disease ?? t('health.scanCompleted')}
                        </h2>
                        {latestState && latest.status === 'success' && (
                          <span
                            className={`mt-1 text-sm font-semibold ${HEALTH_STATE_META[latestState].text}`}
                          >
                            {t(HEALTH_STATE_LABEL[latestState])}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-muted">
                          {latest.crop}
                        </span>
                        {latest.confidence && (
                          <Badge tone={confidenceTone(latest.confidence)}>
                            {t('health.confidence', { value: latest.confidence })}
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
                    {t('health.didNotComplete')}
                  </h2>
                  <p className="mt-2 text-sm text-muted">{t('health.failedCopy')}</p>
                  <Button to="/scan" size="md" className="mt-4">
                    <ScanLine size={17} aria-hidden />
                    {t('health.scanAgain')}
                  </Button>
                </div>
              ) : (
                <div className="mt-2">
                  <h2 className="text-xl font-bold tracking-tight text-ink">
                    {t('health.stillProcessingTitle')}
                  </h2>
                  <p className="mt-2 text-sm text-muted">{t('health.processingCopy')}</p>
                </div>
              )}
            </Card>
          )}

          {latestSuccess?.advisory_text && (
            <Card>
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                {t('health.monitorNow')}
              </h3>
              <p className="mt-1 text-sm font-semibold text-muted">
                {t('health.monitorCopy', {
                  crop: latestSuccess.crop,
                  date: formatDate(latestSuccess.created_at),
                })}
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
                    {group.scans.length}{' '}
                    {group.scans.length === 1
                      ? t('health.scanCountSingular')
                      : t('health.scanCountPlural')}
                  </span>
                </div>
                <Card className="divide-y divide-line p-0">
                  <ul>
                    {group.scans.map((scan) => (
                      <ScanRow
                        key={scan.id}
                        scan={scan}
                        thumb={thumbnails[scan.id]}
                        t={t}
                      />
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-control border border-line bg-sunken/60 p-4">
            <p className="text-sm text-muted">{t('health.footerCopy')}</p>
            <Button to="/scan" size="md">
              <ArrowRight size={17} aria-hidden />
              {t('health.scanCrop')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}