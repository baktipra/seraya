'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef } from 'react';

import { Button } from '@/design-system';
import {
  initialGuestFollowUpHandoffActionState,
  type GuestFollowUpHandoffActionState,
} from '@/modules/follow-up/follow-up.action-state';
import type {
  GuestFollowUpHandoffMessageKind,
  GuestFollowUpHandoffResult,
} from '@/modules/follow-up/follow-up.types';

export type BoundGuestFollowUpHandoffAction = (
  previousState: GuestFollowUpHandoffActionState,
  formData: FormData,
) => Promise<GuestFollowUpHandoffActionState>;

type GuestFollowUpHandoffControlProps = {
  action: BoundGuestFollowUpHandoffAction;
  label: string;
  messageKind: GuestFollowUpHandoffMessageKind;
  onPrepared: (result: GuestFollowUpHandoffResult) => void;
};

export function GuestFollowUpHandoffControl({
  action: boundAction,
  label,
  messageKind,
  onPrepared,
}: GuestFollowUpHandoffControlProps) {
  const router = useRouter();
  const handledPreparedAtRef = useRef<string | null>(null);
  const [actionState, action, pending] = useActionState(
    boundAction,
    initialGuestFollowUpHandoffActionState,
  );

  useEffect(() => {
    if (
      actionState.status !== 'success' ||
      !actionState.messageKind ||
      !actionState.messageText ||
      !actionState.personalUrl ||
      !actionState.preparedAt ||
      !actionState.whatsappComposeUrl ||
      handledPreparedAtRef.current === actionState.preparedAt
    ) {
      return;
    }

    handledPreparedAtRef.current = actionState.preparedAt;
    onPrepared({
      messageKind: actionState.messageKind,
      messageText: actionState.messageText,
      personalUrl: actionState.personalUrl,
      preparedAt: actionState.preparedAt,
      whatsappComposeUrl: actionState.whatsappComposeUrl,
    });
    router.refresh();
  }, [
    actionState.messageKind,
    actionState.messageText,
    actionState.personalUrl,
    actionState.preparedAt,
    actionState.status,
    actionState.whatsappComposeUrl,
    onPrepared,
    router,
  ]);

  return (
    <form action={action} className="space-y-2">
      <input name="messageKind" type="hidden" value={messageKind} />
      <Button loading={pending} size="sm" type="submit">
        {label}
      </Button>
      {actionState.status === 'error' && actionState.message ? (
        <p className="text-seraya-status-error max-w-xs text-xs leading-5" role="alert">
          {actionState.message}
        </p>
      ) : null}
    </form>
  );
}
