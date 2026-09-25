import { Camera, ImagePlus } from 'lucide-react';
import { useRef } from 'react';
import { useT } from '../../lib/strings';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface UploadZoneProps {
  preview: string | null;
  onChange: (file: File) => void;
  onError: (message: string) => void;
  label?: string;
}

function validateImage(file: File, t: ReturnType<typeof useT>): string | null {
  if (!file.type.startsWith('image/')) {
    return t('upload.notImage');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return t('upload.tooLarge');
  }
  return null;
}

export function UploadZone({ preview, onChange, onError, label }: UploadZoneProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const problem = validateImage(file, t);
    if (problem) {
      onError(problem);
      return;
    }
    onError('');
    onChange(file);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={preview ? t('upload.changePhoto') : t('upload.choosePhoto')}
        className={`relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-card border-2 border-dashed bg-sunken/60 text-muted transition-colors duration-150 ${
          preview ? 'aspect-[4/3] border-line' : 'aspect-[4/3] hover:bg-sunken'
        }`}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={t('upload.previewAlt')}
              className="themed-photo absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-raise">
              <ImagePlus size={14} aria-hidden />
              {t('upload.changePhoto')}
            </span>
          </>
        ) : (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Camera size={26} aria-hidden />
            </span>
            <span className="text-base font-bold text-ink">{t('upload.takeOrChoose')}</span>
            <span className="max-w-[16rem] text-center text-sm leading-snug">
              {label ?? t('upload.defaultLabel')}
            </span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}