export type PersonalGuestbookEntry = {
  message: string;
  updatedAt: string;
};

export type OwnerGuestbookEntry = {
  /** Owner-only correlation for the RSVP response workspace. */
  guestId?: string;
  id: string;
  message: string;
  guestDisplayName: string;
  updatedAt: string;
};

export type OwnedGuestbookInbox = {
  entries: OwnerGuestbookEntry[];
  project: {
    defaultTimezone: string;
    id: string;
  };
};
