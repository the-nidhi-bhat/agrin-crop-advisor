const CROPS = ['Tomato', 'Chili', 'Paddy'] as const;

interface CropSelectorProps {
  value: string;
  onChange: (crop: string) => void;
}

export function CropSelector({ value, onChange }: CropSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Crop" className="grid grid-cols-3 gap-2">
      {CROPS.map((crop) => {
        const selected = value === crop;
        return (
          <button
            key={crop}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(crop)}
            className={`min-h-12 rounded-control border px-3 text-sm font-semibold transition-colors duration-150 ${
              selected
                ? 'border-primary bg-primary text-white'
                : 'border-line bg-surface text-ink hover:bg-sunken'
            }`}
          >
            {crop}
          </button>
        );
      })}
    </div>
  );
}