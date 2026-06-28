'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import { PersonalGuestLinkResultActions } from '@/components/projects/personal-guest-link-result-actions';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  Input,
  useToast,
} from '@/design-system';
import {
  initialDeliveryBatchActionState,
  initialDeliveryLinkActionState,
  initialDeliveryWhatsAppClipboardActionState,
  type DeliveryBatchActionState,
  type DeliveryLinkActionState,
  type DeliveryWhatsAppClipboardActionState,
} from '@/modules/delivery/delivery.action-state';
import type {
  DeliveryGuestRow,
  DeliveryPersonalLinkState,
  DeliveryReadinessFilter,
  DeliveryReadinessSummary,
} from '@/modules/delivery/delivery.types';
import { buildWhatsAppGuestInviteShareUrl } from '@/modules/guest-links/whatsapp-share';

type BoundDeliveryLinkAction = (
  previousState: DeliveryLinkActionState,
  formData: FormData,
) => Promise<DeliveryLinkActionState>;
type BoundDeliveryBatchAction = (
  previousState: DeliveryBatchActionState,
  formData: FormData,
) => Promise<DeliveryBatchActionState>;
type BoundDeliveryClipboardAction = (
  previousState: DeliveryWhatsAppClipboardActionState,
  formData: FormData,
) => Promise<DeliveryWhatsAppClipboardActionState>;

type DeliveryGuestRowClient = DeliveryGuestRow & {
  guestId: string;
  prepareAction: BoundDeliveryLinkAction;
  reaccessAction: BoundDeliveryLinkAction;
  rowKey: number;
};

type GuestDeliveryCenterProps = {
  copyWhatsAppNumbersAction: BoundDeliveryClipboardAction;
  isPublished: boolean;
  prepareBatchAction: BoundDeliveryBatchAction;
  projectId: string;
  rows: DeliveryGuestRowClient[];
  summary: DeliveryReadinessSummary;
};

const personalLinkStateLabels: Record<DeliveryPersonalLinkState, string> = {
  active: 'Aktif',
  expired: 'Kedaluwarsa',
  not_created: 'Belum ada',
  revoked: 'Dinonaktifkan',
};

const rsvpStatusLabels = {
  attending: 'Hadir',
  declined: 'Tidak hadir',
  pending: 'Belum merespons',
} as const;

function ReadinessMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-seraya-border-default bg-seraya-surface min-w-0 rounded-[var(--seraya-radius-md)] border px-4 py-4">
      <p className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
        {label}
      </p>
      <p className="text-seraya-text-primary mt-2 text-2xl font-semibold tracking-[-0.03em]">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ children, tone = 'soft' }: { children: string; tone?: 'default' | 'soft' }) {
  return (
    <span
      className={
        tone === 'default'
          ? 'bg-seraya-brand-soft text-seraya-action-primary inline-flex rounded-full px-2.5 py-1 text-xs font-semibold'
          : 'bg-seraya-soft text-seraya-text-secondary inline-flex rounded-full px-2.5 py-1 text-xs font-semibold'
      }
    >
      {children}
    </span>
  );
}

function safeCopy(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

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

async function downloadOwnerXlsx(pathname: string, guestIds: string[]) {
  const response = await fetch(pathname, {
    body: JSON.stringify({ guestIds }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Export unavailable');
  }

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = /filename="?([^";]+)"?/u.exec(disposition)?.[1] ?? 'seraya-export.xlsx';
  downloadBlob(await response.blob(), filename);
}

function DeliveryLinkPreparationDialog({
  confirmActiveReplacement,
  description,
  onOpenChange,
  onPrepared,
  open,
  prepareAction: boundPrepareAction,
  title,
}: {
  confirmActiveReplacement: boolean;
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

  useEffect(() => {
    if (actionState.status !== 'success' || !actionState.personalUrl) return;
    onPrepared({
      personalUrl: actionState.personalUrl,
      recipientWhatsAppPhoneE164: actionState.recipientWhatsAppPhoneE164 ?? null,
    });
    onOpenChange(false);
    toast({ title: 'Tautan pribadi siap untuk disalin.', variant: 'success' });
    router.refresh();
  }, [
    actionState.personalUrl,
    actionState.recipientWhatsAppPhoneE164,
    actionState.status,
    onOpenChange,
    onPrepared,
    router,
    toast,
  ]);

  return (
    <Dialog description={description} onOpenChange={onOpenChange} open={open} title={title}>
      <form action={prepareAction} className="space-y-5" noValidate>
        <input
          name="confirmActiveReplacement"
          type="hidden"
          value={confirmActiveReplacement ? 'true' : 'false'}
        />
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
            {confirmActiveReplacement ? 'Perbarui tautan' : 'Buat Undangan Pribadi'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function PersonalLinkReaccessControls({
  guestDisplayName,
  mode,
  reaccessAction: boundReaccessAction,
}: {
  guestDisplayName: string;
  mode: 'link' | 'whatsapp';
  reaccessAction: BoundDeliveryLinkAction;
}) {
  const { toast } = useToast();
  const operationInput = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionState, reaccessAction, pending] = useActionState(
    boundReaccessAction,
    initialDeliveryLinkActionState,
  );

  useEffect(() => {
    if (actionState.status !== 'success' || !actionState.personalUrl) return;
    const operation = actionState.message;
    const personalUrl = actionState.personalUrl;

    async function complete() {
      try {
        if (operation === 'copy') {
          await safeCopy(personalUrl);
          setFeedback('Tautan disalin.');
          toast({ title: 'Tautan pribadi disalin.', variant: 'success' });
          return;
        }
        if (operation === 'open') {
          window.open(personalUrl, '_blank', 'noopener,noreferrer');
          setFeedback('Undangan pribadi dibuka.');
          return;
        }
        const shareUrl = buildWhatsAppGuestInviteShareUrl({
          guestDisplayName,
          personalGuestUrl: personalUrl,
          recipientWhatsAppPhoneE164: actionState.recipientWhatsAppPhoneE164 ?? null,
        });
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
        setFeedback('WhatsApp siap dibuka untuk dibagikan manual.');
      } catch {
        setFeedback('Tautan siap, tetapi tindakan browser belum dapat diselesaikan. Coba lagi.');
      }
    }

    void complete();
  }, [
    actionState.message,
    actionState.personalUrl,
    actionState.recipientWhatsAppPhoneE164,
    actionState.status,
    guestDisplayName,
    toast,
  ]);

  return (
    <form action={reaccessAction} className="flex flex-wrap gap-2">
      <input name="operation" ref={operationInput} type="hidden" value="copy" />
      {mode === 'link' ? (
        <>
          <Button
            disabled={pending}
            onClick={() => {
              if (operationInput.current) operationInput.current.value = 'copy';
            }}
            size="sm"
            type="submit"
            variant="secondary"
          >
            Copy tautan
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              if (operationInput.current) operationInput.current.value = 'open';
            }}
            size="sm"
            type="submit"
            variant="text"
          >
            Buka undangan
          </Button>
        </>
      ) : (
        <Button
          disabled={pending}
          onClick={() => {
            if (operationInput.current) operationInput.current.value = 'share';
          }}
          size="sm"
          type="submit"
          variant="text"
        >
          Bagikan WhatsApp
        </Button>
      )}
      <span aria-live="polite" className="sr-only">
        {feedback ?? actionState.message}
      </span>
    </form>
  );
}

function DeliveryBatchPreparationDialog({
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
      description="Tautan aktif yang sudah ada tidak akan diubah. URL mentah tidak ditampilkan dari proses batch."
      onOpenChange={onOpenChange}
      open={open}
      title={`Siapkan Undangan Pribadi untuk ${guestIds.length} tamu?`}
    >
      {hasResult ? (
        <div className="space-y-5">
          <div
            className="border-seraya-border-default bg-seraya-brand-soft rounded-[var(--seraya-radius-md)] border px-4 py-4 text-sm leading-6"
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
            {actionState.skippedInactiveGuestCount ? (
              <p className="text-seraya-text-secondary mt-1">
                {actionState.skippedInactiveGuestCount} tamu tidak lagi aktif dan dilewati.
              </p>
            ) : null}
            {actionState.skippedInvalidProjectCount ? (
              <p className="text-seraya-text-secondary mt-1">
                {actionState.skippedInvalidProjectCount} pilihan tidak tersedia untuk project ini
                dan dilewati.
              </p>
            ) : null}
            {actionState.whatsappMissingCreatedCount ? (
              <p className="text-seraya-text-secondary mt-1">
                {actionState.whatsappMissingCreatedCount} tamu yang baru disiapkan belum memiliki
                Nomor WhatsApp.
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
            Tamu dengan link aktif tidak akan diubah. Pembagian WhatsApp tetap dilakukan manual per
            tamu.
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

function DeliveryWhatsAppCopyControl({
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
        Copy nomor WhatsApp
      </Button>
    </form>
  );
}

function matchesReadinessFilter(row: DeliveryGuestRowClient, filter: DeliveryReadinessFilter) {
  if (filter === 'ready') return row.personalLinkState === 'active';
  if (filter === 'not_ready') return row.personalLinkState !== 'active';
  if (filter === 'missing_whatsapp') return row.whatsappAvailability === 'missing';
  return true;
}

/** Private, compact operational workspace. It contains no sending, tracking, or history. */
export function GuestDeliveryCenter({
  copyWhatsAppNumbersAction,
  isPublished,
  prepareBatchAction,
  projectId,
  rows,
  summary,
}: GuestDeliveryCenterProps) {
  const [query, setQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<DeliveryReadinessFilter>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const [prepareGuest, setPrepareGuest] = useState<DeliveryGuestRowClient | null>(null);
  const [replaceGuest, setReplaceGuest] = useState<DeliveryGuestRowClient | null>(null);
  const [revealedPersonalLink, setRevealedPersonalLink] = useState<{
    guestDisplayName: string;
    personalUrl: string;
    recipientWhatsAppPhoneE164: string | null;
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        row.displayName.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
        row.groupLabel?.toLocaleLowerCase('id-ID').includes(normalizedQuery);
      return matchesQuery && matchesReadinessFilter(row, readinessFilter);
    });
  }, [query, readinessFilter, rows]);

  const visibleIds = filteredRows.map((row) => row.guestId);
  const selectedVisibleIds = selectedIds.filter((id) => visibleIds.includes(id));
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;

  function toggleSelected(guestId: string) {
    setSelectedIds((current) =>
      current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId],
    );
  }

  function toggleAllVisible() {
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
    );
  }

  async function exportSelected() {
    try {
      await downloadOwnerXlsx(
        `/dashboard/${projectId}/delivery/export-xlsx`,
        selectedVisibleIds.length ? selectedVisibleIds : visibleIds,
      );
    } catch {
      setCopyFeedback('Export Excel belum bisa disiapkan. Coba lagi beberapa saat lagi.');
    }
  }

  async function copyOneTimeLink() {
    if (!revealedPersonalLink) return;
    try {
      await safeCopy(revealedPersonalLink.personalUrl);
      setCopyFeedback('Tautan disalin.');
    } catch {
      setCopyFeedback('Salin tautan ini secara manual.');
    }
  }

  return (
    <section
      aria-labelledby="delivery-center-title"
      className="mx-auto max-w-7xl space-y-5 sm:space-y-7"
    >
      <header className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-6 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <Link
          className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
          href={`/dashboard/${projectId}`}
        >
          ← Kembali ke project
        </Link>
        <h1 className="seraya-display-md mt-5" id="delivery-center-title">
          Delivery Center
        </h1>
        <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
          Undangan Pribadi menyertakan sapaan, RSVP, dan ucapan tamu. Siapkan lalu bagikan manual
          per tamu.
        </p>
      </header>

      <section
        aria-label="Ringkasan kesiapan pengiriman"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <ReadinessMetric label="Tamu aktif" value={summary.activeGuestCount} />
        <ReadinessMetric label="Siap dibagikan" value={summary.activePersonalLinkCount} />
        <ReadinessMetric
          label="Belum siap dibagikan"
          value={summary.guestsWithoutActivePersonalLinkCount}
        />
        <ReadinessMetric label="Belum punya Nomor WhatsApp" value={summary.whatsappMissingCount} />
      </section>

      <Card aria-labelledby="delivery-guests-title">
        <CardHeader>
          <CardTitle
            className="font-sans text-lg font-semibold tracking-[-0.02em]"
            id="delivery-guests-title"
          >
            Kesiapan tamu
          </CardTitle>
          <CardDescription>
            Pilih tamu pada hasil yang sedang terlihat untuk menyiapkan Undangan Pribadi, export
            Excel, atau menyalin Nomor WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5 sm:pt-6">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="space-y-2">
              <label
                className="text-seraya-text-primary text-sm font-semibold"
                htmlFor="delivery-search"
              >
                Cari tamu
              </label>
              <Input
                id="delivery-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau kelompok"
                type="search"
                value={query}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-seraya-text-primary text-sm font-semibold"
                htmlFor="delivery-readiness-filter"
              >
                Filter kesiapan
              </label>
              <select
                className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-md)] border px-3.5 text-base focus-visible:outline-3 focus-visible:outline-offset-2"
                id="delivery-readiness-filter"
                onChange={(event) =>
                  setReadinessFilter(event.target.value as DeliveryReadinessFilter)
                }
                value={readinessFilter}
              >
                <option value="all">Semua</option>
                <option value="not_ready">Belum siap dibagikan</option>
                <option value="ready">Siap dibagikan</option>
                <option value="missing_whatsapp">Belum punya Nomor WhatsApp</option>
              </select>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
              <p className="text-seraya-text-primary font-semibold">
                Belum ada tamu untuk disiapkan
              </p>
              <Link
                className="text-seraya-action-primary mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
                href={`/dashboard/${projectId}/guests`}
              >
                Kelola Tamu
              </Link>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
              <p className="text-seraya-text-primary font-semibold">Tidak ada tamu yang sesuai.</p>
            </div>
          ) : (
            <div className="border-seraya-border-default overflow-x-auto rounded-[var(--seraya-radius-md)] border">
              <table className="w-full min-w-[1110px] border-collapse text-left text-sm">
                <thead className="bg-seraya-canvas text-seraya-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        aria-label="Pilih semua tamu pada hasil aktif"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        type="checkbox"
                      />
                    </th>
                    <th className="px-3 py-3">Nama Tamu</th>
                    <th className="px-3 py-3">Nomor WhatsApp</th>
                    <th className="px-3 py-3">Status Link</th>
                    <th className="px-3 py-3">Kesiapan</th>
                    <th className="px-3 py-3">Link</th>
                    <th className="px-3 py-3">WhatsApp</th>
                    <th className="px-3 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-seraya-border-default bg-seraya-surface divide-y">
                  {filteredRows.map((row) => {
                    const isSelected = selectedIds.includes(row.guestId);
                    const active = row.personalLinkState === 'active';
                    return (
                      <tr key={row.rowKey}>
                        <td className="px-4 py-4 align-top">
                          <input
                            aria-label={`Pilih ${row.displayName}`}
                            checked={isSelected}
                            onChange={() => toggleSelected(row.guestId)}
                            type="checkbox"
                          />
                        </td>
                        <td className="px-3 py-4 align-top">
                          <p className="text-seraya-text-primary font-semibold">
                            {row.displayName}
                          </p>
                          {row.groupLabel ? (
                            <p className="text-seraya-text-muted mt-1">{row.groupLabel}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-4 align-top">
                          {row.maskedWhatsAppNumber ? (
                            <span className="text-seraya-text-secondary">
                              {row.maskedWhatsAppNumber}
                            </span>
                          ) : (
                            <StatusPill>Belum tersedia</StatusPill>
                          )}
                        </td>
                        <td className="px-3 py-4 align-top">
                          <StatusPill tone={active ? 'default' : 'soft'}>
                            {personalLinkStateLabels[row.personalLinkState]}
                          </StatusPill>
                          {active && row.personalLinkReaccessState === 'legacy' ? (
                            <p className="text-seraya-text-muted mt-1 max-w-40 text-xs leading-5">
                              Tautan lama belum dapat disalin
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-4 align-top">
                          <StatusPill tone={active ? 'default' : 'soft'}>
                            {active ? 'Siap dibagikan' : 'Belum siap dibagikan'}
                          </StatusPill>
                          <p className="text-seraya-text-muted mt-1 text-xs">
                            RSVP: {rsvpStatusLabels[row.rsvpStatus]}
                          </p>
                        </td>
                        <td className="px-3 py-4 align-top">
                          {active && row.personalLinkReaccessState === 'recoverable' ? (
                            <PersonalLinkReaccessControls
                              guestDisplayName={row.displayName}
                              mode="link"
                              reaccessAction={row.reaccessAction}
                            />
                          ) : active && row.personalLinkReaccessState === 'legacy' ? (
                            <Button
                              disabled={!isPublished}
                              onClick={() => setReplaceGuest(row)}
                              size="sm"
                              type="button"
                              variant="secondary"
                            >
                              Perbarui tautan agar dapat dikelola
                            </Button>
                          ) : (
                            <span className="text-seraya-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-4 align-top">
                          {active && row.personalLinkReaccessState === 'recoverable' ? (
                            <PersonalLinkReaccessControls
                              guestDisplayName={row.displayName}
                              mode="whatsapp"
                              reaccessAction={row.reaccessAction}
                            />
                          ) : active && row.personalLinkReaccessState === 'legacy' ? (
                            <span className="text-seraya-text-muted text-sm">
                              Tautan perlu diperbarui
                            </span>
                          ) : row.whatsappAvailability === 'available' ? (
                            <span className="text-seraya-text-secondary text-sm">
                              Siap untuk share manual
                            </span>
                          ) : (
                            <Link
                              className="text-seraya-action-primary text-sm font-semibold underline-offset-4 hover:underline"
                              href={`/dashboard/${projectId}/guests`}
                            >
                              Lengkapi nomor
                            </Link>
                          )}
                        </td>
                        <td className="px-3 py-4 align-top">
                          {!active ? (
                            <Button
                              disabled={!isPublished}
                              onClick={() => setPrepareGuest(row)}
                              size="sm"
                              type="button"
                              variant="secondary"
                            >
                              Buat Undangan Pribadi
                            </Button>
                          ) : (
                            <Button
                              disabled={!isPublished}
                              onClick={() => setReplaceGuest(row)}
                              size="sm"
                              type="button"
                              variant="text"
                            >
                              Buat ulang tautan
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredRows.length > 0 ? (
            <div className="border-seraya-border-default bg-seraya-canvas sticky bottom-0 flex flex-col gap-3 rounded-[var(--seraya-radius-md)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p aria-live="polite" className="text-seraya-text-secondary text-sm">
                <span className="text-seraya-text-primary font-semibold">
                  {selectedVisibleIds.length} tamu terpilih
                </span>{' '}
                dari hasil aktif
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={selectedVisibleIds.length === 0}
                  onClick={() => setBatchOpen(true)}
                  size="sm"
                  type="button"
                >
                  Siapkan Undangan Pribadi
                </Button>
                <Button
                  disabled={selectedVisibleIds.length === 0}
                  onClick={() => void exportSelected()}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Export Excel (.xlsx)
                </Button>
                <DeliveryWhatsAppCopyControl
                  copyAction={copyWhatsAppNumbersAction}
                  guestIds={selectedVisibleIds}
                />
                <Button
                  disabled={selectedVisibleIds.length === 0}
                  onClick={() =>
                    setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)))
                  }
                  size="sm"
                  type="button"
                  variant="text"
                >
                  Batalkan pilihan
                </Button>
              </div>
            </div>
          ) : null}
          <p aria-live="polite" className="text-seraya-text-muted text-sm">
            {copyFeedback}
          </p>
        </CardContent>
      </Card>

      {batchOpen ? (
        <DeliveryBatchPreparationDialog
          guestIds={selectedVisibleIds}
          onOpenChange={setBatchOpen}
          open={batchOpen}
          prepareBatchAction={prepareBatchAction}
        />
      ) : null}
      {prepareGuest ? (
        <DeliveryLinkPreparationDialog
          confirmActiveReplacement={false}
          description={`Tautan baru untuk ${prepareGuest.displayName} hanya ditampilkan satu kali setelah dibuat.`}
          onOpenChange={(open) => !open && setPrepareGuest(null)}
          onPrepared={(result) => {
            setPrepareGuest(null);
            setRevealedPersonalLink({ guestDisplayName: prepareGuest.displayName, ...result });
          }}
          open={Boolean(prepareGuest)}
          prepareAction={prepareGuest.prepareAction}
          title="Buat Undangan Pribadi"
        />
      ) : null}
      {replaceGuest ? (
        <DeliveryLinkPreparationDialog
          confirmActiveReplacement
          description="Tautan aktif lama akan berhenti berlaku setelah tautan baru dibuat. Tautan baru dapat dikelola ulang dari Delivery Center."
          onOpenChange={(open) => !open && setReplaceGuest(null)}
          onPrepared={(result) => {
            setReplaceGuest(null);
            setRevealedPersonalLink({ guestDisplayName: replaceGuest.displayName, ...result });
          }}
          open={Boolean(replaceGuest)}
          prepareAction={replaceGuest.prepareAction}
          title="Perbarui tautan pribadi"
        />
      ) : null}
      <Dialog
        description="Tautan ini hanya muncul pada tindakan owner yang sah."
        onOpenChange={(open) => {
          if (!open) {
            setRevealedPersonalLink(null);
            setCopyFeedback(null);
          }
        }}
        open={Boolean(revealedPersonalLink)}
        title="Tautan pribadi siap"
      >
        {revealedPersonalLink ? (
          <PersonalGuestLinkResultActions
            copyFeedback={copyFeedback}
            guestDisplayName={revealedPersonalLink.guestDisplayName}
            onClose={() => setRevealedPersonalLink(null)}
            onCopy={copyOneTimeLink}
            personalUrl={revealedPersonalLink.personalUrl}
            recipientWhatsAppPhoneE164={revealedPersonalLink.recipientWhatsAppPhoneE164}
          />
        ) : null}
      </Dialog>
    </section>
  );
}
