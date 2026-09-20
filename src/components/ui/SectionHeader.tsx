interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeader({ eyebrow, title, description, className = '' }: SectionHeaderProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">{title}</h2>
      {description && <p className="max-w-xl text-base text-muted">{description}</p>}
    </div>
  );
}