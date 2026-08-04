import type { InputHTMLAttributes, ReactNode } from 'react';

import { Button, Input } from '@/design-system';
import type { InvitationEditorFieldErrors } from '@/modules/invitations/invitation-editor.schema';
import {
  getDefaultInvitationThemePalette,
  getInvitationThemePalette,
  invitationThemePackages,
  type InvitationTemplateKey,
} from '@/modules/invitation-templates/core/theme-package.registry';
import type { ThemePaletteDescriptor } from '@/modules/invitation-templates/core/theme-package.types';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

type EditorFieldProps = {
  autoComplete?: string;
  error?: string;
  help?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  name: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  value: string | null;
};

export type DigitalGiftAccountEditorValue =
  InvitationDraft['content']['digitalGift']['accounts'][number];
export type EventScheduleEditorValue =
  InvitationDraft['content']['eventSchedule']['events'][number];

function fieldId(name: string) {
  return `invitation-editor-${name.replaceAll('.', '-')}`;
}

export function FieldError({ message, name }: { message?: string; name: string }) {
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

export function EditorTextField({
  autoComplete,
  error,
  help,
  inputMode,
  label,
  name,
  onValueChange,
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
        value={value ?? ''}
        hasError={Boolean(error)}
        id={id}
        autoComplete={autoComplete}
        inputMode={inputMode}
        name={name}
        onChange={(event) => onValueChange(event.currentTarget.value)}
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

function EditorDateField({ error, label, name, onValueChange, value }: EditorFieldProps) {
  const id = fieldId(name);

  return (
    <div className="space-y-2.5">
      <label className="text-seraya-text-primary text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <Input
        aria-describedby={error ? `${id}-error` : undefined}
        value={value ?? ''}
        hasError={Boolean(error)}
        id={id}
        name={name}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        type="date"
      />
      <FieldError message={error} name={name} />
    </div>
  );
}

function EditorTimeField({ error, label, name, onValueChange, value }: EditorFieldProps) {
  const id = fieldId(name);

  return (
    <div className="space-y-2.5">
      <label className="text-seraya-text-primary text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <Input
        aria-describedby={error ? `${id}-error` : undefined}
        value={value ?? ''}
        hasError={Boolean(error)}
        id={id}
        name={name}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        type="time"
      />
      <FieldError message={error} name={name} />
    </div>
  );
}

export function EditorTextAreaField({
  error,
  help,
  label,
  name,
  onValueChange,
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
      </label>
      <textarea
        aria-describedby={describedBy || undefined}
        className={[
          'bg-seraya-surface text-seraya-text-primary placeholder:text-seraya-text-muted min-h-28 w-full rounded-[var(--seraya-radius-md)] border px-3.5 py-3 text-base leading-6 transition-colors outline-none',
          error
            ? 'border-seraya-status-error focus-visible:border-seraya-status-error focus-visible:ring-3 focus-visible:ring-[color:color-mix(in_srgb,var(--seraya-status-error)_20%,transparent)]'
            : 'border-seraya-border-default hover:border-seraya-border-strong focus-visible:border-seraya-action-primary focus-visible:ring-3 focus-visible:ring-[color:color-mix(in_srgb,var(--seraya-focus-ring)_30%,transparent)]',
        ].join(' ')}
        value={value ?? ''}
        id={id}
        name={name}
        onChange={(event) => onValueChange(event.currentTarget.value)}
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

export function EditorToggle({
  checked,
  error,
  help,
  label,
  name,
  onToggle,
}: {
  checked: boolean;
  error?: string;
  help?: string;
  label: string;
  name: string;
  onToggle: (checked: boolean) => void;
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
          checked={checked}
          id={id}
          name={name}
          onChange={(event) => onToggle(event.currentTarget.checked)}
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

export function EditorSection({
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
      className="border-seraya-border-default bg-seraya-canvas max-w-full min-w-0 overflow-hidden rounded-[var(--seraya-radius-lg)] border p-4 shadow-[var(--seraya-shadow-soft)] sm:p-6"
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

export function createDigitalGiftAccountId() {
  return createLocalUuid();
}

export function createEventScheduleItem(): EventScheduleEditorValue {
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

export function EditorScheduleEventCard({
  event,
  index,
  onMoveDown,
  onMoveUp,
  onChange,
  onRemove,
  removable,
  total,
  errors,
}: {
  event: EventScheduleEditorValue;
  index: number;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onChange: (event: EventScheduleEditorValue) => void;
  onRemove: () => void;
  removable: boolean;
  total: number;
  errors: InvitationEditorFieldErrors | undefined;
}) {
  const eventPrefix = `eventSchedule.events.${index}`;
  const isPrimary = index === 0;

  return (
    <fieldset className="border-seraya-border-default bg-seraya-surface max-w-full min-w-0 rounded-[var(--seraya-radius-md)] border p-4 sm:p-5">
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
            onValueChange={(value) => onChange({ ...event, title: value })}
            placeholder="Contoh: Akad Nikah, Resepsi, atau Ngunduh Mantu"
            required
            value={event.title}
          />
        </div>
        <EditorDateField
          error={getError(errors, `${eventPrefix}.date`)}
          label="Tanggal"
          name={`${eventPrefix}.date`}
          onValueChange={(value) => onChange({ ...event, date: value })}
          value={event.date}
        />
        <EditorTimeField
          error={getError(errors, `${eventPrefix}.startTime`)}
          label="Waktu mulai"
          name={`${eventPrefix}.startTime`}
          onValueChange={(value) => onChange({ ...event, startTime: value })}
          value={event.startTime}
        />
        <EditorTimeField
          error={getError(errors, `${eventPrefix}.endTime`)}
          label="Waktu selesai (opsional)"
          name={`${eventPrefix}.endTime`}
          onValueChange={(value) => onChange({ ...event, endTime: value })}
          value={event.endTime}
        />
        <EditorTextField
          error={getError(errors, `${eventPrefix}.venueName`)}
          label="Nama tempat (opsional)"
          name={`${eventPrefix}.venueName`}
          onValueChange={(value) => onChange({ ...event, venueName: value })}
          value={event.venueName}
        />
        <div className="sm:col-span-2">
          <EditorTextAreaField
            error={getError(errors, `${eventPrefix}.venueAddress`)}
            label="Alamat tempat (opsional)"
            name={`${eventPrefix}.venueAddress`}
            onValueChange={(value) => onChange({ ...event, venueAddress: value })}
            value={event.venueAddress}
          />
        </div>
        <div className="sm:col-span-2">
          <EditorTextField
            error={getError(errors, `${eventPrefix}.mapsUrl`)}
            help="Gunakan tautan HTTPS yang valid."
            label="Tautan peta (opsional)"
            name={`${eventPrefix}.mapsUrl`}
            onValueChange={(value) => onChange({ ...event, mapsUrl: value })}
            value={event.mapsUrl}
          />
        </div>
      </div>
    </fieldset>
  );
}

export function getError(errors: InvitationEditorFieldErrors | undefined, name: string) {
  return errors?.[name as keyof InvitationEditorFieldErrors];
}

const invitationTemplateOptions = invitationThemePackages.map((themePackage) => ({
  defaultPaletteKey: themePackage.defaultPaletteKey,
  description: themePackage.manifest.description,
  key: themePackage.manifest.key,
  name: themePackage.manifest.name,
  palettes: themePackage.palettes,
}));

function InvitationTemplateMiniPreview({
  palette,
  templateKey,
}: {
  palette: ThemePaletteDescriptor;
  templateKey: InvitationTemplateKey;
}) {
  if (templateKey === 'aruna') {
    return (
      <div
        aria-hidden="true"
        className="relative h-32 overflow-hidden rounded-[var(--seraya-radius-sm)] border p-3"
        data-editor-template-mini-preview="aruna"
        style={{ backgroundColor: palette.canvas, borderColor: palette.soft }}
      >
        <span
          className="absolute inset-x-3 top-3 h-px"
          style={{ backgroundColor: palette.accent }}
        />
        <span
          className="absolute right-3 bottom-3 h-12 w-10 border-l"
          style={{ borderColor: palette.accent }}
        />
        <span className="mt-5 block h-2 w-12" style={{ backgroundColor: palette.accent }} />
        <span className="mt-3 block h-5 w-4/5" style={{ backgroundColor: palette.ink }} />
        <span className="mt-2 block h-2 w-3/5" style={{ backgroundColor: palette.soft }} />
        <span
          className="absolute bottom-4 left-3 h-6 w-2/5"
          style={{ backgroundColor: palette.paper }}
        />
      </div>
    );
  }

  if (templateKey === 'laras') {
    return (
      <div
        aria-hidden="true"
        className="relative h-32 overflow-hidden rounded-[var(--seraya-radius-sm)] border p-3"
        data-editor-template-mini-preview="laras"
        style={{ backgroundColor: palette.canvas, borderColor: palette.accent }}
      >
        <span
          className="absolute top-3 left-3 size-7 rounded-full border"
          style={{ borderColor: palette.accent }}
        />
        <span
          className="absolute top-6 left-6 h-px w-12"
          style={{ backgroundColor: palette.accent }}
        />
        <span className="mt-9 block h-5 w-4/5" style={{ backgroundColor: palette.ink }} />
        <span className="mt-2 block h-2 w-1/2" style={{ backgroundColor: palette.accent }} />
        <span
          className="absolute right-3 bottom-3 h-12 w-2/5 border"
          style={{ backgroundColor: palette.paper, borderColor: palette.accent }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="relative h-32 overflow-hidden rounded-[var(--seraya-radius-sm)] border p-3"
      data-editor-template-mini-preview="roselle"
      style={{ backgroundColor: palette.canvas, borderColor: palette.soft }}
    >
      <span
        className="absolute -top-4 -left-3 size-16 rounded-full border opacity-60"
        style={{ borderColor: palette.accent }}
      />
      <span
        className="absolute -right-4 bottom-0 size-16 rounded-full border opacity-45"
        style={{ borderColor: palette.swatch }}
      />
      <span className="relative mt-5 block h-2 w-10" style={{ backgroundColor: palette.accent }} />
      <span className="relative mt-3 block h-5 w-4/5" style={{ backgroundColor: palette.ink }} />
      <span className="relative mt-2 block h-2 w-3/5" style={{ backgroundColor: palette.soft }} />
      <span
        className="absolute right-3 bottom-3 h-7 w-2/5 rounded-[0.7rem] border"
        style={{ backgroundColor: palette.paper, borderColor: palette.soft }}
      />
    </div>
  );
}

export function InvitationTemplatePicker({
  error,
  onPaletteSelect,
  onSelect,
  paletteError,
  selectedPaletteKey,
  selectedTemplateKey,
}: {
  error?: string;
  onPaletteSelect: (paletteKey: string) => void;
  onSelect: (templateKey: InvitationTemplateKey) => void;
  paletteError?: string;
  selectedPaletteKey: string;
  selectedTemplateKey: InvitationTemplateKey;
}) {
  const describedBy = error ? `${fieldId('templateKey')}-error` : undefined;
  const selectedTemplate =
    invitationTemplateOptions.find((template) => template.key === selectedTemplateKey) ??
    invitationTemplateOptions[0]!;

  return (
    <fieldset
      aria-describedby={describedBy}
      className="border-seraya-border-default bg-seraya-canvas max-w-full min-w-0 rounded-[var(--seraya-radius-lg)] border p-4 shadow-[var(--seraya-shadow-soft)] sm:p-6"
    >
      <legend className="sr-only">Pilih desain dan palet undangan</legend>
      <div className="max-w-2xl">
        <h2 className="text-seraya-text-primary text-xl font-semibold tracking-[-0.025em]">
          Pilih desain undangan
        </h2>
        <p className="text-seraya-text-muted mt-1.5 text-sm leading-6">
          Pilih komposisi utama, lalu tentukan palet warna yang paling dekat dengan suasana kalian.
        </p>
      </div>

      <div className="mt-5 grid max-w-full min-w-0 gap-4 lg:grid-cols-3">
        {invitationTemplateOptions.map((template) => {
          const selected = selectedTemplateKey === template.key;
          const inputId = fieldId(`templateKey-${template.key}`);
          const palette =
            getInvitationThemePalette(
              template.key,
              selected ? selectedPaletteKey : template.defaultPaletteKey,
            ) ?? getDefaultInvitationThemePalette(template.key);

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
              <InvitationTemplateMiniPreview palette={palette} templateKey={template.key} />
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

      <fieldset className="border-seraya-border-default mt-6 border-t pt-6">
        <legend className="text-seraya-text-primary text-base font-semibold">
          Palet {selectedTemplate.name}
        </legend>
        <p className="text-seraya-text-muted mt-1 text-sm leading-6">
          Perubahan palet langsung terlihat pada pratinjau lokal dan baru menjadi versi tamu setelah
          disimpan serta diterbitkan.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {selectedTemplate.palettes.map((palette) => {
            const selected = selectedPaletteKey === palette.key;
            const inputId = fieldId(`paletteKey-${selectedTemplate.key}-${palette.key}`);

            return (
              <label
                className={[
                  'border-seraya-border-default bg-seraya-surface focus-within:outline-seraya-focus-ring flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--seraya-radius-md)] border px-3 py-2.5 focus-within:outline-3 focus-within:outline-offset-2',
                  selected
                    ? 'border-seraya-action-primary ring-seraya-action-primary/15 ring-2'
                    : '',
                ].join(' ')}
                htmlFor={inputId}
                key={palette.key}
              >
                <input
                  checked={selected}
                  className="sr-only"
                  id={inputId}
                  name="paletteKey"
                  onChange={() => onPaletteSelect(palette.key)}
                  type="radio"
                  value={palette.key}
                />
                <span
                  aria-hidden="true"
                  className="size-8 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--seraya-border-default)]"
                  style={{ backgroundColor: palette.swatch }}
                />
                <span className="text-seraya-text-primary text-sm font-semibold">
                  {palette.name}
                </span>
              </label>
            );
          })}
        </div>
        <FieldError message={paletteError} name="paletteKey" />
      </fieldset>
    </fieldset>
  );
}
