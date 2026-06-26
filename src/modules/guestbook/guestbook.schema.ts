import { z } from 'zod';

export const GUESTBOOK_MESSAGE_MAX_LENGTH = 600;

const guestbookMessageSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, 'Ucapan dan doa tidak boleh kosong.')
      .max(GUESTBOOK_MESSAGE_MAX_LENGTH, 'Ucapan dan doa maksimal 600 karakter.'),
  );

export const personalGuestbookSubmissionSchema = z
  .object({
    message: guestbookMessageSchema,
  })
  .strict();

export type PersonalGuestbookSubmission = z.infer<typeof personalGuestbookSubmissionSchema>;

export function parsePersonalGuestbookFormData(formData: FormData) {
  return personalGuestbookSubmissionSchema.safeParse({
    message: formData.get('message'),
  });
}

const removeGuestbookEntrySchema = z
  .object({
    entryId: z.string().uuid(),
    projectId: z.string().uuid(),
  })
  .strict();

export function parseRemoveGuestbookEntryFormData(formData: FormData) {
  return removeGuestbookEntrySchema.safeParse({
    entryId: formData.get('entryId'),
    projectId: formData.get('projectId'),
  });
}
