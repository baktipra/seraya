'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';

import { Button, Dialog, useToast } from '@/design-system';
import {
  initialDeliveryBatchActionState,
  initialDeliveryLinkActionState,
  initialDeliveryWhatsAppClipboardActionState,
  type DeliveryLinkActionState,
} from '@/modules/delivery/delivery.action-state';
import { buildWhatsAppGuestInviteShareUrl } from '@/modules/guest-links/whatsapp-share';

import {
  type BoundDeliveryBatchAction,
  type BoundDeliveryClipboardAction,
  type BoundDeliveryLinkAction,
  safeCopy,
} from './native-guest-delivery-center-shared';

export function DeliveryLinkPreparationDialog({
  description,
  onOpenChange,
  onPrepared,
  open,
  prepareAction: boundPrepareAction,
  title,
}: {
  description: string;
  onOpenChange: (open: boolean) => void;
  onPrepared: (result: { personalUrl: string; recipientWhatsAppPhoneE164: string | null }) => void;
  open: boolean;
  prepareAction: BoundDeliveryLinkAction;
  title: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [actionState, prepareAction, isPreparing] = useActionState(
    boundPrepareAction,
    initialDeliveryLinkActionState,
  );
  const handledResult = useRef<DeliveryLinkActionState | null>(null);

  useEffect(() => {
    if (
      actionState.status !== 'success' ||
      !actionState.personalUrl ||
      handledResult.current === actionState
    ) {
      return;
    }

    handledResult.current = actionState;
    onPrepared({
      personalUrl: actionState.personalUrl,
      recipientWhatsAppPhoneE164: actionState.recipientWhatsAppPhoneE164 ?? null,
    });
    onOpenChange(false);
    toast({ title: 'Undangan Pribadi siap untuk disalin.', variant: 'success' });
    router.refresh();
  }, [actionState, onOpenChange, onPrepared, router, toast]);

  return (
    <Dialog description={description} onOpenChange={onOpenChange} open={open} title={title}>
      <form action={prepareAction} className="space-y-5" noValidate>
        <input name="confirmActiveReplacement" type="hidden" value="false" />
        {actionState.status === 'error' && actionState.message ? (
          <p className="text-seraya-status-error text-sm leading-6" role="alert">
            {actionState.message}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={() => onOpenChange(false)} type="button" variant="secondary">
            Batal
          </Button>
          <Button loading={isPreparing} type="submit">
            Siapkan Undangan Pribadi
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function PersonalLinkReaccessControl({
  emphasis = false,
  fullWidth = false,
  guestDisplayName,
  label,
  menuItem = false,
  operation,
  reaccessAction: boundReaccessAction,
}: {
  emphasis?: boolean;
  fullWidth?: boolean;
  guestDisplayName: string;
  label?: string;
  menuItem?: boolean;
  operation: 'copy' | 'open' | 'share';
  reaccessAction: BoundDeliveryLinkAction;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionState, reaccessAction, pending] = useActionState(
    boundReaccessAction,
    initialDeliveryLinkActionState,
  );
  const handledResult = useRef<DeliveryLinkActionState | null>(null);

  useEffect(() => {
    if (
      actionState.status !== 'success' ||
      !actionState.personalUrl ||
      handledResult.current === actionState
    ) {
      return;
    }
    handledResult.current = actionState;

    async function complete() {
      const personalUrl = actionState.personalUrl!;
      try {
        if (operation === 'copy') {
          await safeCopy(personalUrl);
          setFeedback('Tautan disalin. Status handoff tidak berubah.');
          toast({ title: 'Tautan pribadi disalin.', variant: 'success' });
          return;
        }

        if (operation === 'open') {
          window.open(personalUrl, '_blank', 'noopener,noreferrer');
          setFeedback('Undangan pribadi dibuka. Status handoff tidak berubah.');
          return;
        }

        const shareUrl =
          actionState.whatsappComposeUrl ??
          buildWhatsAppGuestInviteShareUrl({
            guestDisplayName,
            personalGuestUrl: personalUrl,
            recipientWhatsAppPhoneE164: actionState.recipientWhatsAppPhoneE164 ?? null,
          });
        window.open(shareUrl, '_blank', 'noopener,noreferrer');

        if (actionState.whatsappComposeUrl) {
          setFeedback('Handoff WhatsApp disiapkan. Lanjutkan pengiriman manual di WhatsApp.');
          toast({
            title: 'Handoff WhatsApp disiapkan—belum ditandai sebagai terkirim.',
            variant: 'success',
          });
        } else {
          setFeedback('WhatsApp dibuka kembali. Catatan handoff awal tidak diubah.');
        }
        router.refresh();
      } catch {
        setFeedback('Materi siap, tetapi tindakan browser belum dapat diselesaikan. Coba lagi.');
      }
    }

    void complete();
  }, [actionState, guestDisplayName, operation, router, toast]);

  const defaultLabel =
    operation === 'copy' ? 'Salin tautan' : operation === 'open' ? 'Buka undangan' : 'WhatsApp';
  const variant = emphasis ? 'primary' : operation === 'copy' ? 'secondary' : 'text';

  return (
    <form action={reaccessAction} className={fullWidth || menuItem ? 'w-full' : undefined}>
      <input name="operation" type="hidden" value={operation} />
      {menuItem ? (
        <button
          className="focus-visible:outline-seraya-focus-ring hover:bg-seraya-soft block min-h-10 w-full rounded-[var(--seraya-radius-sm)] px-3 py-2 text-left text-sm font-medium focus-visible:outline-3 focus-visible:outline-offset-[-2px]"
          disabled={pending}
          role="menuitem"
          type="submit"
        >
          {label ?? defaultLabel}
        </button>
      ) : (
        <Button
          className={fullWidth ? 'w-full justify-center' : undefined}
          disabled={pending}
          size="sm"
          type="submit"
          variant={variant}
        >
          {label ?? defaultLabel}
        </Button>
      )}
      <span aria-live="polite" className="sr-only">
        {feedback ?? actionState.message}
      </span>
    </form>
  );
}

export function DeliveryBatchPreparationDialog({
  guestIds,
  onOpenChange,
  open,
  prepareBatchAction: boundPrepareBatchAction,
}: {
  guestIds: string[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  prepareBatchAction: BoundDeliveryBatchAction;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [actionState, prepareBatchAction, isPreparing] = useActionState(
    boundPrepareBatchAction,
    initialDeliveryBatchActionState,
  );
  const hasResult = actionState.status === 'success' || actionState.status === 'partial';

  useEffect(() => {
    if (!hasResult) return;
    router.refresh();
    toast({
      title:
        actionState.status === 'partial'
          ? 'Sebagian Undangan Pribadi sudah disiapkan.'
          : 'Undangan Pribadi sudah disiapkan.',
      variant: actionState.status === 'partial' ? 'error' : 'success',
    });
  }, [actionState.status, hasResult, router, toast]);

  return (
    <Dialog
      description="Undangan Pribadi aktif yang sudah ada tidak akan diubah. Proses batch tidak menyiapkan atau mencatat handoff WhatsApp."
      onOpenChange={onOpenChange}
      open={open}
      title={`Siapkan Undangan Pribadi untuk ${guestIds.length} tamu?`}
    >
      {hasResult ? (
        <div className="space-y-5">
          <div
            className="border-seraya-border-default bg-seraya-brand-soft rounded-[var(--seraya-radius-sm)] border px-4 py-4 text-sm leading-6"
            role={actionState.status === 'partial' ? 'alert' : 'status'}
          >
            <p className="text-seraya-text-primary font-semibold">
              {actionState.createdCount ?? 0} Undangan Pribadi berhasil disiapkan.
            </p>
            {actionState.skippedActiveLinkCount ? (
              <p className="text-seraya-text-secondary mt-1">
                {actionState.skippedActiveLinkCount} tamu sudah memiliki tautan aktif dan tidak
                diubah.
              </p>
            ) : null}
            {actionState.whatsappMissingCreatedCount ? (
              <p className="text-seraya-text-secondary mt-1">
                {actionState.whatsappMissingCreatedCount} tamu belum memiliki Nomor WhatsApp.
              </p>
            ) : null}
            {actionState.failedCount ? (
              <p className="text-seraya-status-error mt-1">
                {actionState.failedCount} tamu belum dapat diproses. Coba lagi beberapa saat lagi.
              </p>
            ) : null}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} type="button">
              Selesai
            </Button>
          </div>
        </div>
      ) : (
        <form action={prepareBatchAction} className="space-y-5" noValidate>
          <input name="confirmBatchPreparation" type="hidden" value="true" />
          <input name="selectedGuestIds" type="hidden" value={JSON.stringify(guestIds)} />
          <p className="text-seraya-text-secondary text-sm leading-6">
            Hanya link yang disiapkan. Handoff WhatsApp tetap dilakukan dan dicatat secara manual
            per tamu.
          </p>
          {actionState.status === 'error' && actionState.message ? (
            <p className="text-seraya-status-error text-sm leading-6" role="alert">
              {actionState.message}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => onOpenChange(false)} type="button" variant="secondary">
              Batal
            </Button>
            <Button loading={isPreparing} type="submit">
              Siapkan Undangan Pribadi
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export function DeliveryWhatsAppCopyControl({
  copyAction: boundCopyAction,
  guestIds,
}: {
  copyAction: BoundDeliveryClipboardAction;
  guestIds: string[];
}) {
  const { toast } = useToast();
  const [actionState, copyAction, pending] = useActionState(
    boundCopyAction,
    initialDeliveryWhatsAppClipboardActionState,
  );

  useEffect(() => {
    if (actionState.status !== 'success' || !actionState.numbersText) return;
    void safeCopy(actionState.numbersText).then(
      () => toast({ title: actionState.message ?? 'Nomor WhatsApp disalin.', variant: 'success' }),
      () => toast({ title: 'Nomor WhatsApp siap disalin secara manual.', variant: 'error' }),
    );
  }, [actionState.message, actionState.numbersText, actionState.status, toast]);

  return (
    <form action={copyAction}>
      <input name="selectedGuestIds" type="hidden" value={JSON.stringify(guestIds)} />
      <Button
        disabled={pending || guestIds.length === 0}
        size="sm"
        type="submit"
        variant="secondary"
      >
        Salin nomor WhatsApp
      </Button>
    </form>
  );
}

