import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

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

async function ensureSignedIn(): Promise<void> {
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return;

  // Preferred path: anonymous, like the Firebase UX.
  const anon = await supabase.auth.signInAnonymously();
  if (!anon.error) return;

  // Fallback: auto-provisioned email/password account (no login screen).
  let creds = loadAutoCreds();
  if (creds) {
    const signIn = await supabase.auth.signInWithPassword(creds);
    if (!signIn.error) return;
  }
  const email = `agrin_${crypto.randomUUID()}${EMAIL_DOMAIN}`;
  const password = crypto.randomUUID();
  const signUp = await supabase.auth.signUp({ email, password });
  if (!signUp.error) {
    saveAutoCreds(email, password);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    ensureSignedIn().catch((error) => {
      console.error("Supabase auth failed", error);
      setLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);