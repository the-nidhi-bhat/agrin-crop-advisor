export interface Language {
  id: string;
  /** Reference name in English. */
  name: string;
  /** The language's name in its own script. */
  nativeName: string;
  /** Speech synthesis locale used to voice guidance in this language. */
  ttsLocale: string;
}

/**
 * Single source of truth for which languages AgriN supports.
 *
 * Honest contract: every language here is available end-to-end today — the
 * backend translates advisory text into it on demand and the browser voices it
 * with Web Speech when a matching voice is installed on the device.
 */
export const LANGUAGES: Language[] = [
  { id: "en", name: "English", nativeName: "English", ttsLocale: "en-IN" },
  { id: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", ttsLocale: "kn-IN" },
  { id: "hi", name: "Hindi", nativeName: "हिन्दी", ttsLocale: "hi-IN" },
  { id: "mr", name: "Marathi", nativeName: "मराठी", ttsLocale: "mr-IN" },
  { id: "te", name: "Telugu", nativeName: "తెలుగు", ttsLocale: "te-IN" },
  { id: "ta", name: "Tamil", nativeName: "தமிழ்", ttsLocale: "ta-IN" },
  { id: "ml", name: "Malayalam", nativeName: "മലയാളം", ttsLocale: "ml-IN" },
  { id: "bn", name: "Bengali", nativeName: "বাংলা", ttsLocale: "bn-IN" },
  { id: "gu", name: "Gujarati", nativeName: "ગુજરાતી", ttsLocale: "gu-IN" },
]

export function getLanguageById(id: string): Language {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0]
}