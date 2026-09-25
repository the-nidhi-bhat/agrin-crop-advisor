import { BadgeCheck, Eye, HelpCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { useT } from '../../lib/strings';

export function ActionPlan({ advisory }: { advisory: string }) {
  const t = useT();
  return (
    <Card className="border-primary/20 bg-primary-soft/40">
      <div className="flex items-center gap-2">
        <BadgeCheck size={18} className="shrink-0 text-primary" aria-hidden />
        <h3 className="text-lg font-bold text-ink">{t('result.actionNow')}</h3>
      </div>
      <p className="mt-2 border-l-2 border-primary/40 pl-4 text-[15px] leading-relaxed text-ink/85">
        {advisory}
      </p>
      <div className="mt-4 flex items-start gap-2.5 text-sm leading-relaxed text-ink/75">
        <Eye size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <p>
          <span className="font-semibold text-ink">{t('result.actionWatch')}.</span> {t('result.monitoringCopy')}
        </p>
      </div>
      <div className="mt-3 flex items-start gap-2.5 text-sm leading-relaxed text-ink/75">
        <HelpCircle size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <p>
          <span className="font-semibold text-ink">{t('result.actionHelp')}.</span> {t('result.seekHelpCopy')}
        </p>
      </div>
    </Card>
  );
}