import type { Toast as ToastData, ToastVariant } from './toast-store';

const variantClasses: Record<ToastVariant, string> = {
  default: 'border-border bg-background text-foreground',
  success: 'border-border bg-background text-foreground',
  error: 'border-border bg-background text-foreground',
};

const accentClasses: Record<ToastVariant, string> = {
  default: 'bg-muted',
  success: 'bg-primary',
  error: 'bg-primary',
};

type ToastProps = {
  toast: ToastData;
  onDismiss: (id: string) => void;
};

export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-80 items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg ${variantClasses[toast.variant]}`}
    >
      <span
        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${accentClasses[toast.variant]}`}
      />
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm font-medium leading-none">{toast.title}</p>
        {toast.description ? (
          <p className="text-sm text-muted">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
        className="text-muted transition-colors hover:text-foreground"
      >
        &times;
      </button>
    </div>
  );
}
