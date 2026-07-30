import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const invitationRoute = read('src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx');
const readinessRepository = read('src/modules/readiness/wedding-readiness.repository.ts');
const readinessService = read('src/modules/readiness/wedding-readiness.service.ts');
const packageJson = read('package.json');

describe('P0-A4 readiness aggregation recovery contract', () => {
  it('reduces the typical aggregate batch from nine queries to three paginated projections', () => {
    expect(readinessRepository.match(/\.from\(/g)).toHaveLength(3);
    expect(readinessRepository).toContain('minimumQueryCount: 3');
    expect(readinessRepository).toContain(
      ".select('id, whatsapp_phone_e164, rsvp_status, rsvp_attendee_count')",
    );
    expect(
      readinessRepository.match(/\.range\(from, from \+ readinessPageSize - 1\)/g),
    ).toHaveLength(2);
    expect(readinessRepository).toContain(".from('guest_links')");
    expect(readinessRepository).toContain(".from('guestbook_entries')");
    expect(readinessRepository).not.toContain('token_hash');
  });

  it('keeps invitation-only readiness free of guest, RSVP, Guestbook, and delivery aggregates', () => {
    expect(readinessService).toContain('getInvitationReadinessForVerifiedProject');
    expect(invitationRoute).toContain(
      'getInvitationReadinessForVerifiedProject(project, { draft: editor.draft })',
    );
    expect(invitationRoute).not.toContain('getWeddingReadinessForVerifiedProject');
    expect(invitationRoute).not.toContain('getWeddingReadinessAggregateCountsForVerifiedProject');
  });

  it('keeps full project readiness composed from separated boundaries', () => {
    expect(readinessService).toContain('getInvitationReadinessForVerifiedProject(project)');
    expect(readinessService).toContain(
      'getWeddingReadinessAggregateCountsForVerifiedProject(project)',
    );
    expect(readinessService).toContain('const [invitationReadiness, totals] = await Promise.all([');
  });

  it('executes the repeatable A4 repository audit', () => {
    expect(packageJson).toContain('audit:p0-a4:readiness');

    const output = execFileSync(
      process.execPath,
      ['scripts/audit-readiness-aggregation-recovery.mjs'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output) as { status: string };

    expect(result.status).toBe('pass');
  });
});
