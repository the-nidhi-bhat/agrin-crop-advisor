import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLanguage } from './useLanguage';

describe('useLanguage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to English when nothing is stored', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language.id).toBe('en');
    expect(result.current.language.nativeName).toBe('English');
  });

  it('persists the selection to localStorage and returns the new language', () => {
    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLanguage('kn'));
    expect(result.current.language.id).toBe('kn');
    expect(window.localStorage.getItem('agrin_language')).toBe('kn');
  });

  it('reads a stored preference on initial mount', () => {
    window.localStorage.setItem('agrin_language', 'kn');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language.id).toBe('kn');
  });

  it('normalizes unknown or coming-soon stored values back to English', () => {
    const invalidSpy = vi.spyOn(Storage.prototype, 'getItem');
    invalidSpy.mockReturnValueOnce('hi');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language.id).toBe('en');
    invalidSpy.mockRestore();
  });
});