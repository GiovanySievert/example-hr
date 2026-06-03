type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

const variants = {
  primary: 'bg-foreground text-background hover:opacity-90',
  secondary:
    'border border-black/[.08] hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
