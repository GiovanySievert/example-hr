'use client';

import { useCallback } from 'react';

import { useAtom } from 'jotai';

import { toastsAtom, type Toast, type ToastVariant } from './toast-store';

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

function createId() {
  return Math.random().toString(36).slice(2);
}

export function useToast() {
  const [toasts, setToasts] = useAtom(toastsAtom);

  const dismiss = useCallback(
    (id: string) => {
      setToasts((current) => current.filter((item) => item.id !== id));
    },
    [setToasts],
  );

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 4000 }: ToastInput) => {
      const id = createId();
      const next: Toast = { id, title, description, variant, duration };

      setToasts((current) => [...current, next]);

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [setToasts, dismiss],
  );

  return { toasts, toast, dismiss };
}
