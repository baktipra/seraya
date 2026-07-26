import Link from 'next/link';

import { Badge } from '@/design-system';
import type { InvitationEditorTruthState } from '@/modules/invitation-editor/editor-truth-state';

const truthStateTone = {
  clean: 'brand',
  dirty: 'warning',
  error: 'danger',
  live: 'success',
  not_published: 'neutral',
  not_saved: 'warning',
  outdated: 'warning',
  saved: 'success',
  saving: 'brand',
  unknown: 'neutral',
} as const;

export function InvitationEditorStatusHeader({
  coupleLabel,
  projectId,
  templateLabel,
  truth,
  workspaceDescription,
  workspaceTitle,
}: {
  coupleLabel: string;
  projectId: string;
  templateLabel: string;
  truth: InvitationEditorTruthState;
  workspaceDescription: string;
  workspaceTitle: string;
}) {
  const truths = [
    { key: 'local', label: 'Perubahan lokal', value: truth.local },
    { key: 'saved', label: 'Draf tersimpan', value: truth.saved },
    { key: 'published', label: 'Versi terbit', value: truth.published },
  ] as const;

  return (
    <header className="bg-seraya-surface overflow-hidden" data-editor-truth-header>
      <div className="bg-seraya-brand-soft px-5 py-7 sm:px-8 sm:py-8">
        <p className="text-seraya-text-secondary text-sm font-semibold">{coupleLabel}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-seraya-action-primary text-xs font-bold tracking-[0.1em] uppercase">
              Studio undangan · {templateLabel}
            </p>
            <h1
              className="seraya-display-md mt-2 text-[clamp(2rem,4vw,3.35rem)]"
              id="invitation-editor-title"
            >
              {workspaceTitle}
            </h1>
            <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
              {workspaceDescription}
            </p>
          </div>
          <Link
            className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:border-seraya-border-strong hover:bg-seraya-canvas focus-visible:outline-seraya-focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
            href={`/dashboard/${projectId}/preview`}
          >
            Pratinjau draf tersimpan
          </Link>
        </div>
      </div>

      <dl className="grid divide-y divide-[var(--seraya-color-border-default)] border-b border-[var(--seraya-color-border-default)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {truths.map((item) => (
          <div className="px-5 py-4 sm:px-6" data-editor-truth={item.key} key={item.key}>
            <dt className="text-seraya-text-muted text-xs font-bold tracking-[0.08em] uppercase">
              {item.label}
            </dt>
            <dd className="mt-2">
              <Badge variant={truthStateTone[item.value.state]}>{item.value.label}</Badge>
              <p className="text-seraya-text-secondary mt-2 text-sm leading-6">
                {item.value.description}
              </p>
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
