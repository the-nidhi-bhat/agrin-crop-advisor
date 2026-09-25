import {
  ArrowLeft,
  Camera,
  Info,
  MessageSquareText,
  PhoneCall,
  Sprout,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LANGUAGES, getLanguageById } from '../../lib/languages';
import { useLanguage } from '../../hooks/useLanguage';
import { usePresentation } from '../../hooks/usePresentation';
import { pickVoice, useTTS } from '../../hooks/useTTS';
import { translateAdvisory, type TranslateResult } from '../../lib/translate';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { controlClass } from '../ui/Field';
import { useT, type StringKey } from '../../lib/strings';
import { JourneyStepper } from './JourneyStepper';
import { EvidenceSection } from './EvidenceSection';
import { ActionPlan } from './ActionPlan';

export interface ScanResultData {
  id: string;
  disease: string;
  symptoms: string;
  advisory: string;
  confidence: string | null;
  weather: null;
  translatedAdvisory: string;
  smsStatus: { simulated: boolean; to?: string | null } | null;
}

interface ScanResultProps {
  result: ScanResultData;
  crop: string;
  imageUrl?: string | null;
  onReset: () => void;
}

export type HealthState = 'healthy' | 'concern' | 'unrecognized';

export const HEALTH_STATE_META: Record<
  HealthState,
  { dot: string; text: string }
> = {
  healthy: { dot: 'bg-primary', text: 'text-primary' },
  concern: { dot: 'bg-accent', text: 'text-[#7a5a12]' },
  unrecognized: { dot: 'bg-muted', text: 'text-muted' },
};

export const HEALTH_STATE_LABEL: Record<HealthState, StringKey> = {
  healthy: 'healthLabel.healthy',
  concern: 'healthLabel.concern',
  unrecognized: 'healthLabel.unrecognized',
};

// The state comes only from the model's own disease label — never invented.
export function healthState(disease?: string | null): HealthState | null {
  if (!disease) return null;
  const d = disease.trim().toLowerCase().replace(/[.,!?।\s]+$/, '');
  if (d === 'healthy') return 'healthy';
  if (d === 'unrecognized' || d.includes('unrecognized')) return 'unrecognized';
  return 'concern';
}

export function confidenceTone(confidence?: string | null) {
  switch (confidence) {
    case 'High':
      return 'soft' as const;
    case 'Medium':
      return 'warn' as const;
    case 'Low':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

function SectionTitle({ n, children }: { n: string; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-bold text-ink">
      <span className="text-xs font-extrabold text-primary">{n}</span>
      {children}
    </h2>
  );
}

export function ScanResult({ result, crop, imageUrl, onReset }: ScanResultProps) {
  const { language, setLanguage } = useLanguage();
  const { isSupported, isSpeaking, voices, speak, stop } = useTTS();
  const { presentation } = usePresentation();
  const t = useT();

  // Guidance is shown in the persisted language. Translations are cached per
  // language during this visit; English and any stored Kannada are immediate,
  // everything else is fetched from the translate Edge Function on demand.
  const [langId, setLangId] = useState<string>(() => language.id);
  const [translations, setTranslations] = useState<Record<string, string>>(() => ({
    en: result.advisory,
    ...(result.translatedAdvisory ? { kn: result.translatedAdvisory } : {}),
  }));
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<{
    language: string;
    message: string;
  } | null>(null);
  const requestRef = useRef(0);

  const state = healthState(result?.disease);
  const stateMeta = state ? HEALTH_STATE_META[state] : null;
  

  const guidanceAvailable = Boolean(result?.advisory);
  const currentLanguage = getLanguageById(langId);

  // `shownLangId` is the language whose text we actually have. While a chosen
  // translation loads, we keep rendering the last available guidance (usually
  // English) under its OWN lang attribute — never translated-looking text
  // mislabeled as the target language.
  const shownLangId = translations[langId] ? langId : 'en';
  const shownLanguage = getLanguageById(shownLangId);
  const guidanceText = translations[shownLangId] ?? result.advisory;
  const voiceAvailable = isSupported && pickVoice(voices, shownLanguage) !== null;

  // If the persisted language isn't cached yet, fetch it on mount so the
  // default view is actually in the language the user asked for.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    if (!translations[langId]) void chooseGuidanceLanguage(langId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseGuidanceLanguage = async (id: string) => {
    const previous = langId;
    setLangId(id);
    setLanguage(id);
    setTranslateError(null);
    if (translations[id]) return;
    const request = ++requestRef.current;
    setIsTranslating(true);
    try {
      const translation: TranslateResult = await translateAdvisory(result.id, id);
      if (requestRef.current !== request) return;
      setTranslations((prev) => ({ ...prev, [id]: translation.translatedText }));
    } catch (err) {
      if (requestRef.current !== request) return;
      // Keep showing a language we actually have, and say so plainly.
      setLangId(translations[previous] ? previous : 'en');
      setTranslateError({
        language: id,
        message: err instanceof Error ? err.message : t('result.couldNotLoadFallback'),
      });
    } finally {
      if (requestRef.current === request) setIsTranslating(false);
    }
  };

  const retryTranslation = () => {
    if (translateError) void chooseGuidanceLanguage(translateError.language);
  };

  const smsTo =
    result.smsStatus?.to && result.smsStatus.to !== 'Unknown'
      ? result.smsStatus.to
      : null;

  const guidanceCard = (
    <Card className="border-primary/20 bg-primary-soft/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-ink">{t('result.languageGuidance')}</h3>
          <p className="mt-1 text-xs text-muted">{t('result.translatedOnDemand')}</p>
        </div>
        <label className="flex min-w-0 flex-col gap-1 sm:min-w-44">
          <span className="text-xs font-semibold text-muted">
            {t('result.guidanceLanguage')}
          </span>
          <select
            id="guidance-language"
            aria-label={t('result.guidanceLanguage')}
            value={langId}
            onChange={(e) => void chooseGuidanceLanguage(e.target.value)}
            className={`${controlClass} min-h-11`}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nativeName} · {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {guidanceText && (
        <>
          <p className="mt-3 text-xs font-semibold text-muted">
            {t('result.guidanceLabel', { language: shownLanguage.name })}
          </p>
          <p
            lang={shownLangId}
            className={`mt-2 text-[15px] leading-relaxed text-ink/80 ${
              shownLangId === 'kn' ? 'font-kn' : ''
            }`}
          >
            {guidanceText}
          </p>
        </>
      )}
      {isTranslating && (
        <p className="mt-2 text-xs font-medium text-muted">
          {t('result.loadingGuidance', { language: currentLanguage.name })}
        </p>
      )}
      {translateError && (
        <div
          role="alert"
          className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-medium text-danger"
        >
          <span>
            {t('result.couldNotLoad', {
              language: getLanguageById(translateError.language).name,
              message: translateError.message,
            })}
          </span>
          <button
            type="button"
            onClick={retryTranslation}
            className="font-bold underline underline-offset-2"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      )}
      <div className="mt-4 border-t border-primary/15 pt-3">
        <p className="text-xs font-semibold text-muted">{t('result.simpleVoice')}</p>
        <Button
          variant="secondary"
          className="mt-2 w-full sm:w-auto"
          onClick={() => (isSpeaking ? stop() : speak(guidanceText, shownLanguage))}
          disabled={!guidanceText || !voiceAvailable}
          aria-label={
            isSpeaking
              ? t('result.stopAria', { language: shownLanguage.name })
              : t('result.playAria', { language: shownLanguage.name })
          }
        >
          {isSpeaking ? <VolumeX size={17} aria-hidden /> : <Volume2 size={17} aria-hidden />}
          {isSpeaking ? t('result.playing') : t('result.play')}
        </Button>
        {!voiceAvailable && isSupported && (
          <p className="mt-2 text-xs text-muted">
            {t('result.voiceMissing', { language: shownLanguage.name })}
          </p>
        )}
        {!isSupported && (
          <p className="mt-2 text-xs text-muted">{t('result.audioUnavailable')}</p>
        )}
      </div>
    </Card>
  );

  const tail = (
    <>
      {/* SMS status — honestly labeled */}
      {result.smsStatus && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-control border border-accent/40 bg-accent-soft p-4 text-sm"
        >
          {result.smsStatus.simulated ? (
            <MessageSquareText size={18} className="mt-0.5 shrink-0 text-[#7a5a12]" aria-hidden />
          ) : (
            <PhoneCall size={18} className="mt-0.5 shrink-0 text-[#7a5a12]" aria-hidden />
          )}
          <p className="leading-relaxed text-[#6b4f10]">
            {result.smsStatus.simulated
              ? t('result.smsSimulated', {
                  to: smsTo || t('result.yourPhoneNumber'),
                })
              : t('result.smsSent', { to: smsTo || t('result.yourPhoneNumber') })}
          </p>
        </div>
      )}

      {/* Trust / advisory boundary */}
      <div className="flex items-start gap-3 rounded-control border border-line bg-sunken/60 p-4 text-sm text-muted">
        <Info size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <p className="leading-relaxed">{t('result.trust')}</p>
      </div>

      {/* Actions — only existing functionality */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button size="lg" onClick={onReset} className="w-full sm:w-auto">
          <Camera size={17} aria-hidden />
          {t('result.scanAnother')}
        </Button>
        <Button variant="secondary" size="lg" to="/health" className="w-full sm:w-auto">
          <Sprout size={17} aria-hidden />
          {t('result.viewHealth')}
        </Button>
        <Button variant="ghost" size="lg" to="/" className="w-full sm:w-auto sm:ml-auto">
          <ArrowLeft size={17} aria-hidden />
          {t('result.backHome')}
        </Button>
      </div>
    </>
  );

  if (presentation === 'simple') {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            {t('result.eyebrow', { crop })}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t('result.title')}</h1>
          <p className="text-sm text-muted">{t('result.caveat')}</p>
        </div>
        <JourneyStepper completed={4} className="pt-1" />

        {/* What AgriN found */}
        <Card className="border-primary/20 bg-primary-soft/40">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            {t('result.simpleFound')}
          </p>
          <div className="mt-3 flex items-start gap-4">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={t('result.photoAlt', { crop })}
                className="themed-photo h-24 w-24 shrink-0 rounded-card border border-line object-cover"
              />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              {stateMeta && state !== null && (
                <p className={`flex items-center gap-2 text-sm font-semibold ${stateMeta.text}`}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${stateMeta.dot}`} aria-hidden />
                  {t(HEALTH_STATE_LABEL[state])}
                </p>
              )}
              <h2 className="text-2xl font-bold tracking-tight text-ink">{result.disease}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-muted">
                  {crop}
                </span>
                {result.confidence && (
                  <Badge tone={confidenceTone(result.confidence)}>
                    {t('result.confidence', { value: result.confidence })}
                  </Badge>
                )}
                <Badge tone="neutral">{t('result.aiAssisted')}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* What you may notice */}
        <EvidenceSection simple symptoms={result.symptoms} crop={crop} />

        {/* What to do now */}
        {result.advisory && <ActionPlan advisory={result.advisory} />}

        {/* Keep watching */}
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Sprout size={22} aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-ink">{t('result.simpleWatch')}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t('result.monitoringCopy')}</p>
              <Button size="lg" to="/health" className="mt-4">
                <Sprout size={17} aria-hidden />
                {t('result.watchCta')}
              </Button>
            </div>
          </div>
        </Card>

        {guidanceAvailable && guidanceCard}
        {tail}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Result header */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          {t('result.eyebrow', { crop })}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {t('result.title')}
        </h1>
        <p className="text-sm text-muted">{t('result.caveat')}</p>
      </div>

      {/* Scan → Understand → Act → Monitor */}
      <JourneyStepper completed={4} className="pt-1" />

      {/* 01 — Diagnosis */}
      <Card className="border-primary/20 bg-primary-soft/40">
        <SectionTitle n="01">{t('result.diagnosis')}</SectionTitle>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={t('result.photoAlt', { crop })}
              className="themed-photo h-24 w-24 shrink-0 rounded-card border border-line object-cover"
            />
          )}
          <div className="min-w-0 flex-1 space-y-2.5">
            {stateMeta && state !== null && (
              <p className={`flex items-center gap-2 text-sm font-semibold ${stateMeta.text}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${stateMeta.dot}`} aria-hidden />
                {t(HEALTH_STATE_LABEL[state])}
              </p>
            )}
            <h3 className="text-2xl font-bold tracking-tight text-ink">{result.disease}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-muted">
                {crop}
              </span>
              {result.confidence && (
                <Badge tone={confidenceTone(result.confidence)}>
                  {t('result.confidence', { value: result.confidence })}
                </Badge>
              )}
              <Badge tone="neutral">{t('result.aiAssisted')}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* 02 — Why this result (concise evidence, never invented) */}
      <EvidenceSection number="02" symptoms={result.symptoms} crop={crop} />

      {/* 03 — Advisory */}
      {result.advisory && (
        <Card className="border-primary/20">
          <SectionTitle n="03">{t('result.whatToDo')}</SectionTitle>
          <p className="mt-3 border-l-2 border-primary/30 pl-4 text-[15px] leading-relaxed text-ink/85">
            {result.advisory}
          </p>
        </Card>
      )}

      {/* 04 — Monitor */}
      <Card>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Sprout size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <SectionTitle n="04">{t('result.monitoring')}</SectionTitle>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t('result.monitoringCopy')}
            </p>
            <Button variant="subtle" size="md" to="/health" className="mt-4">
              <Sprout size={17} aria-hidden />
              {t('result.viewHealth')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Guidance language — all nine languages, persisted, translated on demand */}
      {guidanceAvailable && guidanceCard}

      {tail}
    </div>
  );
}