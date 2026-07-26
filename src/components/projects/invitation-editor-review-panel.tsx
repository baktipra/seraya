'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Badge, Button } from '@/design-system';
import { focusFirstDescendant, trapFocusWithin } from '@/lib/focus-management';
import { invitationEditorChapters } from '@/modules/invitation-editor/editor-chapter-registry';
import type { InvitationEditorTruthState } from '@/modules/invitation-editor/editor-truth-state';
import type { ProjectPublishEligibility } from '@/modules/payments/payment.types';
import type { WeddingReadinessV1 } from '@/modules/readiness/wedding-readiness.types';

import type {
  InvitationEditorSectionKey,
  InvitationEditorSectionStatuses,
} from './invitation-editor-workspace';
import { PublishInvitationControls } from './publish-invitation-controls';

export function InvitationEditorReviewPanel({
  coupleLabel,
  galleryCount,
  isDirty,
  onClose,
  onEditChapter,
  open,
  projectId,
  publishEligibility,
  statuses,
  templateLabel,
  truth,
  workspaceReadiness,
}: {
  coupleLabel: string;
  galleryCount: number;
  isDirty: boolean;
  onClose: () => void;
  onEditChapter: (chapter: InvitationEditorSectionKey) => void;
  open: boolean;
  projectId: string;
  publishEligibility: ProjectPublishEligibility;
  statuses: InvitationEditorSectionStatuses;
  templateLabel: string;
  truth: InvitationEditorTruthState;
  workspaceReadiness: Pick<WeddingReadinessV1, 'identity' | 'invitation'>;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (panel) focusFirstDescendant(panel, closeButtonRef.current ?? panel);
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      trapFocusWithin(event, panel);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus({ preventScroll: true });
      openerRef.current = null;
    };
  }, [onClose, open]);

  if (!open) return null;

  const attentionChapters = invitationEditorChapters.filter(
    (chapter) => !chapter.optional && ['error', 'incomplete'].includes(statuses[chapter.id]),
  );
  const readyChapters = invitationEditorChapters.filter(
    (chapter) => statuses[chapter.id] === 'complete',
  );
  const optionalChapters = invitationEditorChapters.filter(
    (chapter) => statuses[chapter.id] === 'optional_off',
  );
  const isRepublish =
    workspaceReadiness.invitation.state === 'published_with_unpublished_changes';
  const canPresentPublish =
    !isDirty &&
    (workspaceReadiness.invitation.state === 'ready_to_publish' || isRepublish);
  const blockerCount = attentionChapters.length + (isDirty ? 1 : 0);

  return (
    <section
      ref={panelRef}
      aria-labelledby="invitation-review-title"
      aria-modal="true"
      className="bg-seraya-canvas fixed inset-0 z-[70] overflow-y-auto px-3 py-3 outline-none sm:px-6 sm:py-6"
      data-invitation-review-panel
      role="dialog"
      tabIndex={-1}
    >
      <div className="border-seraya-border-default bg-seraya-surface mx-auto w-full max-w-5xl overflow-hidden rounded-[var(--seraya-radius-lg)] border shadow-[var(--seraya-shadow-float)]">
        <header className="bg-seraya-brand-soft border-seraya-border-default border-b px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-seraya-action-primary text-xs font-bold tracking-[0.1em] uppercase">
                Review sebelum terbit
              </p>
              <h2 className="seraya-display-md mt-2 text-[clamp(2rem,4vw,3.25rem)]" id="invitation-review-title">
                {isRepublish ? 'Periksa perubahan undangan' : 'Periksa kesiapan undangan'}
              </h2>
              <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
                Pastikan versi yang tersimpan sudah sesuai sebelum menjadi pengalaman yang dilihat tamu.
              </p>
            </div>
            <Button onClick={onClose} ref={closeButtonRef} type="button" variant="secondary">
              Kembali mengedit
            </Button>
          </div>
        </header>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-7 px-5 py-6 sm:px-8 sm:py-8">
            <section aria-labelledby="review-summary-title">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-seraya-text-primary text-lg font-semibold" id="review-summary-title">
                  Ringkasan undangan
                </h3>
                <Badge variant={blockerCount > 0 ? 'warning' : 'success'}>
                  {blockerCount > 0 ? `${blockerCount} perlu perhatian` : 'Siap ditinjau'}
                </Badge>
              </div>
              <dl className="border-seraya-border-default mt-4 grid overflow-hidden rounded-[var(--seraya-radius-md)] border sm:grid-cols-2">
                {[
                  ['Pasangan', coupleLabel],
                  ['Desain', templateLabel],
                  ['Foto tersimpan', `${galleryCount} foto`],
                  ['Versi terbit', truth.published.label],
                ].map(([label, value]) => (
                  <div className="border-seraya-border-default border-b px-4 py-3.5 last:border-b-0 sm:border-r sm:nth-[3]:border-b-0" key={label}>
                    <dt className="text-seraya-text-muted text-xs font-bold tracking-[0.06em] uppercase">
                      {label}
                    </dt>
                    <dd className="text-seraya-text-primary mt-1 text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {isDirty ? (
              <section className="border-seraya-status-warning/30 bg-seraya-status-warning-soft rounded-[var(--seraya-radius-md)] border px-4 py-4" data-review-local-blocker>
                <h3 className="text-seraya-text-primary font-semibold">Simpan perubahan lokal lebih dulu</h3>
                <p className="text-seraya-text-secondary mt-1 text-sm leading-6">
                  Review terbit hanya boleh memakai draf yang sudah dikonfirmasi server. Perubahan lokal tetap aman di editor.
                </p>
                <Button className="mt-3" onClick={onClose} type="button" variant="secondary">
                  Kembali dan simpan
                </Button>
              </section>
            ) : null}

            <section aria-labelledby="review-attention-title">
              <h3 className="text-seraya-text-primary text-lg font-semibold" id="review-attention-title">
                Perlu perhatian
              </h3>
              {attentionChapters.length === 0 ? (
                <p className="text-seraya-text-secondary mt-3 text-sm leading-6">
                  Tidak ada chapter wajib yang tertinggal pada draf saat ini.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {attentionChapters.map((chapter) => (
                    <li className="border-seraya-border-default flex flex-col gap-3 rounded-[var(--seraya-radius-md)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between" key={chapter.id}>
                      <div>
                        <p className="text-seraya-text-primary text-sm font-semibold">{chapter.label}</p>
                        <p className="text-seraya-text-muted mt-1 text-sm">
                          {statuses[chapter.id] === 'error'
                            ? 'Ada informasi yang perlu diperbaiki.'
                            : 'Informasi utama belum cukup.'}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          onEditChapter(chapter.id);
                          onClose();
                        }}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        Periksa {chapter.label}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="review-ready-title">
              <h3 className="text-seraya-text-primary text-lg font-semibold" id="review-ready-title">
                Sudah siap
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {readyChapters.map((chapter) => (
                  <li key={chapter.id}>
                    <Badge variant="success">{chapter.label}</Badge>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="review-optional-title">
              <h3 className="text-seraya-text-primary text-lg font-semibold" id="review-optional-title">
                Opsional
              </h3>
              <p className="text-seraya-text-secondary mt-2 text-sm leading-6">
                Bagian ini tidak menghalangi publish selama memang tidak diperlukan.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {optionalChapters.map((chapter) => (
                  <li key={chapter.id}>
                    <Badge>{chapter.label}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="border-seraya-border-default bg-seraya-canvas border-t px-5 py-6 sm:px-6 lg:border-t-0 lg:border-l">
            <div className="sticky top-6 space-y-4">
              <div>
                <p className="text-seraya-text-muted text-xs font-bold tracking-[0.08em] uppercase">
                  Draf yang akan digunakan
                </p>
                <p className="text-seraya-text-primary mt-2 font-semibold">{truth.saved.label}</p>
                <p className="text-seraya-text-secondary mt-1 text-sm leading-6">
                  {truth.saved.description}
                </p>
              </div>
              <Link
                className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold focus-visible:outline-3"
                href={`/dashboard/${projectId}/preview`}
              >
                Buka draf tersimpan
              </Link>
              {canPresentPublish ? (
                <PublishInvitationControls
                  hasActiveDraft
                  intent={isRepublish ? 'republish' : 'initial'}
                  presentation="readiness"
                  projectId={projectId}
                  publishedSlug={workspaceReadiness.invitation.publishedSlug}
                  publishEligibility={publishEligibility}
                />
              ) : (
                <div className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-md)] border px-4 py-4">
                  <p className="text-seraya-text-primary text-sm font-semibold">
                    Publish belum tersedia dari review ini
                  </p>
                  <p className="text-seraya-text-secondary mt-1 text-sm leading-6">
                    Selesaikan blocker, simpan draf, atau penuhi aktivasi yang masih diperlukan.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
