import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Slice E invitation editor field rhythm', () => {
  it('keeps ordinary fields editorial while reserving boundaries for repeated entities', async () => {
    const source = await readFile(
      path.resolve(
        process.cwd(),
        'src/components/projects/invitation-editor-romantic-clarity.module.css',
      ),
      'utf8',
    );

    expect(source).toContain(
      'Repeated data still receives a boundary; ordinary fields do not become cards.',
    );
    expect(source).toContain('[data-invitation-editor-panel] > section');
    expect(source).toContain("input[name^='eventSchedule.events.']");
    expect(source).toContain("input[name^='digitalGift.accounts.']");
    expect(source).toContain("[data-invitation-editor-panel='style']");
    expect(source).toContain("span[aria-hidden='true']");
    expect(source).toContain('grid-template-columns: repeat(3, minmax(0, 1fr)) !important;');
    expect(source).toContain('box-shadow: none !important;');
  });
});
