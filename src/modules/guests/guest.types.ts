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
  rsvp_status: GuestRsvpStatus;
  updated_at: string;
};

/** Render-safe owner row: factual RSVP/link state only; no hash or raw personal URL. */
export type GuestListItem = Pick<
  Guest,
  'display_name' | 'group_label' | 'id' | 'party_size' | 'rsvp_status'
> & {
  link_state: GuestPersonalLinkState;
};

export type CreateGuestInput = {
  displayName: string;
  groupLabel: string | null;
  partySize: number;
};

export type UpdateGuestInput = CreateGuestInput;
