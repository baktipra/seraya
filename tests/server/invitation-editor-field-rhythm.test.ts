import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Slice E invitation editor field rhythm', () => {
  it('keeps ordinary fields editorial while reserving cards for repeated entities', async () => {
    const source = await readFile(
      path.resolve(
        process.cwd(),
        'src/components/projects/invitation-editor-live-preview.module.css',
      ),
      'utf8',
    );

    expect(source).toContain(
      'Slice E: editorial field rhythm with cards reserved for repeated entities.',
    );
    expect(source).toContain("[data-invitation-editor-panel] [class~='space-y-2.5']");
    expect(source).toContain("[data-invitation-editor-panel] [class~='space-y-5']");
    expect(source).toContain("input[type='checkbox'][name$='.enabled']");
    expect(source).toContain("input[name^='eventSchedule.events.']");
    expect(source).toContain("input[name^='digitalGift.accounts.']");
    expect(source).toContain("[data-invitation-editor-panel='gallery']");
    expect(source).toContain('box-shadow: var(--seraya-shadow-soft) !important;');
  });
});
