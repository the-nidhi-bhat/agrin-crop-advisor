import { LogOut, MessageSquareText, Moon, ShieldCheck, Speaker, Sparkles, Sun } from 'lucide-react';
import { LanguageSelector } from '../components/settings/LanguageSelector';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { useTheme, type ThemeSetting } from '../hooks/useTheme';
import { useT } from '../lib/strings';

const APP_VERSION = '0.6.0';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const t = useT();
  const isAnonymous = user?.is_anonymous ?? false;
  const displayName = user?.user_metadata?.full_name as string | undefined;
  const label = user?.email
    ? t('settings.badgeEmail')
    : isAnonymous
      ? t('settings.badgeAnon')
      : t('settings.badgeAccount');

  const themeOptions: { id: ThemeSetting; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: t('settings.themeLight'), icon: Sun },
    { id: 'dark', label: t('settings.themeDark'), icon: Moon },
    { id: 'system', label: t('settings.themeSystem'), icon: Sun },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        description={t('settings.description')}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-bold text-ink">{t('settings.account')}</h3>
          <Badge tone="soft">{label}</Badge>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">{t('settings.signInLabel')}</dt>
            <dd className="font-semibold text-ink">
              {isAnonymous || !user?.email ? t('settings.anonSignIn') : user.email}
            </dd>
          </div>
          {displayName ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-muted">{t('settings.name')}</dt>
              <dd className="font-semibold text-ink">{displayName}</dd>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">{t('settings.diagnosisRuns')}</dt>
            <dd className="font-semibold text-ink">{t('settings.rateLimited')}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">{t('settings.smsDelivery')}</dt>
            <dd className="font-semibold text-ink">{t('settings.currentlySimulated')}</dd>
          </div>
        </dl>
        <Button
          variant="secondary"
          className="mt-5"
          onClick={() => void signOut()}
          aria-label={t('settings.signOutAria')}
        >
          <LogOut size={16} aria-hidden />
          {t('settings.signOut')}
        </Button>
      </Card>

      <Card>
        <h3 className="font-bold text-ink">{t('settings.language')}</h3>
        <p className="mt-1 text-sm text-muted">{t('settings.languageCopy')}</p>
        <div className="mt-4">
          <LanguageSelector value={language.id} onChange={setLanguage} />
        </div>
        <p className="mt-3 text-xs text-muted">{t('settings.languageFooter')}</p>
      </Card>

      <Card>
        <h3 className="font-bold text-ink">{t('settings.theme')}</h3>
        <p className="mt-1 text-sm text-muted">{t('settings.themeCopy')}</p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t('settings.theme')}>
          {themeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={theme === option.id}
              onClick={() => setTheme(option.id)}
              className={`inline-flex min-h-12 items-center gap-2 rounded-control border px-4 text-sm font-semibold transition-colors duration-150 ${
                theme === option.id
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-line bg-surface text-ink hover:bg-sunken'
              }`}
            >
              <option.icon size={16} aria-hidden />
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">{t('settings.themeHint')}</p>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <MessageSquareText size={18} aria-hidden className="mt-0.5 shrink-0 text-primary" />
          <div>
            <h3 className="font-bold text-ink">{t('settings.notifications')}</h3>
            <p className="mt-1 text-sm text-muted">{t('settings.notificationsCopy')}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <Speaker size={18} aria-hidden className="mt-0.5 shrink-0 text-primary" />
          <div>
            <h3 className="font-bold text-ink">{t('settings.audio')}</h3>
            <p className="mt-1 text-sm text-muted">{t('settings.audioCopy')}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} aria-hidden className="mt-0.5 shrink-0 text-primary" />
          <div>
            <h3 className="font-bold text-ink">{t('settings.privacy')}</h3>
            <p className="mt-1 text-sm text-muted">{t('settings.privacyCopy')}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <Sparkles size={18} aria-hidden className="mt-0.5 shrink-0 text-primary" />
          <div>
            <h3 className="font-bold text-ink">{t('settings.about')}</h3>
            <p className="mt-1 text-sm text-muted">{t('settings.aboutCopy')}</p>
            <p className="mt-2 text-xs text-muted/80">
              {t('settings.aboutVersion', { version: APP_VERSION })}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}