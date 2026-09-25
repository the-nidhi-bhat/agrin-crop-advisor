export type LanguageStatus = "available" | "coming-soon"

export interface Language {
  id: string
  /** Reference name in English. */
  name: string
  /** The language's name in its own script. */
  nativeName: string
  status: LanguageStatus
  /** Speech synthesis locale used to voice guidance in this language. */
  ttsLocale?: string
}

/**
 * Single source of truth for which languages AgriN supports.
 *
 * Honest contract: status === "available" means guidance content for that
 * language is produced end-to-end today (the backend translates via Gemini and
 * the browser can voice it with Web Speech). Anything behind Gemini-only
 * Kannada today stays "coming-soon" instead of pretending to work.
 */
export const LANGUAGES: Language[] = [
  { id: "en", name: "English", nativeName: "English", status: "available", ttsLocale: "en-IN" },
  { id: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", status: "available", ttsLocale: "kn-IN" },
  { id: "hi", name: "Hindi", nativeName: "हिन्दी", status: "coming-soon" },
  { id: "mr", name: "Marathi", nativeName: "मराठी", status: "coming-soon" },
  { id: "te", name: "Telugu", nativeName: "తెలుగు", status: "coming-soon" },
  { id: "ta", name: "Tamil", nativeName: "தமிழ்", status: "coming-soon" },
  { id: "ml", name: "Malayalam", nativeName: "മലയാളം", status: "coming-soon" },
  { id: "bn", name: "Bengali", nativeName: "বাংলা", status: "coming-soon" },
  { id: "gu", name: "Gujarati", nativeName: "ગુજરાતી", status: "coming-soon" },
]

/** Languages a scan's guidance can actually be shown in today. */
export const GUIDANCE_LANGUAGES: Language[] = LANGUAGES.filter((l) => l.status === "available")

export function getLanguageById(id: string): Language {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0]
}