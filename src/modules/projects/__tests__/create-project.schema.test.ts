import { describe, expect, it } from 'vitest';

import { createProjectSchema, suggestProjectSlug } from '@/modules/projects/create-project.schema';

describe('SRY-005 create project schema', () => {
  it('trims and accepts the minimum setup fields with a flagship collection', () => {
    const result = createProjectSchema.safeParse({
      eventCity: ' Jakarta ',
      eventDatePrimary: '2027-08-17',
      personOneName: ' Raka ',
      personTwoName: ' Nadia ',
      slug: 'raka-nadia',
      templateKey: 'aruna',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      eventCity: 'Jakarta',
      eventDatePrimary: '2027-08-17',
      personOneName: 'Raka',
      personTwoName: 'Nadia',
      slug: 'raka-nadia',
      templateKey: 'aruna',
    });
  });

  it('rejects missing required values, invalid date input, and missing collection', () => {
    const result = createProjectSchema.safeParse({
      eventCity: '',
      eventDatePrimary: '2027-02-31',
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
    }
  });

  it('rejects reserved slugs, non-canonical slugs, and unknown collections', () => {
    const reserved = createProjectSchema.safeParse({
      eventCity: 'Jakarta',
      eventDatePrimary: '2027-08-17',
      personOneName: 'Raka',
      personTwoName: 'Nadia',
      slug: 'dashboard',
      templateKey: 'roselle',
    });
    const uppercase = createProjectSchema.safeParse({
      eventCity: 'Jakarta',
      eventDatePrimary: '2027-08-17',
      personOneName: 'Raka',
      personTwoName: 'Nadia',
      slug: 'Raka-Nadia',
      templateKey: 'laras',
    });
    const unknownCollection = createProjectSchema.safeParse({
      eventCity: 'Jakarta',
      eventDatePrimary: '2027-08-17',
      personOneName: 'Raka',
      personTwoName: 'Nadia',
      slug: 'raka-nadia',
      templateKey: 'unknown',
    });

    expect(reserved.success).toBe(false);
    expect(uppercase.success).toBe(false);
    expect(unknownCollection.success).toBe(false);

    if (!reserved.success) {
      expect(reserved.error.issues[0]?.message).toBe(
        'Link undangan ini digunakan oleh halaman sistem Seraya.',
      );
    }
  });

  it('suggests a lowercase kebab-case slug from both couple names', () => {
    expect(suggestProjectSlug('Raka', 'Nadia')).toBe('raka-nadia');
    expect(suggestProjectSlug('Áyu Putri', 'Bima  Pratama')).toBe('ayu-putri-bima-pratama');
  });
});
