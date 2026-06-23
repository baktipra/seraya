import { z } from 'zod';

const databaseUuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const projectIdSchema = z.string().regex(databaseUuidShape, 'Project tidak valid.');
const formTextSchema = z.string();
const checkboxInputSchema = z
  .union([z.literal('true'), z.literal(false)])
  .transform((value) => value === 'true');

const editorFormFieldNames = [
  'projectId',
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
  'closing.enabled',
  'closing.message',
  'closing.signature',
] as const;

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

export type InvitationEditorFieldErrors = Partial<
  Record<(typeof editorFormFieldNames)[number] | 'form', string>
>;

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

/**
 * Browser field names are deliberately enumerated. The submitted document is
 * reconstructed server-side from these known editable fields only; gallery,
 * metadata, schema version, snapshots, and any injected field cannot cross
 * this boundary.
 */
export function parseInvitationEditorFormData(formData: FormData) {
  const knownFields = new Set<string>(editorFormFieldNames);
  const submittedFields = [...new Set(Array.from(formData.keys()))];
  const unexpectedFields = submittedFields.filter((name) => !knownFields.has(name));
  const duplicateFields = editorFormFieldNames.filter((name) => formData.getAll(name).length > 1);

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
    const key =
      field === 'projectId' || (editorFormFieldNames as readonly string[]).includes(field)
        ? field
        : 'form';

    if (!fieldErrors[key as keyof InvitationEditorFieldErrors]) {
      fieldErrors[key as keyof InvitationEditorFieldErrors] = issue.message;
    }
  }

  return fieldErrors;
}
