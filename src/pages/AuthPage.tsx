import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field, controlClass } from '../components/ui/Field';
import { Brand } from '../components/layout/Brand';
import { useAuth } from '../hooks/useAuth';

export type AuthMode = 'signin' | 'signup' | 'forgot';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
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
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-2 flex w-10 items-center justify-center text-muted hover:text-ink"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  );
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const { user, pendingRecovery, signIn, signUp, signOut, requestPasswordReset, updatePassword } =
    useAuth();

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
      if (password.length < 8) errors.password = 'Use at least 8 characters.';
      if (confirm !== password) errors.confirm = 'Passwords do not match.';
    }
    if (!isRecovery && (mode === 'forgot' || mode === 'signin' || mode === 'signup')) {
      if (!trimmedEmail) errors.email = 'Enter your email address.';
      else if (!EMAIL_RE.test(trimmedEmail)) errors.email = 'That doesn\u2019t look like a valid email address.';
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
          setNotice('Your password has been updated. Sign in with your new password.');
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
        setNotice(
          'If an account exists for that email, a reset link is on its way. Check your inbox to set a new password.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    mode === 'signup' ? 'Create your account' : isRecovery ? 'Choose a new password' : mode === 'forgot' ? 'Reset your password' : 'Welcome back';

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="hidden items-center justify-center bg-primary p-10 lg:flex">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" aria-hidden className="h-9 w-9 rounded-[9px] bg-white/95 p-1" />
            <span className="text-2xl font-extrabold tracking-tight">AgriN</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-white/90">
              Beta
            </span>
          </div>
          <h2 className="mt-10 text-3xl font-bold leading-tight">
            Someone you can ask about your crop.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            Scan a leaf, get a clear diagnosis, and know exactly what to do next — in plain words,
            in Kannada too.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-white/85">
            {[
              ['Scan', 'Photograph an affected leaf and let the AI take a look.'],
              ['Understand', 'A plain-language read on the likely condition.'],
              ['Act', 'Step-by-step guidance you can act on today.'],
              ['Monitor', 'Your scan history, grouped by crop.'],
            ].map(([step, copy]) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-white/90">
                  {step}
                </span>
                <span className="leading-relaxed">{copy}</span>
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
              Beta
            </span>
          </div>

          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {isRecovery
              ? 'Pick a new password for your AgriN account.'
              : mode === 'signup'
                ? 'Signing up keeps your crop history private to your account.'
                : mode === 'forgot'
                  ? 'Enter your account email and we will send you a reset link.'
                  : 'Sign in to scan your crops and check their health.'}
          </p>

          {user && !isRecovery ? (
            <div className="mt-8 rounded-card border border-line bg-surface p-6">
              <p className="text-sm text-muted">You are signed in as</p>
              <p className="mt-1 truncate font-semibold text-ink">{user.email ?? 'an anonymous user'}</p>
              <Button variant="secondary" className="mt-5 w-full" onClick={() => void signOut()}>
                Sign out &amp; switch account
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              {mode === 'signup' ? (
                <Field label="Name (optional)" htmlFor="auth-name">
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
                <Field label="Email" htmlFor="auth-email" error={fieldErrors.email}>
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
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  error={fieldErrors.password}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              )}

              {(mode === 'signup' || isRecovery) && (
                <PasswordField
                  id="auth-confirm"
                  label="Confirm password"
                  value={confirm}
                  onChange={setConfirm}
                  error={fieldErrors.confirm}
                  autoComplete="new-password"
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
                    ? 'Creating account…'
                    : isRecovery
                      ? 'Updating password…'
                      : mode === 'forgot'
                        ? 'Sending reset link…'
                        : 'Signing in…'
                  : mode === 'signup'
                    ? 'Create account'
                    : isRecovery
                      ? 'Update password'
                      : mode === 'forgot'
                        ? 'Send reset link'
                        : 'Sign in'}
              </Button>
            </form>
          )}

          {!isRecovery ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted">
              {mode === 'signin' ? (
                <>
                  <span>New to AgriN?</span>
                  <Link to="/signup" className="font-semibold text-primary hover:text-primary-deep">
                    Create an account
                  </Link>
                  <span aria-hidden className="mx-1 text-line">
                    ·
                  </span>
                  <Link to="/forgot" className="font-semibold text-primary hover:text-primary-deep">
                    Forgot password?
                  </Link>
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>Already have an account?</span>
                  <Link to="/signin" className="font-semibold text-primary hover:text-primary-deep">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  <span>Remembered it?</span>
                  <Link to="/signin" className="font-semibold text-primary hover:text-primary-deep">
                    Back to sign in
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