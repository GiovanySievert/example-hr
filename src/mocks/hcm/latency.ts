import { delay } from 'msw';

let enabled = true;

export function setLatencyEnabled(value: boolean): void {
  enabled = value;
}

export async function cellLatency(): Promise<void> {
  if (!enabled) return;
  await delay('real');
}

export async function corpusLatency(): Promise<void> {
  if (!enabled) return;
  await delay(800);
}
