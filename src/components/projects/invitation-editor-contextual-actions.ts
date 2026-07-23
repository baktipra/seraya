'use client';

import { useEffect, useSyncExternalStore } from 'react';

let hasUnsavedChanges = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setUnsavedChanges(nextValue: boolean) {
  if (hasUnsavedChanges === nextValue) return;
  hasUnsavedChanges = nextValue;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return hasUnsavedChanges;
}

function getServerSnapshot() {
  return false;
}

/**
 * Publishes the editor's canonical local dirty state to sibling publication
 * controls without reading or mutating rendered DOM. There is only one owner
 * invitation editor mounted per project route.
 */
export function useInvitationEditorContextualSaveAction(isDirty: boolean) {
  useEffect(() => {
    setUnsavedChanges(isDirty);

    return () => {
      setUnsavedChanges(false);
    };
  }, [isDirty]);
}

/** React-level subscription used by the explicit publication surface. */
export function useInvitationEditorUnsavedChanges() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
