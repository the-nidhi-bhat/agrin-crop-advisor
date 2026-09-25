import { Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { useT } from '../../lib/strings';

export function EvidenceSection({
  number,
  simple = false,
  symptoms,
  crop,
}: {
  number?: string;
  simple?: boolean;
  symptoms?: string | null;
  crop: string;
}) {
  const t = useT();
  const points = symptoms
    ? symptoms
        .split(/(?<=[.!?।])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <Card className={simple ? 'border-line' : 'border-line bg-sunken/40'}>
      {simple ? (
        <h3 className="text-lg font-bold text-ink">{t('result.simpleNotice')}</h3>
      ) : (
        <>
          <h2 className="flex items-center gap-2 font-bold text-ink">
            {number && <span className="text-xs font-extrabold text-primary">{number}</span>}
            {t('result.whyTitle')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('result.whyCopy')}</p>
        </>
      )}
      {points.length === 1 && (
        <p className="mt-3 leading-relaxed text-ink/80">{points[0]}</p>
      )}
      {points.length > 1 && (
        <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-primary">
          {points.map((point, index) => (
            <li key={index} className="leading-relaxed text-ink/80">
              {point}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-sunken-deep px-2.5 py-1 font-medium text-ink/80">
          {t('result.whyContext')}: {crop}
        </span>
      </div>
      {!simple && (
        <div className="mt-4 flex items-start gap-2.5 text-sm text-muted">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          <p>{t('result.seekHelpCopy')}</p>
        </div>
      )}
    </Card>
  );
}