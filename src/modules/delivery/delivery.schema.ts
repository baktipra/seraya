import { z } from 'zod';

const uuidSchema = z.string().uuid();

const deliveryLinkBoundInputSchema = z
  .object({
    guestId: uuidSchema,
    projectId: uuidSchema,
  })
  .strict();

const deliveryBatchBoundInputSchema = z
  .object({
    projectId: uuidSchema,
  })
  .strict();

const deliveryLinkFormSchema = z
  .object({
    confirmActiveReplacement: z.enum(['false', 'true']).default('false'),
  })
  .strict();

const deliveryBatchFormSchema = z
  .object({
    confirmBatchPreparation: z.literal('true'),
  })
  .strict();

export type DeliveryBatchBoundInput = z.infer<typeof deliveryBatchBoundInputSchema>;
export type DeliveryLinkBoundInput = z.infer<typeof deliveryLinkBoundInputSchema>;

export function parseDeliveryLinkBoundInput(input: unknown) {
  return deliveryLinkBoundInputSchema.safeParse(input);
}

export function parseDeliveryBatchBoundInput(input: unknown) {
  return deliveryBatchBoundInputSchema.safeParse(input);
}

export function parseDeliveryLinkConfirmationFormData(formData: FormData) {
  return deliveryLinkFormSchema.safeParse({
    confirmActiveReplacement: formData.get('confirmActiveReplacement') ?? 'false',
  });
}

export function parseDeliveryBatchConfirmationFormData(formData: FormData) {
  return deliveryBatchFormSchema.safeParse({
    confirmBatchPreparation: formData.get('confirmBatchPreparation'),
  });
}
