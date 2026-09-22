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
import { useState, type ReactNode } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

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

type HealthState = 'healthy' | 'concern' | 'unrecognized';

const HEALTH_STATE_META: Record<
  HealthState,
  { label: string; dot: string; text: string }
> = {
  healthy: { label: 'Looks healthy', dot: 'bg-primary', text: 'text-primary' },
  concern: { label: 'Possible issue', dot: 'bg-accent', text: 'text-[#7a5a12]' },
  unrecognized: { label: 'Pattern not recognized', dot: 'bg-muted', text: 'text-muted' },
};

// The state comes only from the model's own disease label — never invented.
function healthState(disease?: string): HealthState | null {
  if (!disease) return null;
  const d = disease.trim().toLowerCase().replace(/[.,!?।\s]+$/, '');
  if (d === 'healthy') return 'healthy';
  if (d === 'unrecognized' || d.includes('unrecognized')) return 'unrecognized';
  return 'concern';
}

function sentencePoints(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function confidenceTone(confidence?: string | null) {
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [usingFallbackVoice, setUsingFallbackVoice] = useState(false);

  const state = healthState(result?.disease);
  const stateMeta = state ? HEALTH_STATE_META[state] : null;
  const symptomPoints = result?.symptoms ? sentencePoints(result.symptoms) : [];

  const playAudio = () => {
    if (!result?.translatedAdvisory) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.translatedAdvisory);

    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find((v) => v.lang.startsWith('kn'));
    if (targetVoice) {
      utterance.voice = targetVoice;
      setUsingFallbackVoice(false);
    } else {
      utterance.lang = 'kn-IN';
      setUsingFallbackVoice(true);
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const smsTo =
    result.smsStatus?.to && result.smsStatus.to !== 'Unknown'
      ? result.smsStatus.to
      : null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Result header */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          {crop} · Scan result
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Here's what we found
        </h1>
        <p className="text-sm text-muted">
          AI-assisted guidance is advisory only — not a professional agricultural diagnosis.
          Confirm any treatment with your local agricultural extension officer.
        </p>
      </div>

      {/* 01 — Diagnosis */}
      <Card className="border-primary/20 bg-primary-soft/40">
        <SectionTitle n="01">Diagnosis</SectionTitle>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={`Photo of the ${crop} leaf this result is based on`}
              className="h-24 w-24 shrink-0 rounded-card border border-line object-cover"
            />
          )}
          <div className="min-w-0 flex-1 space-y-2.5">
            {stateMeta && (
              <p className={`flex items-center gap-2 text-sm font-semibold ${stateMeta.text}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${stateMeta.dot}`} aria-hidden />
                {stateMeta.label}
              </p>
            )}
            <h3 className="text-2xl font-bold tracking-tight text-ink">{result.disease}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-muted">
                {crop}
              </span>
              {result.confidence && (
                <Badge tone={confidenceTone(result.confidence)}>
                  Confidence: {result.confidence}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 02 — Symptoms / why this result */}
      {result.symptoms && (
        <Card>
          <SectionTitle n="02">Signs in the photo</SectionTitle>
          {symptomPoints.length > 1 ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-primary">
              {symptomPoints.map((point, index) => (
                <li key={index} className="leading-relaxed text-ink/80">
                  {point}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 leading-relaxed text-ink/80">{result.symptoms}</p>
          )}
        </Card>
      )}

      {/* 03 — Advisory */}
      {result.advisory && (
        <Card className="border-primary/20">
          <SectionTitle n="03">What to do now</SectionTitle>
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
            <SectionTitle n="04">Keep monitoring</SectionTitle>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              This scan is saved to Crop Health, where your scans group by crop for a running
              picture of how each crop is tracking over time.
            </p>
            <Button variant="subtle" size="md" to="/health" className="mt-4">
              <Sprout size={17} aria-hidden />
              View crop health
            </Button>
          </div>
        </div>
      </Card>

      {/* Kannada guidance — secondary language option */}
      {result.translatedAdvisory && (
        <Card className="border-primary/20 bg-primary-soft/40">
          <h3 className="font-bold text-ink">ಕನ್ನಡದಲ್ಲಿ</h3>
          <p className="mt-0.5 text-xs font-semibold text-muted">Kannada guidance</p>
          <p lang="kn" className="mt-2 font-kn text-lg leading-relaxed text-ink/80">
            {result.translatedAdvisory}
          </p>
          <Button
            variant="secondary"
            className="mt-4 w-full sm:w-auto"
            onClick={playAudio}
            disabled={isPlaying}
            aria-label={isPlaying ? 'Stop Kannada audio' : 'Play Kannada audio'}
          >
            {isPlaying ? <VolumeX size={17} aria-hidden /> : <Volume2 size={17} aria-hidden />}
            {isPlaying ? 'Playing…' : 'Play audio'}
          </Button>
          {usingFallbackVoice && (
            <p className="mt-2 text-xs text-muted">
              Playing in the closest available voice (a Kannada voice is not installed on this
              device).
            </p>
          )}
        </Card>
      )}

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
              ? `SMS delivery is simulated (no provider connected). The advisory would be sent to ${
                  smsTo || 'your phone number'
                }.`
              : `SMS sent to ${smsTo || 'your phone number'}.`}
          </p>
        </div>
      )}

      {/* Trust / advisory boundary */}
      <div className="flex items-start gap-3 rounded-control border border-line bg-sunken/60 p-4 text-sm text-muted">
        <Info size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <p className="leading-relaxed">
          This result was generated by an AI model from the photo you uploaded, for general crop
          care. Soil, weather, and local conditions differ — treat it as a starting point and
          confirm any treatment with your local agricultural extension officer.
        </p>
      </div>

      {/* Actions — only existing functionality */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button size="lg" onClick={onReset} className="w-full sm:w-auto">
          <Camera size={17} aria-hidden />
          Scan another crop
        </Button>
        <Button variant="secondary" size="lg" to="/health" className="w-full sm:w-auto">
          <Sprout size={17} aria-hidden />
          View crop health
        </Button>
        <Button variant="ghost" size="lg" to="/" className="w-full sm:w-auto sm:ml-auto">
          <ArrowLeft size={17} aria-hidden />
          Back to home
        </Button>
      </div>
    </div>
  );
}