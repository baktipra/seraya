import { z } from 'zod';

import { galleryMediaAssetIdSchema, galleryMediaReservationSchema } from './media.validation';
import { INVITATION_IMAGE_ROLES } from './invitation-image.types';

export const invitationImageReservationSchema = galleryMediaReservationSchema.extend({
  role: z.enum(INVITATION_IMAGE_ROLES),
});

export const invitationImageFinalizeSchema = z
  .object({
    assetId: galleryMediaAssetIdSchema,
    role: z.enum(INVITATION_IMAGE_ROLES),
  })
  .strict();

export const invitationImageRemoveSchema = invitationImageFinalizeSchema;

const profileLinksSchema = z
  .object({
    instagram: z.string().max(2048),
    tiktok: z.string().max(2048),
    website: z.string().max(2048),
  })
  .strict();

export const premiumGuestMediaConfigurationSchema = z
  .object({
    personOneSocialLinks: profileLinksSchema,
    personTwoSocialLinks: profileLinksSchema,
    weddingFilm: z
      .object({
        caption: z.string().max(600),
        enabled: z.boolean(),
        heading: z.string().max(160),
        url: z.string().max(2048),
      })
      .strict(),
  })
  .strict();
