import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Release A guided entry and workspace contract', () => {
  it('keeps project creation as a three-step flagship collection journey', () => {
    const setupSource = readSource('src/components/projects/project-setup-form.tsx');
    const schemaSource = readSource('src/modules/projects/create-project.schema.ts');
    const serviceSource = readSource('src/modules/projects/create-project.service.ts');

    expect(setupSource).toContain('Tentang kalian');
    expect(setupSource).toContain('Pilih pengalaman');
    expect(setupSource).toContain('Buat draf');
    expect(setupSource).toContain("key: 'roselle'");
    expect(setupSource).toContain("key: 'aruna'");
    expect(setupSource).toContain("key: 'laras'");
    expect(setupSource).toContain('name="templateKey"');
    expect(schemaSource).toContain('templateKey: z.enum(INVITATION_TEMPLATE_KEYS');
    expect(serviceSource).toContain('updateActiveInvitationDraftForVerifiedProject');
    expect(serviceSource).toContain('templateKey: input.templateKey');
  });

  it('keeps the owner workspace on the canonical five destinations', () => {
    const navigationSource = readSource('src/components/dashboard/project-navigation.tsx');
    const shellSource = readSource('src/components/dashboard/dashboard-shell.tsx');

    for (const label of ['Ringkasan', 'Undangan', 'Tamu', 'Bagikan', 'Respons Tamu']) {
      expect(navigationSource).toContain(`label: '${label}'`);
    }

    expect(navigationSource).not.toContain("label: 'Tindak Lanjut'");
    expect(navigationSource).toContain('aliases: [`${base}/follow-up`, `${base}/share`]');
    expect(shellSource).not.toContain("[aria-label^='Project ']");
    expect(shellSource).not.toContain('<style>');
  });
});
