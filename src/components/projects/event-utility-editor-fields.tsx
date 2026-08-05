'use client';

import { useEffect, useRef, useState } from 'react';

import type { InvitationEditorFieldErrors } from '@/modules/invitations/invitation-editor.schema';
import type { EventScheduleItemV1 } from '@/modules/invitations/invitation-draft.schema';

import { FieldError } from './invitation-editor-fields';

type LatLngValue = {
  lat(): number;
  lng(): number;
};

type GooglePlaceResult = {
  formatted_address?: string;
  geometry?: { location?: LatLngValue };
  name?: string;
  place_id?: string;
  url?: string;
};

type GoogleAutocomplete = {
  addListener(eventName: 'place_changed', listener: () => void): { remove(): void };
  getPlace(): GooglePlaceResult;
};

type GoogleMap = {
  addListener(eventName: 'idle', listener: () => void): { remove(): void };
  getCenter(): LatLngValue | null;
};

type GoogleMapsRuntime = {
  Map: new (
    element: HTMLElement,
    options: {
      center: { lat: number; lng: number };
      mapTypeControl: boolean;
      streetViewControl: boolean;
      zoom: number;
    },
  ) => GoogleMap;
  places: {
    Autocomplete: new (
      input: HTMLInputElement,
      options: { fields: string[]; types: string[] },
    ) => GoogleAutocomplete;
  };
};

type GoogleRuntime = { maps: GoogleMapsRuntime };
type GoogleGlobal = typeof globalThis & {
  google?: GoogleRuntime;
  __serayaGoogleMapsPromise?: Promise<GoogleRuntime>;
};

const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const defaultMapCenter = { lat: -6.2, lng: 106.816666 };

function fieldId(name: string) {
  return `invitation-editor-${name.replaceAll('.', '-')}`;
}

function errorFor(errors: InvitationEditorFieldErrors | undefined, name: string) {
  return errors?.[name as keyof InvitationEditorFieldErrors];
}

function loadGoogleMaps() {
  const runtime = globalThis as GoogleGlobal;

  if (runtime.google?.maps?.places) {
    return Promise.resolve(runtime.google);
  }

  if (runtime.__serayaGoogleMapsPromise) {
    return runtime.__serayaGoogleMapsPromise;
  }

  if (!googleMapsKey) {
    return Promise.reject(new Error('Google Maps API key is unavailable.'));
  }

  runtime.__serayaGoogleMapsPromise = new Promise<GoogleRuntime>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-seraya-google-maps]');
    const script = existing ?? document.createElement('script');
    const finish = () => {
      if (runtime.google?.maps?.places) resolve(runtime.google);
      else reject(new Error('Google Maps could not be initialized.'));
    };

    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('Google Maps could not be loaded.')), {
      once: true,
    });

    if (!existing) {
      script.async = true;
      script.dataset.serayaGoogleMaps = 'true';
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsKey)}&libraries=places&v=weekly`;
      document.head.append(script);
    }
  });

  return runtime.__serayaGoogleMapsPromise;
}

function createStructuredMapsUrl(latitude: number, longitude: number, placeId?: string | null) {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', `${latitude},${longitude}`);
  if (placeId) url.searchParams.set('query_place_id', placeId);
  return url.toString();
}

function getNumberInput(value: number | null | undefined) {
  return typeof value === 'number' ? String(value) : '';
}

function parseCoordinate(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function EventUtilityEditorFields({
  errors,
  event,
  eventPrefix,
  onChange,
}: {
  errors: InvitationEditorFieldErrors | undefined;
  event: EventScheduleItemV1;
  eventPrefix: string;
  onChange: (event: EventScheduleItemV1) => void;
}) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const [mapsState, setMapsState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [mapOpen, setMapOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState({
    lat: event.latitude ?? defaultMapCenter.lat,
    lng: event.longitude ?? defaultMapCenter.lng,
  });
  const prefix = `${eventPrefix}`;

  useEffect(() => {
    const input = searchInputRef.current;
    if (!input || !googleMapsKey) return undefined;

    let autocomplete: GoogleAutocomplete | null = null;
    let listener: { remove(): void } | null = null;
    let cancelled = false;

    setMapsState('loading');
    void loadGoogleMaps()
      .then((google) => {
        if (cancelled) return;
        autocomplete = new google.maps.places.Autocomplete(input, {
          fields: ['formatted_address', 'geometry', 'name', 'place_id', 'url'],
          types: ['establishment', 'geocode'],
        });
        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete?.getPlace();
          const location = place?.geometry?.location;
          if (!place || !location) return;
          const latitude = location.lat();
          const longitude = location.lng();
          setPinDraft({ lat: latitude, lng: longitude });
          onChange({
            ...event,
            latitude,
            locationSource: 'google_place',
            longitude,
            mapsUrl: place.url ?? createStructuredMapsUrl(latitude, longitude, place.place_id),
            placeId: place.place_id ?? null,
            venueAddress: place.formatted_address ?? event.venueAddress,
            venueName: place.name ?? event.venueName,
          });
        });
        setMapsState('ready');
      })
      .catch(() => setMapsState('unavailable'));

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [event, onChange]);

  useEffect(() => {
    if (!mapOpen || !mapElementRef.current || !googleMapsKey) return undefined;

    let listener: { remove(): void } | null = null;
    let cancelled = false;
    void loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapElementRef.current) return;
        const map = new google.maps.Map(mapElementRef.current, {
          center: pinDraft,
          mapTypeControl: false,
          streetViewControl: false,
          zoom: event.latitude == null ? 11 : 17,
        });
        mapRef.current = map;
        listener = map.addListener('idle', () => {
          const center = map.getCenter();
          if (center) setPinDraft({ lat: center.lat(), lng: center.lng() });
        });
      })
      .catch(() => setMapsState('unavailable'));

    return () => {
      cancelled = true;
      listener?.remove();
      mapRef.current = null;
    };
  }, [event.latitude, mapOpen, pinDraft]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapsState('unavailable');
      return;
    }

    setMapsState('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setPinDraft({ lat: latitude, lng: longitude });
        onChange({
          ...event,
          latitude,
          locationSource: 'current_location',
          longitude,
          mapsUrl: createStructuredMapsUrl(latitude, longitude),
          placeId: null,
        });
        setMapsState('ready');
      },
      () => setMapsState('unavailable'),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 12_000 },
    );
  };

  const saveManualPin = () => {
    onChange({
      ...event,
      latitude: pinDraft.lat,
      locationSource: 'manual_pin',
      longitude: pinDraft.lng,
      mapsUrl: createStructuredMapsUrl(pinDraft.lat, pinDraft.lng),
      placeId: null,
    });
    setMapOpen(false);
  };

  return (
    <section
      className="border-seraya-border-default bg-seraya-brand-soft/25 mt-2 rounded-[var(--seraya-radius-md)] border p-4 sm:col-span-2 sm:p-5"
      data-event-utility-editor="v4h"
    >
      <div>
        <p className="text-seraya-text-primary text-sm font-semibold">Utilitas tamu</p>
        <p className="text-seraya-text-muted mt-1 text-sm leading-6">
          Atur countdown, lokasi terstruktur, petunjuk datang, dan siaran YouTube untuk acara ini.
        </p>
      </div>

      <div className="mt-5 space-y-5">
        <label className="border-seraya-border-default bg-seraya-surface flex items-start gap-3 rounded-[var(--seraya-radius-md)] border px-4 py-3.5">
          <input
            checked={event.countdownEnabled !== false}
            className="accent-seraya-action-primary mt-1 size-4"
            onChange={(change) =>
              onChange({ ...event, countdownEnabled: change.currentTarget.checked })
            }
            type="checkbox"
          />
          <span>
            <span className="text-seraya-text-primary block text-sm font-semibold">
              Tampilkan countdown
            </span>
            <span className="text-seraya-text-muted mt-1 block text-sm leading-6">
              Countdown otomatis mengikuti acara aktif atau acara berikutnya.
            </span>
          </span>
        </label>

        <div className="space-y-2.5">
          <label
            className="text-seraya-text-primary text-sm font-semibold"
            htmlFor={`${fieldId(prefix)}-place-search`}
          >
            Cari venue atau alamat
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="bg-seraya-surface text-seraya-text-primary border-seraya-border-default focus-visible:border-seraya-action-primary min-h-11 w-full rounded-[var(--seraya-radius-md)] border px-3.5 outline-none focus-visible:ring-3 focus-visible:ring-[color:color-mix(in_srgb,var(--seraya-focus-ring)_30%,transparent)]"
              id={`${fieldId(prefix)}-place-search`}
              placeholder="Contoh: Jakarta Convention Center"
              ref={searchInputRef}
              type="search"
            />
            <button
              className="border-seraya-border-default text-seraya-text-primary min-h-11 shrink-0 rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold"
              onClick={useCurrentLocation}
              type="button"
            >
              Lokasi saat ini
            </button>
            <button
              className="border-seraya-border-default text-seraya-text-primary min-h-11 shrink-0 rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold"
              onClick={() => setMapOpen((open) => !open)}
              type="button"
            >
              {mapOpen ? 'Tutup pin' : 'Tandai manual'}
            </button>
          </div>
          <p className="text-seraya-text-muted text-xs leading-5">
            {googleMapsKey
              ? mapsState === 'loading'
                ? 'Menyiapkan Google Maps…'
                : mapsState === 'unavailable'
                  ? 'Maps tidak tersedia. Koordinat dan tautan peta tetap dapat diisi manual.'
                  : 'Pilih hasil pencarian untuk mengisi nama, alamat, Place ID, koordinat, dan tautan peta.'
              : 'Tambahkan NEXT_PUBLIC_GOOGLE_MAPS_API_KEY untuk pencarian tempat dan pin visual.'}
          </p>
        </div>

        {mapOpen ? (
          <div className="space-y-3">
            {googleMapsKey ? (
              <div className="border-seraya-border-default relative h-64 overflow-hidden rounded-[var(--seraya-radius-md)] border">
                <div className="h-full w-full" ref={mapElementRef} />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-4xl drop-shadow"
                >
                  ●
                </span>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-seraya-text-primary space-y-2 text-sm font-semibold">
                Latitude
                <input
                  className="bg-seraya-surface border-seraya-border-default min-h-11 w-full rounded-[var(--seraya-radius-md)] border px-3.5 font-normal"
                  inputMode="decimal"
                  onChange={(change) =>
                    setPinDraft((current) => ({
                      ...current,
                      lat: parseCoordinate(change.currentTarget.value) ?? current.lat,
                    }))
                  }
                  value={getNumberInput(pinDraft.lat)}
                />
              </label>
              <label className="text-seraya-text-primary space-y-2 text-sm font-semibold">
                Longitude
                <input
                  className="bg-seraya-surface border-seraya-border-default min-h-11 w-full rounded-[var(--seraya-radius-md)] border px-3.5 font-normal"
                  inputMode="decimal"
                  onChange={(change) =>
                    setPinDraft((current) => ({
                      ...current,
                      lng: parseCoordinate(change.currentTarget.value) ?? current.lng,
                    }))
                  }
                  value={getNumberInput(pinDraft.lng)}
                />
              </label>
            </div>
            <button
              className="bg-seraya-action-primary text-seraya-text-inverse min-h-11 rounded-[var(--seraya-radius-md)] px-4 text-sm font-semibold"
              onClick={saveManualPin}
              type="button"
            >
              Gunakan titik ini
            </button>
          </div>
        ) : null}

        {event.latitude != null && event.longitude != null ? (
          <div className="border-seraya-border-default bg-seraya-surface text-seraya-text-secondary rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6">
            Titik tersimpan: {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
            {event.locationSource ? ` · ${event.locationSource.replaceAll('_', ' ')}` : ''}
          </div>
        ) : null}

        <div className="space-y-2.5">
          <label
            className="text-seraya-text-primary text-sm font-semibold"
            htmlFor={`${fieldId(prefix)}-arrival-note`}
          >
            Petunjuk kedatangan (opsional)
          </label>
          <textarea
            className="bg-seraya-surface text-seraya-text-primary border-seraya-border-default min-h-28 w-full rounded-[var(--seraya-radius-md)] border px-3.5 py-3 leading-6"
            id={`${fieldId(prefix)}-arrival-note`}
            onChange={(change) => onChange({ ...event, arrivalNote: change.currentTarget.value })}
            placeholder="Contoh: Masuk melalui gerbang selatan, parkir di basement B1."
            value={event.arrivalNote ?? ''}
          />
          <FieldError
            message={errorFor(errors, `${prefix}.arrivalNote`)}
            name={`${prefix}.arrivalNote`}
          />
        </div>

        <label className="border-seraya-border-default bg-seraya-surface flex items-start gap-3 rounded-[var(--seraya-radius-md)] border px-4 py-3.5">
          <input
            checked={event.livestreamEnabled === true}
            className="accent-seraya-action-primary mt-1 size-4"
            onChange={(change) =>
              onChange({ ...event, livestreamEnabled: change.currentTarget.checked })
            }
            type="checkbox"
          />
          <span>
            <span className="text-seraya-text-primary block text-sm font-semibold">
              Sediakan livestream YouTube
            </span>
            <span className="text-seraya-text-muted mt-1 block text-sm leading-6">
              Player dimuat hanya setelah tamu menekan tombol tonton.
            </span>
          </span>
        </label>

        {event.livestreamEnabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-seraya-text-primary space-y-2 text-sm font-semibold sm:col-span-2">
              Link YouTube
              <input
                className="bg-seraya-surface border-seraya-border-default min-h-11 w-full rounded-[var(--seraya-radius-md)] border px-3.5 font-normal"
                onChange={(change) =>
                  onChange({ ...event, livestreamUrl: change.currentTarget.value })
                }
                placeholder="https://www.youtube.com/live/..."
                type="url"
                value={event.livestreamUrl ?? ''}
              />
              <FieldError
                message={errorFor(errors, `${prefix}.livestreamUrl`)}
                name={`${prefix}.livestreamUrl`}
              />
            </label>
            <label className="text-seraya-text-primary space-y-2 text-sm font-semibold sm:col-span-2">
              Judul siaran (opsional)
              <input
                className="bg-seraya-surface border-seraya-border-default min-h-11 w-full rounded-[var(--seraya-radius-md)] border px-3.5 font-normal"
                onChange={(change) =>
                  onChange({ ...event, livestreamHeading: change.currentTarget.value })
                }
                placeholder={`Siaran langsung ${event.title || 'acara'}`}
                value={event.livestreamHeading ?? ''}
              />
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}
