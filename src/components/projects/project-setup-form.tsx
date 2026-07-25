'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import { Button, Input } from '@/design-system';
import { siteConfig } from '@/config/site';
import { normalizeSlug } from '@/lib/slug';
import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';
import {
  initialCreateProjectActionState,
  type CreateProjectActionState,
} from '@/modules/projects/create-project.action-state';
import { createProjectAction } from '@/modules/projects/create-project.actions';
import { suggestProjectSlug } from '@/modules/projects/create-project.schema';

const collectionOptions: Array<{
  accent: string;
  canvas: string;
  description: string;
  frame: string;
  key: InvitationTemplateKey;
  name: string;
  personality: string;
  text: string;
}> = [
  {
    accent: 'text-[#8e4b52]',
    canvas: 'bg-[#f3e1e1]',
    description: 'Lembut, hangat, dan intim seperti surat personal.',
    frame: 'border-[#d8b7b5] bg-[#fffaf7]',
    key: 'roselle',
    name: 'Roselle',
    personality: 'Romantic warmth',
    text: 'text-[#392c2b]',
  },
  {
    accent: 'text-[#59615d]',
    canvas: 'bg-[#e7e5dc]',
    description: 'Grid editorial, tipografi tegas, dan ruang putih modern.',
    frame: 'border-[#b8b4aa] bg-[#f8f7f2]',
    key: 'aruna',
    name: 'Aruna',
    personality: 'Modern editorial',
    text: 'text-[#252724]',
  },
  {
    accent: 'text-[#d7b982]',
    canvas: 'bg-[#222129]',
    description: 'Formal, elegan, dan tenang untuk perayaan berkelas.',
    frame: 'border-[#716759] bg-[#2c2a32]',
    key: 'laras',
    name: 'Laras',
    personality: 'Formal evening',
    text: 'text-[#fff9ed]',
  },
];

type SetupStep = 1 | 2 | 3;

function ErrorMessage({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-seraya-status-error text-sm leading-6" id={id} role="alert">
      {message}
    </p>
  );
}

function formatPreviewDate(value: string) {
  if (!value) {
    return 'Tanggal kalian';
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return 'Tanggal kalian';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .toUpperCase();
}

function getSiteHost() {
  try {
    return new URL(siteConfig.url).host;
  } catch {
    return 'seraya.id';
  }
}

function InvitationSetupPreview({
  city,
  date,
  personOne,
  personTwo,
  slug,
  templateKey,
}: {
  city: string;
  date: string;
  personOne: string;
  personTwo: string;
  slug: string;
  templateKey: InvitationTemplateKey;
}) {
  const collection =
    collectionOptions.find((item) => item.key === templateKey) ?? collectionOptions[0]!;

  return (
    <div
      aria-live="polite"
      className="relative mx-auto w-full max-w-[23rem]"
      data-template={templateKey}
    >
      <div
        aria-hidden="true"
        className="border-seraya-action-primary/18 absolute top-[9%] -left-[8%] h-[74%] w-[72%] -rotate-6 rounded-[2rem] border"
      />
      <div
        aria-hidden="true"
        className="bg-seraya-ink/7 absolute right-[-5%] bottom-[4%] h-[78%] w-[70%] rotate-6 rounded-[2rem]"
      />
      <div
        className={`${collection.canvas} relative rounded-[2rem] p-4 shadow-[0_30px_80px_rgb(53_37_32_/_0.16)] sm:p-5`}
      >
        <div
          className={`${collection.frame} ${collection.text} relative flex aspect-[9/16] flex-col overflow-hidden rounded-[1.45rem] border px-7 py-8 text-center shadow-[0_16px_45px_rgb(36_29_27_/_0.13)]`}
        >
          <div
            aria-hidden="true"
            className="absolute -top-12 -right-12 size-36 rounded-full border border-current opacity-10"
          />
          <p
            className={`${collection.accent} text-[0.58rem] font-semibold tracking-[0.24em] uppercase`}
          >
            The wedding of
          </p>

          <div className="my-auto">
            {templateKey === 'aruna' ? (
              <div className="text-left">
                <p className="text-[0.62rem] font-semibold tracking-[0.18em] uppercase opacity-55">
                  {date}
                </p>
                <p className="mt-5 font-serif text-[3.2rem] leading-[0.78] tracking-[-0.06em]">
                  {personOne}
                </p>
                <p className={`${collection.accent} my-3 text-xl italic`}>&amp;</p>
                <p className="ml-8 font-serif text-[3.2rem] leading-[0.78] tracking-[-0.06em]">
                  {personTwo}
                </p>
              </div>
            ) : (
              <>
                <p className="font-serif text-[3.15rem] leading-[0.8] font-medium tracking-[-0.055em]">
                  {personOne}
                </p>
                <p className={`${collection.accent} my-3 font-serif text-2xl italic`}>&amp;</p>
                <p className="font-serif text-[3.15rem] leading-[0.8] font-medium tracking-[-0.055em]">
                  {personTwo}
                </p>
              </>
            )}
          </div>

          <div className="border-t border-current/18 pt-5">
            {templateKey !== 'aruna' ? (
              <p className="text-[0.6rem] font-semibold tracking-[0.16em] uppercase opacity-72">
                {date}
              </p>
            ) : null}
            <p className="mt-2 text-[0.67rem] opacity-66">{city}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 text-xs">
        <div>
          <p className="text-seraya-text-primary font-semibold">{collection.name}</p>
          <p className="text-seraya-text-muted mt-1">{collection.personality}</p>
        </div>
        <p className="text-seraya-text-muted max-w-[11rem] truncate text-right">
          {getSiteHost()}/{slug}
        </p>
      </div>
    </div>
  );
}

function StepNavigation({ currentStep }: { currentStep: SetupStep }) {
  const steps = [
    { label: 'Tentang kalian', step: 1 },
    { label: 'Pilih pengalaman', step: 2 },
    { label: 'Buat draf', step: 3 },
  ] as const;

  return (
    <ol aria-label="Tahapan membuat undangan" className="grid grid-cols-3 gap-2">
      {steps.map((item) => {
        const active = item.step === currentStep;
        const complete = item.step < currentStep;

        return (
          <li className="min-w-0" key={item.step}>
            <div
              aria-current={active ? 'step' : undefined}
              className={`border-t-2 pt-3 transition-colors ${
                active || complete
                  ? 'border-seraya-action-primary text-seraya-text-primary'
                  : 'border-seraya-border-default text-seraya-text-muted'
              }`}
            >
              <span className="block text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
                0{item.step}
              </span>
              <span className="mt-1 hidden truncate text-xs font-semibold sm:block">
                {item.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

async function previewCreateProjectAction(
  _previousState: CreateProjectActionState,
  _formData: FormData,
): Promise<CreateProjectActionState> {
  return {
    message: 'Showroom tidak membuat project atau menyimpan data.',
    status: 'error',
  };
}

export function ProjectSetupForm({ previewMode = false }: { previewMode?: boolean } = {}) {
  const [state, formAction, isPending] = useActionState(
    previewMode ? previewCreateProjectAction : createProjectAction,
    initialCreateProjectActionState,
  );
  const [step, setStep] = useState<SetupStep>(1);
  const [personOneName, setPersonOneName] = useState('');
  const [personTwoName, setPersonTwoName] = useState('');
  const [eventDatePrimary, setEventDatePrimary] = useState('');
  const [eventCity, setEventCity] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [templateKey, setTemplateKey] = useState<InvitationTemplateKey>('roselle');
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    formRef.current?.setAttribute('data-interactive', 'true');
  }, []);

  useEffect(() => {
    if (state.status !== 'error') return undefined;

    let recoveryStep: SetupStep | null = null;

    if (
      errors.personOneName ||
      errors.personTwoName ||
      errors.eventDatePrimary ||
      errors.eventCity
    ) {
      recoveryStep = 1;
    } else if (errors.templateKey) {
      recoveryStep = 2;
    } else if (errors.slug) {
      recoveryStep = 3;
    }

    if (!recoveryStep) return undefined;

    const recoveryFrame = window.requestAnimationFrame(() => {
      setStep(recoveryStep);
    });

    return () => window.cancelAnimationFrame(recoveryFrame);
  }, [
    errors.eventCity,
    errors.eventDatePrimary,
    errors.personOneName,
    errors.personTwoName,
    errors.slug,
    errors.templateKey,
    state.status,
  ]);

  const preview = useMemo(
    () => ({
      city: eventCity.trim() || 'Kota kalian',
      date: formatPreviewDate(eventDatePrimary),
      personOne: personOneName.trim() || 'Nama pertama',
      personTwo: personTwoName.trim() || 'Nama kedua',
      slug: slug || 'nama-kalian',
    }),
    [eventCity, eventDatePrimary, personOneName, personTwoName, slug],
  );

  const basicDetailsReady = Boolean(
    personOneName.trim() && personTwoName.trim() && eventDatePrimary && eventCity.trim(),
  );
  const finalDetailsReady = Boolean(slug);

  function updateSuggestedSlug(nextPersonOneName: string, nextPersonTwoName: string) {
    if (!slugEdited) {
      setSlug(suggestProjectSlug(nextPersonOneName, nextPersonTwoName));
    }
  }

  return (
    <section
      aria-labelledby="project-setup-form-title"
      className="mx-auto grid w-full max-w-[88rem] overflow-hidden border border-[var(--seraya-border-default)] bg-[var(--seraya-surface)] shadow-[0_30px_90px_rgb(64_42_34_/_0.08)] lg:min-h-[48rem] lg:grid-cols-[minmax(22rem,0.88fr)_minmax(0,1.12fr)]"
    >
      <div className="bg-seraya-brand-soft relative isolate flex min-h-[30rem] flex-col overflow-hidden px-6 py-8 sm:px-9 sm:py-10 lg:min-h-0 lg:px-12 lg:py-12">
        <div
          aria-hidden="true"
          className="border-seraya-action-primary/18 absolute -top-28 -right-24 -z-10 size-80 rounded-full border"
        />
        <div
          aria-hidden="true"
          className="bg-seraya-surface/45 absolute -bottom-36 -left-28 -z-10 size-96 rounded-full"
        />

        <div className="max-w-lg">
          <p className="seraya-eyebrow text-seraya-action-primary">Undangan pertama kalian</p>
          <h1
            className="text-seraya-text-primary mt-4 font-serif text-[clamp(2.8rem,5vw,4.8rem)] leading-[0.9] font-medium tracking-[-0.045em]"
            id="project-setup-form-title"
          >
            Mulai dari kabar bahagianya.
          </h1>
          <p className="text-seraya-text-secondary mt-5 max-w-md text-base leading-7">
            Isi detail awal, pilih pengalaman yang paling dekat, lalu Seraya menyiapkan draf pribadi
            kalian.
          </p>
        </div>

        <div className="mt-9 flex flex-1 items-center lg:mt-10">
          <InvitationSetupPreview
            city={preview.city}
            date={preview.date}
            personOne={preview.personOne}
            personTwo={preview.personTwo}
            slug={preview.slug}
            templateKey={templateKey}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-col px-6 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
        <StepNavigation currentStep={step} />

        <form
          ref={formRef}
          action={formAction}
          className="mt-9 flex flex-1 flex-col"
          data-guided-project-setup="true"
          noValidate
        >
          <section aria-labelledby="setup-step-one-title" hidden={step !== 1}>
            <p className="seraya-eyebrow text-seraya-action-primary">Langkah 1 dari 3</p>
            <h2
              className="text-seraya-text-primary mt-3 font-serif text-[clamp(2.35rem,4vw,3.6rem)] leading-[0.92] font-medium tracking-[-0.04em]"
              id="setup-step-one-title"
            >
              Tentang kalian dan hari utamanya.
            </h2>
            <p className="text-seraya-text-secondary mt-4 max-w-xl text-sm leading-6">
              Detail ini membentuk identitas awal undangan. Semuanya masih dapat diperbarui nanti.
            </p>

            <div className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-seraya-text-primary text-sm font-semibold"
                    htmlFor="person-one-name"
                  >
                    Nama panggilan pertama
                  </label>
                  <Input
                    aria-describedby={errors.personOneName ? 'person-one-name-error' : undefined}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    hasError={Boolean(errors.personOneName)}
                    id="person-one-name"
                    maxLength={80}
                    name="personOneName"
                    onChange={(event) => {
                      const value = event.target.value;
                      setPersonOneName(value);
                      updateSuggestedSlug(value, personTwoName);
                    }}
                    placeholder="Contoh: Raka"
                    required
                    value={personOneName}
                  />
                  <ErrorMessage id="person-one-name-error" message={errors.personOneName} />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-seraya-text-primary text-sm font-semibold"
                    htmlFor="person-two-name"
                  >
                    Nama panggilan kedua
                  </label>
                  <Input
                    aria-describedby={errors.personTwoName ? 'person-two-name-error' : undefined}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    hasError={Boolean(errors.personTwoName)}
                    id="person-two-name"
                    maxLength={80}
                    name="personTwoName"
                    onChange={(event) => {
                      const value = event.target.value;
                      setPersonTwoName(value);
                      updateSuggestedSlug(personOneName, value);
                    }}
                    placeholder="Contoh: Nadia"
                    required
                    value={personTwoName}
                  />
                  <ErrorMessage id="person-two-name-error" message={errors.personTwoName} />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-seraya-text-primary text-sm font-semibold"
                    htmlFor="event-date-primary"
                  >
                    Tanggal acara utama
                  </label>
                  <Input
                    aria-describedby={
                      errors.eventDatePrimary ? 'event-date-primary-error' : undefined
                    }
                    hasError={Boolean(errors.eventDatePrimary)}
                    id="event-date-primary"
                    name="eventDatePrimary"
                    onChange={(event) => setEventDatePrimary(event.target.value)}
                    required
                    type="date"
                    value={eventDatePrimary}
                  />
                  <ErrorMessage id="event-date-primary-error" message={errors.eventDatePrimary} />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-seraya-text-primary text-sm font-semibold"
                    htmlFor="event-city"
                  >
                    Kota acara
                  </label>
                  <Input
                    aria-describedby={errors.eventCity ? 'event-city-error' : undefined}
                    autoCapitalize="words"
                    autoComplete="address-level2"
                    hasError={Boolean(errors.eventCity)}
                    id="event-city"
                    maxLength={120}
                    name="eventCity"
                    onChange={(event) => setEventCity(event.target.value)}
                    placeholder="Contoh: Jakarta"
                    required
                    value={eventCity}
                  />
                  <ErrorMessage id="event-city-error" message={errors.eventCity} />
                </div>
              </div>
            </div>

            <div className="border-seraya-border-default mt-10 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-seraya-text-muted max-w-md text-xs leading-5">
                Isi empat detail ini untuk melanjutkan ke pilihan pengalaman undangan.
              </p>
              <Button
                className="w-full sm:w-auto"
                disabled={!basicDetailsReady}
                onClick={() => setStep(2)}
                size="lg"
                type="button"
              >
                Pilih pengalaman <span aria-hidden="true">→</span>
              </Button>
            </div>
          </section>

          <section aria-labelledby="setup-step-two-title" hidden={step !== 2}>
            <p className="seraya-eyebrow text-seraya-action-primary">Langkah 2 dari 3</p>
            <h2
              className="text-seraya-text-primary mt-3 font-serif text-[clamp(2.35rem,4vw,3.6rem)] leading-[0.92] font-medium tracking-[-0.04em]"
              id="setup-step-two-title"
            >
              Pilih rasa yang paling dekat.
            </h2>
            <p className="text-seraya-text-secondary mt-4 max-w-xl text-sm leading-6">
              Ini menentukan arah tipografi, ritme, komposisi, dan motion awal. Koleksi masih dapat
              diganti dari editor.
            </p>

            <fieldset className="mt-8">
              <legend className="sr-only">Pilih koleksi undangan</legend>
              <div className="grid gap-3">
                {collectionOptions.map((collection) => {
                  const selected = templateKey === collection.key;

                  return (
                    <label
                      className={`focus-within:outline-seraya-focus-ring grid cursor-pointer grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 border p-4 transition-[border-color,background-color,transform] focus-within:outline-3 focus-within:outline-offset-2 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:p-5 ${
                        selected
                          ? 'border-seraya-action-primary bg-seraya-brand-soft/55 -translate-y-px'
                          : 'border-seraya-border-default bg-seraya-surface hover:border-seraya-border-strong'
                      }`}
                      key={collection.key}
                    >
                      <input
                        checked={selected}
                        className="sr-only"
                        name="templateKey"
                        onChange={() => setTemplateKey(collection.key)}
                        type="radio"
                        value={collection.key}
                      />
                      <span
                        className={`${collection.canvas} flex aspect-[4/5] items-center justify-center rounded-[0.85rem] p-2`}
                      >
                        <span
                          className={`${collection.frame} ${collection.text} flex size-full items-center justify-center rounded-[0.55rem] border font-serif text-xl`}
                        >
                          {collection.name.slice(0, 1)}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="text-seraya-text-primary block font-serif text-2xl leading-none font-medium">
                          {collection.name}
                        </span>
                        <span className="text-seraya-action-primary mt-1 block text-[0.68rem] font-semibold tracking-[0.12em] uppercase">
                          {collection.personality}
                        </span>
                        <span className="text-seraya-text-secondary mt-2 block text-xs leading-5 sm:text-sm">
                          {collection.description}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`grid size-6 place-items-center rounded-full border ${
                          selected
                            ? 'border-seraya-action-primary bg-seraya-action-primary text-white'
                            : 'border-seraya-border-strong text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    </label>
                  );
                })}
              </div>
              <ErrorMessage id="template-key-error" message={errors.templateKey} />
            </fieldset>

            <div className="border-seraya-border-default mt-9 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button onClick={() => setStep(1)} size="lg" type="button" variant="secondary">
                ← Kembali
              </Button>
              <Button onClick={() => setStep(3)} size="lg" type="button">
                Lanjutkan <span aria-hidden="true">→</span>
              </Button>
            </div>
          </section>

          <section aria-labelledby="setup-step-three-title" hidden={step !== 3}>
            <p className="seraya-eyebrow text-seraya-action-primary">Langkah 3 dari 3</p>
            <h2
              className="text-seraya-text-primary mt-3 font-serif text-[clamp(2.35rem,4vw,3.6rem)] leading-[0.92] font-medium tracking-[-0.04em]"
              id="setup-step-three-title"
            >
              Siapkan alamat undangannya.
            </h2>
            <p className="text-seraya-text-secondary mt-4 max-w-xl text-sm leading-6">
              Seraya akan membuat draf pribadi dengan identitas dan koleksi yang sudah kalian pilih.
            </p>

            <div className="mt-8 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  className="text-seraya-text-primary text-sm font-semibold"
                  htmlFor="project-slug"
                >
                  Link undangan
                </label>
                <span className="text-seraya-text-muted text-xs">Terbentuk otomatis dari nama</span>
              </div>
              <div className="flex min-w-0 items-stretch rounded-[var(--seraya-radius-sm)] focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[var(--seraya-focus-ring)]">
                <span className="border-seraya-border-default bg-seraya-soft text-seraya-text-muted hidden shrink-0 items-center rounded-l-[var(--seraya-radius-sm)] border border-r-0 px-3 text-sm sm:flex">
                  {getSiteHost()}/
                </span>
                <span className="border-seraya-border-default bg-seraya-soft text-seraya-text-muted flex shrink-0 items-center rounded-l-[var(--seraya-radius-sm)] border border-r-0 px-3 text-sm sm:hidden">
                  /
                </span>
                <Input
                  aria-describedby={errors.slug ? 'project-slug-error' : 'project-slug-hint'}
                  className="rounded-l-none focus-visible:outline-none"
                  hasError={Boolean(errors.slug)}
                  id="project-slug"
                  maxLength={60}
                  name="slug"
                  onChange={(event) => {
                    setSlugEdited(true);
                    setSlug(normalizeSlug(event.target.value));
                  }}
                  placeholder="raka-nadia"
                  required
                  value={slug}
                />
              </div>
              <p className="text-seraya-text-muted text-xs leading-5" id="project-slug-hint">
                Gunakan huruf kecil, angka, dan tanda hubung. Link masih dapat diubah sebelum
                diterbitkan.
              </p>
              <ErrorMessage id="project-slug-error" message={errors.slug} />
            </div>

            <div className="bg-seraya-soft mt-8 grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
              <div>
                <p className="text-seraya-text-muted text-[0.65rem] font-semibold tracking-[0.13em] uppercase">
                  Pasangan
                </p>
                <p className="text-seraya-text-primary mt-2 font-serif text-xl">
                  {preview.personOne} &amp; {preview.personTwo}
                </p>
              </div>
              <div>
                <p className="text-seraya-text-muted text-[0.65rem] font-semibold tracking-[0.13em] uppercase">
                  Hari utama
                </p>
                <p className="text-seraya-text-primary mt-2 text-sm font-semibold">
                  {preview.date}
                </p>
              </div>
              <div>
                <p className="text-seraya-text-muted text-[0.65rem] font-semibold tracking-[0.13em] uppercase">
                  Koleksi
                </p>
                <p className="text-seraya-text-primary mt-2 text-sm font-semibold">
                  {collectionOptions.find((item) => item.key === templateKey)?.name}
                </p>
              </div>
            </div>

            {state.message ? (
              <p
                aria-live="polite"
                className="text-seraya-status-error mt-5 text-sm leading-6"
                role="alert"
              >
                {state.message}
              </p>
            ) : null}

            <div className="border-seraya-border-default mt-9 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button onClick={() => setStep(2)} size="lg" type="button" variant="secondary">
                ← Kembali
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={!finalDetailsReady}
                loading={isPending}
                size="lg"
                type="submit"
              >
                Buat draf pribadi <span aria-hidden="true">→</span>
              </Button>
            </div>
          </section>
        </form>
      </div>
    </section>
  );
}
