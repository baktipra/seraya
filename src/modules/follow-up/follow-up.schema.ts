import { z } from 'zod';

import { guestFollowUpHandoffMessageKinds } from './follow-up.types';

const uuidSchema = z.string().uuid();

const guestFollowUpHandoffBoundInputSchema = z
  .object({
    guestId: uuidSchema,
    projectId: uuidSchema,
  })
  .strict();

const guestFollowUpHandoffFormSchema = z
  .object({
    messageKind: z.enum(guestFollowUpHandoffMessageKinds),
  })
  .strict();

export type GuestFollowUpHandoffBoundInput = z.infer<typeof guestFollowUpHandoffBoundInputSchema>;

export function parseGuestFollowUpHandoffBoundInput(input: unknown) {
  return guestFollowUpHandoffBoundInputSchema.safeParse(input);
}

export function parseGuestFollowUpHandoffFormData(formData: FormData) {
  return guestFollowUpHandoffFormSchema.safeParse({
    messageKind: formData.get('messageKind'),
  });
}
