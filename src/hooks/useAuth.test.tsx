import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './useAuth';

const mockAuth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockAuth.getSession,
      signInAnonymously: mockAuth.signInAnonymously,
      signInWithPassword: mockAuth.signInWithPassword,
      signUp: mockAuth.signUp,
      signOut: mockAuth.signOut,
      onAuthStateChange: mockAuth.onAuthStateChange,
    },
  },
}));

const SIGNED_OUT_KEY = 'agrin_signed_out';
const AUTO_CREDS_KEY = 'agrin_auto_creds';

const SESSION = { user: { id: 'user-1' } };

function Probe() {
  const { signedOut, signIn, signOut } = useAuth();
  return (
    <>
      <div>{signedOut ? 'SIGNED-OUT' : 'App content'}</div>
      <button type="button" onClick={() => void signIn('farmer@example.com', 'real-password')}>
        Sign in
      </button>
      <button type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </>
  );
}

function renderApp() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mockAuth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mockAuth.signInAnonymously.mockResolvedValue({ data: {}, error: null });
  mockAuth.signOut.mockResolvedValue({ error: null });
  mockAuth.getSession.mockResolvedValue({ data: { session: null } });
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('AuthProvider — anonymous session lifecycle', () => {
  it('reuses an existing session instead of minting a new identity', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: SESSION } });

    renderApp();

    expect(await screen.findByText('App content')).toBeInTheDocument();
    expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in anonymously when there is no session and the user has not signed out', async () => {
    renderApp();

    expect(await screen.findByText('App content')).toBeInTheDocument();
    expect(mockAuth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('never creates a generated email/password account', async () => {
    renderApp();

    expect(await screen.findByText('App content')).toBeInTheDocument();
    expect(mockAuth.signUp).not.toHaveBeenCalled();
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
    expect(localStorage.getItem(AUTO_CREDS_KEY)).toBeNull();
    for (const store of [localStorage, sessionStorage]) {
      expect(JSON.stringify({ ...store })).not.toContain('agrin.local');
    }
  });

  it('does not re-provision an identity while the signed-out flag is set', async () => {
    localStorage.setItem(SIGNED_OUT_KEY, '1');

    renderApp();

    expect(await screen.findByText('SIGNED-OUT')).toBeInTheDocument();
    expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
    expect(screen.queryByText('App content')).not.toBeInTheDocument();
  });

  it('honours a real session even when the signed-out flag is stale', async () => {
    localStorage.setItem(SIGNED_OUT_KEY, '1');
    mockAuth.getSession.mockResolvedValue({ data: { session: SESSION } });

    renderApp();

    expect(await screen.findByText('App content')).toBeInTheDocument();
    expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('shows the unavailable state when anonymous sign-in fails', async () => {
    mockAuth.signInAnonymously.mockResolvedValue({ data: {}, error: { message: 'anon disabled' } });

    renderApp();

    expect(
      await screen.findByRole('heading', { name: "Couldn't reach AgriN" }),
    ).toBeInTheDocument();
    expect(screen.queryByText('App content')).not.toBeInTheDocument();
  });
});

describe('AuthProvider — sign-out flag lives in localStorage', () => {
  it('stores the flag in localStorage so every tab on the origin sees it', async () => {
    renderApp();
    await screen.findByText('App content');

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('SIGNED-OUT')).toBeInTheDocument();
    expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SIGNED_OUT_KEY)).toBe('1');
    // The bug this guards: sessionStorage is per-tab, so a second tab would
    // ignore the sign-out and mint a fresh anonymous identity.
    expect(sessionStorage.getItem(SIGNED_OUT_KEY)).toBeNull();
  });

  it('clears the flag on manual sign-in so anonymous auth can resume', async () => {
    localStorage.setItem(SIGNED_OUT_KEY, '1');
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: SESSION.user }, error: null });

    renderApp();
    await screen.findByText('SIGNED-OUT');

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'farmer@example.com',
        password: 'real-password',
      }),
    );
    expect(localStorage.getItem(SIGNED_OUT_KEY)).toBeNull();
  });
});

describe('AuthProvider — honest auth failure', () => {
  it('shows a recoverable error screen when Supabase is unreachable', async () => {
    mockAuth.getSession.mockImplementation(() => {
      throw new Error('fetch failed');
    });

    renderApp();

    expect(
      await screen.findByRole('heading', { name: "Couldn't reach AgriN" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByText('App content')).not.toBeInTheDocument();
  });

  it('recovers via Try again once the service is reachable', async () => {
    mockAuth.getSession
      .mockImplementationOnce(() => {
        throw new Error('fetch failed');
      })
      .mockImplementationOnce(async () => ({ data: { session: null } }));

    renderApp();

    await screen.findByRole('heading', { name: "Couldn't reach AgriN" });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('App content')).toBeInTheDocument();
    expect(mockAuth.signInAnonymously).toHaveBeenCalledTimes(1);
  });
});
