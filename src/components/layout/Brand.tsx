export function Brand({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src="/favicon.svg" alt="" aria-hidden className="h-7 w-7 rounded-[7px]" />
      <span className="text-lg font-extrabold tracking-tight text-ink">AgriN</span>
    </span>
  );
}