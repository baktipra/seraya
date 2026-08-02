'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';

import { useToast } from '@/design-system';
import { initialGuestLinkActionState } from '@/modules/guest-links/guest-link.action-state';
import {
  createOrReplacePersonalGuestLinkAction,
  reaccessPersonalGuestLinkAction,
  revokePersonalGuestLinkAction,
} from '@/modules/guest-links/guest-link.actions';
import { initialGuestActionState } from '@/modules/guests/guest.action-state';
import {
  createGuestAction,
  removeGuestAction,
  updateGuestAction,
} from '@/modules/guests/guest.actions';
import { initialGuestImportActionState } from '@/modules/guests/guest-import.action-state';
import {
  importGuestsCsvAction,
  importGuestsXlsxAction,
} from '@/modules/guests/guest-import.actions';
import type { GuestListItem } from '@/modules/guests/guest.types';

import type { GuestLifecycleFilter } from './native-guest-manager-lifecycle';
import { useGuestActionFeedback } from './native-guest-manager-shared';

export function useNativeGuestManagerActionState() {
  const router = useRouter();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'csv' | 'xlsx'>('xlsx');
  const [editGuest, setEditGuest] = useState<GuestListItem | null>(null);
  const [removeGuest, setRemoveGuest] = useState<GuestListItem | null>(null);
  const [linkGuest, setLinkGuest] = useState<GuestListItem | null>(null);
  const [reaccessGuest, setReaccessGuest] = useState<GuestListItem | null>(null);
  const [revokeLinkGuest, setRevokeLinkGuest] = useState<GuestListItem | null>(null);
  const [revealedPersonalLink, setRevealedPersonalLink] = useState<{
    guestDisplayName: string;
    personalUrl: string;
    recipientWhatsAppPhoneE164: string | null;
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [guestFilter, setGuestFilter] = useState<GuestLifecycleFilter>('all');
  const [batchOpen, setBatchOpen] = useState(false);
  const [openOverflowKey, setOpenOverflowKey] = useState<string | null>(null);
  const lastHandledLinkResultKey = useRef<string | null>(null);

  const [createState, createAction, createPending] = useActionState(
    createGuestAction,
    initialGuestActionState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateGuestAction,
    initialGuestActionState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeGuestAction,
    initialGuestActionState,
  );
  const [csvImportState, csvImportAction, csvImportPending] = useActionState(
    importGuestsCsvAction,
    initialGuestImportActionState,
  );
  const [xlsxImportState, xlsxImportAction, xlsxImportPending] = useActionState(
    importGuestsXlsxAction,
    initialGuestImportActionState,
  );
  const [linkState, linkAction, linkPending] = useActionState(
    createOrReplacePersonalGuestLinkAction,
    initialGuestLinkActionState,
  );
  const [reaccessState, reaccessAction, reaccessPending] = useActionState(
    reaccessPersonalGuestLinkAction,
    initialGuestLinkActionState,
  );
  const [revokeLinkState, revokeLinkAction, revokeLinkPending] = useActionState(
    revokePersonalGuestLinkAction,
    initialGuestLinkActionState,
  );

  useGuestActionFeedback(createState, () => setAddOpen(false));
  useGuestActionFeedback(updateState, () => setEditGuest(null));
  useGuestActionFeedback(removeState, () => setRemoveGuest(null));
  useGuestActionFeedback(csvImportState, () => setImportOpen(false));
  useGuestActionFeedback(xlsxImportState, () => undefined);
  useGuestActionFeedback(revokeLinkState, () => setRevokeLinkGuest(null));

  useEffect(() => {
    if (
      linkState.status !== 'success' ||
      !linkState.personalUrl ||
      !linkState.resultKey ||
      !linkGuest ||
      lastHandledLinkResultKey.current === linkState.resultKey
    ) {
      return;
    }

    lastHandledLinkResultKey.current = linkState.resultKey;
    const guestDisplayName = linkGuest.display_name;
    queueMicrotask(() => {
      setLinkGuest(null);
      setRevealedPersonalLink({
        guestDisplayName,
        personalUrl: linkState.personalUrl!,
        recipientWhatsAppPhoneE164: linkState.recipientWhatsAppPhoneE164 ?? null,
      });
      setCopyFeedback(null);
      toast({ title: linkState.message ?? 'Tautan pribadi siap digunakan.', variant: 'success' });
      router.refresh();
    });
  }, [linkGuest, linkState, router, toast]);

  useEffect(() => {
    if (
      reaccessState.status !== 'success' ||
      !reaccessState.personalUrl ||
      !reaccessState.resultKey ||
      !reaccessGuest ||
      lastHandledLinkResultKey.current === reaccessState.resultKey
    ) {
      return;
    }

    lastHandledLinkResultKey.current = reaccessState.resultKey;
    const guestDisplayName = reaccessGuest.display_name;
    queueMicrotask(() => {
      setReaccessGuest(null);
      setRevealedPersonalLink({
        guestDisplayName,
        personalUrl: reaccessState.personalUrl!,
        recipientWhatsAppPhoneE164: reaccessState.recipientWhatsAppPhoneE164 ?? null,
      });
      setCopyFeedback(null);
      toast({
        title: reaccessState.message ?? 'Tautan pribadi siap digunakan.',
        variant: 'success',
      });
    });
  }, [reaccessGuest, reaccessState, toast]);


  async function copyPersonalUrl() {
    const personalUrl = revealedPersonalLink?.personalUrl;
    if (!personalUrl) return;

    try {
      await navigator.clipboard.writeText(personalUrl);
      setCopyFeedback('Tautan disalin.');
    } catch {
      setCopyFeedback('Salin tautan ini secara manual.');
    }
  }

  return {
    addOpen,
    batchOpen,
    copyFeedback,
    copyPersonalUrl,
    createAction,
    createPending,
    createState,
    csvImportAction,
    csvImportPending,
    csvImportState,
    editGuest,
    guestFilter,
    importMode,
    importOpen,
    linkAction,
    linkGuest,
    linkPending,
    linkState,
    openOverflowKey,
    query,
    reaccessAction,
    reaccessGuest,
    reaccessPending,
    reaccessState,
    removeAction,
    removeGuest,
    removePending,
    removeState,
    revealedPersonalLink,
    revokeLinkAction,
    revokeLinkGuest,
    revokeLinkPending,
    revokeLinkState,
    selectedGuestIds,
    setAddOpen,
    setBatchOpen,
    setCopyFeedback,
    setEditGuest,
    setGuestFilter,
    setImportMode,
    setImportOpen,
    setLinkGuest,
    setOpenOverflowKey,
    setQuery,
    setReaccessGuest,
    setRemoveGuest,
    setRevealedPersonalLink,
    setRevokeLinkGuest,
    setSelectedGuestIds,
    updateAction,
    updatePending,
    updateState,
    xlsxImportAction,
    xlsxImportPending,
    xlsxImportState,
  };
}

export type NativeGuestManagerActionState = ReturnType<typeof useNativeGuestManagerActionState>;
