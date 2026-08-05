import { z } from 'zod';

import {
  isInvitationThemePaletteKey,
  resolveInvitationThemePaletteKey,
} from '@/modules/invitation-templates/core/theme-package.registry';
import {
  DEFAULT_INVITATION_TEMPLATE_KEY,
  INVITATION_TEMPLATE_KEYS,
} from '@/modules/invitation-templates/invitation-template.keys';

import { normalizeDigitalGiftAccountNumber } from './digital-gift-account-number';
import { markLegacyEventScheduleDerived } from './invitation-draft-legacy-schedule';

export { isLegacyEventScheduleDerived } from './invitation-draft-legacy-schedule';

export const INVITATION_DRAFT_SCHEMA_VERSION = 1 as const;

const htmlTagPattern = /<\/?[a-z][^>]*>|<!--[\s\S]*?-->|<!doctype\s+html[^>]*>/i;
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{6,15}$/;
const legacyEventScheduleItemId = '00000000-0000-4000-8000-000000000001';

function isIsoDateOnly(value: string) {
  if (!dateOnlyPattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function hasNoRawHtml(value: string) {
  return !htmlTagPattern.test(value);
}

function requiredText(maximum: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} perlu diisi.`)
    .max(maximum, `${label} maksimal ${maximum} karakter.`)
    .refine(hasNoRawHtml, `${label} tidak boleh berisi HTML.`);
}

function nullableText(maximum: number, label: string) {
  return z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const normalized = value.trim();
      return normalized.length === 0 ? null : normalized;
    },
    z
      .string()
      .min(1, `${label} tidak boleh kosong.`)
      .max(maximum, `${label} maksimal ${maximum} karakter.`)
      .refine(hasNoRawHtml, `${label} tidak boleh berisi HTML.`)
      .nullable(),
  );
}

function nullableDate(label: string) {
  return nullableText(10, label).refine(
    (value) => value === null || isIsoDateOnly(value),
    `${label} harus memakai format YYYY-MM-DD yang valid.`,
  );
}

function nullableTime(label: string) {
  return nullableText(5, label).refine(
    (value) => value === null || timePattern.test(value),
    `${label} harus memakai format HH:mm.`,
  );
}

function nullableHttpsUrl(label: string) {
  return z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const normalized = value.trim();
      return normalized.length === 0 ? null : normalized;
    },
    z
      .string()
      .max(2048, `${label} maksimal 2048 karakter.`)
      .refine(hasNoRawHtml, `${label} tidak boleh berisi HTML.`)
      .url(`${label} harus berupa URL yang valid.`)
      .refine((value) => {
        try {
          return new URL(value).protocol === 'https:';
        } catch {
          return false;
        }
      }, `${label} harus memakai HTTPS.`)
      .nullable(),
  );
}

function nullableProviderProfileUrl(label: string, allowedHosts: readonly string[]) {
  return nullableHttpsUrl(label).refine((value) => {
    if (value === null) {
      return true;
    }

    try {
      return allowedHosts.includes(new URL(value).hostname.toLowerCase());
    } catch {
      return false;
    }
  }, `${label} harus menggunakan domain resmi.`);
}

const nullableInstagramUrl = nullableProviderProfileUrl('Profil Instagram', [
  'instagram.com',
  'www.instagram.com',
]);
const nullableTikTokUrl = nullableProviderProfileUrl('Profil TikTok', [
  'tiktok.com',
  'www.tiktok.com',
]);

const nullableMapUrl = nullableHttpsUrl('Link peta');
const nullableLivestreamUrl = nullableHttpsUrl('Link YouTube');

function getYoutubeVideoId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let candidate: string | null = null;

    if (host === 'youtu.be') {
      candidate = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (url.pathname === '/watch') {
        candidate = url.searchParams.get('v');
      } else {
        const segments = url.pathname.split('/').filter(Boolean);
        candidate = ['embed', 'live', 'shorts'].includes(segments[0] ?? '')
          ? (segments[1] ?? null)
          : null;
      }
    }

    return candidate && youtubeVideoIdPattern.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

const invitationEventPartSchema = z
  .object({
    date: nullableDate('Tanggal acara'),
    enabled: z.boolean(),
    endTime: nullableTime('Waktu selesai'),
    startTime: nullableTime('Waktu mulai'),
    title: nullableText(120, 'Judul acara'),
  })
  .strict();

const eventScheduleItemSchema = z
  .object({
    arrivalNote: nullableText(600, 'Petunjuk kedatangan').optional(),
    countdownEnabled: z.boolean().optional(),
    date: z
      .string()
      .trim()
      .refine(isIsoDateOnly, 'Tanggal acara harus memakai format YYYY-MM-DD yang valid.'),
    endTime: nullableTime('Waktu selesai'),
    id: z.string().trim().uuid('ID acara tidak valid.'),
    latitude: z.number().finite().min(-90).max(90).nullable().optional(),
    livestreamDescription: nullableText(600, 'Deskripsi siaran').optional(),
    livestreamEnabled: z.boolean().optional(),
    livestreamHeading: nullableText(160, 'Judul siaran langsung').optional(),
    livestreamPostEventMode: z.enum(['hide', 'recording']).optional(),
    livestreamPreEventMessage: nullableText(600, 'Pesan sebelum siaran').optional(),
    livestreamUrl: nullableLivestreamUrl.optional(),
    locationSource: z
      .enum(['google_place', 'current_location', 'manual_pin'])
      .nullable()
      .optional(),
    longitude: z.number().finite().min(-180).max(180).nullable().optional(),
    mapsUrl: nullableMapUrl,
    placeId: nullableText(240, 'Place ID').optional(),
    startTime: z.string().trim().regex(timePattern, 'Waktu mulai harus memakai format HH:mm.'),
    title: requiredText(80, 'Nama acara'),
    venueAddress: nullableText(280, 'Alamat tempat'),
    venueName: nullableText(160, 'Nama tempat'),
  })
  .strict()
  .superRefine((event, context) => {
    if (event.endTime && event.endTime < event.startTime) {
      context.addIssue({
        code: 'custom',
        message: 'Waktu selesai tidak boleh lebih awal dari waktu mulai.',
        path: ['endTime'],
      });
    }

    const hasLatitude = typeof event.latitude === 'number';
    const hasLongitude = typeof event.longitude === 'number';

    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: 'custom',
        message: 'Koordinat lokasi harus memiliki latitude dan longitude.',
        path: [hasLatitude ? 'longitude' : 'latitude'],
      });
    }

    if (event.locationSource && (!hasLatitude || !hasLongitude)) {
      context.addIssue({
        code: 'custom',
        message: 'Sumber lokasi terstruktur memerlukan koordinat yang lengkap.',
        path: ['locationSource'],
      });
    }

    if (event.livestreamEnabled && !event.livestreamUrl) {
      context.addIssue({
        code: 'custom',
        message: 'Tambahkan link YouTube ketika siaran langsung diaktifkan.',
        path: ['livestreamUrl'],
      });
    }

    if (event.livestreamUrl && !getYoutubeVideoId(event.livestreamUrl)) {
      context.addIssue({
        code: 'custom',
        message: 'Gunakan link video, live, Shorts, atau embed YouTube yang valid.',
        path: ['livestreamUrl'],
      });
    }
  });

export const eventScheduleSchema = z
  .object({
    events: z
      .array(eventScheduleItemSchema)
      .min(1, 'Tambahkan setidaknya satu acara.')
      .max(4, 'Maksimal empat acara.'),
  })
  .strict();

export type EventScheduleItemV1 = z.infer<typeof eventScheduleItemSchema>;
export type EventScheduleV1 = z.infer<typeof eventScheduleSchema>;

const invitationPersonSchema = z
  .object({
    displayName: requiredText(80, 'Nama panggilan'),
    fullName: nullableText(160, 'Nama lengkap'),
    parentLine: nullableText(240, 'Keterangan orang tua'),
  })
  .strict();

const invitationTemplateKeySchema = z
  .enum(INVITATION_TEMPLATE_KEYS)
  .default(DEFAULT_INVITATION_TEMPLATE_KEY);

const invitationPaletteKeySchema = z
  .string()
  .trim()
  .min(1, 'Palet undangan perlu dipilih.')
  .max(40, 'Palet undangan tidak valid.')
  .optional();

const digitalGiftAccountNumberSchema = z
  .string()
  .trim()
  .min(1, 'Nomor rekening atau e-wallet perlu diisi.')
  .refine(
    (value) => /^[0-9 -]+$/.test(value),
    'Nomor rekening atau e-wallet hanya boleh berisi angka, spasi, atau tanda hubung.',
  )
  .transform(normalizeDigitalGiftAccountNumber)
  .refine(
    (value) => value.length >= 6 && value.length <= 30,
    'Nomor rekening atau e-wallet harus terdiri dari 6 sampai 30 angka.',
  );

const digitalGiftAccountSchema = z
  .object({
    accountHolder: requiredText(160, 'Nama pemilik rekening'),
    accountNumber: digitalGiftAccountNumberSchema,
    id: z.string().trim().uuid('ID rekening tidak valid.'),
    providerName: requiredText(100, 'Penyedia, bank, atau e-wallet'),
  })
  .strict();

const disabledDigitalGift = () => ({
  accounts: [],
  enabled: false,
  heading: null,
  lead: null,
});

const digitalGiftSchema = z
  .object({
    accounts: z.array(digitalGiftAccountSchema).max(3, 'Maksimal tiga rekening atau e-wallet.'),
    enabled: z.boolean(),
    heading: nullableText(120, 'Judul Amplop Digital'),
    lead: nullableText(600, 'Pengantar Amplop Digital'),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.enabled && value.accounts.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Tambahkan setidaknya satu rekening atau e-wallet untuk Amplop Digital.',
        path: ['accounts'],
      });
    }
  });

const createDefaultInvitationOpening = () => ({
  message: null,
  quote: null,
  treatment: 'soft' as const,
});

const invitationOpeningSchema = z
  .object({
    message: nullableText(360, 'Pesan pembuka'),
    quote: nullableText(360, 'Kutipan pembuka'),
    treatment: z.enum(['soft', 'editorial', 'ceremonial']),
  })
  .strict();

const createDefaultCoupleIdentity = () => ({
  monogram: {
    enabled: false,
    style: 'initials' as const,
    text: null,
  },
  shortName: null,
  socialLinks: {
    instagram: null,
    tiktok: null,
    website: null,
  },
  weddingHashtag: null,
});

const coupleIdentitySchema = z
  .object({
    monogram: z
      .object({
        enabled: z.boolean(),
        style: z.enum(['initials', 'joined_initials', 'wordmark']),
        text: nullableText(32, 'Teks monogram'),
      })
      .strict(),
    shortName: nullableText(100, 'Nama singkat pasangan'),
    socialLinks: z
      .object({
        instagram: nullableInstagramUrl,
        tiktok: nullableTikTokUrl,
        website: nullableHttpsUrl('Website pasangan'),
      })
      .strict(),
    weddingHashtag: nullableText(80, 'Wedding hashtag').refine(
      (value) => value === null || /^#[A-Za-z0-9_]+$/.test(value),
      'Wedding hashtag harus diawali # dan hanya berisi huruf, angka, atau garis bawah.',
    ),
  })
  .strict();

const invitationDraftContentBaseSchema = z
  .object({
    closing: z
      .object({
        enabled: z.boolean(),
        message: nullableText(1200, 'Pesan penutup'),
        signature: nullableText(160, 'Tanda tangan'),
      })
      .strict(),
    // Legacy drafts and snapshots predate Amplop Digital. Missing values
    // intentionally resolve to the safe disabled state without mutating the
    // stored JSON document until the owner explicitly saves a draft again.
    digitalGift: digitalGiftSchema.default(disabledDigitalGift),
    couple: z
      .object({
        personOne: invitationPersonSchema,
        personTwo: invitationPersonSchema,
      })
      .strict(),
    coupleIdentity: coupleIdentitySchema.default(createDefaultCoupleIdentity),
    events: z
      .object({
        ceremony: invitationEventPartSchema,
        enabled: z.boolean(),
        primaryDate: nullableDate('Tanggal acara utama'),
        reception: invitationEventPartSchema,
      })
      .strict(),
    gallery: z
      .object({
        enabled: z.boolean(),
        imageIds: z.array(z.string().trim().uuid('ID foto harus berupa UUID yang valid.')).max(60),
      })
      .strict(),
    hero: z
      .object({
        eyebrow: nullableText(80, 'Teks pembuka'),
        subtitle: nullableText(240, 'Subjudul'),
        title: nullableText(200, 'Judul undangan'),
      })
      .strict(),
    location: z
      .object({
        address: nullableText(800, 'Alamat acara'),
        enabled: z.boolean(),
        mapsUrl: nullableMapUrl,
        venueName: nullableText(200, 'Nama lokasi'),
      })
      .strict(),
    meta: z
      .object({
        locale: z.literal('id-ID'),
        timezone: requiredText(100, 'Zona waktu'),
      })
      .strict(),
    opening: invitationOpeningSchema.default(createDefaultInvitationOpening),
    rsvp: z
      .object({
        enabled: z.boolean(),
        heading: nullableText(120, 'Judul RSVP'),
        lead: nullableText(600, 'Pengantar RSVP'),
      })
      .strict(),
    story: z
      .object({
        body: nullableText(4000, 'Cerita kalian'),
        enabled: z.boolean(),
        heading: nullableText(120, 'Judul cerita'),
      })
      .strict(),
    // Legacy documents predate theme and palette selection. Missing values
    // resolve at the compatibility boundary while malformed present values fail.
    paletteKey: invitationPaletteKeySchema,
    templateKey: invitationTemplateKeySchema,
  })
  .strict();

type InvitationDraftThemeSelection = Pick<
  z.infer<typeof invitationDraftContentBaseSchema>,
  'paletteKey' | 'templateKey'
>;

function validateInvitationThemeSelection(
  content: InvitationDraftThemeSelection,
  context: z.RefinementCtx,
) {
  if (
    content.paletteKey !== undefined &&
    !isInvitationThemePaletteKey(content.templateKey, content.paletteKey)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Palet tidak tersedia untuk desain yang dipilih.',
      path: ['paletteKey'],
    });
  }
}

function normalizeInvitationThemeSelection<TContent extends InvitationDraftThemeSelection>(
  content: TContent,
) {
  return {
    ...content,
    paletteKey: resolveInvitationThemePaletteKey(content.templateKey, content.paletteKey),
  };
}

function selectLegacyPrimaryEvent(
  events: z.infer<typeof invitationDraftContentBaseSchema>['events'],
) {
  if (events.ceremony.enabled || events.ceremony.title || events.ceremony.date) {
    return events.ceremony;
  }

  if (events.reception.enabled || events.reception.title || events.reception.date) {
    return events.reception;
  }

  return events.ceremony;
}

function deriveLegacyEventSchedule(
  content: z.infer<typeof invitationDraftContentBaseSchema>,
): EventScheduleV1 {
  const primary = selectLegacyPrimaryEvent(content.events);

  return {
    events: [
      {
        date: primary.date ?? content.events.primaryDate ?? '1970-01-01',
        endTime: primary.endTime,
        id: legacyEventScheduleItemId,
        mapsUrl: content.location.mapsUrl,
        startTime: primary.startTime ?? '00:00',
        title: primary.title ?? 'Acara Pernikahan',
        venueAddress: content.location.address,
        venueName: content.location.venueName,
      },
    ],
  };
}

const modernInvitationDraftContentSchema = invitationDraftContentBaseSchema
  .extend({
    eventSchedule: eventScheduleSchema,
  })
  .strict()
  .superRefine(validateInvitationThemeSelection)
  .transform(normalizeInvitationThemeSelection);

const legacyInvitationDraftContentSchema = invitationDraftContentBaseSchema
  .superRefine(validateInvitationThemeSelection)
  .transform((content) => {
    const normalizedTheme = normalizeInvitationThemeSelection(content);
    const normalizedContent = {
      ...normalizedTheme,
      eventSchedule: deriveLegacyEventSchedule(normalizedTheme),
    };

    return markLegacyEventScheduleDerived(normalizedContent);
  });

/**
 * New documents must provide the strict multi-event contract. A missing
 * `eventSchedule` is accepted only at this compatibility boundary for drafts
 * and snapshots created before SRY-030, then receives one derived event in
 * memory. The legacy marker is non-enumerable and is never persisted.
 */
export const invitationDraftContentSchema = z.union([
  modernInvitationDraftContentSchema,
  legacyInvitationDraftContentSchema,
]);

export type InvitationDraftContent = z.output<typeof modernInvitationDraftContentSchema>;
export type InvitationDraftDocument = {
  content: InvitationDraftContent;
  schemaVersion: typeof INVITATION_DRAFT_SCHEMA_VERSION;
};

export const invitationDraftDocumentSchema = z
  .object({
    content: invitationDraftContentSchema,
    schemaVersion: z.literal(INVITATION_DRAFT_SCHEMA_VERSION),
  })
  .strict();

/**
 * Existing `events` and `location` JSON stay as compatibility mirrors only.
 * Save flows call this from server-owned schedule input so a browser cannot
 * persist conflicting first-event and legacy values.
 */
export function derivePrimaryEventCompatibility(eventSchedule: EventScheduleV1) {
  const primary = eventSchedule.events[0];

  if (!primary) {
    throw new Error('A primary invitation event is required.');
  }

  return {
    events: {
      ceremony: {
        date: primary.date,
        enabled: true,
        endTime: primary.endTime,
        startTime: primary.startTime,
        title: primary.title,
      },
      enabled: true,
      primaryDate: primary.date,
      reception: {
        date: null,
        enabled: false,
        endTime: null,
        startTime: null,
        title: null,
      },
    },
    location: {
      address: primary.venueAddress,
      enabled: Boolean(primary.venueName || primary.venueAddress || primary.mapsUrl),
      mapsUrl: primary.mapsUrl,
      venueName: primary.venueName,
    },
  };
}

export function parseInvitationDraftDocument(input: unknown): InvitationDraftDocument {
  return invitationDraftDocumentSchema.parse(input) as InvitationDraftDocument;
}
