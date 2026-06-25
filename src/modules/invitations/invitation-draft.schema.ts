import { z } from 'zod';

import {
  DEFAULT_INVITATION_TEMPLATE_KEY,
  INVITATION_TEMPLATE_KEYS,
} from '@/modules/invitation-templates/invitation-template.keys';

export const INVITATION_DRAFT_SCHEMA_VERSION = 1 as const;

const htmlTagPattern = /<\/?[a-z][^>]*>|<!--[\s\S]*?-->|<!doctype\s+html[^>]*>/i;
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

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

const nullableHttpsUrl = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized.length === 0 ? null : normalized;
  },
  z
    .string()
    .max(2048, 'Link peta maksimal 2048 karakter.')
    .refine(hasNoRawHtml, 'Link peta tidak boleh berisi HTML.')
    .url('Link peta harus berupa URL yang valid.')
    .refine((value) => {
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    }, 'Link peta harus memakai HTTPS.')
    .nullable(),
);

const invitationEventPartSchema = z
  .object({
    date: nullableDate('Tanggal acara'),
    enabled: z.boolean(),
    endTime: nullableTime('Waktu selesai'),
    startTime: nullableTime('Waktu mulai'),
    title: nullableText(120, 'Judul acara'),
  })
  .strict();

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

export const invitationDraftContentSchema = z
  .object({
    closing: z
      .object({
        enabled: z.boolean(),
        message: nullableText(1200, 'Pesan penutup'),
        signature: nullableText(160, 'Tanda tangan'),
      })
      .strict(),
    couple: z
      .object({
        personOne: invitationPersonSchema,
        personTwo: invitationPersonSchema,
      })
      .strict(),
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
        mapsUrl: nullableHttpsUrl,
        venueName: nullableText(200, 'Nama lokasi'),
      })
      .strict(),
    meta: z
      .object({
        locale: z.literal('id-ID'),
        timezone: requiredText(100, 'Zona waktu'),
      })
      .strict(),
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
    // Legacy documents predate this key. Zod defaults absent values to Roselle
    // while still rejecting unknown values on every new save and snapshot parse.
    templateKey: invitationTemplateKeySchema,
  })
  .strict();

export const invitationDraftDocumentSchema = z
  .object({
    content: invitationDraftContentSchema,
    schemaVersion: z.literal(INVITATION_DRAFT_SCHEMA_VERSION),
  })
  .strict();

export type InvitationDraftContent = z.infer<typeof invitationDraftContentSchema>;
export type InvitationDraftDocument = z.infer<typeof invitationDraftDocumentSchema>;

export function parseInvitationDraftDocument(input: unknown): InvitationDraftDocument {
  return invitationDraftDocumentSchema.parse(input);
}
