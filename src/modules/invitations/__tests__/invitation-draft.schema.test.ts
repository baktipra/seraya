import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '../invitation-draft.defaults';
import {
  derivePrimaryEventCompatibility,
  invitationDraftContentSchema,
  invitationDraftDocumentSchema,
  isLegacyEventScheduleDerived,
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
          ceremony: { enabled: true },
          primaryDate: '2027-08-17',
          reception: { enabled: false },
        },
        digitalGift: { accounts: [], enabled: false, heading: null, lead: null },
        eventSchedule: {
          events: [
            {
              date: '2027-08-17',
              endTime: null,
              mapsUrl: null,
              startTime: '08:00',
              title: 'Akad Nikah',
              venueAddress: null,
              venueName: null,
            },
          ],
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

  it('creates one valid default schedule event and mirrors it to the legacy primary fields', () => {
    const [event] = defaultContent.eventSchedule.events;

    expect(event).toMatchObject({
      date: '2027-08-17',
      endTime: null,
      startTime: '08:00',
      title: 'Akad Nikah',
      venueAddress: null,
      venueName: null,
    });
    expect(event?.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(defaultContent.events).toMatchObject({
      enabled: true,
      primaryDate: event?.date,
      ceremony: { date: event?.date, startTime: event?.startTime, title: event?.title },
    });
  });

  it('normalizes a legacy draft without eventSchedule into exactly one derived event', () => {
    const legacy = structuredClone(defaultContent) as Record<string, unknown>;
    delete legacy.eventSchedule;

    const parsed = invitationDraftContentSchema.parse(legacy);

    expect(parsed.eventSchedule.events).toEqual([
      expect.objectContaining({
        date: '2027-08-17',
        mapsUrl: null,
        startTime: '08:00',
        title: 'Akad Nikah',
      }),
    ]);
    expect(isLegacyEventScheduleDerived(parsed)).toBe(true);
  });

  it('rejects invalid schedule IDs, blank titles, more than four events, invalid maps URLs, and backwards end times', () => {
    const event = defaultContent.eventSchedule.events[0]!;
    const parseSchedule = (events: unknown[]) =>
      invitationDraftContentSchema.safeParse({ ...defaultContent, eventSchedule: { events } });

    expect(parseSchedule([{ ...event, id: 'bad-id' }]).success).toBe(false);
    expect(parseSchedule([{ ...event, title: '   ' }]).success).toBe(false);
    expect(
      parseSchedule(
        Array.from({ length: 5 }, (_, index) => ({
          ...event,
          id: `00000000-0000-4000-8000-00000000000${index + 1}`,
        })),
      ).success,
    ).toBe(false);
    expect(parseSchedule([{ ...event, mapsUrl: 'javascript:alert(1)' }]).success).toBe(false);
    expect(parseSchedule([{ ...event, endTime: '07:59', startTime: '08:00' }]).success).toBe(false);
  });

  it('preserves owner-defined schedule order and derives legacy primary mirrors only from the first event', () => {
    const first = {
      ...defaultContent.eventSchedule.events[0]!,
      mapsUrl: 'https://maps.example.test/akad',
      title: 'Akad Nikah',
      venueAddress: 'Jalan Mawar 1',
      venueName: 'Masjid Seraya',
    };
    const second = {
      ...first,
      date: '2027-08-18',
      id: '11111111-1111-4111-8111-111111111111',
      mapsUrl: 'https://maps.example.test/resepsi',
      title: 'Resepsi',
      venueAddress: 'Jalan Melati 2',
      venueName: 'Balai Seraya',
    };
    const parsed = invitationDraftContentSchema.parse({
      ...defaultContent,
      eventSchedule: { events: [first, second] },
    });

    expect(parsed.eventSchedule.events.map((event) => event.title)).toEqual([
      'Akad Nikah',
      'Resepsi',
    ]);
    expect(derivePrimaryEventCompatibility(parsed.eventSchedule)).toEqual({
      events: {
        ceremony: {
          date: '2027-08-17',
          enabled: true,
          endTime: null,
          startTime: '08:00',
          title: 'Akad Nikah',
        },
        enabled: true,
        primaryDate: '2027-08-17',
        reception: { date: null, enabled: false, endTime: null, startTime: null, title: null },
      },
      location: {
        address: 'Jalan Mawar 1',
        enabled: true,
        mapsUrl: 'https://maps.example.test/akad',
        venueName: 'Masjid Seraya',
      },
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
        eventSchedule: {
          events: [{ ...defaultContent.eventSchedule.events[0], date: '17-08-2027' }],
        },
      }),
      /YYYY-MM-DD/i,
    ],
    [
      'invalid time format',
      () => ({
        ...defaultContent,
        eventSchedule: {
          events: [{ ...defaultContent.eventSchedule.events[0], startTime: '7 PM' }],
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

  it('defaults a legacy draft without templateKey to Roselle and accepts all supported theme/palette pairs', () => {
    const legacy = { ...defaultContent };
    delete (legacy as Partial<typeof defaultContent>).templateKey;

    expect(invitationDraftContentSchema.parse(legacy).templateKey).toBe('roselle');
    expect(
      invitationDraftContentSchema.parse({
        ...defaultContent,
        paletteKey: 'stone',
        templateKey: 'aruna',
      }).templateKey,
    ).toBe('aruna');
    expect(
      invitationDraftContentSchema.parse({
        ...defaultContent,
        paletteKey: 'midnight',
        templateKey: 'laras',
      }).templateKey,
    ).toBe('laras');
  });

  it('rejects unsupported template keys on new draft content', () => {
    expect(() =>
      invitationDraftContentSchema.parse({ ...defaultContent, templateKey: 'unknown-template' }),
    ).toThrow(/Invalid option/i);
  });

  it('defaults Amplop Digital to disabled for new drafts and legacy documents without the section', () => {
    expect(defaultContent.digitalGift).toEqual({
      accounts: [],
      enabled: false,
      heading: null,
      lead: null,
    });

    const legacy = { ...defaultContent };
    delete (legacy as Partial<typeof defaultContent>).digitalGift;

    expect(invitationDraftContentSchema.parse(legacy).digitalGift).toEqual({
      accounts: [],
      enabled: false,
      heading: null,
      lead: null,
    });
  });

  it('normalizes valid Amplop Digital account numbers and preserves account order', () => {
    const parsed = invitationDraftContentSchema.parse({
      ...defaultContent,
      digitalGift: {
        accounts: [
          {
            accountHolder: '  Raka Pratama ',
            accountNumber: '1234 5678-9012',
            id: '11111111-1111-4111-8111-111111111111',
            providerName: ' Bank Seraya ',
          },
          {
            accountHolder: 'Nadia Pratama',
            accountNumber: '9988-7766 5544',
            id: '22222222-2222-4222-8222-222222222222',
            providerName: 'DANA',
          },
        ],
        enabled: true,
        heading: ' Amplop Digital ',
        lead: 'Terima kasih atas doa terbaik Anda.',
      },
    });

    expect(parsed.digitalGift).toEqual({
      accounts: [
        {
          accountHolder: 'Raka Pratama',
          accountNumber: '123456789012',
          id: '11111111-1111-4111-8111-111111111111',
          providerName: 'Bank Seraya',
        },
        {
          accountHolder: 'Nadia Pratama',
          accountNumber: '998877665544',
          id: '22222222-2222-4222-8222-222222222222',
          providerName: 'DANA',
        },
      ],
      enabled: true,
      heading: 'Amplop Digital',
      lead: 'Terima kasih atas doa terbaik Anda.',
    });
  });

  it('requires at least one account only when Amplop Digital is enabled', () => {
    expect(
      invitationDraftContentSchema.parse({
        ...defaultContent,
        digitalGift: { accounts: [], enabled: false, heading: null, lead: null },
      }).digitalGift,
    ).toMatchObject({ enabled: false, accounts: [] });

    expect(() =>
      invitationDraftContentSchema.parse({
        ...defaultContent,
        digitalGift: { accounts: [], enabled: true, heading: null, lead: null },
      }),
    ).toThrow(/setidaknya satu rekening/i);
  });

  it.each([
    ['letters in account number', '1234ABCD', /hanya boleh berisi angka/i],
    ['symbols in account number', '1234/5678', /hanya boleh berisi angka/i],
    ['tab in account number', '1234\t5678', /hanya boleh berisi angka/i],
    ['too short account number', '12345', /6 sampai 30 angka/i],
    ['too long account number', '1234567890123456789012345678901', /6 sampai 30 angka/i],
  ])('rejects %s', (_label, accountNumber, message) => {
    expect(() =>
      invitationDraftContentSchema.parse({
        ...defaultContent,
        digitalGift: {
          accounts: [
            {
              accountHolder: 'Raka Pratama',
              accountNumber,
              id: '11111111-1111-4111-8111-111111111111',
              providerName: 'Bank Seraya',
            },
          ],
          enabled: true,
          heading: null,
          lead: null,
        },
      }),
    ).toThrow(message);
  });

  it('rejects raw HTML, unknown account fields, and more than three Amplop Digital accounts', () => {
    const account = {
      accountHolder: 'Raka Pratama',
      accountNumber: '123456789012',
      id: '11111111-1111-4111-8111-111111111111',
      providerName: 'Bank Seraya',
    };

    expect(() =>
      invitationDraftContentSchema.parse({
        ...defaultContent,
        digitalGift: { accounts: [account], enabled: true, heading: '<b>Amplop</b>', lead: null },
      }),
    ).toThrow(/HTML/i);

    expect(() =>
      invitationDraftContentSchema.parse({
        ...defaultContent,
        digitalGift: {
          accounts: [{ ...account, providerName: '<b>Bank</b>' }],
          enabled: true,
          heading: null,
          lead: null,
        },
      }),
    ).toThrow(/HTML/i);

    expect(() =>
      invitationDraftContentSchema.parse({
        ...defaultContent,
        digitalGift: {
          accounts: [{ ...account, accountHolder: '<b>Raka</b>' }],
          enabled: true,
          heading: null,
          lead: null,
        },
      }),
    ).toThrow(/HTML/i);

    expect(() =>
      invitationDraftContentSchema.parse({
        ...defaultContent,
        digitalGift: {
          accounts: [account],
          enabled: true,
          heading: null,
          lead: '<b>Doa</b>',
        },
      }),
    ).toThrow(/HTML/i);

    expect(() =>
      invitationDraftContentSchema.parse({
        ...defaultContent,
        digitalGift: {
          accounts: [{ ...account, unexpected: true }],
          enabled: true,
          heading: null,
          lead: null,
        },
      }),
    ).toThrow(/unrecognized key/i);

    expect(() =>
      invitationDraftContentSchema.parse({
        ...defaultContent,
        digitalGift: {
          accounts: [
            account,
            { ...account, id: '22222222-2222-4222-8222-222222222222' },
            { ...account, id: '33333333-3333-4333-8333-333333333333' },
            { ...account, id: '44444444-4444-4444-8444-444444444444' },
          ],
          enabled: true,
          heading: null,
          lead: null,
        },
      }),
    ).toThrow(/Maksimal tiga/i);
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
