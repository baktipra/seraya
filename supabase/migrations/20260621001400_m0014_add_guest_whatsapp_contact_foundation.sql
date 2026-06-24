-- SRY-022 / M0014
-- Private owner-managed guest contact foundation. This field is intentionally
-- absent from snapshots, public routes, personal invitation capability output,
-- CSV, payment, and media contracts.

begin;

alter table public.guests
add column whatsapp_phone_e164 text;

alter table public.guests
add constraint guests_whatsapp_phone_e164_e164
check (
  whatsapp_phone_e164 is null
  or whatsapp_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
);

commit;
