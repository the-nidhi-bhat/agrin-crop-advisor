import { Check } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { CROPS } from '../../lib/crops';

interface CropSelectorProps {
  value: string;
  onChange: (crop: string) => void;
}

export function CropSelector({ value, onChange }: CropSelectorProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveFocus = (from: number, diff: number) => {
    const next = (from + diff + CROPS.length) % CROPS.length;
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
        refs.current[CROPS.length - 1]?.focus();
        break;
    }
  };

  return (
    <div role="radiogroup" aria-label="Crop" className="grid grid-cols-3 gap-2">
      {CROPS.map((crop, index) => {
        const selected = value === crop.name;
        return (
          <button
            key={crop.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(crop.name)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`relative flex flex-col justify-center gap-0.5 rounded-control border px-3 py-3 text-left transition-colors duration-150 ${
              selected
                ? 'border-primary bg-primary text-white'
                : 'border-line bg-surface text-ink hover:bg-sunken'
            }`}
          >
            {selected && (
              <Check
                size={15}
                aria-hidden
                className="absolute right-2.5 top-2.5 text-accent"
              />
            )}
            <span className="text-sm font-bold">{crop.name}</span>
            <span
              className={`text-xs leading-snug ${
                selected ? 'text-primary-soft' : 'text-muted'
              }`}
            >
              {crop.tip}
            </span>
          </button>
        );
      })}
    </div>
  );
}