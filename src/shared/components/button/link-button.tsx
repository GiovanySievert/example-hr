import Link from 'next/link';

import { buttonClassName, type ButtonVariant } from './button';

type LinkButtonProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  className?: string;
};

export function LinkButton({ variant = 'primary', className = '', ...props }: LinkButtonProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}
