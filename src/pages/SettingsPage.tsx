import { LogOut, MessageSquareText, ShieldCheck, Speaker, Sparkles } from 'lucide-react';
import { LanguageSelector } from '../components/settings/LanguageSelector';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';

const APP_VERSION = '0.6.0';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const isAnonymous = user?.is_anonymous ?? false;
  const displayName = user?.user_metadata?.full_name as string | undefined;
  const label = user?.email ? 'Email account' : isAnonymous ? 'Anonymous session' : 'Account';

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Settings"
        title="Settings"
        description="Your AgriN account, language, and preferences."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-bold text-ink">Account</h3>
          <Badge tone="soft">{label}</Badge>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">Sign-in</dt>
            <dd className="font-semibold text-ink">
              {isAnonymous || !user?.email ? 'Anonymous — no sign-up needed' : user.email}
            </dd>
          </div>
          {displayName ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-muted">Name</dt>
              <dd className="font-semibold text-ink">{displayName}</dd>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">Diagnosis runs</dt>
            <dd className="font-semibold text-ink">Rate-limited to keep the service fair</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">SMS delivery</dt>
            <dd className="font-semibold text-ink">Currently simulated</dd>
          </div>
        </dl>
        <Button
          variant="secondary"
          className="mt-5"
          onClick={() => void signOut()}
          aria-label="Sign out of AgriN"
        >
          <LogOut size={16} aria-hidden />
          Sign out
        </Button>
      </Card>

      <Card>
        <h3 className="font-bold text-ink">Language</h3>
        <p className="mt-1 text-sm text-muted">
          AgriN guidance is written in English and translated to the language you choose. Your
          choice here becomes the default guidance language for new scans.
        </p>
        <div className="mt-4">
          <LanguageSelector value={language.id} onChange={setLanguage} />
        </div>
        <p className="mt-3 text-xs text-muted">
          All nine languages are available. Voice availability depends on the text-to-speech voices
          installed on your device.
        </p>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <MessageSquareText size={18} aria-hidden className="mt-0.5 shrink-0 text-primary" />
          <div>
            <h3 className="font-bold text-ink">Notifications</h3>
            <p className="mt-1 text-sm text-muted">
              SMS delivery is simulated for now — your result marks it as{' '}
              <span className="font-semibold text-ink">simulated</span> until a real SMS gateway is
              wired up.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <Speaker size={18} aria-hidden className="mt-0.5 shrink-0 text-primary" />
          <div>
            <h3 className="font-bold text-ink">Audio</h3>
            <p className="mt-1 text-sm text-muted">
              Guidance audio uses your device's built-in text-to-speech voice, in the language you
              choose on a result. If that language's voice isn't installed, AgriN says so instead of
              pretending to speak it.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} aria-hidden className="mt-0.5 shrink-0 text-primary" />
          <div>
            <h3 className="font-bold text-ink">Privacy</h3>
            <p className="mt-1 text-sm text-muted">
              Your photos and scan history are private to your account. A photo is sent to the
              server-side AI model only while a scan is running — never elsewhere.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <Sparkles size={18} aria-hidden className="mt-0.5 shrink-0 text-primary" />
          <div>
            <h3 className="font-bold text-ink">About</h3>
            <p className="mt-1 text-sm text-muted">
              AgriN disease guidance is generated by an AI model and is advisory only. Diagnoses are
              saved to your private crop history.
            </p>
            <p className="mt-2 text-xs text-muted/80">AgriN · version {APP_VERSION}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}