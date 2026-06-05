export const LOCATION_LABELS: Record<string, string> = {
  us: 'United States',
  de: 'Germany',
  br: 'Brazil',
};

export function locationLabel(locationId: string): string {
  return LOCATION_LABELS[locationId] ?? locationId.toUpperCase();
}
