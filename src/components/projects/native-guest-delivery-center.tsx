'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import { PersonalGuestLinkResultActions } from '@/components/projects/personal-guest-link-result-actions';
import { RowOverflowMenu } from '@/components/projects/row-overflow-menu';
import {
  OperationalDataSurface,
  OperationalDesktopData,
  OperationalEmptyState,
  OperationalHeader,
  OperationalMetric,
  OperationalMetricStrip,
  OperationalMobileDataCard,
  OperationalMobileDataList,
  OperationalMobileField,
  OperationalSection,
  OperationalSelectionBar,
  OperationalToolbar,
  OperationalToolbarField,
  OperationalWorkspace,
} from '@/components/workspace/operational-primitives';
import { Button, Dialog, Input, useToast } from '@/design-system';
import {
  initialDeliveryBatchActionState,
  initialDeliveryLinkActionState,
  initialDeliveryWhatsAppClipboardActionState,
  type DeliveryBatchActionState,
  type DeliveryLinkActionState,
  type DeliveryWhatsAppClipboardActionState,
} from '@/modules/delivery/delivery.action-state';
import {
  deriveDeliveryReadiness,
  matchesDeliveryReadinessFilter,
} from '@/modules/delivery/delivery-readiness';
import type {
  DeliveryGuestRow,
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
  prepareAction?: BoundDeliveryLinkAction;
  reaccessAction?: BoundDeliveryLinkAction;
  rowKey: number;
};

type NativeGuestDeliveryCenterProps = {
  copyWhatsAppNumbersAction: BoundDeliveryClipboardAction;
  prepareBatchAction: BoundDeliveryBatchAction;
  projectId: string;
  rows: DeliveryGuestRowClient[];
  summary: DeliveryReadinessSummary;
};

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

  if (!response.ok) throw new Error('Export unavailable');

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = /filename="?([^";]+)"?/u.exec(disposition)?.[1] ?? 'seraya-export.xlsx';
  downloadBlob(await response.blob(), filename);
}

function StatusPill({ ready, children }: { ready: boolean; children: string }) {
  return (
    <span
      className={
        ready
          ? 'bg-seraya-status-success-soft text-seraya-status-success inline-flex rounded-full px-2.5 py-1 text-xs font-semibold'
          : 'bg-seraya-soft text-seraya-text-secondary inline-flex rounded-full px-2.5 py-1 text-xs font-semibold'
      }
    >
      {children}
    </span>
  );
}

function DeliveryLinkPreparationDialog({
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
  const onPreparedRef = useRef(onPrepared);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onPreparedRef.current = onPrepared;
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange, onPrepared]);

  useEffect(() => {
    if (actionState.status !== 'success' || !actionState.personalUrl) return;

    onPreparedRef.current({
      personalUrl: actionState.personalUrl,
      recipientWhatsAppPhoneE164: actionState.recipientWhatsAppPhoneE164 ?? null,
    });
    onOpenChangeRef.current(false);
    toast({ title: 'Undangan Pribadi siap untuk disalin.', variant: 'success' });
    router.refresh();
  }, [
    actionState.personalUrl,
    actionState.recipientWhatsAppPhoneE164,
    actionState.status,
    router,
    toast,
  ]);

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

function PersonalLinkReaccessControl({
  emphasis = false,
  fullWidth = false,
  guestDisplayName,
  menuItem = false,
  operation,
  reaccessAction: boundReaccessAction,
}: {
  emphasis?: boolean;
  fullWidth?: boolean;
  guestDisplayName: string;
  menuItem?: boolean;
  operation: 'copy' | 'open' | 'share';
  reaccessAction: BoundDeliveryLinkAction;
}) {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionState, reaccessAction, pending] = useActionState(
    boundReaccessAction,
    initialDeliveryLinkActionState,
  );

  useEffect(() => {
    if (actionState.status !== 'success' || !actionState.personalUrl) return;
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
    actionState.personalUrl,
    actionState.recipientWhatsAppPhoneE164,
    actionState.status,
    guestDisplayName,
    operation,
    toast,
  ]);

  const label = operation === 'copy' ? 'Copy' : operation === 'open' ? 'Buka undangan' : 'WhatsApp';
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
          {label}
        </button>
      ) : (
        <Button
          className={fullWidth ? 'w-full justify-center' : undefined}
          disabled={pending}
          size="sm"
          type="submit"
          variant={variant}
        >
          {label}
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
      description="Undangan Pribadi aktif yang sudah ada tidak akan diubah. URL mentah tidak ditampilkan dari proses batch."
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
                {actionState.skippedActiveLinkCount} tamu sudah memiliki tautan aktif dan tidak diubah.
              </p>
            ) : null}
            {actionState.skippedInactiveGuestCount ? (
              <p className="text-seraya-text-secondary mt-1">
                {actionState.skippedInactiveGuestCount} tamu tidak lagi aktif dan dilewati.
              </p>
            ) : null}
            {actionState.skippedInvalidProjectCount ? (
              <p className="text-seraya-text-secondary mt-1">
                {actionState.skippedInvalidProjectCount} pilihan tidak tersedia untuk project ini dan
                dilewati.
              </p>
            ) : null}
            {actionState.whatsappMissingCreatedCount ? (
              <p className="text-seraya-text-secondary mt-1">
                {actionState.whatsappMissingCreatedCount} tamu yang baru disiapkan belum memiliki Nomor
                WhatsApp.
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
            Hanya tamu tanpa Undangan Pribadi yang dapat disiapkan dari Bagikan. Pembagian WhatsApp
            tetap dilakukan manual per tamu.
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
      <Button disabled={pending || guestIds.length === 0} size="sm" type="submit" variant="secondary">
        Copy nomor WhatsApp
      </Button>
    </form>
  );
}

export function NativeGuestDeliveryCenter({
  copyWhatsAppNumbersAction,
  prepareBatchAction,
  projectId,
  rows,
  summary,
}: NativeGuestDeliveryCenterProps) {
  const [query, setQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<DeliveryReadinessFilter>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const [openOverflowKey, setOpenOverflowKey] = useState<string | null>(null);
  const [prepareGuest, setPrepareGuest] = useState<DeliveryGuestRowClient | null>(null);
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
      return matchesQuery && matchesDeliveryReadinessFilter(row, readinessFilter);
    });
  }, [query, readinessFilter, rows]);

  const visibleIds = filteredRows.map((row) => row.guestId);
  const selectedVisibleIds = selectedIds.filter((id) => visibleIds.includes(id));
  const selectedVisibleRows = filteredRows.filter((row) => selectedVisibleIds.includes(row.guestId));
  const selectedPreparationIds = selectedVisibleRows
    .filter((row) => deriveDeliveryReadiness(row).canPrepareNewLink)
    .map((row) => row.guestId);
  const selectedReadyIds = selectedVisibleRows
    .filter((row) => deriveDeliveryReadiness(row).isReadyToDistribute)
    .map((row) => row.guestId);
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setSelectedIds([]);
    setOpenOverflowKey(null);
  }

  function updateReadinessFilter(nextFilter: DeliveryReadinessFilter) {
    setReadinessFilter(nextFilter);
    setSelectedIds([]);
    setOpenOverflowKey(null);
  }

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
      await downloadOwnerXlsx(`/dashboard/${projectId}/delivery/export-xlsx`, selectedReadyIds);
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

  function renderOverflow(row: DeliveryGuestRowClient, view: 'desktop' | 'mobile') {
    if (!row.reaccessAction) return null;
    const menuKey = `${row.guestId}:${view}`;

    return (
      <RowOverflowMenu
        ariaLabel={`Aksi untuk ${row.displayName}`}
        onOpenChange={(open) => setOpenOverflowKey(open ? menuKey : null)}
        open={openOverflowKey === menuKey}
      >
        <PersonalLinkReaccessControl
          guestDisplayName={row.displayName}
          menuItem
          operation="open"
          reaccessAction={row.reaccessAction}
        />
      </RowOverflowMenu>
    );
  }

  function renderRowActions(row: DeliveryGuestRowClient, view: 'desktop' | 'mobile') {
    const readiness = deriveDeliveryReadiness(row);
    const canReaccess = readiness.isReadyToDistribute ? row.reaccessAction : undefined;
    const canPrepare = readiness.canPrepareNewLink ? row.prepareAction : undefined;

    if (canReaccess) {
      return (
        <div
          className={
            view === 'mobile'
              ? 'grid w-full grid-cols-2 gap-2'
              : 'flex flex-wrap justify-end gap-1.5'
          }
        >
          <PersonalLinkReaccessControl
            fullWidth={view === 'mobile'}
            guestDisplayName={row.displayName}
            operation="copy"
            reaccessAction={canReaccess}
          />
          <PersonalLinkReaccessControl
            emphasis={view === 'mobile'}
            fullWidth={view === 'mobile'}
            guestDisplayName={row.displayName}
            operation="share"
            reaccessAction={canReaccess}
          />
          {view === 'desktop' ? renderOverflow(row, view) : null}
        </div>
      );
    }

    if (canPrepare) {
      return (
        <Button
          className={view === 'mobile' ? 'w-full justify-center' : undefined}
          onClick={() => setPrepareGuest(row)}
          size="sm"
          type="button"
        >
          Siapkan Undangan Pribadi
        </Button>
      );
    }

    if (readiness.deliveryReadinessState === 'needs_whatsapp') {
      return (
        <Link
          className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
          href={`/dashboard/${projectId}/guests`}
        >
          Lengkapi di Tamu
        </Link>
      );
    }

    return (
      <div className={view === 'mobile' ? 'text-left' : 'flex flex-col items-end gap-1 text-right'}>
        <span className="text-seraya-text-muted text-xs leading-5">
          Tautan ini perlu diperbarui sebelum dapat dibagikan.
        </span>
        <Link
          className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
          href={`/dashboard/${projectId}/guests`}
        >
          Kelola di Tamu
        </Link>
      </div>
    );
  }

  return (
    <>
      <OperationalWorkspace labelledBy="delivery-center-title">
        <OperationalHeader
          description="Siapkan Undangan Pribadi yang eligible, lalu lanjutkan pembagian manual melalui WhatsApp tanpa klaim pesan terkirim atau diterima."
          eyebrow="Bagikan"
          title="Siapkan dan bagikan undangan"
          titleId="delivery-center-title"
        />

        <OperationalMetricStrip columns={5} label="Ringkasan kesiapan pengiriman">
          <OperationalMetric label="Tamu aktif" value={summary.activeGuestCount} />
          <OperationalMetric label="Siap dibagikan" value={summary.readyToDistributeCount} />
          <OperationalMetric label="Butuh WhatsApp" value={summary.needsWhatsAppCount} />
          <OperationalMetric
            label="Belum punya Undangan Pribadi"
            value={summary.noPersonalInvitationCount}
          />
          <OperationalMetric
            label="Tautan perlu diperbarui"
            mobileSpan="full"
            value={summary.needsLinkUpdateCount}
          />
        </OperationalMetricStrip>

        <OperationalSection
          description="Kesiapan yang sama dipakai untuk filter, row action, bulk preparation, WhatsApp handoff, dan export."
          title="Kesiapan Undangan Pribadi"
          titleId="delivery-guests-title"
        >
          <OperationalToolbar>
            <OperationalToolbarField htmlFor="delivery-search" label="Cari tamu">
              <Input
                id="delivery-search"
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Cari nama atau grup"
                value={query}
              />
            </OperationalToolbarField>
            <OperationalToolbarField htmlFor="delivery-readiness-filter" label="Filter kesiapan">
              <select
                className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-sm)] border px-3 text-sm focus-visible:outline-3 focus-visible:outline-offset-2"
                id="delivery-readiness-filter"
                onChange={(event) =>
                  updateReadinessFilter(event.target.value as DeliveryReadinessFilter)
                }
                value={readinessFilter}
              >
                <option value="all">Semua</option>
                <option value="ready_to_distribute">Siap dibagikan</option>
                <option value="needs_whatsapp">Butuh nomor WhatsApp</option>
                <option value="no_personal_invitation">Belum punya Undangan Pribadi</option>
                <option value="needs_link_update">Tautan perlu diperbarui</option>
              </select>
            </OperationalToolbarField>
          </OperationalToolbar>

          <OperationalDataSurface>
            {rows.length === 0 ? (
              <OperationalEmptyState
                action={
                  <Link
                    className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                    href={`/dashboard/${projectId}/guests`}
                  >
                    Kelola Tamu
                  </Link>
                }
                description="Tambahkan dan rapikan data tamu sebelum menyiapkan Undangan Pribadi."
                title="Belum ada tamu yang disiapkan."
              />
            ) : filteredRows.length === 0 ? (
              <OperationalEmptyState
                description="Ubah pencarian atau filter untuk melihat kesiapan tamu lain."
                title="Tidak ada tamu yang sesuai."
              />
            ) : (
              <>
                <OperationalDesktopData>
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-seraya-canvas text-seraya-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
                      <tr>
                        <th className="w-12 px-3 py-2.5">
                          <input
                            aria-label="Pilih semua tamu pada hasil aktif"
                            checked={allVisibleSelected}
                            className="accent-seraya-action-primary size-4"
                            onChange={toggleAllVisible}
                            type="checkbox"
                          />
                        </th>
                        <th className="px-3 py-2.5">Tamu</th>
                        <th className="px-3 py-2.5">WhatsApp</th>
                        <th className="px-3 py-2.5">Kesiapan</th>
                        <th className="px-3 py-2.5 text-right">
                          <span className="sr-only">Aksi cepat</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-seraya-border-default bg-seraya-surface divide-y">
                      {filteredRows.map((row) => {
                        const readiness = deriveDeliveryReadiness(row);
                        return (
                          <tr className="hover:bg-seraya-soft/45" key={row.rowKey}>
                            <td className="px-3 py-3 align-top">
                              <input
                                aria-label={`Pilih ${row.displayName}`}
                                checked={selectedVisibleIds.includes(row.guestId)}
                                className="accent-seraya-action-primary size-4"
                                onChange={() => toggleSelected(row.guestId)}
                                type="checkbox"
                              />
                            </td>
                            <td className="px-3 py-3 align-top">
                              <p className="text-seraya-text-primary font-semibold">{row.displayName}</p>
                              {row.groupLabel ? (
                                <p className="text-seraya-text-muted mt-0.5 text-xs leading-5">
                                  {row.groupLabel}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 align-top">
                              {row.maskedWhatsAppNumber ? (
                                <span className="text-seraya-text-secondary">
                                  {row.maskedWhatsAppNumber}
                                </span>
                              ) : (
                                <Link
                                  className="text-seraya-action-primary text-sm font-semibold underline-offset-4 hover:underline"
                                  href={`/dashboard/${projectId}/guests`}
                                >
                                  Lengkapi di Tamu
                                </Link>
                              )}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <StatusPill ready={readiness.isReadyToDistribute}>
                                {readiness.deliveryReadinessLabel}
                              </StatusPill>
                            </td>
                            <td className="px-3 py-3 text-right align-top">
                              {renderRowActions(row, 'desktop')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </OperationalDesktopData>

                <OperationalMobileDataList>
                  {filteredRows.map((row) => {
                    const readiness = deriveDeliveryReadiness(row);
                    return (
                      <OperationalMobileDataCard
                        identity={
                          <div className="flex min-w-0 items-start gap-3">
                            <input
                              aria-label={`Pilih ${row.displayName}`}
                              checked={selectedVisibleIds.includes(row.guestId)}
                              className="accent-seraya-action-primary mt-1 size-4 shrink-0"
                              onChange={() => toggleSelected(row.guestId)}
                              type="checkbox"
                            />
                            <div className="min-w-0">
                              <p className="text-seraya-text-primary font-semibold leading-5">
                                {row.displayName}
                              </p>
                              {row.groupLabel ? (
                                <p className="text-seraya-text-muted mt-0.5 text-xs leading-5">
                                  {row.groupLabel}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        }
                        key={row.guestId}
                        status={
                          <div className="flex items-start gap-2">
                            <StatusPill ready={readiness.isReadyToDistribute}>
                              {readiness.deliveryReadinessLabel}
                            </StatusPill>
                            {readiness.isReadyToDistribute ? renderOverflow(row, 'mobile') : null}
                          </div>
                        }
                      >
                        <dl data-operational-mobile-fields>
                          <OperationalMobileField
                            label="WhatsApp"
                            value={row.maskedWhatsAppNumber ?? 'Belum ada'}
                          />
                          <OperationalMobileField
                            align="end"
                            label="Langkah berikutnya"
                            value={readiness.deliveryFollowUpLabel}
                          />
                        </dl>
                        <div className="border-seraya-border-default mt-3 border-t pt-3">
                          {renderRowActions(row, 'mobile')}
                        </div>
                      </OperationalMobileDataCard>
                    );
                  })}
                </OperationalMobileDataList>
              </>
            )}
          </OperationalDataSurface>

          {filteredRows.length > 0 ? (
            <OperationalSelectionBar
              actions={
                <>
                  {readinessFilter === 'no_personal_invitation' ? (
                    <Button
                      disabled={selectedPreparationIds.length === 0}
                      onClick={() => setBatchOpen(true)}
                      size="sm"
                      type="button"
                    >
                      Siapkan Undangan Pribadi
                    </Button>
                  ) : null}
                  {readinessFilter === 'ready_to_distribute' ? (
                    <>
                      <Button
                        disabled={selectedReadyIds.length === 0}
                        onClick={() => void exportSelected()}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        Export Excel readiness
                      </Button>
                      <DeliveryWhatsAppCopyControl
                        copyAction={copyWhatsAppNumbersAction}
                        guestIds={selectedReadyIds}
                      />
                    </>
                  ) : null}
                  <Button
                    disabled={selectedVisibleIds.length === 0}
                    onClick={() => setSelectedIds([])}
                    size="sm"
                    type="button"
                    variant="text"
                  >
                    Batalkan pilihan
                  </Button>
                </>
              }
              status={
                <>
                  <span className="text-seraya-text-primary font-semibold">
                    {selectedVisibleIds.length} tamu terpilih
                  </span>{' '}
                  dari hasil aktif
                </>
              }
            />
          ) : null}

          <p aria-live="polite" className="text-seraya-text-muted text-sm">
            {copyFeedback}
          </p>
        </OperationalSection>
      </OperationalWorkspace>

      {batchOpen ? (
        <DeliveryBatchPreparationDialog
          guestIds={selectedPreparationIds}
          onOpenChange={setBatchOpen}
          open={batchOpen}
          prepareBatchAction={prepareBatchAction}
        />
      ) : null}

      {prepareGuest?.prepareAction ? (
        <DeliveryLinkPreparationDialog
          description={`Undangan Pribadi untuk ${prepareGuest.displayName} hanya ditampilkan satu kali setelah dibuat.`}
          onOpenChange={(open) => !open && setPrepareGuest(null)}
          onPrepared={(result) => {
            setPrepareGuest(null);
            setRevealedPersonalLink({ guestDisplayName: prepareGuest.displayName, ...result });
          }}
          open={Boolean(prepareGuest)}
          prepareAction={prepareGuest.prepareAction}
          title="Siapkan Undangan Pribadi"
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
        title="Undangan Pribadi siap"
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
    </>
  );
}
