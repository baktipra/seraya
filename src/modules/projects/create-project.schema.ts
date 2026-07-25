import { z } from 'zod';

import { INVITATION_TEMPLATE_KEYS } from '@/modules/invitation-templates/invitation-template.keys';
import {
  RESERVED_SLUGS,
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  normalizeSlug,
  validateSlug,
} from '@/lib/slug';

const nameSchema = (message: string) =>
  z.string().trim().min(1, message).max(80, 'Gunakan maksimal 80 karakter.');

const eventCitySchema = z
  .string()
  .trim()
  .min(1, 'Kota acara perlu diisi dulu.')
  .max(120, 'Gunakan maksimal 120 karakter.');

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const eventDateSchema = z
  .string()
  .trim()
  .min(1, 'Tanggal acara utama perlu diisi dulu.')
  .refine(isValidIsoDate, 'Pilih tanggal acara yang valid.');

const slugSchema = z
  .string()
  .trim()
  .min(1, 'Tentukan link undangan terlebih dahulu.')
  .max(SLUG_MAX_LENGTH, `Link undangan maksimal ${SLUG_MAX_LENGTH} karakter.`)
  .refine(
    (value) => value === normalizeSlug(value),
    'Gunakan huruf kecil, angka, dan tanda hubung untuk link undangan.',
  )
  .refine(
    (value) => value.length >= SLUG_MIN_LENGTH,
    `Link undangan minimal ${SLUG_MIN_LENGTH} karakter.`,
  )
  .refine(
    (value) => !RESERVED_SLUGS.has(value),
    'Link undangan ini digunakan oleh halaman sistem Seraya.',
  )
  .refine(
    (value) => validateSlug(value).valid,
    'Gunakan huruf kecil, angka, dan tanda hubung untuk link undangan.',
  );

export const createProjectSchema = z.object({
  eventCity: eventCitySchema,
  eventDatePrimary: eventDateSchema,
  personOneName: nameSchema('Gunakan nama panggilan untuk pasangan pertama.'),
  personTwoName: nameSchema('Gunakan nama panggilan untuk pasangan kedua.'),
  slug: slugSchema,
  templateKey: z.enum(INVITATION_TEMPLATE_KEYS, {
    message: 'Pilih salah satu pengalaman undangan.',
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateProjectField = keyof CreateProjectInput;
export type CreateProjectFieldErrors = Partial<Record<CreateProjectField, string>>;

export function suggestProjectSlug(personOneName: string, personTwoName: string) {
  return normalizeSlug(`${personOneName} ${personTwoName}`);
}

function getFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export function parseCreateProjectFormData(formData: FormData) {
  return createProjectSchema.safeParse({
    eventCity: getFormText(formData, 'eventCity'),
    eventDatePrimary: getFormText(formData, 'eventDatePrimary'),
    personOneName: getFormText(formData, 'personOneName'),
    personTwoName: getFormText(formData, 'personTwoName'),
    slug: getFormText(formData, 'slug'),
    templateKey: getFormText(formData, 'templateKey'),
  });
}

export function getCreateProjectFieldErrors(error: z.ZodError): CreateProjectFieldErrors {
  const fieldErrors: CreateProjectFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      typeof field === 'string' &&
      [
        'personOneName',
        'personTwoName',
        'eventDatePrimary',
        'eventCity',
        'slug',
        'templateKey',
      ].includes(field) &&
      !fieldErrors[field as CreateProjectField]
    ) {
      fieldErrors[field as CreateProjectField] = issue.message;
    }
  }

  return fieldErrors;
}
