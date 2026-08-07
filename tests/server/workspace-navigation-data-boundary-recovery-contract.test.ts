import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const layout = read('src/app/(dashboard)/dashboard/[projectId]/layout.tsx');
const loading = read('src/app/(dashboard)/dashboard/[projectId]/loading.tsx');
const invitation = read('src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx');
const delivery = read('src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx');
const navigation = read('src/components/dashboard/project-navigation.tsx');
const navigationCss = read('src/components/dashboard/project-navigation.module.css');
const invitationEditor = read('src/components/projects/invitation-editor.tsx');
const invitationFields = read('src/components/projects/invitation-editor-fields.tsx');
const invitationWorkspace = read('src/components/projects/invitation-editor-workspace.tsx');
const responsiveCss = read('src/app/workspace-responsive.css');
const shellService = read('src/modules/projects/project-shell.service.ts');

describe('P0-A2/A3 navigation and data-boundary recovery contract', () => {
  it('keeps the project shell owner-verified without loading full readiness', () => {
    expect(layout).toContain('getProjectShellForRequest');
    expect(layout).toContain("operation: 'project-shell-identity'");
    expect(layout).not.toContain('getWeddingReadinessForRequest');
    expect(layout).not.toContain('getWeddingReadinessForVerifiedProject');

    expect(shellService).toContain('getOwnedProjectContextForRequest');
    expect(shellService).toContain('getProjectCoupleLabel');
    expect(shellService).not.toContain('/readiness');
    expect(shellService).not.toContain('/payments');
    expect(shellService).not.toContain('/publications');
    expect(shellService).not.toContain('/guests');
    expect(shellService).not.toContain('guestbook');
  });

  it('prefetches canonical workspaces and exposes immediate pending state', () => {
    expect(navigation).toContain('prefetch\n    >');
    expect(navigation).toContain('data-workspace-navigation-pending');
    expect(navigation).toContain('setPendingHref(String(item.href))');
    expect(navigation).toContain('Membuka halaman');
    expect(navigation).toContain('aria-busy={pending || undefined}');
    expect(loading).toContain('data-workspace-route-loading');
    expect(loading).toContain('Navigasi proyek tetap tersedia.');
  });

  it('keeps the V3 mobile project context sticky and the drawer above content', () => {
    expect(navigation).toContain('data-project-mobile-context');
    expect(navigation).toContain('className={styles.mobileOverlay}');
    expect(navigation).toContain('className={styles.mobileDrawer}');
    expect(navigationCss).toContain('.mobileContext {');
    expect(navigationCss).toContain('top: var(--seraya-topbar-height);');
    expect(navigationCss).toContain('z-index: 50;');
    expect(navigationCss).toContain('.mobileOverlay {');
    expect(navigationCss).toContain('z-index: 140;');
    expect(responsiveCss).toContain('[data-project-workspace-main]');
  });

  it('contains the invitation editor within the mobile inline size', () => {
    expect(invitationEditor).toContain('className="grid max-w-full min-w-0 scroll-mt-24 gap-4');
    expect(invitationEditor).toContain('max-w-full min-w-0 overflow-x-clip');
    expect(invitationWorkspace).toContain('w-auto max-w-full min-w-0 overflow-x-hidden');
    expect(invitationWorkspace).toContain('className="max-w-full min-w-0"');
    expect(invitationFields).toContain(
      'bg-seraya-canvas max-w-full min-w-0 rounded-[var(--seraya-radius-lg)]',
    );
    expect(invitationFields).toContain('grid max-w-full min-w-0 gap-4');
  });

  it('reuses verified project context in the invitation readiness composition', () => {
    expect(invitation).toContain('getOwnedProjectContextForRequest');
    expect(invitation).toContain('getInvitationReadinessForVerifiedProject(project, {');
    expect(invitation).toContain('draft: editor.draft');
    expect(invitation).not.toContain('getWeddingReadinessForRequest');
    expect(invitation).not.toContain('getWeddingReadinessForVerifiedProject');
  });

  it('uses a bounded public-share publication gate before loading Bagikan distribution data', () => {
    const publicationGate = delivery.indexOf('getPublicSocialShareForVerifiedProject(project)');
    const deliveryRead = delivery.indexOf('getGuestDistributionCenterForVerifiedProject(project)');

    expect(publicationGate).toBeGreaterThan(-1);
    expect(deliveryRead).toBeGreaterThan(publicationGate);
    expect(delivery).not.toContain('getWeddingReadinessForRequest');
    expect(delivery).not.toContain('getWeddingReadinessForVerifiedProject');
  });
});
