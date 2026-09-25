import { describe, expect, it } from 'vitest';
import { getLanguageById, LANGUAGES } from './languages';

describe('LANGUAGES config', () => {
  it('declares all nine target languages with unique ids and native names', () => {
    const ids = LANGUAGES.map((l) => l.id);
    const natives = LANGUAGES.map((l) => l.nativeName);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(natives).size).toBe(natives.length);
    expect(ids).toEqual(['en', 'kn', 'hi', 'mr', 'te', 'ta', 'ml', 'bn', 'gu']);
    expect(natives).toEqual([
      'English',
      'ಕನ್ನಡ',
      'हिन्दी',
      'मराठी',
      'తెలుగు',
      'தமிழ்',
      'മലയാളം',
      'বাংলা',
      'ગુજરાતી',
    ]);
  });

  it('makes every language available with an Indian TTS locale', () => {
    expect(LANGUAGES.every((l) => l.ttsLocale)).toBe(true);
    const locales = LANGUAGES.map((l) => l.ttsLocale);
    expect(locales).toEqual([
      'en-IN',
      'kn-IN',
      'hi-IN',
      'mr-IN',
      'te-IN',
      'ta-IN',
      'ml-IN',
      'bn-IN',
      'gu-IN',
    ]);
  });

  it('falls back to English for unknown ids', () => {
    expect(getLanguageById('xx').id).toBe('en');
    expect(getLanguageById('').id).toBe('en');
  });
});