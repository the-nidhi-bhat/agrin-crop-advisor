import { AlertTriangle, ArrowLeft, Camera, MessageSquareText, PhoneCall, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ScanResultProps {
  result: any;
  crop: string;
  onReset: () => void;
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

export function ScanResult({ result, crop, onReset }: ScanResultProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [usingFallbackVoice, setUsingFallbackVoice] = useState(false);

  const playAudio = () => {
    if (!result.translatedAdvisory) return;
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

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          {crop} · Diagnosis
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Diagnosis ready</h1>
        <p className="text-sm text-muted">
          AI-assisted advisory only — not a professional diagnosis. Always consult a local
          agricultural officer before applying treatments.
        </p>
      </div>

      {/* Disease hero */}
      <div className="rounded-card border border-primary/20 bg-primary-soft p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-primary">{result.disease}</h2>
          {result.confidence && (
            <Badge tone={confidenceTone(result.confidence)}>
              Confidence: {result.confidence}
            </Badge>
          )}
        </div>
        {result.symptoms && (
          <p className="mt-3 leading-relaxed text-ink/80">{result.symptoms}</p>
        )}
      </div>

      {result.advisory && (
        <Card>
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <RefreshCw size={17} className="text-primary" aria-hidden />
            What to do now
          </h3>
          <p className="mt-2 leading-relaxed text-ink/80">{result.advisory}</p>
        </Card>
      )}

      {result.translatedAdvisory && (
        <Card className="border-primary/20 bg-primary-soft/40">
          <h3 className="font-bold text-ink">ಕನ್ನಡದಲ್ಲಿ (Kannada)</h3>
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

      {result.smsStatus && (
        <div className="flex items-start gap-3 rounded-control border border-accent/40 bg-accent-soft p-4 text-sm">
          {result.smsStatus.simulated ? (
            <MessageSquareText size={18} className="mt-0.5 shrink-0 text-[#7a5a12]" aria-hidden />
          ) : (
            <PhoneCall size={18} className="mt-0.5 shrink-0 text-[#7a5a12]" aria-hidden />
          )}
          <p className="leading-relaxed text-[#6b4f10]">
            {result.smsStatus.simulated
              ? `SMS delivery is simulated (no provider connected). The advisory would be sent to ${
                  result.smsStatus.to || 'your phone'
                }.`
              : `SMS sent to ${result.smsStatus.to || 'your phone'}.`}
          </p>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-control border border-line bg-sunken/60 p-4 text-sm text-muted">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-ink/50" aria-hidden />
        <p className="leading-relaxed">
          This guidance is generated for general crop care. Local conditions differ — confirm any
          treatment with your local agricultural extension officer.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={onReset} className="w-full sm:w-auto">
          <Camera size={17} aria-hidden />
          Scan another crop
        </Button>
        <Button variant="secondary" size="lg" className="w-full sm:w-auto" to="/">
          <ArrowLeft size={17} aria-hidden />
          Back to home
        </Button>
      </div>
    </div>
  );
}