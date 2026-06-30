'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

import {
  Badge,
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
import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
import type { ProjectPublishEligibility } from '@/modules/payments/payment.types';
import {
  getInvitationConfidenceChecklist,
  getInvitationConfidenceStatus,
} from '@/modules/readiness/invitation-confidence';
import type { WeddingReadinessV1 } from '@/modules/readiness/wedding-readiness.types';

import { PublishInvitationControls } from './publish-invitation-controls';

export type InvitationEditorProps = {
  draft: InvitationDraft;
  projectId: string;
  readiness?: Pick<WeddingReadinessV1, 'identity' | 'invitation'>;
};

type EditorFieldProps = {
  autoComplete?: string;
  error?: string;
  help?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  value: string | null;
};

type DigitalGiftAccountEditorValue = InvitationDraft['content']['digitalGift']['accounts'][number];
type EventScheduleEditorValue = InvitationDraft['content']['eventSchedule']['events'][number];

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

function EditorTextField({
  autoComplete,
  error,
  help,
  inputMode,
  label,
  name,
  placeholder,
  required = false,
  type,
  value,
}: EditorFieldProps) {
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
        autoComplete={autoComplete}
        inputMode={inputMode}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
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

function createLocalUuid() {
  const browserId = globalThis.crypto?.randomUUID?.();

  if (browserId) {
    return browserId;
  }

  // This fallback only creates a local React/form key before the owner saves.
  // The server still validates UUID shape and authorizes the entire draft save.
  const entropy = Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12);
  return `00000000-0000-4000-8000-${entropy}`;
}

function createDigitalGiftAccountId() {
  return createLocalUuid();
}

function createEventScheduleItem(): EventScheduleEditorValue {
  return {
    date: '',
    endTime: null,
    id: createLocalUuid(),
    mapsUrl: null,
    startTime: '',
    title: '',
    venueAddress: null,
    venueName: null,
  };
}

function EditorScheduleEventCard({
  event,
  index,
  onMoveDown,
  onMoveUp,
  onRemove,
  removable,
  total,
  errors,
}: {
  event: EventScheduleEditorValue;
  index: number;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  removable: boolean;
  total: number;
  errors: InvitationEditorFieldErrors | undefined;
}) {
  const eventPrefix = `eventSchedule.events.${index}`;
  const isPrimary = index === 0;

  return (
    <fieldset className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-md)] border p-4 sm:p-5">
      <legend className="sr-only">Acara {index + 1}</legend>
      <div className="border-seraya-border-default flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-seraya-text-primary text-base font-semibold">Acara {index + 1}</h3>
            {isPrimary ? (
              <span className="bg-seraya-brand-soft text-seraya-action-primary rounded-[var(--seraya-radius-pill)] px-2.5 py-1 text-xs font-semibold">
                Acara utama
              </span>
            ) : null}
          </div>
          {isPrimary ? (
            <p className="text-seraya-text-muted mt-1.5 text-sm leading-6">
              Acara pertama menjadi acara utama yang digunakan pada ringkasan undangan.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            aria-label={`Pindahkan acara ${index + 1} ke atas`}
            disabled={index === 0}
            onClick={onMoveUp}
            size="sm"
            type="button"
            variant="secondary"
          >
            Naik
          </Button>
          <Button
            aria-label={`Pindahkan acara ${index + 1} ke bawah`}
            disabled={index === total - 1}
            onClick={onMoveDown}
            size="sm"
            type="button"
            variant="secondary"
          >
            Turun
          </Button>
          <Button
            aria-label={`Hapus acara ${index + 1}`}
            disabled={!removable}
            onClick={onRemove}
            size="sm"
            type="button"
            variant="text"
          >
            Hapus
          </Button>
        </div>
      </div>

      <input name={`${eventPrefix}.id`} type="hidden" value={event.id} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <EditorTextField
            error={getError(errors, `${eventPrefix}.title`)}
            label="Nama acara"
            name={`${eventPrefix}.title`}
            placeholder="Contoh: Akad Nikah, Resepsi, atau Ngunduh Mantu"
            required
            value={event.title}
          />
        </div>
        <EditorDateField
          error={getError(errors, `${eventPrefix}.date`)}
          label="Tanggal"
          name={`${eventPrefix}.date`}
          value={event.date}
        />
        <EditorTimeField
          error={getError(errors, `${eventPrefix}.startTime`)}
          label="Waktu mulai"
          name={`${eventPrefix}.startTime`}
          value={event.startTime}
        />
        <EditorTimeField
          error={getError(errors, `${eventPrefix}.endTime`)}
          label="Waktu selesai (opsional)"
          name={`${eventPrefix}.endTime`}
          value={event.endTime}
        />
        <EditorTextField
          error={getError(errors, `${eventPrefix}.venueName`)}
          label="Nama tempat (opsional)"
          name={`${eventPrefix}.venueName`}
          value={event.venueName}
        />
        <div className="sm:col-span-2">
          <EditorTextAreaField
            error={getError(errors, `${eventPrefix}.venueAddress`)}
            label="Alamat tempat (opsional)"
            name={`${eventPrefix}.venueAddress`}
            value={event.venueAddress}
          />
        </div>
        <div className="sm:col-span-2">
          <EditorTextField
            error={getError(errors, `${eventPrefix}.mapsUrl`)}
            help="Gunakan tautan HTTPS yang valid."
            label="Tautan peta (opsional)"
            name={`${eventPrefix}.mapsUrl`}
            value={event.mapsUrl}
          />
        </div>
      </div>
    </fieldset>
  );
}

function getError(errors: InvitationEditorFieldErrors | undefined, name: string) {
  return errors?.[name as keyof InvitationEditorFieldErrors];
}

const invitationTemplateOptions: ReadonlyArray<{
  description: string;
  key: InvitationTemplateKey;
  name: string;
}> = [
  {
    description: 'Hangat, romantis, dan lembut dengan detail kelopak yang tenang.',
    key: 'roselle',
    name: 'Roselle',
  },
  {
    description: 'Terang dan editorial dengan aksen terracotta serta ruang yang lega.',
    key: 'aruna',
    name: 'Aruna',
  },
  {
    description: 'Elegan dan formal dengan suasana malam bernuansa plum yang dalam.',
    key: 'laras',
    name: 'Laras',
  },
];

function InvitationTemplateMiniPreview({ templateKey }: { templateKey: InvitationTemplateKey }) {
  if (templateKey === 'aruna') {
    return (
      <div
        aria-hidden="true"
        className="relative h-32 overflow-hidden rounded-[var(--seraya-radius-sm)] border border-[#d8b89f] bg-[#fff6ea] p-3"
      >
        <span className="absolute inset-x-3 top-3 h-px bg-[#b95f48]" />
        <span className="absolute right-3 bottom-3 h-12 w-10 border-l border-[#b95f48]" />
        <span className="mt-5 block h-2 w-12 bg-[#b95f48]" />
        <span className="mt-3 block h-5 w-4/5 bg-[#4b332d]" />
        <span className="mt-2 block h-2 w-3/5 bg-[#c9a995]" />
        <span className="absolute bottom-4 left-3 h-6 w-2/5 bg-[#f1ddcc]" />
      </div>
    );
  }

  if (templateKey === 'laras') {
    return (
      <div
        aria-hidden="true"
        className="relative h-32 overflow-hidden rounded-[var(--seraya-radius-sm)] border border-[#c8a16e] bg-[#211a2b] p-3"
      >
        <span className="absolute top-3 left-3 size-7 rounded-full border border-[#c8a16e]" />
        <span className="absolute top-6 left-6 h-px w-12 bg-[#c8a16e]" />
        <span className="mt-9 block h-5 w-4/5 bg-[#fff8ed]" />
        <span className="mt-2 block h-2 w-1/2 bg-[#c8a16e]" />
        <span className="absolute right-3 bottom-3 h-12 w-2/5 border border-[#c8a16e]/70 bg-[#3d3048]" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="relative h-32 overflow-hidden rounded-[var(--seraya-radius-sm)] border border-[#e6d6ca] bg-[#fffaf4] p-3"
    >
      <span className="absolute -top-4 -left-3 size-16 rounded-full border border-[#7a8b79]/50" />
      <span className="absolute -right-4 bottom-0 size-16 rounded-full border border-[#bd7d83]/45" />
      <span className="relative mt-5 block h-2 w-10 bg-[#97636d]" />
      <span className="relative mt-3 block h-5 w-4/5 bg-[#402b35]" />
      <span className="relative mt-2 block h-2 w-3/5 bg-[#b8a3a5]" />
      <span className="absolute right-3 bottom-3 h-7 w-2/5 rounded-[0.7rem] border border-[#e6d6ca] bg-[#fffefb]" />
    </div>
  );
}

function InvitationTemplatePicker({
  error,
  onSelect,
  selectedTemplateKey,
}: {
  error?: string;
  onSelect: (templateKey: InvitationTemplateKey) => void;
  selectedTemplateKey: InvitationTemplateKey;
}) {
  const describedBy = error ? `${fieldId('templateKey')}-error` : undefined;

  return (
    <fieldset
      aria-describedby={describedBy}
      className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-lg)] border p-4 shadow-[var(--seraya-shadow-soft)] sm:p-6"
    >
      <legend className="sr-only">Pilih desain undangan</legend>
      <div className="max-w-2xl">
        <h2 className="text-seraya-text-primary text-xl font-semibold tracking-[-0.025em]">
          Pilih desain undangan
        </h2>
        <p className="text-seraya-text-muted mt-1.5 text-sm leading-6">
          Pilih tampilan yang paling sesuai untuk hari spesial kalian.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {invitationTemplateOptions.map((template) => {
          const selected = selectedTemplateKey === template.key;
          const inputId = fieldId(`templateKey-${template.key}`);

          return (
            <label
              className={[
                'group bg-seraya-surface focus-within:outline-seraya-focus-ring flex min-w-0 cursor-pointer flex-col gap-3 rounded-[var(--seraya-radius-md)] border p-3.5 transition-colors focus-within:outline-3 focus-within:outline-offset-3',
                selected
                  ? 'border-seraya-action-primary ring-seraya-action-primary/15 ring-2'
                  : 'border-seraya-border-default hover:border-seraya-border-strong',
              ].join(' ')}
              htmlFor={inputId}
              key={template.key}
            >
              <input
                checked={selected}
                className="sr-only"
                id={inputId}
                name="templateKey"
                onChange={() => onSelect(template.key)}
                type="radio"
                value={template.key}
              />
              <InvitationTemplateMiniPreview templateKey={template.key} />
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="text-seraya-text-primary block text-base font-semibold">
                    {template.name}
                  </span>
                  <span className="text-seraya-text-muted mt-1 block text-sm leading-6">
                    {template.description}
                  </span>
                </span>
                {selected ? (
                  <span className="bg-seraya-brand-soft text-seraya-action-primary shrink-0 rounded-[var(--seraya-radius-pill)] px-2 py-1 text-xs font-semibold">
                    Terpilih
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      <FieldError message={error} name="templateKey" />
    </fieldset>
  );
}

const fallbackWorkspaceReadiness: Pick<WeddingReadinessV1, 'identity' | 'invitation'> = {
  identity: { coupleLabel: 'Undangan kalian', templateKey: null },
  invitation: {
    hasPublishedSnapshot: false,
    hasUnpublishedChanges: false,
    hasVerifiedActivation: false,
    publishedSlug: null,
    state: 'draft_incomplete',
  },
};

/**
 * Local-only presentation state for the explicit draft save flow. It never
 * changes server behavior and never treats browser edits as persisted data.
 */
export function getInvitationWorkspaceStatus(readiness?: InvitationEditorProps['readiness']) {
  const workspaceReadiness = readiness ?? fallbackWorkspaceReadiness;

  switch (workspaceReadiness.invitation.state) {
    case 'published_with_unpublished_changes':
      return {
        badge: 'Perubahan belum diterbitkan',
        description:
          'Perubahan draft tidak langsung terlihat oleh tamu. Tamu melihat perubahan setelah kalian menerbitkan ulang.',
        title: 'Ada perubahan yang belum diterbitkan.',
      };
    case 'published':
      return {
        badge: 'Sudah dipublikasikan',
        description:
          'Undangan sudah live. Perubahan baru akan tetap menjadi draft sampai kalian menerbitkan ulang.',
        title: 'Undangan sudah dipublikasikan.',
      };
    case 'ready_to_publish':
      return {
        badge: 'Siap diterbitkan',
        description:
          'Perubahan draft tidak langsung terlihat oleh tamu. Tinjau lalu terbitkan saat undangan sudah kalian setujui.',
        title: 'Undangan siap diterbitkan.',
      };
    case 'draft_ready_unactivated':
      return {
        badge: 'Draft siap ditinjau',
        description: 'Perubahan draft tetap privat sampai undangan dapat diterbitkan.',
        title: 'Undangan siap ditinjau.',
      };
    case 'draft_incomplete':
      return {
        badge: 'Draft belum siap',
        description:
          'Lengkapi informasi utama lalu simpan untuk melihat hasil undangan secara privat.',
        title: 'Undangan masih disusun.',
      };
  }
}

function getInvitationPublishEligibility(
  readiness?: InvitationEditorProps['readiness'],
): ProjectPublishEligibility {
  return (readiness ?? fallbackWorkspaceReadiness).invitation.hasVerifiedActivation
    ? { allowed: true, reason: 'verified_payment' }
    : { allowed: false, reason: 'payment_not_verified' };
}

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

export function InvitationEditor({ draft, projectId, readiness }: InvitationEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(
    saveInvitationEditorAction,
    initialInvitationEditorActionState,
  );
  const content = draft.content;
  const workspaceReadiness = readiness ?? fallbackWorkspaceReadiness;
  const confidenceStatus = getInvitationConfidenceStatus(workspaceReadiness.invitation.state);
  const confidenceChecklist = getInvitationConfidenceChecklist(draft);
  const shouldShowPublishControl =
    workspaceReadiness.invitation.state === 'ready_to_publish' ||
    workspaceReadiness.invitation.state === 'published_with_unpublished_changes';
  const [isDirty, setIsDirty] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<InvitationTemplateKey>(
    content.templateKey,
  );
  const [digitalGiftAccounts, setDigitalGiftAccounts] = useState<DigitalGiftAccountEditorValue[]>(
    content.digitalGift.accounts,
  );
  const [eventScheduleEvents, setEventScheduleEvents] = useState<EventScheduleEditorValue[]>(
    content.eventSchedule.events,
  );
  const lastHandledSuccessState = useRef<InvitationEditorActionState | null>(null);
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
        <Badge variant={workspaceReadiness.invitation.hasPublishedSnapshot ? 'success' : 'brand'}>
          {confidenceStatus.badge}
        </Badge>
        <p className="text-seraya-text-secondary mt-5 text-sm font-semibold">
          {workspaceReadiness.identity.coupleLabel}
        </p>
        <h1
          className="seraya-display-md mt-3 max-w-2xl text-[clamp(2.25rem,5vw,3.5rem)]"
          id="invitation-editor-title"
        >
          {confidenceStatus.title}
        </h1>
        <p className="text-seraya-text-secondary mt-4 max-w-2xl text-base leading-7">
          {confidenceStatus.description}
        </p>
      </div>

      <CardHeader className="border-seraya-border-default gap-5 border-b pb-5 sm:pb-6">
        <section
          aria-label="Ringkasan undangan"
          className="bg-seraya-canvas rounded-[var(--seraya-radius-md)] px-4 py-3.5"
        >
          <dl className="grid gap-2 text-sm sm:grid-cols-3 sm:gap-4">
            <div>
              <dt className="text-seraya-text-muted">Pasangan</dt>
              <dd className="text-seraya-text-primary mt-0.5 font-semibold">
                {workspaceReadiness.identity.coupleLabel}
              </dd>
            </div>
            <div>
              <dt className="text-seraya-text-muted">Template</dt>
              <dd className="text-seraya-text-primary mt-0.5 font-semibold">
                {workspaceReadiness.identity.templateKey ?? 'Belum dipilih'}
              </dd>
            </div>
            <div>
              <dt className="text-seraya-text-muted">Status</dt>
              <dd className="text-seraya-text-primary mt-0.5 font-semibold">
                {confidenceStatus.badge}
              </dd>
            </div>
          </dl>
        </section>
        <section
          aria-labelledby="invitation-readiness-title"
          className="bg-seraya-surface rounded-[var(--seraya-radius-md)] px-4 py-4"
        >
          <h2
            className="text-seraya-text-primary text-base font-semibold"
            id="invitation-readiness-title"
          >
            Siap ditinjau
          </h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {confidenceChecklist.map((item) => (
              <li className="text-seraya-text-secondary flex items-center gap-2" key={item.key}>
                <span aria-hidden="true">{item.complete ? '✓' : '○'}</span>
                <span>
                  {item.label}
                  {item.optional && !item.complete
                    ? ' — Opsional, dapat ditambahkan bila diperlukan'
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="font-sans text-lg font-semibold tracking-[-0.02em]">
              Edit undangan
            </CardTitle>
            <CardDescription className="mt-1.5 max-w-2xl">
              Template, detail pasangan, jadwal, lokasi, galeri, Amplop Digital, dan penutup
              semuanya dikelola di sini.
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-start">
            <Link
              className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:border-seraya-border-strong hover:bg-seraya-canvas focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
              href={`/dashboard/${projectId}/preview`}
            >
              Preview undangan
            </Link>
            {shouldShowPublishControl ? (
              <PublishInvitationControls
                hasActiveDraft
                intent={
                  workspaceReadiness.invitation.state === 'published_with_unpublished_changes'
                    ? 'republish'
                    : 'initial'
                }
                presentation="readiness"
                projectId={projectId}
                publishedSlug={workspaceReadiness.invitation.publishedSlug}
                publishEligibility={getInvitationPublishEligibility(workspaceReadiness)}
              />
            ) : null}
          </div>
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

          <InvitationTemplatePicker
            error={getError(state.fieldErrors, 'templateKey')}
            onSelect={(templateKey) => {
              setSelectedTemplateKey(templateKey);
              setIsDirty(true);
            }}
            selectedTemplateKey={selectedTemplateKey}
          />

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
            description="Tambahkan akad, resepsi, atau acara lain dalam satu undangan."
            number="04"
            title="Rangkaian Acara"
          >
            <div className="space-y-5">
              <div className="border-seraya-border-default bg-seraya-brand-soft/45 flex flex-col gap-4 rounded-[var(--seraya-radius-md)] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <p className="text-seraya-text-primary text-sm font-semibold">
                    Susun acara kalian
                  </p>
                  <p className="text-seraya-text-muted mt-1 text-sm leading-6">
                    Acara pertama menjadi acara utama yang digunakan pada ringkasan undangan.
                  </p>
                </div>
                <Button
                  disabled={eventScheduleEvents.length >= 4}
                  onClick={() => {
                    setEventScheduleEvents((current) => [...current, createEventScheduleItem()]);
                    setIsDirty(true);
                  }}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Tambah acara
                </Button>
              </div>

              <div className="space-y-4">
                {eventScheduleEvents.map((event, index) => (
                  <EditorScheduleEventCard
                    errors={state.fieldErrors}
                    event={event}
                    index={index}
                    key={event.id}
                    onMoveDown={() => {
                      setEventScheduleEvents((current) => {
                        if (index === current.length - 1) {
                          return current;
                        }

                        const next = [...current];
                        [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                        return next;
                      });
                      setIsDirty(true);
                    }}
                    onMoveUp={() => {
                      setEventScheduleEvents((current) => {
                        if (index === 0) {
                          return current;
                        }

                        const next = [...current];
                        [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                        return next;
                      });
                      setIsDirty(true);
                    }}
                    onRemove={() => {
                      setEventScheduleEvents((current) => {
                        if (current.length === 1) {
                          return current;
                        }

                        return current.filter((item) => item.id !== event.id);
                      });
                      setIsDirty(true);
                    }}
                    removable={eventScheduleEvents.length > 1}
                    total={eventScheduleEvents.length}
                  />
                ))}
              </div>
              <FieldError
                message={getError(state.fieldErrors, 'eventSchedule.events')}
                name="eventSchedule.events"
              />
            </div>
          </EditorSection>

          <EditorSection
            description="Atur teks RSVP yang akan dilihat tamu."
            number="05"
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
            description="Bagikan informasi rekening atau e-wallet untuk hadiah pernikahan. Informasi ini akan tampil pada undangan setelah dipublikasikan."
            number="06"
            title="Amplop Digital"
          >
            <div className="space-y-5">
              <EditorToggle
                checked={content.digitalGift.enabled}
                error={getError(state.fieldErrors, 'digitalGift.enabled')}
                help="Tampilkan informasi transfer ini pada undangan setelah diterbitkan."
                label="Tampilkan Amplop Digital"
                name="digitalGift.enabled"
              />
              <EditorTextField
                error={getError(state.fieldErrors, 'digitalGift.heading')}
                label="Judul Amplop Digital (opsional)"
                name="digitalGift.heading"
                value={content.digitalGift.heading}
              />
              <EditorTextAreaField
                error={getError(state.fieldErrors, 'digitalGift.lead')}
                label="Pesan pengantar (opsional)"
                name="digitalGift.lead"
                value={content.digitalGift.lead}
              />

              <div className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-md)] border p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-seraya-text-primary text-base font-semibold">
                      Rekening atau e-wallet
                    </h3>
                    <p className="text-seraya-text-muted mt-1 max-w-xl text-sm leading-6">
                      Nomor hanya akan ditampilkan setelah undangan dipublikasikan.
                    </p>
                  </div>
                  <Button
                    disabled={digitalGiftAccounts.length >= 3}
                    onClick={() => {
                      setDigitalGiftAccounts((current) => [
                        ...current,
                        {
                          accountHolder: '',
                          accountNumber: '',
                          id: createDigitalGiftAccountId(),
                          providerName: '',
                        },
                      ]);
                      setIsDirty(true);
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Tambah rekening
                  </Button>
                </div>

                {digitalGiftAccounts.length === 0 ? (
                  <p className="text-seraya-text-muted bg-seraya-canvas mt-5 rounded-[var(--seraya-radius-sm)] px-3.5 py-3 text-sm leading-6">
                    Tambahkan setidaknya satu rekening atau e-wallet sebelum menampilkan Amplop
                    Digital.
                  </p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {digitalGiftAccounts.map((account, index) => {
                      const accountPrefix = `digitalGift.accounts.${index}`;

                      return (
                        <fieldset
                          className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border p-4 sm:p-5"
                          key={account.id}
                        >
                          <legend className="text-seraya-text-primary px-1 text-base font-semibold">
                            Rekening {index + 1}
                          </legend>
                          <div className="mt-2 flex justify-end">
                            <Button
                              onClick={() => {
                                setDigitalGiftAccounts((current) =>
                                  current.filter((item) => item.id !== account.id),
                                );
                                setIsDirty(true);
                              }}
                              size="sm"
                              type="button"
                              variant="text"
                            >
                              Hapus rekening
                            </Button>
                          </div>
                          <input name={`${accountPrefix}.id`} type="hidden" value={account.id} />
                          <div className="mt-4 grid gap-4">
                            <EditorTextField
                              error={getError(state.fieldErrors, `${accountPrefix}.providerName`)}
                              label="Penyedia / Bank / E-wallet"
                              name={`${accountPrefix}.providerName`}
                              required
                              value={account.providerName}
                            />
                            <EditorTextField
                              autoComplete="name"
                              error={getError(state.fieldErrors, `${accountPrefix}.accountHolder`)}
                              label="Nama pemilik rekening"
                              name={`${accountPrefix}.accountHolder`}
                              required
                              value={account.accountHolder}
                            />
                            <EditorTextField
                              autoComplete="off"
                              error={getError(state.fieldErrors, `${accountPrefix}.accountNumber`)}
                              help="Nomor hanya akan ditampilkan setelah undangan dipublikasikan."
                              inputMode="numeric"
                              label="Nomor rekening / nomor e-wallet"
                              name={`${accountPrefix}.accountNumber`}
                              required
                              value={account.accountNumber}
                            />
                          </div>
                        </fieldset>
                      );
                    })}
                  </div>
                )}
                <FieldError
                  message={getError(state.fieldErrors, 'digitalGift.accounts')}
                  name="digitalGift.accounts"
                />
              </div>
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
