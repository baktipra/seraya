import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

async function readRoselleSource(fileName: string) {
  return readFile(path.resolve(testDirectory, '..', fileName), 'utf8');
}

describe('Roselle cinematic motion language', () => {
  it('mounts the observer plus presentation and macro scene layers without replacing the flagship contract', async () => {
    const template = await readRoselleSource('roselle-template.tsx');

    expect(template).toContain('RoselleMotionOrchestrator');
    expect(template).toContain('roselle-presentation-motion-v3.module.css');
    expect(template).toContain('roselle-macro-motion-v4.module.css');
    expect(template).toContain('data-roselle-motion="flagship-v1"');
    expect(template).toContain('data-roselle-motion-language="cinematic-v2"');
    expect(template).toContain('data-roselle-scene-language="presentation-v3"');
    expect(template).toContain('data-roselle-macro-motion="v4"');
  });

  it('uses a lightweight fail-open observer with a deliberate opening ceremony', async () => {
    const orchestrator = await readRoselleSource('roselle-motion-orchestrator.tsx');

    expect(orchestrator).toContain("'use client'");
    expect(orchestrator).toContain('IntersectionObserver');
    expect(orchestrator).toContain("root.dataset.roselleMotionReady = 'true'");
    expect(orchestrator).toContain("root.dataset.roselleMotionReady = 'static'");
    expect(orchestrator).toContain("root.dataset.roselleOpeningState = 'closed'");
    expect(orchestrator).toContain("root.dataset.roselleOpeningState = 'opening'");
    expect(orchestrator).toContain("root.dataset.roselleOpeningState = 'opened'");
    expect(orchestrator).toContain('event.preventDefault()');
    expect(orchestrator).toContain("html.style.overflow = 'hidden'");
    expect(orchestrator).toContain('prefers-reduced-motion: reduce');
  });

  it('replays non-interactive chapters while leaving response controls stable', async () => {
    const orchestrator = await readRoselleSource('roselle-motion-orchestrator.tsx');

    expect(orchestrator).toContain("[data-roselle-chapter='gallery']");
    expect(orchestrator).toContain("[data-roselle-chapter='closing']");
    expect(orchestrator).not.toContain("[data-roselle-chapter='response']\",");
    expect(orchestrator).toContain("target.dataset.roselleMotionState = 'idle'");
    expect(orchestrator).toContain('target.matches(replayableChapterSelector)');
  });

  it('provides visible directional choreography while preserving reduced-motion access', async () => {
    const styles = await readRoselleSource('roselle-flagship-motion.module.css');

    expect(styles).toContain('roselle-opening-curtain');
    expect(styles).toContain("[data-roselle-chapter='couple']");
    expect(styles).toContain("[data-roselle-chapter='story']");
    expect(styles).toContain("[data-roselle-chapter='events']");
    expect(styles).toContain("[data-roselle-chapter='gallery']");
    expect(styles).toContain("[data-template-response-slot='rsvp']");
    expect(styles).toContain('var(--roselle-motion-distance-x)');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).not.toContain('animation-timeline: view');
  });

  it('adds presentation-like scene wipes and image masks without autoplay or scroll snapping', async () => {
    const styles = await readRoselleSource('roselle-presentation-motion-v3.module.css');

    expect(styles).toContain('roselle-scene-paper-sweep');
    expect(styles).toContain("[data-roselle-chapter='greeting']");
    expect(styles).toContain('[data-roselle-person-media]');
    expect(styles).toContain('[data-roselle-story-media]');
    expect(styles).toContain("[data-roselle-chapter='events']");
    expect(styles).toContain('[data-roselle-location-note]');
    expect(styles).toContain('[data-roselle-film-frame]');
    expect(styles).toContain('[data-roselle-memory-album]');
    expect(styles).toContain("[data-template-response-slot='guestbook']");
    expect(styles).toContain('clip-path');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).not.toContain('scroll-snap-type');
    expect(styles).not.toContain('autoplay');
  });

  it('uses viewport-scale macro motion for opening and flagship chapters without touching response forms', async () => {
    const styles = await readRoselleSource('roselle-macro-motion-v4.module.css');

    expect(styles).toContain('roselle-v4-cover-lift');
    expect(styles).toContain('position: fixed');
    expect(styles).toContain('100dvh');
    expect(styles).toContain('-112vh');
    expect(styles).toContain('-18vw');
    expect(styles).toContain('18vw');
    expect(styles).toContain("[data-roselle-chapter='gallery']");
    expect(styles).toContain("[data-roselle-chapter='closing']");
    expect(styles).not.toContain('[data-template-response-slot');
    expect(styles).not.toContain('scroll-snap-type');
    expect(styles).not.toContain('autoplay');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
