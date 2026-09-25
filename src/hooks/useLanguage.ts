import { useCallback, useState } from "react"
import { getLanguageById, type Language } from "../lib/languages"

const STORAGE_KEY = "agrin_language"

function readStored(): Language {
  if (typeof window === "undefined") return getLanguageById("en")
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return getLanguageById("en")
    const found = getLanguageById(raw)
    // A stored coming-soon language can only exist from an earlier build or
    // hand-edited storage; refusing to sit on a guidance language that has no
    // real translation path is the honest behaviour.
    return found.status === "available" ? found : getLanguageById("en")
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