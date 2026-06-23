import { z } from 'zod';

import { guestIdSchema, guestProjectIdSchema } from '@/modules/guests/guest.schema';

export const personalGuestLinkActionFormSchema = z
  .object({
    guestId: guestIdSchema,
    projectId: guestProjectIdSchema,
  })
  .strict();

function getFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export function parsePersonalGuestLinkActionFormData(formData: FormData) {
  return personalGuestLinkActionFormSchema.safeParse({
    guestId: getFormText(formData, 'guestId'),
    projectId: getFormText(formData, 'projectId'),
  });
}
