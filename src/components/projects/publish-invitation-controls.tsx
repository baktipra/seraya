'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import { siteConfig } from '@/config/site';
import { Button, Dialog, useToast } from '@/design-system';
import { type ProjectPublishEligibility } from '@/modules/payments/payment.types';
import { initialPublishInvitationActionState } from '@/modules/publications/publication.action-state';
import { publishInvitationAction } from '@/modules/publications/publication.actions';

type PublishInvitationControlsProps = {
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
  isPublished: boolean,
  publishEligibility: ProjectPublishEligibility,
) {
  if (!hasActiveDraft) {
    return 'Draft undangan perlu tersedia sebelum bisa dipublikasikan.';
  }

  if (isPublished) {
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

export function PublishInvitationControls({
  hasActiveDraft,
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
  const effectivePublishedSlug = publishedSlug ?? state.publishedSlug ?? null;
  const publicUrl = effectivePublishedSlug ? getPublicInvitationUrl(effectivePublishedSlug) : null;
  const isPublished = Boolean(publicUrl);
  const canPublish = hasActiveDraft && publishEligibility.allowed;
  const publishActionLabel = isPublished ? 'Terbitkan perubahan' : 'Publikasikan undangan';
  const blockedCopy = canPublish
    ? null
    : getBlockedPublishCopy(hasActiveDraft, isPublished, publishEligibility);

  useEffect(() => {
    if (state.status !== 'success' || !state.publishedSlug) {
      return;
    }

    if (lastPublishedSlugRef.current === state.publishedSlug) {
      return;
    }

    lastPublishedSlugRef.current = state.publishedSlug;
    setIsDialogOpen(false);
    toast({
      title: 'Undangan sudah dipublikasikan.',
      variant: 'success',
    });
    router.refresh();
  }, [router, state.publishedSlug, state.status, toast]);

  async function handleCopyLink() {
    if (!publicUrl) {
      return;
    }

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
    <section aria-labelledby="publish-invitation-title" className="space-y-4">
      {publicUrl && effectivePublishedSlug ? (
        <div className="space-y-3">
          <div>
            <h2
              className="text-seraya-text-primary text-base font-semibold"
              id="publish-invitation-title"
            >
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
          <h2
            className="text-seraya-text-primary text-base font-semibold"
            id="publish-invitation-title"
          >
            Publikasi undangan
          </h2>
          <p className="text-seraya-text-muted mt-1 text-sm leading-6">
            Undangan akan tetap bisa ditinjau pribadi sampai kalian menerbitkannya.
          </p>
        </div>
      )}

      {!canPublish ? (
        <div className="space-y-3">
          <Button disabled size="lg" type="button">
            {publishActionLabel}
          </Button>
          <p className="text-seraya-text-muted text-sm leading-6">{blockedCopy}</p>
          {hasActiveDraft ? (
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
          <Button onClick={() => setIsDialogOpen(true)} size="lg" type="button">
            {publishActionLabel}
          </Button>
          <Dialog
            description="Link undangan kalian akan bisa dibuka oleh siapa saja yang memilikinya. Perubahan berikutnya tidak akan mengubah undangan publik sampai kalian menerbitkannya lagi."
            onOpenChange={setIsDialogOpen}
            open={isDialogOpen}
            title="Publikasikan undangan?"
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
                  Publikasikan sekarang
                </Button>
              </div>
            </form>
          </Dialog>
        </>
      )}
    </section>
  );
}
