import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field, controlClass } from '../components/ui/Field';
import { Brand } from '../components/layout/Brand';
import { useAuth } from '../hooks/useAuth';
import { useT, type StringKey } from '../lib/strings';

export type AuthMode = 'signin' | 'signup' | 'forgot';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
  showLabel,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={`${controlClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          className="absolute inset-y-0 right-2 flex w-10 items-center justify-center text-muted hover:text-ink"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  );
}

const leftSteps: { titleKey: StringKey; copyKey: StringKey }[] = [
  { titleKey: 'auth.leftScanTitle', copyKey: 'auth.leftScanCopy' },
  { titleKey: 'auth.leftUnderstandTitle', copyKey: 'auth.leftUnderstandCopy' },
  { titleKey: 'auth.leftActTitle', copyKey: 'auth.leftActCopy' },
  { titleKey: 'auth.leftMonitorTitle', copyKey: 'auth.leftMonitorCopy' },
];

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const { user, pendingRecovery, signIn, signUp, signOut, requestPasswordReset, updatePassword } =
    useAuth();
  const t = useT();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const isRecovery = mode === 'signin' && pendingRecovery;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    const trimmedEmail = email.trim();

    if (mode === 'signup' || isRecovery) {
      if (password.length < 8) errors.password = t('auth.errShortPassword');
      if (confirm !== password) errors.confirm = t('auth.errMismatch');
    }
    if (!isRecovery && (mode === 'forgot' || mode === 'signin' || mode === 'signup')) {
      if (!trimmedEmail) errors.email = t('auth.errEmailEmpty');
      else if (!EMAIL_RE.test(trimmedEmail)) errors.email = t('auth.errEmailInvalid');
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      if (isRecovery) {
        const result = await updatePassword(password);
        if (result.error) {
          setFormError(result.error);
        } else {
          setNotice(t('auth.passwordUpdated'));
          navigate('/');
        }
        return;
      }
      if (mode === 'signin') {
        const result = await signIn(trimmedEmail, password);
        if (result.error) {
          setFormError(result.error);
        } else {
          navigate('/');
        }
        return;
      }
      if (mode === 'signup') {
        const result = await signUp(trimmedEmail, password, name);
        if (result.error) {
          setFormError(result.error);
        } else {
          navigate('/');
        }
        return;
      }
      const result = await requestPasswordReset(trimmedEmail);
      if (result.error) {
        setFormError(result.error);
      } else {
        setNotice(t('auth.forgotSent'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    mode === 'signup'
      ? t('auth.createTitle')
      : isRecovery
        ? t('auth.recoveryTitle')
        : mode === 'forgot'
          ? t('auth.forgotTitle')
          : t('auth.welcomeTitle');

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="hidden items-center justify-center bg-primary p-10 lg:flex">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" aria-hidden className="h-9 w-9 rounded-[9px] bg-white/95 p-1" />
            <span className="text-2xl font-extrabold tracking-tight">AgriN</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-white/90">
            {t('common.beta')}
            </span>
          </div>
          <h2 className="mt-10 text-3xl font-bold leading-tight">{t('auth.leftTitle')}</h2>
          <p className="mt-4 text-base leading-relaxed text-white/80">{t('auth.leftCopy')}</p>
          <ul className="mt-10 space-y-4 text-sm text-white/85">
            {leftSteps.map((step) => (
              <li key={step.titleKey} className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-white/90">
                  {t(step.titleKey)}
                </span>
                <span className="leading-relaxed">{t(step.copyKey)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <Brand />
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-deep">
            {t('common.beta')}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {isRecovery
              ? t('auth.subtitleRecovery')
              : mode === 'signup'
                ? t('auth.subtitleSignup')
                : mode === 'forgot'
                  ? t('auth.subtitleForgot')
                  : t('auth.subtitleSignin')}
          </p>

          {user && !isRecovery ? (
            <div className="mt-8 rounded-card border border-line bg-surface p-6">
              <p className="text-sm text-muted">{t('auth.signedInAs')}</p>
              <p className="mt-1 truncate font-semibold text-ink">{user.email ?? t('auth.anonUser')}</p>
              <Button variant="secondary" className="mt-5 w-full" onClick={() => void signOut()}>
                {t('auth.switchAccount')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              {mode === 'signup' ? (
                <Field label={t('auth.nameOptional')} htmlFor="auth-name">
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    autoComplete="name"
                    onChange={(e) => setName(e.target.value)}
                    className={controlClass}
                  />
                </Field>
              ) : null}

              {!isRecovery && (mode === 'signin' || mode === 'signup' || mode === 'forgot') && (
                <Field label={t('auth.email')} htmlFor="auth-email" error={fieldErrors.email}>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    className={controlClass}
                  />
                </Field>
              )}

              {(mode === 'signin' || mode === 'signup' || isRecovery) && (
                <PasswordField
                  id="auth-password"
                  label={t('auth.password')}
                  value={password}
                  onChange={setPassword}
                  error={fieldErrors.password}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  showLabel={t('auth.showPassword')}
                  hideLabel={t('auth.hidePassword')}
                />
              )}

              {(mode === 'signup' || isRecovery) && (
                <PasswordField
                  id="auth-confirm"
                  label={t('auth.confirmPassword')}
                  value={confirm}
                  onChange={setConfirm}
                  error={fieldErrors.confirm}
                  autoComplete="new-password"
                  showLabel={t('auth.showPassword')}
                  hideLabel={t('auth.hidePassword')}
                />
              )}

              {formError ? (
                <p role="alert" className="rounded-control bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger">
                  {formError}
                </p>
              ) : null}
              {notice ? (
                <p role="status" className="rounded-control bg-primary-soft px-3 py-2.5 text-sm font-medium text-primary-deep">
                  {notice}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : null}
                {submitting
                  ? mode === 'signup'
                    ? t('auth.submittingSignup')
                    : isRecovery
                      ? t('auth.submittingRecovery')
                      : mode === 'forgot'
                        ? t('auth.submittingForgot')
                        : t('auth.submittingSignin')
                  : mode === 'signup'
                    ? t('auth.submitSignup')
                    : isRecovery
                      ? t('auth.submitRecovery')
                      : mode === 'forgot'
                        ? t('auth.submitForgot')
                        : t('auth.submitSignin')}
              </Button>
            </form>
          )}

          {!isRecovery ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted">
              {mode === 'signin' ? (
                <>
                  <span>{t('auth.newToAgrin')}</span>
                  <Link to="/signup" className="font-semibold text-primary hover:text-primary-deep">
                    {t('auth.createAccount')}
                  </Link>
                  <span aria-hidden className="mx-1 text-line">
                    ·
                  </span>
                  <Link to="/forgot" className="font-semibold text-primary hover:text-primary-deep">
                    {t('auth.forgotPassword')}
                  </Link>
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>{t('auth.haveAccount')}</span>
                  <Link to="/signin" className="font-semibold text-primary hover:text-primary-deep">
                    {t('auth.submitSignin')}
                  </Link>
                </>
              ) : (
                <>
                  <span>{t('auth.remembered')}</span>
                  <Link to="/signin" className="font-semibold text-primary hover:text-primary-deep">
                    {t('auth.backToSignIn')}
                  </Link>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}