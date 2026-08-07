import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('personal-link immediate result', () => {
  it('keeps an owner-authorized result manual, useful, and status-neutral', async () => {
    const result = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/personal-guest-link-result-actions.tsx'),
      'utf8',
    );

    expect(result).toContain('Salin tautan');
    expect(result).toContain('Buka tautan');
    expect(result).toContain('Buka WhatsApp');
    expect(result).toContain('recipientWhatsAppPhoneE164');
    expect(result).toContain('https://wa.me/');
    expect(result).toContain(
      'Membuka atau membagikannya tidak membuat status kirim, dibaca, atau dibuka.',
    );
    expect(result).not.toContain('buildWhatsAppGuestInviteShareUrl');
    expect(result).not.toContain('fetch(');
    expect(result).not.toContain('sudah terkirim');
  });
});
