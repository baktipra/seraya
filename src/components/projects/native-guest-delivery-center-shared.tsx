'use client';

import { deriveDeliveryDistribution } from '@/modules/delivery/delivery-distribution';
import type {
  DeliveryBatchActionState,
  DeliveryLinkActionState,
  DeliveryWhatsAppClipboardActionState,
} from '@/modules/delivery/delivery.action-state';
import type {
  DeliveryDistributionFilter,
  DeliveryDistributionState,
  DeliveryGuestRow,
  DeliveryHandoffSummary,
  DeliveryReadinessSummary,
} from '@/modules/delivery/delivery.types';

import type { BoundDeliveryContactAction } from './native-guest-delivery-contact-control';

export type BoundDeliveryLinkAction = (
  previousState: DeliveryLinkActionState,
  formData: FormData,
) => Promise<DeliveryLinkActionState>;

export type BoundDeliveryBatchAction = (
  previousState: DeliveryBatchActionState,
  formData: FormData,
) => Promise<DeliveryBatchActionState>;

export type BoundDeliveryClipboardAction = (
  previousState: DeliveryWhatsAppClipboardActionState,
  formData: FormData,
) => Promise<DeliveryWhatsAppClipboardActionState>;

export type DeliveryGuestRowClient = DeliveryGuestRow & {
  contactAction?: BoundDeliveryContactAction;
  guestId: string;
  prepareAction?: BoundDeliveryLinkAction;
  reaccessAction?: BoundDeliveryLinkAction;
  rowKey: number;
};

export type NativeGuestDeliveryCenterProps = {
  copyWhatsAppNumbersAction: BoundDeliveryClipboardAction;
  handoffSummary: DeliveryHandoffSummary;
  prepareBatchAction: BoundDeliveryBatchAction;
  projectId: string;
  rows: DeliveryGuestRowClient[];
  summary: DeliveryReadinessSummary;
};

export const distributionFilterOptions: ReadonlyArray<{
  label: string;
  value: DeliveryDistributionFilter;
}> = [
  { label: 'Semua', value: 'all' },
  { label: 'Siap dibagikan', value: 'ready_for_handoff' },
  { label: 'Belum siap', value: 'not_ready' },
  { label: 'Sudah disiapkan', value: 'handoff_prepared' },
  { label: 'Sudah dihubungi', value: 'contact_recorded' },
  { label: 'Menunggu RSVP', value: 'awaiting_rsvp' },
];

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Jakarta',
});

export function safeCopy(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  const didCopy = document.execCommand('copy');
  textArea.remove();
  return didCopy ? Promise.resolve() : Promise.reject(new Error('Clipboard unavailable'));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadOwnerXlsx(pathname: string, guestIds: string[]) {
  const response = await fetch(pathname, {
    body: JSON.stringify({ guestIds }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) throw new Error('Export unavailable');
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = /filename="?([^";]+)"?/u.exec(disposition)?.[1] ?? 'seraya-export.xlsx';
  downloadBlob(await response.blob(), filename);
}

export function formatDeliveryTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

/** Compatibility for the existing split data module. */
export const formatHandoffTime = formatDeliveryTime;

function getDistributionTone(state: DeliveryDistributionState) {
  if (state === 'contact_recorded') {
    return 'bg-seraya-status-success-soft text-seraya-status-success';
  }
  if (state === 'handoff_prepared' || state === 'ready_for_handoff') {
    return 'bg-seraya-brand-soft text-seraya-action-primary';
  }
  if (state === 'no_personal_invitation') {
    return 'bg-seraya-soft text-seraya-text-secondary';
  }
  return 'bg-seraya-status-warning-soft text-seraya-status-warning';
}

export function DistributionStatus({
  row,
  showDetail = true,
}: {
  row: DeliveryGuestRow;
  showDetail?: boolean;
}) {
  const truth = deriveDeliveryDistribution(row);
  const preparedAt = formatDeliveryTime(truth.initialHandoffPreparedAt);
  const contactAt = formatDeliveryTime(truth.contactRecordedAt);

  return (
    <div className="min-w-0">
      <span
        className={`${getDistributionTone(truth.distributionState)} inline-flex max-w-full rounded-full px-2.5 py-1 text-xs leading-5 font-semibold`}
      >
        {truth.distributionLabel}
      </span>
      {showDetail ? (
        <p className="text-seraya-text-muted mt-1.5 max-w-[19rem] text-xs leading-5">
          {contactAt
            ? `Dicatat ${contactAt}. Bukan bukti pesan diterima atau dibaca.`
            : preparedAt
              ? `Disiapkan ${preparedAt}. Belum dianggap terkirim.`
              : truth.nextStepLabel}
        </p>
      ) : null}
    </div>
  );
}
