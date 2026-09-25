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

  it('reads any stored available language on initial mount', () => {
    window.localStorage.setItem('agrin_language', 'hi');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language.id).toBe('hi');
  });

  it('normalizes unknown stored values back to English', () => {
    const invalidSpy = vi.spyOn(Storage.prototype, 'getItem');
    invalidSpy.mockReturnValueOnce('xx');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language.id).toBe('en');
    invalidSpy.mockRestore();
  });
});