import { describe, expect, it } from 'vitest';

import {
  assertPublicShareModelIsPersonalDataFree,
  createCanonicalPublicInvitationUrl,
  createPublicShareCopy,
  createPublicShareFingerprint,
  publicShareRenderOptionsSchema,
  type PublicSocialShareModel,
} from '@/modules/public-social-share/public-social-share.core';

const model: PublicSocialShareModel = {
  coupleLabel: 'Raka & Nadia',
  eventDate: '17 Agustus 2027',
  eventTitle: 'Akad Nikah',
  paletteKey: 'rose',
  publicUrl: 'https://seraya.id/raka-nadia',
  revision: 3,
  snapshotId: '11111111-1111-4111-8111-111111111111',
  templateKey: 'roselle',
  venueAddress: 'Jl. Contoh No. 1, Jakarta',
  venueName: 'Gedung Seraya',
};

describe('V4I public social share safety contract', () => {
  it('builds only the canonical generic invitation URL', () => {
    expect(
      createCanonicalPublicInvitationUrl('https://seraya.id/dashboard?x=1#owner', 'raka-nadia'),
    ).toBe('https://seraya.id/raka-nadia');
  });

  it('keeps copy and fingerprints deterministic and public-safe', () => {
    const options = publicShareRenderOptionsSchema.parse({
      cta: 'save_the_date',
      showQr: true,
      showSerayaBrand: false,
      showVenue: true,
    });

    expect(createPublicShareCopy(model)).toContain('https://seraya.id/raka-nadia');
    expect(createPublicShareCopy(model)).not.toContain('/g/');
    expect(createPublicShareFingerprint(model, options)).toBe(
      'v4i-story-v1:11111111-1111-4111-8111-111111111111:3:roselle:rose:save_the_date:qr:venue:no-brand',
    );
  });

  it('rejects accidental personal invitation material', () => {
    expect(assertPublicShareModelIsPersonalDataFree(model)).toEqual(model);

    expect(() =>
      assertPublicShareModelIsPersonalDataFree({
        ...model,
        publicUrl: 'https://seraya.id/raka-nadia/g/private-token',
      }),
    ).toThrow(/personal invitation data/i);
  });

  it('does not accept arbitrary render option keys', () => {
    expect(() =>
      publicShareRenderOptionsSchema.parse({
        cta: 'open_invitation',
        guestToken: 'private',
      }),
    ).toThrow();
  });
});
