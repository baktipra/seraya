export type PublishInvitationActionState = {
  message?: string;
  publishedSlug?: string;
  status: 'idle' | 'error' | 'success';
};

export const initialPublishInvitationActionState: PublishInvitationActionState = {
  status: 'idle',
};
