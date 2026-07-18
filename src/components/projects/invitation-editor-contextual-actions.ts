'use client';

import { useEffect } from 'react';

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

    if (!saveButton) {
      return;
    }

    const syncSaveAction = () => {
      const statusLabel = saveStatus?.querySelector('p')?.textContent?.trim() ?? '';
      const isSaving = statusLabel.startsWith('Menyimpan perubahan');
      const canSave = isDirty && !isSaving;
      const actionState = isSaving ? 'saving' : canSave ? 'dirty' : 'clean';

      if (saveButton.disabled === canSave) {
        saveButton.disabled = !canSave;
      }

      saveButton.setAttribute('data-editor-contextual-save-action', actionState);

      if (canSave) {
        saveButton.removeAttribute('title');
      } else if (!isSaving) {
        saveButton.title = 'Tidak ada perubahan untuk disimpan.';
      }
    };

    syncSaveAction();

    const observer = new MutationObserver(syncSaveAction);
    observer.observe(saveStatus ?? saveButton, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    observer.observe(saveButton, {
      attributeFilter: ['disabled'],
      attributes: true,
    });

    return () => {
      observer.disconnect();
      saveButton.removeAttribute('data-editor-contextual-save-action');
      saveButton.removeAttribute('title');
    };
  }, [isDirty]);
}
