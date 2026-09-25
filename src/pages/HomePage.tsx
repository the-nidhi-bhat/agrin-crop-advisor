import { ArrowRight, Eye, ListChecks, ScanLine, TrendingUp, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';
import { CROPS } from '../lib/crops';

const loop: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: ScanLine,
    title: 'Scan',
    copy: 'Photograph a leaf. AgriN reads the crop image server-side for a plain-language read on what is happening.',
  },
  {
    icon: Eye,
    title: 'Understand',
    copy: 'Get the likely condition and a clear confidence level — no jargon, no guesswork presented as fact.',
  },
  {
    icon: ListChecks,
    title: 'Act',
    copy: 'Step-by-step immediate advisory in English and Kannada you can act on with local resources.',
  },
  {
    icon: TrendingUp,
    title: 'Monitor',
    copy: 'Crop Health will group your scans over time so you can see how a crop is tracking.',
  },
];

const supported = CROPS.map((crop) => crop.name);

export function HomePage() {
  return (
    <div className="space-y-12 md:space-y-16">
      {/* Hero */}
      <section className="pt-4 md:pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Crop health companion
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-ink md:text-5xl">
          Understand what is happening to your crop.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
          AgriN helps you check the health of common Indian crops — tomato, chili, paddy, cotton,
          soybean, wheat, maize, groundnut, sugarcane, and onion. Scan a leaf, get a clear
          diagnosis, and know exactly what to do next — in plain language, in Kannada too.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button to="/scan" size="lg" className="w-full sm:w-auto">
            Scan your crop
            <ArrowRight size={18} aria-hidden />
          </Button>
          <Button to="/health" variant="secondary" size="lg" className="w-full sm:w-auto">
            View crop health
          </Button>
        </div>
        <p className="mt-5 text-sm text-muted">
          Supported crops:{' '}
          {supported.map((crop, i) => (
            <span key={crop} className="font-semibold text-ink">
              {crop}
              {i < supported.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      </section>

      {/* Product loop */}
      <section>
        <SectionHeader
          eyebrow="How it works"
          title="Scan, understand, act, monitor"
          description="One crop at a time — a calm, practical loop, not a flood of AI widgets."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loop.map((step, i) => (
            <Card key={step.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary">
                <step.icon size={20} aria-hidden />
                <span className="text-xs font-bold uppercase tracking-[0.1em]">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{step.copy}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Honest first-use state */}
      <section>
        <div className="md:flex md:items-end md:justify-between">
          <SectionHeader
            eyebrow="Progress"
            title="Your crop history"
            description="Every scan you make appears here, grouped by crop."
          />
          <Link
            to="/health"
            className="mt-2 inline-flex items-center gap-1 self-start text-sm font-semibold text-primary hover:underline md:mt-0"
          >
            Open crop health <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
        <div className="mt-6">
          <EmptyState
            icon={ScanLine}
            title="No crop history yet"
            description="Your first scan will appear here. Start by scanning a leaf to build up a picture of your crop's health."
            action={<Button to="/scan">Scan your first crop</Button>}
          />
        </div>
      </section>
    </div>
  );
}