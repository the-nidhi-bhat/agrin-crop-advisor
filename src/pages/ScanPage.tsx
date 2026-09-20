import { ImageIcon, ShieldCheck, SunMedium } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { StagedLoader } from '../components/StagedLoader';
import { CropSelector } from '../components/scan/CropSelector';
import { ScanResult } from '../components/scan/ScanResult';
import { UploadZone } from '../components/scan/UploadZone';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, controlClass } from '../components/ui/Field';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export function ScanPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState('Tomato');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (selectedFile: File) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError(null);
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return setError('User not authenticated.');
    if (!file) return setError('Please select or take a photo of the crop.');
    if (!phone) return setError('Please enter your phone number.');

    setLoadingStep(0);
    setError(null);

    try {
      // 1. Upload photo
      const fileId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `${user.id}/${fileId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(storagePath, file, { contentType: file.type || 'image/jpeg' });
      if (uploadError) throw uploadError;

      setLoadingStep(1); // Analyzing the leaf

      // 2. Diagnosis (Gemini vision, server-side)
      const { data: diagnosisData, error: diagnoseError } = await supabase.functions.invoke(
        'diagnose',
        { body: { imageUrl: storagePath, crop, location, phoneNumber: phone } },
      );
      if (diagnoseError) throw diagnoseError as Error;

      setLoadingStep(2); // Preparing local advice

      // 3. Advisory
      const { data: advisoryData, error: advisoryError } = await supabase.functions.invoke(
        'advisory',
        { body: { diagnosisId: (diagnosisData as any).id } },
      );
      if (advisoryError) throw advisoryError as Error;

      setLoadingStep(3); // Generating Kannada version

      // 4. Deliver (Kannada translation + SMS status)
      const { data: deliverData, error: deliverError } = await supabase.functions.invoke(
        'deliver',
        { body: { diagnosisId: (diagnosisData as any).id } },
      );
      if (deliverError) throw deliverError as Error;

      setResult({
        ...(diagnosisData as any),
        advisory: (advisoryData as any).advisory,
        weather: (advisoryData as any).weather,
        translatedAdvisory: (deliverData as any).translatedAdvisory,
        smsStatus: (deliverData as any).smsStatus,
      });
      setLoadingStep(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during diagnosis.');
      setLoadingStep(null);
    }
  };

  if (loadingStep !== null) {
    return <StagedLoader currentStep={loadingStep} />;
  }

  if (result) {
    return <ScanResult result={result} crop={crop} onReset={reset} />;
  }

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Scan"
        title="Scan your crop"
        description="Photograph a leaf and get a plain-language read on what is happening — along with immediate next steps."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_290px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="space-y-6">
            <section aria-labelledby="step-crop">
              <h2 id="step-crop" className="mb-1.5 flex items-baseline gap-2 font-bold text-ink">
                <span className="text-xs font-extrabold text-primary">01</span> Choose your crop
              </h2>
              <CropSelector value={crop} onChange={setCrop} />
            </section>

            <section aria-labelledby="step-photo">
              <h2 id="step-photo" className="mb-1.5 flex items-baseline gap-2 font-bold text-ink">
                <span className="text-xs font-extrabold text-primary">02</span> Photograph the leaf
              </h2>
              {preview && (
                <p className="mb-2 text-sm text-muted">
                  Looking good. Review the photo, then continue.
                </p>
              )}
              <UploadZone preview={preview} onChange={handleFileChange} error={!file ? undefined : null} />
            </section>

            <section aria-labelledby="step-details" className="space-y-4">
              <h2 id="step-details" className="flex items-baseline gap-2 font-bold text-ink">
                <span className="text-xs font-extrabold text-primary">03</span> Your details
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
                hint="Used for the SMS version of the advisory."
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
            <div role="alert" className="rounded-control border border-danger/30 bg-danger-soft p-4 text-sm font-medium text-danger">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full">
            Diagnose this crop
          </Button>
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
              <ImageIcon size={17} className="text-primary" aria-hidden />
              A few things to know
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>Analysis runs server-side — the AI model is never exposed to your browser.</li>
              <li>Photos stay private to your account and are not shared.</li>
              <li>Results are advisory; confirm treatments with a local officer.</li>
            </ul>
          </Card>

          <div className="flex items-start gap-2 rounded-control border border-line bg-sunken/60 p-3 text-xs text-muted">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden />
            <p>One scan per minute budgeted; diagnosis runs are rate-limited for everyone's safety.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}