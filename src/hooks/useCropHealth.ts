import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface CropHealthScan {
  id: string;
  crop: string;
  status: 'pending' | 'success' | 'failed';
  disease: string | null;
  confidence: string | null;
  advisory_text: string | null;
  image_path: string;
  created_at: string;
}

export function useCropHealth() {
  const [scans, setScans] = useState<CropHealthScan[] | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('diagnoses')
      .select('id, crop, status, disease, confidence, advisory_text, image_path, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setScans(null);
          return;
        }
        setScans(data ?? []);
        setError(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (!scans?.length) {
      setThumbnails({});
      return;
    }
    let cancelled = false;
    const paths = scans
      .filter((s) => s.image_path)
      .map((s) => ({ id: s.id, path: s.image_path }));
    Promise.all(
      paths.map(({ path }) =>
        supabase.storage.from('uploads').createSignedUrl(path, 60 * 60),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      results.forEach(({ data, error: err }, i) => {
        const item = paths[i];
        if (!err && data?.signedUrl) map[item.id] = data.signedUrl;
      });
      setThumbnails(map);
    });
    return () => {
      cancelled = true;
    };
  }, [scans]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  return { scans, thumbnails, error, reload };
}