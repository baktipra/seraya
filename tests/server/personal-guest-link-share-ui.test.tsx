import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PersonalGuestLinkResultActions } from '@/components/projects/personal-guest-link-result-actions';

const root = process.cwd();
const personalGuestUrl = 'https://sandbox.seraya.example/raka-nadia/g/opaque-token';

describe('SRY-017 personal guest-link WhatsApp share UI', () => {
  it('renders the WhatsApp action only in the one-time result component with safe external navigation', () => {
    const html = renderToStaticMarkup(
      <PersonalGuestLinkResultActions
        copyFeedback={null}
        guestDisplayName="Keluarga Rani"
        onClose={() => undefined}
        onCopy={() => undefined}
        personalUrl={personalGuestUrl}
      />,
    );

    expect(html).toContain('Bagikan lewat WhatsApp');
    expect(html).toContain('aria-label="Bagikan tautan pribadi lewat WhatsApp"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('https://wa.me/?text=');
    expect(html).toContain('Salin tautan');
    expect(html).toContain('Selesai');
  });

  it('keeps the share action out of normal guest rows and makes it contingent on the one-time revealed link state', async () => {
    const source = await readFile(
      path.join(root, 'src/components/projects/guest-manager.tsx'),
      'utf8',
    );

    const normalGuestListSource = source.slice(0, source.indexOf('title="Tautan pribadi siap"'));

    expect(normalGuestListSource).not.toContain('Bagikan lewat WhatsApp');
    expect(source).toContain('open={Boolean(revealedPersonalLink)}');
    expect(source).toContain('<PersonalGuestLinkResultActions');
    expect(source).toContain('personalUrl={revealedPersonalLink.personalUrl}');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
    expect(source).not.toContain('document.cookie');
  });

  it('keeps capability data out of normal guest-list DTOs, including revoked list states', async () => {
    const guestTypes = await readFile(path.join(root, 'src/modules/guests/guest.types.ts'), 'utf8');
    const guestManagerSource = await readFile(
      path.join(root, 'src/components/projects/guest-manager.tsx'),
      'utf8',
    );

    expect(guestTypes).toContain('link_state: GuestPersonalLinkState;');
    expect(guestTypes).not.toContain('personalUrl');
    expect(guestTypes).not.toContain('token_hash');
    expect(guestManagerSource).not.toContain('guest.personalUrl');
    expect(guestManagerSource).not.toContain('guest.token_hash');
  });
});
