import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  InvitationIdentityFooter,
  InvitationOpeningIdentity,
} from '@/modules/invitation-templates/invitation-atmosphere-identity';
import { createInvitationViewModel } from '@/modules/invitation-templates/invitation-view-model';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { invitationDraftContentSchema } from '@/modules/invitations/invitation-draft.schema';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

describe('V4J Slice A identity contract', () => {
  it('keeps V4I documents compatible with disabled defaults', () => {
    const legacy = structuredClone(createDefaultInvitationDraftContent(project)) as Record<
      string,
      unknown
    >;
    delete legacy.opening;
    delete legacy.coupleIdentity;

    const parsed = invitationDraftContentSchema.parse(legacy);
    expect(parsed.opening).toEqual({ message: null, quote: null, treatment: 'soft' });
    expect(parsed.coupleIdentity.monogram.enabled).toBe(false);
  });

  it('rejects unsafe social providers and malformed hashtags', () => {
    const content = createDefaultInvitationDraftContent(project);
    expect(() =>
      invitationDraftContentSchema.parse({
        ...content,
        coupleIdentity: {
          ...content.coupleIdentity,
          socialLinks: {
            ...content.coupleIdentity.socialLinks,
            instagram: 'https://instagram.attacker.example/raka',
          },
        },
      }),
    ).toThrow(/domain resmi/i);
    expect(() =>
      invitationDraftContentSchema.parse({
        ...content,
        coupleIdentity: { ...content.coupleIdentity, weddingHashtag: 'Raka Nadia' },
      }),
    ).toThrow(/diawali #/i);
  });

  it('mounts the identity experience in the owner editor and all templates', () => {
    const editorSource = readFileSync('src/components/projects/invitation-editor.tsx', 'utf8');
    expect(editorSource).toContain('name="opening.treatment"');
    expect(editorSource).toContain('name="coupleIdentity.monogram.enabled"');

    for (const template of ['roselle', 'aruna', 'laras']) {
      const source = readFileSync(
        `src/modules/invitation-templates/${template}/${template}-template.tsx`,
        'utf8',
      );
      expect(source).toContain('InvitationOpeningIdentity');
      expect(source).toContain('InvitationIdentityFooter');
    }
  });

  it('derives public-safe identity and presentation', () => {
    const content = invitationDraftContentSchema.parse({
      ...createDefaultInvitationDraftContent(project),
      coupleIdentity: {
        monogram: { enabled: true, style: 'initials', text: null },
        shortName: 'Raka dan Nadia',
        socialLinks: {
          instagram: 'https://www.instagram.com/rakanadia',
          tiktok: null,
          website: 'https://rakanadia.example',
        },
        weddingHashtag: '#RakaNadia2027',
      },
      opening: {
        message: 'Dengan hangat kami menyambut Anda.',
        quote: 'Dua cerita, satu perjalanan.',
        treatment: 'editorial',
      },
    });
    const invitation = createInvitationViewModel({
      draft: { content },
      project: { event_date_primary: project.event_date_primary },
    });

    expect(invitation.identity?.monogram?.text).toBe('R & N');
    expect(invitation.identity?.socialLinks.map((link) => link.provider)).toEqual([
      'instagram',
      'website',
    ]);

    const openingMarkup = renderToStaticMarkup(
      <InvitationOpeningIdentity invitation={invitation} template="roselle" />,
    );
    const footerMarkup = renderToStaticMarkup(
      <InvitationIdentityFooter invitation={invitation} template="aruna" />,
    );

    expect(openingMarkup).toContain('data-opening-treatment="editorial"');
    expect(openingMarkup).toContain('Dengan hangat kami menyambut Anda.');
    expect(footerMarkup).toContain('#RakaNadia2027');
    expect(footerMarkup).toContain('rel="noopener noreferrer"');
  });
});
