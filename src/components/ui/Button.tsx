import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'lg' | 'md';
};

const base =
  'w-full rounded-[20px] font-extrabold tracking-wide transition-transform active:scale-[.97] disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-3 cursor-pointer';

const variants = {
  primary: 'bg-primary text-white shadow-[0_6px_18px_rgba(232,118,44,.35)] hover:bg-primary-dark border-0',
  secondary: 'bg-secondary text-white shadow-[0_6px_18px_rgba(27,108,168,.3)] hover:bg-secondary-dark border-0',
  outline: 'bg-white text-muted-2 border-2 border-field hover:border-muted font-bold',
};

const sizes = {
  lg: 'h-16 text-2xl', // ≥56px tap target, 24px key-action text
  md: 'h-14 text-xl',
};

export default function Button({ variant = 'primary', size = 'lg', className = '', ...rest }: Props) {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest} />;
}
