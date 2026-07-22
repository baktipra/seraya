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

describe('canonical workspace geometry and anatomy', () => {
  it('defines exactly four intentional workspace width variants', async () => {
    const source = await read('src/components/workspace/workspace-page.tsx');

    expect(source).toContain("'reading' | 'standard' | 'operations' | 'studio'");
    expect(source).toContain("reading: 'max-w-none lg:max-w-[58rem]'");
    expect(source).toContain("standard: 'max-w-none lg:max-w-[64rem]'");
    expect(source).toContain("operations: 'max-w-none lg:max-w-[74rem]'");
    expect(source).toContain("studio: 'max-w-none'");
    expect(source).toContain('data-workspace-page');
  });

  it('defines explicit page kinds and maps them to canonical anatomies', async () => {
    const source = await read('src/components/workspace/workspace-page.tsx');

    expect(source).toContain("'onboarding' | 'compass' | 'operations' | 'studio'");
    expect(source).toContain("guests: 'operations'");
    expect(source).toContain("delivery: 'operations'");
    expect(source).toContain("responses: 'operations'");
    expect(source).toContain("'follow-up': 'operations'");
    expect(source).toContain('data-workspace-anatomy');
    expect(source).toContain('data-workspace-kind');
  });

  it('keeps one project rail and one content-slot gap', async () => {
    const source = await read('src/app/(dashboard)/dashboard/[projectId]/layout.tsx');

    expect(source).toContain('lg:grid-cols-[15rem_minmax(0,1fr)]');
    expect(source).toContain('lg:gap-8');
    expect(source).not.toContain('xl:gap-10');
    expect(source).toContain('data-project-workspace-shell');
    expect(source).toContain('data-project-workspace-main');
  });

  it('assigns explicit widths and anatomy kinds to every canonical project workspace', async () => {
    const sources = await Promise.all(
      Object.values(projectRouteFiles).map((relativePath) => read(relativePath)),
    );

    expect(sources[0]).toContain('<WorkspacePage kind="studio" width="studio">');
    expect(sources[1]).toContain('<WorkspacePage kind="compass" width="standard">');
    expect(sources[2]).toContain('<WorkspacePage kind="guests" width="operations">');
    expect(sources[3]).toContain('<WorkspacePage kind="delivery" width="operations">');
    expect(sources[4]).toContain('<WorkspacePage kind="responses" width="operations">');
    expect(sources[5]).toContain('<WorkspacePage kind="follow-up" width="operations">');
  });

  it('keeps the standalone new-invitation onboarding centered', async () => {
    const source = await read('src/app/(dashboard)/dashboard/new/page.tsx');

    expect(source).toContain(
      '<WorkspacePage align="center" kind="onboarding" width="standard">',
    );
  });

  it('keeps the new anatomy authority explicit and free from legacy selector recovery', async () => {
    const source = await read('src/app/workspace-anatomy.css');

    expect(source).toContain("[data-workspace-page][data-workspace-anatomy='operations']");
    expect(source).toContain("[data-workspace-page][data-workspace-kind='responses']");
    expect(source).not.toContain(':has(');
    expect(source).not.toContain('nth-child');
    expect(source).not.toContain('[aria-');
  });
});
