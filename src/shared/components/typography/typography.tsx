import type { ElementType } from 'react';

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'lead' | 'small' | 'muted';

const variantClasses: Record<Variant, string> = {
  h1: 'text-4xl font-bold tracking-tight text-foreground',
  h2: 'text-3xl font-semibold tracking-tight text-foreground',
  h3: 'text-2xl font-semibold tracking-tight text-foreground',
  h4: 'text-xl font-semibold tracking-tight text-foreground',
  body: 'text-base leading-7 text-foreground',
  lead: 'text-lg leading-8 text-muted',
  small: 'text-sm font-medium leading-none text-foreground',
  muted: 'text-sm text-muted',
};

const defaultTag: Record<Variant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  lead: 'p',
  small: 'small',
  muted: 'p',
};

type TypographyProps = React.HTMLAttributes<HTMLElement> & {
  variant?: Variant;
  as?: ElementType;
};

export function Typography({ variant = 'body', as, className = '', ...props }: TypographyProps) {
  const Component = as ?? defaultTag[variant];

  return <Component className={`${variantClasses[variant]} ${className}`} {...props} />;
}
