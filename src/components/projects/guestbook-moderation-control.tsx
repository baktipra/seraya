'use client';

import { useParams } from 'next/navigation';
import { useActionState } from 'react';

import { Button } from '@/design-system';
import {
  initialGuestbookActionState,
  moderateGuestbookEntryAction,
} from '@/modules/guestbook';

export function GuestbookModerationControl(input: {
  entryId: string;
  hiddenFromGuestFeed: boolean;
  shareWithGuests: boolean;
}) {
  const params = useParams<{ projectId?: string }>();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const [state, action, pending] = useActionState(
    moderateGuestbookEntryAction,
    initialGuestbookActionState,
  );

  if (!input.shareWithGuests) {
    return <span className="text-seraya-text-muted text-xs font-medium">Pribadi</span>;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <span className="text-seraya-text-muted text-xs font-semibold">
        {input.hiddenFromGuestFeed ? 'Disembunyikan dari tamu' : 'Tampil ke tamu'}
      </span>
      {projectId ? (
        <form action={action}>
          <input name="entryId" type="hidden" value={input.entryId} />
          <input name="projectId" type="hidden" value={projectId} />
          <input
            name="hidden"
            type="hidden"
            value={input.hiddenFromGuestFeed ? 'false' : 'true'}
          />
          <Button disabled={pending} size="sm" type="submit" variant="secondary">
            {pending
              ? 'Menyimpan…'
              : input.hiddenFromGuestFeed
                ? 'Tampilkan ke tamu'
                : 'Sembunyikan dari tamu'}
          </Button>
        </form>
      ) : null}
      {state.status !== 'idle' && state.message ? (
        <p
          aria-live={state.status === 'error' ? 'assertive' : 'polite'}
          className="text-seraya-text-muted max-w-64 text-right text-xs leading-5"
          role={state.status === 'error' ? 'alert' : 'status'}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
