'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { PersonalGuestLinkResultActions } from '@/components/projects/personal-guest-link-result-actions';
import { RowOverflowMenu } from '@/components/projects/row-overflow-menu';
import { Button, Dialog } from '@/design-system';
import {
  deriveDeliveryDistribution,
  matchesDeliveryDistributionFilter,
} from '@/modules/delivery/delivery-distribution';
import { deriveDeliveryReadiness } from '@/modules/delivery/delivery-readiness';
import type { DeliveryDistributionFilter } from '@/modules/delivery/delivery.types';

import {
  DeliveryBatchPreparationDialog,
  DeliveryLinkPreparationDialog,
  PersonalLinkReaccessControl,
} from './native-guest-delivery-center-actions';
import { DeliveryContactRecordControl } from './native-guest-delivery-contact-control';
import { DeliveryDistributionWorkspace } from './native-guest-delivery-center-workspace';
import {
  type DeliveryGuestRowClient,
  type NativeGuestDeliveryCenterProps,
  downloadOwnerXlsx,
  safeCopy,
} from './native-guest-delivery-center-shared';

export function NativeGuestDeliveryCenter({
  copyWhatsAppNumbersAction,
  handoffSummary,
  prepareBatchAction,
  projectId,
  rows,
  summary,
}: NativeGuestDeliveryCenterProps) {
  const [query, setQuery] = useState('');
  const [distributionFilter, setDistributionFilter] =
    useState<DeliveryDistributionFilter>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const [openOverflowKey, setOpenOverflowKey] = useState<string | null>(null);
  const [prepareGuest, setPrepareGuest] = useState<DeliveryGuestRowClient | null>(null);
  const [revealedPersonalLink, setRevealedPersonalLink] = useState<{
    guestDisplayName: string;
    personalUrl: string;
    recipientWhatsAppPhoneE164: string | null;
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        row.displayName.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
        row.groupLabel?.toLocaleLowerCase('id-ID').includes(normalizedQuery);
      return matchesQuery && matchesDeliveryDistributionFilter(row, distributionFilter);
    });
  }, [distributionFilter, query, rows]);

  const visibleIds = filteredRows.map((row) => row.guestId);
  const selectedVisibleIds = selectedIds.filter((id) => visibleIds.includes(id));
  const selectedVisibleRows = filteredRows.filter((row) =>
    selectedVisibleIds.includes(row.guestId),
  );
  const selectedPreparationIds = selectedVisibleRows
    .filter((row) => deriveDeliveryReadiness(row).canPrepareNewLink)
    .map((row) => row.guestId);
  const selectedReadyIds = selectedVisibleRows
    .filter((row) => deriveDeliveryReadiness(row).isReadyToDistribute)
    .map((row) => row.guestId);
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;
  const repairCount = summary.needsLinkUpdateCount + summary.needsWhatsAppCount;

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setSelectedIds([]);
    setOpenOverflowKey(null);
  }

  function updateDistributionFilter(nextFilter: DeliveryDistributionFilter) {
    setDistributionFilter(nextFilter);
    setSelectedIds([]);
    setOpenOverflowKey(null);
  }

  function toggleSelected(guestId: string) {
    setSelectedIds((current) =>
      current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId],
    );
  }

  function toggleAllVisible() {
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
    );
  }

  async function exportSelected() {
    try {
      await downloadOwnerXlsx(`/dashboard/${projectId}/delivery/export-xlsx`, selectedReadyIds);
    } catch {
      setCopyFeedback('Export Excel belum bisa disiapkan. Coba lagi beberapa saat lagi.');
    }
  }

  async function copyOneTimeLink() {
    if (!revealedPersonalLink) return;
    try {
      await safeCopy(revealedPersonalLink.personalUrl);
      setCopyFeedback('Tautan disalin.');
    } catch {
      setCopyFeedback('Salin tautan ini secara manual.');
    }
  }

  function renderOverflow(row: DeliveryGuestRowClient, view: 'desktop' | 'mobile') {
    if (!row.reaccessAction) return null;
    const menuKey = `${row.guestId}:${view}`;
    return (
      <RowOverflowMenu
        ariaLabel={`Aksi untuk ${row.displayName}`}
        onOpenChange={(open: boolean) => setOpenOverflowKey(open ? menuKey : null)}
        open={openOverflowKey === menuKey}
      >
        <PersonalLinkReaccessControl
          guestDisplayName={row.displayName}
          menuItem
          operation="open"
          reaccessAction={row.reaccessAction}
        />
      </RowOverflowMenu>
    );
  }

  function renderShare(row: DeliveryGuestRowClient, mobile: boolean) {
    if (!row.reaccessAction) return null;
    const truth = deriveDeliveryDistribution(row);
    return (
      <PersonalLinkReaccessControl
        emphasis={mobile}
        fullWidth={mobile}
        guestDisplayName={row.displayName}
        label={truth.shareActionLabel}
        operation="share"
        reaccessAction={row.reaccessAction}
      />
    );
  }

  function renderRowActions(row: DeliveryGuestRowClient, view: 'desktop' | 'mobile') {
    const readiness = deriveDeliveryReadiness(row);
    const truth = deriveDeliveryDistribution(row);
    const mobile = view === 'mobile';

    if (truth.distributionState === 'contact_recorded') {
      return (
        <div className={mobile ? 'grid w-full gap-2' : 'flex flex-wrap justify-end gap-2'}>
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center justify-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
            href={`/dashboard/${projectId}/rsvp`}
          >
            Lihat respons
          </Link>
          {renderShare(row, mobile)}
          {!mobile ? renderOverflow(row, view) : null}
        </div>
      );
    }

    if (readiness.isReadyToDistribute && row.reaccessAction) {
      return (
        <div className={mobile ? 'grid w-full grid-cols-2 gap-2' : 'flex flex-wrap justify-end gap-1.5'}>
          {truth.distributionState === 'ready_for_handoff' ? (
            <PersonalLinkReaccessControl
              fullWidth={mobile}
              guestDisplayName={row.displayName}
              operation="copy"
              reaccessAction={row.reaccessAction}
            />
          ) : null}
          {renderShare(row, mobile)}
          {truth.canRecordContact && row.contactAction ? (
            <DeliveryContactRecordControl
              action={row.contactAction}
              fullWidth={mobile}
              guestDisplayName={row.displayName}
            />
          ) : null}
          {!mobile ? renderOverflow(row, view) : null}
        </div>
      );
    }

    if (readiness.canPrepareNewLink && row.prepareAction) {
      return (
        <Button
          className={mobile ? 'w-full justify-center' : undefined}
          onClick={() => setPrepareGuest(row)}
          size="sm"
          type="button"
        >
          Siapkan Undangan Pribadi
        </Button>
      );
    }

    return (
      <div className={mobile ? 'text-left' : 'flex flex-col items-end gap-1 text-right'}>
        <span className="text-seraya-text-muted text-xs leading-5">
          {truth.nextStepLabel}
        </span>
        <Link
          className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
          href={`/dashboard/${projectId}/guests`}
        >
          Perbaiki data di Tamu
        </Link>
      </div>
    );
  }

  const showReadyBulkActions =
    distributionFilter === 'ready_for_handoff' ||
    distributionFilter === 'handoff_prepared' ||
    distributionFilter === 'contact_recorded' ||
    distributionFilter === 'awaiting_rsvp';

  return (
    <>
      <DeliveryDistributionWorkspace
        allVisibleSelected={allVisibleSelected}
        copyFeedback={copyFeedback}
        copyWhatsAppNumbersAction={copyWhatsAppNumbersAction}
        distributionFilter={distributionFilter}
        exportSelected={exportSelected}
        filteredRows={filteredRows}
        handoffSummary={handoffSummary}
        projectId={projectId}
        query={query}
        renderOverflow={renderOverflow}
        renderRowActions={renderRowActions}
        repairCount={repairCount}
        rows={rows}
        selectedPreparationIds={selectedPreparationIds}
        selectedReadyIds={selectedReadyIds}
        selectedVisibleIds={selectedVisibleIds}
        setBatchOpen={setBatchOpen}
        setSelectedIds={setSelectedIds}
        showReadyBulkActions={showReadyBulkActions}
        summary={summary}
        toggleAllVisible={toggleAllVisible}
        toggleSelected={toggleSelected}
        updateDistributionFilter={updateDistributionFilter}
        updateQuery={updateQuery}
      />

      {batchOpen ? (
        <DeliveryBatchPreparationDialog
          guestIds={selectedPreparationIds}
          onOpenChange={setBatchOpen}
          open={batchOpen}
          prepareBatchAction={prepareBatchAction}
        />
      ) : null}

      {prepareGuest?.prepareAction ? (
        <DeliveryLinkPreparationDialog
          description={`Undangan Pribadi untuk ${prepareGuest.displayName} hanya ditampilkan satu kali setelah dibuat. Tindakan ini belum menyiapkan handoff WhatsApp.`}
          onOpenChange={(open) => !open && setPrepareGuest(null)}
          onPrepared={(result) => {
            setPrepareGuest(null);
            setRevealedPersonalLink({ guestDisplayName: prepareGuest.displayName, ...result });
          }}
          open={Boolean(prepareGuest)}
          prepareAction={prepareGuest.prepareAction}
          title="Siapkan Undangan Pribadi"
        />
      ) : null}

      <Dialog
        description="Tautan ini hanya muncul pada tindakan owner yang sah. Membuat atau menyalin tautan belum mencatat handoff WhatsApp."
        onOpenChange={(open: boolean) => {
          if (!open) {
            setRevealedPersonalLink(null);
            setCopyFeedback(null);
          }
        }}
        open={Boolean(revealedPersonalLink)}
        title="Undangan Pribadi siap"
      >
        {revealedPersonalLink ? (
          <PersonalGuestLinkResultActions
            copyFeedback={copyFeedback}
            guestDisplayName={revealedPersonalLink.guestDisplayName}
            onClose={() => setRevealedPersonalLink(null)}
            onCopy={copyOneTimeLink}
            personalUrl={revealedPersonalLink.personalUrl}
            recipientWhatsAppPhoneE164={revealedPersonalLink.recipientWhatsAppPhoneE164}
          />
        ) : null}
      </Dialog>
    </>
  );
}
