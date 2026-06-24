import type { GuestPersonalLinkState } from '@/modules/guest-links/guest-link.types';

import type { Guest, GuestListItem } from './guest.types';

export type GuestDatabaseRecord = {
  created_at: string;
  deleted_at: string | null;
  display_name: string;
  group_label: string | null;
  id: string;
  party_size: number;
  project_id: string;
  rsvp_status: Guest['rsvp_status'];
  updated_at: string;
  whatsapp_phone_e164?: string | null;
};

export function mapGuest(record: GuestDatabaseRecord): Guest {
  return {
    created_at: record.created_at,
    deleted_at: record.deleted_at,
    display_name: record.display_name,
    group_label: record.group_label,
    id: record.id,
    party_size: record.party_size,
    project_id: record.project_id,
    rsvp_status: record.rsvp_status,
    updated_at: record.updated_at,
    whatsapp_phone_e164: record.whatsapp_phone_e164 ?? null,
  };
}

export function mapGuestListItem(
  guest: Guest,
  linkState: GuestPersonalLinkState = 'not_created',
): GuestListItem {
  return {
    display_name: guest.display_name,
    group_label: guest.group_label,
    id: guest.id,
    link_state: linkState,
    party_size: guest.party_size,
    rsvp_status: guest.rsvp_status,
    whatsapp_phone_e164: guest.whatsapp_phone_e164,
  };
}
