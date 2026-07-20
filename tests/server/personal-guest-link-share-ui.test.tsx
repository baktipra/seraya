import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('personal-link immediate result', () => {
  it('is copy-only so initial WhatsApp sharing stays on the canonical row action', async () => {
    const result = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/personal-guest-link-result-actions.tsx'),
      'utf8',
    );

    expect(result).toContain('Salin tautan');
    expect(result).toContain('Selesai');
    expect(result).toContain('gunakan WhatsApp pada row tamu');
    expect(result).not.toContain('buildWhatsAppGuestInviteShareUrl');
    expect(result).not.toContain('Bagikan lewat WhatsApp');
  });
});
