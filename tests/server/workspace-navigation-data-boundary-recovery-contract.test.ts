import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const layout = read('src/app/(dashboard)/dashboard/[projectId]/layout.tsx');
const loading = read('src/app/(dashboard)/dashboard/[projectId]/loading.tsx');
const invitation = read('src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx');
const delivery = read('src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx');
const navigation = read('src/components/dashboard/project-navigation.tsx');
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

  it('keeps mobile navigation above content with reserved clearance', () => {
    expect(navigation).toContain('data-project-mobile-navigation');
    expect(responsiveCss).toContain('[data-project-workspace-shell] {\n  isolation: isolate;');
    expect(responsiveCss).toContain(
      '[data-project-workspace-main] {\n  position: relative;\n  z-index: 0;',
    );
    expect(responsiveCss).toContain(
      '[data-project-mobile-navigation] {\n  position: fixed;\n  z-index: 100;\n  pointer-events: auto;',
    );
    expect(responsiveCss).toContain('padding-bottom: calc(var(--seraya-mobile-safe-bottom)');
  });

  it('reuses verified project context in the invitation readiness composition', () => {
    expect(invitation).toContain('getOwnedProjectContextForRequest');
    expect(invitation).toContain('getWeddingReadinessForVerifiedProject(project)');
    expect(invitation).not.toContain('getWeddingReadinessForRequest');
  });

  it('uses a bounded publication gate before loading Bagikan data', () => {
    const publicationGate = delivery.indexOf('getCurrentPublishedInvitationForVerifiedProject');
    const deliveryRead = delivery.indexOf('getGuestDeliveryCenterForVerifiedProject(project)');

    expect(publicationGate).toBeGreaterThan(-1);
    expect(deliveryRead).toBeGreaterThan(publicationGate);
    expect(delivery).not.toContain('getWeddingReadinessForRequest');
    expect(delivery).not.toContain('getWeddingReadinessForVerifiedProject');
  });
});
