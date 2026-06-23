export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'assets',
  'auth',
  'contoh-undangan',
  'dashboard',
  'faq',
  'favicon.ico',
  'login',
  'media',
  'preview',
  'pricing',
  'privacy',
  'robots.txt',
  'sitemap.xml',
  'status',
  'support',
  'templates',
  'terms',
]);

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 60;

export type SlugValidationResult =
  | { valid: true; value: string }
  | { valid: false; value: string; reason: string };

export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
}

export function validateSlug(input: string): SlugValidationResult {
  const value = normalizeSlug(input);

  if (value.length < SLUG_MIN_LENGTH) {
    return {
      valid: false,
      value,
      reason: `Slug minimal terdiri dari ${SLUG_MIN_LENGTH} karakter.`,
    };
  }

  if (RESERVED_SLUGS.has(value)) {
    return {
      valid: false,
      value,
      reason: 'Slug ini digunakan oleh halaman sistem Seraya.',
    };
  }

  return { valid: true, value };
}
