import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('SRY-028 Guest Manager RSVP attendance display', () => {
  it('renders factual confirmed and legacy unknown attendance descriptions without adding an owner RSVP mutation', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/guest-manager.tsx'),
      'utf8',
    );

    expect(source).toContain('Hadir — ${guest.rsvp_attendee_count} dari ${guest.party_size} orang');
    expect(source).toContain('Hadir — jumlah belum dikonfirmasi');
    expect(source).not.toContain('name="rsvpStatus"');
    expect(source).not.toContain('name="rsvpAttendeeCount"');
    expect(source).not.toContain('token_hash');
  });
});
