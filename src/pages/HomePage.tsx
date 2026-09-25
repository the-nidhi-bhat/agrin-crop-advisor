import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Eye,
  Languages,
  ListChecks,
  MessageSquareText,
  ScanLine,
  ShieldCheck,
  Sprout,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../components/layout/Brand';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useAuth } from '../hooks/useAuth';
import { CROPS } from '../lib/crops';
import { LANGUAGES } from '../lib/languages';
import { useT, type StringKey } from '../lib/strings';

const HERO_IMAGES = [
  {
    src: '/landing/hero-1.jpg',
    alt: 'A farmer tending crops under an umbrella in a green field, India.',
  },
  {
    src: '/landing/hero-2.jpg',
    alt: 'Close-up of a healthy green crop leaf, West Bengal, India.',
  },
  {
    src: '/landing/hero-3.jpg',
    alt: 'A farmer working in a lush green rice field.',
  },
  {
    src: '/landing/hero-4.jpg',
    alt: 'An Indian woman farmer inspecting crops in a lush field.',
  },
  {
    src: '/landing/hero-5.jpg',
    alt: 'A farmer spraying fertilizer across a field in Bolpur, West Bengal, India.',
  },
];

const PHOTO_CREDITS =
  'Photos: Vishal Bhutani, Sudip Rajbanshi and Unsplash contributors (Unsplash License); Saifee Art, Dibakar Roy (Pexels License).';

const worksSteps: { num: string; titleKey: StringKey; copyKey: StringKey; icon: LucideIcon }[] = [
  { num: '01', titleKey: 'scan.stepCrop', copyKey: 'land.how1Copy', icon: ScanLine },
  { num: '02', titleKey: 'scan.stepPhoto', copyKey: 'land.how2Copy', icon: Camera },
  { num: '03', titleKey: 'land.how3Title', copyKey: 'land.how3Copy', icon: Eye },
  { num: '04', titleKey: 'land.how4Title', copyKey: 'land.how4Copy', icon: ListChecks },
  { num: '05', titleKey: 'land.how5Title', copyKey: 'land.how5Copy', icon: TrendingUp },
];

const capabilities: { titleKey: StringKey; copyKey: StringKey; icon: LucideIcon }[] = [
  { titleKey: 'land.cap1Title', copyKey: 'land.cap1Copy', icon: ScanLine },
  { titleKey: 'land.cap2Title', copyKey: 'land.cap2Copy', icon: MessageSquareText },
  { titleKey: 'land.cap3Title', copyKey: 'land.cap3Copy', icon: Sprout },
];

const trustPoints: StringKey[] = ['land.trust1', 'land.trust2', 'land.trust3'];

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [preferReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || preferReduced) {
      el?.classList.add('agrin-revealed');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('agrin-revealed');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [preferReduced]);

  return (
    <div ref={ref} className={`${preferReduced ? '' : 'agrin-reveal'} ${className}`}>
      {children}
    </div>
  );
}

function HeroRotator() {
  const t = useT();
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(() => HERO_IMAGES.map((_, i) => i === 0));
  const [preferReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const preloadedAt = useRef(0);

  useEffect(() => {
    if (preferReduced) {
      return;
    }
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [preferReduced]);

  useEffect(() => {
    const next = (current + 1) % HERO_IMAGES.length;
    if (loaded[next] || next === preloadedAt.current) {
      return;
    }
    preloadedAt.current = next;
    const img = new Image();
    img.onload = () => setLoaded((prev) => {
      const copy = [...prev];
      copy[next] = true;
      return copy;
    });
    img.src = HERO_IMAGES[next].src;
  }, [current, loaded]);

  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-sunken shadow-raise">
      <div className="relative aspect-[4/3] w-full">
        {HERO_IMAGES.map((img, i) => (
          <img
            key={img.src}
            src={img.src}
            alt={i === current ? img.alt : undefined}
            aria-hidden={i !== current}
            loading={i === 0 ? 'eager' : 'lazy'}
            className={`themed-photo absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              i === current ? (preferReduced ? 'opacity-100' : 'agrin-kenburns opacity-100') : 'opacity-0'
            }`}
          />
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden />

        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {HERO_IMAGES.map((img, i) => (
              <button
                key={img.src}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={t('land.heroShow', { n: String(i + 1) })}
                aria-current={i === current}
                className="group h-9 min-w-6 flex-1 px-1"
              >
                <span
                  className={`block h-1 w-full rounded-full transition-colors duration-300 ${
                    i === current ? 'bg-white' : 'bg-white/45 group-hover:bg-white/70'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-bold tabular-nums text-white" aria-hidden>
            {t('land.heroCounter', { current: String(current + 1), total: String(HERO_IMAGES.length) })}
          </span>
        </div>
      </div>
    </div>
  );
}

const supported = CROPS.map((crop) => crop.name);

export function LandingPage() {
  const t = useT();
  const { user, signedOut } = useAuth();
  const authed = Boolean(user) && !signedOut;
  const scanTarget = authed ? '/scan' : '/signin';

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="AgriN home">
            <Brand />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary sm:inline-flex">
              {t('common.beta')}
            </span>
            {authed ? (
              <Button to="/scan">
                <ScanLine size={18} aria-hidden />
                {t('land.openApp')}
              </Button>
            ) : (
              <>
                <Button to="/signin" variant="ghost">
                  {t('gate.signIn')}
                </Button>
                <Button to="/signup">{t('gate.createAccount')}</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-[1200px] px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-16 lg:pb-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{t('land.eyebrow')}</p>
              <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                {t('land.heroTitle')}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{t('land.heroSub')}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button to={scanTarget} size="lg" className="w-full sm:w-auto">
                  {t('home.scanButton')}
                  <ArrowRight size={18} aria-hidden />
                </Button>
                <a
                  href="#works"
                  className="inline-flex min-h-14 select-none items-center justify-center gap-2 rounded-control border border-line bg-surface px-6 text-base font-semibold text-ink transition-colors duration-150 hover:bg-sunken active:scale-[0.98]"
                >
                  {t('land.ctaExplore')}
                </a>
              </div>
              <div className="mt-8">
                <p className="text-sm text-muted">{t('home.supportedCrops')}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
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
            </div>
            <HeroRotator />
          </div>
        </section>

        {/* Why AgriN / story */}
        <section className="border-y border-line bg-sunken/60">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <Reveal>
                <div className="relative overflow-hidden rounded-card border border-line shadow-raise">
                  <img
                    src="/landing/hero-2.jpg"
                    alt="Close-up of a healthy green crop leaf held up to the light."
                    loading="lazy"
                    className="themed-photo aspect-[4/3] w-full object-cover"
                  />
                </div>
              </Reveal>
              <Reveal>
                <SectionHeader
                  eyebrow={t('land.storyEyebrow')}
                  title={t('land.storyTitle')}
                  description={t('land.storyCopy')}
                />
                <ul className="mt-6 space-y-3">
                  {(['land.storyList1', 'land.storyList2', 'land.storyList3'] as StringKey[]).map((key) => (
                    <li key={key} className="flex items-center gap-3 text-base font-semibold text-ink">
                      <CheckCircle2 size={20} className="shrink-0 text-primary" aria-hidden />
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="works" className="scroll-mt-20">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <Reveal>
              <SectionHeader
                eyebrow={t('home.howEyebrow')}
                title={t('land.worksTitle')}
                description={t('land.worksCopy')}
              />
            </Reveal>
            <Reveal className="mt-8">
              <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {worksSteps.map((step) => (
                  <li key={step.num}>
                    <Card className="flex h-full flex-col gap-3">
                      <div className="flex items-center justify-between text-primary">
                        <step.icon size={20} aria-hidden />
                        <span className="text-xs font-bold tabular-nums uppercase tracking-[0.1em]">{step.num}</span>
                      </div>
                      <h3 className="text-base font-bold text-ink">{t(step.titleKey)}</h3>
                      <p className="text-sm leading-relaxed text-muted">{t(step.copyKey)}</p>
                    </Card>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>

        {/* Capabilities */}
        <section className="border-t border-line bg-sunken/60">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <Reveal>
              <SectionHeader eyebrow={t('land.eyebrow')} title={t('land.capTitle')} description={t('land.capCopy')} />
            </Reveal>
            <Reveal className="mt-8">
              <div className="grid gap-4 md:grid-cols-3">
                {capabilities.map((cap) => (
                  <Card key={cap.titleKey} className="flex flex-col gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-control bg-primary-soft text-primary">
                      <cap.icon size={20} aria-hidden />
                    </span>
                    <h3 className="text-lg font-bold text-ink">{t(cap.titleKey)}</h3>
                    <p className="text-sm leading-relaxed text-muted">{t(cap.copyKey)}</p>
                  </Card>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Multilingual */}
        <section>
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <Reveal className="text-center">
              <SectionHeader
                eyebrow={t('land.langEyebrow')}
                title={t('land.langTitle')}
                description={t('land.langCopy')}
              />
            </Reveal>
            <Reveal className="mt-8">
              <ul className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2.5">
                {LANGUAGES.map((lang) => (
                  <li
                    key={lang.id}
                    className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 shadow-card"
                  >
                    <Languages size={15} className="text-primary" aria-hidden />
                    <span className="text-sm font-semibold text-ink">{lang.nativeName}</span>
                  </li>
                ))}
              </ul>
              <p className="mx-auto mt-8 flex max-w-2xl items-start gap-3 text-sm leading-relaxed text-muted">
                <MessageSquareText size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                <span>{t('land.langVoice')}</span>
              </p>
            </Reveal>
          </div>
        </section>

        {/* Crop health / monitor */}
        <section className="border-t border-line bg-sunken/60">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <Reveal>
                <SectionHeader
                  eyebrow={t('land.monitorEyebrow')}
                  title={t('land.monitorTitle')}
                  description={t('land.monitorCopy')}
                />
                <div className="mt-8">
                  <Button to={authed ? '/health' : '/scan'} variant="secondary" size="lg">
                    <Sprout size={18} aria-hidden />
                    {t('home.viewHealth')}
                  </Button>
                </div>
              </Reveal>
              <Reveal>
                <EmptyState
                  icon={Sprout}
                  title={t('land.monitorEmptyTitle')}
                  description={t('land.monitorEmptyCopy')}
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Trust / AI boundary */}
        <section>
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <Reveal>
              <SectionHeader eyebrow={t('land.trustEyebrow')} title={t('land.trustTitle')} description={t('land.trustCopy')} />
            </Reveal>
            <Reveal className="mt-8">
              <ul className="grid gap-4 md:grid-cols-3">
                {trustPoints.map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                    <span className="text-sm leading-relaxed text-muted">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-4xl">
                {t('land.ctaTitle')}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">{t('land.ctaSub')}</p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button to={scanTarget} size="lg">
                  <ScanLine size={18} aria-hidden />
                  {t('home.scanButton')}
                </Button>
                <a
                  href="#works"
                  className="inline-flex min-h-14 select-none items-center justify-center gap-2 rounded-control px-6 text-base font-semibold text-primary transition-colors duration-150 hover:bg-primary-soft"
                >
                  {t('land.ctaExplore')}
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-sunken/60">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Brand />
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{t('land.footerNote')}</p>
              <p className="mt-3 text-xs text-muted/80">{PHOTO_CREDITS}</p>
            </div>
            <Badge tone="soft">{t('common.beta')} · v0.6.0</Badge>
          </div>
        </div>
      </footer>
    </div>
  );
}