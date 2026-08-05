import { z } from 'zod';

import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';

export const PUBLIC_SHARE_CTA_OPTIONS = [
  'open_invitation',
  'save_the_date',
  'celebrate_with_us',
  'view_event_details',
] as const;

export type PublicShareCta = (typeof PUBLIC_SHARE_CTA_OPTIONS)[number];

export const publicShareRenderOptionsSchema = z
  .object({
    cta: z.enum(PUBLIC_SHARE_CTA_OPTIONS).default('open_invitation'),
    showQr: z.boolean().default(true),
    showSerayaBrand: z.boolean().default(true),
    showVenue: z.boolean().default(false),
  })
  .strict();

export type PublicShareRenderOptions = z.infer<typeof publicShareRenderOptionsSchema>;

export type PublicSocialShareModel = Readonly<{
  coupleLabel: string;
  eventDate: string;
  eventTitle: string;
  paletteKey: string;
  publicUrl: string;
  revision: number;
  snapshotId: string;
  templateKey: InvitationTemplateKey;
  venueAddress: string | null;
  venueName: string | null;
}>;

const CTA_LABELS: Record<PublicShareCta, string> = {
  celebrate_with_us: 'Rayakan Bersama Kami',
  open_invitation: 'Buka Undangan',
  save_the_date: 'Save the Date',
  view_event_details: 'Lihat Detail Acara',
};

export function getPublicShareCtaLabel(cta: PublicShareCta) {
  return CTA_LABELS[cta];
}

export function createCanonicalPublicInvitationUrl(baseUrl: string, slug: string) {
  const url = new URL(baseUrl);
  url.pathname = `/${encodeURIComponent(slug)}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function createPublicShareFingerprint(
  model: PublicSocialShareModel,
  options: PublicShareRenderOptions,
) {
  return [
    'v4i-story-v1',
    model.snapshotId,
    String(model.revision),
    model.templateKey,
    model.paletteKey,
    options.cta,
    options.showQr ? 'qr' : 'no-qr',
    options.showVenue ? 'venue' : 'no-venue',
    options.showSerayaBrand ? 'brand' : 'no-brand',
  ].join(':');
}

export function createPublicShareCopy(model: PublicSocialShareModel) {
  return [
    'Dengan penuh kebahagiaan, kami mengundang Anda untuk menjadi bagian dari hari istimewa kami.',
    '',
    model.coupleLabel,
    model.eventDate,
    '',
    'Lihat undangan:',
    model.publicUrl,
  ].join('\n');
}

export function assertPublicShareModelIsPersonalDataFree(model: PublicSocialShareModel) {
  const serialized = JSON.stringify(model).toLowerCase();
  const forbiddenMarkers = [
    'guestid',
    'guestname',
    'guesttoken',
    'personalurl',
    'rsvpstate',
    'deliverystate',
    '/g/',
  ];

  if (forbiddenMarkers.some((marker) => serialized.includes(marker))) {
    throw new Error('Public social share payload contains personal invitation data.');
  }

  return model;
}
