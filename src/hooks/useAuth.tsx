import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { WifiOff } from "lucide-react";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

const AUTH_UNAVAILABLE =
  "AgriN could not connect to its service. Check your connection and try again.";

// Fallback account for local stacks where anonymous sign-ins are disabled.
// Persisted so a fresh page load resolves to the same session.
const AUTO_CREDS_KEY = "agrin_auto_creds";
const EMAIL_DOMAIN = "@agrin.local";

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

// Returns true when a session is present. Throws only on network-level failure
// (unreachable Supabase) so the provider can show an honest recoverable state.
async function ensureSignedIn(): Promise<boolean> {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return true;

  // Preferred path: anonymous, like the Firebase UX.
  const anon = await supabase.auth.signInAnonymously();
  if (!anon.error) return true;

  // Fallback: auto-provisioned email/password account (no login screen).
  let creds = loadAutoCreds();
  if (creds) {
    const signIn = await supabase.auth.signInWithPassword(creds);
    if (!signIn.error) return true;
  }
  const email = `agrin_${crypto.randomUUID()}${EMAIL_DOMAIN}`;
  const password = crypto.randomUUID();
  const signUp = await supabase.auth.signUp({ email, password });
  if (!signUp.error) {
    saveAutoCreds(email, password);
    return true;
  }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    ensureSignedIn()
      .then((signedIn) => {
        if (cancelled) return;
        setUnavailable(!signedIn);
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

  if (loading) {
    return null;
  }

  if (unavailable && !user) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="mx-auto w-full max-w-sm rounded-card border border-line bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger" aria-hidden>
            <WifiOff size={22} />
          </div>
          <h1 className="mt-4 text-lg font-bold text-ink">Couldn't reach AgriN</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{AUTH_UNAVAILABLE}</p>
          <Button
            className="mt-6 w-full"
            onClick={() => {
              setUser(null);
              setUnavailable(false);
              setLoading(true);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);