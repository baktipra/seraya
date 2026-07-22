'use client';

import { useActionState, useMemo, useState } from 'react';

import { Button, Input } from '@/design-system';
import { normalizeSlug } from '@/lib/slug';
import { initialCreateProjectActionState } from '@/modules/projects/create-project.action-state';
import { createProjectAction } from '@/modules/projects/create-project.actions';
import { suggestProjectSlug } from '@/modules/projects/create-project.schema';

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

export function ProjectSetupForm() {
  const [state, formAction, isPending] = useActionState(
    createProjectAction,
    initialCreateProjectActionState,
  );
  const [personOneName, setPersonOneName] = useState('');
  const [personTwoName, setPersonTwoName] = useState('');
  const [eventDatePrimary, setEventDatePrimary] = useState('');
  const [eventCity, setEventCity] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const errors = state.fieldErrors ?? {};

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

  function updateSuggestedSlug(nextPersonOneName: string, nextPersonTwoName: string) {
    if (!slugEdited) {
      setSlug(suggestProjectSlug(nextPersonOneName, nextPersonTwoName));
    }
  }

  return (
    <section
      aria-labelledby="project-setup-form-title"
      className="mx-auto w-full max-w-6xl overflow-hidden border border-[var(--seraya-border-default)] bg-[var(--seraya-surface)] shadow-[0_24px_70px_rgb(64_42_34_/_0.07)] lg:grid lg:min-h-[43rem] lg:grid-cols-[0.88fr_1.12fr]"
    >
      <div className="relative isolate flex min-h-[22rem] flex-col overflow-hidden bg-[var(--seraya-brand-soft)] px-6 py-8 sm:px-9 sm:py-10 lg:min-h-0 lg:px-12 lg:py-12">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-20 -z-10 size-72 rounded-full border border-[color-mix(in_srgb,var(--seraya-action-primary)_18%,transparent)]"
        />
        <div
          aria-hidden="true"
          className="absolute top-20 -right-12 -z-10 h-56 w-32 rotate-[24deg] rounded-[100%_0_100%_0] border border-[color-mix(in_srgb,var(--seraya-action-primary)_14%,transparent)]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-28 -left-24 -z-10 size-80 rounded-full bg-[color-mix(in_srgb,var(--seraya-surface)_50%,transparent)]"
        />

        <div className="max-w-lg">
          <p className="seraya-eyebrow text-seraya-action-primary">Undangan pertama kalian</p>
          <h1
            className="text-seraya-text-primary mt-4 font-serif text-[clamp(2.75rem,5vw,4.5rem)] leading-[0.96] font-medium tracking-[-0.035em]"
            id="project-setup-form-title"
          >
            Mari mulai dari kabar bahagianya.
          </h1>
          <p className="text-seraya-text-secondary mt-5 max-w-md text-base leading-7">
            Cukup isi detail awalnya. Desain, cerita, acara, dan seluruh isi undangan bisa kalian
            lanjutkan setelah draf dibuat.
          </p>
        </div>

        <div
          aria-label="Pratinjau identitas undangan"
          aria-live="polite"
          className="mt-8 flex flex-1 items-end lg:mt-10"
        >
          <div className="relative mx-auto w-full max-w-[22rem] overflow-hidden border border-[color-mix(in_srgb,var(--seraya-action-primary)_22%,var(--seraya-border-default))] bg-[color-mix(in_srgb,var(--seraya-surface)_94%,transparent)] px-7 py-8 text-center shadow-[0_18px_45px_rgb(75_48_39_/_0.08)] sm:px-9 sm:py-10">
            <div
              aria-hidden="true"
              className="absolute top-5 left-5 size-16 rounded-full border border-[color-mix(in_srgb,var(--seraya-action-primary)_22%,transparent)]"
            />
            <div
              aria-hidden="true"
              className="absolute right-5 bottom-4 h-20 w-12 rotate-[30deg] rounded-[100%_0_100%_0] border border-[color-mix(in_srgb,var(--seraya-action-primary)_18%,transparent)]"
            />
            <p className="text-seraya-action-primary text-[0.65rem] font-semibold tracking-[0.22em] uppercase">
              The wedding of
            </p>
            <p className="text-seraya-text-primary mt-6 font-serif text-[clamp(2.25rem,5vw,3.35rem)] leading-[0.92] font-medium tracking-[-0.035em]">
              {preview.personOne}
              <span className="text-seraya-action-primary mx-2 inline-block italic">&amp;</span>
              {preview.personTwo}
            </p>
            <div className="mx-auto mt-7 flex max-w-[15rem] items-center gap-3">
              <span className="h-px flex-1 bg-[var(--seraya-border-strong)]" />
              <span className="size-1.5 rounded-full border border-[var(--seraya-action-primary)]" />
              <span className="h-px flex-1 bg-[var(--seraya-border-strong)]" />
            </div>
            <p className="text-seraya-text-secondary mt-5 text-xs font-semibold tracking-[0.14em] uppercase">
              {preview.date}
            </p>
            <p className="text-seraya-text-muted mt-2 text-xs">{preview.city}</p>
            <p className="text-seraya-text-muted mt-6 border-t border-[var(--seraya-border-default)] pt-4 text-[0.7rem]">
              seraya-delta.vercel.app/{preview.slug}
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col px-6 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
        <div>
          <p className="seraya-eyebrow">Langkah awal</p>
          <h2 className="text-seraya-text-primary mt-3 font-serif text-[clamp(2rem,3.5vw,3rem)] leading-none font-medium tracking-[-0.025em]">
            Detail awal kalian
          </h2>
          <p className="text-seraya-text-secondary mt-3 max-w-xl text-sm leading-6">
            Lima detail ini cukup untuk membuat draf pribadi. Semuanya masih bisa diubah nanti.
          </p>
        </div>

        <form action={formAction} className="mt-8 flex flex-1 flex-col" noValidate>
          <div className="space-y-5">
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
                  aria-describedby={errors.eventDatePrimary ? 'event-date-primary-error' : undefined}
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

            <div className="space-y-2">
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
                <span className="border-seraya-border-default bg-seraya-soft text-seraya-text-muted flex shrink-0 items-center rounded-l-[var(--seraya-radius-sm)] border border-r-0 px-3 text-sm">
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
                Gunakan huruf kecil, angka, dan tanda hubung. Link ini bisa diubah sebelum undangan
                diterbitkan.
              </p>
              <ErrorMessage id="project-slug-error" message={errors.slug} />
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

          <div className="border-seraya-border-default mt-auto flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-sm">
              <p className="text-seraya-text-primary text-sm font-semibold">Draf pribadi kalian</p>
              <p className="text-seraya-text-muted mt-1 text-xs leading-5">
                Belum terlihat oleh tamu dan hanya bisa diakses dari akun ini.
              </p>
            </div>
            <Button className="w-full sm:w-auto" loading={isPending} size="lg" type="submit">
              Buat undangan <span aria-hidden="true">→</span>
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
