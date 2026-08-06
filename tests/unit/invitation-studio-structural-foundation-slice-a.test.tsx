import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InvitationStudioShell } from '@/components/projects/invitation-studio-shell';
import {
  invitationStudioModes,
  parseInvitationStudioMode,
} from '@/components/projects/invitation-studio.types';

describe('Invitation Studio Slice A structural foundation', () => {
  it('defines the five canonical studio modes and safely parses unknown input', () => {
    expect(invitationStudioModes.map((mode) => mode.key)).toEqual([
      'content',
      'design',
      'media',
      'preview',
      'publish',
    ]);
    expect(parseInvitationStudioMode('preview')).toBe('preview');
    expect(parseInvitationStudioMode(['media', 'content'])).toBe('media');
    expect(parseInvitationStudioMode('unknown')).toBe('content');
    expect(parseInvitationStudioMode(undefined)).toBe('content');
  });

  it('renders explicit named slots with one selected mode and all panels mounted', () => {
    const markup = renderToStaticMarkup(
      <InvitationStudioShell
        content={<div>Isi lama tetap mounted</div>}
        coupleLabel="Nadia & Raka"
        design={<div>Kontrol desain</div>}
        initialMode="design"
        media={<div>Kontrol media</div>}
        preview={<div>Preview exact</div>}
        previewHref="/dashboard/project-id/preview"
        publish={<div>Kontrol publikasi</div>}
        statusLabel="Undangan aktif"
        statusTone="success"
      />,
    );

    expect(markup).toContain('data-invitation-studio-slice="structural-foundation-a"');
    expect(markup).toContain('data-invitation-studio-active-mode="design"');
    expect(markup.match(/role="tab"/g)).toHaveLength(5);
    expect(markup.match(/role="tabpanel"/g)).toHaveLength(5);
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('Nadia &amp; Raka');
    expect(markup).toContain('Undangan aktif');
    expect(markup).toContain('href="/dashboard/project-id/preview"');
    expect(markup).toContain('Isi lama tetap mounted');
    expect(markup).toContain('Kontrol desain');
    expect(markup).toContain('Kontrol media');
    expect(markup).toContain('Preview exact');
    expect(markup).toContain('Kontrol publikasi');
  });

  it('removes implicit DOM-order layout selectors from the studio shell authority', () => {
    const source = readFileSync(
      'src/components/projects/invitation-studio-shell.module.css',
      'utf8',
    );

    expect(source).not.toContain(':nth-child');
    expect(source).not.toMatch(/form\s*>\s*div:last-child/);
    expect(source).not.toMatch(/navigation[^\n]*\+\s*form/);
    expect(source).not.toContain(':global(');
    expect(source).toContain('grid-template-rows');
    expect(source).toContain('.panel[hidden]');
  });
});
