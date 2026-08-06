'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useToast } from '@/design-system';
import {
  initialInvitationEditorActionState,
  type InvitationEditorActionState,
} from '@/modules/invitations/invitation-editor.action-state';
import { saveInvitationEditorAction } from '@/modules/invitations/invitation-editor.actions';
import {
  createInvitationEditorSubmissionPayload,
  invitationEditorLocalContentReducer,
  type InvitationEditorLocalAction,
} from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

export type InvitationStudioSaveAction = (
  previousState: InvitationEditorActionState,
  formData: FormData,
) => Promise<InvitationEditorActionState>;

export type InvitationStudioSaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

export type InvitationStudioSaveTone = 'error' | 'neutral' | 'success' | 'warning';

export type InvitationStudioSavePresentation = {
  actionLabel: string;
  description: string;
  label: string;
  state: InvitationStudioSaveState;
  tone: InvitationStudioSaveTone;
};

export type InvitationStudioSavePresentationInput = {
  actionStatus: InvitationEditorActionState['status'];
  hasSaved: boolean;
  isDirty: boolean;
  isPending: boolean;
};

export const invitationStudioDirtyNavigationMessage =
  'Perubahan undangan belum disimpan. Yakin ingin meninggalkan halaman ini?';

export function getInvitationStudioSavePresentation({
  actionStatus,
  hasSaved,
  isDirty,
  isPending,
}: InvitationStudioSavePresentationInput): InvitationStudioSavePresentation {
  if (isPending) {
    return {
      actionLabel: 'Menyimpan…',
      description: 'Perubahan sedang disimpan ke draf pribadi.',
      label: 'Menyimpan perubahan…',
      state: 'saving',
      tone: 'neutral',
    };
  }

  if (actionStatus === 'error') {
    return {
      actionLabel: 'Coba simpan lagi',
      description: 'Perubahan lokal tetap aman. Periksa bagian yang bermasalah lalu coba lagi.',
      label: 'Gagal menyimpan',
      state: 'error',
      tone: 'error',
    };
  }

  if (isDirty) {
    return {
      actionLabel: 'Simpan perubahan',
      description: 'Perubahan baru masih berada di browser ini.',
      label: 'Belum tersimpan',
      state: 'dirty',
      tone: 'warning',
    };
  }

  if (hasSaved || actionStatus === 'success') {
    return {
      actionLabel: 'Simpan perubahan',
      description: 'Draf pribadi sudah memuat perubahan terbaru.',
      label: 'Semua perubahan tersimpan',
      state: 'saved',
      tone: 'success',
    };
  }

  return {
    actionLabel: 'Simpan perubahan',
    description: 'Belum ada perubahan lokal yang berbeda dari draf pribadi.',
    label: 'Belum ada perubahan',
    state: 'clean',
    tone: 'neutral',
  };
}

export function shouldConfirmInvitationStudioNavigation(currentHref: string, nextHref: string) {
  const currentUrl = new URL(currentHref);
  const nextUrl = new URL(nextHref, currentUrl);
  const isSameDocumentHash =
    nextUrl.pathname === currentUrl.pathname &&
    nextUrl.search === currentUrl.search &&
    nextUrl.hash.length > 0;

  return !isSameDocumentHash;
}

type InvitationStudioContextValue = {
  actionState: InvitationEditorActionState;
  canSave: boolean;
  content: InvitationDraft['content'];
  formAction: (payload: FormData) => void;
  formId: string;
  hasSaved: boolean;
  isDirty: boolean;
  isPending: boolean;
  savePresentation: InvitationStudioSavePresentation;
  submissionPayload: string;
  synchronizeLocalContent: (action: InvitationEditorLocalAction) => void;
  updateLocalContent: (action: InvitationEditorLocalAction) => void;
};

const InvitationStudioContext = createContext<InvitationStudioContextValue | null>(null);

export type InvitationStudioProviderProps = {
  children: ReactNode;
  initialDraft: InvitationDraft;
  projectId: string;
  refreshOnSuccess?: boolean;
  saveAction?: InvitationStudioSaveAction;
};

export function InvitationStudioProvider({
  children,
  initialDraft,
  projectId,
  refreshOnSuccess = true,
  saveAction = saveInvitationEditorAction,
}: InvitationStudioProviderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [content, dispatchLocalContent] = useReducer(
    invitationEditorLocalContentReducer,
    initialDraft.content,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const lastSyncedDraftUpdatedAt = useRef(initialDraft.updated_at);

  const saveWithLifecycle = useCallback(
    async (previousState: InvitationEditorActionState, formData: FormData) => {
      const result = await saveAction(previousState, formData);

      if (result.status === 'success') {
        setHasSaved(true);
        setIsDirty(false);
        toast({
          description: 'Draf terbaru siap dibuka di preview tersimpan.',
          title: 'Tersimpan',
          variant: 'success',
        });

        if (refreshOnSuccess) {
          router.refresh();
        }
      }

      return result;
    },
    [refreshOnSuccess, router, saveAction, toast],
  );

  const [actionState, formAction, isPending] = useActionState(
    saveWithLifecycle,
    initialInvitationEditorActionState,
  );

  const updateLocalContent = useCallback((action: InvitationEditorLocalAction) => {
    dispatchLocalContent(action);
    setIsDirty(true);
  }, []);
  const synchronizeLocalContent = useCallback((action: InvitationEditorLocalAction) => {
    dispatchLocalContent(action);
  }, []);

  const submissionPayload = useMemo(
    () => JSON.stringify(createInvitationEditorSubmissionPayload(content)),
    [content],
  );
  const savePresentation = useMemo(
    () =>
      getInvitationStudioSavePresentation({
        actionStatus: actionState.status,
        hasSaved,
        isDirty,
        isPending,
      }),
    [actionState.status, hasSaved, isDirty, isPending],
  );
  const canSave = isDirty || actionState.status === 'error';
  const formId = `invitation-studio-save-${projectId}`;

  useEffect(() => {
    if (initialDraft.updated_at === lastSyncedDraftUpdatedAt.current || isDirty) {
      return;
    }

    lastSyncedDraftUpdatedAt.current = initialDraft.updated_at;
    dispatchLocalContent({ content: initialDraft.content, type: 'replace' });
  }, [initialDraft.content, initialDraft.updated_at, isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const message = invitationStudioDirtyNavigationMessage;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
    };
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>('a[href]');

      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return;
      }

      if (
        !shouldConfirmInvitationStudioNavigation(window.location.href, anchor.href) ||
        window.confirm(message)
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isDirty]);

  const value = useMemo<InvitationStudioContextValue>(
    () => ({
      actionState,
      canSave,
      content,
      formAction,
      formId,
      hasSaved,
      isDirty,
      isPending,
      savePresentation,
      submissionPayload,
      synchronizeLocalContent,
      updateLocalContent,
    }),
    [
      actionState,
      canSave,
      content,
      formAction,
      formId,
      hasSaved,
      isDirty,
      isPending,
      savePresentation,
      submissionPayload,
      synchronizeLocalContent,
      updateLocalContent,
    ],
  );

  return (
    <InvitationStudioContext.Provider value={value}>{children}</InvitationStudioContext.Provider>
  );
}

export function useInvitationStudioState() {
  const context = useContext(InvitationStudioContext);

  if (!context) {
    throw new Error('useInvitationStudioState harus digunakan di dalam InvitationStudioProvider.');
  }

  return context;
}

export function useOptionalInvitationStudioState() {
  return useContext(InvitationStudioContext);
}
