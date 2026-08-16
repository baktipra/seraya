import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

async function readRoselleSource(fileName: string) {
  return readFile(path.resolve(testDirectory, '..', fileName), 'utf8');
}

describe('Roselle post-open motion V5', () => {
  it('mounts the V5 scene layer without changing the V4C opening contract', async () => {
    const template = await readRoselleSource('roselle-template.tsx');

    expect(template).toContain('roselle-post-open-motion-v5.module.css');
    expect(template).toContain('data-roselle-post-open-motion="v5"');
    expect(template).toContain('data-roselle-opening-ceremony="v4c"');
    expect(template).toContain('RoselleOpeningCeremony');
  });

  it('waits for the opening ceremony before arming post-open reveals', async () => {
    const orchestrator = await readRoselleSource('roselle-motion-orchestrator.tsx');

    expect(orchestrator).toContain("'[data-roselle-opening-gate]'");
    expect(orchestrator).toContain("root.dataset.roselleMotionReady = 'pending'");
    expect(orchestrator).toContain("openingGate.dataset.roselleOpeningState === 'opened'");
    expect(orchestrator).toContain('new MutationObserver');
    expect(orchestrator).toContain("attributeFilter: ['data-roselle-opening-state']");
    expect(orchestrator).toContain('activateMotion()');
  });

  it('uses chapter-scale scene curtains and sequenced motion after opening', async () => {
    const styles = await readRoselleSource('roselle-post-open-motion-v5.module.css');

    expect(styles).toContain('roselle-v5-scene-curtain-left');
    expect(styles).toContain('roselle-v5-scene-curtain-right');
    expect(styles).toContain("[data-roselle-chapter='couple']");
    expect(styles).toContain("[data-roselle-chapter='story']");
    expect(styles).toContain("[data-roselle-chapter='events']");
    expect(styles).toContain("[data-roselle-chapter='location']");
    expect(styles).toContain("[data-roselle-chapter='film']");
    expect(styles).toContain("[data-roselle-chapter='gallery']");
    expect(styles).toContain("[data-roselle-chapter='gift']");
    expect(styles).toContain("[data-roselle-chapter='closing']");
    expect(styles).toContain('roselle-v5-film-screen');
    expect(styles).toContain('roselle-v5-gallery-card-left');
    expect(styles).toContain('roselle-v5-seal-land');
  });

  it('keeps response forms interaction-safe and reduced-motion static', async () => {
    const styles = await readRoselleSource('roselle-post-open-motion-v5.module.css');

    expect(styles).toContain("[data-template-response-introduction='roselle']");
    expect(styles).not.toContain('[data-template-response-slot');
    expect(styles).not.toContain('scroll-snap-type');
    expect(styles).not.toContain('autoplay');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
