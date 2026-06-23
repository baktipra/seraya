'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';

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
import { importGuestsCsvAction } from '@/modules/guests/guest-import.actions';
import type { GuestListItem, GuestRsvpStatus } from '@/modules/guests/guest.types';

type GuestManagerProps = {
  initialGuests: GuestListItem[];
  projectId: string;
};

const rsvpStatusLabels: Record<GuestRsvpStatus, string> = {
  attending: 'Hadir',
  declined: 'Tidak hadir',
  pending: 'Belum merespons',
};

const personalLinkStateLabels: Record<GuestListItem['link_state'], string> = {
  active: 'Aktif',
  not_created: 'Belum dibuat',
  revoked: 'Dinonaktifkan',
};

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

function GuestStateSummary({ guest }: { guest: GuestListItem }) {
  return (
    <dl className="text-seraya-text-muted grid grid-cols-2 gap-x-4 gap-y-1 text-xs leading-5 sm:text-sm">
      <div>
        <dt className="sr-only">Status RSVP</dt>
        <dd>
          RSVP:{' '}
          <span className="text-seraya-text-primary font-semibold">
            {rsvpStatusLabels[guest.rsvp_status]}
          </span>
        </dd>
      </div>
      <div>
        <dt className="sr-only">Status tautan pribadi</dt>
        <dd>
          Tautan:{' '}
          <span className="text-seraya-text-primary font-semibold">
            {personalLinkStateLabels[guest.link_state]}
          </span>
        </dd>
      </div>
    </dl>
  );
}

export function GuestManager({ initialGuests, projectId }: GuestManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<GuestListItem | null>(null);
  const [removeGuest, setRemoveGuest] = useState<GuestListItem | null>(null);
  const [linkGuest, setLinkGuest] = useState<GuestListItem | null>(null);
  const [revokeLinkGuest, setRevokeLinkGuest] = useState<GuestListItem | null>(null);
  const [revealedPersonalLink, setRevealedPersonalLink] = useState<{
    guestDisplayName: string;
    personalUrl: string;
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
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
  const [importState, importAction, importPending] = useActionState(
    importGuestsCsvAction,
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
  useGuestActionFeedback(importState, { onSuccess: () => setImportOpen(false) });
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
      setRevealedPersonalLink({ guestDisplayName, personalUrl });
      setCopyFeedback(null);
      toast({ title: 'Tautan pribadi siap untuk disalin.', variant: 'success' });
      router.refresh();
    });
  }, [linkGuest, linkState.personalUrl, linkState.status, router, toast]);

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
            {initialGuests.length} tamu tersimpan
          </CardTitle>
          <CardDescription>
            Setiap data dan status di sini hanya tersedia untuk project kalian.
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:border-seraya-border-strong hover:bg-seraya-canvas focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2"
            href={`/dashboard/${projectId}/guests/export`}
          >
            Export CSV
          </a>
          <Button onClick={() => setImportOpen(true)} size="lg" type="button" variant="secondary">
            Import CSV
          </Button>
          <Button onClick={() => setAddOpen(true)} size="lg" type="button">
            Tambah tamu
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5 sm:pt-6">
        {initialGuests.length > 0 ? (
          <ul className="divide-seraya-border-default overflow-hidden rounded-[var(--seraya-radius-md)] border">
            {initialGuests.map((guest) => (
              <li
                className="bg-seraya-surface flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                key={guest.id}
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-seraya-text-primary truncate text-base font-semibold">
                    {guest.display_name}
                  </p>
                  <p className="text-seraya-text-muted text-sm leading-6">
                    {guest.group_label ? `${guest.group_label} · ` : ''}
                    {guest.party_size} orang
                  </p>
                  <GuestStateSummary guest={guest} />
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    onClick={() => setLinkGuest(guest)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {guest.link_state === 'active'
                      ? 'Buat ulang tautan pribadi'
                      : 'Buat tautan pribadi'}
                  </Button>
                  {guest.link_state === 'active' ? (
                    <Button
                      onClick={() => setRevokeLinkGuest(guest)}
                      size="sm"
                      type="button"
                      variant="text"
                    >
                      Nonaktifkan tautan
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => setEditGuest(guest)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => setRemoveGuest(guest)}
                    size="sm"
                    type="button"
                    variant="text"
                  >
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
            <p className="text-seraya-text-primary font-semibold">Belum ada tamu tersimpan.</p>
            <p className="text-seraya-text-muted mt-2 text-sm leading-6">
              Tambahkan nama tamu pertama untuk mulai menyiapkan undangan kalian.
            </p>
          </div>
        )}

        <div className="border-seraya-border-default border-t pt-5">
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
            href={`/dashboard/${projectId}`}
          >
            ← Kembali ke project
          </Link>
        </div>
      </CardContent>

      <Dialog
        description="Tambahkan baris tamu baru dari file CSV. Data yang sudah ada tidak akan diubah atau dihapus."
        onOpenChange={setImportOpen}
        open={importOpen}
        title="Import CSV"
      >
        <form action={importAction} className="space-y-5" encType="multipart/form-data" noValidate>
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
          <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6">
            <p className="text-seraya-text-primary font-semibold">Format yang diperlukan</p>
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
          {importState.status === 'error' && importState.message ? (
            <p className="text-seraya-status-error text-sm leading-6" role="alert">
              {importState.message}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => setImportOpen(false)} type="button" variant="secondary">
              Batal
            </Button>
            <Button loading={importPending} type="submit">
              Import tamu
            </Button>
          </div>
        </form>
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
            ? `Tautan ini hanya akan ditampilkan sekali untuk ${linkGuest.display_name}. Simpan atau salin sebelum menutup hasilnya.`
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
        description="Simpan tautan ini sekarang. Setelah dialog ditutup, tautan tidak dapat dibuka kembali dari daftar tamu."
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
          />
        ) : null}
      </Dialog>

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
