import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InvitationStudioShell } from '@/components/projects/invitation-studio-shell';

describe('Invitation Studio Slice G responsive polish', () => {
  it('marks the canonical shell with one responsive authority while preserving five mounted modes', () => {
    const markup = renderToStaticMarkup(
      <InvitationStudioShell
        content={<div>Isi</div>}
        design={<div>Desain</div>}
        initialMode="preview"
        media={<div>Media</div>}
        preview={<div>Preview</div>}
        publish={<div>Terbitkan</div>}
      />,
    );

    expect(markup).toContain('data-invitation-studio-responsive="slice-g"');
    expect(markup).toContain('data-invitation-studio-active-mode="preview"');
    expect(markup.match(/role="tab"/g)).toHaveLength(5);
    expect(markup.match(/role="tabpanel"/g)).toHaveLength(5);
  });

  it('uses container-aware progression for canonical mode layouts', () => {
    const source = readFileSync(
      'src/components/projects/invitation-studio-responsive-polish.module.css',
      'utf8',
    );

    expect(source).toContain('container-type: inline-size');
    expect(source).toContain('@container (min-width: 40rem)');
    expect(source).toContain('@container (min-width: 45rem)');
    expect(source).toContain('@container (min-width: 52rem)');
    expect(source).toContain('@container (min-width: 68rem)');
    expect(source).toContain('[data-invitation-studio-design-mode]');
    expect(source).toContain('[data-invitation-studio-media-mode]');
    expect(source).toContain('[data-invitation-studio-preview-mode]');
    expect(source).toContain('[data-invitation-studio-publish-mode]');
    expect(source).toContain('[data-invitation-editor-mobile-navigation]');
  });

  it('keeps active mode visibility and reduced-motion behavior inside the shell interaction contract', () => {
    const source = readFileSync('src/components/projects/invitation-studio-shell.tsx', 'utf8');

    expect(source).toContain("activeTab.scrollIntoView({");
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain("inline: 'center'");
    expect(source).toContain('data-invitation-studio-responsive="slice-g"');
    expect(source.match(/data-invitation-studio-save-action/g)).toHaveLength(1);
  });
});
