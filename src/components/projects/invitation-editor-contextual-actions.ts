'use client';

import { useEffect } from 'react';

export type InvitationEditorContextualSaveActionState = 'clean' | 'dirty' | 'saving';

export function getInvitationEditorContextualSaveActionState({
  isDirty,
  statusLabel,
}: {
  isDirty: boolean;
  statusLabel: string;
}): InvitationEditorContextualSaveActionState {
  if (statusLabel.startsWith('Menyimpan perubahan')) {
    return 'saving';
  }

  return isDirty ? 'dirty' : 'clean';
}

/**
 * Slice G finalizes the editor action matrix without changing save or publish
 * authority. The local preview is always mounted and already receives the
 * canonical `isDirty` state, so it acts as a small state sentinel for the sticky
 * action dock across every readiness state, including states where publication
 * controls are intentionally absent.
 */
export function useInvitationEditorContextualSaveAction(isDirty: boolean) {
  useEffect(() => {
    const editorRoot = document.querySelector<HTMLElement>(
      '[aria-labelledby="invitation-editor-title"]',
    );
    const saveStatus = editorRoot?.querySelector<HTMLElement>(
      '[data-testid="invitation-editor-save-status"]',
    );
    const actionTarget =
      saveStatus?.nextElementSibling instanceof HTMLElement
        ? saveStatus.nextElementSibling
        : null;
    const saveButton = actionTarget?.querySelector<HTMLButtonElement>('button[type="submit"]');

    if (!saveButton || !saveStatus) {
      return;
    }

    const syncSaveAction = () => {
      const statusLabel = saveStatus.querySelector('p')?.textContent?.trim() ?? '';
      const actionState = getInvitationEditorContextualSaveActionState({
        isDirty,
        statusLabel,
      });
      const canSave = actionState === 'dirty';

      saveButton.disabled = !canSave;
      saveButton.setAttribute('data-editor-contextual-save-action', actionState);

      if (canSave) {
        saveButton.removeAttribute('title');
      } else if (actionState === 'clean') {
        saveButton.title = 'Tidak ada perubahan untuk disimpan.';
      }
    };

    syncSaveAction();

    const observer = new MutationObserver(syncSaveAction);
    observer.observe(saveStatus, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      saveButton.removeAttribute('data-editor-contextual-save-action');
      saveButton.removeAttribute('title');
    };
  }, [isDirty]);
}
