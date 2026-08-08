import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

async function readRoselleSource(relativePath: string) {
  return readFile(path.resolve(testDirectory, relativePath), 'utf8');
}

describe('Roselle frontend engineering contract', () => {
  it('keeps the parity shim limited to desktop title compatibility', async () => {
    const css = await readRoselleSource('../roselle-parity-repair.module.css');

    expect(css).toContain('data-roselle-letter-title');
    expect(css).not.toContain('data-roselle-memory-album');
    expect(css).not.toContain('data-invitation-media-frame');
  });

  it('uses stable event IDs before the legacy title-index fallback', async () => {
    const source = await readRoselleSource('../roselle-sections.tsx');

    expect(source).toContain(
      "key={event.id ?? `${event.title ?? 'acara'}-${index}`}",
    );
  });

  it('keeps the Roselle renderer server-first and free of local React state hooks', async () => {
    const sourceFiles = [
      '../roselle-template.tsx',
      '../roselle-sections.tsx',
    ] as const;

    for (const sourceFile of sourceFiles) {
      const source = await readRoselleSource(sourceFile);
      expect(source).not.toContain("'use client'");
      expect(source).not.toMatch(
        /\buse(?:State|Effect|Memo|Callback|Ref|Reducer)\b/,
      );
    }
  });
});
