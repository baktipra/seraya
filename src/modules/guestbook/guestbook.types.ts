export type PersonalGuestbookEntry = {
  message: string;
  updatedAt: string;
};

export type OwnerGuestbookEntry = {
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
