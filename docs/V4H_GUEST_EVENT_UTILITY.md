# SERAYA — V4H Guest Event Utility V1

V4H adds public-safe event utilities to the existing invitation draft and published snapshot JSON contract. It does not add a database migration and does not expose guest identity, personal-link tokens, RSVP state, or delivery data to calendar, Maps, or YouTube.

## Owner capabilities

Each event can configure:

- an event-aware countdown;
- venue search through Google Places;
- the browser's current location;
- a manually positioned map point;
- structured latitude, longitude, Place ID, and location source;
- an arrival note;
- a YouTube livestream URL and optional heading.

The existing manual venue, address, and HTTPS Maps URL fields remain supported as fallbacks.

## Guest capabilities

Every validated event can expose:

- a live countdown to the next event or the current event state;
- a downloadable `.ics` calendar entry;
- a Google Calendar handoff;
- one combined `.ics` file for the complete event sequence;
- a Google Maps route link;
- an on-demand, lazy-loaded map preview;
- arrival instructions;
- an on-demand, privacy-enhanced YouTube embed and a direct YouTube fallback.

Calendar payloads contain event information only. They never include a guest name, guest token, personal invitation path, RSVP response, or delivery metadata.

## Google Maps configuration

Set the following public environment variable in local development and the deployment environment:

```text
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<restricted-browser-key>
```

Enable these Google Maps Platform APIs for the project:

1. Maps JavaScript API
2. Places API
3. Maps Embed API

Restrict the browser key by the Seraya production and preview hostnames, and restrict its API access to the services above. Do not reuse a Supabase service-role key or another server secret.

Without this variable:

- the invitation editor still supports manual venue, address, Maps URL, and coordinate input;
- current-location coordinates can still be captured;
- route links still work from stored Maps URLs or coordinates;
- visual place autocomplete, draggable-map selection, and embedded map preview remain unavailable.

## YouTube behavior

V4H accepts supported HTTPS YouTube video, live, Shorts, and embed URLs. The guest player uses `youtube-nocookie.com`, loads only after interaction, never autoplays, and always preserves a direct **Buka di YouTube** fallback.

No YouTube account connection, stream key, Data API status lookup, or audio extraction is included.

## Compatibility

The new event properties are optional at the draft parsing boundary. Older drafts and published snapshots continue to normalize through the existing legacy schedule boundary. When the owner saves an event again, the editor persists explicit V4H defaults and structured fields.

The invitation draft schema version remains unchanged because the persisted document is forward-compatible JSON and no storage-table contract changes.
