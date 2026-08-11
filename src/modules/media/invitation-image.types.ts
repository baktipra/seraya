export const INVITATION_IMAGE_MEDIA_KIND = 'invitation_image' as const;
export const INVITATION_IMAGE_ROLES = ['cover', 'person_one', 'person_two', 'story'] as const;

export type InvitationImageRole = (typeof INVITATION_IMAGE_ROLES)[number];

export type InvitationPremiumMediaImage = {
  alt: string;
  id: string;
  src: string;
};

export type InvitationPremiumMediaImages = {
  cover: InvitationPremiumMediaImage | null;
  personOne: InvitationPremiumMediaImage | null;
  personTwo: InvitationPremiumMediaImage | null;
  story: InvitationPremiumMediaImage | null;
};

export type InvitationImageUploadReservation = {
  assetId: string;
  signedUploadUrl: string;
};
