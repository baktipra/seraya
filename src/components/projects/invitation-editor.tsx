'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  useToast,
} from '@/design-system';
import {
  initialInvitationEditorActionState,
  type InvitationEditorActionState,
} from '@/modules/invitations/invitation-editor.action-state';
import { saveInvitationEditorAction } from '@/modules/invitations/invitation-editor.actions';
import type { InvitationEditorFieldErrors } from '@/modules/invitations/invitation-editor.schema';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

export type InvitationEditorProps = {
  draft: InvitationDraft;
  projectId: string;
};

type EditorFieldProps = {
  error?: string;
  help?: string;
  label: string;
  name: string;
  required?: boolean;
  value: string | null;
};

type InvitationEditorSaveStatusInput = {
  hasSaved: boolean;
  isDirty: boolean;
  isPending: boolean;
  actionStatus: InvitationEditorActionState['status'];
};

type InvitationEditorSaveStatus = {
  description: string;
  label: string;
};

function fieldId(name: string) {
  return `invitation-editor-${name.replaceAll('.', '-')}`;
}

function FieldError({ message, name }: { message?: string; name: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className="text-seraya-status-error text-sm leading-6"
      id={`${fieldId(name)}-error`}
      role="alert"
    >
      {message}
    </p>
  );
}

function EditorTextField({ error, help, label, name, required = false, value }: EditorFieldProps) {
  const id = fieldId(name);
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-2.5">
      <label className="text-seraya-text-primary text-sm font-semibold" htmlFor={id}>
        {label}
        {required ? <span className="text-seraya-status-error"> *</span> : null}
      </label>
      <Input
        aria-describedby={describedBy || undefined}
        defaultValue={value ?? ''}
        hasError={Boolean(error)}
        id={id}
        name={name}
        required={required}
      />
      {help ? (
        <p className="text-seraya-text-muted text-sm leading-6" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
      <FieldError message={error} name={name} />
    </div>
  );
}

function EditorDateField({ error, label, name, value }: EditorFieldProps) {
  const id = fieldId(name);

  return (
    <div className="space-y-2.5">
      <label className="text-seraya-text-primary text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <Input
        aria-describedby={error ? `${id}-error` : undefined}
        defaultValue={value ?? ''}
        hasError={Boolean(error)}
        id={id}
        name={name}
        type="date"
      />
      <FieldError message={error} name={name} />
    </div>
  );
}

function EditorTimeField({ error, label, name, value }: EditorFieldProps) {
  const id = fieldId(name);

  return (
    <div className="space-y-2.5">
      <label className="text-seraya-text-primary text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <Input
        aria-describedby={error ? `${id}-error` : undefined}
        defaultValue={value ?? ''}
        hasError={Boolean(error)}
        id={id}
        name={name}
        type="time"
      />
      <FieldError message={error} name={name} />
    </div>
  );
}

function EditorTextAreaField({ error, help, label, name, value }: EditorFieldProps) {
  const id = fieldId(name);
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-2.5">
      <label className="text-seraya-text-primary text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <textarea
        aria-describedby={describedBy || undefined}
        className={[
          'bg-seraya-surface text-seraya-text-primary placeholder:text-seraya-text-muted min-h-28 w-full rounded-[var(--seraya-radius-md)] border px-3.5 py-3 text-base leading-6 transition-colors outline-none',
          error
            ? 'border-seraya-status-error focus-visible:border-seraya-status-error focus-visible:ring-3 focus-visible:ring-[color:color-mix(in_srgb,var(--seraya-status-error)_20%,transparent)]'
            : 'border-seraya-border-default hover:border-seraya-border-strong focus-visible:border-seraya-action-primary focus-visible:ring-3 focus-visible:ring-[color:color-mix(in_srgb,var(--seraya-focus-ring)_30%,transparent)]',
        ].join(' ')}
        defaultValue={value ?? ''}
        id={id}
        name={name}
      />
      {help ? (
        <p className="text-seraya-text-muted text-sm leading-6" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
      <FieldError message={error} name={name} />
    </div>
  );
}

function EditorToggle({
  checked,
  error,
  help,
  label,
  name,
}: {
  checked: boolean;
  error?: string;
  help?: string;
  label: string;
  name: string;
}) {
  const id = fieldId(name);
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="border-seraya-border-default bg-seraya-brand-soft/45 rounded-[var(--seraya-radius-md)] border px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3.5">
        <input
          aria-describedby={describedBy || undefined}
          className="accent-seraya-action-primary mt-0.5 size-4 shrink-0"
          defaultChecked={checked}
          id={id}
          name={name}
          type="checkbox"
          value="true"
        />
        <div className="min-w-0">
          <label
            className="text-seraya-text-primary cursor-pointer text-sm font-semibold"
            htmlFor={id}
          >
            {label}
          </label>
          {help ? (
            <p className="text-seraya-text-muted mt-1 text-sm leading-6" id={`${id}-help`}>
              {help}
            </p>
          ) : null}
          <FieldError message={error} name={name} />
        </div>
      </div>
    </div>
  );
}

function EditorSection({
  children,
  description,
  number,
  title,
}: {
  children: ReactNode;
  description: string;
  number: string;
  title: string;
}) {
  const headingId = `invitation-editor-section-${number}`;

  return (
    <section
      aria-labelledby={headingId}
      className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-lg)] border p-4 shadow-[var(--seraya-shadow-soft)] sm:p-6"
    >
      <div className="mb-6 flex items-start gap-3.5 sm:mb-7 sm:gap-4">
        <span
          aria-hidden="true"
          className="bg-seraya-brand-soft text-seraya-action-primary inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-[0.08em]"
        >
          {number}
        </span>
        <div className="min-w-0">
          <h2
            className="text-seraya-text-primary text-xl font-semibold tracking-[-0.025em]"
            id={headingId}
          >
            {title}
          </h2>
          <p className="text-seraya-text-muted mt-1.5 max-w-2xl text-sm leading-6">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EditorEventCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <fieldset className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-md)] border p-4 sm:p-5">
      <legend className="text-seraya-text-primary px-1 text-base font-semibold">{title}</legend>
      <div className="mt-4 space-y-4">{children}</div>
    </fieldset>
  );
}

function getError(errors: InvitationEditorFieldErrors | undefined, name: string) {
  return errors?.[name as keyof InvitationEditorFieldErrors];
}

/**
 * Local-only presentation state for the explicit draft save flow. It never
 * changes server behavior and never treats browser edits as persisted data.
 */
export function getInvitationEditorSaveStatus({
  actionStatus,
  hasSaved,
  isDirty,
  isPending,
}: InvitationEditorSaveStatusInput): InvitationEditorSaveStatus {
  if (isPending) {
    return {
      description: 'Mohon tunggu sebentar. Perubahan sedang disimpan ke draft pribadi.',
      label: 'Menyimpan perubahan…',
    };
  }

  if (actionStatus === 'error' || isDirty) {
    return {
      description: 'Simpan perubahan agar hasil terbaru dapat dilihat di preview.',
      label: 'Belum disimpan',
    };
  }

  if (actionStatus === 'success' && hasSaved) {
    return {
      description: 'Perubahan siap dipreview.',
      label: 'Tersimpan',
    };
  }

  return {
    description: 'Mulai lengkapi detail undangan kalian di bawah ini.',
    label: 'Belum ada perubahan',
  };
}

export function InvitationEditor({ draft, projectId }: InvitationEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(
    saveInvitationEditorAction,
    initialInvitationEditorActionState,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const lastHandledSuccessState = useRef<InvitationEditorActionState | null>(null);
  const content = draft.content;
  const saveStatus = getInvitationEditorSaveStatus({
    actionStatus: state.status,
    hasSaved,
    isDirty,
    isPending,
  });

  useEffect(() => {
    if (state.status !== 'success' || !state.message || lastHandledSuccessState.current === state) {
      return;
    }

    lastHandledSuccessState.current = state;
    setHasSaved(true);
    setIsDirty(false);
    toast({
      description: 'Perubahan siap dipreview.',
      title: 'Tersimpan',
      variant: 'success',
    });
    router.refresh();
  }, [router, state, toast]);

  return (
    <Card aria-labelledby="invitation-editor-title" className="max-w-4xl overflow-visible">
      <div className="bg-seraya-brand-soft rounded-t-[var(--seraya-radius-lg)] px-5 py-8 sm:px-8 sm:py-10">
        <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
          Undangan kalian
        </p>
        <h1
          className="seraya-display-md mt-4 max-w-2xl text-[clamp(2.25rem,5vw,3.5rem)]"
          id="invitation-editor-title"
        >
          Edit undangan
        </h1>
        <div className="text-seraya-text-secondary mt-4 max-w-2xl space-y-2 text-base leading-7">
          <p>Lengkapi detail undangan kalian, lalu simpan untuk melihat hasilnya di preview.</p>
          <p>
            Perubahan ini tersimpan sebagai draft pribadi. Tamu baru melihatnya setelah kalian
            menerbitkan atau menerbitkan ulang undangan.
          </p>
        </div>
      </div>

      <CardHeader className="border-seraya-border-default gap-5 border-b pb-5 sm:pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="font-sans text-lg font-semibold tracking-[-0.02em]">
              Lengkapi undangan kalian
            </CardTitle>
            <CardDescription className="mt-1.5 max-w-2xl">
              Isi setiap bagian sesuai kebutuhan. Perubahan baru masuk ke preview setelah disimpan.
            </CardDescription>
          </div>
          <Link
            className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:border-seraya-border-strong hover:bg-seraya-canvas focus-visible:outline-seraya-focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
            href={`/dashboard/${projectId}`}
          >
            Kembali ke project
          </Link>
        </div>

        <ol aria-label="Alur melengkapi undangan" className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
          {[
            ['1', 'Lengkapi detail'],
            ['2', 'Simpan perubahan'],
            ['3', 'Lihat hasil undangan'],
          ].map(([number, label]) => (
            <li
              className="border-seraya-border-default bg-seraya-canvas flex min-h-12 items-center gap-3 rounded-[var(--seraya-radius-md)] border px-3.5 py-3"
              key={number}
            >
              <span
                aria-hidden="true"
                className="bg-seraya-brand-soft text-seraya-action-primary inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              >
                {number}
              </span>
              <span className="text-seraya-text-primary text-sm font-semibold">{label}</span>
            </li>
          ))}
        </ol>
      </CardHeader>

      <CardContent className="pt-6 sm:pt-7">
        <form
          action={formAction}
          className="space-y-6 pb-28 sm:pb-0"
          onChange={() => setIsDirty(true)}
        >
          <input name="projectId" type="hidden" value={projectId} />

          {state.status === 'error' && state.message ? (
            <div
              className="border-seraya-status-error/25 bg-seraya-status-error-soft text-seraya-text-primary rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6"
              role="alert"
            >
              {state.message}
            </div>
          ) : null}

          <EditorSection
            description="Sapaan dan judul pertama yang menyambut tamu."
            number="01"
            title="Pembuka"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <EditorTextField
                error={getError(state.fieldErrors, 'hero.eyebrow')}
                label="Sapaan kecil"
                name="hero.eyebrow"
                value={content.hero.eyebrow}
              />
              <EditorTextField
                error={getError(state.fieldErrors, 'hero.title')}
                label="Judul utama undangan"
                name="hero.title"
                value={content.hero.title}
              />
              <div className="sm:col-span-2">
                <EditorTextField
                  error={getError(state.fieldErrors, 'hero.subtitle')}
                  label="Kalimat pendamping"
                  name="hero.subtitle"
                  value={content.hero.subtitle}
                />
              </div>
            </div>
          </EditorSection>

          <EditorSection
            description="Nama yang ingin kalian tampilkan di undangan."
            number="02"
            title="Mempelai"
          >
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-7">
              <fieldset className="space-y-4">
                <legend className="text-seraya-text-primary text-base font-semibold">
                  Mempelai pertama
                </legend>
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personOne.displayName')}
                  label="Nama yang tampil di undangan"
                  name="couple.personOne.displayName"
                  required
                  value={content.couple.personOne.displayName}
                />
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personOne.fullName')}
                  label="Nama lengkap (opsional)"
                  name="couple.personOne.fullName"
                  value={content.couple.personOne.fullName}
                />
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personOne.parentLine')}
                  label="Orang tua atau keluarga (opsional)"
                  name="couple.personOne.parentLine"
                  value={content.couple.personOne.parentLine}
                />
              </fieldset>
              <fieldset className="border-seraya-border-default space-y-4 border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7">
                <legend className="text-seraya-text-primary text-base font-semibold">
                  Mempelai kedua
                </legend>
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personTwo.displayName')}
                  label="Nama yang tampil di undangan"
                  name="couple.personTwo.displayName"
                  required
                  value={content.couple.personTwo.displayName}
                />
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personTwo.fullName')}
                  label="Nama lengkap (opsional)"
                  name="couple.personTwo.fullName"
                  value={content.couple.personTwo.fullName}
                />
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personTwo.parentLine')}
                  label="Orang tua atau keluarga (opsional)"
                  name="couple.personTwo.parentLine"
                  value={content.couple.personTwo.parentLine}
                />
              </fieldset>
            </div>
          </EditorSection>

          <EditorSection
            description="Bagian opsional untuk membagikan sedikit cerita."
            number="03"
            title="Cerita kalian"
          >
            <div className="space-y-5">
              <EditorToggle
                checked={content.story.enabled}
                error={getError(state.fieldErrors, 'story.enabled')}
                help="Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan."
                label="Tampilkan cerita kalian"
                name="story.enabled"
              />
              <EditorTextField
                error={getError(state.fieldErrors, 'story.heading')}
                label="Judul cerita"
                name="story.heading"
                value={content.story.heading}
              />
              <EditorTextAreaField
                error={getError(state.fieldErrors, 'story.body')}
                label="Cerita kalian"
                name="story.body"
                value={content.story.body}
              />
            </div>
          </EditorSection>

          <EditorSection
            description="Tanggal, waktu, dan rangkaian acara kalian."
            number="04"
            title="Detail acara"
          >
            <div className="space-y-5">
              <EditorToggle
                checked={content.events.enabled}
                error={getError(state.fieldErrors, 'events.enabled')}
                help="Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan."
                label="Tampilkan detail acara"
                name="events.enabled"
              />
              <EditorDateField
                error={getError(state.fieldErrors, 'events.primaryDate')}
                label="Tanggal utama"
                name="events.primaryDate"
                value={content.events.primaryDate}
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <EditorEventCard title="Akad atau upacara">
                  <EditorToggle
                    checked={content.events.ceremony.enabled}
                    error={getError(state.fieldErrors, 'events.ceremony.enabled')}
                    help="Tampilkan acara ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun acara ini belum ditampilkan."
                    label="Tampilkan akad atau upacara"
                    name="events.ceremony.enabled"
                  />
                  <EditorTextField
                    error={getError(state.fieldErrors, 'events.ceremony.title')}
                    label="Nama acara"
                    name="events.ceremony.title"
                    value={content.events.ceremony.title}
                  />
                  <EditorDateField
                    error={getError(state.fieldErrors, 'events.ceremony.date')}
                    label="Tanggal"
                    name="events.ceremony.date"
                    value={content.events.ceremony.date}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditorTimeField
                      error={getError(state.fieldErrors, 'events.ceremony.startTime')}
                      label="Mulai"
                      name="events.ceremony.startTime"
                      value={content.events.ceremony.startTime}
                    />
                    <EditorTimeField
                      error={getError(state.fieldErrors, 'events.ceremony.endTime')}
                      label="Selesai"
                      name="events.ceremony.endTime"
                      value={content.events.ceremony.endTime}
                    />
                  </div>
                </EditorEventCard>

                <EditorEventCard title="Resepsi">
                  <EditorToggle
                    checked={content.events.reception.enabled}
                    error={getError(state.fieldErrors, 'events.reception.enabled')}
                    help="Tampilkan acara ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun acara ini belum ditampilkan."
                    label="Tampilkan resepsi"
                    name="events.reception.enabled"
                  />
                  <EditorTextField
                    error={getError(state.fieldErrors, 'events.reception.title')}
                    label="Nama acara"
                    name="events.reception.title"
                    value={content.events.reception.title}
                  />
                  <EditorDateField
                    error={getError(state.fieldErrors, 'events.reception.date')}
                    label="Tanggal"
                    name="events.reception.date"
                    value={content.events.reception.date}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditorTimeField
                      error={getError(state.fieldErrors, 'events.reception.startTime')}
                      label="Mulai"
                      name="events.reception.startTime"
                      value={content.events.reception.startTime}
                    />
                    <EditorTimeField
                      error={getError(state.fieldErrors, 'events.reception.endTime')}
                      label="Selesai"
                      name="events.reception.endTime"
                      value={content.events.reception.endTime}
                    />
                  </div>
                </EditorEventCard>
              </div>
            </div>
          </EditorSection>

          <EditorSection
            description="Tempat berlangsungnya acara dan tautan peta."
            number="05"
            title="Lokasi"
          >
            <div className="space-y-5">
              <EditorToggle
                checked={content.location.enabled}
                error={getError(state.fieldErrors, 'location.enabled')}
                help="Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan."
                label="Tampilkan lokasi"
                name="location.enabled"
              />
              <EditorTextField
                error={getError(state.fieldErrors, 'location.venueName')}
                label="Nama tempat"
                name="location.venueName"
                value={content.location.venueName}
              />
              <EditorTextAreaField
                error={getError(state.fieldErrors, 'location.address')}
                label="Alamat"
                name="location.address"
                value={content.location.address}
              />
              <EditorTextField
                error={getError(state.fieldErrors, 'location.mapsUrl')}
                help="Gunakan tautan HTTPS yang valid."
                label="Tautan peta"
                name="location.mapsUrl"
                value={content.location.mapsUrl}
              />
            </div>
          </EditorSection>

          <EditorSection
            description="Atur teks RSVP yang akan dilihat tamu."
            number="06"
            title="Konfirmasi kehadiran"
          >
            <div className="space-y-5">
              <EditorToggle
                checked={content.rsvp.enabled}
                error={getError(state.fieldErrors, 'rsvp.enabled')}
                help="Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan."
                label="Tampilkan konfirmasi kehadiran"
                name="rsvp.enabled"
              />
              <EditorTextField
                error={getError(state.fieldErrors, 'rsvp.heading')}
                label="Judul bagian RSVP"
                name="rsvp.heading"
                value={content.rsvp.heading}
              />
              <EditorTextAreaField
                error={getError(state.fieldErrors, 'rsvp.lead')}
                label="Pesan untuk tamu"
                name="rsvp.lead"
                value={content.rsvp.lead}
              />
            </div>
          </EditorSection>

          <EditorSection
            description="Pesan terakhir yang tampil di akhir undangan."
            number="07"
            title="Penutup"
          >
            <div className="space-y-5">
              <EditorToggle
                checked={content.closing.enabled}
                error={getError(state.fieldErrors, 'closing.enabled')}
                help="Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan."
                label="Tampilkan penutup"
                name="closing.enabled"
              />
              <EditorTextAreaField
                error={getError(state.fieldErrors, 'closing.message')}
                label="Pesan penutup"
                name="closing.message"
                value={content.closing.message}
              />
              <EditorTextField
                error={getError(state.fieldErrors, 'closing.signature')}
                label="Nama penutup"
                name="closing.signature"
                value={content.closing.signature}
              />
            </div>
          </EditorSection>

          <div className="border-seraya-border-default bg-seraya-surface sticky bottom-0 z-10 -mx-5 border-t px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-10px_20px_rgb(62_42_34_/_0.08)] sm:static sm:mx-0 sm:rounded-[var(--seraya-radius-md)] sm:border sm:p-4 sm:shadow-none">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div
                aria-live="polite"
                className="min-w-0"
                data-testid="invitation-editor-save-status"
                role="status"
              >
                <p className="text-seraya-text-primary text-sm font-semibold">{saveStatus.label}</p>
                <p className="text-seraya-text-muted mt-1 text-sm leading-6">
                  {saveStatus.description}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-56">
                <Button loading={isPending} size="lg" type="submit">
                  Simpan perubahan
                </Button>
                <Link
                  className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center justify-center rounded-[var(--seraya-radius-sm)] px-3 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                  href={`/dashboard/${projectId}/preview`}
                >
                  Lihat hasil undangan
                </Link>
                <p className="text-seraya-text-muted text-center text-xs leading-5">
                  Preview menampilkan perubahan yang sudah disimpan.
                </p>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
