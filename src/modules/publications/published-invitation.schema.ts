import { z } from 'zod';

import {
  INVITATION_DRAFT_SCHEMA_VERSION,
  invitationDraftContentSchema,
} from '@/modules/invitations/invitation-draft.schema';
import { RESERVED_SLUGS, SLUG_MAX_LENGTH, SLUG_MIN_LENGTH } from '@/lib/slug';

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const rawHtmlPattern = /<\/?[a-z][^>]*>|<!--[\s\S]*?-->|<!doctype\s+html[^>]*>/i;

function isIsoDateOnly(value: string) {
  if (!dateOnlyPattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function hasNoRawHtml(value: string) {
  return !rawHtmlPattern.test(value);
}

const publishedSlugSchema = z
  .string()
  .trim()
  .min(SLUG_MIN_LENGTH)
  .max(SLUG_MAX_LENGTH)
  .regex(slugPattern)
  .refine((value) => !RESERVED_SLUGS.has(value), 'Slug snapshot tidak didukung.');

const publicTextSchema = (maximum: number) =>
  z.string().trim().min(1).max(maximum).refine(hasNoRawHtml, 'Data undangan tidak dapat dirender.');

export const publishedInvitationSnapshotSchema = z
  .object({
    draft: invitationDraftContentSchema,
    project: z
      .object({
        eventCity: publicTextSchema(120),
        eventDatePrimary: z.string().trim().refine(isIsoDateOnly),
        slug: publishedSlugSchema,
        timezone: publicTextSchema(100),
      })
      .strict(),
  })
  .strict();

export const publishedInvitationSnapshotRecordSchema = z
  .object({
    created_at: z.string(),
    draft_schema_version: z.literal(INVITATION_DRAFT_SCHEMA_VERSION),
    id: z.string().uuid(),
    is_current: z.boolean(),
    project_id: z.string().uuid(),
    published_at: z.string(),
    revision: z.number().int().min(1),
    slug: publishedSlugSchema,
    snapshot: publishedInvitationSnapshotSchema,
    template_id: z.literal('roselle'),
  })
  .strict();

export function parsePublishedInvitationSnapshot(input: unknown) {
  return publishedInvitationSnapshotSchema.parse(input);
}

export function parsePublishedInvitationSnapshotRecord(input: unknown) {
  return publishedInvitationSnapshotRecordSchema.parse(input);
}
