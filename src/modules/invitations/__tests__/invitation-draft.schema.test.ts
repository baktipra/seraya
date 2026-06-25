import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '../invitation-draft.defaults';
import {
  invitationDraftContentSchema,
  invitationDraftDocumentSchema,
} from '../invitation-draft.schema';

describe('SRY-006 invitation draft V1 content contract', () => {
  const defaultContent = createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-08-17',
    person_one_name: 'Raka',
    person_two_name: 'Nadia',
  });

  it('creates a valid default document from project facts without fake content', () => {
    expect(
      invitationDraftDocumentSchema.parse({
        content: defaultContent,
        schemaVersion: 1,
      }),
    ).toMatchObject({
      content: {
        couple: {
          personOne: { displayName: 'Raka', fullName: null, parentLine: null },
          personTwo: { displayName: 'Nadia', fullName: null, parentLine: null },
        },
        events: {
          ceremony: { enabled: false },
          primaryDate: '2027-08-17',
          reception: { enabled: false },
        },
        gallery: { enabled: false, imageIds: [] },
        hero: { eyebrow: 'The Wedding Of', subtitle: null, title: 'Raka & Nadia' },
        location: { address: null, enabled: false, mapsUrl: null, venueName: null },
        meta: { locale: 'id-ID', timezone: 'Asia/Jakarta' },
        rsvp: { enabled: true, heading: null, lead: null },
        story: { body: null, enabled: false, heading: null },
      },
      schemaVersion: 1,
    });
  });

  it('normalizes optional whitespace-only fields to null while trimming valid text', () => {
    const parsed = invitationDraftContentSchema.parse({
      ...defaultContent,
      hero: {
        ...defaultContent.hero,
        eyebrow: '  Selamat Datang  ',
        subtitle: '   ',
      },
    });

    expect(parsed.hero).toEqual({
      eyebrow: 'Selamat Datang',
      subtitle: null,
      title: 'Raka & Nadia',
    });
  });

  it.each([
    ['unknown top-level key', () => ({ ...defaultContent, unexpected: true }), /unrecognized key/i],
    [
      'bad URL',
      () => ({
        ...defaultContent,
        location: { ...defaultContent.location, mapsUrl: 'not-a-url' },
      }),
      /URL yang valid/i,
    ],
    [
      'javascript URL',
      () => ({
        ...defaultContent,
        location: { ...defaultContent.location, mapsUrl: 'javascript:alert(1)' },
      }),
      /HTTPS/i,
    ],
    [
      'raw HTML in URL query',
      () => ({
        ...defaultContent,
        location: {
          ...defaultContent.location,
          mapsUrl: 'https://example.com/?q=<script>alert(1)</script>',
        },
      }),
      /HTML/i,
    ],
    [
      'raw HTML tag in URL path',
      () => ({
        ...defaultContent,
        location: { ...defaultContent.location, mapsUrl: 'https://example.com/<b>venue</b>' },
      }),
      /HTML/i,
    ],
    [
      'HTML comment embedded in URL',
      () => ({
        ...defaultContent,
        location: { ...defaultContent.location, mapsUrl: 'https://example.com/<!--venue-->' },
      }),
      /HTML/i,
    ],
    [
      'invalid date format',
      () => ({
        ...defaultContent,
        events: { ...defaultContent.events, primaryDate: '17-08-2027' },
      }),
      /YYYY-MM-DD/i,
    ],
    [
      'invalid time format',
      () => ({
        ...defaultContent,
        events: {
          ...defaultContent.events,
          ceremony: { ...defaultContent.events.ceremony, startTime: '7 PM' },
        },
      }),
      /HH:mm/i,
    ],
    [
      'invalid gallery image id',
      () => ({
        ...defaultContent,
        gallery: { ...defaultContent.gallery, imageIds: ['not-a-uuid'] },
      }),
      /UUID/i,
    ],
    [
      'raw HTML content',
      () => ({ ...defaultContent, hero: { ...defaultContent.hero, title: '<b>Raka</b>' } }),
      /HTML/i,
    ],
  ])('rejects %s', (_label, createInvalidContent, message) => {
    expect(() => invitationDraftContentSchema.parse(createInvalidContent())).toThrow(message);
  });

  it('accepts a valid HTTPS Google Maps URL', () => {
    const parsed = invitationDraftContentSchema.parse({
      ...defaultContent,
      location: {
        ...defaultContent.location,
        mapsUrl: 'https://www.google.com/maps?q=Jakarta',
      },
    });

    expect(parsed.location.mapsUrl).toBe('https://www.google.com/maps?q=Jakarta');
  });

  it('normalizes whitespace-only maps URL to null', () => {
    const parsed = invitationDraftContentSchema.parse({
      ...defaultContent,
      location: { ...defaultContent.location, mapsUrl: '   ' },
    });

    expect(parsed.location.mapsUrl).toBeNull();
  });

  it('defaults a legacy draft without templateKey to Roselle and accepts all supported keys', () => {
    const legacy = { ...defaultContent };
    delete (legacy as Partial<typeof defaultContent>).templateKey;

    expect(invitationDraftContentSchema.parse(legacy).templateKey).toBe('roselle');
    expect(
      invitationDraftContentSchema.parse({ ...defaultContent, templateKey: 'aruna' }).templateKey,
    ).toBe('aruna');
    expect(
      invitationDraftContentSchema.parse({ ...defaultContent, templateKey: 'laras' }).templateKey,
    ).toBe('laras');
  });

  it('rejects unsupported template keys on new draft content', () => {
    expect(() =>
      invitationDraftContentSchema.parse({ ...defaultContent, templateKey: 'unknown-template' }),
    ).toThrow(/Invalid option/i);
  });

  it('rejects schema versions other than V1', () => {
    expect(() =>
      invitationDraftDocumentSchema.parse({
        content: defaultContent,
        schemaVersion: 2,
      }),
    ).toThrow(/Invalid input/i);
  });
});
