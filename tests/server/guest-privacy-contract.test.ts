import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('SRY-012 / SRY-013 guest privacy source contract', () => {
  it('keeps guest data out of generic public invitation and snapshot contracts', async () => {
    const [publicRoute, snapshotSchema, publicService, personalRoute, personalService] =
      await Promise.all([
        readFile(path.join(root, 'src/app/[slug]/page.tsx'), 'utf8'),
        readFile(
          path.join(root, 'src/modules/publications/published-invitation.schema.ts'),
          'utf8',
        ),
        readFile(path.join(root, 'src/modules/publications/public-invitation.service.ts'), 'utf8'),
        readFile(path.join(root, 'src/app/[slug]/g/[guestToken]/page.tsx'), 'utf8'),
        readFile(path.join(root, 'src/modules/guest-links/personal-invitation.service.ts'), 'utf8'),
      ]);

    expect(publicRoute).not.toContain('guests');
    expect(publicRoute).not.toContain('guest_links');
    expect(snapshotSchema).not.toContain('guests');
    expect(snapshotSchema).not.toContain('guest_links');
    expect(publicService).not.toContain('guests');
    expect(publicService).not.toContain('guest_links');
    expect(publicRoute).not.toContain('whatsapp_phone_e164');
    expect(snapshotSchema).not.toContain('whatsapp_phone_e164');
    expect(publicService).not.toContain('whatsapp_phone_e164');
    expect(personalRoute).not.toContain('whatsapp_phone_e164');
    expect(personalService).not.toContain('whatsapp_phone_e164');
  });

  it('keeps private guest-list DTOs free of personal capability data', async () => {
    const guestTypes = await readFile(path.join(root, 'src/modules/guests/guest.types.ts'), 'utf8');

    expect(guestTypes).toContain('rsvp_status');
    expect(guestTypes).toContain('link_state');
    expect(guestTypes).not.toContain('token_hash');
    expect(guestTypes).not.toContain('personalUrl');
    expect(guestTypes).not.toContain('guestToken');
  });
});
