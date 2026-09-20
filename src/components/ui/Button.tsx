import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'subtle' | 'ghost' | 'accent';
type Size = 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** When set, renders as a router Link styled like a button instead of a <button>. */
  to?: string;
}

const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold ' +
  'transition-[background-color,color,box-shadow,transform] duration-150 ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-deep',
  secondary: 'border border-line bg-surface text-ink hover:bg-sunken',
  subtle: 'bg-sunken text-ink hover:bg-sunken-deep',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
  accent: 'bg-accent text-ink hover:bg-accent-deep',
};

const sizes: Record<Size, string> = {
  md: 'min-h-12 px-5 text-sm',
  lg: 'min-h-14 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', to, type, ...rest }, ref) => {
    const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
    if (to) return <Link to={to} className={cls} {...(rest as unknown as Omit<LinkProps, 'to' | 'className'>)} />;
    return (
      <button ref={ref} type={type ?? 'button'} className={cls} {...rest} />
    );
  },
);

Button.displayName = 'Button';