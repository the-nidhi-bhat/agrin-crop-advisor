import { ArrowRight, Eye, ListChecks, ScanLine, TrendingUp, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';
import { CROPS } from '../lib/crops';
import { useT, type StringKey } from '../lib/strings';

const loop: { icon: LucideIcon; titleKey: StringKey; copyKey: StringKey }[] = [
  { icon: ScanLine, titleKey: 'home.loopScanTitle', copyKey: 'home.loopScanCopy' },
  { icon: Eye, titleKey: 'home.loopUnderstandTitle', copyKey: 'home.loopUnderstandCopy' },
  { icon: ListChecks, titleKey: 'home.loopActTitle', copyKey: 'home.loopActCopy' },
  { icon: TrendingUp, titleKey: 'home.loopMonitorTitle', copyKey: 'home.loopMonitorCopy' },
];

const supported = CROPS.map((crop) => crop.name);

export function HomePage() {
  const t = useT();

  return (
    <div className="space-y-12 md:space-y-16">
      {/* Hero */}
      <section className="pt-4 md:pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          {t('home.heroEyebrow')}
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-ink md:text-5xl">
          {t('home.heroTitle')}
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">{t('home.heroCopy')}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button to="/scan" size="lg" className="w-full sm:w-auto">
            {t('home.scanButton')}
            <ArrowRight size={18} aria-hidden />
          </Button>
          <Button to="/health" variant="secondary" size="lg" className="w-full sm:w-auto">
            {t('home.viewHealth')}
          </Button>
        </div>
        <div className="mt-6">
          <p className="text-sm text-muted">{t('home.supportedCrops')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {supported.map((crop) => (
              <li
                key={crop}
                className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold text-ink shadow-card"
              >
                {crop}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Product loop */}
      <section>
        <SectionHeader
          eyebrow={t('home.howEyebrow')}
          title={t('home.howTitle')}
          description={t('home.howDescription')}
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loop.map((step, i) => (
            <Card key={step.titleKey} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary">
                <step.icon size={20} aria-hidden />
                <span className="text-xs font-bold uppercase tracking-[0.1em]">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-ink">{t(step.titleKey)}</h3>
              <p className="text-sm leading-relaxed text-muted">{t(step.copyKey)}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Honest first-use state */}
      <section>
        <div className="md:flex md:items-end md:justify-between">
          <SectionHeader
            eyebrow={t('home.progressEyebrow')}
            title={t('home.progressTitle')}
            description={t('home.progressDescription')}
          />
          <Link
            to="/health"
            className="mt-2 inline-flex items-center gap-1 self-start text-sm font-semibold text-primary hover:underline md:mt-0"
          >
            {t('home.openHealth')} <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
        <div className="mt-6">
          <EmptyState
            icon={ScanLine}
            title={t('home.emptyTitle')}
            description={t('home.emptyDescription')}
            action={<Button to="/scan">{t('home.emptyAction')}</Button>}
          />
        </div>
      </section>
    </div>
  );
}