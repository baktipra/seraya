'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import { siteConfig } from '@/config/site';
import { Button, Dialog, useToast } from '@/design-system';
import type { ProjectPublishEligibility } from '@/modules/payments/payment.types';
import { initialPublishInvitationActionState } from '@/modules/publications/publication.action-state';
import { publishInvitationAction } from '@/modules/publications/publication.actions';

import { useInvitationEditorUnsavedChanges } from './invitation-editor-contextual-actions';

type PublishInvitationControlsProps = {
  presentation?: 'default' | 'readiness';
  intent?: 'initial' | 'republish';
  hasActiveDraft: boolean;
  projectId: string;
  publishedSlug: string | null;
  publishEligibility: ProjectPublishEligibility;
};

function getPublicInvitationUrl(slug: string) {
  return `${siteConfig.url.replace(/\/$/, '')}/${slug}`;
}

function getBlockedPublishCopy(
  hasActiveDraft: boolean,
  hasUnsavedEditorChanges: boolean,
  isRepublish: boolean,
  publishEligibility: ProjectPublishEligibility,
) {
  if (hasUnsavedEditorChanges) {
    return 'Simpan perubahan sebelum menerbitkan versi ini.';
  }

  if (!hasActiveDraft) {
    return 'Draft undangan perlu tersedia sebelum bisa dipublikasikan.';
  }

  if (isRepublish) {
    return 'Pembayaran terverifikasi diperlukan untuk menerbitkan perubahan baru.';
  }

  if (publishEligibility.reason === 'payment_pending') {
    return 'Pembayaran sedang menunggu verifikasi. Publikasi akan tersedia setelah pembayaran terverifikasi.';
  }

  if (publishEligibility.reason === 'payment_not_verified') {
    return 'Pembayaran terverifikasi diperlukan sebelum undangan dapat dipublikasikan.';
  }

  return 'Selesaikan pembayaran terverifikasi untuk mempublikasikan undangan.';
}

/**
 * Explicit publication authority. Readiness presentation now renders exactly
 * where it appears in JSX and subscribes to editor dirty state through React,
 * without DOM discovery, text parsing, observers, or portals.
 */
export function PublishInvitationControls({
  hasActiveDraft,
  intent,
  presentation = 'default',
  projectId,
  publishedSlug,
  publishEligibility,
}: PublishInvitationControlsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const lastPublishedSlugRef = useRef<string | null>(null);
  const action = useMemo(() => publishInvitationAction.bind(null, projectId), [projectId]);
  const [state, formAction, isPending] = useActionState(
    action,
    initialPublishInvitationActionState,
  );
  const hasUnsavedEditorChanges = useInvitationEditorUnsavedChanges();
  const effectivePublishedSlug = publishedSlug ?? state.publishedSlug ?? null;
  const publicUrl = effectivePublishedSlug ? getPublicInvitationUrl(effectivePublishedSlug) : null;
  const hasPublishedSnapshot = Boolean(publicUrl);
  const isRepublish = intent ? intent === 'republish' : hasPublishedSnapshot;
  const canPublish =
    hasActiveDraft && publishEligibility.allowed && !hasUnsavedEditorChanges && !isPending;
  const publishActionLabel = isRepublish ? 'Terbitkan perubahan' : 'Terbitkan undangan';
  const dialogTitle = isRepublish ? 'Terbitkan perubahan?' : 'Terbitkan undangan?';
  const dialogDescription = isRepublish
    ? 'Perubahan ini akan terlihat pada Link Publik dan semua Undangan Pribadi aktif. Tautan tamu tidak berubah.'
    : 'Setelah diterbitkan, Link Publik dapat dibuka oleh tamu. Undangan Pribadi dapat disiapkan dari halaman Bagikan.';
  const confirmationLabel = isRepublish ? 'Terbitkan perubahan' : 'Terbitkan sekarang';
  const blockedCopy = canPublish
    ? null
    : getBlockedPublishCopy(
        hasActiveDraft,
        hasUnsavedEditorChanges,
        isRepublish,
        publishEligibility,
      );

  useEffect(() => {
    if (state.status !== 'success' || !state.publishedSlug) return;
    if (lastPublishedSlugRef.current === state.publishedSlug) return;

    lastPublishedSlugRef.current = state.publishedSlug;
    setIsDialogOpen(false);
    toast({
      title: isRepublish ? 'Perubahan undangan sudah diterbitkan.' : 'Undangan sudah diterbitkan.',
      variant: 'success',
    });
    router.refresh();
  }, [isRepublish, router, state.publishedSlug, state.status, toast]);

  async function handleCopyLink() {
    if (!publicUrl) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }

      await navigator.clipboard.writeText(publicUrl);
      toast({ title: 'Link undangan sudah disalin.', variant: 'success' });
    } catch {
      toast({
        description: `Salin link ini secara manual: ${publicUrl}`,
        title: 'Link belum bisa disalin otomatis.',
        variant: 'warning',
      });
    }
  }

  return (
    <section
      aria-label="Kontrol penerbitan undangan"
      className={
        presentation === 'readiness'
          ? 'min-w-0 space-y-2 sm:min-w-64'
          : 'w-full space-y-4'
      }
      data-editor-publication-authority={presentation === 'readiness' || undefined}
    >
      {presentation === 'default' ? (
        publicUrl && effectivePublishedSlug ? (
          <div className="space-y-3">
            <div>
              <h2 className="text-seraya-text-primary text-base font-semibold">
                Undangan sudah dipublikasikan.
              </h2>
              <p className="text-seraya-text-muted mt-1 text-sm leading-6">
                Link undangan kalian sudah bisa dibuka oleh siapa saja yang memilikinya.
              </p>
            </div>
            <p className="border-seraya-border-default bg-seraya-canvas text-seraya-text-primary rounded-[var(--seraya-radius-md)] border px-3 py-2 text-sm font-semibold break-all">
              {publicUrl}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCopyLink} size="lg" type="button" variant="secondary">
                Salin link
              </Button>
              <Link
                className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-12 items-center justify-center rounded-[var(--seraya-radius-md)] px-5 text-base font-semibold shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
                href={`/${effectivePublishedSlug}`}
                rel="noreferrer"
                target="_blank"
              >
                Buka undangan
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-seraya-text-primary text-base font-semibold">Publikasi undangan</h2>
            <p className="text-seraya-text-muted mt-1 text-sm leading-6">
              Undangan akan tetap bisa ditinjau pribadi sampai kalian menerbitkannya.
            </p>
          </div>
        )
      ) : null}

      {!canPublish ? (
        <div className="space-y-2">
          <Button className="w-full" disabled size="lg" type="button">
            {publishActionLabel}
          </Button>
          <p className="text-seraya-text-muted text-xs leading-5 sm:text-sm sm:leading-6">
            {blockedCopy}
          </p>
          {hasActiveDraft && !hasUnsavedEditorChanges ? (
            <Link
              className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
              href={`/dashboard/${projectId}/billing`}
            >
              Lihat pembayaran
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <Button className="w-full" onClick={() => setIsDialogOpen(true)} size="lg" type="button">
            {publishActionLabel}
          </Button>
          <Dialog
            description={dialogDescription}
            onOpenChange={setIsDialogOpen}
            open={isDialogOpen}
            title={dialogTitle}
          >
            <form action={formAction} className="space-y-4">
              {state.status === 'error' && state.message ? (
                <p className="text-seraya-status-error text-sm leading-6" role="alert">
                  {state.message}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  disabled={isPending}
                  onClick={() => setIsDialogOpen(false)}
                  type="button"
                  variant="secondary"
                >
                  Batal
                </Button>
                <Button loading={isPending} type="submit">
                  {confirmationLabel}
                </Button>
              </div>
            </form>
          </Dialog>
        </>
      )}
    </section>
  );
}
