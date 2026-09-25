import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  Clock,
  Leaf,
  ScanLine,
} from 'lucide-react';
import { useCropHealth, type CropHealthScan } from '../hooks/useCropHealth';
import {
  confidenceTone,
  healthState,
  HEALTH_STATE_LABEL,
  HEALTH_STATE_META,
  type HealthState,
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

function timelineDot(scan: CropHealthScan): { dot: string; state: HealthState | null } {
  if (scan.status === 'success') {
    const state = healthState(scan.disease);
    return { dot: state ? HEALTH_STATE_META[state].dot : 'bg-muted', state };
  }
  if (scan.status === 'failed') return { dot: 'bg-danger', state: null };
  return { dot: 'bg-muted', state: null };
}

interface TimelineRowProps {
  scan: CropHealthScan;
  thumb: string | undefined;
  t: ReturnType<typeof useT>;
}

function TimelineRow({ scan, thumb, t }: TimelineRowProps) {
  const { dot, state } = timelineDot(scan);

  return (
    <li className="relative flex items-center gap-4 py-4 pl-9">
      <span
        className={`absolute left-[22px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-surface ${dot}`}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-0 left-[26px] top-0 w-px bg-line"
        aria-hidden
      />
      {thumb ? (
        <img
          src={thumb}
          alt={t('health.scanPhotoAlt', {
            crop: scan.crop,
            date: formatDate(scan.created_at),
          })}
          loading="lazy"
          className="themed-photo h-14 w-14 shrink-0 rounded-card border border-line bg-sunken object-cover"
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
            <span className={`text-xs font-semibold ${HEALTH_STATE_META[state].text}`}>
              {t(HEALTH_STATE_LABEL[state])}
            </span>
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

interface CompareProps {
  earlier: CropHealthScan;
  latest: CropHealthScan;
  thumbs: Record<string, string | undefined>;
  t: ReturnType<typeof useT>;
}

function CompareBlock({ earlier, latest, thumbs, t }: CompareProps) {
  const sides = [
    {
      scan: earlier,
      label: t('health.compareEarlier'),
    },
    {
      scan: latest,
      label: t('health.compareLatest'),
    },
  ];

  return (
    <Card className="mt-3">
      <h4 className="flex items-center gap-2 text-sm font-bold text-ink">
        <ArrowLeftRight size={16} aria-hidden className="text-primary" />
        {t('health.compareTitle')}
      </h4>
      <p className="mt-1 text-xs text-muted">{t('health.compareNoClaim')}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {sides.map(({ scan, label }) => {
          const state = healthState(scan.disease);
          return (
            <div
              key={scan.id}
              className="rounded-card border border-line bg-sunken/40 p-3"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                {label}
              </p>
              {thumbs[scan.id] ? (
                <img
                  src={thumbs[scan.id]}
                  alt={t('health.leafPhotoAlt', {
                    crop: scan.crop,
                    date: formatDate(scan.created_at),
                  })}
                  loading="lazy"
                  className="themed-photo mt-2 aspect-[4/3] w-full rounded-card border border-line bg-sunken object-cover"
                />
              ) : (
                <span className="mt-2 flex aspect-[4/3] w-full items-center justify-center rounded-card border border-line bg-sunken text-muted">
                  <Leaf size={20} aria-hidden />
                </span>
              )}
              <p className="mt-2 break-words text-sm font-semibold text-ink">
                {scan.disease ?? t('health.scanCompleted')}
              </p>
              {state && (
                <p className={`text-xs font-semibold ${HEALTH_STATE_META[state].text}`}>
                  {t(HEALTH_STATE_LABEL[state])}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                <Clock size={11} aria-hidden />
                {formatDate(scan.created_at)}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
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
                        className="themed-photo h-28 w-28 shrink-0 rounded-card border border-line bg-sunken object-cover"
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

          {scans.length === 1 && (
            <Card className="border-line bg-sunken/60">
              <h3 className="text-sm font-bold text-ink">{t('health.firstScan')}</h3>
              <p className="mt-1 text-sm text-muted">{t('health.firstScanCopy')}</p>
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
            {groups.map((group) => {
              const successes = group.scans.filter((s) => s.status === 'success');
              const latestSuccessInGroup = successes[0];
              const earlier = successes[successes.length - 1];

              return (
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
                  <Card className="p-0">
                    <ul className="px-3">
                      {group.scans.map((scan) => (
                        <TimelineRow
                          key={scan.id}
                          scan={scan}
                          thumb={thumbnails[scan.id]}
                          t={t}
                        />
                      ))}
                    </ul>
                  </Card>
                  {successes.length >= 2 &&
                    latestSuccessInGroup &&
                    earlier &&
                    latestSuccessInGroup.id !== earlier.id && (
                      <CompareBlock
                        earlier={earlier}
                        latest={latestSuccessInGroup}
                        thumbs={thumbnails}
                        t={t}
                      />
                    )}
                  {successes.length < 2 && group.scans.length > 1 && (
                    <p className="mt-2 px-3 text-xs text-muted">
                      {t('health.compareNeedsMore')}
                    </p>
                  )}
                </section>
              );
            })}
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