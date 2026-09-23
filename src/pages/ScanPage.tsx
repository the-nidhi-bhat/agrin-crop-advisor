import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { ImageIcon, RefreshCw, ScanLine, ShieldCheck, SunMedium } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { StagedLoader } from '../components/StagedLoader';
import { CropSelector } from '../components/scan/CropSelector';
import { ScanResult, type ScanResultData } from '../components/scan/ScanResult';
import { UploadZone } from '../components/scan/UploadZone';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, controlClass } from '../components/ui/Field';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useAuth } from '../hooks/useAuth';
import { CROPS } from '../lib/crops';
import { supabase } from '../lib/supabase';

type Phase = 'form' | 'analyzing' | 'result';

interface DiagnosisResult {
  id: string;
  disease: string;
  symptoms: string;
  advisory: string;
  confidence: string | null;
}
interface AdvisoryResult {
  advisory: string;
  weather: null;
}
interface DeliverResult {
  translatedAdvisory: string;
  smsStatus: { simulated: boolean; to?: string | null } | null;
}

// ponytail: 45s heuristic only drives the visible "taking longer than expected"
// note — not a completion promise. The backend owns the real timeouts (25s
// Gemini bound, retried server-side).
const SLOW_THRESHOLD_MS = 45_000;

async function invoke<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(path, { body });
  if (error) throw error;
  return data as T;
}

async function friendlyMessage(err: unknown): Promise<string> {
  if (err instanceof FunctionsHttpError || err instanceof FunctionsRelayError) {
    const context = await err.context.json().catch(() => ({}));
    const body = context as { error?: { code?: string; message?: string } };
    const code = body.error?.code;
    const message = body.error?.message;
    if (code === 'resource-exhausted') {
      return message || 'You have reached the scan limit for this hour. Please try again later.';
    }
    if (code === 'unavailable') {
      return 'AgriN could not complete the analysis right now. Please try again in a moment.';
    }
    if (message) return message;
    return 'AgriN could not complete the analysis. Please try again.';
  }
  if (err instanceof FunctionsFetchError) {
    return 'Could not reach the AgriN service. Check your connection and try again.';
  }
  return 'Something went wrong while scanning. Please try again.';
}

export function ScanPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState(CROPS[0].name);
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [step, setStep] = useState(0);
  const [isSlow, setIsSlow] = useState(false);
  const [result, setResult] = useState<ScanResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slowTimer = useRef<number | null>(null);
  const submitting = useRef(false);
  const runId = useRef(0);

  useEffect(
    () => () => {
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
    },
    [],
  );

  const handleFileChange = (selectedFile: File) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError(null);
  };

  const startOver = () => {
    if (slowTimer.current) window.clearTimeout(slowTimer.current);
    if (preview) URL.revokeObjectURL(preview);
    submitting.current = false;
    runId.current++;
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setIsSlow(false);
    setPhase('form');
  };

  const handleTryAgain = () => {
    if (slowTimer.current) window.clearTimeout(slowTimer.current);
    submitting.current = false;
    runId.current++;
    setIsSlow(false);
    setError(null);
    setPhase('form');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    if (!file || !preview) {
      setError('Choose a leaf photo to scan.');
      return;
    }
    if (!user) {
      setError('Your scan session is still connecting. Please reload and try again.');
      return;
    }

    submitting.current = true;
    setError(null);
    setIsSlow(false);
    setStep(0);
    setPhase('analyzing');
    slowTimer.current = window.setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS);

    const currentRun = ++runId.current;

    try {
      const fileId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `${user.id}/${fileId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(storagePath, file, { contentType: file.type || 'image/jpeg' });
      if (uploadError) throw uploadError;
      if (runId.current !== currentRun) return;
      setStep(1);

      const diagnosis = await invoke<DiagnosisResult>('diagnose', {
        imageUrl: storagePath,
        crop,
        location,
        phoneNumber: phone,
      });
      if (runId.current !== currentRun) return;
      setStep(2);

      const advisory = await invoke<AdvisoryResult>('advisory', { diagnosisId: diagnosis.id });
      if (runId.current !== currentRun) return;
      setStep(3);

      const deliver = await invoke<DeliverResult>('deliver', { diagnosisId: diagnosis.id });
      if (runId.current !== currentRun) return;

      if (slowTimer.current) window.clearTimeout(slowTimer.current);
      setResult({
        ...diagnosis,
        advisory: advisory.advisory,
        weather: advisory.weather,
        translatedAdvisory: deliver.translatedAdvisory,
        smsStatus: deliver.smsStatus,
      } satisfies ScanResultData);
      setPhase('result');
    } catch (err) {
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
      if (runId.current !== currentRun) return;
      console.error('Scan failed', err);
      setError(await friendlyMessage(err));
      setPhase('form');
    } finally {
      submitting.current = false;
    }
  };

  if (phase === 'analyzing') {
    return (
      <StagedLoader
        crop={crop}
        preview={preview || ''}
        currentStep={step}
        isSlow={isSlow}
        onTryAgain={handleTryAgain}
      />
    );
  }

  if (phase === 'result' && result) {
    return <ScanResult result={result} crop={crop} imageUrl={preview} onReset={startOver} />;
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Scan"
        title="Scan your crop"
        description="Choose the crop, add a clear photo of the affected leaf, and AgriN will read it for you."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <Card className="space-y-6">
            <section aria-labelledby="step-crop">
              <h2 id="step-crop" className="mb-3 flex items-baseline gap-2 font-bold text-ink">
                <span className="text-xs font-extrabold text-primary">01</span> Choose your crop
              </h2>
              <CropSelector value={crop} onChange={setCrop} />
            </section>

            <section aria-labelledby="step-photo">
              <h2 id="step-photo" className="mb-3 flex items-baseline gap-2 font-bold text-ink">
                <span className="text-xs font-extrabold text-primary">02</span> Photograph the leaf
              </h2>
              <UploadZone preview={preview} onChange={handleFileChange} onError={setError} />
            </section>

            <section aria-labelledby="step-details" className="space-y-4">
              <h2 id="step-details" className="flex items-baseline gap-2 font-bold text-ink">
                <span className="text-xs font-extrabold text-primary">03</span> Your details
                <span className="text-xs font-semibold text-muted">(optional)</span>
              </h2>
              <Field label="Location" htmlFor="scan-location" hint="e.g. Karnataka — helps tailor advice.">
                <input
                  id="scan-location"
                  type="text"
                  autoComplete="address-level1"
                  placeholder="e.g. Karnataka"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={controlClass}
                />
              </Field>
              <Field
                label="Phone number"
                htmlFor="scan-phone"
                hint="Only used so the SMS version of the advisory has somewhere to go."
              >
                <input
                  id="scan-phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="e.g. 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={controlClass}
                />
              </Field>
            </section>
          </Card>

          {error && (
            <div
              role="alert"
              className="rounded-control border border-danger/30 bg-danger-soft p-4 text-sm font-medium text-danger"
            >
              {error}
            </div>
          )}

          <div className="sticky bottom-24 z-30 -mx-4 border-t border-line bg-surface/95 px-4 pb-4 pt-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0">
            {preview && (
              <p className="mb-2 truncate text-xs font-semibold text-muted">
                Ready to scan {crop} · {file?.name}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={!file}>
              <ScanLine size={18} aria-hidden />
              Scan crop
            </Button>
          </div>
        </form>

        {/* Guidance sidebar */}
        <aside className="space-y-4">
          <Card className="bg-primary-soft/50">
            <h3 className="flex items-center gap-2 font-bold text-ink">
              <SunMedium size={17} className="text-primary" aria-hidden />
              Taking a good photo
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink/70">
              <li>Use natural daylight — avoid harsh shadows.</li>
              <li>Fill the frame with the affected leaf.</li>
              <li>Hold the phone steady and close enough to see detail.</li>
              <li>If possible, photograph the under-side too.</li>
            </ul>
          </Card>

          <Card>
            <h3 className="flex items-center gap-2 font-bold text-ink">
              <RefreshCw size={17} className="text-primary" aria-hidden />
              What happens next
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>Your photo is uploaded and analyzed server-side.</li>
              <li>You get a plain-language read on the likely condition.</li>
              <li>Immediate next steps in English and Kannada.</li>
            </ul>
          </Card>

          <Card>
            <h3 className="flex items-center gap-2 font-bold text-ink">
              <ImageIcon size={17} className="text-primary" aria-hidden />
              A few things to know
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>The AI model is never exposed to your browser — analysis runs server-side.</li>
              <li>Photos stay private to your account and are not shared.</li>
              <li>Results are advisory; confirm treatments with a local officer.</li>
            </ul>
          </Card>

          <div className="flex items-start gap-2 rounded-control border border-line bg-sunken/60 p-3 text-xs text-muted">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden />
            <p>Scan runs are rate-limited for everyone's safety.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}