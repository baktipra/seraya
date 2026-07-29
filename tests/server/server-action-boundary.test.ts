import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const sourceRoot = path.resolve(process.cwd(), 'src');
const serverActionDirective = /^\s*['"]use server['"];?\s*$/m;
const runtimeExport = /^\s*export\s+(?!type\b|interface\b)(.+)$/gm;
const allowedServerActionExport = /^async\s+function\s+[A-Za-z_$][\w$]*/;

async function getSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return getSourceFiles(entryPath);
      }

      return entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name) ? [entryPath] : [];
    }),
  );

  return paths.flat();
}

async function getServerActionSourceFiles() {
  const sourceFiles = await getSourceFiles(sourceRoot);
  const matching = await Promise.all(
    sourceFiles.map(async (filePath) => ({
      filePath,
      source: await readFile(filePath, 'utf8'),
    })),
  );

  return matching.filter(({ source }) => serverActionDirective.test(source));
}

describe('Server Action runtime export boundary', () => {
  it('allows only async Server Action runtime exports in every use server module', async () => {
    const serverActionFiles = await getServerActionSourceFiles();

    expect(serverActionFiles).not.toHaveLength(0);

    for (const { filePath, source } of serverActionFiles) {
      const invalidExports = [...source.matchAll(runtimeExport)]
        .map((match) => match[1]?.trim() ?? '')
        .filter((exportedValue) => !allowedServerActionExport.test(exportedValue));

      expect(
        invalidExports,
        `${path.relative(process.cwd(), filePath)} may only export async Server Actions at runtime.`,
      ).toEqual([]);
    }
  });

  it('keeps action state in normal shared modules while client controls import both boundaries', async () => {
    const [
      projectState,
      publicationState,
      paymentState,
      guestState,
      setupForm,
      publishControls,
      paymentControls,
      guestManager,
      publicationIndex,
      paymentIndex,
    ] = await Promise.all([
      readFile(path.join(sourceRoot, 'modules/projects/create-project.action-state.ts'), 'utf8'),
      readFile(path.join(sourceRoot, 'modules/publications/publication.action-state.ts'), 'utf8'),
      readFile(path.join(sourceRoot, 'modules/payments/payment.action-state.ts'), 'utf8'),
      readFile(path.join(sourceRoot, 'modules/guests/guest.action-state.ts'), 'utf8'),
      readFile(path.join(sourceRoot, 'components/projects/project-setup-form.tsx'), 'utf8'),
      readFile(
        path.join(sourceRoot, 'components/projects/publish-invitation-controls.tsx'),
        'utf8',
      ),
      readFile(
        path.join(sourceRoot, 'components/projects/payment-activation-controls.tsx'),
        'utf8',
      ),
      readFile(path.join(sourceRoot, 'components/projects/guest-manager.tsx'), 'utf8'),
      readFile(path.join(sourceRoot, 'modules/publications/index.ts'), 'utf8'),
      readFile(path.join(sourceRoot, 'modules/payments/index.ts'), 'utf8'),
    ]);

    expect(projectState).not.toMatch(serverActionDirective);
    expect(publicationState).not.toMatch(serverActionDirective);
    expect(paymentState).not.toMatch(serverActionDirective);
    expect(guestState).not.toMatch(serverActionDirective);
    expect(setupForm).toContain(
      "import { createProjectAction } from '@/modules/projects/create-project.actions';",
    );
    expect(setupForm).toContain('initialCreateProjectActionState');
    expect(setupForm).toContain("from '@/modules/projects/create-project.action-state';");
    expect(publishControls).toContain(
      "import { publishInvitationAction } from '@/modules/publications/publication.actions';",
    );
    expect(publishControls).toContain(
      "import { initialPublishInvitationActionState } from '@/modules/publications/publication.action-state';",
    );
    expect(paymentControls).toContain(
      "import { startPaymentCheckoutAction } from '@/modules/payments/payment.actions';",
    );
    expect(paymentControls).toContain(
      "import { initialStartPaymentCheckoutActionState } from '@/modules/payments/payment.action-state';",
    );
    expect(guestManager).toContain('createGuestAction');
    expect(guestManager).toContain('initialGuestActionState');
    expect(publicationIndex).toContain(
      "export { publishInvitationAction } from './publication.actions';",
    );
    expect(publicationIndex).toContain("} from './publication.action-state';");
    expect(paymentIndex).toContain(
      "export { startPaymentCheckoutAction } from './payment.actions';",
    );
    expect(paymentIndex).toContain("} from './payment.action-state';");
  });
});
