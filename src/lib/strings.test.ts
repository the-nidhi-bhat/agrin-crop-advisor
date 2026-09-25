import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useT } from './strings';

describe('useT', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('serves the stored language (Hindi) for a given key', () => {
    window.localStorage.setItem('agrin_language', 'hi');
    const { result } = renderHook(() => useT());
    expect(result.current('nav.home')).toBe('होम');
  });

  it('interpolates variables into the template', () => {
    const { result } = renderHook(() => useT());
    expect(result.current('result.eyebrow', { crop: 'Tomato' })).toBe('Tomato · Scan result');
  });

  it('falls back to English when nothing is stored', () => {
    const { result } = renderHook(() => useT());
    expect(result.current('nav.home')).toBe('Home');
  });

  it('falls back to English for an unknown stored id', () => {
    window.localStorage.setItem('agrin_language', 'xx');
    const { result } = renderHook(() => useT());
    expect(result.current('nav.home')).toBe('Home');
  });
});