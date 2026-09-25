import { useCallback, useEffect, useState } from 'react';

export const PRESENTATION_KEY = 'agrin_presentation';

export type PresentationSetting = 'detailed' | 'simple';

export function readStoredPresentation(): PresentationSetting {
  try {
    const raw = window.localStorage.getItem(PRESENTATION_KEY);
    return raw === 'simple' ? 'simple' : 'detailed';
  } catch {
    return 'detailed';
  }
}

export function usePresentation(): {
  presentation: PresentationSetting;
  setPresentation: (setting: PresentationSetting) => void;
} {
  const [presentation, setPresentationState] = useState<PresentationSetting>(() => readStoredPresentation());

  useEffect(() => {
    try {
      window.localStorage.setItem(PRESENTATION_KEY, presentation);
    } catch {
      // storage unavailable — in-memory preference still applies
    }
  }, [presentation]);

  const setPresentation = useCallback((setting: PresentationSetting) => setPresentationState(setting), []);

  return { presentation, setPresentation };
}