import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthPage } from './AuthPage';

const mockAuth = vi.hoisted(() => ({
  user: null,
  loading: false,
  pendingRecovery: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => mockAuth }));

function renderAuth(mode: 'signin' | 'signup' | 'forgot') {
  return render(
    <MemoryRouter initialEntries={[`/${mode}`]}>
      <Routes>
        <Route path="/" element={<div>Home content</div>} />
        <Route path="/signin" element={<AuthPage mode="signin" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/forgot" element={<AuthPage mode="forgot" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.user = null;
  mockAuth.pendingRecovery = false;
  mockAuth.signIn.mockResolvedValue({ error: null });
  mockAuth.signUp.mockResolvedValue({ error: null });
  mockAuth.requestPasswordReset.mockResolvedValue({ error: null });
  mockAuth.updatePassword.mockResolvedValue({ error: null });
});

describe('AuthPage — sign in', () => {
  it('submits trimmed email and password and navigates home on success', async () => {
    renderAuth('signin');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  farmer@example.com ' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Home content')).toBeInTheDocument();
    expect(mockAuth.signIn).toHaveBeenCalledWith('farmer@example.com', 'secret123');
  });

  it('shows a humanized invalid-credentials error', async () => {
    mockAuth.signIn.mockResolvedValue({
      error: "Those details don't match an AgriN account. Check your email and password and try again.",
    });
    renderAuth('signin');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'farmer@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent("Those details don't match an AgriN account.");
  });

  it('toggles password visibility', () => {
    renderAuth('signin');
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input.type).toBe('password');
  });

  it('links to sign up and forgot password', () => {
    renderAuth('signin');
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot');
  });
});

describe('AuthPage — sign up', () => {
  it('requires a valid email and matching password of at least 8 characters', async () => {
    renderAuth('signup');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('That doesn\u2019t look like a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });

  it('signs up with name, email and password on valid input', async () => {
    renderAuth('signup');
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'Ravi' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ravi@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Home content')).toBeInTheDocument();
    expect(mockAuth.signUp).toHaveBeenCalledWith('ravi@example.com', 'secret123', 'Ravi');
  });

  it('shows an existing-account error', async () => {
    mockAuth.signUp.mockResolvedValue({
      error: 'An account with that email already exists. Sign in instead.',
    });
    renderAuth('signup');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taken@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('An account with that email already exists.');
  });
});

describe('AuthPage — forgot password', () => {
  it('sends a reset link and shows an honest confirmation that does not reveal account existence', async () => {
    renderAuth('forgot');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'farmer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(mockAuth.requestPasswordReset).toHaveBeenCalledWith('farmer@example.com');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'If an account exists for that email, a reset link is on its way.',
    );
  });
});

describe('AuthPage — password recovery', () => {
  it('shows the reset-password form and updates the password', async () => {
    mockAuth.pendingRecovery = true;
    renderAuth('signin');
    expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'newsecret123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'newsecret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Home content')).toBeInTheDocument();
    expect(mockAuth.updatePassword).toHaveBeenCalledWith('newsecret123');
  });
});

describe('AuthPage — signed-in visitor', () => {
  it('shows the current account and a sign-out action instead of the form', () => {
    mockAuth.user = { email: 'farmer@example.com' } as never;
    renderAuth('signin');
    expect(screen.getByText('You are signed in as')).toBeInTheDocument();
    expect(screen.getByText('farmer@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out & switch account' }));
    expect(mockAuth.signOut).toHaveBeenCalled();
  });
});