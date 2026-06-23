import type { CreateProjectFieldErrors } from './create-project.schema';

export type CreateProjectActionState = {
  fieldErrors?: CreateProjectFieldErrors;
  message?: string;
  status: 'idle' | 'error';
};

export const initialCreateProjectActionState: CreateProjectActionState = {
  status: 'idle',
};
