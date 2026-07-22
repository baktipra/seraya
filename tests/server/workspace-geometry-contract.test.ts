import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRouteFiles = {
  invitation: 'src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx',
  overview: 'src/app/(dashboard)/dashboard/[projectId]/page.tsx',
  guests: 'src/app/(dashboard)/dashboard/[projectId]/guests/page.tsx',
  delivery: 'src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx',
  responses: 'src/app/(dashboard)/dashboard/[projectId]/rsvp/page.tsx',
  followUp: 'src/app/(dashboard)/dashboard/[projectId]/follow-up/page.tsx',
} as const;

async function read(relativePath: string) {
  return readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('canonical workspace geometry', () => {
  it('defines exactly four intentional workspace width variants', async () => {
    const source = await read('src/components/workspace/workspace-page.tsx');

    expect(source).toContain("'reading' | 'standard' | 'operations' | 'studio'");
    expect(source).toContain("reading: 'max-w-none lg:max-w-[58rem]'");
    expect(source).toContain("standard: 'max-w-none lg:max-w-[64rem]'");
    expect(source).toContain("operations: 'max-w-none lg:max-w-[74rem]'");
    expect(source).toContain("studio: 'max-w-none'");
    expect(source).toContain('data-workspace-page');
  });

  it('keeps one project rail and one content-slot gap', async () => {
    const source = await read('src/app/(dashboard)/dashboard/[projectId]/layout.tsx');

    expect(source).toContain('lg:grid-cols-[15rem_minmax(0,1fr)]');
    expect(source).toContain('lg:gap-8');
    expect(source).not.toContain('xl:gap-10');
    expect(source).toContain('data-project-workspace-shell');
    expect(source).toContain('data-project-workspace-main');
  });

  it('assigns explicit widths to every canonical project workspace', async () => {
    const sources = await Promise.all(
      Object.values(projectRouteFiles).map((relativePath) => read(relativePath)),
    );

    expect(sources[0]).toContain('<WorkspacePage width="studio">');
    expect(sources[1]).toContain('<WorkspacePage width="standard">');

    for (const source of sources.slice(2)) {
      expect(source).toContain('<WorkspacePage width="operations">');
    }
  });

  it('keeps the standalone new-invitation onboarding centered', async () => {
    const source = await read('src/app/(dashboard)/dashboard/new/page.tsx');

    expect(source).toContain('<WorkspacePage align="center" width="standard">');
  });
});
