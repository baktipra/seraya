import { describe, expect, it } from 'vitest';

import { formatInvitationDate, formatInvitationTime } from '../invitation-date-formatters';

describe('invitation date formatters', () => {
  it('preserves a date-only calendar day through UTC-safe formatting', () => {
    expect(formatInvitationDate('2027-01-01')).toBe('1 Januari 2027');
    expect(formatInvitationDate('2027-08-17')).toBe('17 Agustus 2027');
  });

  it('does not format invalid date-only or time values', () => {
    expect(formatInvitationDate('2027-02-30')).toBeNull();
    expect(formatInvitationDate('17-08-2027')).toBeNull();
    expect(formatInvitationTime('25:10')).toBeNull();
    expect(formatInvitationTime('08:15')).toBe('08.15');
  });
});
