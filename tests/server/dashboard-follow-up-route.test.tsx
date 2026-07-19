import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const routePath = 'src/app/(dashboard)/dashboard/[projectId]/follow-up/page.tsx';

describe('private Follow-up route', () => {
  it('stays dynamic and binds only RSVP or event reminder actions', async () => {
    const route = await readFile(path.resolve(process.cwd(), routePath), 'utf8');

    expect(route).toContain("export const dynamic = 'force-dynamic'");
    expect(route).toContain("export const fetchCache = 'force-no-store'");
    expect(route).toContain('getOwnedProjectContextForRequest');
    expect(route).toContain('CanonicalGuestFollowUpCenter');
    expect(route).toContain('canPrepareEventReminder || row.eligibility.canPrepareRsvpReminder');
    expect(route).not.toContain('canPrepareInitialInvitation ||');
    expect(route).not.toContain('createAdminSupabaseClient');
  });
});
