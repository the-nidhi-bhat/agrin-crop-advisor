import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LANGUAGES } from '../lib/languages';
import { pickVoice, useTTS } from './useTTS';

const EN = LANGUAGES[0];
const KN = LANGUAGES[1];

type Stub = {
  latest: {
    text: string;
    voice: { lang: string } | null;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
  } | null;
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  getVoices: ReturnType<typeof vi.fn>;
  onVoicesChanged: (() => void) | null;
};

function stub(): Stub {
  return globalThis.speechSynthesis as unknown as Stub;
}

describe('pickVoice', () => {
  it('prefers an exact locale match over a same-language prefix match', () => {
    const voice = pickVoice([{ lang: 'en-GB' }, { lang: 'en-IN' }], EN);
    expect(voice?.lang).toBe('en-IN');
  });

  it('falls back to a same-language prefix voice', () => {
    expect(pickVoice([{ lang: 'en-US' }], EN)?.lang).toBe('en-US');
  });

  it('normalizes case and underscores', () => {
    expect(pickVoice([{ lang: 'KN_IN' }], KN)?.lang).toBe('KN_IN');
  });

  it('returns null when no voice matches the language', () => {
    expect(pickVoice([{ lang: 'kn-IN' }], EN)).toBeNull();
  });

  it('returns null for an empty voice list', () => {
    expect(pickVoice([], KN)).toBeNull();
  });
});

describe('useTTS', () => {
  it('speaks when an exact voice is available', () => {
    stub().getVoices.mockReturnValue([{ lang: 'en-IN' }]);
    const { result } = renderHook(() => useTTS());
    act(() => result.current.speak('hello', EN));
    expect(stub().speak).toHaveBeenCalledTimes(1);
    expect(stub().latest?.text).toBe('hello');
    expect(stub().latest?.voice?.lang).toBe('en-IN');
    expect(result.current.isSpeaking).toBe(true);
  });

  it('stops speech and calls cancel', () => {
    stub().getVoices.mockReturnValue([{ lang: 'en-IN' }]);
    const { result } = renderHook(() => useTTS());
    act(() => result.current.speak('hello', EN));
    act(() => result.current.stop());
    expect(stub().cancel).toHaveBeenCalled();
    expect(result.current.isSpeaking).toBe(false);
  });

  it('resets isSpeaking on end', () => {
    stub().getVoices.mockReturnValue([{ lang: 'en-IN' }]);
    const { result } = renderHook(() => useTTS());
    act(() => result.current.speak('hello', EN));
    expect(result.current.isSpeaking).toBe(true);
    act(() => stub().latest?.onend?.());
    expect(result.current.isSpeaking).toBe(false);
  });

  it('resets isSpeaking on error', () => {
    stub().getVoices.mockReturnValue([{ lang: 'en-IN' }]);
    const { result } = renderHook(() => useTTS());
    act(() => result.current.speak('hello', EN));
    act(() => stub().latest?.onerror?.());
    expect(result.current.isSpeaking).toBe(false);
  });

  it('cancels the previous utterance when speaking again', () => {
    stub().getVoices.mockReturnValue([{ lang: 'en-IN' }]);
    const { result } = renderHook(() => useTTS());
    act(() => {
      result.current.speak('first', EN);
      result.current.speak('second', EN);
    });
    expect(stub().speak).toHaveBeenCalledTimes(2);
    expect(stub().latest?.text).toBe('second');
  });

  it('never speaks without a matching voice and reports missingVoice', () => {
    const { result } = renderHook(() => useTTS());
    act(() => result.current.speak('hello', KN));
    expect(stub().speak).not.toHaveBeenCalled();
    expect(result.current.missingVoice).toBe(true);
  });

  it('is silent and reports missingVoice when speech synthesis is unsupported', () => {
    const speak = stub().speak;
    vi.stubGlobal('speechSynthesis', undefined);
    try {
      const { result } = renderHook(() => useTTS());
      expect(result.current.isSupported).toBe(false);
      act(() => result.current.speak('hello', EN));
      expect(result.current.missingVoice).toBe(true);
      expect(speak).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('picks up voices announced later via the voiceschanged event', () => {
    const { result } = renderHook(() => useTTS());
    expect(result.current.voices).toEqual([]);
    stub().getVoices.mockReturnValue([{ lang: 'kn-IN' }]);
    act(() => stub().onVoicesChanged?.());
    expect(result.current.voices).toHaveLength(1);
    act(() => stub().onVoicesChanged?.());
    expect(result.current.voices).toHaveLength(1);
  });

  it('cancels speech on unmount', () => {
    stub().getVoices.mockReturnValue([{ lang: 'en-IN' }]);
    const { result, unmount } = renderHook(() => useTTS());
    act(() => result.current.speak('hello', EN));
    unmount();
    expect(stub().cancel).toHaveBeenCalled();
  });
});