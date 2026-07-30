import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('P0 mobile invitation workspace recovery', () => {
  it('keeps mobile containment in the canonical responsive and studio authorities', async () => {
    const [layout, responsive, studio] = await Promise.all([
      readFile(path.resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8'),
      readFile(path.resolve(process.cwd(), 'src/app/workspace-responsive.css'), 'utf8'),
      readFile(
        path.resolve(
          process.cwd(),
          'src/components/projects/invitation-editor-romantic-clarity.module.css',
        ),
        'utf8',
      ),
    ]);

    expect(layout).toContain("import './workspace-responsive.css';");
    expect(responsive).toContain('[data-project-workspace-main]');
    expect(responsive).toContain('padding-bottom: calc(var(--seraya-mobile-safe-bottom)');
    expect(responsive).toContain('[data-project-mobile-navigation]');
    expect(responsive).toContain('[data-operational-selection-bar]');
    expect(studio).toContain('[data-invitation-editor-mobile-navigation]');
    expect(studio).toContain("[data-testid='invitation-editor-save-status']");
    expect(studio).toContain('@media (max-width: 1023px)');
  });
});
