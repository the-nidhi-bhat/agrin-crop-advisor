type AuthErrorLike = { code?: string; message: string } | Error | null | undefined;

const codesToHuman: Record<string, string> = {
  invalid_credentials:
    "Those details don't match an AgriN account. Check your email and password and try again.",
  user_already_exists: 'An account with that email already exists. Sign in instead.',
  user_not_found: "We couldn't find an account with that email.",
  weak_password: 'That password is too weak. Use at least 8 characters.',
  same_password: 'That password is the same as before. Choose a new one.',
  email_rate_limited: "You've tried too many times just now. Wait a moment and try again.",
  over_email_send_rate_limit: "You've requested too many emails recently. Wait a moment and try again.",
  over_request_rate_limit: "You've tried too many times just now. Wait a moment and try again.",
  email_not_confirmed: 'Your email address has not been confirmed yet.',
};

function messageFrame(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('fetch failed') || m.includes('failed to fetch') || m.includes('load failed')) {
    return "Couldn't reach AgriN's sign-in service. Check your connection and try again.";
  }
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return codesToHuman.invalid_credentials;
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return codesToHuman.user_already_exists;
  }
  if (m.includes('password should be at least') || m.includes('weak password')) {
    return codesToHuman.weak_password;
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return codesToHuman.email_rate_limited;
  }
  if (m.includes('email not confirmed')) {
    return codesToHuman.email_not_confirmed;
  }
  if (m.includes('user not found') || m.includes('no user found')) {
    return codesToHuman.user_not_found;
  }
  return 'Something went wrong. Please try again.';
}

/** Turns a raw Supabase auth error into a short, honest, human phrase for user-facing UI. */
export function humanizeAuthError(error: AuthErrorLike): string {
  if (!error) return 'Something went wrong. Please try again.';
  const code = (error as { code?: string }).code;
  if (code && codesToHuman[code]) return codesToHuman[code];
  return messageFrame(error.message ?? String(error));
}