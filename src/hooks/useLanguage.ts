import { useCallback, useState } from "react"
import { getLanguageById, type Language } from "../lib/languages"

const STORAGE_KEY = "agrin_language"

function readStored(): Language {
  if (typeof window === "undefined") return getLanguageById("en")
  try {
    // getLanguageById falls back to English for unknown/stale ids.
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return getLanguageById(raw ?? "en")
  } catch {
    return getLanguageById("en")
  }
}

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(readStored)

  const setLanguage = useCallback((id: string) => {
    const next = getLanguageById(id)
    setLanguageState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next.id)
    } catch {
      // storage unavailable — selection still applies for this visit
    }
  }, [])

  return { language, setLanguage }
}