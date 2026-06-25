import { z } from 'zod';

import { INVITATION_TEMPLATE_KEYS } from '@/modules/invitation-templates/invitation-template.keys';

const databaseUuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const digitalGiftAccountMaximum = 3 as const;
const digitalGiftAccountInputKeys = [
  'id',
  'providerName',
  'accountHolder',
  'accountNumber',
] as const;

const projectIdSchema = z.string().regex(databaseUuidShape, 'Project tidak valid.');
const formTextSchema = z.string();
const checkboxInputSchema = z
  .union([z.literal('true'), z.literal(false)])
  .transform((value) => value === 'true');

const baseEditorFormFieldNames = [
  'projectId',
  'templateKey',
  'hero.eyebrow',
  'hero.title',
  'hero.subtitle',
  'couple.personOne.displayName',
  'couple.personOne.fullName',
  'couple.personOne.parentLine',
  'couple.personTwo.displayName',
  'couple.personTwo.fullName',
  'couple.personTwo.parentLine',
  'story.enabled',
  'story.heading',
  'story.body',
  'events.enabled',
  'events.primaryDate',
  'events.ceremony.enabled',
  'events.ceremony.title',
  'events.ceremony.date',
  'events.ceremony.startTime',
  'events.ceremony.endTime',
  'events.reception.enabled',
  'events.reception.title',
  'events.reception.date',
  'events.reception.startTime',
  'events.reception.endTime',
  'location.enabled',
  'location.venueName',
  'location.address',
  'location.mapsUrl',
  'rsvp.enabled',
  'rsvp.heading',
  'rsvp.lead',
  'digitalGift.enabled',
  'digitalGift.heading',
  'digitalGift.lead',
  'closing.enabled',
  'closing.message',
  'closing.signature',
] as const;

type DigitalGiftAccountIndex = 0 | 1 | 2;
type DigitalGiftAccountInputKey = (typeof digitalGiftAccountInputKeys)[number];
type DigitalGiftAccountFieldName =
  `digitalGift.accounts.${DigitalGiftAccountIndex}.${DigitalGiftAccountInputKey}`;
type EditorFormFieldName = (typeof baseEditorFormFieldNames)[number] | DigitalGiftAccountFieldName;
type EditorFieldErrorName = EditorFormFieldName | 'digitalGift.accounts';

const digitalGiftAccountFieldPattern = new RegExp(
  `^digitalGift\\.accounts\\.([0-${digitalGiftAccountMaximum - 1}])\\.(${digitalGiftAccountInputKeys.join('|')})$`,
);

const invitationEditorFormSchema = z
  .object({
    content: z
      .object({
        closing: z
          .object({
            enabled: checkboxInputSchema,
            message: formTextSchema,
            signature: formTextSchema,
          })
          .strict(),
        couple: z
          .object({
            personOne: z
              .object({
                displayName: formTextSchema,
                fullName: formTextSchema,
                parentLine: formTextSchema,
              })
              .strict(),
            personTwo: z
              .object({
                displayName: formTextSchema,
                fullName: formTextSchema,
                parentLine: formTextSchema,
              })
              .strict(),
          })
          .strict(),
        digitalGift: z
          .object({
            accounts: z
              .array(
                z
                  .object({
                    accountHolder: formTextSchema,
                    accountNumber: formTextSchema,
                    id: z.string().regex(databaseUuidShape, 'ID rekening tidak valid.'),
                    providerName: formTextSchema,
                  })
                  .strict(),
              )
              .max(digitalGiftAccountMaximum),
            enabled: checkboxInputSchema,
            heading: formTextSchema,
            lead: formTextSchema,
          })
          .strict(),
        events: z
          .object({
            ceremony: z
              .object({
                date: formTextSchema,
                enabled: checkboxInputSchema,
                endTime: formTextSchema,
                startTime: formTextSchema,
                title: formTextSchema,
              })
              .strict(),
            enabled: checkboxInputSchema,
            primaryDate: formTextSchema,
            reception: z
              .object({
                date: formTextSchema,
                enabled: checkboxInputSchema,
                endTime: formTextSchema,
                startTime: formTextSchema,
                title: formTextSchema,
              })
              .strict(),
          })
          .strict(),
        hero: z
          .object({
            eyebrow: formTextSchema,
            subtitle: formTextSchema,
            title: formTextSchema,
          })
          .strict(),
        location: z
          .object({
            address: formTextSchema,
            enabled: checkboxInputSchema,
            mapsUrl: formTextSchema,
            venueName: formTextSchema,
          })
          .strict(),
        rsvp: z
          .object({
            enabled: checkboxInputSchema,
            heading: formTextSchema,
            lead: formTextSchema,
          })
          .strict(),
        templateKey: z.enum(INVITATION_TEMPLATE_KEYS),
        story: z
          .object({
            body: formTextSchema,
            enabled: checkboxInputSchema,
            heading: formTextSchema,
          })
          .strict(),
      })
      .strict(),
    projectId: projectIdSchema,
  })
  .strict();

export type InvitationEditorFormInput = z.output<typeof invitationEditorFormSchema>;

export type InvitationEditorFieldErrors = Partial<Record<EditorFieldErrorName | 'form', string>>;

function getCheckboxValue(formData: FormData, name: string): FormDataEntryValue | false {
  const value = formData.get(name);
  return value === null ? false : value;
}

function getFormValue(formData: FormData, name: string): FormDataEntryValue | null {
  return formData.get(name);
}

function createUnexpectedFieldError(keys: string[]) {
  return new z.ZodError([
    {
      code: 'unrecognized_keys',
      keys,
      message: 'Form undangan tidak valid.',
      path: [],
    },
  ]);
}

function getDigitalGiftAccountFieldMatch(name: string) {
  return digitalGiftAccountFieldPattern.exec(name);
}

function isKnownEditorFormFieldName(name: string): name is EditorFormFieldName {
  return (
    (baseEditorFormFieldNames as readonly string[]).includes(name) ||
    getDigitalGiftAccountFieldMatch(name) !== null
  );
}

function isEditorFieldErrorName(name: string): name is EditorFieldErrorName {
  return name === 'digitalGift.accounts' || isKnownEditorFormFieldName(name);
}

function getDigitalGiftAccountIndexes(formData: FormData) {
  const indexes = new Set<number>();

  for (const key of formData.keys()) {
    const match = getDigitalGiftAccountFieldMatch(key);

    if (match) {
      indexes.add(Number(match[1]));
    }
  }

  return [...indexes].sort((left, right) => left - right);
}

function getDigitalGiftAccountsFromFormData(formData: FormData) {
  return getDigitalGiftAccountIndexes(formData).map((index) => ({
    accountHolder: getFormValue(formData, `digitalGift.accounts.${index}.accountHolder`),
    accountNumber: getFormValue(formData, `digitalGift.accounts.${index}.accountNumber`),
    id: getFormValue(formData, `digitalGift.accounts.${index}.id`),
    providerName: getFormValue(formData, `digitalGift.accounts.${index}.providerName`),
  }));
}

/**
 * Browser field names are deliberately enumerated. The submitted document is
 * reconstructed server-side from these known editable fields only; gallery,
 * metadata, schema version, snapshots, and any injected field cannot cross
 * this boundary. Amplop Digital accounts are limited to the three exact
 * server-recognized slot indexes used by the owner editor.
 */
export function parseInvitationEditorFormData(formData: FormData) {
  const submittedFields = [...new Set(Array.from(formData.keys()))];
  const unexpectedFields = submittedFields.filter((name) => !isKnownEditorFormFieldName(name));
  const duplicateFields = submittedFields.filter(
    (name) => isKnownEditorFormFieldName(name) && formData.getAll(name).length > 1,
  );

  if (unexpectedFields.length > 0 || duplicateFields.length > 0) {
    return {
      error: createUnexpectedFieldError([...unexpectedFields, ...duplicateFields]),
      success: false as const,
    };
  }

  return invitationEditorFormSchema.safeParse({
    content: {
      closing: {
        enabled: getCheckboxValue(formData, 'closing.enabled'),
        message: getFormValue(formData, 'closing.message'),
        signature: getFormValue(formData, 'closing.signature'),
      },
      couple: {
        personOne: {
          displayName: getFormValue(formData, 'couple.personOne.displayName'),
          fullName: getFormValue(formData, 'couple.personOne.fullName'),
          parentLine: getFormValue(formData, 'couple.personOne.parentLine'),
        },
        personTwo: {
          displayName: getFormValue(formData, 'couple.personTwo.displayName'),
          fullName: getFormValue(formData, 'couple.personTwo.fullName'),
          parentLine: getFormValue(formData, 'couple.personTwo.parentLine'),
        },
      },
      digitalGift: {
        accounts: getDigitalGiftAccountsFromFormData(formData),
        enabled: getCheckboxValue(formData, 'digitalGift.enabled'),
        heading: getFormValue(formData, 'digitalGift.heading'),
        lead: getFormValue(formData, 'digitalGift.lead'),
      },
      events: {
        ceremony: {
          date: getFormValue(formData, 'events.ceremony.date'),
          enabled: getCheckboxValue(formData, 'events.ceremony.enabled'),
          endTime: getFormValue(formData, 'events.ceremony.endTime'),
          startTime: getFormValue(formData, 'events.ceremony.startTime'),
          title: getFormValue(formData, 'events.ceremony.title'),
        },
        enabled: getCheckboxValue(formData, 'events.enabled'),
        primaryDate: getFormValue(formData, 'events.primaryDate'),
        reception: {
          date: getFormValue(formData, 'events.reception.date'),
          enabled: getCheckboxValue(formData, 'events.reception.enabled'),
          endTime: getFormValue(formData, 'events.reception.endTime'),
          startTime: getFormValue(formData, 'events.reception.startTime'),
          title: getFormValue(formData, 'events.reception.title'),
        },
      },
      hero: {
        eyebrow: getFormValue(formData, 'hero.eyebrow'),
        subtitle: getFormValue(formData, 'hero.subtitle'),
        title: getFormValue(formData, 'hero.title'),
      },
      location: {
        address: getFormValue(formData, 'location.address'),
        enabled: getCheckboxValue(formData, 'location.enabled'),
        mapsUrl: getFormValue(formData, 'location.mapsUrl'),
        venueName: getFormValue(formData, 'location.venueName'),
      },
      rsvp: {
        enabled: getCheckboxValue(formData, 'rsvp.enabled'),
        heading: getFormValue(formData, 'rsvp.heading'),
        lead: getFormValue(formData, 'rsvp.lead'),
      },
      templateKey: getFormValue(formData, 'templateKey'),
      story: {
        body: getFormValue(formData, 'story.body'),
        enabled: getCheckboxValue(formData, 'story.enabled'),
        heading: getFormValue(formData, 'story.heading'),
      },
    },
    projectId: getFormValue(formData, 'projectId'),
  });
}

function normalizeIssuePath(path: PropertyKey[]) {
  const normalized = path.map(String);
  return normalized[0] === 'content' ? normalized.slice(1) : normalized;
}

/** Converts strict Zod paths into the exact client form names used by the editor. */
export function getInvitationEditorFieldErrors(error: z.ZodError): InvitationEditorFieldErrors {
  const fieldErrors: InvitationEditorFieldErrors = {};

  for (const issue of error.issues) {
    const field = normalizeIssuePath(issue.path).join('.');
    const key = field === 'projectId' || isEditorFieldErrorName(field) ? field : 'form';

    if (!fieldErrors[key as keyof InvitationEditorFieldErrors]) {
      fieldErrors[key as keyof InvitationEditorFieldErrors] = issue.message;
    }
  }

  return fieldErrors;
}
