import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../lib/languages';

export interface VoiceLike {
  lang: string;
}

/**
 * Pick a voice for a language: prefer an exact locale match (e.g. kn-IN),
 * then any voice with the same language code (e.g. en-US for en), else null.
 * Returns null when no matching voice is installed — the caller must NOT
 * fall back to a wrong-language voice silently.
 */
export function pickVoice<T extends VoiceLike>(voices: T[], language: Pick<Language, 'id' | 'ttsLocale'>): T | null {
  const locale = (language.ttsLocale ?? language.id).toLowerCase();
  const normalized = (lang: string) => lang.toLowerCase().replace('_', '-');
  const exact = voices.find((v) => normalized(v.lang) === locale);
  if (exact) return exact;
  const prefix = locale.split('-')[0];
  return voices.find((v) => normalized(v.lang).split('-')[0] === prefix) ?? null;
}

/**
 * Reusable Web Speech TTS hook. Never speaks in a language that has no
 * installed matching voice — it reports `missingVoice` and stays silent.
 */
export function useTTS() {
  const [supported] = useState(
    () => typeof window !== 'undefined' && window.speechSynthesis != null,
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() =>
    supported ? window.speechSynthesis.getVoices() : [],
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [missingVoice, setMissingVoice] = useState(false);
  const session = useRef(0);

  useEffect(() => {
    if (!supported) return;
    // Voices may load asynchronously; Chrome can briefly report an empty list.
    const sync = () => {
      const next = window.speechSynthesis.getVoices();
      setVoices((prev) => (next.length > 0 ? next : prev));
    };
    window.speechSynthesis.addEventListener('voiceschanged', sync);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', sync);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = useCallback(
    (text: string, language: Language) => {
      if (!supported) {
        setMissingVoice(true);
        return;
      }
      const voice = pickVoice(voices, language);
      if (!voice) {
        setMissingVoice(true);
        return;
      }
      const run = ++session.current;
      setMissingVoice(false);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.onstart = () => {
        if (run === session.current) setIsSpeaking(true);
      };
      utterance.onend = () => {
        if (run === session.current) setIsSpeaking(false);
      };
      utterance.onerror = () => {
        if (run === session.current) setIsSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    },
    [supported, voices],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    session.current++;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);

  return { isSupported: supported, voices, isSpeaking, missingVoice, speak, stop };
}