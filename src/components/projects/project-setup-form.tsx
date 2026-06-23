'use client';

import { useActionState, useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/design-system';
import { createProjectAction } from '@/modules/projects/create-project.actions';
import { initialCreateProjectActionState } from '@/modules/projects/create-project.action-state';
import { suggestProjectSlug } from '@/modules/projects/create-project.schema';
import { normalizeSlug } from '@/lib/slug';

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

export function ProjectSetupForm() {
  const [state, formAction, isPending] = useActionState(
    createProjectAction,
    initialCreateProjectActionState,
  );
  const [personOneName, setPersonOneName] = useState('');
  const [personTwoName, setPersonTwoName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const errors = state.fieldErrors ?? {};

  function updateSuggestedSlug(nextPersonOneName: string, nextPersonTwoName: string) {
    if (!slugEdited) {
      setSlug(suggestProjectSlug(nextPersonOneName, nextPersonTwoName));
    }
  }

  return (
    <Card aria-labelledby="project-setup-form-title" className="w-full max-w-3xl overflow-hidden">
      <div className="bg-seraya-brand-soft px-5 py-7 sm:px-8 sm:py-9">
        <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
          Undangan pertama kalian
        </p>
        <h1
          className="seraya-display-md mt-4 max-w-2xl text-[clamp(2.25rem,5vw,3.5rem)]"
          id="project-setup-form-title"
        >
          Mari mulai dari kabar bahagianya.
        </h1>
        <p className="text-seraya-text-secondary mt-4 max-w-xl text-base leading-7">
          Isi detail singkat ini untuk membuat undangan pertama kalian.
        </p>
      </div>

      <CardHeader className="pt-6 sm:pt-7">
        <CardTitle className="font-sans text-lg font-semibold tracking-[-0.02em]">
          Detail awal kalian
        </CardTitle>
        <CardDescription>
          Kamu bisa melengkapi detail acara dan memilih gaya undangan di tahap berikutnya.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-5 sm:pt-6">
        <form action={formAction} className="space-y-6" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-seraya-text-primary text-sm font-semibold"
                htmlFor="person-one-name"
              >
                Nama panggilan pasangan pertama
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
                Nama panggilan pasangan kedua
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
                required
                type="date"
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
                placeholder="Contoh: Jakarta"
                required
              />
              <ErrorMessage id="event-city-error" message={errors.eventCity} />
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="text-seraya-text-primary text-sm font-semibold"
              htmlFor="project-slug"
            >
              Link undangan
            </label>
            <div className="border-seraya-border-default bg-seraya-surface focus-within:border-seraya-action-primary focus-within:ring-seraya-focus-ring/30 flex min-h-11 items-center overflow-hidden rounded-[var(--seraya-radius-md)] border transition-colors focus-within:ring-3">
              <span className="text-seraya-text-secondary shrink-0 border-r px-3.5 text-sm font-medium">
                seraya.id/
              </span>
              <Input
                aria-describedby={errors.slug ? 'project-slug-error' : 'project-slug-hint'}
                className="min-h-10 rounded-none border-0 px-3 shadow-none focus-visible:ring-0"
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
            <p className="text-seraya-text-muted text-sm leading-6" id="project-slug-hint">
              Gunakan huruf kecil, angka, dan tanda hubung. Link ini bisa kamu ubah sekarang.
            </p>
            <ErrorMessage id="project-slug-error" message={errors.slug} />
          </div>

          {state.message ? (
            <p
              aria-live="polite"
              className="text-seraya-status-error text-sm leading-6"
              role="alert"
            >
              {state.message}
            </p>
          ) : null}

          <div className="border-seraya-border-default flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-seraya-text-muted text-sm leading-6">
              Project dibuat sebagai draft dan hanya bisa diakses dari akun kamu.
            </p>
            <Button loading={isPending} size="lg" type="submit">
              Buat undangan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
