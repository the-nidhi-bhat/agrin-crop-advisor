import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface TranslateResult {
  language: string;
  translatedText: string;
}

// Map the Edge Function error shape to an honest, human-readable message. The
// translator never fabricates a translation — failures surface as an error.
async function friendlyMessage(err: unknown): Promise<string> {
  if (err instanceof FunctionsHttpError || err instanceof FunctionsRelayError) {
    const context = (await err.context.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    const code = context.error?.code;
    const message = context.error?.message;
    if (code === 'resource-exhausted') {
      return message || 'Translations are rate-limited. Please try again in a moment.';
    }
    if (code === 'unavailable') {
      return 'AgriN could not load the guidance right now. Please try again in a moment.';
    }
    if (message) return message;
    return 'AgriN could not load the guidance. Please try again.';
  }
  if (err instanceof FunctionsFetchError) {
    return 'Could not reach the AgriN service. Check your connection and try again.';
  }
  return 'AgriN could not load the guidance. Please try again.';
}

export async function translateAdvisory(diagnosisId: string, language: string): Promise<TranslateResult> {
  const { data, error } = await supabase.functions.invoke('translate', {
    body: { diagnosisId, language },
  });
  if (error) throw new Error(await friendlyMessage(error));
  return data as TranslateResult;
}