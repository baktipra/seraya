import { z } from 'zod';

const uuidSchema = z.string().uuid();
const maxSelectedGuestIds = 1_000;

const deliveryLinkBoundInputSchema = z
  .object({ guestId: uuidSchema, projectId: uuidSchema })
  .strict();

const deliveryBatchBoundInputSchema = z.object({ projectId: uuidSchema }).strict();

const deliveryLinkFormSchema = z
  .object({ confirmActiveReplacement: z.enum(['false', 'true']).default('false') })
  .strict();

const deliveryBatchFormSchema = z
  .object({
    confirmBatchPreparation: z.literal('true'),
    selectedGuestIds: z.array(uuidSchema).min(1).max(maxSelectedGuestIds),
  })
  .strict();

const deliveryReaccessFormSchema = z
  .object({ operation: z.enum(['copy', 'open', 'share']) })
  .strict();

const deliveryCopyNumbersFormSchema = z
  .object({ selectedGuestIds: z.array(uuidSchema).min(1).max(maxSelectedGuestIds) })
  .strict();

export type DeliveryBatchBoundInput = z.infer<typeof deliveryBatchBoundInputSchema>;
export type DeliveryLinkBoundInput = z.infer<typeof deliveryLinkBoundInputSchema>;

function parseGuestIdList(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || new Set(parsed).size !== parsed.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

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
    selectedGuestIds: parseGuestIdList(formData.get('selectedGuestIds')),
  });
}

export function parseDeliveryReaccessFormData(formData: FormData) {
  return deliveryReaccessFormSchema.safeParse({ operation: formData.get('operation') });
}

export function parseDeliveryCopyNumbersFormData(formData: FormData) {
  return deliveryCopyNumbersFormSchema.safeParse({
    selectedGuestIds: parseGuestIdList(formData.get('selectedGuestIds')),
  });
}
