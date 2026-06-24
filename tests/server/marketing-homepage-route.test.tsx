import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Home, { dynamic, metadata, revalidate } from '@/app/page';

const requiredSteps = [
  'Buat undangan',
  'Lengkapi isi undangan',
  'Aktifkan dan terbitkan saat siap',
  'Bagikan dan terima RSVP',
] as const;

describe('SRY-019 public landing page conversion layer', () => {
  it('renders a public static homepage with the required metadata', () => {
    expect(dynamic).toBe('force-static');
    expect(revalidate).toBe(3600);
    expect(metadata).toMatchObject({
      description:
        'Buat undangan pernikahan digital, kelola tamu, bagikan tautan pribadi, dan kumpulkan RSVP dalam satu tempat.',
      title: {
        absolute: 'Seraya — Undangan pernikahan digital yang terasa personal',
      },
    });
  });

  it('renders the factual hero, navigation, and conversion actions without authentication', () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('Undangan pernikahan digital yang terasa personal');
    expect(html).toContain('Buat undangan yang rapi,');
    expect(html).toContain('lalu bagikan dengan cara yang lebih personal.');
    expect(html).toContain(
      'Susun undangan, kelola tamu, dan kumpulkan konfirmasi kehadiran dalam satu tempat yang tenang dan mudah dipakai.',
    );
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/dashboard/new"');
    expect(html).toContain('href="#cara-kerja"');
    expect(html).toContain('Mulai buat undangan');
    expect(html).toContain('Lihat cara kerjanya');
    expect(html).toContain(
      'Ilustrasi alur kerja Seraya, bukan undangan atau data pasangan yang sedang tayang.',
    );
  });

  it('renders exactly the three supported capability explanations', () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('Susun undangan dengan tenang');
    expect(html).toContain('Lengkapi detail undangan dan lihat hasilnya di preview pribadi.');
    expect(html).toContain('Bagikan tautan pribadi');
    expect(html).toContain(
      'Buat tautan untuk tiap tamu dan siapkan pesan untuk dibagikan lewat WhatsApp.',
    );
    expect(html).toContain('Kumpulkan konfirmasi kehadiran');
    expect(html).toContain('Tamu dapat memilih hadir atau tidak hadir melalui tautan pribadinya.');
    expect((html.match(/<article/g) ?? []).length).toBe(3);
  });

  it('renders the four how-it-works steps in the required order', () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('id="cara-kerja"');

    const positions = requiredSteps.map((step) => html.indexOf(step));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it('keeps the trust layer and final CTA factual', () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('Draft tetap pribadi sebelum diterbitkan.');
    expect(html).toContain('Tautan pribadi dibuat untuk tiap tamu.');
    expect(html).toContain('Perubahan undangan publik dilakukan saat kalian menerbitkan ulang.');
    expect(html).toContain('Siap mulai menyusun undangan kalian?');
    expect(html).toContain(
      'Buat draft pribadi, lengkapi detailnya, lalu terbitkan saat undangan kalian siap dibagikan.',
    );
  });

  it('does not introduce unsupported free, automated, social-proof, or tracking claims', () => {
    const html = renderToStaticMarkup(<Home />).toLowerCase();

    for (const unsupportedClaim of [
      'gratis',
      'tanpa biaya',
      'otomatis',
      'automated',
      'pengingat',
      'ribuan pasangan',
      'dipercaya ribuan',
      'testimoni',
      'testimonial',
      'rating',
      'ulasan pelanggan',
      '100%',
    ]) {
      expect(html).not.toContain(unsupportedClaim);
    }
  });

  it('keeps the root route static and free of Supabase, auth, request, and private-data dependencies', async () => {
    const testDirectory = path.dirname(fileURLToPath(import.meta.url));
    const routeSource = await readFile(
      path.resolve(testDirectory, '../../src/app/page.tsx'),
      'utf8',
    );

    for (const forbiddenDependency of [
      '@supabase',
      '@/server/supabase',
      '@/modules/auth',
      'cookies(',
      'headers(',
      'getCurrentUser',
      'getOwnedProject',
      'getPublicInvitationBySlug',
      'getPublicGalleryImagesForCurrentSnapshot',
      'payment_',
      'guest_links',
      'published_invitation_snapshots',
      'use client',
    ]) {
      expect(routeSource).not.toContain(forbiddenDependency);
    }

    expect(routeSource).toContain("export const dynamic = 'force-static';");
    expect(routeSource).toContain('export const revalidate = 3600;');
  });
});
