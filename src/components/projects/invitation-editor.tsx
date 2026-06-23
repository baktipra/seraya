'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef } from 'react';

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
import { initialInvitationEditorActionState } from '@/modules/invitations/invitation-editor.action-state';
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
    <div className="space-y-2">
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
    <div className="space-y-2">
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
    <div className="space-y-2">
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

function EditorTextAreaField({
  error,
  help,
  label,
  name,
  value,
}: EditorFieldProps & { help?: string }) {
  const id = fieldId(name);
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-2">
      <label className="text-seraya-text-primary text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <textarea
        aria-describedby={describedBy || undefined}
        className={[
          'bg-seraya-surface text-seraya-text-primary placeholder:text-seraya-text-muted min-h-28 w-full rounded-[var(--seraya-radius-md)] border px-3.5 py-2.5 text-base leading-6 transition-colors outline-none',
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

  return (
    <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border p-4">
      <div className="flex items-start gap-3">
        <input
          aria-describedby={
            [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
            undefined
          }
          className="accent-seraya-action-primary mt-0.5 size-4"
          defaultChecked={checked}
          id={id}
          name={name}
          type="checkbox"
          value="true"
        />
        <div>
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
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section
      aria-label={title}
      className="border-seraya-border-default rounded-[var(--seraya-radius-lg)] border p-4 sm:p-5"
    >
      <div className="mb-5">
        <h2 className="text-seraya-text-primary text-lg font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        <p className="text-seraya-text-muted mt-1 text-sm leading-6">{description}</p>
      </div>
      {children}
    </section>
  );
}

function getError(errors: InvitationEditorFieldErrors | undefined, name: string) {
  return errors?.[name as keyof InvitationEditorFieldErrors];
}

export function InvitationEditor({ draft, projectId }: InvitationEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const lastSuccessMessage = useRef<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    saveInvitationEditorAction,
    initialInvitationEditorActionState,
  );
  const content = draft.content;

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
    router.refresh();
  }, [router, state.message, state.status, toast]);

  return (
    <Card aria-labelledby="invitation-editor-title" className="max-w-4xl overflow-hidden">
      <div className="bg-seraya-brand-soft px-5 py-7 sm:px-8 sm:py-9">
        <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
          Undangan kalian
        </p>
        <h1
          className="seraya-display-md mt-4 max-w-2xl text-[clamp(2.25rem,5vw,3.5rem)]"
          id="invitation-editor-title"
        >
          Edit undangan
        </h1>
        <p className="text-seraya-text-secondary mt-4 max-w-xl text-base leading-7">
          Perubahan disimpan ke draft pribadi. Tamu baru melihat perubahan setelah undangan
          diterbitkan atau diterbitkan ulang.
        </p>
      </div>

      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-sans text-lg font-semibold tracking-[-0.02em]">
            Isi undangan
          </CardTitle>
          <CardDescription>
            Lengkapi detail yang ingin tampil pada undangan Roselle.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:border-seraya-border-strong hover:bg-seraya-canvas focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
            href={`/dashboard/${projectId}/preview`}
          >
            Pratinjau undangan
          </Link>
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] px-2 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
            href={`/dashboard/${projectId}`}
          >
            Kembali ke project
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pt-5 sm:pt-6">
        <form action={formAction} className="space-y-6">
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
            description="Atur sapaan dan judul utama yang tampil pertama kali."
            title="Pembuka"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <EditorTextField
                error={getError(state.fieldErrors, 'hero.eyebrow')}
                label="Teks pembuka"
                name="hero.eyebrow"
                value={content.hero.eyebrow}
              />
              <EditorTextField
                error={getError(state.fieldErrors, 'hero.title')}
                label="Judul undangan"
                name="hero.title"
                value={content.hero.title}
              />
              <div className="sm:col-span-2">
                <EditorTextField
                  error={getError(state.fieldErrors, 'hero.subtitle')}
                  label="Subjudul"
                  name="hero.subtitle"
                  value={content.hero.subtitle}
                />
              </div>
            </div>
          </EditorSection>

          <EditorSection
            description="Tampilkan nama panggilan dan informasi keluarga bila diperlukan."
            title="Mempelai"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <fieldset className="space-y-4">
                <legend className="text-seraya-text-primary text-base font-semibold">
                  Mempelai pertama
                </legend>
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personOne.displayName')}
                  label="Nama panggilan"
                  name="couple.personOne.displayName"
                  required
                  value={content.couple.personOne.displayName}
                />
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personOne.fullName')}
                  label="Nama lengkap"
                  name="couple.personOne.fullName"
                  value={content.couple.personOne.fullName}
                />
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personOne.parentLine')}
                  label="Keterangan orang tua"
                  name="couple.personOne.parentLine"
                  value={content.couple.personOne.parentLine}
                />
              </fieldset>
              <fieldset className="space-y-4">
                <legend className="text-seraya-text-primary text-base font-semibold">
                  Mempelai kedua
                </legend>
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personTwo.displayName')}
                  label="Nama panggilan"
                  name="couple.personTwo.displayName"
                  required
                  value={content.couple.personTwo.displayName}
                />
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personTwo.fullName')}
                  label="Nama lengkap"
                  name="couple.personTwo.fullName"
                  value={content.couple.personTwo.fullName}
                />
                <EditorTextField
                  error={getError(state.fieldErrors, 'couple.personTwo.parentLine')}
                  label="Keterangan orang tua"
                  name="couple.personTwo.parentLine"
                  value={content.couple.personTwo.parentLine}
                />
              </fieldset>
            </div>
          </EditorSection>

          <EditorSection
            description="Bagian ini opsional. Nilainya tetap tersimpan saat tidak ditampilkan."
            title="Cerita"
          >
            <div className="space-y-4">
              <EditorToggle
                checked={content.story.enabled}
                error={getError(state.fieldErrors, 'story.enabled')}
                help="Tampilkan cerita kalian pada undangan."
                label="Tampilkan cerita"
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
            description="Atur tanggal utama dan detail akad atau resepsi yang ingin ditampilkan."
            title="Acara"
          >
            <div className="space-y-5">
              <EditorToggle
                checked={content.events.enabled}
                error={getError(state.fieldErrors, 'events.enabled')}
                help="Tampilkan rangkaian acara pada undangan."
                label="Tampilkan rangkaian acara"
                name="events.enabled"
              />
              <EditorDateField
                error={getError(state.fieldErrors, 'events.primaryDate')}
                label="Tanggal acara utama"
                name="events.primaryDate"
                value={content.events.primaryDate}
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <fieldset className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border p-4">
                  <legend className="px-1 text-base font-semibold">Akad / upacara</legend>
                  <div className="mt-3 space-y-4">
                    <EditorToggle
                      checked={content.events.ceremony.enabled}
                      error={getError(state.fieldErrors, 'events.ceremony.enabled')}
                      label="Tampilkan akad / upacara"
                      name="events.ceremony.enabled"
                    />
                    <EditorTextField
                      error={getError(state.fieldErrors, 'events.ceremony.title')}
                      label="Judul acara"
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
                  </div>
                </fieldset>

                <fieldset className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border p-4">
                  <legend className="px-1 text-base font-semibold">Resepsi</legend>
                  <div className="mt-3 space-y-4">
                    <EditorToggle
                      checked={content.events.reception.enabled}
                      error={getError(state.fieldErrors, 'events.reception.enabled')}
                      label="Tampilkan resepsi"
                      name="events.reception.enabled"
                    />
                    <EditorTextField
                      error={getError(state.fieldErrors, 'events.reception.title')}
                      label="Judul acara"
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
                  </div>
                </fieldset>
              </div>
            </div>
          </EditorSection>

          <EditorSection
            description="Bagian ini opsional dan dapat menautkan tamu ke peta HTTPS."
            title="Lokasi"
          >
            <div className="space-y-4">
              <EditorToggle
                checked={content.location.enabled}
                error={getError(state.fieldErrors, 'location.enabled')}
                help="Tampilkan lokasi acara pada undangan."
                label="Tampilkan lokasi"
                name="location.enabled"
              />
              <EditorTextField
                error={getError(state.fieldErrors, 'location.venueName')}
                label="Nama lokasi"
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
                help="Gunakan URL HTTPS yang valid."
                label="Link peta"
                name="location.mapsUrl"
                value={content.location.mapsUrl}
              />
            </div>
          </EditorSection>

          <EditorSection
            description="Atur teks tampilan RSVP pada undangan. Pilihan kehadiran tetap memakai alur tautan pribadi yang ada."
            title="RSVP"
          >
            <div className="space-y-4">
              <EditorToggle
                checked={content.rsvp.enabled}
                error={getError(state.fieldErrors, 'rsvp.enabled')}
                help="Tampilkan bagian RSVP pada undangan setelah dipublikasikan."
                label="Tampilkan bagian RSVP"
                name="rsvp.enabled"
              />
              <EditorTextField
                error={getError(state.fieldErrors, 'rsvp.heading')}
                label="Judul RSVP"
                name="rsvp.heading"
                value={content.rsvp.heading}
              />
              <EditorTextAreaField
                error={getError(state.fieldErrors, 'rsvp.lead')}
                label="Pengantar RSVP"
                name="rsvp.lead"
                value={content.rsvp.lead}
              />
            </div>
          </EditorSection>

          <EditorSection
            description="Bagian ini opsional dan muncul di akhir undangan."
            title="Penutup"
          >
            <div className="space-y-4">
              <EditorToggle
                checked={content.closing.enabled}
                error={getError(state.fieldErrors, 'closing.enabled')}
                help="Tampilkan pesan penutup pada undangan."
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
                label="Tanda tangan"
                name="closing.signature"
                value={content.closing.signature}
              />
            </div>
          </EditorSection>

          <div className="border-seraya-border-default flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-seraya-text-muted text-sm leading-6">
              Simpan perubahan terlebih dahulu sebelum membuka pratinjau terbaru.
            </p>
            <Button loading={isPending} size="lg" type="submit">
              Simpan perubahan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
