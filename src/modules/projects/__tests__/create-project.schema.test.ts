import { describe, expect, it } from 'vitest';

import { createProjectSchema, suggestProjectSlug } from '@/modules/projects/create-project.schema';

const baseInput = {
  eventCity: 'Jakarta',
  eventDatePrimary: '2027-08-17',
  paletteKey: 'rose',
  personOneName: 'Raka',
  personTwoName: 'Nadia',
  slug: 'raka-nadia',
  templateKey: 'roselle',
} as const;

describe('SRY-005 create project schema', () => {
  it('trims and accepts the setup fields with a theme palette', () => {
    const result = createProjectSchema.safeParse({
      ...baseInput,
      eventCity: ' Jakarta ',
      paletteKey: 'matcha',
      personOneName: ' Raka ',
      personTwoName: ' Nadia ',
      templateKey: 'aruna',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      ...baseInput,
      paletteKey: 'matcha',
      templateKey: 'aruna',
    });
  });

  it('rejects missing required values, invalid date input, and missing theme selection', () => {
    const result = createProjectSchema.safeParse({
      eventCity: '',
      eventDatePrimary: '2027-02-31',
      paletteKey: '',
      personOneName: '',
      personTwoName: '',
      slug: '',
      templateKey: '',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Gunakan nama panggilan untuk pasangan pertama.');
      expect(messages).toContain('Gunakan nama panggilan untuk pasangan kedua.');
      expect(messages).toContain('Pilih tanggal acara yang valid.');
      expect(messages).toContain('Kota acara perlu diisi dulu.');
      expect(messages).toContain('Tentukan link undangan terlebih dahulu.');
      expect(messages).toContain('Pilih salah satu pengalaman undangan.');
      expect(messages).toContain('Pilih salah satu warna undangan.');
    }
  });

  it('rejects reserved slugs, non-canonical slugs, and unknown themes', () => {
    const reserved = createProjectSchema.safeParse({ ...baseInput, slug: 'dashboard' });
    const uppercase = createProjectSchema.safeParse({ ...baseInput, slug: 'Raka-Nadia' });
    const unknownTheme = createProjectSchema.safeParse({ ...baseInput, templateKey: 'unknown' });

    expect(reserved.success).toBe(false);
    expect(uppercase.success).toBe(false);
    expect(unknownTheme.success).toBe(false);
  });

  it('rejects a palette that belongs to another theme', () => {
    expect(createProjectSchema.safeParse({ ...baseInput, paletteKey: 'midnight' }).success).toBe(
      false,
    );
  });

  it('suggests a lowercase kebab-case slug from both couple names', () => {
    expect(suggestProjectSlug('Raka', 'Nadia')).toBe('raka-nadia');
    expect(suggestProjectSlug('Áyu Putri', 'Bima  Pratama')).toBe('ayu-putri-bima-pratama');
  });
});
