'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  filterGuestFollowUpRows,
  type FollowUpGuestRowClient,
} from '@/components/projects/guest-follow-up-center';
import { GuestFollowUpHandoffControl } from '@/components/projects/guest-follow-up-handoff-control';
import { GuestFollowUpResultDialog } from '@/components/projects/guest-follow-up-result-dialog';
import { Card, CardContent, CardHeader, CardTitle, Input } from '@/design-system';
import type {
  GuestFollowUpHandoffMessageKind,
  GuestFollowUpHandoffResult,
  GuestFollowUpSegment,
  GuestFollowUpSegmentFilter,
  GuestFollowUpSummary,
} from '@/modules/follow-up/follow-up.types';

type Props = {
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-md)] border px-4 py-4">
      <p className="text-seraya-text-muted text-xs font-semibold uppercase">{label}</p>
      <p className="text-seraya-text-primary mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

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
  isPublished,
  projectId,
  rows,
  summary,
  timezone,
}: Props) {
  const [filter, setFilter] = useState<GuestFollowUpSegmentFilter>('all');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<GuestFollowUpHandoffResult | null>(null);
  const visibleRows = useMemo(
    () => filterGuestFollowUpRows(rows, filter, query),
    [filter, query, rows],
  );

  return (
    <section className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
      <header className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-6 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <p className="text-seraya-action-primary text-xs font-semibold uppercase">Tindak lanjut</p>
        <h1 className="seraya-display-md mt-3">Tindak lanjut tamu</h1>
        <p className="text-seraya-text-secondary mt-3 max-w-3xl leading-7">
          Siapkan pengingat manual setelah undangan awal dibagikan dari Bagikan. Seraya tidak
          menganggap pesan sudah terkirim.
        </p>
      </header>

      {!isPublished ? (
        <Card>
          <CardContent className="py-5">
            <p className="font-semibold">Publikasikan undangan untuk mulai menyiapkan handoff</p>
            <Link className="mt-3 inline-flex" href={`/dashboard/${projectId}/invitation`}>
              Buka Undangan
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section
        aria-label="Ringkasan tindak lanjut"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Metric label="Tamu aktif" value={summary.activeGuestCount} />
        <Metric label="Perlu diperbaiki" value={summary.needsDataRepairCount} />
        <Metric label="Belum dibagikan" value={summary.noFollowUpRecordedCount} />
        <Metric label="Menunggu RSVP" value={summary.awaitingRsvpCount} />
        <Metric label="RSVP selesai" value={summary.rsvpRespondedCount} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-lg">Daftar tindak lanjut</CardTitle>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_17rem]">
            <Input
              aria-label="Cari tamu"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau grup"
              type="search"
              value={query}
            />
            <select
              aria-label="Filter status"
              className="border-seraya-border-default bg-seraya-surface min-h-11 rounded-[var(--seraya-radius-md)] border px-3 text-sm"
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
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {rows.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-semibold">Belum ada tamu untuk ditindaklanjuti.</p>
              <Link className="mt-3 inline-flex" href={`/dashboard/${projectId}/guests`}>
                Buka Tamu
              </Link>
            </div>
          ) : visibleRows.length === 0 ? (
            <p className="py-8 text-center">Tidak ada tamu yang sesuai.</p>
          ) : (
            <ul className="space-y-3">
              {visibleRows.map((row) => (
                <li
                  className="border-seraya-border-default grid gap-3 rounded-[var(--seraya-radius-md)] border p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                  key={row.guestId}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{row.displayName}</p>
                      <span className="bg-seraya-soft rounded-full px-2.5 py-1 text-xs font-semibold">
                        {labels[row.followUpSegment]}
                      </span>
                    </div>
                    <p className="text-seraya-text-muted mt-1 text-xs">
                      RSVP:{' '}
                      {row.rsvpStatus === 'pending'
                        ? 'Belum merespons'
                        : row.rsvpStatus === 'attending'
                          ? 'Hadir'
                          : 'Tidak hadir'}
                      {row.lastFollowUpAt ? ` · Aktivitas terakhir tercatat` : ''}
                    </p>
                  </div>
                  <div className="text-seraya-action-primary font-semibold">
                    <RowAction
                      isPublished={isPublished}
                      onPrepared={setResult}
                      projectId={projectId}
                      row={row}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <GuestFollowUpResultDialog
        onClose={() => setResult(null)}
        result={result}
        timezone={timezone}
      />
    </section>
  );
}
