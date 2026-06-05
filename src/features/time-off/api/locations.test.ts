import { describe, expect, it } from 'vitest';

import { LOCATION_LABELS, locationLabel } from './locations';

describe('locationLabel', () => {
  it('returns the human label for a known location', () => {
    expect(locationLabel('us')).toBe('United States');
    expect(locationLabel('de')).toBe('Germany');
    expect(locationLabel('br')).toBe('Brazil');
  });

  it('falls back to the upper-cased id for an unknown location', () => {
    expect(locationLabel('jp')).toBe('JP');
  });

  it('keeps every known id in the label map', () => {
    expect(Object.keys(LOCATION_LABELS)).toEqual(['us', 'de', 'br']);
  });
});
