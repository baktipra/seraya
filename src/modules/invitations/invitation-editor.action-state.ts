import type { InvitationEditorFieldErrors } from './invitation-editor.schema';

export type InvitationEditorActionState = {
  fieldErrors?: InvitationEditorFieldErrors;
  message?: string;
  status: 'idle' | 'error' | 'success';
};

export const initialInvitationEditorActionState: InvitationEditorActionState = {
  status: 'idle',
};
