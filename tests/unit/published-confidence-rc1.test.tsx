import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PublishedConfidence } from '@/components/projects/published-confidence';
import { CompassFocus } from '@/components/workspace/compass-primitives';

describe('RC1 Slice A published confidence foundation', () => {
  it('shows synchronized published truth without adding another action', () => {
    const markup = renderToStaticMarkup(<PublishedConfidence hasUnpublishedChanges={false} />);

    expect(markup).toContain('data-published-confidence-state="synchronized"');
    expect(markup).toContain('Versi tamu sinkron');
    expect(markup).toContain('Status undangan');
    expect(markup).toContain('Terbit');
    expect(markup).toContain('Tautan personal');
    expect(markup).toContain('Tetap berlaku');
    expect(markup).not.toContain('<a');
  });

  it('keeps the previous published version truthful while newer draft changes exist', () => {
    const markup = renderToStaticMarkup(<PublishedConfidence hasUnpublishedChanges />);

    expect(markup).toContain('data-published-confidence-state="published-version-active"');
    expect(markup).toContain('Versi terbit tetap aktif');
    expect(markup).toContain('Menunggu terbit ulang');
    expect(markup).toContain('Tamu tetap melihat versi terbit sebelumnya');
    expect(markup).toContain('Tautan personal yang masih aktif tidak berubah');
  });

  it('labels the one canonical CTA as post-publish operations without changing its route', () => {
    const markup = renderToStaticMarkup(
      <CompassFocus
        actionLabel="Kelola tamu"
        description="Siapkan daftar tamu."
        eyebrow="Operasional setelah terbit"
        href={'/dashboard/project-id/guests'}
        title="Kelola tamu"
        titleId="next-step"
      />,
    );

    expect(markup).toContain('Operasional setelah terbit');
    expect(markup.match(/<a /g)).toHaveLength(1);
    expect(markup).toContain('href="/dashboard/project-id/guests"');
  });

  it('preserves published truth in the editorial dashboard without inventing delivery state', () => {
    const source = readFileSync('src/components/projects/project-overview-bootstrap.tsx', 'utf8');

    expect(source).toContain("case 'published':");
    expect(source).toContain("case 'published_with_unpublished_changes':");
    expect(source).toContain('const published = readiness.invitation.hasPublishedSnapshot;');
    expect(source).toContain('readiness.invitation.hasUnpublishedChanges');
    expect(source).toContain("href: `${base}/invitation?task=publish` as Route");
    expect(source).toContain("href: `${base}/guests` as Route");
    expect(source).not.toMatch(/terkirim|delivered|opened|dibaca/i);
  });
});
