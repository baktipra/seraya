from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    content = target.read_text()
    if old not in content:
        raise SystemExit(f"Missing anchor in {path}: {old[:160]!r}")
    target.write_text(content.replace(old, new, 1))


component = Path('src/components/projects/published-confidence.tsx')
component.write_text(r'''import { Badge } from '@/design-system';

export function PublishedConfidence({
  hasUnpublishedChanges,
}: {
  hasUnpublishedChanges: boolean;
}) {
  const isSynchronized = !hasUnpublishedChanges;

  return (
    <section
      aria-labelledby="published-confidence-title"
      className="border-seraya-border-subtle bg-seraya-status-success-soft min-w-0 rounded-[var(--seraya-radius-xl)] border p-5 sm:p-6"
      data-published-confidence-state={
        isSynchronized ? 'synchronized' : 'published-version-active'
      }
      data-rc1-published-confidence="slice-a"
    >
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.9fr)] lg:items-start lg:gap-8">
        <div className="min-w-0">
          <p className="text-seraya-status-success text-xs font-semibold">
            Setelah undangan terbit
          </p>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2.5">
            <h2 className="seraya-heading-md" id="published-confidence-title">
              {isSynchronized ? 'Versi tamu sinkron' : 'Versi terbit tetap aktif'}
            </h2>
            <Badge variant={isSynchronized ? 'success' : 'warning'}>
              {isSynchronized ? 'Sinkron' : 'Menunggu terbit ulang'}
            </Badge>
          </div>
          <p className="text-seraya-text-secondary mt-2 max-w-2xl text-sm leading-6">
            {isSynchronized
              ? 'Isi yang dibuka tamu sama dengan versi undangan yang terakhir diterbitkan.'
              : 'Perubahan terbaru masih tersimpan sebagai draf. Tamu tetap melihat versi terbit sebelumnya sampai Anda menerbitkan ulang.'}
          </p>
        </div>

        <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="border-seraya-border-subtle bg-seraya-surface min-w-0 rounded-[var(--seraya-radius-lg)] border p-4">
            <dt className="text-seraya-text-muted text-xs font-medium">Status undangan</dt>
            <dd className="mt-1.5 min-w-0">
              <strong className="text-seraya-text-primary block text-base font-semibold">Terbit</strong>
              <span className="text-seraya-text-secondary mt-1 block text-sm leading-6">
                Undangan publik tetap aktif.
              </span>
            </dd>
          </div>
          <div className="border-seraya-border-subtle bg-seraya-surface min-w-0 rounded-[var(--seraya-radius-lg)] border p-4">
            <dt className="text-seraya-text-muted text-xs font-medium">Tautan personal</dt>
            <dd className="mt-1.5 min-w-0">
              <strong className="text-seraya-text-primary block text-base font-semibold">
                Tetap berlaku
              </strong>
              <span className="text-seraya-text-secondary mt-1 block text-sm leading-6">
                Tautan personal yang masih aktif tidak berubah saat isi diterbitkan ulang.
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <p
        className="border-seraya-border-subtle text-seraya-text-secondary mt-5 border-t pt-4 text-sm leading-6"
        data-rc1-post-publish-handoff
      >
        Terbitkan ulang untuk memperbarui isi yang dilihat tamu. Setelah itu, lanjutkan satu fokus
        operasional di bawah.
      </p>
    </section>
  );
}
''')

replace_once(
    'src/components/projects/project-overview-bootstrap.tsx',
    "} from '@/components/workspace/compass-primitives';\nimport { Badge } from '@/design-system';",
    "} from '@/components/workspace/compass-primitives';\nimport { PublishedConfidence } from '@/components/projects/published-confidence';\nimport { Badge } from '@/design-system';",
)

replace_once(
    'src/components/projects/project-overview-bootstrap.tsx',
    """      badge: 'Perubahan belum diterbitkan',
      badgeVariant: 'warning' as const,
      description: 'Tamu masih melihat versi undangan sebelumnya.',""",
    """      badge: 'Perubahan belum diterbitkan',
      badgeVariant: 'warning' as const,
      description:
        'Undangan tetap aktif. Tamu masih melihat versi terbit sebelumnya sampai Anda menerbitkan ulang.',""",
)

replace_once(
    'src/components/projects/project-overview-bootstrap.tsx',
    """      badge: 'Sudah dipublikasikan',
      badgeVariant: 'success' as const,
      description: 'Link Publik sudah menampilkan versi terbaru undangan.',""",
    """      badge: 'Terbit',
      badgeVariant: 'success' as const,
      description: 'Undangan aktif. Tamu melihat versi undangan yang terakhir diterbitkan.',""",
)

replace_once(
    'src/components/projects/project-overview-bootstrap.tsx',
    """      />

      <CompassFocus
        actionLabel={nextStep.label}""",
    """      />

      {readiness.invitation.hasPublishedSnapshot ? (
        <PublishedConfidence
          hasUnpublishedChanges={readiness.invitation.hasUnpublishedChanges}
        />
      ) : null}

      <CompassFocus
        actionLabel={nextStep.label}""",
)

replace_once(
    'src/components/projects/project-overview-bootstrap.tsx',
    """        description={nextStep.description}
        href={nextStep.href}
        title={nextStep.label}""",
    """        description={nextStep.description}
        eyebrow={
          readiness.invitation.hasPublishedSnapshot
            ? 'Operasional setelah terbit'
            : 'Fokus berikutnya'
        }
        href={nextStep.href}
        title={nextStep.label}""",
)

replace_once(
    'src/components/workspace/compass-primitives.tsx',
    """export function CompassFocus({
  actionLabel,
  description,
  href,
  title,
  titleId,
}: {
  actionLabel: string;
  description: ReactNode;
  href: Route;
  title: ReactNode;
  titleId: string;
}) {""",
    """export function CompassFocus({
  actionLabel,
  description,
  eyebrow = 'Fokus berikutnya',
  href,
  title,
  titleId,
}: {
  actionLabel: string;
  description: ReactNode;
  eyebrow?: string;
  href: Route;
  title: ReactNode;
  titleId: string;
}) {""",
)

replace_once(
    'src/components/workspace/compass-primitives.tsx',
    "<p className=\"text-seraya-action-primary text-xs font-semibold\">Fokus berikutnya</p>",
    "<p className=\"text-seraya-action-primary text-xs font-semibold\">{eyebrow}</p>",
)

test = Path('tests/unit/published-confidence-rc1.test.tsx')
test.write_text(r'''import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PublishedConfidence } from '@/components/projects/published-confidence';
import { CompassFocus } from '@/components/workspace/compass-primitives';

describe('RC1 Slice A published confidence foundation', () => {
  it('shows synchronized published truth without adding another action', () => {
    const markup = renderToStaticMarkup(
      <PublishedConfidence hasUnpublishedChanges={false} />,
    );

    expect(markup).toContain('data-published-confidence-state="synchronized"');
    expect(markup).toContain('Versi tamu sinkron');
    expect(markup).toContain('Status undangan');
    expect(markup).toContain('Terbit');
    expect(markup).toContain('Tautan personal');
    expect(markup).toContain('Tetap berlaku');
    expect(markup).not.toContain('<a');
  });

  it('keeps the previous published version truthful while newer draft changes exist', () => {
    const markup = renderToStaticMarkup(
      <PublishedConfidence hasUnpublishedChanges />,
    );

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

  it('mounts confidence only for published projects and preserves the priority engine', () => {
    const source = readFileSync(
      'src/components/projects/project-overview-bootstrap.tsx',
      'utf8',
    );

    expect(source).toContain('readiness.invitation.hasPublishedSnapshot ? (');
    expect(source).toContain('<PublishedConfidence');
    expect(source).toContain('deriveProjectCompassNextStep(readiness, projectId)');
    expect(source.match(/<CompassFocus/g)).toHaveLength(1);
    expect(source).not.toMatch(/terkirim|delivered|opened|dibaca/i);
  });
});
''')
