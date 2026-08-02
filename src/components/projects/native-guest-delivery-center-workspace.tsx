'use client';

import type { ReactNode } from 'react';

import {
  OperationalHeader,
  OperationalMetric,
  OperationalMetricStrip,
  OperationalSection,
  OperationalSelectionBar,
  OperationalToolbar,
  OperationalToolbarField,
  OperationalWorkspace,
} from '@/components/workspace/operational-primitives';
import { Button, Input } from '@/design-system';
import type {
  DeliveryDistributionFilter,
  DeliveryHandoffSummary,
  DeliveryReadinessSummary,
} from '@/modules/delivery/delivery.types';

import { DeliveryWhatsAppCopyControl } from './native-guest-delivery-center-actions';
import { DeliveryDistributionData } from './native-guest-delivery-center-data';
import {
  type BoundDeliveryClipboardAction,
  type DeliveryGuestRowClient,
  distributionFilterOptions,
} from './native-guest-delivery-center-shared';

export function DeliveryDistributionWorkspace({
  allVisibleSelected,
  copyFeedback,
  copyWhatsAppNumbersAction,
  distributionFilter,
  exportSelected,
  filteredRows,
  handoffSummary,
  projectId,
  query,
  renderOverflow,
  renderRowActions,
  repairCount,
  rows,
  selectedPreparationIds,
  selectedReadyIds,
  selectedVisibleIds,
  setBatchOpen,
  setSelectedIds,
  showReadyBulkActions,
  summary,
  toggleAllVisible,
  toggleSelected,
  updateDistributionFilter,
  updateQuery,
}: {
  allVisibleSelected: boolean;
  copyFeedback: string | null;
  copyWhatsAppNumbersAction: BoundDeliveryClipboardAction;
  distributionFilter: DeliveryDistributionFilter;
  exportSelected: () => Promise<void>;
  filteredRows: DeliveryGuestRowClient[];
  handoffSummary: DeliveryHandoffSummary;
  projectId: string;
  query: string;
  renderOverflow: (row: DeliveryGuestRowClient, view: 'desktop' | 'mobile') => ReactNode;
  renderRowActions: (row: DeliveryGuestRowClient, view: 'desktop' | 'mobile') => ReactNode;
  repairCount: number;
  rows: DeliveryGuestRowClient[];
  selectedPreparationIds: string[];
  selectedReadyIds: string[];
  selectedVisibleIds: string[];
  setBatchOpen: (open: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  showReadyBulkActions: boolean;
  summary: DeliveryReadinessSummary;
  toggleAllVisible: () => void;
  toggleSelected: (guestId: string) => void;
  updateDistributionFilter: (filter: DeliveryDistributionFilter) => void;
  updateQuery: (query: string) => void;
}) {
  return (
    <OperationalWorkspace labelledBy="delivery-center-title">
      <OperationalHeader
        description="Seraya menyiapkan pesan dan Undangan Pribadi. Pengiriman tetap dilakukan oleh Anda melalui WhatsApp."
        eyebrow="Bagikan"
        title="Siapa yang siap dihubungi sekarang?"
        titleId="delivery-center-title"
      />

      <OperationalMetricStrip columns={5} label="Ringkasan pembagian manual">
        <OperationalMetric label="Tamu aktif" value={summary.activeGuestCount} />
        <OperationalMetric
          detail="Link aktif dan Nomor WhatsApp tersedia."
          label="Siap dibagikan"
          value={handoffSummary.readyForHandoffCount}
        />
        <OperationalMetric
          detail="Materi handoff sudah disiapkan, belum dianggap terkirim."
          label="Sudah disiapkan"
          value={handoffSummary.handoffPreparedCount}
        />
        <OperationalMetric
          detail="Ditandai manual oleh owner."
          label="Sudah dihubungi"
          value={handoffSummary.contactRecordedCount}
        />
        <OperationalMetric
          detail={`${summary.needsWhatsAppCount} WhatsApp · ${summary.needsLinkUpdateCount} tautan`}
          label="Perlu perhatian"
          mobileSpan="full"
          value={repairCount + summary.noPersonalInvitationCount}
        />
      </OperationalMetricStrip>

      <OperationalSection
        description={`Pembagian manual dipisahkan dari respons tamu. ${handoffSummary.awaitingRsvpCount} tamu sudah masuk tahap handoff tetapi masih menunggu RSVP.`}
        title="Distribusi Undangan Pribadi"
        titleId="delivery-guests-title"
      >
        <div
          className="border-seraya-border-default bg-seraya-brand-soft rounded-[var(--seraya-radius-sm)] border px-4 py-3 text-sm leading-6"
          role="note"
        >
          <p className="text-seraya-text-primary font-semibold">
            Persiapan, kontak owner, dan respons tamu adalah tiga fakta berbeda.
          </p>
          <p className="text-seraya-text-secondary mt-1">
            “Sudah dihubungi” hanya dicatat setelah konfirmasi owner dan bukan bukti pesan diterima, dibuka, atau dibaca.
          </p>
        </div>

        <OperationalToolbar label="Cari dan filter pembagian manual">
          <OperationalToolbarField htmlFor="delivery-search" label="Cari tamu">
            <Input
              id="delivery-search"
              onChange={(event: { target: { value: string } }) => updateQuery(event.target.value)}
              placeholder="Cari nama atau grup"
              value={query}
            />
          </OperationalToolbarField>
          <OperationalToolbarField htmlFor="delivery-distribution-filter" label="Status pembagian">
            <select
              className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-sm)] border px-3 text-sm focus-visible:outline-3 focus-visible:outline-offset-2"
              id="delivery-distribution-filter"
              onChange={(event: { target: { value: string } }) =>
                updateDistributionFilter(event.target.value as DeliveryDistributionFilter)
              }
              value={distributionFilter}
            >
              {distributionFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </OperationalToolbarField>
        </OperationalToolbar>

        <DeliveryDistributionData
          allVisibleSelected={allVisibleSelected}
          filteredRows={filteredRows}
          projectId={projectId}
          renderOverflow={renderOverflow}
          renderRowActions={renderRowActions}
          rows={rows}
          selectedVisibleIds={selectedVisibleIds}
          toggleAllVisible={toggleAllVisible}
          toggleSelected={toggleSelected}
        />

        {filteredRows.length > 0 ? (
          <OperationalSelectionBar
            actions={
              <>
                {distributionFilter === 'no_personal_invitation' || distributionFilter === 'not_ready' ? (
                  <Button
                    disabled={selectedPreparationIds.length === 0}
                    onClick={() => setBatchOpen(true)}
                    size="sm"
                    type="button"
                  >
                    Siapkan Undangan Pribadi
                  </Button>
                ) : null}
                {showReadyBulkActions ? (
                  <>
                    <Button
                      disabled={selectedReadyIds.length === 0}
                      onClick={() => void exportSelected()}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Export Excel
                    </Button>
                    <DeliveryWhatsAppCopyControl
                      copyAction={copyWhatsAppNumbersAction}
                      guestIds={selectedReadyIds}
                    />
                  </>
                ) : null}
                <Button
                  disabled={selectedVisibleIds.length === 0}
                  onClick={() => setSelectedIds([])}
                  size="sm"
                  type="button"
                  variant="text"
                >
                  Batalkan pilihan
                </Button>
              </>
            }
            status={
              <>
                <span className="text-seraya-text-primary font-semibold">
                  {selectedVisibleIds.length} tamu terpilih
                </span>{' '}
                · pembagian tetap dilakukan per tamu
              </>
            }
          />
        ) : null}

        <p aria-live="polite" className="text-seraya-text-muted text-sm">
          {copyFeedback}
        </p>
      </OperationalSection>
    </OperationalWorkspace>
  );
}
