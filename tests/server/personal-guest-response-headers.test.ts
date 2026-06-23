import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

describe('SRY-013 personal guest response protections', () => {
  it('configures no-store, no-referrer, and noindex headers for personal page and RSVP endpoint', async () => {
    const testDirectory = path.dirname(fileURLToPath(import.meta.url));
    const config = await readFile(path.resolve(testDirectory, '../../next.config.ts'), 'utf8');

    expect(config).toContain("source: '/:slug/g/:guestToken'");
    expect(config).toContain("source: '/:slug/g/:guestToken/rsvp'");
    expect(config).toContain("value: 'private, no-store, max-age=0'");
    expect(config).toContain("value: 'no-referrer'");
    expect(config).toContain("value: 'noindex, nofollow, noarchive'");
  });
});
