'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';

import { Button, Dialog, useToast } from '@/design-system';
import {
  initialDeliveryContactActionState,
  type DeliveryContactActionState,
} from '@/modules/delivery/delivery.action-state';

export type BoundDeliveryContactAction = (
  previousState: DeliveryContactActionState,
  formData: FormData,
) => Promise<DeliveryContactActionState>;

export function DeliveryContactRecordControl({
  action: boundAction,
  fullWidth = false,
  guestDisplayName,
}: {
  action: BoundDeliveryContactAction;
  fullWidth?: boolean;
  guestDisplayName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    boundAction,
    initialDeliveryContactActionState,
  );
  const handledKey = useRef<string | null>(null);

  useEffect(() => {
    if (
      state.status !== 'success' ||
      !state.resultKey ||
      handledKey.current === state.resultKey
    ) {
      return;
    }
    handledKey.current = state.resultKey;
    setOpen(false);
    toast({ title: state.message ?? 'Ditandai sudah dihubungi.', variant: 'success' });
    router.refresh();
  }, [router, state, toast]);

  return (
    <>
      <Button
        className={fullWidth ? 'w-full justify-center' : undefined}
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="secondary"
      >
        Tandai sudah dihubungi
      </Button>
      <Dialog
        description={`Gunakan hanya bila Anda memang sudah menghubungi ${guestDisplayName}. Catatan ini bukan bukti pesan diterima atau dibaca.`}
        onOpenChange={setOpen}
        open={open}
        title="Tandai sudah dihubungi?"
      >
        <form action={action} className="space-y-5">
          <input name="confirmManualContact" type="hidden" value="true" />
          {state.status === 'error' && state.message ? (
            <p className="text-seraya-status-error text-sm leading-6" role="alert">
              {state.message}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => setOpen(false)} type="button" variant="secondary">
              Batal
            </Button>
            <Button loading={pending} type="submit">
              Ya, sudah dihubungi
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
