import { z } from 'zod';

const rawHtmlPattern = /<\/?[a-z][^>]*>|<!--[\s\S]*?-->|<!doctype\s+html[^>]*>/i;

function containsNoRawHtml(value: string) {
  return !rawHtmlPattern.test(value);
}

const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Nama tamu perlu diisi.')
  .max(120, 'Nama tamu maksimal 120 karakter.')
  .refine(containsNoRawHtml, 'Nama tamu tidak boleh berisi HTML.');

const groupLabelSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}, z.string().min(1, 'Kelompok tamu tidak boleh kosong.').max(40, 'Kelompok tamu terlalu panjang.').refine(containsNoRawHtml, 'Kelompok tamu tidak boleh berisi HTML.').nullable());

const partySizeSchema = z.preprocess(
  (value) => (typeof value === 'number' ? String(value) : value),
  z
    .string()
    .trim()
    .min(1, 'Jumlah undangan harus diisi.')
    .regex(/^\d+$/, 'Jumlah undangan harus berupa angka bulat.')
    .transform(Number)
    .refine((value) => value >= 1, 'Jumlah undangan harus minimal 1 orang.')
    .refine((value) => value <= 20, 'Jumlah undangan maksimal 20 orang.'),
);

export const guestInputSchema = z
  .object({
    displayName: displayNameSchema,
    groupLabel: groupLabelSchema,
    partySize: partySizeSchema,
  })
  .strict();

const databaseUuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PostgreSQL UUIDs are valid without a specific RFC version nibble; accept the
// database shape while keeping untrusted route/form identifiers constrained.
export const guestIdSchema = z.string().regex(databaseUuidShape, 'Data tamu tidak valid.');
export const guestProjectIdSchema = z.string().regex(databaseUuidShape, 'Project tidak valid.');

export const createGuestActionFormSchema = guestInputSchema
  .extend({ projectId: guestProjectIdSchema })
  .strict();

export const updateGuestActionFormSchema = guestInputSchema
  .extend({ guestId: guestIdSchema, projectId: guestProjectIdSchema })
  .strict();

export const removeGuestActionFormSchema = z
  .object({ guestId: guestIdSchema, projectId: guestProjectIdSchema })
  .strict();

export type GuestInputField = keyof z.input<typeof guestInputSchema>;
export type GuestFieldErrors = Partial<Record<'displayName' | 'groupLabel' | 'partySize', string>>;

function getFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export function parseCreateGuestFormData(formData: FormData) {
  return createGuestActionFormSchema.safeParse({
    displayName: getFormText(formData, 'displayName'),
    groupLabel: getFormText(formData, 'groupLabel'),
    partySize: getFormText(formData, 'partySize'),
    projectId: getFormText(formData, 'projectId'),
  });
}

export function parseUpdateGuestFormData(formData: FormData) {
  return updateGuestActionFormSchema.safeParse({
    displayName: getFormText(formData, 'displayName'),
    groupLabel: getFormText(formData, 'groupLabel'),
    guestId: getFormText(formData, 'guestId'),
    partySize: getFormText(formData, 'partySize'),
    projectId: getFormText(formData, 'projectId'),
  });
}

export function parseRemoveGuestFormData(formData: FormData) {
  return removeGuestActionFormSchema.safeParse({
    guestId: getFormText(formData, 'guestId'),
    projectId: getFormText(formData, 'projectId'),
  });
}

export function getGuestFieldErrors(error: z.ZodError): GuestFieldErrors {
  const fieldErrors: GuestFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      typeof field === 'string' &&
      ['displayName', 'groupLabel', 'partySize'].includes(field) &&
      !fieldErrors[field as keyof GuestFieldErrors]
    ) {
      fieldErrors[field as keyof GuestFieldErrors] = issue.message;
    }
  }

  return fieldErrors;
}
