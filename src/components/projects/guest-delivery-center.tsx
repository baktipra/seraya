'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useState } from 'react';

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
  type DeliveryBatchActionState,
  type DeliveryLinkActionState,
} from '@/modules/delivery/delivery.action-state';
import type {
  DeliveryPersonalLinkState,
  DeliveryReadinessFilter,
  DeliveryReadinessSummary,
  DeliveryWhatsAppAvailability,
} from '@/modules/delivery/delivery.types';

type BoundDeliveryLinkAction = (
  previousState: DeliveryLinkActionState,
  formData: FormData,
) => Promise<DeliveryLinkActionState>;

type BoundDeliveryBatchAction = (
  previousState: DeliveryBatchActionState,
  formData: FormData,
) => Promise<DeliveryBatchActionState>;

type DeliveryGuestRowClient = {
  displayName: string;
  groupLabel: string | null;
  maskedWhatsAppNumber: string | null;
  personalLinkState: DeliveryPersonalLinkState;
  prepareAction: BoundDeliveryLinkAction;
  rowKey: number;
  whatsappAvailability: DeliveryWhatsAppAvailability;
};

type GuestDeliveryCenterProps = {
  isPublished: boolean;
  prepareBatchAction: BoundDeliveryBatchAction;
  projectId: string;
  rows: DeliveryGuestRowClient[];
  summary: DeliveryReadinessSummary;
};

const personalLinkStateLabels: Record<DeliveryPersonalLinkState, string> = {
  active: 'Tautan aktif',
  expired: 'Tautan kedaluwarsa',
  not_created: 'Belum dibuat',
  revoked: 'Tautan dinonaktifkan',
};

function getPreparationActionLabel(state: DeliveryPersonalLinkState) {
  if (state === 'active') {
    return 'Buat ulang tautan & bagikan';
  }

  if (state === 'revoked' || state === 'expired') {
    return 'Buat tautan baru & bagikan';
  }

  return 'Buat tautan & bagikan';
}

function ReadinessMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="min-w-0" tone="soft">
      <CardContent className="p-4 sm:p-5">
        <p className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
          {label}
        </p>
        <p className="text-seraya-text-primary mt-2 text-3xl font-semibold tracking-[-0.04em]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusPill({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'soft';
}) {
  return (
    <span
      className={
        tone === 'soft'
          ? 'bg-seraya-soft text-seraya-text-secondary inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold'
          : 'border-seraya-border-default bg-seraya-surface text-seraya-text-primary inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold'
      }
    >
      {children}
    </span>
  );
}

type DeliveryLinkPreparationDialogProps = {
  confirmActiveReplacement: boolean;
  description: string;
  onOpenChange: (open: boolean) => void;
  onPrepared: (result: { personalUrl: string; recipientWhatsAppPhoneE164: string | null }) => void;
  open: boolean;
  prepareAction: BoundDeliveryLinkAction;
  title: string;
};

/**
 * This subtree exists only while its form dialog is open. On success it unmounts
 * after handing the fresh raw URL to the immediate one-time result dialog, so
 * action state never becomes a durable row-level cache of capability material.
 */
function DeliveryLinkPreparationDialog({
  confirmActiveReplacement,
  description,
  onOpenChange,
  onPrepared,
  open,
  prepareAction: boundPrepareAction,
  title,
}: DeliveryLinkPreparationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [actionState, prepareAction, isPreparing] = useActionState(
    boundPrepareAction,
    initialDeliveryLinkActionState,
  );

  useEffect(() => {
    if (actionState.status !== 'success' || !actionState.personalUrl) {
      return;
    }

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
        {!confirmActiveReplacement ? (
          <p className="text-seraya-text-secondary text-sm leading-6">
            Tautan pribadi akan disiapkan agar dapat kalian bagikan secara manual.
          </p>
        ) : null}
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
            Buat tautan baru
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

type DeliveryBatchPreparationDialogProps = {
  guestCount: number;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  prepareBatchAction: BoundDeliveryBatchAction;
};

function BatchResultCopy({ actionState }: { actionState: DeliveryBatchActionState }) {
  return (
    <div
      className="border-seraya-border-default bg-seraya-brand-soft rounded-[var(--seraya-radius-md)] border px-4 py-4 text-sm leading-6"
      role={actionState.status === 'partial' ? 'alert' : 'status'}
    >
      <p className="text-seraya-text-primary font-semibold">
        {actionState.createdCount ?? 0} Undangan Pribadi berhasil disiapkan.
      </p>
      {actionState.whatsappMissingCreatedCount ? (
        <p className="text-seraya-text-secondary mt-1">
          {actionState.whatsappMissingCreatedCount} tamu yang baru disiapkan belum memiliki Nomor
          WhatsApp.
        </p>
      ) : null}
      {actionState.skippedActiveLinkCount ? (
        <p className="text-seraya-text-secondary mt-1">
          {actionState.skippedActiveLinkCount} tamu dengan Undangan Pribadi aktif tidak diubah.
        </p>
      ) : null}
      {actionState.failedCount ? (
        <p className="text-seraya-status-error mt-1">
          {actionState.failedCount} tamu belum dapat disiapkan. Coba lagi untuk melanjutkan yang
          tersisa.
        </p>
      ) : null}
      {actionState.message ? (
        <p className="text-seraya-text-secondary mt-3">{actionState.message}</p>
      ) : null}
    </div>
  );
}

/** Aggregate-only batch confirmation. It deliberately never receives raw guest URLs or tokens. */
function DeliveryBatchPreparationDialog({
  guestCount,
  onOpenChange,
  open,
  prepareBatchAction: boundPrepareBatchAction,
}: DeliveryBatchPreparationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [actionState, prepareBatchAction, isPreparing] = useActionState(
    boundPrepareBatchAction,
    initialDeliveryBatchActionState,
  );
  const hasResult = actionState.status === 'success' || actionState.status === 'partial';

  useEffect(() => {
    if (!hasResult) {
      return;
    }

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
      title={`Siapkan Undangan Pribadi untuk ${guestCount} tamu?`}
    >
      {hasResult ? (
        <div className="space-y-5">
          <BatchResultCopy actionState={actionState} />
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} type="button">
              Selesai
            </Button>
          </div>
        </div>
      ) : (
        <form action={prepareBatchAction} className="space-y-5" noValidate>
          <input name="confirmBatchPreparation" type="hidden" value="true" />
          <p className="text-seraya-text-secondary text-sm leading-6">
            Undangan Pribadi akan disiapkan untuk tamu yang belum memiliki link aktif. Pembagian
            WhatsApp tetap dilakukan manual per tamu.
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

function DeliveryGuestRow({
  isPublished,
  projectId,
  row,
}: {
  isPublished: boolean;
  projectId: string;
  row: DeliveryGuestRowClient;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [revealedPersonalLink, setRevealedPersonalLink] = useState<{
    personalUrl: string;
    recipientWhatsAppPhoneE164: string | null;
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  async function copyPersonalUrl() {
    const personalUrl = revealedPersonalLink?.personalUrl;

    if (!personalUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(personalUrl);
      setCopyFeedback('Tautan disalin.');
    } catch {
      setCopyFeedback('Salin tautan ini secara manual.');
    }
  }

  const isActiveLink = row.personalLinkState === 'active';
  const hasWhatsApp = row.whatsappAvailability === 'available';

  return (
    <li className="bg-seraya-surface flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-2">
        <div>
          <p className="text-seraya-text-primary truncate text-base font-semibold">
            {row.displayName}
          </p>
          {row.groupLabel ? (
            <p className="text-seraya-text-muted mt-0.5 text-sm leading-6">{row.groupLabel}</p>
          ) : null}
        </div>
        <div
          className="flex flex-wrap gap-2"
          aria-label={`Kesiapan pengiriman untuk ${row.displayName}`}
        >
          <StatusPill tone={isActiveLink ? 'default' : 'soft'}>
            {isActiveLink ? 'Siap dibagikan' : 'Belum siap dibagikan'}
          </StatusPill>
          {!isActiveLink && row.personalLinkState !== 'not_created' ? (
            <StatusPill tone="soft">{personalLinkStateLabels[row.personalLinkState]}</StatusPill>
          ) : null}
          <StatusPill tone={hasWhatsApp ? 'default' : 'soft'}>
            {hasWhatsApp ? 'WhatsApp tersedia' : 'Nomor WhatsApp belum tersedia'}
          </StatusPill>
        </div>
        {hasWhatsApp && row.maskedWhatsAppNumber ? (
          <p className="text-seraya-text-muted text-sm leading-6">
            Nomor WhatsApp: {row.maskedWhatsAppNumber}
          </p>
        ) : null}
        {isActiveLink ? (
          <p className="text-seraya-text-muted text-sm leading-6">
            Undangan Pribadi sudah siap. URL mentah hanya ditampilkan saat tautan dibuat atau
            diperbarui.
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {!hasWhatsApp ? (
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-9 items-center rounded-[var(--seraya-radius-sm)] px-1 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
            href={`/dashboard/${projectId}/guests`}
          >
            Lengkapi nomor
          </Link>
        ) : null}
        <Button
          disabled={!isPublished}
          onClick={() => (isActiveLink ? setReplaceOpen(true) : setCreateOpen(true))}
          size="sm"
          type="button"
          variant="secondary"
        >
          {isPublished
            ? getPreparationActionLabel(row.personalLinkState)
            : 'Publikasikan terlebih dahulu'}
        </Button>
      </div>

      {createOpen ? (
        <DeliveryLinkPreparationDialog
          confirmActiveReplacement={false}
          description={`Tautan ini hanya akan ditampilkan sekali untuk ${row.displayName}. Simpan atau salin sebelum menutup hasilnya.`}
          onOpenChange={setCreateOpen}
          onPrepared={(result) => {
            setCopyFeedback(null);
            setRevealedPersonalLink(result);
          }}
          open={createOpen}
          prepareAction={row.prepareAction}
          title="Buat tautan pribadi"
        />
      ) : null}

      {replaceOpen ? (
        <DeliveryLinkPreparationDialog
          confirmActiveReplacement
          description="Tautan aktif sebelumnya akan berhenti berlaku setelah tautan baru dibuat."
          onOpenChange={setReplaceOpen}
          onPrepared={(result) => {
            setCopyFeedback(null);
            setRevealedPersonalLink(result);
          }}
          open={replaceOpen}
          prepareAction={row.prepareAction}
          title="Buat ulang tautan pribadi"
        />
      ) : null}

      <Dialog
        description="Simpan tautan ini sekarang. Demi privasi, tautan mentah tidak ditampilkan kembali dari daftar tamu."
        onOpenChange={(open) => {
          if (!open) {
            setCopyFeedback(null);
            setRevealedPersonalLink(null);
          }
        }}
        open={Boolean(revealedPersonalLink)}
        title="Tautan pribadi siap"
      >
        {revealedPersonalLink ? (
          <PersonalGuestLinkResultActions
            copyFeedback={copyFeedback}
            guestDisplayName={row.displayName}
            onClose={() => {
              setCopyFeedback(null);
              setRevealedPersonalLink(null);
            }}
            onCopy={copyPersonalUrl}
            personalUrl={revealedPersonalLink.personalUrl}
            recipientWhatsAppPhoneE164={revealedPersonalLink.recipientWhatsAppPhoneE164}
          />
        ) : null}
      </Dialog>
    </li>
  );
}

function matchesReadinessFilter(row: DeliveryGuestRowClient, filter: DeliveryReadinessFilter) {
  switch (filter) {
    case 'ready':
      return row.personalLinkState === 'active';
    case 'not_ready':
      return row.personalLinkState !== 'active';
    case 'missing_whatsapp':
      return row.whatsappAvailability === 'missing';
    default:
      return true;
  }
}

/** Private, local-only operational workspace. It has no delivery tracking or send history. */
export function GuestDeliveryCenter({
  isPublished,
  prepareBatchAction,
  projectId,
  rows,
  summary,
}: GuestDeliveryCenterProps) {
  const [query, setQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<DeliveryReadinessFilter>('all');
  const [batchOpen, setBatchOpen] = useState(false);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');

    return rows.filter((row) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        row.displayName.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
        row.groupLabel?.toLocaleLowerCase('id-ID').includes(normalizedQuery);

      return matchesQuery && matchesReadinessFilter(row, readinessFilter);
    });
  }, [query, readinessFilter, rows]);

  return (
    <section
      aria-labelledby="delivery-center-title"
      className="mx-auto max-w-6xl space-y-5 sm:space-y-7"
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
          Undangan Pribadi menyertakan sapaan, RSVP, dan ucapan tamu. Siapkan link sebelum
          membagikannya secara manual.
        </p>
        <p className="text-seraya-text-muted mt-4 text-sm leading-6">
          Status di sini menunjukkan kesiapan Undangan Pribadi dan Nomor WhatsApp.
        </p>
      </header>

      {!isPublished ? (
        <Card aria-labelledby="delivery-publication-notice" tone="soft">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                className="text-seraya-text-primary text-base font-semibold"
                id="delivery-publication-notice"
              >
                Bagikan tersedia setelah undangan diterbitkan
              </h2>
              <p className="text-seraya-text-secondary mt-1 text-sm leading-6">
                Terbitkan versi undangan yang sudah kalian setujui sebelum menyiapkan Undangan
                Pribadi.
              </p>
            </div>
            <Link
              className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
              href={`/dashboard/${projectId}`}
            >
              Kembali ke project
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section
        aria-label="Ringkasan kesiapan pengiriman"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <ReadinessMetric label="Tamu aktif" value={summary.activeGuestCount} />
        <ReadinessMetric label="Siap dibagikan" value={summary.activePersonalLinkCount} />
        <ReadinessMetric
          label="Belum punya Undangan Pribadi aktif"
          value={summary.guestsWithoutActivePersonalLinkCount}
        />
        <ReadinessMetric label="Belum punya Nomor WhatsApp" value={summary.whatsappMissingCount} />
      </section>

      {isPublished && summary.guestsWithoutActivePersonalLinkCount > 0 ? (
        <Card aria-labelledby="delivery-batch-title" tone="soft">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2
                className="text-seraya-text-primary text-base font-semibold"
                id="delivery-batch-title"
              >
                Siapkan Undangan Pribadi sekaligus
              </h2>
              <p className="text-seraya-text-secondary mt-1 max-w-2xl text-sm leading-6">
                Siapkan untuk {summary.guestsWithoutActivePersonalLinkCount} tamu yang belum punya
                link aktif. Tamu dengan link aktif tidak akan diubah.
              </p>
            </div>
            <Button onClick={() => setBatchOpen(true)} type="button">
              {`Siapkan ${summary.guestsWithoutActivePersonalLinkCount} Undangan Pribadi`}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card aria-labelledby="delivery-guests-title">
        <CardHeader>
          <CardTitle
            className="font-sans text-lg font-semibold tracking-[-0.02em]"
            id="delivery-guests-title"
          >
            Kesiapan tamu
          </CardTitle>
          <CardDescription>
            Pilih filter untuk melihat tamu yang siap dibagikan, masih perlu disiapkan, atau belum
            memiliki Nomor WhatsApp.
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
              <p className="text-seraya-text-muted mt-2 text-sm leading-6">
                Untuk menerima RSVP, tambahkan tamu lalu buat Undangan Pribadi.
              </p>
              <Link
                className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-4 inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                href={`/dashboard/${projectId}/guests`}
              >
                Kelola Tamu
              </Link>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
              <p className="text-seraya-text-primary font-semibold">Tidak ada tamu yang sesuai.</p>
              <p className="text-seraya-text-muted mt-2 text-sm leading-6">
                Ubah kata kunci atau filter untuk melihat tamu lain.
              </p>
            </div>
          ) : (
            <ul className="border-seraya-border-default divide-seraya-border-default divide-y overflow-hidden rounded-[var(--seraya-radius-md)] border">
              {filteredRows.map((row) => (
                <DeliveryGuestRow
                  isPublished={isPublished}
                  key={row.rowKey}
                  projectId={projectId}
                  row={row}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {batchOpen ? (
        <DeliveryBatchPreparationDialog
          guestCount={summary.guestsWithoutActivePersonalLinkCount}
          onOpenChange={setBatchOpen}
          open={batchOpen}
          prepareBatchAction={prepareBatchAction}
        />
      ) : null}
    </section>
  );
}
