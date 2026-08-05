import { z } from 'zod';

import { isInvitationThemePaletteKey } from '@/modules/invitation-templates/core/theme-package.registry';
import { INVITATION_TEMPLATE_KEYS } from '@/modules/invitation-templates/invitation-template.keys';

const databaseUuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const digitalGiftAccountMaximum = 3 as const;
const eventScheduleMaximum = 4 as const;
export const invitationEditorPayloadFieldName = 'editorPayload' as const;
const invitationEditorPayloadMaximumCharacters = 65_536 as const;
const digitalGiftAccountInputKeys = [
  'id',
  'providerName',
  'accountHolder',
  'accountNumber',
] as const;
const eventScheduleEventInputKeys = [
  'id',
  'title',
  'date',
  'startTime',
  'endTime',
  'venueName',
  'venueAddress',
  'mapsUrl',
] as const;

const projectIdSchema = z.string().regex(databaseUuidShape, 'Project tidak valid.');
const formTextSchema = z.string();
const checkboxInputSchema = z
  .union([z.literal('true'), z.literal(false)])
  .transform((value) => value === 'true');

const baseEditorFormFieldNames = [
  'projectId',
  'templateKey',
  'paletteKey',
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
type EventScheduleEventIndex = 0 | 1 | 2 | 3;
type EventScheduleEventInputKey = (typeof eventScheduleEventInputKeys)[number];
type EventScheduleEventFieldName =
  `eventSchedule.events.${EventScheduleEventIndex}.${EventScheduleEventInputKey}`;
type EditorFormFieldName =
  | (typeof baseEditorFormFieldNames)[number]
  | DigitalGiftAccountFieldName
  | EventScheduleEventFieldName;
type EditorFieldErrorName = EditorFormFieldName | 'digitalGift.accounts' | 'eventSchedule.events';

const digitalGiftAccountFieldPattern = new RegExp(
  `^digitalGift\\.accounts\\.([0-${digitalGiftAccountMaximum - 1}])\\.(${digitalGiftAccountInputKeys.join('|')})$`,
);
const eventScheduleEventFieldPattern = new RegExp(
  `^eventSchedule\\.events\\.([0-${eventScheduleMaximum - 1}])\\.(${eventScheduleEventInputKeys.join('|')})$`,
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
        eventSchedule: z
          .object({
            events: z
              .array(
                z
                  .object({
                    arrivalNote: formTextSchema.optional(),
                    countdownEnabled: checkboxInputSchema.optional(),
                    date: formTextSchema,
                    endTime: formTextSchema,
                    id: z.string().regex(databaseUuidShape, 'ID acara tidak valid.'),
                    latitude: formTextSchema.optional(),
                    livestreamEnabled: checkboxInputSchema.optional(),
                    livestreamHeading: formTextSchema.optional(),
                    livestreamUrl: formTextSchema.optional(),
                    locationSource: formTextSchema.optional(),
                    longitude: formTextSchema.optional(),
                    mapsUrl: formTextSchema,
                    placeId: formTextSchema.optional(),
                    startTime: formTextSchema,
                    title: formTextSchema,
                    venueAddress: formTextSchema,
                    venueName: formTextSchema,
                  })
                  .strict(),
              )
              .min(1)
              .max(eventScheduleMaximum),
          })
          .strict(),
        hero: z
          .object({
            eyebrow: formTextSchema,
            subtitle: formTextSchema,
            title: formTextSchema,
          })
          .strict(),
        rsvp: z
          .object({
            enabled: checkboxInputSchema,
            heading: formTextSchema,
            lead: formTextSchema,
          })
          .strict(),
        paletteKey: formTextSchema.optional(),
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
  .strict()
  .superRefine((value, context) => {
    if (
      value.content.paletteKey !== undefined &&
      !isInvitationThemePaletteKey(value.content.templateKey, value.content.paletteKey)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Palet tidak tersedia untuk desain yang dipilih.',
        path: ['content', 'paletteKey'],
      });
    }
  });

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

function normalizeRuntimePayloadValue(value: unknown): unknown {
  if (value === null) {
    return '';
  }

  if (value === true) {
    return 'true';
  }

  if (Array.isArray(value)) {
    return value.map(normalizeRuntimePayloadValue);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeRuntimePayloadValue(entry)]),
    );
  }

  return value;
}

function getDigitalGiftAccountFieldMatch(name: string) {
  return digitalGiftAccountFieldPattern.exec(name);
}

function getEventScheduleEventFieldMatch(name: string) {
  return eventScheduleEventFieldPattern.exec(name);
}

function isKnownEditorFormFieldName(name: string): name is EditorFormFieldName {
  return (
    (baseEditorFormFieldNames as readonly string[]).includes(name) ||
    getDigitalGiftAccountFieldMatch(name) !== null ||
    getEventScheduleEventFieldMatch(name) !== null
  );
}

function isAllowedSubmittedFieldName(name: string) {
  return name === invitationEditorPayloadFieldName || isKnownEditorFormFieldName(name);
}

function isEditorFieldErrorName(name: string): name is EditorFieldErrorName {
  return (
    name === 'digitalGift.accounts' ||
    name === 'eventSchedule.events' ||
    isKnownEditorFormFieldName(name)
  );
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

function getEventScheduleEventIndexes(formData: FormData) {
  const indexes = new Set<number>();

  for (const key of formData.keys()) {
    const match = getEventScheduleEventFieldMatch(key);

    if (match) {
      indexes.add(Number(match[1]));
    }
  }

  return [...indexes].sort((left, right) => left - right);
}

function hasContiguousIndexes(indexes: number[]) {
  return indexes.every((index, position) => index === position);
}

function getDigitalGiftAccountsFromFormData(formData: FormData) {
  return getDigitalGiftAccountIndexes(formData).map((index) => ({
    accountHolder: getFormValue(formData, `digitalGift.accounts.${index}.accountHolder`),
    accountNumber: getFormValue(formData, `digitalGift.accounts.${index}.accountNumber`),
    id: getFormValue(formData, `digitalGift.accounts.${index}.id`),
    providerName: getFormValue(formData, `digitalGift.accounts.${index}.providerName`),
  }));
}

function getEventScheduleEventsFromFormData(formData: FormData) {
  return getEventScheduleEventIndexes(formData).map((index) => ({
    date: getFormValue(formData, `eventSchedule.events.${index}.date`),
    endTime: getFormValue(formData, `eventSchedule.events.${index}.endTime`),
    id: getFormValue(formData, `eventSchedule.events.${index}.id`),
    mapsUrl: getFormValue(formData, `eventSchedule.events.${index}.mapsUrl`),
    startTime: getFormValue(formData, `eventSchedule.events.${index}.startTime`),
    title: getFormValue(formData, `eventSchedule.events.${index}.title`),
    venueAddress: getFormValue(formData, `eventSchedule.events.${index}.venueAddress`),
    venueName: getFormValue(formData, `eventSchedule.events.${index}.venueName`),
  }));
}

/**
 * Browser field names are deliberately enumerated. The runtime editor submits
 * one strict JSON payload so non-visible chapters can stay unmounted; legacy
 * field-by-field submissions remain supported for the existing no-ambiguity
 * boundary. Gallery, metadata, compatibility mirrors, snapshots, and injected
 * fields cannot cross either path. Amplop Digital accounts use three exact
 * slots and schedule events use four exact slots.
 */
export function parseInvitationEditorFormData(formData: FormData) {
  const submittedFields = [...new Set(Array.from(formData.keys()))];
  const unexpectedFields = submittedFields.filter((name) => !isAllowedSubmittedFieldName(name));
  const duplicateFields = submittedFields.filter(
    (name) => isAllowedSubmittedFieldName(name) && formData.getAll(name).length > 1,
  );
  const payload = formData.get(invitationEditorPayloadFieldName);

  if (unexpectedFields.length > 0 || duplicateFields.length > 0) {
    return {
      error: createUnexpectedFieldError([...unexpectedFields, ...duplicateFields]),
      success: false as const,
    };
  }

  if (payload !== null) {
    if (
      typeof payload !== 'string' ||
      payload.length === 0 ||
      payload.length > invitationEditorPayloadMaximumCharacters
    ) {
      return {
        error: createUnexpectedFieldError([invitationEditorPayloadFieldName]),
        success: false as const,
      };
    }

    try {
      return invitationEditorFormSchema.safeParse({
        content: normalizeRuntimePayloadValue(JSON.parse(payload) as unknown),
        projectId: getFormValue(formData, 'projectId'),
      });
    } catch {
      return {
        error: createUnexpectedFieldError([invitationEditorPayloadFieldName]),
        success: false as const,
      };
    }
  }

  const eventIndexes = getEventScheduleEventIndexes(formData);

  if (!hasContiguousIndexes(eventIndexes)) {
    return {
      error: createUnexpectedFieldError(['eventSchedule.events']),
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
      eventSchedule: {
        events: getEventScheduleEventsFromFormData(formData),
      },
      hero: {
        eyebrow: getFormValue(formData, 'hero.eyebrow'),
        subtitle: getFormValue(formData, 'hero.subtitle'),
        title: getFormValue(formData, 'hero.title'),
      },
      rsvp: {
        enabled: getCheckboxValue(formData, 'rsvp.enabled'),
        heading: getFormValue(formData, 'rsvp.heading'),
        lead: getFormValue(formData, 'rsvp.lead'),
      },
      paletteKey: getFormValue(formData, 'paletteKey') ?? undefined,
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
function flattenValidationIssues(issues: z.ZodIssue[]): z.ZodIssue[] {
  return issues.flatMap((issue) => {
    if (issue.code === 'invalid_union') {
      // The first union branch is the strict modern draft contract. Prefer its
      // concrete paths so owners receive field-level schedule feedback rather
      // than an opaque union error when a new schedule is invalid.
      return issue.errors[0] ? flattenValidationIssues(issue.errors[0] as z.ZodIssue[]) : [issue];
    }

    return [issue];
  });
}

export function getInvitationEditorFieldErrors(error: z.ZodError): InvitationEditorFieldErrors {
  const fieldErrors: InvitationEditorFieldErrors = {};

  for (const issue of flattenValidationIssues(error.issues)) {
    const field = normalizeIssuePath(issue.path).join('.');
    const key = field === 'projectId' || isEditorFieldErrorName(field) ? field : 'form';

    if (!fieldErrors[key as keyof InvitationEditorFieldErrors]) {
      fieldErrors[key as keyof InvitationEditorFieldErrors] =
        issue.code === 'unrecognized_keys' ? 'Form undangan tidak valid.' : issue.message;
    }
  }

  return fieldErrors;
}
