import { describe, expect, it } from 'vitest';
import { humanizeAuthError } from './humanizeAuthError';

describe('humanizeAuthError', () => {
  it('maps known Supabase error codes to honest human phrases', () => {
    expect(humanizeAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      "Those details don't match an AgriN account. Check your email and password and try again.",
    );
    expect(humanizeAuthError({ code: 'user_already_exists', message: 'User already registered' })).toBe(
      'An account with that email already exists. Sign in instead.',
    );
    expect(humanizeAuthError({ code: 'weak_password', message: 'Password should be at least 6 characters' })).toBe(
      'That password is too weak. Use at least 8 characters.',
    );
    expect(humanizeAuthError({ code: 'over_request_rate_limit', message: 'Request rate limit reached' })).toBe(
      "You've tried too many times just now. Wait a moment and try again.",
    );
  });

  it('humanizes network-level failures', () => {
    expect(
      humanizeAuthError(new Error('fetch failed') as never),
    ).toBe("Couldn't reach AgriN's sign-in service. Check your connection and try again.");
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(humanizeAuthError({ message: 'mystery failure' })).toBe(
      'Something went wrong. Please try again.',
    );
    expect(humanizeAuthError(null)).toBe('Something went wrong. Please try again.');
  });
});