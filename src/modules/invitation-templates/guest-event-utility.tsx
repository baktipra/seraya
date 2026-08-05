'use client';

import { useEffect, useMemo, useState } from 'react';

import type { InvitationTemplateKey } from './invitation-template.keys';
import type { InvitationScheduleItemViewModel, InvitationViewModel } from './invitation-view-model';
import {
  createGuestEventCalendarFile,
  getGoogleCalendarHref,
  getGuestEventCountdownState,
  getGuestEventMapEmbedHref,
  getGuestEventRouteHref,
  getYoutubeEmbedHref,
  type GuestEventUtilityEvent,
} from './guest-event-utility-core';

const shellClassByTemplate: Record<InvitationTemplateKey, string> = {
  aruna: 'border-black/15 bg-[#f7f5ee] text-[#252a27] shadow-[0_24px_70px_rgb(37_42_39_/_0.12)]',
  laras:
    'border-[#d7b982]/35 bg-[#201f26] text-[#f4ead8] shadow-[0_24px_70px_rgb(18_15_22_/_0.35)]',
  roselle:
    'border-[#b98a91]/30 bg-[#fffaf6] text-[#5b3440] shadow-[0_24px_70px_rgb(91_52_64_/_0.14)]',
};

const accentClassByTemplate: Record<InvitationTemplateKey, string> = {
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
    livestreamEnabled: item.livestreamEnabled,
    livestreamHeading: item.livestreamHeading ?? null,
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

function CountdownPanel({
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
    <section
      aria-live="polite"
      className="rounded-[1.5rem] border border-current/15 px-5 py-6 text-center sm:px-8"
      data-event-countdown={state.phase}
    >
      <p className="text-[0.68rem] font-bold tracking-[0.18em] uppercase opacity-65">
        {state.label}
      </p>
      {state.phase === 'complete' ? (
        <p className="mt-4 font-serif text-2xl leading-tight sm:text-3xl">
          Terima kasih telah menjadi bagian dari hari bahagia kami.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-4">
          {[
            ['Hari', state.remaining.days],
            ['Jam', state.remaining.hours],
            ['Menit', state.remaining.minutes],
            ['Detik', state.remaining.seconds],
          ].map(([label, value]) => (
            <div className="min-w-0" key={label}>
              <span
                className={`mx-auto flex aspect-square max-w-20 items-center justify-center rounded-full text-xl font-bold tabular-nums sm:text-2xl ${accentClassByTemplate[templateKey]}`}
              >
                {String(value).padStart(2, '0')}
              </span>
              <span className="mt-2 block text-[0.62rem] font-bold tracking-[0.12em] uppercase opacity-60">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EventUtilityCard({
  event,
  index,
  templateKey,
  timeZone,
}: {
  event: GuestEventUtilityEvent;
  index: number;
  templateKey: InvitationTemplateKey;
  timeZone: string;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const [livestreamOpen, setLivestreamOpen] = useState(false);
  const routeHref = getGuestEventRouteHref(event);
  const mapEmbedHref = getGuestEventMapEmbedHref(
    event,
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  );
  const youtubeEmbedHref = event.livestreamEnabled
    ? getYoutubeEmbedHref(event.livestreamUrl)
    : null;

  return (
    <article
      className="rounded-[1.35rem] border border-current/15 p-4 sm:p-6"
      data-event-utility-item
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.65rem] font-bold tracking-[0.16em] uppercase opacity-55">
            Acara {index + 1}
          </p>
          <h3 className="mt-2 font-serif text-2xl leading-tight sm:text-3xl">{event.title}</h3>
          <p className="mt-2 text-sm leading-6 opacity-75">
            {event.date} · {event.startTime}
            {event.endTime ? `–${event.endTime}` : ''} · {timeZone}
          </p>
          {event.venueName || event.address ? (
            <div className="mt-4 text-sm leading-6">
              {event.venueName ? <p className="font-semibold">{event.venueName}</p> : null}
              {event.address ? (
                <p className="whitespace-pre-line opacity-72">{event.address}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:max-w-[18rem] sm:justify-end">
          <button
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${accentClassByTemplate[templateKey]}`}
            onClick={() => downloadCalendar([event], timeZone)}
            type="button"
          >
            Simpan tanggal
          </button>
          <a
            className="inline-flex min-h-11 items-center rounded-full border border-current/25 px-4 text-sm font-semibold"
            href={getGoogleCalendarHref(event, timeZone)}
            rel="noreferrer"
            target="_blank"
          >
            Google Calendar
          </a>
        </div>
      </div>

      {event.arrivalNote ? (
        <div className="mt-5 rounded-2xl border border-current/12 bg-current/[0.045] px-4 py-3.5">
          <p className="text-[0.62rem] font-bold tracking-[0.15em] uppercase opacity-55">
            Petunjuk kedatangan
          </p>
          <p className="mt-2 text-sm leading-6 whitespace-pre-line opacity-78">
            {event.arrivalNote}
          </p>
        </div>
      ) : null}

      {routeHref || mapEmbedHref ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {routeHref ? (
            <a
              className="inline-flex min-h-11 items-center rounded-full border border-current/25 px-4 text-sm font-semibold"
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
              className="min-h-11 rounded-full border border-current/25 px-4 text-sm font-semibold"
              onClick={() => setMapOpen((open) => !open)}
              type="button"
            >
              {mapOpen ? 'Tutup peta' : 'Lihat peta'}
            </button>
          ) : null}
        </div>
      ) : null}

      {mapOpen && mapEmbedHref ? (
        <div className="mt-4 aspect-[16/10] overflow-hidden rounded-2xl border border-current/15 bg-current/[0.04]">
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

      {event.livestreamEnabled && event.livestreamUrl ? (
        <section className="mt-5 rounded-2xl border border-current/15 p-4" data-event-livestream>
          <p className="text-[0.62rem] font-bold tracking-[0.15em] uppercase opacity-55">
            Hadir dari jarak jauh
          </p>
          <h4 className="mt-2 font-serif text-xl leading-tight">
            {event.livestreamHeading ?? `Siaran langsung ${event.title}`}
          </h4>
          <div className="mt-4 flex flex-wrap gap-2">
            {youtubeEmbedHref ? (
              <button
                aria-expanded={livestreamOpen}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold ${accentClassByTemplate[templateKey]}`}
                onClick={() => setLivestreamOpen((open) => !open)}
                type="button"
              >
                {livestreamOpen ? 'Tutup siaran' : 'Tonton siaran'}
              </button>
            ) : null}
            <a
              className="inline-flex min-h-11 items-center rounded-full border border-current/25 px-4 text-sm font-semibold"
              href={event.livestreamUrl}
              rel="noreferrer"
              target="_blank"
            >
              Buka di YouTube
            </a>
          </div>
          {livestreamOpen && youtubeEmbedHref ? (
            <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-black">
              <iframe
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full border-0"
                loading="lazy"
                src={youtubeEmbedHref}
                title={event.livestreamHeading ?? `Siaran langsung ${event.title}`}
              />
            </div>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}

export function GuestEventUtility({
  invitation,
  templateKey,
}: {
  invitation: InvitationViewModel;
  templateKey: InvitationTemplateKey;
}) {
  const events = useMemo(
    () =>
      (invitation.events?.items ?? [])
        .map(toUtilityEvent)
        .filter((event): event is GuestEventUtilityEvent => event !== null),
    [invitation.events?.items],
  );

  if (events.length === 0) {
    return null;
  }

  const timeZone = invitation.timezone ?? 'Asia/Jakarta';

  return (
    <section
      aria-labelledby="guest-event-utility-title"
      className={`mx-auto my-0 w-full max-w-[72rem] border-x border-t px-4 py-10 sm:rounded-[2rem] sm:border sm:px-7 sm:py-12 ${shellClassByTemplate[templateKey]}`}
      data-guest-event-utility="v4h"
      data-template-key={templateKey}
    >
      <div className="mx-auto max-w-4xl">
        <p className="text-center text-[0.68rem] font-bold tracking-[0.2em] uppercase opacity-55">
          Jadwal & akses acara
        </p>
        <h2
          className="mt-3 text-center font-serif text-3xl leading-tight sm:text-5xl"
          id="guest-event-utility-title"
        >
          Jadwal yang mudah disimpan dan ditemukan
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-7 opacity-72 sm:text-base">
          Simpan acara ke kalender, buka rute, baca petunjuk kedatangan, atau ikuti siaran langsung.
        </p>

        <div className="mt-8">
          <CountdownPanel events={events} templateKey={templateKey} timeZone={timeZone} />
        </div>

        <div className="mt-6 grid gap-4">
          {events.map((event, index) => (
            <EventUtilityCard
              event={event}
              index={index}
              key={event.id}
              templateKey={templateKey}
              timeZone={timeZone}
            />
          ))}
        </div>

        {events.length > 1 ? (
          <div className="mt-6 text-center">
            <button
              className={`min-h-12 rounded-full px-6 text-sm font-semibold ${accentClassByTemplate[templateKey]}`}
              onClick={() => downloadCalendar(events, timeZone)}
              type="button"
            >
              Tambahkan seluruh rangkaian
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
