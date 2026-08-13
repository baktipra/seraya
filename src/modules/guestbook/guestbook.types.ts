export type PersonalGuestbookEntry = {
  message: string;
  shareWithGuests: boolean;
  updatedAt: string;
};

export type PersonalGuestbookSharedWish = {
  createdAt: string;
  displayName: string;
  message: string;
};

export type OwnerGuestbookEntry = {
  /** Owner-only correlation for the RSVP response workspace. */
  guestId?: string;
  createdAt: string;
  groupLabel: string | null;
  hiddenFromGuestFeed: boolean;
  id: string;
  message: string;
  guestDisplayName: string;
  shareWithGuests: boolean;
  updatedAt: string;
};

export type OwnedGuestbookInbox = {
  entries: OwnerGuestbookEntry[];
  project: {
    defaultTimezone: string;
    id: string;
  };
};
