import { describe, expect, it } from 'vitest';

import { guestInputSchema, parseCreateGuestFormData } from '../guest.schema';

describe('SRY-012 guest validation contract', () => {
  it('normalizes an empty group label to null while preserving valid guest data', () => {
    expect(
      guestInputSchema.parse({
        displayName: '  Keluarga Budi  ',
        groupLabel: '   ',
        partySize: '2',
      }),
    ).toEqual({
      displayName: 'Keluarga Budi',
      groupLabel: null,
      partySize: 2,
    });
  });

  it.each([
    ['empty guest name', { displayName: '   ', groupLabel: null, partySize: 1 }],
    ['zero party size', { displayName: 'Budi', groupLabel: null, partySize: 0 }],
    ['too-large party size', { displayName: 'Budi', groupLabel: null, partySize: 21 }],
    ['non-integer party size', { displayName: 'Budi', groupLabel: null, partySize: '1.5' }],
    ['raw HTML guest name', { displayName: '<b>Budi</b>', groupLabel: null, partySize: 1 }],
    ['raw HTML group label', { displayName: 'Budi', groupLabel: '<!-- friends -->', partySize: 1 }],
  ])('rejects %s with a human-safe validation error', (_label, input) => {
    const parsed = guestInputSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('parses browser form data without accepting account identity from payload', () => {
    const formData = new FormData();
    formData.set('projectId', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    formData.set('displayName', 'Rani');
    formData.set('groupLabel', 'Teman');
    formData.set('partySize', '3');
    formData.set('accountId', 'attacker-controlled');

    const parsed = parseCreateGuestFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        displayName: 'Rani',
        groupLabel: 'Teman',
        partySize: 3,
        projectId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      });
      expect(parsed.data).not.toHaveProperty('accountId');
    }
  });
});
