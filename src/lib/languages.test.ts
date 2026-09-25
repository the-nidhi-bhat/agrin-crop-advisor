import { describe, expect, it } from 'vitest';
import { GUIDANCE_LANGUAGES, getLanguageById, LANGUAGES } from './languages';

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

  it('marks only English and Kannada as available, rest coming-soon', () => {
    expect(LANGUAGES.filter((l) => l.status === 'available').map((l) => l.id)).toEqual(['en', 'kn']);
    expect(LANGUAGES.filter((l) => l.status === 'coming-soon').map((l) => l.id)).toEqual([
      'hi',
      'mr',
      'te',
      'ta',
      'ml',
      'bn',
      'gu',
    ]);
  });

  it('gives English and Kannada a TTS locale and nothing else', () => {
    const withTts = LANGUAGES.filter((l) => l.ttsLocale).map((l) => l.id);
    expect(withTts).toEqual(['en', 'kn']);
    expect(getLanguageById('kn').ttsLocale).toBe('kn-IN');
  });

  it('lists guidance languages as only the available ones', () => {
    expect(GUIDANCE_LANGUAGES.map((l) => l.id)).toEqual(['en', 'kn']);
  });

  it('falls back to English for unknown ids', () => {
    expect(getLanguageById('xx').id).toBe('en');
    expect(getLanguageById('').id).toBe('en');
  });
});