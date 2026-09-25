import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { WifiOff } from "lucide-react";
import { Button } from "../components/ui/Button";
import { humanizeAuthError } from "../lib/humanizeAuthError";
import { supabase } from "../lib/supabase";
import { useT } from "../lib/strings";

export interface AuthResult {
  error: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  pendingRecovery: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signedOut: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  pendingRecovery: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  requestPasswordReset: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  signedOut: false,
});

// Fallback account for local stacks where anonymous sign-ins are disabled.
// Persisted so a fresh page load resolves to the same session.
const AUTO_CREDS_KEY = "agrin_auto_creds";
const EMAIL_DOMAIN = "@agrin.local";

// Set after an explicit sign-out. Auto-provisioning is skipped while it is set
// so the sign-in / sign-up screens are actually shown.
const SIGNED_OUT_KEY = "agrin_signed_out";

function loadAutoCreds(): { email: string; password: string } | null {
  try {
    const raw = localStorage.getItem(AUTO_CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.email && parsed?.password) return parsed;
  } catch {
    // ignore corrupt stored creds
  }
  return null;
}

function saveAutoCreds(email: string, password: string) {
  localStorage.setItem(AUTO_CREDS_KEY, JSON.stringify({ email, password }));
}

function isSignedOutFlag() {
  try {
    return sessionStorage.getItem(SIGNED_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function clearSignedOutFlag() {
  try {
    sessionStorage.removeItem(SIGNED_OUT_KEY);
  } catch {
    // ignore
  }
}

type SignInStatus = "signed-in" | "signed-out" | "unavailable";

// Returns the auth state after bootstrapping a session. Throws only on
// network-level failure so the provider can show an honest recoverable state.
async function ensureSignedIn(): Promise<SignInStatus> {
  if (isSignedOutFlag()) return "signed-out";

  const existing = await supabase.auth.getSession();
  if (existing.data.session) return "signed-in";

  // Preferred path: anonymous, like the Firebase UX.
  const anon = await supabase.auth.signInAnonymously();
  if (!anon.error) return "signed-in";

  // Fallback: auto-provisioned email/password account (no login screen).
  let creds = loadAutoCreds();
  if (creds) {
    const signIn = await supabase.auth.signInWithPassword(creds);
    if (!signIn.error) return "signed-in";
  }
  const email = `agrin_${crypto.randomUUID()}${EMAIL_DOMAIN}`;
  const password = crypto.randomUUID();
  const signUp = await supabase.auth.signUp({ email, password });
  if (!signUp.error) {
    saveAutoCreds(email, password);
    return "signed-in";
  }
  return "unavailable";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setPendingRecovery(event === "PASSWORD_RECOVERY" && Boolean(session));
      if (session) {
        setSignedOut(false);
        setUnavailable(false);
      }
      setLoading(false);
    });

    ensureSignedIn()
      .then((status) => {
        if (cancelled) return;
        setSignedOut(status === "signed-out");
        setUnavailable(status === "unavailable");
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Supabase auth failed", error);
        setUnavailable(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [attempt]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: humanizeAuthError(error) };
      clearSignedOutFlag();
      return { error: null };
    } catch (error) {
      return { error: humanizeAuthError(error as Error) };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name?: string): Promise<AuthResult> => {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: name?.trim() ? { data: { full_name: name.trim() } } : undefined,
        });
        if (error) return { error: humanizeAuthError(error) };
        clearSignedOutFlag();
        return { error: null };
      } catch (error) {
        return { error: humanizeAuthError(error as Error) };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      sessionStorage.setItem(SIGNED_OUT_KEY, "1");
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
    setUser(null);
    setPendingRecovery(false);
    setSignedOut(true);
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/signin?mode=recovery`,
      });
      if (error) return { error: humanizeAuthError(error) };
      return { error: null };
    } catch (error) {
      return { error: humanizeAuthError(error as Error) };
    }
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: humanizeAuthError(error) };
      setPendingRecovery(false);
      return { error: null };
    } catch (error) {
      return { error: humanizeAuthError(error as Error) };
    }
  }, []);

  if (loading) {
    return null;
  }

  if (unavailable && !user) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="mx-auto w-full max-w-sm rounded-card border border-line bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger" aria-hidden>
            <WifiOff size={22} />
          </div>
          <h1 className="mt-4 text-lg font-bold text-ink">{t('authUnavailable.title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t('authUnavailable.copy')}</p>
          <Button
            className="mt-6 w-full"
            onClick={() => {
              setUser(null);
              setUnavailable(false);
              setSignedOut(false);
              setLoading(true);
              setAttempt((n) => n + 1);
            }}
          >
            {t('common.tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        pendingRecovery,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        updatePassword,
        signedOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export type { Session };