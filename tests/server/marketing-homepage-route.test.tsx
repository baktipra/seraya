import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Home, { dynamic, metadata, revalidate } from '@/app/page';

const requiredSteps = [
  'Pilih pengalaman',
  'Susun dengan tenang',
  'Terbitkan saat siap',
  'Bagikan secara personal',
] as const;

describe('Release A public flagship landing page', () => {
  it('renders a public static homepage with canonical metadata', () => {
    expect(dynamic).toBe('force-static');
    expect(revalidate).toBe(3600);
    expect(metadata).toMatchObject({
      description:
        'Susun undangan, bagikan tautan personal, dan kelola perjalanan tamu pernikahan Indonesia dalam satu pengalaman yang indah dan mudah digunakan.',
      title: {
        absolute: 'Seraya — Pengalaman tamu pernikahan yang personal',
      },
    });
  });

  it('renders the flagship hero, collection navigation, and conversion actions', () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('Undangan personal untuk pernikahan Indonesia');
    expect(html).toContain('Satu undangan yang indah.');
    expect(html).toContain('Personal untuk setiap tamu.');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/dashboard/new"');
    expect(html).toContain('href="/templates"');
    expect(html).toContain('Mulai buat undangan');
    expect(html).toContain('Lihat koleksi desain');
  });

  it('presents the three distinct supported collections', () => {
    const html = renderToStaticMarkup(<Home />);

    for (const collection of ['Roselle', 'Aruna', 'Laras']) {
      expect(html).toContain(collection);
    }
    expect(html).toContain('Romantic warmth');
    expect(html).toContain('Modern editorial');
    expect(html).toContain('Formal evening');
    expect(html).toContain('Bukan sekadar ganti warna.');
  });

  it('renders the four owner-journey steps in order', () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('id="cara-kerja"');

    const positions = requiredSteps.map((step) => html.indexOf(step));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it('keeps the privacy and final CTA language factual', () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('Draf pribadi');
    expect(html).toContain('Tautan personal');
    expect(html).toContain('Satu workspace');
    expect(html).toContain('Personal tanpa membuat data tamu menjadi konsumsi publik.');
    expect(html).toContain('Buat pengalaman yang akan diingat tamu kalian.');
  });

  it('does not introduce unsupported free, automated, social-proof, or tracking claims', () => {
    const html = renderToStaticMarkup(<Home />).toLowerCase();

    for (const unsupportedClaim of [
      'gratis',
      'tanpa biaya',
      'automated',
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

  it('keeps the root route static and free of private-data dependencies', async () => {
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
