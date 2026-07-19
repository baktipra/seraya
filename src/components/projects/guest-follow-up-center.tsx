'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  GuestFollowUpHandoffControl,
  type BoundGuestFollowUpHandoffAction,
} from '@/components/projects/guest-follow-up-handoff-control';
import { GuestFollowUpResultDialog } from '@/components/projects/guest-follow-up-result-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@/design-system';
import type {
  FollowUpGuestRow,
  GuestFollowUpHandoffMessageKind,
  GuestFollowUpHandoffResult,
  GuestFollowUpSegment,
  GuestFollowUpSegmentFilter,
  GuestFollowUpSummary,
} from '@/modules/follow-up/follow-up.types';

export type FollowUpGuestRowClient = FollowUpGuestRow & {
  handoffAction?: BoundGuestFollowUpHandoffAction;
};

type GuestFollowUpCenterProps = {
  isPublished: boolean;
  projectId: string;
  rows: FollowUpGuestRowClient[];
  summary: GuestFollowUpSummary;
  timezone: string;
};

const segmentLabels: Record<GuestFollowUpSegment, string> = {
  awaiting_rsvp: 'Menunggu RSVP',
  needs_link_update: 'Tautan perlu diperbarui',
  needs_whatsapp: 'Butuh nomor WhatsApp',
  no_follow_up_recorded: 'Belum pernah ditindaklanjuti',
  no_personal_invitation: 'Belum punya Undangan Pribadi',
  rsvp_responded: 'RSVP sudah dijawab',
};

const messageKindLabels = {
  event_reminder: 'Pengingat acara',
  initial_invitation: 'Undangan awal',
  other: 'Aktivitas lain',
  rsvp_reminder: 'Pengingat RSVP',
} as const;

const rsvpLabels = {
  attending: 'Hadir',
  declined: 'Tidak hadir',
  pending: 'Belum merespons',
} as const;

const segmentToneClasses: Record<GuestFollowUpSegment, string> = {
  awaiting_rsvp: 'bg-seraya-status-warning-soft text-seraya-status-warning',
  needs_link_update: 'bg-seraya-status-error-soft text-seraya-status-error',
  needs_whatsapp: 'bg-seraya-status-warning-soft text-seraya-status-warning',
  no_follow_up_recorded: 'bg-seraya-brand-soft text-seraya-action-primary',
  no_personal_invitation: 'bg-seraya-status-info-soft text-seraya-status-info',
  rsvp_responded: 'bg-seraya-status-success-soft text-seraya-status-success',
};

export function filterGuestFollowUpRows(
  rows: readonly FollowUpGuestRowClient[],
  filter: GuestFollowUpSegmentFilter,
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');

  return rows.filter((row) => {
    const matchesQuery =
      !normalizedQuery ||
      row.displayName.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
      row.groupLabel?.toLocaleLowerCase('id-ID').includes(normalizedQuery);
    return matchesQuery && (filter === 'all' || row.followUpSegment === filter);
  });
}

function FollowUpMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: number;
}) {
  return (
    <div className="border-seraya-border-default bg-seraya-surface min-w-0 rounded-[var(--seraya-radius-md)] border px-4 py-4">
      <p className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
        {label}
      </p>
      <p className="text-seraya-text-primary mt-2 text-2xl font-semibold tracking-[-0.03em] tabular-nums">
        {value}
      </p>
      <p className="text-seraya-text-muted mt-1 text-xs leading-5">{detail}</p>
    </div>
  );
}

function formatTimestamp(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return 'Tidak tersedia';
  }
}

function getSegmentDescription(row: FollowUpGuestRowClient) {
  if (row.followUpSegment === 'needs_link_update') {
    return 'Perbarui tautan aktif di Tamu sebelum menyiapkan pesan.';
  }
  if (row.followUpSegment === 'needs_whatsapp') {
    return 'Lengkapi nomor WhatsApp di Tamu sebelum menyiapkan handoff.';
  }
  if (row.followUpSegment === 'no_personal_invitation') {
    return 'Siapkan Undangan Pribadi dari Bagikan terlebih dahulu.';
  }
  if (row.followUpSegment === 'no_follow_up_recorded') {
    return 'Undangan Pribadi siap, tetapi belum ada handoff yang tercatat.';
  }
  if (row.followUpSegment === 'awaiting_rsvp') {
    return 'Undangan sudah pernah disiapkan dan konfirmasi kehadiran masih menunggu.';
  }
  if (row.rsvpStatus === 'attending') {
    return 'Tamu mengonfirmasi hadir. Pengingat acara dapat disiapkan manual.';
  }
  return 'Tamu mengonfirmasi tidak hadir. Tidak ada pengingat lanjutan yang perlu disiapkan.';
}

function getEligibleHandoff(row: FollowUpGuestRowClient): {
  label: string;
  messageKind: GuestFollowUpHandoffMessageKind;
} | null {
  if (row.eligibility.canPrepareInitialInvitation) {
    return { label: 'Siapkan undangan awal', messageKind: 'initial_invitation' };
  }
  if (row.eligibility.canPrepareRsvpReminder) {
    return { label: 'Siapkan pengingat RSVP', messageKind: 'rsvp_reminder' };
  }
  if (row.eligibility.canPrepareEventReminder) {
    return { label: 'Siapkan pengingat acara', messageKind: 'event_reminder' };
  }
  return null;
}

function FollowUpRowAction({
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
    return (
      <Link
        className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2"
        href={`/dashboard/${projectId}/guests`}
      >
        Buka Tamu
      </Link>
    );
  }

  if (row.followUpSegment === 'no_personal_invitation') {
    return (
      <Link
        className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2"
        href={`/dashboard/${projectId}/delivery`}
      >
        Buka Bagikan
      </Link>
    );
  }

  const handoff = getEligibleHandoff(row);
  if (!handoff || !row.handoffAction) {
    return <span className="text-seraya-text-muted text-sm">Tidak perlu tindakan</span>;
  }

  if (!isPublished) {
    return (
      <Link
        className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2"
        href={`/dashboard/${projectId}/invitation`}
      >
        Publikasikan undangan
      </Link>
    );
  }

  return (
    <GuestFollowUpHandoffControl
      action={row.handoffAction}
      label={handoff.label}
      messageKind={handoff.messageKind}
      onPrepared={onPrepared}
    />
  );
}

export function GuestFollowUpCenter({
  isPublished,
  projectId,
  rows,
  summary,
  timezone,
}: GuestFollowUpCenterProps) {
  const [filter, setFilter] = useState<GuestFollowUpSegmentFilter>('all');
  const [query, setQuery] = useState('');
  const [handoffResult, setHandoffResult] = useState<GuestFollowUpHandoffResult | null>(null);
  const visibleRows = useMemo(
    () => filterGuestFollowUpRows(rows, filter, query),
    [filter, query, rows],
  );

  return (
    <section
      aria-labelledby="follow-up-center-title"
      className="mx-auto max-w-7xl space-y-5 sm:space-y-7"
    >
      <header className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-6 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
          Tindak lanjut
        </p>
        <h1 className="seraya-display-md mt-3" id="follow-up-center-title">
          Tindak lanjut tamu
        </h1>
        <p className="text-seraya-text-secondary mt-3 max-w-3xl text-base leading-7">
          Siapkan undangan awal dan pengingat manual berdasarkan kesiapan Undangan Pribadi serta
          status RSVP. Seraya tidak menganggap pesan sudah terkirim.
        </p>
      </header>

      {!isPublished ? (
        <section
          aria-labelledby="follow-up-unpublished-title"
          className="border-seraya-border-default bg-seraya-status-warning-soft rounded-[var(--seraya-radius-lg)] border px-5 py-5 sm:px-6"
        >
          <h2 className="text-seraya-text-primary font-semibold" id="follow-up-unpublished-title">
            Publikasikan undangan untuk mulai menyiapkan handoff
          </h2>
          <p className="text-seraya-text-secondary mt-1 max-w-2xl text-sm leading-6">
            Segmentasi tetap dapat dipantau, tetapi pesan WhatsApp hanya dapat disiapkan dari
            snapshot undangan yang sudah dipublikasikan.
          </p>
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-3 inline-flex min-h-10 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2"
            href={`/dashboard/${projectId}/invitation`}
          >
            Buka Undangan
          </Link>
        </section>
      ) : null}

      <section aria-label="Ringkasan tindak lanjut seluruh tamu aktif" className="space-y-3">
        <p className="text-seraya-text-muted text-sm">
          Ringkasan mencakup seluruh tamu aktif dan tidak berubah saat daftar difilter.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FollowUpMetric
            detail="Seluruh tamu aktif"
            label="Tamu aktif"
            value={summary.activeGuestCount}
          />
          <FollowUpMetric
            detail="Tautan atau WhatsApp"
            label="Perlu diperbaiki"
            value={summary.needsDataRepairCount}
          />
          <FollowUpMetric
            detail="Handoff belum tercatat"
            label="Belum ditindaklanjuti"
            value={summary.noFollowUpRecordedCount}
          />
          <FollowUpMetric
            detail="Konfirmasi masih pending"
            label="Menunggu RSVP"
            value={summary.awaitingRsvpCount}
          />
          <FollowUpMetric
            detail="Hadir atau tidak hadir"
            label="RSVP selesai"
            value={summary.rsvpRespondedCount}
          />
        </div>
      </section>

      <Card aria-labelledby="follow-up-list-title">
        <CardHeader className="gap-5">
          <div>
            <CardTitle
              className="font-sans text-lg font-semibold tracking-[-0.02em]"
              id="follow-up-list-title"
            >
              Daftar tindak lanjut
            </CardTitle>
            <CardDescription>
              Setiap tamu berada dalam tepat satu status. Perbaikan data tetap dilakukan di Tamu dan
              persiapan Undangan Pribadi tetap dilakukan di Bagikan.
            </CardDescription>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_17rem] lg:max-w-3xl">
            <div className="space-y-2">
              <label
                className="text-seraya-text-primary text-sm font-semibold"
                htmlFor="follow-up-search"
              >
                Cari tamu
              </label>
              <Input
                id="follow-up-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau grup"
                type="search"
                value={query}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-seraya-text-primary text-sm font-semibold"
                htmlFor="follow-up-filter"
              >
                Filter status
              </label>
              <select
                className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-md)] border px-3 text-sm focus-visible:outline-3 focus-visible:outline-offset-2"
                id="follow-up-filter"
                onChange={(event) => setFilter(event.target.value as GuestFollowUpSegmentFilter)}
                value={filter}
              >
                <option value="all">Semua status</option>
                <option value="needs_link_update">Tautan perlu diperbarui</option>
                <option value="needs_whatsapp">Butuh nomor WhatsApp</option>
                <option value="no_personal_invitation">Belum punya Undangan Pribadi</option>
                <option value="no_follow_up_recorded">Belum pernah ditindaklanjuti</option>
                <option value="awaiting_rsvp">Menunggu RSVP</option>
                <option value="rsvp_responded">RSVP sudah dijawab</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 sm:pt-6">
          {rows.length === 0 ? (
            <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
              <p className="text-seraya-text-primary font-semibold">
                Belum ada tamu untuk ditindaklanjuti.
              </p>
              <p className="text-seraya-text-muted mt-2 text-sm leading-6">
                Tambahkan tamu terlebih dahulu, lalu siapkan Undangan Pribadi dari Bagikan.
              </p>
              <Link
                className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                href={`/dashboard/${projectId}/guests`}
              >
                Buka Tamu
              </Link>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
              <p className="text-seraya-text-primary font-semibold">Tidak ada tamu yang sesuai.</p>
              <p className="text-seraya-text-muted mt-2 text-sm leading-6">
                Ubah pencarian atau filter untuk melihat status tindak lanjut lain.
              </p>
            </div>
          ) : (
            <ul className="space-y-3" role="list">
              {visibleRows.map((row) => (
                <li
                  className="border-seraya-border-default bg-seraya-surface grid gap-4 rounded-[var(--seraya-radius-md)] border px-4 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(13rem,0.9fr)_minmax(12rem,auto)] lg:items-center lg:px-5"
                  key={row.guestId}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-seraya-text-primary truncate font-semibold">
                        {row.displayName}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${segmentToneClasses[row.followUpSegment]}`}
                      >
                        {segmentLabels[row.followUpSegment]}
                      </span>
                    </div>
                    <div className="text-seraya-text-muted mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5">
                      {row.groupLabel ? <span>{row.groupLabel}</span> : null}
                      <span>{row.maskedWhatsAppNumber ?? 'Nomor WhatsApp belum tersedia'}</span>
                      <span>RSVP: {rsvpLabels[row.rsvpStatus]}</span>
                    </div>
                    <p className="text-seraya-text-secondary mt-2 text-sm leading-6">
                      {getSegmentDescription(row)}
                    </p>
                  </div>

                  <div className="border-seraya-border-default border-t pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
                    {row.followUpCount === 0 ? (
                      <p className="text-seraya-text-muted text-sm">
                        Belum ada aktivitas tercatat.
                      </p>
                    ) : (
                      <div>
                        <p className="text-seraya-text-primary text-sm font-semibold">
                          {row.followUpCount} aktivitas disiapkan
                        </p>
                        <p className="text-seraya-text-muted mt-1 text-xs leading-5">
                          Terakhir:{' '}
                          {row.lastMessageKind
                            ? messageKindLabels[row.lastMessageKind]
                            : 'Aktivitas'}
                          {row.lastFollowUpAt
                            ? ` · ${formatTimestamp(row.lastFollowUpAt, timezone)}`
                            : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border-seraya-border-default flex justify-start border-t pt-3 lg:justify-end lg:border-t-0 lg:pt-0">
                    <FollowUpRowAction
                      isPublished={isPublished}
                      onPrepared={setHandoffResult}
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
        onClose={() => setHandoffResult(null)}
        result={handoffResult}
        timezone={timezone}
      />
    </section>
  );
}
