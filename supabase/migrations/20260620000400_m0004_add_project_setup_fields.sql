-- SRY-005 / M0004
-- Minimal setup facts required to create a wedding project. No invitation draft or event-detail model is introduced here.

begin;

alter table public.wedding_projects
  add column person_one_name text not null,
  add column person_two_name text not null,
  add column event_city text not null,
  add constraint wedding_projects_person_one_name_valid check (
    person_one_name = btrim(person_one_name)
    and char_length(person_one_name) between 1 and 80
  ),
  add constraint wedding_projects_person_two_name_valid check (
    person_two_name = btrim(person_two_name)
    and char_length(person_two_name) between 1 and 80
  ),
  add constraint wedding_projects_event_city_valid check (
    event_city = btrim(event_city)
    and char_length(event_city) between 1 and 120
  );

-- M0003 intentionally grants only explicit user-writable columns. Extend that
-- contract for the three setup values without granting status/account ownership.
grant insert (person_one_name, person_two_name, event_city)
on table public.wedding_projects
to authenticated;

commit;
