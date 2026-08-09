'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  filterGuestFollowUpRows,
  type FollowUpGuestRowClient,
} from '@/components/projects/guest-follow-up-center';
import { GuestFollowUpHandoffControl } from '@/components/projects/guest-follow-up-handoff-control';
import { GuestFollowUpResultDialog } from '@/components/projects/guest-follow-up-result-dialog';
import {
  OperationalDataSurface,
  OperationalEmptyState,
  OperationalHeader,
  OperationalMetric,
  OperationalMetricStrip,
  OperationalResponsiveList,
  OperationalResponsiveRow,
  OperationalSection,
  OperationalToolbar,
  OperationalToolbarField,
  OperationalWorkspace,
} from '@/components/workspace/operational-primitives';
import { Input } from '@/design-system';
import type {
  GuestFollowUpHandoffMessageKind,
  GuestFollowUpHandoffResult,
  GuestFollowUpSegment,
  GuestFollowUpSegmentFilter,
  GuestFollowUpSummary,
} from '@/modules/follow-up/follow-up.types';

type Props = {
  initialFilter?: GuestFollowUpSegmentFilter;
  isPublished: boolean;
  projectId: string;
  rows: FollowUpGuestRowClient[];
  summary: GuestFollowUpSummary;
  timezone: string;
};

const labels: Record<GuestFollowUpSegment, string> = {
  awaiting_rsvp: 'Menunggu RSVP',
  needs_link_update: 'Tautan perlu diperbarui',
  needs_whatsapp: 'Butuh nomor WhatsApp',
  no_follow_up_recorded: 'Belum dibagikan dari Bagikan',
  no_personal_invitation: 'Belum punya Undangan Pribadi',
  rsvp_responded: 'RSVP sudah dijawab',
};

function reminder(row: FollowUpGuestRowClient): {
  label: string;
  messageKind: GuestFollowUpHandoffMessageKind;
} | null {
  if (row.eligibility.canPrepareRsvpReminder) {
    return { label: 'Siapkan pengingat RSVP', messageKind: 'rsvp_reminder' };
  }
  if (row.eligibility.canPrepareEventReminder) {
    return { label: 'Siapkan pengingat acara', messageKind: 'event_reminder' };
  }
  return null;
}

function RowAction({
  isPublished,
  onPrepared,
  projectId,
  row,
}: {
  isPublished: boolean;
  onPrepared: (result: GuestFollowUpHandoffResult) => void;
  projectId: string;
  row: FollowUpGuestRowClient;
}) {
  if (row.followUpSegment === 'needs_link_update' || row.followUpSegment === 'needs_whatsapp') {
    return <Link href={`/dashboard/${projectId}/guests`}>Buka Tamu</Link>;
  }
  if (
    row.followUpSegment === 'no_personal_invitation' ||
    row.followUpSegment === 'no_follow_up_recorded'
  ) {
    return <Link href={`/dashboard/${projectId}/delivery`}>Buka Bagikan</Link>;
  }
  if (row.followUpSegment === 'rsvp_responded') {
    return <Link href={`/dashboard/${projectId}/rsvp`}>Lihat respons</Link>;
  }

  const action = reminder(row);
  if (!action || !row.handoffAction) {
    return <span className="text-seraya-text-muted text-sm">Tidak perlu tindakan</span>;
  }
  if (!isPublished) {
    return <Link href={`/dashboard/${projectId}/invitation`}>Publikasikan undangan</Link>;
  }
  return (
    <GuestFollowUpHandoffControl
      action={row.handoffAction}
      label={action.label}
      messageKind={action.messageKind}
      onPrepared={onPrepared}
    />
  );
}

export function CanonicalGuestFollowUpCenter({
  initialFilter = 'all',
  isPublished,
  projectId,
  rows,
  summary,
  timezone,
}: Props) {
  const [filter, setFilter] = useState<GuestFollowUpSegmentFilter>(initialFilter);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<GuestFollowUpHandoffResult | null>(null);
  const visibleRows = useMemo(
    () => filterGuestFollowUpRows(rows, filter, query),
    [filter, query, rows],
  );

  return (
    <OperationalWorkspace labelledBy="follow-up-title">
      <OperationalHeader
        description={
          <>
            Siapkan pengingat manual sebagai tahap lanjutan dari Bagikan. Seraya tidak menganggap
            pesan sudah terkirim, diterima, dibuka, atau dibaca.
          </>
        }
        eyebrow="Bagikan · Tindak lanjut"
        title="Tindak lanjut tamu"
        titleId="follow-up-title"
      />

      {!isPublished ? (
        <div className="border-seraya-border-default bg-seraya-brand-soft border px-4 py-4 sm:px-5">
          <p className="text-seraya-text-primary font-semibold">
            Publikasikan undangan untuk mulai menyiapkan handoff.
          </p>
          <Link
            className="text-seraya-action-primary mt-2 inline-flex text-sm font-semibold underline-offset-4 hover:underline"
            href={`/dashboard/${projectId}/invitation`}
          >
            Buka Undangan →
          </Link>
        </div>
      ) : null}

      <OperationalMetricStrip columns={5} label="Ringkasan tindak lanjut">
        <OperationalMetric label="Tamu aktif" value={summary.activeGuestCount} />
        <OperationalMetric label="Perlu diperbaiki" value={summary.needsDataRepairCount} />
        <OperationalMetric label="Belum dibagikan" value={summary.noFollowUpRecordedCount} />
        <OperationalMetric label="Menunggu RSVP" value={summary.awaitingRsvpCount} />
        <OperationalMetric
          label="RSVP selesai"
          mobileSpan="full"
          value={summary.rsvpRespondedCount}
        />
      </OperationalMetricStrip>

      <OperationalSection
        description="Cari tamu berdasarkan nama atau kelompokkan daftar berdasarkan kebutuhan tindak lanjut."
        title="Daftar tindak lanjut"
        titleId="follow-up-list-title"
      >
        <OperationalDataSurface>
          <OperationalToolbar>
            <OperationalToolbarField htmlFor="follow-up-search" label="Cari tamu">
              <Input
                id="follow-up-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau grup"
                type="search"
                value={query}
              />
            </OperationalToolbarField>
            <OperationalToolbarField htmlFor="follow-up-filter" label="Filter status">
              <select
                className="border-seraya-border-default bg-seraya-surface min-h-11 w-full rounded-[var(--seraya-radius-sm)] border px-3 text-sm"
                id="follow-up-filter"
                onChange={(event) => setFilter(event.target.value as GuestFollowUpSegmentFilter)}
                value={filter}
              >
                <option value="all">Semua status</option>
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </OperationalToolbarField>
          </OperationalToolbar>

          {rows.length === 0 ? (
            <OperationalEmptyState
              action={
                <Link
                  className="text-seraya-action-primary text-sm font-semibold underline-offset-4 hover:underline"
                  href={`/dashboard/${projectId}/guests`}
                >
                  Buka Tamu →
                </Link>
              }
              description="Tambahkan daftar tamu terlebih dahulu sebelum menyiapkan tindak lanjut."
              title="Belum ada tamu untuk ditindaklanjuti."
            />
          ) : visibleRows.length === 0 ? (
            <OperationalEmptyState
              description="Ubah pencarian atau filter untuk melihat tamu lain."
              title="Tidak ada tamu yang sesuai."
            />
          ) : (
            <OperationalResponsiveList>
              {visibleRows.map((row) => (
                <OperationalResponsiveRow
                  action={
                    <RowAction
                      isPublished={isPublished}
                      onPrepared={setResult}
                      projectId={projectId}
                      row={row}
                    />
                  }
                  key={row.guestId}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-seraya-text-primary truncate font-semibold">
                      {row.displayName}
                    </p>
                    <span className="border-seraya-border-default bg-seraya-soft inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold">
                      {labels[row.followUpSegment]}
                    </span>
                  </div>
                  <p className="text-seraya-text-muted mt-1 text-xs leading-5">
                    RSVP:{' '}
                    {row.rsvpStatus === 'pending'
                      ? 'Belum merespons'
                      : row.rsvpStatus === 'attending'
                        ? 'Hadir'
                        : 'Tidak hadir'}
                    {row.lastFollowUpAt ? ' · Aktivitas terakhir tercatat' : ''}
                  </p>
                </OperationalResponsiveRow>
              ))}
            </OperationalResponsiveList>
          )}
        </OperationalDataSurface>
      </OperationalSection>

      <GuestFollowUpResultDialog
        onClose={() => setResult(null)}
        result={result}
        timezone={timezone}
      />
    </OperationalWorkspace>
  );
}
