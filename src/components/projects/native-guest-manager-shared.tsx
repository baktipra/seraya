'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef } from 'react';

import { Button, Dialog, Input, useToast } from '@/design-system';
import {
  initialDeliveryBatchActionState,
  type DeliveryBatchActionState,
} from '@/modules/delivery/delivery.action-state';
import type { GuestLinkActionState } from '@/modules/guest-links/guest-link.action-state';
import type { GuestActionState } from '@/modules/guests/guest.action-state';
import type { GuestImportActionState } from '@/modules/guests/guest-import.action-state';
import type { GuestListItem } from '@/modules/guests/guest.types';

export type BoundGuestBatchAction = (
  previousState: DeliveryBatchActionState,
  formData: FormData,
) => Promise<DeliveryBatchActionState>;

type SuccessActionState = Pick<
  GuestActionState | GuestImportActionState | GuestLinkActionState,
  'message' | 'status'
>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="text-seraya-status-error text-sm leading-6" id={id} role="alert">
      {message}
    </p>
  );
}

export function GuestFields({
  errors,
  guest,
}: {
  errors: GuestActionState['fieldErrors'];
  guest?: GuestListItem | null;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label
          className="text-seraya-text-primary text-sm font-semibold"
          htmlFor="guest-display-name"
        >
          Nama tamu
        </label>
        <Input
          aria-describedby={errors?.displayName ? 'guest-display-name-error' : undefined}
          autoCapitalize="words"
          autoComplete="name"
          defaultValue={guest?.display_name ?? ''}
          hasError={Boolean(errors?.displayName)}
          id="guest-display-name"
          maxLength={120}
          name="displayName"
          placeholder="Contoh: Keluarga Budi"
          required
        />
        <FieldError id="guest-display-name-error" message={errors?.displayName} />
      </div>

      <div className="space-y-2">
        <label
          className="text-seraya-text-primary text-sm font-semibold"
          htmlFor="guest-group-label"
        >
          Kelompok tamu <span className="text-seraya-text-muted font-normal">(opsional)</span>
        </label>
        <Input
          aria-describedby={
            errors?.groupLabel ? 'guest-group-label-error' : 'guest-group-label-help'
          }
          autoCapitalize="words"
          defaultValue={guest?.group_label ?? ''}
          hasError={Boolean(errors?.groupLabel)}
          id="guest-group-label"
          maxLength={40}
          name="groupLabel"
          placeholder="Contoh: Keluarga"
        />
        <p className="text-seraya-text-muted text-sm leading-6" id="guest-group-label-help">
          Contoh kelompok: Keluarga, Teman, Rekan kerja
        </p>
        <FieldError id="guest-group-label-error" message={errors?.groupLabel} />
      </div>

      <div className="space-y-2">
        <label
          className="text-seraya-text-primary text-sm font-semibold"
          htmlFor="guest-whatsapp-phone-e164"
        >
          Nomor WhatsApp <span className="text-seraya-text-muted font-normal">(opsional)</span>
        </label>
        <Input
          aria-describedby={
            errors?.whatsappPhoneE164
              ? 'guest-whatsapp-phone-e164-error'
              : 'guest-whatsapp-phone-e164-help'
          }
          autoComplete="tel"
          defaultValue={guest?.whatsapp_phone_e164 ?? ''}
          hasError={Boolean(errors?.whatsappPhoneE164)}
          id="guest-whatsapp-phone-e164"
          inputMode="tel"
          name="whatsappPhoneE164"
          placeholder="Contoh: 0812 3456 7890"
          type="tel"
        />
        <p className="text-seraya-text-muted text-sm leading-6" id="guest-whatsapp-phone-e164-help">
          Contoh: 0812 3456 7890
        </p>
        <FieldError id="guest-whatsapp-phone-e164-error" message={errors?.whatsappPhoneE164} />
      </div>

      <div className="space-y-2">
        <label
          className="text-seraya-text-primary text-sm font-semibold"
          htmlFor="guest-party-size"
        >
          Jumlah undangan
        </label>
        <Input
          aria-describedby={errors?.partySize ? 'guest-party-size-error' : undefined}
          defaultValue={guest?.party_size ?? 1}
          hasError={Boolean(errors?.partySize)}
          id="guest-party-size"
          max={20}
          min={1}
          name="partySize"
          required
          type="number"
        />
        <FieldError id="guest-party-size-error" message={errors?.partySize} />
      </div>
    </div>
  );
}

export function useGuestActionFeedback(state: SuccessActionState, onSuccess: () => void) {
  const router = useRouter();
  const { toast } = useToast();
  const lastSuccessMessage = useRef<string | null>(null);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (
      state.status !== 'success' ||
      !state.message ||
      lastSuccessMessage.current === state.message
    ) {
      return;
    }

    lastSuccessMessage.current = state.message;
    toast({ title: state.message, variant: 'success' });
    onSuccessRef.current();
    router.refresh();
  }, [router, state.message, state.status, toast]);
}

export function GuestManagerBatchPreparationDialog({
  guestIds,
  onOpenChange,
  open,
  prepareBatchAction: boundPrepareBatchAction,
}: {
  guestIds: string[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  prepareBatchAction: BoundGuestBatchAction;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [actionState, prepareBatchAction, pending] = useActionState(
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
      description="Hanya tamu tanpa link aktif yang diproses. Link aktif—termasuk link lama—tidak akan diganti secara batch."
      onOpenChange={onOpenChange}
      open={open}
      title={`Siapkan Undangan Pribadi untuk ${guestIds.length} tamu?`}
    >
      {hasResult ? (
        <div className="space-y-5">
          <p className="text-seraya-text-secondary text-sm leading-6">
            {actionState.createdCount ?? 0} Undangan Pribadi berhasil disiapkan.
          </p>
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
            Tamu berstatus Belum dibuat, Nonaktif, atau Kedaluwarsa akan disiapkan. Pembagian
            WhatsApp tetap dilakukan manual per tamu di Bagikan.
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
            <Button loading={pending} type="submit">
              Siapkan Undangan Pribadi
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

