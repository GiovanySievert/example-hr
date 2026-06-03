type DivProps = React.HTMLAttributes<HTMLDivElement>;
type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>;
type ParagraphProps = React.HTMLAttributes<HTMLParagraphElement>;

export function Card({ className = '', ...props }: DivProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-background text-foreground ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = '', ...props }: DivProps) {
  return <div className={`flex flex-col gap-1 p-6 ${className}`} {...props} />;
}

export function CardTitle({ className = '', ...props }: HeadingProps) {
  return (
    <h3 className={`text-lg font-semibold leading-tight tracking-tight ${className}`} {...props} />
  );
}

export function CardDescription({ className = '', ...props }: ParagraphProps) {
  return <p className={`text-sm text-muted ${className}`} {...props} />;
}

export function CardContent({ className = '', ...props }: DivProps) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />;
}

export function CardFooter({ className = '', ...props }: DivProps) {
  return <div className={`flex items-center p-6 pt-0 ${className}`} {...props} />;
}
