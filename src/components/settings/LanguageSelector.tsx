import { Check } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { LANGUAGES, type Language } from '../../lib/languages';
import { Badge } from '../ui/Badge';

interface LanguageSelectorProps {
  value: string;
  onChange: (id: string) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectable: number[] = LANGUAGES.map((l, i) => (l.status === 'available' ? i : -1)).filter((i) => i >= 0);

  const moveFocus = (fromIndex: number, diff: number) => {
    const pos = selectable.indexOf(fromIndex);
    if (pos === -1) return;
    const next = (pos + diff + selectable.length) % selectable.length;
    refs.current[selectable[next]]?.focus();
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
        refs.current[selectable[0]]?.focus();
        break;
      case 'End':
        e.preventDefault();
        refs.current[selectable[selectable.length - 1]]?.focus();
        break;
    }
  };

  return (
    <div role="radiogroup" aria-label="Language" className="grid grid-cols-2 gap-2">
      {LANGUAGES.map((language: Language, index) => {
        const selected = value === language.id;
        const disabled = language.status === 'coming-soon';
        return (
          <button
            key={language.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={disabled}
            disabled={disabled}
            tabIndex={disabled ? -1 : selected ? 0 : -1}
            onClick={() => onChange(language.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`relative flex items-center gap-3 rounded-control border px-3 py-3 text-left transition-colors duration-150 ${
              disabled
                ? 'cursor-not-allowed border-line bg-sunken text-muted/70'
                : selected
                  ? 'border-primary bg-primary text-white'
                  : 'border-line bg-surface text-ink hover:bg-sunken'
            }`}
          >
            {selected && !disabled && (
              <Check size={16} aria-hidden className="absolute right-2.5 top-2.5 text-accent" />
            )}
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-xs ${
                selected ? 'bg-white/15 text-white' : 'bg-sunken-deep text-ink'
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
            <span className="ml-auto">
              {language.status === 'coming-soon' ? (
                <Badge tone="neutral">Coming soon</Badge>
              ) : (
                <Badge tone="soft">Available</Badge>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}