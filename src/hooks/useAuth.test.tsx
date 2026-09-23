import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './useAuth';

const mockAuth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockAuth.getSession,
      signInAnonymously: mockAuth.signInAnonymously,
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: mockAuth.onAuthStateChange,
    },
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('AuthProvider — honest auth failure', () => {
  it('shows a recoverable error screen when Supabase is unreachable', async () => {
    mockAuth.getSession.mockImplementation(() => {
      throw new Error('fetch failed');
    });
    mockAuth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

    render(
      <AuthProvider>
        <div>App content</div>
      </AuthProvider>,
    );

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
    mockAuth.signInAnonymously.mockResolvedValue({ data: { data: null }, error: null });
    mockAuth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

    render(
      <AuthProvider>
        <div>App content</div>
      </AuthProvider>,
    );

    await screen.findByRole('heading', { name: "Couldn't reach AgriN" });
    screen.getByRole('button', { name: 'Try again' }).click();

    expect(await screen.findByText('App content')).toBeInTheDocument();
  });
});