'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import { OverflowMenuAction, RowOverflowMenu } from '@/components/projects/row-overflow-menu';

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
  type DeliveryBatchActionState,
} from '@/modules/delivery/delivery.action-state';
import {
  createOrReplacePersonalGuestLinkAction,
  revokePersonalGuestLinkAction,
} from '@/modules/guest-links/guest-link.actions';
import { PersonalGuestLinkResultActions } from '@/components/projects/personal-guest-link-result-actions';
import { initialGuestLinkActionState } from '@/modules/guest-links/guest-link.action-state';
import type { GuestLinkActionState } from '@/modules/guest-links/guest-link.action-state';
import {
  createGuestAction,
  removeGuestAction,
  updateGuestAction,
} from '@/modules/guests/guest.actions';
import { initialGuestActionState } from '@/modules/guests/guest.action-state';
import type { GuestActionState } from '@/modules/guests/guest.action-state';
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

type GuestManagerProps = {
  initialGuests: GuestListItem[];
  prepareBatchAction: BoundGuestBatchAction;
  projectId: string;
};

const rsvpStatusLabels: Record<GuestRsvpStatus, string> = {
  attending: 'Hadir',
  declined: 'Tidak hadir',
  pending: 'Belum merespons',
};

const personalLinkStateLabels: Record<GuestListItem['link_state'], string> = {
  active: 'Aktif',
  not_created: 'Belum ada',
  revoked: 'Perlu diperbarui',
};

type GuestManagerFilter =
  | 'all'
  | 'has_whatsapp'
  | 'missing_whatsapp'
  | 'active_link'
  | 'missing_link'
  | 'needs_link_update';

function matchesGuestManagerFilter(guest: GuestListItem, filter: GuestManagerFilter) {
  if (filter === 'has_whatsapp') return Boolean(guest.whatsapp_phone_e164);
  if (filter === 'missing_whatsapp') return !guest.whatsapp_phone_e164;
  if (filter === 'active_link') return guest.link_state === 'active';
  if (filter === 'missing_link') return guest.link_state !== 'active';
  if (filter === 'needs_link_update') return guest.link_state === 'revoked';
  return true;
}

function getRsvpDisplay(guest: GuestListItem): string {
  if (guest.rsvp_status !== 'attending') {
    return rsvpStatusLabels[guest.rsvp_status];
  }

  if (guest.rsvp_attendee_count === null) {
    return 'Hadir — jumlah belum dikonfirmasi';
  }

  return `Hadir — ${guest.rsvp_attendee_count} dari ${guest.party_size} orang`;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-seraya-status-error text-sm leading-6" id={id} role="alert">
      {message}
    </p>
  );
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
      description="Tautan aktif yang sudah ada tidak akan diubah. Link baru tidak ditampilkan dari proses batch."
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
            <Button loading={pending} type="submit">
              Siapkan Undangan Pribadi
            </Button>
          </div>
        </form>
      )}
    </Dialog>
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

type SuccessActionState = Pick<
  GuestActionState | GuestImportActionState | GuestLinkActionState,
  'message' | 'status'
>;

function useGuestActionFeedback(state: SuccessActionState, options: { onSuccess: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const lastSuccessMessage = useRef<string | null>(null);

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
    options.onSuccess();
    router.refresh();
  }, [options, router, state.message, state.status, toast]);
}

export function GuestManager({ initialGuests, prepareBatchAction, projectId }: GuestManagerProps) {
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
  const [guestFilter, setGuestFilter] = useState<GuestManagerFilter>('all');
  const [batchOpen, setBatchOpen] = useState(false);
  const [openOverflowGuestId, setOpenOverflowGuestId] = useState<string | null>(null);
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

  useGuestActionFeedback(createState, { onSuccess: () => setAddOpen(false) });
  useGuestActionFeedback(updateState, { onSuccess: () => setEditGuest(null) });
  useGuestActionFeedback(removeState, { onSuccess: () => setRemoveGuest(null) });
  useGuestActionFeedback(csvImportState, { onSuccess: () => setImportOpen(false) });
  useGuestActionFeedback(xlsxImportState, { onSuccess: () => undefined });
  useGuestActionFeedback(revokeLinkState, { onSuccess: () => setRevokeLinkGuest(null) });

  useEffect(() => {
    if (
      linkState.status !== 'success' ||
      !linkState.personalUrl ||
      lastRevealedUrl.current === linkState.personalUrl
    ) {
      return;
    }

    const guestDisplayName = linkGuest?.display_name;
    const personalUrl = linkState.personalUrl;

    if (!guestDisplayName) {
      return;
    }

    lastRevealedUrl.current = personalUrl;

    queueMicrotask(() => {
      setLinkGuest(null);
      setRevealedPersonalLink({
        guestDisplayName,
        personalUrl,
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

  const filteredGuests = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
    return initialGuests.filter((guest) => {
      const matchesQuery =
        !normalizedQuery ||
        guest.display_name.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
        guest.group_label?.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
        guest.whatsapp_phone_e164?.includes(normalizedQuery);
      return matchesQuery && matchesGuestManagerFilter(guest, guestFilter);
    });
  }, [guestFilter, initialGuests, query]);

  const visibleGuestIds = filteredGuests.map((guest) => guest.id);
  const selectedVisibleIds = selectedGuestIds.filter((id) => visibleGuestIds.includes(id));
  const allVisibleSelected =
    visibleGuestIds.length > 0 && selectedVisibleIds.length === visibleGuestIds.length;
  const selectedGuests = filteredGuests.filter((guest) => selectedVisibleIds.includes(guest.id));
  const selectedEligibleIds = selectedGuests
    .filter((guest) => guest.link_state !== 'active')
    .map((guest) => guest.id);
  const guestQualitySummary = {
    active: initialGuests.length,
    missingWhatsApp: initialGuests.filter((guest) => !guest.whatsapp_phone_e164).length,
    missingPersonalInvitation: initialGuests.filter((guest) => guest.link_state !== 'active')
      .length,
    needsLinkUpdate: initialGuests.filter((guest) => guest.link_state === 'revoked').length,
  };

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setSelectedGuestIds([]);
    setOpenOverflowGuestId(null);
  }

  function updateGuestFilter(nextFilter: GuestManagerFilter) {
    setGuestFilter(nextFilter);
    setSelectedGuestIds([]);
    setOpenOverflowGuestId(null);
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

      if (!response.ok) {
        throw new Error('Guest export unavailable');
      }

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

  return (
    <Card aria-labelledby="guest-manager-title" className="max-w-4xl overflow-hidden">
      <div className="bg-seraya-brand-soft px-5 py-7 sm:px-8 sm:py-9">
        <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
          Tamu undangan
        </p>
        <h1
          className="seraya-display-md mt-4 max-w-2xl text-[clamp(2.25rem,5vw,3.5rem)]"
          id="guest-manager-title"
        >
          Daftar tamu
        </h1>
        <p className="text-seraya-text-secondary mt-4 max-w-xl text-base leading-7">
          Simpan daftar tamu dan tautan pribadi kalian secara privat.
        </p>
      </div>

      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-sans text-lg font-semibold tracking-[-0.02em]">
            Kelola Tamu
          </CardTitle>
          <CardDescription>
            Rapikan data tamu dan kelola lifecycle Undangan Pribadi dari satu tempat.
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            disabled={visibleGuestIds.length === 0}
            onClick={() => void exportGuests(visibleGuestIds)}
            size="lg"
            type="button"
            variant="secondary"
          >
            Export Excel (.xlsx)
          </Button>
          <Button
            onClick={() => {
              setImportMode('xlsx');
              setImportOpen(true);
            }}
            size="lg"
            type="button"
            variant="secondary"
          >
            Import Excel
          </Button>
          <Button onClick={() => setAddOpen(true)} size="lg" type="button">
            Tambah tamu
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5 sm:pt-6">
        {initialGuests.length > 0 ? (
          <>
            <dl
              aria-label="Kualitas data tamu"
              className="border-seraya-border-default bg-seraya-canvas grid gap-4 rounded-[var(--seraya-radius-md)] border p-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {[
                ['Total tamu aktif', guestQualitySummary.active],
                ['Belum punya Nomor WhatsApp', guestQualitySummary.missingWhatsApp],
                ['Belum punya Undangan Pribadi', guestQualitySummary.missingPersonalInvitation],
                ['Tautan perlu diperbarui', guestQualitySummary.needsLinkUpdate],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-seraya-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
                    {label}
                  </dt>
                  <dd className="text-seraya-text-primary mt-1 text-lg font-semibold tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_15rem]">
              <div className="space-y-2">
                <label
                  className="text-seraya-text-primary text-sm font-semibold"
                  htmlFor="guest-search"
                >
                  Cari tamu
                </label>
                <Input
                  id="guest-search"
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder="Cari nama, grup, atau Nomor WhatsApp"
                  value={query}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-seraya-text-primary text-sm font-semibold"
                  htmlFor="guest-data-quality-filter"
                >
                  Filter data
                </label>
                <select
                  className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-md)] border px-3 text-sm focus-visible:outline-3 focus-visible:outline-offset-2"
                  id="guest-data-quality-filter"
                  onChange={(event) => updateGuestFilter(event.target.value as GuestManagerFilter)}
                  value={guestFilter}
                >
                  <option value="all">Semua tamu</option>
                  <option value="has_whatsapp">Punya Nomor WhatsApp</option>
                  <option value="missing_whatsapp">Belum punya Nomor WhatsApp</option>
                  <option value="active_link">Undangan Pribadi aktif</option>
                  <option value="missing_link">Belum punya Undangan Pribadi</option>
                  <option value="needs_link_update">Tautan perlu diperbarui</option>
                </select>
              </div>
            </div>

            {filteredGuests.length === 0 ? (
              <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
                <p className="text-seraya-text-primary font-semibold">
                  Tidak ada tamu yang sesuai.
                </p>
                <p className="text-seraya-text-muted mt-2 text-sm leading-6">
                  Ubah pencarian atau filter untuk melihat data tamu lain.
                </p>
              </div>
            ) : (
              <div className="border-seraya-border-default overflow-x-auto rounded-[var(--seraya-radius-md)] border">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead className="bg-seraya-canvas text-seraya-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
                    <tr>
                      <th className="w-12 px-3 py-2.5">
                        <input
                          aria-label="Pilih semua tamu pada hasil aktif"
                          checked={allVisibleSelected}
                          onChange={toggleAllGuests}
                          type="checkbox"
                        />
                      </th>
                      <th className="px-3 py-2.5">Tamu</th>
                      <th className="px-3 py-2.5 text-right">Rombongan</th>
                      <th className="px-3 py-2.5">WhatsApp</th>
                      <th className="px-3 py-2.5">Status Link</th>
                      <th className="px-3 py-2.5">Status RSVP</th>
                      <th className="px-3 py-2.5">
                        <span className="sr-only">Aksi</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-seraya-border-default bg-seraya-surface divide-y">
                    {filteredGuests.map((guest) => (
                      <tr key={guest.id}>
                        <td className="px-3 py-3 align-top">
                          <input
                            aria-label={`Pilih ${guest.display_name}`}
                            checked={selectedVisibleIds.includes(guest.id)}
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
                        <td className="text-seraya-text-secondary px-3 py-3 align-top">
                          {personalLinkStateLabels[guest.link_state]}
                        </td>
                        <td className="text-seraya-text-secondary px-3 py-3 align-top">
                          {getRsvpDisplay(guest)}
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <RowOverflowMenu
                            ariaLabel={`Aksi untuk ${guest.display_name}`}
                            onOpenChange={(open) => setOpenOverflowGuestId(open ? guest.id : null)}
                            open={openOverflowGuestId === guest.id}
                          >
                            <OverflowMenuAction
                              onClick={() => {
                                setOpenOverflowGuestId(null);
                                setEditGuest(guest);
                              }}
                            >
                              Edit tamu
                            </OverflowMenuAction>
                            <OverflowMenuAction
                              onClick={() => {
                                setOpenOverflowGuestId(null);
                                setLinkGuest(guest);
                              }}
                            >
                              {guest.link_state === 'active'
                                ? 'Buat ulang tautan'
                                : guest.link_state === 'revoked'
                                  ? 'Perbarui tautan agar dapat dikelola'
                                  : 'Siapkan Undangan Pribadi'}
                            </OverflowMenuAction>
                            {guest.link_state === 'active' ? (
                              <OverflowMenuAction
                                onClick={() => {
                                  setOpenOverflowGuestId(null);
                                  setRevokeLinkGuest(guest);
                                }}
                              >
                                Nonaktifkan tautan
                              </OverflowMenuAction>
                            ) : null}
                            <OverflowMenuAction
                              onClick={() => {
                                setOpenOverflowGuestId(null);
                                setRemoveGuest(guest);
                              }}
                            >
                              Hapus tamu
                            </OverflowMenuAction>
                          </RowOverflowMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredGuests.length > 0 ? (
              <div className="border-seraya-border-default bg-seraya-canvas sticky bottom-0 flex flex-col gap-3 rounded-[var(--seraya-radius-md)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p aria-live="polite" className="text-seraya-text-secondary text-sm">
                  <span className="text-seraya-text-primary font-semibold">
                    {selectedVisibleIds.length} tamu terpilih
                  </span>{' '}
                  dari hasil aktif
                </p>
                <div className="flex flex-wrap gap-2">
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
                    Export Excel (.xlsx)
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
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
            <p className="text-seraya-text-primary font-semibold">Belum ada tamu yang disiapkan.</p>
            <p className="text-seraya-text-muted mt-2 text-sm leading-6">
              Tambahkan daftar tamu saat kalian siap mengirim undangan secara personal.
            </p>
          </div>
        )}

        <div className="border-seraya-border-default border-t pt-5">
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
            href={`/dashboard/${projectId}`}
          >
            ← Kembali ke Ringkasan
          </Link>
        </div>
      </CardContent>

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
              <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border px-4 py-4 text-sm leading-6">
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

              <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6">
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
                  className="border-seraya-border-default bg-seraya-brand-soft rounded-[var(--seraya-radius-md)] border px-4 py-4 text-sm leading-6"
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
                <Input
                  accept=".csv,text/csv"
                  id="guest-csv-file"
                  name="file"
                  required
                  type="file"
                />
              </div>
              <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6">
                <p className="text-seraya-text-primary font-semibold">Format CSV yang diperlukan</p>
                <p className="text-seraya-text-secondary mt-1 font-mono text-xs">
                  display_name,group_label,party_size
                </p>
                <ul className="text-seraya-text-secondary mt-3 list-disc space-y-1 pl-5">
                  <li>group_label boleh kosong.</li>
                  <li>party_size boleh kosong dan akan menjadi 1.</li>
                  <li>
                    Import hanya menambahkan tamu baru; tidak mengubah atau menghapus tamu yang ada.
                  </li>
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
        onOpenChange={(open) => !open && setEditGuest(null)}
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
        description={
          linkGuest
            ? `Tautan baru untuk ${linkGuest.display_name} siap digunakan. Simpan atau salin sekarang; untuk membagikan kembali, gunakan Bagikan.`
            : undefined
        }
        onOpenChange={(open) => !open && setLinkGuest(null)}
        open={Boolean(linkGuest)}
        title={
          linkGuest?.link_state === 'active' ? 'Buat ulang tautan pribadi' : 'Buat tautan pribadi'
        }
      >
        {linkGuest ? (
          <form action={linkAction} className="space-y-5">
            <input name="guestId" type="hidden" value={linkGuest.id} />
            <input name="projectId" type="hidden" value={projectId} />
            <p className="text-seraya-text-secondary text-sm leading-6">
              Tautan lama akan langsung dinonaktifkan ketika tautan baru dibuat.
            </p>
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
                {linkGuest.link_state === 'active' ? 'Buat tautan baru' : 'Buat tautan'}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        description="Simpan atau salin tautan ini sekarang. Untuk membagikannya kembali, gunakan Bagikan."
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
            ? `Tautan pribadi untuk ${revokeLinkGuest.display_name} tidak dapat digunakan lagi setelah dinonaktifkan.`
            : undefined
        }
        onOpenChange={(open) => !open && setRevokeLinkGuest(null)}
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
        onOpenChange={(open) => !open && setRemoveGuest(null)}
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
    </Card>
  );
}
