'use client';

import { PersonalGuestLinkResultActions } from '@/components/projects/personal-guest-link-result-actions';
import { Button, Dialog } from '@/design-system';

import type { NativeGuestManagerController } from './native-guest-manager-controller';
import {
  getGuestLifecycleDialogCopy,
  getGuestLifecycleState,
  isActiveGuestLifecycle,
} from './native-guest-manager-lifecycle';
import { GuestManagerBatchPreparationDialog } from './native-guest-manager-shared';

export function NativeGuestManagerLinkDialogs({
  controller,
}: {
  controller: NativeGuestManagerController;
}) {
  const {
    batchOpen,
    copyFeedback,
    copyPersonalUrl,
    linkAction,
    linkGuest,
    linkPending,
    linkState,
    prepareBatchAction,
    projectId,
    reaccessAction,
    reaccessGuest,
    reaccessPending,
    reaccessState,
    revealedPersonalLink,
    revokeLinkAction,
    revokeLinkGuest,
    revokeLinkPending,
    revokeLinkState,
    selectedEligibleIds,
    setBatchOpen,
    setCopyFeedback,
    setLinkGuest,
    setReaccessGuest,
    setRevealedPersonalLink,
    setRevokeLinkGuest,
  } = controller;
  const linkGuestLifecycleState = linkGuest ? getGuestLifecycleState(linkGuest) : null;
  const linkDialogCopy = linkGuestLifecycleState
    ? getGuestLifecycleDialogCopy(linkGuestLifecycleState)
    : null;

  return (
    <>
      <Dialog
        description={
          reaccessGuest
            ? `Tampilkan kembali URL aktif untuk ${reaccessGuest.display_name} tanpa membuat atau mengganti tautan.`
            : undefined
        }
        onOpenChange={(open: boolean) => !open && setReaccessGuest(null)}
        open={Boolean(reaccessGuest)}
        title="Lihat tautan aktif?"
      >
        {reaccessGuest ? (
          <form action={reaccessAction} className="space-y-5">
            <input name="expectedLifecycleState" type="hidden" value="active_recoverable" />
            <input name="guestId" type="hidden" value={reaccessGuest.id} />
            <input name="operation" type="hidden" value="reaccess" />
            <input name="projectId" type="hidden" value={projectId} />
            <p className="text-seraya-text-secondary text-sm leading-6">
              URL didekripsi hanya untuk tindakan owner ini. Tidak ada URL baru, tidak ada perubahan
              akses tamu, dan tidak ada status kirim atau baca yang dibuat.
            </p>
            {reaccessState.status === 'error' && reaccessState.message ? (
              <p className="text-seraya-status-error text-sm leading-6" role="alert">
                {reaccessState.message}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={() => setReaccessGuest(null)} type="button" variant="secondary">
                Batal
              </Button>
              <Button loading={reaccessPending} type="submit">
                Tampilkan tautan
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        description={linkGuest && linkDialogCopy ? linkDialogCopy.description : undefined}
        onOpenChange={(open: boolean) => !open && setLinkGuest(null)}
        open={Boolean(linkGuest)}
        title={linkDialogCopy?.title ?? 'Kelola tautan pribadi'}
      >
        {linkGuest && linkDialogCopy && linkGuestLifecycleState ? (
          <form action={linkAction} className="space-y-5">
            <input
              name="confirmActiveReplacement"
              type="hidden"
              value={isActiveGuestLifecycle(linkGuestLifecycleState) ? 'true' : 'false'}
            />
            <input
              name="expectedLifecycleState"
              type="hidden"
              value={linkGuestLifecycleState}
            />
            <input name="guestId" type="hidden" value={linkGuest.id} />
            <input name="operation" type="hidden" value="create_or_replace" />
            <input name="projectId" type="hidden" value={projectId} />
            <div
              className="border-seraya-border-default bg-seraya-status-warning-soft rounded-[var(--seraya-radius-sm)] border px-4 py-3"
              role="note"
            >
              <p className="text-seraya-text-secondary text-sm leading-6">
                {linkDialogCopy.notice}
              </p>
            </div>
            {linkState.status === 'error' && linkState.message ? (
              <p className="text-seraya-status-error text-sm leading-6" role="alert">
                {linkState.message}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={() => setLinkGuest(null)} type="button" variant="secondary">
                Batal
              </Button>
              <Button loading={linkPending} type="submit">
                {linkDialogCopy.buttonLabel}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        description="Salin, buka, atau lanjutkan handoff manual. URL tidak disimpan di daftar tamu dan tidak menghasilkan status kirim atau baca."
        onOpenChange={(open: boolean) => {
          if (!open) {
            setRevealedPersonalLink(null);
            setCopyFeedback(null);
          }
        }}
        open={Boolean(revealedPersonalLink)}
        title="Tautan pribadi siap digunakan"
      >
        {revealedPersonalLink ? (
          <PersonalGuestLinkResultActions
            copyFeedback={copyFeedback}
            guestDisplayName={revealedPersonalLink.guestDisplayName}
            onClose={() => {
              setRevealedPersonalLink(null);
              setCopyFeedback(null);
            }}
            onCopy={copyPersonalUrl}
            personalUrl={revealedPersonalLink.personalUrl}
            recipientWhatsAppPhoneE164={revealedPersonalLink.recipientWhatsAppPhoneE164}
          />
        ) : null}
      </Dialog>

      {batchOpen ? (
        <GuestManagerBatchPreparationDialog
          guestIds={selectedEligibleIds}
          onOpenChange={setBatchOpen}
          open={batchOpen}
          prepareBatchAction={prepareBatchAction}
        />
      ) : null}

      <Dialog
        description={
          revokeLinkGuest
            ? `URL aktif untuk ${revokeLinkGuest.display_name} akan langsung berhenti berfungsi. Tindakan ini tidak membuat URL pengganti.`
            : undefined
        }
        onOpenChange={(open: boolean) => !open && setRevokeLinkGuest(null)}
        open={Boolean(revokeLinkGuest)}
        title="Nonaktifkan tautan pribadi?"
      >
        {revokeLinkGuest ? (
          <form action={revokeLinkAction} className="space-y-5">
            <input name="confirmRevocation" type="hidden" value="true" />
            <input
              name="expectedLifecycleState"
              type="hidden"
              value={getGuestLifecycleState(revokeLinkGuest)}
            />
            <input name="guestId" type="hidden" value={revokeLinkGuest.id} />
            <input name="operation" type="hidden" value="revoke" />
            <input name="projectId" type="hidden" value={projectId} />
            {revokeLinkState.status === 'error' && revokeLinkState.message ? (
              <p className="text-seraya-status-error text-sm leading-6" role="alert">
                {revokeLinkState.message}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={() => setRevokeLinkGuest(null)} type="button" variant="secondary">
                Batal
              </Button>
              <Button loading={revokeLinkPending} type="submit" variant="danger">
                Nonaktifkan tautan
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </>
  );
}
