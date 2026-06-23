-- SRY-003 / M0001
-- Foundation-only: required extension and locked domain enum contracts.

begin;

create extension if not exists pgcrypto with schema extensions;

create type public.project_status as enum (
  'draft',
  'awaiting_payment',
  'paid',
  'published',
  'expired',
  'archived'
);

create type public.payment_status as enum (
  'created',
  'pending',
  'paid',
  'failed',
  'expired',
  'cancelled',
  'refunded'
);

create type public.guest_link_status as enum (
  'active',
  'revoked',
  'expired'
);

create type public.rsvp_status as enum (
  'pending',
  'attending',
  'declined'
);

create type public.media_status as enum (
  'uploaded',
  'processing',
  'ready',
  'failed',
  'deleted'
);

create type public.guestbook_status as enum (
  'pending_moderation',
  'visible',
  'hidden',
  'deleted'
);

create type public.publish_version_status as enum (
  'draft',
  'published',
  'superseded',
  'archived'
);

commit;
