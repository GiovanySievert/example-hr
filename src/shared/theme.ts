export const colors = {
  background: '#ffffff',
  foreground: '#171717',
  primary: '#171717',
  primaryForeground: '#ffffff',
  secondary: '#f4f4f5',
  secondaryForeground: '#171717',
  muted: '#71717a',
  border: '#e4e4e7',
  ring: '#171717',
} as const;

export const colorsDark = {
  background: '#0a0a0a',
  foreground: '#ededed',
  primary: '#ededed',
  primaryForeground: '#0a0a0a',
  secondary: '#1a1a1a',
  secondaryForeground: '#ededed',
  muted: '#a1a1aa',
  border: '#27272a',
  ring: '#ededed',
} as const;

export const radius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
} as const;

export const theme = {
  colors,
  colorsDark,
  radius,
} as const;

export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radius;
export type Theme = typeof theme;
