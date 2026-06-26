import type { GuestPersonalLinkState } from '@/modules/guest-links/guest-link.types';

export const GUEST_RSVP_STATUS = 'pending' as const;

export type GuestRsvpStatus = 'pending' | 'attending' | 'declined';

export type Guest = {
  created_at: string;
  deleted_at: string | null;
  display_name: string;
  group_label: string | null;
  id: string;
  party_size: number;
  project_id: string;
  rsvp_attendee_count: number | null;
  rsvp_status: GuestRsvpStatus;
  updated_at: string;
  whatsapp_phone_e164: string | null;
};

/** Render-safe owner row: factual RSVP/link state only; no hash or raw personal URL. */
export type GuestListItem = Pick<
  Guest,
  'display_name' | 'group_label' | 'id' | 'party_size' | 'rsvp_attendee_count' | 'rsvp_status'
> & {
  link_state: GuestPersonalLinkState;
  whatsapp_phone_e164: string | null;
};

export type CreateGuestInput = {
  displayName: string;
  groupLabel: string | null;
  partySize: number;
  whatsappPhoneE164?: string | null;
};

export type UpdateGuestInput = CreateGuestInput;
