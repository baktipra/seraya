'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import { PersonalGuestLinkResultActions } from '@/components/projects/personal-guest-link-result-actions';
import { OverflowMenuAction, RowOverflowMenu } from '@/components/projects/row-overflow-menu';
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
  type DeliveryBatchActionState,
} from '@/modules/delivery/delivery.action-state';
import { initialGuestLinkActionState } from '@/modules/guest-links/guest-link.action-state';
import type { GuestLinkActionState } from '@/modules/guest-links/guest-link.action-state';
import {
  createOrReplacePersonalGuestLinkAction,
  revokePersonalGuestLinkAction,
} from '@/modules/guest-links/guest-link.actions';
import { getGuestLinkLifecycleCopy } from '@/modules/guest-links/guest-link-lifecycle';
import type { GuestLinkLifecycleState } from '@/modules/guest-links/guest-link.types';
import { initialGuestActionState } from '@/modules/guests/guest.action-state';
import type { GuestActionState } from '@/modules/guests/guest.action-state';
import {
  createGuestAction,
  removeGuestAction,
  updateGuestAction,
} from '@/modules/guests/guest.actions';
import { initialGuestImportActionState } from '@/modules/guests/guest-import.action-state';
import type { GuestImportActionState } from '@/modules/guests/guest-import.action-state';
import {
  importGuestsCsvAction,
  importGuestsXlsxAction,
} from '@/modules/guests/guest-import.actions';
import type { GuestListItem, GuestRsvpStatus } from '@/modules/guests/guest.types';

type BoundGuestBatchAction = (
  previousState: DeliveryBatchActionState,
  formData: FormData,
) => Promise<DeliveryBatchActionState>;

type NativeGuestManagerProps = {
  initialGuests: GuestListItem[];
  prepareBatchAction: BoundGuestBatchAction;
  projectId: string;
};

type GuestLifecycleFilter =
  | 'all'
  | 'not_created'
  | 'active_recoverable'
  | 'active_legacy'
  | 'revoked'
  | 'expired'
  | 'missing_whatsapp';

const guestLifecycleFilterOptions: ReadonlyArray<{
  label: string;
  value: GuestLifecycleFilter;
}> = [
  { label: 'Semua tamu', value: 'all' },
  { label: 'Belum dibuat', value: 'not_created' },
  { label: 'Aktif dan dapat dikelola', value: 'active_recoverable' },
  { label: 'Aktif lama', value: 'active_legacy' },
  { label: 'Nonaktif', value: 'revoked' },
  { label: 'Kedaluwarsa', value: 'expired' },
  { label: 'Tanpa Nomor WhatsApp', value: 'missing_whatsapp' },
];

function getGuestLifecycleState(guest: GuestListItem): GuestLinkLifecycleState {
  if (guest.link_lifecycle_state) {
    return guest.link_lifecycle_state;
  }

  if (guest.link_state === 'active') {
    return 'active_recoverable';
  }

  return guest.link_state;
}

function isActiveGuestLifecycle(state: GuestLinkLifecycleState) {
  return state === 'active_recoverable' || state === 'active_legacy';
}

function canBatchPrepareGuestLink(state: GuestLinkLifecycleState) {
  return state === 'not_created' || state === 'revoked' || state === 'expired';
}

function matchesGuestLifecycleFilter(guest: GuestListItem, filter: GuestLifecycleFilter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'missing_whatsapp') {
    return !guest.whatsapp_phone_e164;
  }

  return getGuestLifecycleState(guest) === filter;
}

function createGuestLifecycleSummary(guests: readonly GuestListItem[]) {
  let manageableLinkCount = 0;
  let missingLinkCount = 0;
  let needsUpdateCount = 0;

  for (const guest of guests) {
    const state = getGuestLifecycleState(guest);

    if (state === 'active_recoverable') {
      manageableLinkCount += 1;
    } else if (state === 'not_created') {
      missingLinkCount += 1;
    } else {
      needsUpdateCount += 1;
    }
  }

  return {
    activeGuestCount: guests.length,
    manageableLinkCount,
    missingLinkCount,
    needsUpdateCount,
  };
}

function getGuestLifecycleActionLabel(state: GuestLinkLifecycleState) {
  if (state === 'active_recoverable') {
    return 'Ganti tautan';
  }

  if (state === 'active_legacy') {
    return 'Perbarui tautan';
  }

  if (state === 'not_created') {
    return 'Buat Undangan Pribadi';
  }

  return 'Buat tautan baru';
}

function getGuestLifecycleDialogCopy(state: GuestLinkLifecycleState) {
  if (state === 'active_recoverable') {
    return {
      buttonLabel: 'Ganti tautan',
      description:
        'Link saat ini masih aktif dan dapat dikelola. Ganti hanya jika akses tamu memang perlu diubah.',
      notice:
        'URL lama akan langsung dinonaktifkan ketika URL baru dibuat. Perubahan isi undangan tidak memerlukan penggantian link.',
      title: 'Ganti tautan pribadi?',
    };
  }

  if (state === 'active_legacy') {
    return {
      buttonLabel: 'Perbarui tautan',
      description:
        'Link lama masih aktif untuk tamu, tetapi Seraya tidak dapat menampilkan kembali URL tersebut.',
      notice:
        'Memperbarui link akan langsung menonaktifkan URL lama. Pastikan tamu menerima URL pengganti.',
      title: 'Perbarui tautan lama?',
    };
  }

  if (state === 'revoked') {
    return {
      buttonLabel: 'Buat tautan baru',
      description: 'Link sebelumnya sudah dinonaktifkan dan tidak dapat digunakan.',
      notice: 'URL baru akan menjadi akses aktif untuk tamu ini.',
      title: 'Buat tautan baru?',
    };
  }

  if (state === 'expired') {
    return {
      buttonLabel: 'Buat tautan baru',
      description: 'Link sebelumnya sudah kedaluwarsa dan tidak dapat digunakan.',
      notice: 'URL baru akan menjadi akses aktif untuk tamu ini.',
      title: 'Buat tautan baru?',
    };
  }

  return {
    buttonLabel: 'Buat tautan',
    description: 'Tamu ini belum mempunyai Undangan Pribadi.',
    notice: 'URL baru akan ditampilkan sekali setelah berhasil dibuat.',
    title: 'Buat tautan pribadi?',
  };
}

type SuccessActionState = Pick<
  GuestActionState | GuestImportActionState | GuestLinkActionState,
  'message' | 'status'
>;

const rsvpStatusLabels: Record<GuestRsvpStatus, string> = {
  attending: 'Hadir',
  declined: 'Tidak hadir',
  pending: 'Belum merespons',
};

function getRsvpDisplay(guest: GuestListItem): string {
  if (guest.rsvp_status !== 'attending') {
    return rsvpStatusLabels[guest.rsvp_status];
  }

  if (guest.rsvp_attendee_count === null) {
    return 'Hadir — jumlah belum dikonfirmasi';
  }

  return `Hadir — ${guest.rsvp_attendee_count} dari ${guest.party_size} orang`;
}

function getLifecycleTone(state: GuestLinkLifecycleState) {
  if (state === 'active_recoverable') {
    return 'bg-seraya-status-success-soft text-seraya-status-success';
  }

  if (state === 'not_created') {
    return 'bg-seraya-soft text-seraya-text-secondary';
  }

  return 'bg-seraya-status-warning-soft text-seraya-status-warning';
}

function GuestLinkStatus({
  guest,
  showDescription = true,
}: {
  guest: GuestListItem;
  showDescription?: boolean;
}) {
  const state = getGuestLifecycleState(guest);
  const copy = getGuestLinkLifecycleCopy(state);

  return (
    <div className="min-w-0">
      <span
        className={`${getLifecycleTone(state)} inline-flex max-w-full rounded-full px-2.5 py-1 text-xs leading-5 font-semibold`}
      >
        {copy.label}
      </span>
      {showDescription ? (
        <p className="text-seraya-text-muted mt-1.5 max-w-[19rem] text-xs leading-5">
          {copy.description}
        </p>
      ) : null}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="text-seraya-status-error text-sm leading-6" id={id} role="alert">
      {message}
    </p>
  );
}

function GuestFields({
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

function useGuestActionFeedback(state: SuccessActionState, onSuccess: () => void) {
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

function GuestManagerBatchPreparationDialog({
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

export function NativeGuestManager({
  initialGuests,
  prepareBatchAction,
  projectId,
}: NativeGuestManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'csv' | 'xlsx'>('xlsx');
  const [editGuest, setEditGuest] = useState<GuestListItem | null>(null);
  const [removeGuest, setRemoveGuest] = useState<GuestListItem | null>(null);
  const [linkGuest, setLinkGuest] = useState<GuestListItem | null>(null);
  const [revokeLinkGuest, setRevokeLinkGuest] = useState<GuestListItem | null>(null);
  const [revealedPersonalLink, setRevealedPersonalLink] = useState<{
    guestDisplayName: string;
    personalUrl: string;
    recipientWhatsAppPhoneE164: string | null;
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [guestFilter, setGuestFilter] = useState<GuestLifecycleFilter>('all');
  const [batchOpen, setBatchOpen] = useState(false);
  const [openOverflowKey, setOpenOverflowKey] = useState<string | null>(null);
  const lastRevealedUrl = useRef<string | null>(null);

  const [createState, createAction, createPending] = useActionState(
    createGuestAction,
    initialGuestActionState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateGuestAction,
    initialGuestActionState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeGuestAction,
    initialGuestActionState,
  );
  const [csvImportState, csvImportAction, csvImportPending] = useActionState(
    importGuestsCsvAction,
    initialGuestImportActionState,
  );
  const [xlsxImportState, xlsxImportAction, xlsxImportPending] = useActionState(
    importGuestsXlsxAction,
    initialGuestImportActionState,
  );
  const [linkState, linkAction, linkPending] = useActionState(
    createOrReplacePersonalGuestLinkAction,
    initialGuestLinkActionState,
  );
  const [revokeLinkState, revokeLinkAction, revokeLinkPending] = useActionState(
    revokePersonalGuestLinkAction,
    initialGuestLinkActionState,
  );

  useGuestActionFeedback(createState, () => setAddOpen(false));
  useGuestActionFeedback(updateState, () => setEditGuest(null));
  useGuestActionFeedback(removeState, () => setRemoveGuest(null));
  useGuestActionFeedback(csvImportState, () => setImportOpen(false));
  useGuestActionFeedback(xlsxImportState, () => undefined);
  useGuestActionFeedback(revokeLinkState, () => setRevokeLinkGuest(null));

  useEffect(() => {
    if (
      linkState.status !== 'success' ||
      !linkState.personalUrl ||
      lastRevealedUrl.current === linkState.personalUrl
    ) {
      return;
    }

    const guestDisplayName = linkGuest?.display_name;
    if (!guestDisplayName) return;

    lastRevealedUrl.current = linkState.personalUrl;
    queueMicrotask(() => {
      setLinkGuest(null);
      setRevealedPersonalLink({
        guestDisplayName,
        personalUrl: linkState.personalUrl!,
        recipientWhatsAppPhoneE164: linkState.recipientWhatsAppPhoneE164 ?? null,
      });
      setCopyFeedback(null);
      toast({ title: 'Tautan pribadi siap untuk disalin.', variant: 'success' });
      router.refresh();
    });
  }, [
    linkGuest,
    linkState.personalUrl,
    linkState.recipientWhatsAppPhoneE164,
    linkState.status,
    router,
    toast,
  ]);

  const filteredGuests = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');

    return initialGuests.filter((guest) => {
      const matchesQuery =
        !normalizedQuery ||
        guest.display_name.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
        guest.group_label?.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
        guest.whatsapp_phone_e164?.includes(normalizedQuery);

      return matchesQuery && matchesGuestLifecycleFilter(guest, guestFilter);
    });
  }, [guestFilter, initialGuests, query]);

  const visibleGuestIds = filteredGuests.map((guest) => guest.id);
  const selectedVisibleIds = selectedGuestIds.filter((id) => visibleGuestIds.includes(id));
  const allVisibleSelected =
    visibleGuestIds.length > 0 && selectedVisibleIds.length === visibleGuestIds.length;
  const selectedGuests = filteredGuests.filter((guest) => selectedVisibleIds.includes(guest.id));
  const selectedEligibleIds = selectedGuests
    .filter((guest) => canBatchPrepareGuestLink(getGuestLifecycleState(guest)))
    .map((guest) => guest.id);
  const guestLifecycleSummary = createGuestLifecycleSummary(initialGuests);

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setSelectedGuestIds([]);
    setOpenOverflowKey(null);
  }

  function updateGuestFilter(nextFilter: GuestLifecycleFilter) {
    setGuestFilter(nextFilter);
    setSelectedGuestIds([]);
    setOpenOverflowKey(null);
  }

  function toggleGuestSelection(guestId: string) {
    setSelectedGuestIds((current) =>
      current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId],
    );
  }

  function toggleAllGuests() {
    setSelectedGuestIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleGuestIds.includes(id))
        : [...new Set([...current, ...visibleGuestIds])],
    );
  }

  async function exportGuests(guestIds: string[]) {
    try {
      const response = await fetch(`/dashboard/${projectId}/guests/export-xlsx`, {
        body: JSON.stringify({ guestIds }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if (!response.ok) throw new Error('Guest export unavailable');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.download = 'seraya-daftar-tamu.xlsx';
      anchor.href = url;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: 'Export Excel belum bisa disiapkan. Coba lagi beberapa saat lagi.',
        variant: 'error',
      });
    }
  }

  async function copyPersonalUrl() {
    const personalUrl = revealedPersonalLink?.personalUrl;
    if (!personalUrl) return;

    try {
      await navigator.clipboard.writeText(personalUrl);
      setCopyFeedback('Tautan disalin.');
    } catch {
      setCopyFeedback('Salin tautan ini secara manual.');
    }
  }

  function renderRowMenu(guest: GuestListItem, view: 'desktop' | 'mobile') {
    const menuKey = `${guest.id}:${view}`;
    const lifecycleState = getGuestLifecycleState(guest);

    return (
      <RowOverflowMenu
        ariaLabel={`Aksi untuk ${guest.display_name}`}
        onOpenChange={(open: boolean) => setOpenOverflowKey(open ? menuKey : null)}
        open={openOverflowKey === menuKey}
      >
        <OverflowMenuAction
          onClick={() => {
            setOpenOverflowKey(null);
            setEditGuest(guest);
          }}
        >
          Edit tamu
        </OverflowMenuAction>
        <OverflowMenuAction
          onClick={() => {
            setOpenOverflowKey(null);
            setLinkGuest(guest);
          }}
        >
          {getGuestLifecycleActionLabel(lifecycleState)}
        </OverflowMenuAction>
        {isActiveGuestLifecycle(lifecycleState) ? (
          <OverflowMenuAction
            onClick={() => {
              setOpenOverflowKey(null);
              setRevokeLinkGuest(guest);
            }}
          >
            Nonaktifkan tautan
          </OverflowMenuAction>
        ) : null}
        <OverflowMenuAction
          onClick={() => {
            setOpenOverflowKey(null);
            setRemoveGuest(guest);
          }}
        >
          Hapus tamu
        </OverflowMenuAction>
      </RowOverflowMenu>
    );
  }

  const linkGuestLifecycleState = linkGuest ? getGuestLifecycleState(linkGuest) : null;
  const linkDialogCopy = linkGuestLifecycleState
    ? getGuestLifecycleDialogCopy(linkGuestLifecycleState)
    : null;

  return (
    <>
      <OperationalWorkspace labelledBy="guest-manager-title">
        <OperationalHeader
          actions={
            <>
              <Button
                disabled={visibleGuestIds.length === 0}
                onClick={() => void exportGuests(visibleGuestIds)}
                type="button"
                variant="secondary"
              >
                Export Excel
              </Button>
              <Button
                onClick={() => {
                  setImportMode('xlsx');
                  setImportOpen(true);
                }}
                type="button"
                variant="secondary"
              >
                Import tamu
              </Button>
              <Button onClick={() => setAddOpen(true)} type="button">
                Tambah tamu
              </Button>
            </>
          }
          description="Kelola penerima, data kontak, jumlah undangan, dan status Undangan Pribadi dari satu authority yang sama."
          eyebrow="Tamu undangan"
          title="Daftar tamu"
          titleId="guest-manager-title"
        />

        <OperationalMetricStrip columns={4} label="Status Undangan Pribadi">
          <OperationalMetric
            detail="Semua penerima aktif pada project ini."
            label="Tamu aktif"
            value={guestLifecycleSummary.activeGuestCount}
          />
          <OperationalMetric
            detail="Link aktif yang dapat diakses kembali oleh owner."
            label="Link dapat dikelola"
            value={guestLifecycleSummary.manageableLinkCount}
          />
          <OperationalMetric
            detail="Tamu yang belum pernah mempunyai link."
            label="Belum mempunyai link"
            value={guestLifecycleSummary.missingLinkCount}
          />
          <OperationalMetric
            detail="Link aktif lama, nonaktif, atau kedaluwarsa."
            label="Perlu diperbarui"
            value={guestLifecycleSummary.needsUpdateCount}
          />
        </OperationalMetricStrip>

        <OperationalSection
          description="Status link menunjukkan akses tamu, bukan status kirim atau status baca. Publikasi ulang memperbarui isi undangan tanpa mengganti link aktif."
          title="Kelola tamu"
          titleId="guest-list-title"
        >
          <div
            className="border-seraya-border-default bg-seraya-brand-soft rounded-[var(--seraya-radius-sm)] border px-4 py-3 text-sm leading-6"
            role="note"
          >
            <p className="text-seraya-text-primary font-semibold">
              Isi undangan dan akses tamu adalah dua hal berbeda.
            </p>
            <p className="text-seraya-text-secondary mt-1">
              Ganti link hanya ketika akses tamu memang perlu diubah. Mengedit lalu memublikasikan
              ulang undangan tidak memerlukan URL baru.
            </p>
          </div>

          <OperationalToolbar label="Cari dan filter tamu berdasarkan lifecycle link">
            <OperationalToolbarField htmlFor="guest-search" label="Cari tamu">
              <Input
                id="guest-search"
                onChange={(event: { target: { value: string } }) => updateQuery(event.target.value)}
                placeholder="Cari nama, grup, atau Nomor WhatsApp"
                value={query}
              />
            </OperationalToolbarField>
            <OperationalToolbarField htmlFor="guest-lifecycle-filter" label="Status Undangan Pribadi">
              <select
                className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-sm)] border px-3 text-sm focus-visible:outline-3 focus-visible:outline-offset-2"
                id="guest-lifecycle-filter"
                onChange={(event: { target: { value: string } }) =>
                  updateGuestFilter(event.target.value as GuestLifecycleFilter)
                }
                value={guestFilter}
              >
                {guestLifecycleFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </OperationalToolbarField>
          </OperationalToolbar>

          <OperationalDataSurface>
            {initialGuests.length === 0 ? (
              <OperationalEmptyState
                action={
                  <Button onClick={() => setAddOpen(true)} type="button">
                    Tambah tamu pertama
                  </Button>
                }
                description="Tambahkan daftar tamu saat kalian siap menyiapkan undangan secara personal."
                title="Belum ada tamu yang disiapkan."
              />
            ) : filteredGuests.length === 0 ? (
              <OperationalEmptyState
                description="Ubah pencarian atau filter untuk melihat data tamu lain."
                title="Tidak ada tamu yang sesuai."
              />
            ) : (
              <>
                <OperationalDesktopData label="Tabel lifecycle Undangan Pribadi">
                  <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead className="bg-seraya-canvas text-seraya-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
                      <tr>
                        <th className="w-12 px-3 py-2.5">
                          <input
                            aria-label="Pilih semua tamu pada hasil aktif"
                            checked={allVisibleSelected}
                            className="accent-seraya-action-primary size-4"
                            onChange={toggleAllGuests}
                            type="checkbox"
                          />
                        </th>
                        <th className="px-3 py-2.5">Tamu</th>
                        <th className="px-3 py-2.5 text-right">Rombongan</th>
                        <th className="px-3 py-2.5">WhatsApp</th>
                        <th className="px-3 py-2.5">Undangan Pribadi</th>
                        <th className="px-3 py-2.5">RSVP</th>
                        <th className="w-12 px-3 py-2.5">
                          <span className="sr-only">Aksi</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-seraya-border-default bg-seraya-surface divide-y">
                      {filteredGuests.map((guest) => (
                        <tr className="hover:bg-seraya-soft/45" key={guest.id}>
                          <td className="px-3 py-3 align-top">
                            <input
                              aria-label={`Pilih ${guest.display_name}`}
                              checked={selectedVisibleIds.includes(guest.id)}
                              className="accent-seraya-action-primary size-4"
                              onChange={() => toggleGuestSelection(guest.id)}
                              type="checkbox"
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <p className="text-seraya-text-primary font-semibold">
                              {guest.display_name}
                            </p>
                            {guest.group_label ? (
                              <p className="text-seraya-text-muted mt-0.5 text-xs leading-5">
                                {guest.group_label}
                              </p>
                            ) : null}
                          </td>
                          <td className="text-seraya-text-secondary px-3 py-3 text-right align-top tabular-nums">
                            {guest.party_size} orang
                          </td>
                          <td className="text-seraya-text-secondary px-3 py-3 align-top">
                            {guest.whatsapp_phone_e164 ?? 'Belum ada nomor'}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <GuestLinkStatus guest={guest} />
                          </td>
                          <td className="text-seraya-text-secondary px-3 py-3 align-top">
                            {getRsvpDisplay(guest)}
                          </td>
                          <td className="px-3 py-3 text-right align-top">
                            {renderRowMenu(guest, 'desktop')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </OperationalDesktopData>

                <OperationalMobileDataList label="Daftar lifecycle Undangan Pribadi">
                  {filteredGuests.map((guest) => {
                    const lifecycleCopy = getGuestLinkLifecycleCopy(getGuestLifecycleState(guest));

                    return (
                      <OperationalMobileDataCard
                        identity={
                          <div className="flex min-w-0 items-start gap-3">
                            <input
                              aria-label={`Pilih ${guest.display_name}`}
                              checked={selectedVisibleIds.includes(guest.id)}
                              className="accent-seraya-action-primary mt-1 size-4 shrink-0"
                              onChange={() => toggleGuestSelection(guest.id)}
                              type="checkbox"
                            />
                            <div className="min-w-0">
                              <p className="text-seraya-text-primary leading-5 font-semibold">
                                {guest.display_name}
                              </p>
                              {guest.group_label ? (
                                <p className="text-seraya-text-muted mt-0.5 text-xs leading-5">
                                  {guest.group_label}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        }
                        key={guest.id}
                        status={
                          <div className="flex items-start gap-2">
                            <GuestLinkStatus guest={guest} showDescription={false} />
                            {renderRowMenu(guest, 'mobile')}
                          </div>
                        }
                      >
                        <p className="text-seraya-text-muted mt-3 text-xs leading-5">
                          {lifecycleCopy.description}
                        </p>
                        <dl data-operational-mobile-fields>
                          <OperationalMobileField
                            label="Rombongan"
                            value={`${guest.party_size} orang`}
                          />
                          <OperationalMobileField
                            align="end"
                            label="WhatsApp"
                            value={guest.whatsapp_phone_e164 ?? 'Belum ada'}
                          />
                          <OperationalMobileField label="RSVP" value={getRsvpDisplay(guest)} />
                          <OperationalMobileField
                            align="end"
                            label="Status link"
                            value={lifecycleCopy.label}
                          />
                        </dl>
                      </OperationalMobileDataCard>
                    );
                  })}
                </OperationalMobileDataList>
              </>
            )}
          </OperationalDataSurface>

          {filteredGuests.length > 0 ? (
            <OperationalSelectionBar
              actions={
                <>
                  <Button
                    disabled={selectedEligibleIds.length === 0}
                    onClick={() => setBatchOpen(true)}
                    size="sm"
                    type="button"
                  >
                    Siapkan Undangan Pribadi
                  </Button>
                  <Button
                    disabled={selectedVisibleIds.length === 0}
                    onClick={() => void exportGuests(selectedVisibleIds)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Export Excel
                  </Button>
                  <Button
                    disabled={selectedVisibleIds.length === 0}
                    onClick={() => setSelectedGuestIds([])}
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
                  · {selectedEligibleIds.length} dapat disiapkan tanpa mengganti link aktif
                </>
              }
            />
          ) : null}

          <div className="border-seraya-border-default border-t pt-4">
            <Link
              className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
              href={`/dashboard/${projectId}`}
            >
              ← Kembali ke Ringkasan
            </Link>
          </div>
        </OperationalSection>
      </OperationalWorkspace>

      <Dialog
        description="Import Excel direkomendasikan untuk menyiapkan tamu dan Nomor WhatsApp. CSV tetap tersedia sebagai opsi lain."
        onOpenChange={setImportOpen}
        open={importOpen}
        title="Import daftar tamu"
      >
        <div className="space-y-5">
          <div aria-label="Pilih format import" className="flex flex-wrap gap-2" role="group">
            <Button
              aria-pressed={importMode === 'xlsx'}
              onClick={() => setImportMode('xlsx')}
              size="sm"
              type="button"
              variant={importMode === 'xlsx' ? 'primary' : 'secondary'}
            >
              Import Excel (.xlsx)
            </Button>
            <Button
              aria-pressed={importMode === 'csv'}
              onClick={() => setImportMode('csv')}
              size="sm"
              type="button"
              variant={importMode === 'csv' ? 'primary' : 'secondary'}
            >
              Import CSV
            </Button>
          </div>

          {importMode === 'xlsx' ? (
            <form action={xlsxImportAction} className="space-y-5" noValidate>
              <input name="projectId" type="hidden" value={projectId} />
              <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-sm)] border px-4 py-4 text-sm leading-6">
                <p className="text-seraya-text-primary font-semibold">Mulai dari template Excel</p>
                <p className="text-seraya-text-secondary mt-1">
                  Unduh template Excel, isi daftar tamu, lalu upload kembali. Nomor WhatsApp
                  bersifat opsional dan digunakan untuk mempermudah pembagian Undangan Pribadi
                  secara manual.
                </p>
                <a
                  className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-3 inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                  href={`/dashboard/${projectId}/guests/template`}
                >
                  Download template Excel
                </a>
              </div>
              <div className="space-y-2">
                <label
                  className="text-seraya-text-primary text-sm font-semibold"
                  htmlFor="guest-xlsx-file"
                >
                  File Excel (.xlsx)
                </label>
                <Input
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  id="guest-xlsx-file"
                  name="file"
                  required
                  type="file"
                />
              </div>
              <div className="border-seraya-border-default rounded-[var(--seraya-radius-sm)] border px-4 py-3 text-sm leading-6">
                <p className="text-seraya-text-primary font-semibold">Yang perlu diperhatikan</p>
                <ul className="text-seraya-text-secondary mt-3 list-disc space-y-1 pl-5">
                  <li>Gunakan template Excel Seraya agar format kolom sesuai.</li>
                  <li>Hanya sheet bernama Tamu yang diproses.</li>
                  <li>Nama Tamu wajib diisi; Nomor WhatsApp bersifat opsional.</li>
                  <li>Jumlah Rombongan boleh kosong dan akan menjadi 1.</li>
                  <li>Import tidak otomatis mengirim WhatsApp atau membuat Undangan Pribadi.</li>
                  <li>Maksimal 1.000 baris data dan 1 MB.</li>
                </ul>
              </div>
              {xlsxImportState.status === 'error' && xlsxImportState.message ? (
                <p className="text-seraya-status-error text-sm leading-6" role="alert">
                  {xlsxImportState.message}
                </p>
              ) : null}
              {xlsxImportState.status === 'success' && xlsxImportState.message ? (
                <div
                  className="border-seraya-border-default bg-seraya-brand-soft rounded-[var(--seraya-radius-sm)] border px-4 py-4 text-sm leading-6"
                  role="status"
                >
                  <p className="text-seraya-text-primary font-semibold">
                    Tamu berhasil ditambahkan.
                  </p>
                  <p className="text-seraya-text-secondary mt-1">{xlsxImportState.message}</p>
                  <Link
                    className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-3 inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                    href={`/dashboard/${projectId}/delivery`}
                    onClick={() => setImportOpen(false)}
                  >
                    Buka Bagikan
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button onClick={() => setImportOpen(false)} type="button" variant="secondary">
                    Batal
                  </Button>
                  <Button loading={xlsxImportPending} type="submit">
                    Import tamu dari Excel
                  </Button>
                </div>
              )}
            </form>
          ) : (
            <form action={csvImportAction} className="space-y-5" noValidate>
              <input name="projectId" type="hidden" value={projectId} />
              <div className="space-y-2">
                <label
                  className="text-seraya-text-primary text-sm font-semibold"
                  htmlFor="guest-csv-file"
                >
                  File CSV
                </label>
                <Input accept=".csv,text/csv" id="guest-csv-file" name="file" required type="file" />
              </div>
              <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-sm)] border px-4 py-3 text-sm leading-6">
                <p className="text-seraya-text-primary font-semibold">Format CSV yang diperlukan</p>
                <p className="text-seraya-text-secondary mt-1 font-mono text-xs">
                  display_name,group_label,party_size
                </p>
                <ul className="text-seraya-text-secondary mt-3 list-disc space-y-1 pl-5">
                  <li>group_label boleh kosong.</li>
                  <li>party_size boleh kosong dan akan menjadi 1.</li>
                  <li>Import hanya menambahkan tamu baru; tidak mengubah tamu yang ada.</li>
                  <li>RSVP tamu hasil import tetap Belum merespons.</li>
                  <li>Tautan pribadi tidak dibuat melalui import.</li>
                  <li>Maksimal 1.000 baris data dan 1 MB.</li>
                </ul>
              </div>
              {csvImportState.status === 'error' && csvImportState.message ? (
                <p className="text-seraya-status-error text-sm leading-6" role="alert">
                  {csvImportState.message}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button onClick={() => setImportOpen(false)} type="button" variant="secondary">
                  Batal
                </Button>
                <Button loading={csvImportPending} type="submit">
                  Import CSV
                </Button>
              </div>
            </form>
          )}
        </div>
      </Dialog>

      <Dialog
        description="Tambahkan nama tamu dan jumlah undangan yang disiapkan."
        onOpenChange={setAddOpen}
        open={addOpen}
        title="Tambah tamu"
      >
        <form action={createAction} className="space-y-5" noValidate>
          <input name="projectId" type="hidden" value={projectId} />
          <GuestFields errors={createState.fieldErrors} />
          {createState.status === 'error' && createState.message ? (
            <p className="text-seraya-status-error text-sm leading-6" role="alert">
              {createState.message}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => setAddOpen(false)} type="button" variant="secondary">
              Batal
            </Button>
            <Button loading={createPending} type="submit">
              Simpan tamu
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        description="Perbarui detail tamu tanpa mengubah data project lainnya."
        onOpenChange={(open: boolean) => !open && setEditGuest(null)}
        open={Boolean(editGuest)}
        title="Edit tamu"
      >
        {editGuest ? (
          <form action={updateAction} className="space-y-5" key={editGuest.id} noValidate>
            <input name="guestId" type="hidden" value={editGuest.id} />
            <input name="projectId" type="hidden" value={projectId} />
            <GuestFields errors={updateState.fieldErrors} guest={editGuest} />
            {updateState.status === 'error' && updateState.message ? (
              <p className="text-seraya-status-error text-sm leading-6" role="alert">
                {updateState.message}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={() => setEditGuest(null)} type="button" variant="secondary">
                Batal
              </Button>
              <Button loading={updatePending} type="submit">
                Simpan perubahan
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
        {linkGuest && linkDialogCopy ? (
          <form action={linkAction} className="space-y-5">
            <input name="guestId" type="hidden" value={linkGuest.id} />
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
        description="Simpan atau salin tautan ini sekarang. Untuk membagikannya kembali, gunakan Bagikan."
        onOpenChange={(open: boolean) => {
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
            <input name="guestId" type="hidden" value={revokeLinkGuest.id} />
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

      <Dialog
        description={
          removeGuest
            ? `${removeGuest.display_name} akan dihapus dari daftar tamu aktif. Tautan pribadi aktifnya juga akan langsung dinonaktifkan.`
            : undefined
        }
        onOpenChange={(open: boolean) => !open && setRemoveGuest(null)}
        open={Boolean(removeGuest)}
        title="Hapus tamu?"
      >
        {removeGuest ? (
          <form action={removeAction} className="space-y-5">
            <input name="guestId" type="hidden" value={removeGuest.id} />
            <input name="projectId" type="hidden" value={projectId} />
            {removeState.status === 'error' && removeState.message ? (
              <p className="text-seraya-status-error text-sm leading-6" role="alert">
                {removeState.message}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={() => setRemoveGuest(null)} type="button" variant="secondary">
                Batal
              </Button>
              <Button loading={removePending} type="submit" variant="danger">
                Hapus tamu
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </>
  );
}
