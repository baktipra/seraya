import { z } from 'zod';

import { guestLinkLifecycleStates } from './guest-link-lifecycle';
import { guestIdSchema, guestProjectIdSchema } from '@/modules/guests/guest.schema';

const guestLinkTargetSchema = z
  .object({
    guestId: guestIdSchema,
    projectId: guestProjectIdSchema,
  })
  .strict();

const lifecycleStateSchema = z.enum(guestLinkLifecycleStates);

/** Deprecated target-only schema retained for server test/import compatibility. */
export const personalGuestLinkActionFormSchema = guestLinkTargetSchema;

export const personalGuestLinkMutationFormSchema = guestLinkTargetSchema.extend({
  confirmActiveReplacement: z.enum(['true', 'false']),
  expectedLifecycleState: lifecycleStateSchema,
  operation: z.literal('create_or_replace'),
});

export const personalGuestLinkReaccessFormSchema = guestLinkTargetSchema.extend({
  expectedLifecycleState: z.literal('active_recoverable'),
  operation: z.literal('reaccess'),
});

export const personalGuestLinkRevocationFormSchema = guestLinkTargetSchema.extend({
  confirmRevocation: z.literal('true'),
  expectedLifecycleState: z.enum(['active_recoverable', 'active_legacy']),
  operation: z.literal('revoke'),
});

function getFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function getGuestLinkTargetFormData(formData: FormData) {
  return {
    guestId: getFormText(formData, 'guestId'),
    projectId: getFormText(formData, 'projectId'),
  };
}

export function parsePersonalGuestLinkMutationFormData(formData: FormData) {
  return personalGuestLinkMutationFormSchema.safeParse({
    ...getGuestLinkTargetFormData(formData),
    confirmActiveReplacement: getFormText(formData, 'confirmActiveReplacement'),
    expectedLifecycleState: getFormText(formData, 'expectedLifecycleState'),
    operation: getFormText(formData, 'operation'),
  });
}

export function parsePersonalGuestLinkReaccessFormData(formData: FormData) {
  return personalGuestLinkReaccessFormSchema.safeParse({
    ...getGuestLinkTargetFormData(formData),
    expectedLifecycleState: getFormText(formData, 'expectedLifecycleState'),
    operation: getFormText(formData, 'operation'),
  });
}

export function parsePersonalGuestLinkRevocationFormData(formData: FormData) {
  return personalGuestLinkRevocationFormSchema.safeParse({
    ...getGuestLinkTargetFormData(formData),
    confirmRevocation: getFormText(formData, 'confirmRevocation'),
    expectedLifecycleState: getFormText(formData, 'expectedLifecycleState'),
    operation: getFormText(formData, 'operation'),
  });
}

/** Deprecated target-only parser. Mutating actions use the command-specific parsers above. */
export function parsePersonalGuestLinkActionFormData(formData: FormData) {
  return personalGuestLinkActionFormSchema.safeParse(getGuestLinkTargetFormData(formData));
}
