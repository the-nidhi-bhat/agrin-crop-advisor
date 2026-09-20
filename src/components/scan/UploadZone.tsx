import { Camera, ImagePlus } from 'lucide-react';
import { useRef } from 'react';

interface UploadZoneProps {
  preview: string | null;
  onChange: (file: File) => void;
  error?: string | null;
}

export function UploadZone({ preview, onChange, error }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={preview ? 'Change photo' : 'Choose a crop photo'}
        className={`relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-card border-2 border-dashed bg-sunken/60 text-muted transition-colors duration-150 ${
          preview ? 'aspect-[4/3] border-line' : 'aspect-[4/3] hover:bg-sunken'
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Selected leaf preview" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-raise">
              <ImagePlus size={14} aria-hidden />
              Change photo
            </span>
          </>
        ) : (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Camera size={26} aria-hidden />
            </span>
            <span className="text-base font-bold text-ink">Take or choose a photo</span>
            <span className="max-w-[16rem] text-center text-sm leading-snug">
              A clear close-up of the leaf works best — good light, leaf filling the frame.
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
          const selected = e.target.files?.[0];
          if (selected) onChange(selected);
          e.currentTarget.value = '';
        }}
      />

      {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}