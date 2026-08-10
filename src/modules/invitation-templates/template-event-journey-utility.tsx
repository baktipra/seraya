'use client';

import { useEffect, useMemo, useState } from 'react';

import type { InvitationTemplateKey } from './invitation-template.keys';
import type { InvitationScheduleItemViewModel } from './invitation-view-model';
import styles from './template-event-journey-utility.module.css';
import {
  createGuestEventCalendarFile,
  getGoogleCalendarHref,
  getGuestEventCountdownState,
  getGuestEventMapEmbedHref,
  getGuestEventRouteHref,
  getRemoteAttendancePresentation,
  getYoutubeEmbedHref,
  type GuestEventUtilityEvent,
} from './guest-event-utility-core';

const primaryActionClassByTemplate: Record<InvitationTemplateKey, string> = {
  aruna: 'bg-[#252a27] text-[#f7f5ee]',
  laras: 'bg-[#d7b982] text-[#201f26]',
  roselle: 'bg-[#7a4856] text-white',
};

function toUtilityEvent(item: InvitationScheduleItemViewModel): GuestEventUtilityEvent | null {
  if (!item.id || !item.date || !item.startTime || !item.title) {
    return null;
  }

  return {
    address: item.address,
    arrivalNote: item.arrivalNote ?? null,
    countdownEnabled: item.countdownEnabled,
    date: item.date,
    endTime: item.endTime ?? null,
    id: item.id,
    latitude: item.latitude ?? null,
    livestreamDescription: item.livestreamDescription ?? null,
    livestreamEnabled: item.livestreamEnabled,
    livestreamHeading: item.livestreamHeading ?? null,
    livestreamPostEventMode: item.livestreamPostEventMode ?? 'recording',
    livestreamPreEventMessage: item.livestreamPreEventMessage ?? null,
    livestreamUrl: item.livestreamUrl ?? null,
    locationSource: item.locationSource ?? null,
    longitude: item.longitude ?? null,
    mapsHref: item.mapsHref,
    placeId: item.placeId ?? null,
    startTime: item.startTime,
    title: item.title,
    venueName: item.venueName,
  };
}

function createFileName(events: readonly GuestEventUtilityEvent[]) {
  const base = events.length === 1 ? events[0]?.title : 'rangkaian-acara-pernikahan';
  const normalized = (base ?? 'acara-pernikahan')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${normalized || 'acara-pernikahan'}.ics`;
}

function downloadCalendar(events: readonly GuestEventUtilityEvent[], timeZone: string) {
  const file = createGuestEventCalendarFile(events, timeZone);
  const blob = new Blob([file], { type: 'text/calendar;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = createFileName(events);
  anchor.click();
  URL.revokeObjectURL(href);
}

function EventCountdown({
  events,
  templateKey,
  timeZone,
}: {
  events: readonly GuestEventUtilityEvent[];
  templateKey: InvitationTemplateKey;
  timeZone: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const initialTimer = window.setTimeout(updateNow, 0);
    const intervalTimer = window.setInterval(updateNow, 1_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  }, []);

  const state = now === null ? null : getGuestEventCountdownState(events, now, timeZone);

  if (!state) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="py-6 text-center sm:py-8"
      data-template-event-countdown={state.phase}
    >
      <p className="text-[0.65rem] font-bold tracking-[0.18em] uppercase opacity-60">{state.label}</p>
      {state.phase === 'complete' ? (
        <p className="mx-auto mt-4 max-w-xl font-serif text-2xl leading-tight sm:text-3xl">
          Terima kasih telah menjadi bagian dari hari bahagia kami.
        </p>
      ) : (
        <div className="mx-auto mt-5 grid max-w-xl grid-cols-4 gap-2 sm:gap-5">
          {[
            ['Hari', state.remaining.days],
            ['Jam', state.remaining.hours],
            ['Menit', state.remaining.minutes],
            ['Detik', state.remaining.seconds],
          ].map(([label, value]) => (
            <div className="min-w-0" key={label}>
              <span className="block font-serif text-2xl tabular-nums sm:text-4xl">
                {String(value).padStart(2, '0')}
              </span>
              <span className="mt-1.5 block text-[0.6rem] font-bold tracking-[0.12em] uppercase opacity-55">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
      <span className="sr-only">Tema {templateKey}</span>
    </div>
  );
}

function RemoteAttendance({
  event,
  templateKey,
  timeZone,
}: {
  event: GuestEventUtilityEvent;
  templateKey: InvitationTemplateKey;
  timeZone: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [livestreamOpen, setLivestreamOpen] = useState(false);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const initialTimer = window.setTimeout(updateNow, 0);
    const intervalTimer = window.setInterval(updateNow, 30_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  }, []);

  if (now === null) {
    return null;
  }

  const presentation = getRemoteAttendancePresentation(event, now, timeZone);
  if (presentation.phase === 'hidden') {
    return null;
  }

  const youtubeEmbedHref = getYoutubeEmbedHref(event.livestreamUrl);
  const canEmbed = presentation.phase !== 'before' && Boolean(youtubeEmbedHref);

  return (
    <div className="mt-4 border-t border-current/15 pt-4" data-template-event-livestream>
      <p className="text-[0.6rem] font-bold tracking-[0.14em] uppercase opacity-55">
        {presentation.phase === 'before'
          ? 'Hadir dari jarak jauh'
          : presentation.phase === 'live'
            ? 'Siaran tersedia sekarang'
            : 'Rekaman acara'}
      </p>
      <p className="mt-2 font-serif text-lg leading-tight">{presentation.heading}</p>
      {presentation.description ? (
        <p className="mt-2 text-sm leading-6 opacity-72">{presentation.description}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {presentation.phase === 'before' ? (
          <a
            className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-semibold ${primaryActionClassByTemplate[templateKey]}`}
            href={getGoogleCalendarHref(event, timeZone)}
            rel="noreferrer"
            target="_blank"
          >
            Ingatkan saya
          </a>
        ) : null}
        {canEmbed ? (
          <button
            aria-expanded={livestreamOpen}
            className={`min-h-10 rounded-full px-3.5 text-sm font-semibold ${primaryActionClassByTemplate[templateKey]}`}
            onClick={() => setLivestreamOpen((open) => !open)}
            type="button"
          >
            {livestreamOpen ? 'Tutup video' : presentation.actionLabel}
          </button>
        ) : null}
        <a
          className="inline-flex min-h-10 items-center rounded-full border border-current/25 px-3.5 text-sm font-semibold"
          href={presentation.watchHref}
          rel="noreferrer"
          target="_blank"
        >
          Buka di YouTube
        </a>
      </div>
      {livestreamOpen && youtubeEmbedHref ? (
        <div className="mt-4 aspect-video overflow-hidden rounded-xl bg-black">
          <iframe
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
            loading="lazy"
            src={youtubeEmbedHref}
            title={presentation.heading}
          />
        </div>
      ) : null}
    </div>
  );
}

function EventActions({
  event,
  templateKey,
  timeZone,
}: {
  event: GuestEventUtilityEvent;
  templateKey: InvitationTemplateKey;
  timeZone: string;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const routeHref = getGuestEventRouteHref(event);
  const mapEmbedHref = getGuestEventMapEmbedHref(
    event,
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  );

  return (
    <section className="border-t border-current/15 py-5 first:border-t-0" data-template-event-utility-item>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-serif text-lg leading-tight sm:text-xl">{event.title}</p>
        <div className="flex flex-wrap gap-2">
          <button
            className={`min-h-10 rounded-full px-3.5 text-sm font-semibold ${primaryActionClassByTemplate[templateKey]}`}
            onClick={() => downloadCalendar([event], timeZone)}
            type="button"
          >
            Simpan tanggal
          </button>
          <a
            className="inline-flex min-h-10 items-center rounded-full border border-current/25 px-3.5 text-sm font-semibold"
            href={getGoogleCalendarHref(event, timeZone)}
            rel="noreferrer"
            target="_blank"
          >
            Google Calendar
          </a>
          {routeHref ? (
            <a
              className="inline-flex min-h-10 items-center rounded-full border border-current/25 px-3.5 text-sm font-semibold"
              href={routeHref}
              rel="noreferrer"
              target="_blank"
            >
              Buka rute
            </a>
          ) : null}
          {mapEmbedHref ? (
            <button
              aria-expanded={mapOpen}
              className="min-h-10 rounded-full border border-current/25 px-3.5 text-sm font-semibold"
              onClick={() => setMapOpen((open) => !open)}
              type="button"
            >
              {mapOpen ? 'Tutup peta' : 'Lihat peta'}
            </button>
          ) : null}
        </div>
      </div>

      {event.arrivalNote ? (
        <div className="mt-4 border-l-2 border-current/20 pl-4">
          <p className="text-[0.6rem] font-bold tracking-[0.14em] uppercase opacity-55">
            Petunjuk kedatangan
          </p>
          <p className="mt-2 text-sm leading-6 whitespace-pre-line opacity-75">{event.arrivalNote}</p>
        </div>
      ) : null}

      {mapOpen && mapEmbedHref ? (
        <div className="mt-4 aspect-[16/10] overflow-hidden rounded-xl border border-current/15 bg-current/[0.04]">
          <iframe
            allowFullScreen
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={mapEmbedHref}
            title={`Peta ${event.venueName ?? event.title}`}
          />
        </div>
      ) : null}

      <RemoteAttendance event={event} templateKey={templateKey} timeZone={timeZone} />
    </section>
  );
}

export function TemplateEventJourneyUtility({
  events,
  templateKey,
  timeZone = 'Asia/Jakarta',
}: {
  events: readonly InvitationScheduleItemViewModel[];
  templateKey: InvitationTemplateKey;
  timeZone?: string;
}) {
  const utilityEvents = useMemo(
    () => events.map(toUtilityEvent).filter((event): event is GuestEventUtilityEvent => event !== null),
    [events],
  );

  if (utilityEvents.length === 0) {
    return null;
  }

  return (
    <div
      className={`${styles.utility} mx-auto w-full max-w-4xl px-4 pb-8 sm:px-6 sm:pb-12`}
      data-template-event-utility={templateKey}
      data-template-native-utility="v1"
    >
      <EventCountdown events={utilityEvents} templateKey={templateKey} timeZone={timeZone} />
      <div data-template-event-action-list>
        {utilityEvents.map((event) => (
          <EventActions
            event={event}
            key={event.id}
            templateKey={templateKey}
            timeZone={timeZone}
          />
        ))}
      </div>
      {utilityEvents.length > 1 ? (
        <div className="border-t border-current/15 pt-5 text-center">
          <button
            className={`min-h-10 rounded-full px-4 text-sm font-semibold ${primaryActionClassByTemplate[templateKey]}`}
            onClick={() => downloadCalendar(utilityEvents, timeZone)}
            type="button"
          >
            Simpan seluruh rangkaian
          </button>
        </div>
      ) : null}
    </div>
  );
}
