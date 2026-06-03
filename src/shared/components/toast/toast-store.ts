import { atom } from 'jotai';

export type ToastVariant = 'default' | 'success' | 'error';

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
};

export const toastsAtom = atom<Toast[]>([]);
