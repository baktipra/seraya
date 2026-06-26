import { z } from 'zod';

const uuidSchema = z.string().uuid();

const deliveryLinkBoundInputSchema = z
  .object({
    guestId: uuidSchema,
    projectId: uuidSchema,
  })
  .strict();

const deliveryLinkFormSchema = z
  .object({
    confirmActiveReplacement: z.enum(['false', 'true']).default('false'),
  })
  .strict();

export type DeliveryLinkBoundInput = z.infer<typeof deliveryLinkBoundInputSchema>;

export function parseDeliveryLinkBoundInput(input: unknown) {
  return deliveryLinkBoundInputSchema.safeParse(input);
}

export function parseDeliveryLinkConfirmationFormData(formData: FormData) {
  return deliveryLinkFormSchema.safeParse({
    confirmActiveReplacement: formData.get('confirmActiveReplacement') ?? 'false',
  });
}
