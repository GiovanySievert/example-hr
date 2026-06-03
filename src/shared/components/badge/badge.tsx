type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

export function Badge({ className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
      {...props}
    />
  );
}
