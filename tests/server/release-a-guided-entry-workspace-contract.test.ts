import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Release A guided entry and workspace contract', () => {
  it('keeps project creation as a three-step registry-driven theme journey', () => {
    const setupSource = readSource('src/components/projects/project-setup-form.tsx');
    const registrySource = readSource(
      'src/modules/invitation-templates/core/theme-package.registry.ts',
    );
    const schemaSource = readSource('src/modules/projects/create-project.schema.ts');
    const serviceSource = readSource('src/modules/projects/create-project.service.ts');

    expect(setupSource).toContain('Tentang kalian');
    expect(setupSource).toContain('Pilih pengalaman');
    expect(setupSource).toContain('Buat draf');
    expect(setupSource).toContain('invitationThemePackages.map');
    expect(setupSource).toContain('getDefaultInvitationThemePalette');
    expect(setupSource).not.toContain("key: 'roselle'");
    expect(setupSource).not.toContain("key: 'aruna'");
    expect(setupSource).not.toContain("key: 'laras'");
    expect(setupSource).toContain('name="templateKey"');

    expect(registrySource).toContain('roselle: roselleThemePackage');
    expect(registrySource).toContain('aruna: arunaThemePackage');
    expect(registrySource).toContain('laras: larasThemePackage');
    expect(registrySource).toContain('Object.keys(invitationThemePackageRegistry)');

    expect(schemaSource).toContain('templateKey: z.enum(INVITATION_TEMPLATE_KEYS');
    expect(serviceSource).toContain('updateActiveInvitationDraftForVerifiedProject');
    expect(serviceSource).toContain('templateKey: input.templateKey');
  });

  it('keeps the owner workspace on the canonical five destinations and current legacy aliases', () => {
    const navigationSource = readSource('src/components/dashboard/project-navigation.tsx');
    const shellSource = readSource('src/components/dashboard/dashboard-shell.tsx');

    for (const label of ['Ringkasan', 'Undangan', 'Tamu', 'Bagikan', 'Respons Tamu']) {
      expect(navigationSource).toContain(`label: '${label}'`);
    }

    expect(navigationSource).not.toContain("label: 'Tindak Lanjut'");
    expect(navigationSource).toContain('aliases: [`${base}/share`]');
    expect(navigationSource).toContain('aliases: [`${base}/guestbook`, `${base}/follow-up`]');
    expect(shellSource).not.toContain("[aria-label^='Project ']");
    expect(shellSource).not.toContain('<style>');
  });
});
