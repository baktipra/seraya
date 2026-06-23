import { describe, expect, it } from 'vitest';

import { normalizeSlug, validateSlug } from '@/lib/slug';

describe('normalizeSlug', () => {
  it('normalizes a couple name into a URL-safe slug', () => {
    expect(normalizeSlug(' Raka & Nadia ')).toBe('raka-nadia');
  });

  it('removes unsupported characters and repeated separators', () => {
    expect(normalizeSlug('Fauzan___Nabila!!!')).toBe('fauzan-nabila');
  });
});

describe('validateSlug', () => {
  it.each(['dashboard', 'media'])('rejects reserved product route %s', (route) => {
    expect(validateSlug(route)).toEqual({
      valid: false,
      value: route,
      reason: 'Slug ini digunakan oleh halaman sistem Seraya.',
    });
  });

  it('accepts a valid invitation slug', () => {
    expect(validateSlug('raka-nadia')).toEqual({
      valid: true,
      value: 'raka-nadia',
    });
  });
});
