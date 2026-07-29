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
  it('defines exactly four semantic workspace width variants backed by design tokens', async () => {
    const component = await read('src/components/workspace/workspace-page.tsx');
    const tokens = await read('src/app/design-tokens.css');
    const anatomy = await read('src/app/workspace-anatomy.css');

    expect(component).toContain("'reading' | 'standard' | 'operations' | 'studio'");
    expect(component).toContain('data-workspace-width={width}');
    expect(component).not.toContain('lg:max-w-[');

    expect(tokens).toContain('--seraya-workspace-width-reading: 58rem');
    expect(tokens).toContain('--seraya-workspace-width-standard: 64rem');
    expect(tokens).toContain('--seraya-workspace-width-operations: 74rem');

    expect(anatomy).toContain("[data-workspace-page][data-workspace-width='reading']");
    expect(anatomy).toContain("[data-workspace-page][data-workspace-width='standard']");
    expect(anatomy).toContain("[data-workspace-page][data-workspace-width='operations']");
    expect(anatomy).toContain("[data-workspace-page][data-workspace-width='studio']");
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

  it('keeps one token-owned project rail and one content-slot gap', async () => {
    const layout = await read('src/app/(dashboard)/dashboard/[projectId]/layout.tsx');
    const tokens = await read('src/app/design-tokens.css');
    const anatomy = await read('src/app/workspace-anatomy.css');

    expect(layout).toContain('data-project-workspace-shell');
    expect(layout).toContain('data-project-workspace-main');
    expect(layout).not.toContain('grid-cols-[15rem');
    expect(layout).not.toContain('lg:gap-8');

    expect(tokens).toContain('--seraya-project-rail-width: 15rem');
    expect(tokens).toContain('--seraya-project-rail-gap: 2rem');
    expect(anatomy).toContain('grid-template-columns: var(--seraya-project-rail-width)');
    expect(anatomy).toContain('gap: var(--seraya-project-rail-gap)');
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

    expect(source).toContain('<WorkspacePage align="center" kind="onboarding" width="standard">');
  });

  it('keeps anatomy authority explicit and free from legacy selector recovery', async () => {
    const source = await read('src/app/workspace-anatomy.css');

    expect(source).toContain("[data-workspace-page][data-workspace-anatomy='operations']");
    expect(source).toContain("[data-workspace-page][data-workspace-kind='responses']");
    expect(source).not.toContain(':has(');
    expect(source).not.toContain('nth-child');
    expect(source).not.toContain('[aria-');
  });
});
