import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildWhatsAppGuestInviteShareUrl } from '../whatsapp-share';

const root = process.cwd();

describe('SRY-017 manual WhatsApp personal-link handoff', () => {
  it('builds the official WhatsApp compose URL and encodes the complete Indonesian message', () => {
    const personalGuestUrl = 'https://sandbox.seraya.example/raka-nadia/g/opaque-token';

    const shareUrl = buildWhatsAppGuestInviteShareUrl({
      guestDisplayName: '  Siti "Ayu" & Budi\n🎉  ',
      personalGuestUrl,
    });

    const parsed = new URL(shareUrl);

    expect(`${parsed.origin}${parsed.pathname}`).toBe('https://wa.me/');
    expect(parsed.searchParams.get('text')).toBe(
      [
        'Halo Siti "Ayu" & Budi 🎉,',
        '',
        'Kami mengundang Anda untuk hadir di acara pernikahan kami.',
        '',
        personalGuestUrl,
      ].join('\n'),
    );
  });

  it('keeps the exact one-time personal URL intact and includes no operational metadata', () => {
    const personalGuestUrl =
      'https://seraya-delta.vercel.app/raka-nadia/g/A_very-opaque-url-safe-token-123';
    const message = new URL(
      buildWhatsAppGuestInviteShareUrl({
        guestDisplayName: 'Keluarga & Sahabat',
        personalGuestUrl,
      }),
    ).searchParams.get('text');

    expect(message).toContain(personalGuestUrl);
    expect(message).not.toContain('projectId');
    expect(message).not.toContain('guestId');
    expect(message).not.toContain('token_hash');
    expect(message).not.toContain('payment');
    expect(message).not.toContain('RSVP');
  });

  it.each([
    'http://sandbox.seraya.example/raka-nadia/g/token',
    'javascript:alert(1)',
    'https://user:password@sandbox.seraya.example/raka-nadia/g/token',
    'not a url',
  ])('rejects a malformed or non-HTTPS personal URL: %s', (personalGuestUrl) => {
    expect(() =>
      buildWhatsAppGuestInviteShareUrl({
        guestDisplayName: 'Rani',
        personalGuestUrl,
      }),
    ).toThrow('Personal guest invitation URL must be a valid HTTPS URL.');
  });

  it('does not read a host header or environment origin while generating a share handoff', async () => {
    const source = await readFile(
      path.join(root, 'src/modules/guest-links/whatsapp-share.ts'),
      'utf8',
    );

    expect(source).not.toContain('process.env');
    expect(source).not.toContain('headers(');
    expect(source).not.toContain('request.headers');
    expect(source).not.toContain('console.');
  });
});
