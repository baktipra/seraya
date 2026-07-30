import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { INVITATION_TEMPLATE_KEYS } from '../invitation-template.keys';
import {
  CANONICAL_SHOWROOM_ASSET_SLOTS,
  CANONICAL_SHOWROOM_COUPLE,
  createCanonicalShowroomInvitation,
  createCanonicalShowroomPersonalSlots,
} from '../showroom/canonical-showroom-invitation';

const marketingSource = readFileSync(
  join(process.cwd(), 'src/components/marketing/flagship-marketing.tsx'),
  'utf8',
);
const templatesPageSource = readFileSync(join(process.cwd(), 'src/app/templates/page.tsx'), 'utf8');
const showroomRouteSource = readFileSync(
  join(process.cwd(), 'src/app/templates/[templateKey]/demo/[surface]/page.tsx'),
  'utf8',
);
const showroomFixtureSource = readFileSync(
  join(
    process.cwd(),
    'src/modules/invitation-templates/showroom/canonical-showroom-invitation.tsx',
  ),
  'utf8',
);

describe('P0-B4 canonical invitation showroom contract', () => {
  it('uses one equivalent Kirana and Arga invitation across every collection', () => {
    const invitations = INVITATION_TEMPLATE_KEYS.map((templateKey) =>
      createCanonicalShowroomInvitation(templateKey),
    );

    for (const invitation of invitations) {
      expect(invitation.hero.title).toBe(CANONICAL_SHOWROOM_COUPLE.displayName);
      expect(invitation.couple.personOne.fullName).toBe(
        CANONICAL_SHOWROOM_COUPLE.personOne.fullName,
      );
      expect(invitation.couple.personTwo.fullName).toBe(
        CANONICAL_SHOWROOM_COUPLE.personTwo.fullName,
      );
      expect(invitation.events?.items).toHaveLength(2);
      expect(invitation.gallery?.images).toHaveLength(6);
      expect(invitation.digitalGift?.accounts).toHaveLength(2);
    }

    expect(invitations[0]?.gallery?.images.map((image) => image.src)).toEqual(
      invitations[1]?.gallery?.images.map((image) => image.src),
    );
    expect(invitations[1]?.gallery?.images.map((image) => image.src)).toEqual(
      invitations[2]?.gallery?.images.map((image) => image.src),
    );
  });

  it('defines the canonical media roles without external asset dependencies', () => {
    expect(CANONICAL_SHOWROOM_ASSET_SLOTS.map((slot) => slot.role)).toEqual([
      'opening-portrait',
      'environmental-wide',
      'gallery-lead',
      'detail-square',
      'supporting-detail',
      'venue-wide',
    ]);
    expect(showroomFixtureSource).not.toMatch(/https?:\/\/(?!maps\.google\.com)/);
    expect(showroomFixtureSource).toContain('data:image/svg+xml');
  });

  it('renders generic and personal showroom surfaces through the production template renderer', () => {
    expect(showroomRouteSource).toContain('InvitationTemplateRenderer');
    expect(showroomRouteSource).toContain(
      "const SHOWROOM_SURFACES = ['generic', 'personal'] as const",
    );
    expect(showroomRouteSource).toContain('generateStaticParams');
    expect(showroomRouteSource).toContain(
      'robots: { follow: false, index: false, noarchive: true }',
    );
    expect(showroomRouteSource).toContain('Simulasi personal ini memakai data fiktif');
  });

  it('keeps the personal showroom non-persisting and visibly inactive', () => {
    const personalSlots = createCanonicalShowroomPersonalSlots();

    expect(personalSlots.greeting).toBeTruthy();
    expect(personalSlots.rsvp).toBeTruthy();
    expect(personalSlots.guestbook).toBeTruthy();
    expect(showroomFixtureSource).toContain('tidak menyimpan respons');
    expect(showroomFixtureSource).toContain('disabled');
    expect(showroomFixtureSource).not.toContain('supabase');
    expect(showroomFixtureSource).not.toContain('server action');
  });

  it('replaces typography-only marketing covers with canonical renderer previews', () => {
    expect(marketingSource).toContain('data-canonical-showroom-preview');
    expect(marketingSource).toContain(
      "src={`${getShowroomHref(collection, 'generic')}#showroom-invitation`}",
    );
    expect(marketingSource).toContain('Renderer asli');
    expect(marketingSource).toContain('Kirana &amp; Arga');
    expect(templatesPageSource).toContain('Satu isi undangan. Tiga cara menyambut tamu.');
    expect(templatesPageSource).toContain('Buka demo umum');
    expect(templatesPageSource).toContain('Simulasi personal');
  });
});
