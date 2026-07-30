import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const repository = read('src/modules/readiness/wedding-readiness.repository.ts');
const service = read('src/modules/readiness/wedding-readiness.service.ts');
const invitationRoute = read('src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx');

const repositoryProjectionCount = (repository.match(/\.from\(/g) ?? []).length;
const result = {
  audit: 'P0-A4 Readiness Aggregation Recovery V1',
  fullReadiness: {
    composesBoundariesInParallel:
      service.includes('getInvitationReadinessForVerifiedProject(project)') &&
      service.includes('getWeddingReadinessAggregateCountsForVerifiedProject(project)'),
  },
  invitationBoundary: {
    excludesOperationalAggregate: !invitationRoute.includes(
      'getWeddingReadinessForVerifiedProject',
    ),
    reusesEditorDraft:
      invitationRoute.includes('getInvitationReadinessForVerifiedProject(project, {') &&
      invitationRoute.includes('draft: editor.draft'),
  },
  repository: {
    minimumProjectionCount: repository.includes('minimumQueryCount: 3'),
    paginatesGuestAndLinkRows:
      (repository.match(/\.range\(from, from \+ readinessPageSize - 1\)/g) ?? []).length === 2,
    projectionCount: repositoryProjectionCount,
    scalarGuestProjection: repository.includes(
      ".select('id, whatsapp_phone_e164, rsvp_status, rsvp_attendee_count')",
    ),
  },
};

const failures = [];
if (repositoryProjectionCount !== 3) {
  failures.push(`Expected three static readiness projections, found ${repositoryProjectionCount}.`);
}
if (!result.repository.minimumProjectionCount) {
  failures.push('Readiness timing does not declare the three-projection minimum.');
}
if (!result.repository.paginatesGuestAndLinkRows) {
  failures.push('Guest and guest-link scalar projections are not explicitly paginated.');
}
if (!result.repository.scalarGuestProjection) {
  failures.push('The consolidated active-guest scalar projection is missing.');
}
if (!result.invitationBoundary.excludesOperationalAggregate) {
  failures.push('The invitation route still loads full operational readiness.');
}
if (!result.invitationBoundary.reusesEditorDraft) {
  failures.push('The invitation route does not reuse its already-loaded active draft.');
}
if (!result.fullReadiness.composesBoundariesInParallel) {
  failures.push(
    'Full readiness does not compose invitation and operational boundaries in parallel.',
  );
}

console.log(
  JSON.stringify({ ...result, failures, status: failures.length ? 'failed' : 'pass' }, null, 2),
);

if (failures.length) process.exitCode = 1;
