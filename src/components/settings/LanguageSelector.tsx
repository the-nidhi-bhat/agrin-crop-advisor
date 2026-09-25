import { Check } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { LANGUAGES, type Language } from '../../lib/languages';

interface LanguageSelectorProps {
  value: string;
  onChange: (id: string) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveFocus = (fromIndex: number, diff: number) => {
    const next = (fromIndex + diff + LANGUAGES.length) % LANGUAGES.length;
    refs.current[next]?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(index, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(index, -1);
        break;
      case 'Home':
        e.preventDefault();
        refs.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        refs.current[LANGUAGES.length - 1]?.focus();
        break;
    }
  };

  return (
    <div role="radiogroup" aria-label="Language" className="grid grid-cols-2 gap-2">
      {LANGUAGES.map((language: Language, index) => {
        const selected = value === language.id;
        return (
          <button
            key={language.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(language.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`relative flex items-center gap-3 rounded-control border px-3 py-3 text-left transition-colors duration-150 ${
              selected
                ? 'border-primary bg-primary text-on-primary'
                : 'border-line bg-surface text-ink hover:bg-sunken'
            }`}
          >
            {selected && (
              <Check size={16} aria-hidden className="absolute right-2.5 top-2.5 text-accent" />
            )}
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-xs ${
                selected ? 'bg-on-primary/15 text-on-primary' : 'bg-sunken-deep text-ink'
              }`}
            >
              {language.nativeName.slice(0, 2)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{language.nativeName}</span>
              <span className={`block truncate text-xs ${selected ? 'text-primary-soft' : 'text-muted'}`}>
                {language.name}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}